import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ObservationNotificationRequest {
  observationId: string;
  title: string;
  description: string;
  severity: string;
  guardName: string;
  timestamp: string;
  teamId?: string;
  siteId?: string;
  guardId: string;
  imageUrl?: string;
  testMode?: boolean;
  testEmail?: string;
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
      observationId,
      title,
      description,
      severity,
      guardName,
      timestamp,
      teamId,
      siteId,
      guardId,
      imageUrl,
      testMode = false,
      testEmail
    }: ObservationNotificationRequest = await req.json();

    console.log('Processing observation notification for observation:', observationId);

    // Get notification recipients based on site and severity
    let recipients: any[] = [];

    if (siteId && !testMode) {
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

    // If no site-specific recipients or no siteId, get team-based recipients
    if (recipients.length === 0 && teamId && !testMode) {
      const { data: teamRecipients } = await supabase
        .from('notification_settings')
        .select(`
          email,
          profiles!inner(email, first_name, last_name, full_name)
        `)
        .eq('team_id', teamId)
        .eq('active', true);

      if (teamRecipients) {
        recipients = teamRecipients.map(setting => ({
          email: setting.profiles.email,
          name: setting.profiles.full_name || 
                `${setting.profiles.first_name} ${setting.profiles.last_name}`.trim() ||
                setting.profiles.email
        })).filter(recipient => recipient.email);
      }
    }

    // If still no recipients or test mode, use admin fallback
    if ((recipients.length === 0 && !testMode) || testMode) {
      if (testMode && testEmail) {
        recipients = [{ email: testEmail, name: 'Test Recipient' }];
      } else {
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
          <title>Patrol Observation Notification</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: ${severityColors[severity as keyof typeof severityColors]}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">👁️ PATROL OBSERVATION</h1>
              <p style="margin: 5px 0 0 0; font-size: 18px;">Severity: ${severityLabels[severity as keyof typeof severityLabels]}</p>
            </div>
            
            <div style="background: #f9f9f9; padding: 20px; border: 1px solid #ddd;">
              <h2 style="color: #333; margin-top: 0;">${title}</h2>
              
              <div style="margin: 15px 0;">
                <strong>Reported by:</strong> ${guardName}
              </div>
              
              <div style="margin: 15px 0;">
                <strong>Time:</strong> ${new Date(timestamp).toLocaleString()}
              </div>
              
              <div style="margin: 15px 0;">
                <strong>Description:</strong>
                <p style="background: white; padding: 10px; border-left: 4px solid ${severityColors[severity as keyof typeof severityColors]}; margin: 5px 0;">
                  ${description}
                </p>
              </div>
              
              ${imageUrl ? `
                <div style="margin: 15px 0;">
                  <strong>Evidence Photo:</strong> Photo attached
                </div>
              ` : ''}
            </div>
            
            <div style="background: #e3f2fd; padding: 15px; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; font-size: 14px;">
                This is an automated notification from Sentinel Guard Patrol Observation System.
                <br>Please review and respond as needed according to your protocols.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send emails to all recipients
    const emailPromises = recipients.map(async (recipient) => {
      try {
        console.log(`Attempting to send observation email to ${recipient.email}...`);
        const emailResponse = await resend.emails.send({
          from: "OVIT Observations <observations@notifications.ovitguardly.com>",
          to: [recipient.email],
          subject: `👁️ PATROL OBSERVATION: ${severityLabels[severity as keyof typeof severityLabels]} - ${title}`,
          html: emailHtml,
        });

        console.log(`Observation email sent successfully to ${recipient.email}:`, emailResponse);
        return { success: true, email: recipient.email, response: emailResponse };
      } catch (error) {
        console.error(`Failed to send observation email to ${recipient.email}:`, error);
        console.error(`Resend error details:`, JSON.stringify(error, null, 2));
        return { success: false, email: recipient.email, error: error.message };
      }
    });

    const emailResults = await Promise.allSettled(emailPromises);
    console.log('All observation email results:', emailResults);
    
    const successCount = emailResults.filter(result => 
      result.status === 'fulfilled' && result.value.success
    ).length;
    
    const failedResults = emailResults.filter(result => 
      result.status === 'rejected' || (result.status === 'fulfilled' && !result.value.success)
    );
    
    if (failedResults.length > 0) {
      console.error('Failed observation email results:', failedResults);
    }

    console.log(`Observation notification completed: ${successCount}/${recipients.length} emails sent successfully`);

    return new Response(
      JSON.stringify({
        message: 'Observation notifications processed',
        recipients: recipients.length,
        emailsSent: successCount,
        observationId: observationId
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Error in send-observation-email function:', error);
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