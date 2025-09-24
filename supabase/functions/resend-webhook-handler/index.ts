import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const event: ResendWebhookEvent = await req.json();
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