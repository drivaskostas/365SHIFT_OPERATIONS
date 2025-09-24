import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, svix-signature',
};

// Function to verify webhook signature
async function verifySignature(payload: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    
    // Extract timestamp and signature from the header
    const parts = signature.split(',');
    let timestamp = '';
    let sig = '';
    
    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key === 't') timestamp = value;
      if (key === 'v1') sig = value;
    }
    
    if (!timestamp || !sig) return false;
    
    // Create the signed payload
    const signedPayload = timestamp + '.' + payload;
    
    // Create HMAC signature
    const keyData = encoder.encode(secret);
    const message = encoder.encode(signedPayload);
    
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature_bytes = await crypto.subtle.sign('HMAC', key, message);
    const expectedSig = Array.from(new Uint8Array(signature_bytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
      
    return expectedSig === sig;
  } catch {
    return false;
  }
}

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
    const webhookSecret = Deno.env.get('RESEND_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('❌ RESEND_WEBHOOK_SECRET not configured');
      return new Response('Webhook secret not configured', { status: 500 });
    }

    // Get the raw payload and signature
    const payload = await req.text();
    const signature = req.headers.get('svix-signature') || req.headers.get('webhook-signature');
    
    if (!signature) {
      console.error('❌ No signature found in request headers');
      return new Response('Missing signature', { status: 401 });
    }

    // Verify the webhook signature
    const isValid = await verifySignature(payload, signature, webhookSecret);
    if (!isValid) {
      console.error('❌ Invalid webhook signature');
      return new Response('Invalid signature', { status: 401 });
    }

    console.log('✅ Webhook signature verified successfully');
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

    // Find the reference type and reference_id by checking which table has this email_id
    let referenceType = '';
    let referenceId = '';

    // Check supervisor_reports
    const { data: supervisorReport } = await supabase
      .from('supervisor_reports')
      .select('id')
      .eq('email_id', email_id)
      .maybeSingle();

    if (supervisorReport) {
      referenceType = 'supervisor_report';
      referenceId = supervisorReport.id;
    } else {
      // Check patrol_observations
      const { data: patrolObservation } = await supabase
        .from('patrol_observations') 
        .select('id')
        .eq('email_id', email_id)
        .maybeSingle();

      if (patrolObservation) {
        referenceType = 'patrol_observation';
        referenceId = patrolObservation.id;
      } else {
        // Check emergency_reports
        const { data: emergencyReport } = await supabase
          .from('emergency_reports')
          .select('id')
          .eq('email_id', email_id)
          .maybeSingle();

        if (emergencyReport) {
          referenceType = 'emergency_report';
          referenceId = emergencyReport.id;
        }
      }
    }

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