import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SupervisorNotificationRequest {
  reportId: string;
  siteId: string;
  teamId: string;
  supervisorName: string;
  siteName: string;
  severity: string;
  title: string;
  description: any;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('🚀 Supervisor notification function started');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;

    if (!supabaseUrl || !supabaseServiceKey || !resendApiKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    const body: SupervisorNotificationRequest = await req.json();
    console.log('📨 Processing notification for report:', body.reportId);

    // Get site notification settings
    const { data: notificationSettings } = await supabase
      .from('site_supervisor_notification_settings')
      .select('email')
      .eq('site_id', body.siteId)
      .eq('active', true);

    // Get client emails for this team
    const { data: clientEmails } = await supabase
      .from('client_teams')
      .select('client_id, profiles!inner(email)')
      .eq('team_id', body.teamId);

    // Get admin emails
    const { data: adminEmails } = await supabase
      .from('user_roles')
      .select('user_id, profiles!inner(email)')
      .in('role', ['admin', 'super_admin']);

    // Collect all recipient emails
    const recipients = new Set<string>();

    // Add site notification settings emails
    notificationSettings?.forEach(setting => {
      if (setting.email) recipients.add(setting.email);
    });

    // Add client emails
    clientEmails?.forEach(client => {
      if (client.profiles?.email) recipients.add(client.profiles.email);
    });

    // Add admin emails
    adminEmails?.forEach(admin => {
      if (admin.profiles?.email) recipients.add(admin.profiles.email);
    });

    if (recipients.size === 0) {
      console.log('⚠️ No recipients found for notification');
      return new Response(
        JSON.stringify({ message: 'No recipients found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📧 Sending notifications to ${recipients.size} recipients`);

    // Create HTML email content
    const severityColor = {
      'low': '#10B981',
      'medium': '#F59E0B', 
      'high': '#EF4444',
      'critical': '#DC2626'
    }[body.severity] || '#6B7280';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px;">
          <h1 style="color: #1f2937; margin: 0 0 20px 0;">Νέα Αναφορά Εποπτείας</h1>
          
          <div style="background: white; padding: 20px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="display: flex; align-items: center; margin-bottom: 16px;">
              <span style="background: ${severityColor}; color: white; padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 600;">
                ${body.severity.toUpperCase()}
              </span>
            </div>
            
            <h2 style="color: #374151; margin: 0 0 12px 0; font-size: 18px;">${body.title}</h2>
            
            <div style="margin-bottom: 16px;">
              <p style="margin: 4px 0; color: #6b7280;"><strong>Έργο:</strong> ${body.siteName}</p>
              <p style="margin: 4px 0; color: #6b7280;"><strong>Εποπτής:</strong> ${body.supervisorName}</p>
            </div>
            
            ${body.description?.behavioral_observation ? `
              <div style="background: #f9fafb; padding: 12px; border-radius: 4px; margin: 16px 0;">
                <p style="margin: 0; color: #374151;"><strong>Παρατηρήσεις:</strong></p>
                <p style="margin: 8px 0 0 0; color: #6b7280;">${body.description.behavioral_observation}</p>
              </div>
            ` : ''}
            
            <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                Αυτή η αναφορά εποπτείας υποβλήθηκε στο σύστημα OVIT Security.
              </p>
            </div>
          </div>
        </div>
      </div>
    `;

    // Send emails to all recipients
    const emailPromises = Array.from(recipients).map(email => {
      return resend.emails.send({
        from: 'OVIT Security <notifications@ovitsec.com>',
        to: [email],
        subject: `Νέα Αναφορά Εποπτείας - ${body.title} (${body.severity.toUpperCase()})`,
        html: htmlContent
      });
    });

    const emailResults = await Promise.allSettled(emailPromises);
    const successCount = emailResults.filter(result => result.status === 'fulfilled').length;
    const failureCount = emailResults.length - successCount;

    console.log(`✅ Sent ${successCount} emails successfully, ${failureCount} failed`);

    // Insert notifications into the database
    const notificationPromises = Array.from(recipients).map(email => {
      return supabase.from('email_notifications').insert({
        notification_type: 'supervisor_report',
        recipient_email: email,
        subject: `Νέα Αναφορά Εποπτείας - ${body.title}`,
        html_content: htmlContent,
        reference_id: body.reportId,
        team_id: body.teamId,
        site_id: body.siteId,
        status: 'sent'
      });
    });

    await Promise.allSettled(notificationPromises);

    return new Response(
      JSON.stringify({ 
        message: 'Notifications sent successfully',
        recipients: recipients.size,
        successful: successCount,
        failed: failureCount
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('❌ Error in supervisor notification function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);