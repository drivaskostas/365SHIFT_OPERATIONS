
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmergencyNotificationRequest {
  reportId: string;
  emergencyType: string;
  title: string;
  description: string;
  severity: string;
  locationDescription: string;
  guardName: string;
  teamId?: string;
  siteId?: string;
  images?: string[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

    const {
      reportId,
      emergencyType,
      title,
      description,
      severity,
      locationDescription,
      guardName,
      teamId,
      siteId,
      images = []
    }: EmergencyNotificationRequest = await req.json();

    console.log('Processing emergency notification for report:', reportId);

    // Get notification recipients based on site and severity
    let recipients: any[] = [];

    if (siteId) {
      const { data: siteRecipients } = await supabase
        .from('site_notification_settings')
        .select('email, name, notify_for_severity')
        .eq('site_id', siteId)
        .eq('active', true);

      if (siteRecipients) {
        recipients = siteRecipients.filter(recipient => 
          recipient.notify_for_severity.includes(severity)
        );
      }
    }

    // If no site-specific recipients or no siteId, get admin users
    if (recipients.length === 0) {
      const { data: adminUsers } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          profiles!inner(email, first_name, last_name, full_name)
        `)
        .in('role', ['admin', 'super_admin']);

      if (adminUsers) {
        recipients = adminUsers.map(user => ({
          email: user.profiles.email,
          name: user.profiles.full_name || 
                `${user.profiles.first_name} ${user.profiles.last_name}`.trim() ||
                user.profiles.email
        })).filter(recipient => recipient.email);
      }
    }

    console.log('Found recipients:', recipients.length);

    if (recipients.length === 0) {
      console.warn('No notification recipients found');
      return new Response(
        JSON.stringify({ message: 'No recipients found for notifications' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare email content
    const severityColors = {
      critical: '#dc2626',
      high: '#ea580c',
      medium: '#d97706',
      low: '#65a30d'
    };

    const severityLabels = {
      critical: 'CRITICAL',
      high: 'HIGH',
      medium: 'MEDIUM',
      low: 'LOW'
    };

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Emergency Report Notification</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: ${severityColors[severity as keyof typeof severityColors]}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">🚨 EMERGENCY REPORT</h1>
              <p style="margin: 5px 0 0 0; font-size: 18px;">Severity: ${severityLabels[severity as keyof typeof severityLabels]}</p>
            </div>
            
            <div style="background: #f9f9f9; padding: 20px; border: 1px solid #ddd;">
              <h2 style="color: #333; margin-top: 0;">${title}</h2>
              
              <div style="margin: 15px 0;">
                <strong>Type:</strong> ${emergencyType.replace('_', ' ').toUpperCase()}
              </div>
              
              <div style="margin: 15px 0;">
                <strong>Location:</strong> ${locationDescription}
              </div>
              
              <div style="margin: 15px 0;">
                <strong>Reported by:</strong> ${guardName}
              </div>
              
              <div style="margin: 15px 0;">
                <strong>Time:</strong> ${new Date().toLocaleString()}
              </div>
              
              <div style="margin: 15px 0;">
                <strong>Description:</strong>
                <p style="background: white; padding: 10px; border-left: 4px solid ${severityColors[severity as keyof typeof severityColors]}; margin: 5px 0;">
                  ${description}
                </p>
              </div>
              
              ${images.length > 0 ? `
                <div style="margin: 15px 0;">
                  <strong>Evidence Photos:</strong> ${images.length} image(s) attached
                </div>
              ` : ''}
            </div>
            
            <div style="background: #e3f2fd; padding: 15px; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; font-size: 14px;">
                This is an automated notification from Sentinel Guard Emergency Reporting System.
                <br>Please respond appropriately based on your emergency protocols.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send emails to all recipients
    const emailPromises = recipients.map(async (recipient) => {
      try {
        const emailResponse = await resend.emails.send({
          from: "Sentinel Guard <emergency@sentinelguard.com>",
          to: [recipient.email],
          subject: `🚨 EMERGENCY: ${severityLabels[severity as keyof typeof severityLabels]} - ${title}`,
          html: emailHtml,
        });

        console.log(`Email sent to ${recipient.email}:`, emailResponse);
        return { success: true, email: recipient.email, response: emailResponse };
      } catch (error) {
        console.error(`Failed to send email to ${recipient.email}:`, error);
        return { success: false, email: recipient.email, error: error.message };
      }
    });

    const emailResults = await Promise.allSettled(emailPromises);
    const successCount = emailResults.filter(result => 
      result.status === 'fulfilled' && result.value.success
    ).length;

    console.log(`Emergency notification completed: ${successCount}/${recipients.length} emails sent successfully`);

    return new Response(
      JSON.stringify({
        message: 'Emergency notifications processed',
        recipients: recipients.length,
        emailsSent: successCount,
        reportId: reportId
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error in send-emergency-notification function:', error);
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
