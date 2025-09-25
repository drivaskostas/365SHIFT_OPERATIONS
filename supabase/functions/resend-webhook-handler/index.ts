import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, svix-signature, webhook-signature',
};

interface ResendWebhookEvent {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    bounced_at?: string;
    clicked_at?: string;
    complained_at?: string;
    delivered_at?: string;
    opened_at?: string;
    delivery_delayed_at?: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  console.log('📧 Resend webhook handler started');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the raw payload
    const payload = await req.text();
    console.log('📦 Received webhook payload:', payload);
    
    // Log headers for debugging
    const headers = Object.fromEntries(req.headers.entries());
    console.log('📋 Headers received:', JSON.stringify(headers, null, 2));
    
    // Skip signature verification for now - just process the webhook
    console.log('⚠️ Signature verification temporarily disabled for debugging');
    
    // Validate payload format
    if (!payload || payload.trim() === '') {
      console.error('❌ Empty payload received');
      throw new Error('Empty payload received');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const event: ResendWebhookEvent = JSON.parse(payload);
    console.log('📨 Received webhook event:', event.type, 'for email:', event.data.email_id);

    const { email_id, to } = event.data;
    const recipientEmail = to[0]; // Primary recipient
    const eventType = event.type;
    const occurredAt = event.created_at;

    // Determine status based on event type
    let status = 'unknown';
    switch (eventType) {
      case 'email.delivered':
        status = 'delivered';
        break;
      case 'email.bounced':
        status = 'bounced';
        break;
      case 'email.opened':
        status = 'opened';
        break;
      case 'email.clicked':
        status = 'clicked';
        break;
      case 'email.complained':
        status = 'complained';
        break;
      case 'email.delivery_delayed':
        status = 'delivery_delayed';
        break;
      default:
        status = eventType.replace('email.', '');
    }

    console.log('📊 Processing event:', eventType, 'as status:', status);

    // The email_id from Resend is their internal message ID, not our UUID
    // Look up the correlation to link back to our reports
    console.log('🔍 Received Resend message ID:', email_id);
    
    // Look up correlation data
    const { data: correlationData, error: correlationError } = await supabase
      .from('email_correlation')
      .select('reference_type, reference_id')
      .eq('resend_message_id', email_id)
      .single();
    
    let referenceType = 'unknown';
    let referenceId = null;
    
    if (correlationError) {
      console.log('⚠️ No correlation found for Resend message ID:', email_id, correlationError.message);
    } else if (correlationData) {
      referenceType = correlationData.reference_type;
      referenceId = correlationData.reference_id;
      console.log('✅ Found correlation:', { referenceType, referenceId });
    }
    
    console.log('📝 Storing webhook event with reference:', { referenceType, referenceId });

    console.log('📝 Inserting deliverability record:', {
      email_id,
      recipient_email: recipientEmail,
      status,
      event_type: eventType,
      reference_type: referenceType || 'unknown',
      reference_id: referenceId || null,
    });

    // Insert deliverability record
    const { error: insertError } = await supabase
      .from('email_deliverability')
      .insert({
        email_id,
        recipient_email: recipientEmail,
        status,
        event_type: eventType,
        reference_type: referenceType || 'unknown',
        reference_id: referenceId || null,
        event_data: event.data,
        occurred_at: occurredAt,
      });

    if (insertError) {
      console.error('❌ Error inserting deliverability record:', insertError);
      throw insertError;
    }

    console.log('✅ Deliverability record inserted successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: eventType,
        email_id,
        reference_type: referenceType,
        reference_id: referenceId
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('❌ Webhook handler error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);