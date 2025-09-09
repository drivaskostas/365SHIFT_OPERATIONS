
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
    console.log('Received siteId:', siteId);
    console.log('Received teamId:', teamId);
    console.log('Received severity:', severity);

    // Get notification recipients based on site and severity
    let recipients: any[] = [];

    console.log('🔍 DEBUGGING: Starting recipient search');
    console.log('🔍 siteId:', siteId);
    console.log('🔍 severity:', severity);

    if (siteId) {
      console.log('🔍 Looking for recipients for siteId:', siteId);
      
      // First, let's see ALL notification settings for debugging
      const { data: allSettings, error: allError } = await supabase
        .from('site_notification_settings')
        .select('*');
      
      console.log('🔍 ALL notification settings in database:', allSettings?.length || 0);
      if (allError) console.error('🔍 Error fetching all settings:', allError);
      
      // Now get the specific site recipients
      const { data: siteRecipients, error: siteError } = await supabase
        .from('site_notification_settings')
        .select('email, name, notify_for_severity')
        .eq('site_id', siteId)
        .eq('active', true);

      console.log('🔍 Raw site recipients found:', siteRecipients?.length || 0);
      if (siteError) console.error('🔍 Error fetching site recipients:', siteError);
      
      if (siteRecipients && siteRecipients.length > 0) {
        console.log('🔍 Site recipients before filtering:', JSON.stringify(siteRecipients, null, 2));
        
        recipients = siteRecipients.filter(recipient => {
          // Handle both array and string formats for notify_for_severity
          const severityList = Array.isArray(recipient.notify_for_severity) 
            ? recipient.notify_for_severity 
            : (typeof recipient.notify_for_severity === 'string' 
                ? [recipient.notify_for_severity] 
                : []);
          
          console.log(`🔍 Checking recipient ${recipient.email} with severities:`, severityList, 'for severity:', severity);
          const shouldNotify = severityList.includes(severity);
          console.log(`🔍 Should notify ${recipient.email}:`, shouldNotify);
          return shouldNotify;
        });
        console.log('🔍 Site recipients after severity filtering:', recipients.length);
        console.log('🔍 Final filtered recipients:', recipients.map(r => r.email));
      } else {
        console.log('🔍 No site-specific recipients found, will fall back to admins');
      }
    } else {
      console.log('🔍 No siteId provided, skipping site-specific recipients');
    }

    // If no site-specific recipients or no siteId, get admin users
    if (recipients.length === 0) {
      console.log('🔍 FALLBACK: No site recipients found, fetching admin users');
      
      const { data: adminUsers, error: adminError } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          profiles!inner(email, first_name, last_name, full_name)
        `)
        .in('role', ['admin', 'super_admin']);

      console.log('🔍 Admin users found:', adminUsers?.length || 0);
      if (adminError) console.error('🔍 Error fetching admin users:', adminError);

      if (adminUsers) {
        console.log('🔍 Raw admin data:', JSON.stringify(adminUsers, null, 2));
        
        recipients = adminUsers.map(user => ({
          email: user.profiles.email,
          name: user.profiles.full_name || 
                `${user.profiles.first_name} ${user.profiles.last_name}`.trim() ||
                user.profiles.email
        })).filter(recipient => {
          const hasEmail = recipient.email && recipient.email.trim() !== '';
          console.log(`🔍 Admin recipient ${recipient.email}: valid = ${hasEmail}`);
          return hasEmail;
        });
        
        console.log('🔍 Final admin recipients:', recipients.map(r => `${r.name} <${r.email}>`));
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

    // Send emails to all recipients with delay to avoid rate limiting
    const emailPromises = recipients.map(async (recipient, index) => {
      // Add 600ms delay between emails to respect Resend's 2 requests per second limit
      if (index > 0) {
        await new Promise(resolve => setTimeout(resolve, 600));
      }
      try {
        console.log(`Attempting to send email to ${recipient.email}...`);
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(recipient.email)) {
          console.error(`Invalid email format: ${recipient.email}`);
          return { success: false, email: recipient.email, error: 'Invalid email format' };
        }

        const emailResponse = await resend.emails.send({
          from: "OVIT Emergency <emergency@notifications.ovitguardly.com>",
          to: [recipient.email],
          subject: `🚨 EMERGENCY: ${severityLabels[severity as keyof typeof severityLabels]} - ${title}`,
          html: emailHtml,
        });

        console.log(`✅ Email sent successfully to ${recipient.email}:`, emailResponse);
        
        // Check if Resend returned an error in the response
        if (emailResponse.error) {
          console.error(`❌ Resend API error for ${recipient.email}:`, emailResponse.error);
          return { success: false, email: recipient.email, error: emailResponse.error };
        }

        return { success: true, email: recipient.email, response: emailResponse, id: emailResponse.data?.id };
      } catch (error: any) {
        console.error(`❌ Failed to send email to ${recipient.email}:`, error);
        console.error(`Full error object:`, {
          name: error.name,
          message: error.message,
          status: error.status,
          statusText: error.statusText,
          stack: error.stack
        });
        return { success: false, email: recipient.email, error: error.message || 'Unknown error' };
      }
    });

    const emailResults = await Promise.allSettled(emailPromises);
    console.log('📧 All email results summary:', emailResults.map(result => ({
      status: result.status,
      email: result.status === 'fulfilled' ? result.value.email : 'unknown',
      success: result.status === 'fulfilled' ? result.value.success : false,
      error: result.status === 'fulfilled' ? result.value.error : result.reason
    })));
    
    const successfulEmails = emailResults.filter(result => 
      result.status === 'fulfilled' && result.value.success
    );
    
    const failedEmails = emailResults.filter(result => 
      result.status === 'rejected' || (result.status === 'fulfilled' && !result.value.success)
    );
    
    console.log(`📊 Email delivery summary:`);
    console.log(`✅ Successful: ${successfulEmails.length}/${recipients.length}`);
    console.log(`❌ Failed: ${failedEmails.length}/${recipients.length}`);
    
    if (successfulEmails.length > 0) {
      console.log('✅ Successfully sent to:', successfulEmails.map(r => 
        r.status === 'fulfilled' ? r.value.email : 'unknown'
      ));
    }
    
    if (failedEmails.length > 0) {
      console.error('❌ Failed to send to:');
      failedEmails.forEach(result => {
        if (result.status === 'fulfilled') {
          console.error(`  - ${result.value.email}: ${result.value.error}`);
        } else {
          console.error(`  - Unknown email: ${result.reason}`);
        }
      });
    }

    console.log(`🏁 Emergency notification completed: ${successfulEmails.length}/${recipients.length} emails sent successfully`);

    return new Response(
      JSON.stringify({
        message: 'Emergency notifications processed',
        recipients: recipients.length,
        emailsSent: successfulEmails.length,
        failedEmails: failedEmails.length,
        successfulEmails: successfulEmails.map(r => r.status === 'fulfilled' ? r.value.email : 'unknown'),
        failedEmailDetails: failedEmails.map(r => ({
          email: r.status === 'fulfilled' ? r.value.email : 'unknown',
          error: r.status === 'fulfilled' ? r.value.error : r.reason
        })),
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
