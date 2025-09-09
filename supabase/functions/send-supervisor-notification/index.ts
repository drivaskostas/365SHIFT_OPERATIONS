import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SupervisorReportRequest {
  title: string;
  description: string;
  severity: string;
  supervisorName: string;
  timestamp: string;
  location: string;
  incidentTime: string;
  imageUrl?: string;
  siteId: string;
  teamId: string;
  supervisorId: string;
  testMode?: boolean;
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

    const report: SupervisorReportRequest = await req.json();

    console.log('📨 Processing supervisor report notification for:', report.title);

    // Get site name
    const { data: siteData } = await supabase
      .from('guardian_sites')
      .select('name')
      .eq('id', report.siteId)
      .single();

    const siteName = siteData?.name || 'Unknown Site';

    // Get notification recipients using site_supervisor_notification_settings (correct table for supervisors)
    const { data: siteNotifications } = await supabase
      .from('site_supervisor_notification_settings')
      .select('email, name, notify_for_severity')
      .eq('site_id', report.siteId)
      .eq('active', true);

    console.log('Site supervisor notification settings found:', siteNotifications?.length || 0);
    console.log('Site recipients before filtering:', siteNotifications);

    // Collect recipient emails with severity filtering (use correct column name)
    const recipients = new Set<string>();

    if (siteNotifications && siteNotifications.length > 0) {
      siteNotifications.forEach(setting => {
        if (setting.email) {
          // Check if this recipient wants notifications for this severity
          if (!setting.notify_for_severity || 
              (Array.isArray(setting.notify_for_severity) && setting.notify_for_severity.includes(report.severity))) {
            recipients.add(setting.email);
            console.log(`✅ Added recipient: ${setting.email} for severity: ${report.severity}`);
          } else {
            console.log(`⏭️ Skipped recipient: ${setting.email} - severity ${report.severity} not in filters:`, setting.notify_for_severity);
          }
        }
      });
    }

    // If no site recipients, fallback to admin users (same as emergency reports)
    if (recipients.size === 0) {
      console.log('No site recipients found, falling back to admins');
      
      const { data: adminUsers } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          profiles!inner(email, first_name, last_name, full_name)
        `)
        .in('role', ['admin', 'super_admin']);

      if (adminUsers) {
        adminUsers.forEach(user => {
          if (user.profiles.email) {
            recipients.add(user.profiles.email);
          }
        });
      }
      
      // Final fallback
      if (recipients.size === 0) {
        recipients.add('drivas@ovitsec.com');
        console.log('📧 Using final fallback email: drivas@ovitsec.com');
      }
    }

    console.log(`📧 Sending emails to ${recipients.size} recipients`);

    // Parse description if it's JSON
    let parsedDescription;
    try {
      parsedDescription = JSON.parse(report.description);
    } catch {
      parsedDescription = { behavioral_observation: report.description };
    }

    // Create HTML email content
    const severityColors = {
      'low': '#10B981',
      'medium': '#F59E0B', 
      'high': '#EF4444',
      'critical': '#DC2626'
    };

    const severityColor = severityColors[report.severity as keyof typeof severityColors] || '#6B7280';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 20px;">
        <div style="background: white; border-radius: 8px; padding: 30px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1f2937; margin: 0; font-size: 24px;">OVIT Security</h1>
            <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 14px;">Supervisor Report Notification</p>
          </div>
          
          <div style="border-left: 4px solid ${severityColor}; padding-left: 20px; margin-bottom: 30px;">
            <div style="display: flex; align-items: center; margin-bottom: 15px;">
              <span style="background: ${severityColor}; color: white; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">
                ${report.severity}
              </span>
            </div>
            
            <h2 style="color: #374151; margin: 0 0 15px 0; font-size: 20px;">${report.title}</h2>
            
            <div style="background: #f9fafb; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
              <p style="margin: 0 0 8px 0; color: #374151; font-weight: 600;">Site Details:</p>
              <p style="margin: 0 0 4px 0; color: #6b7280;"><strong>Site:</strong> ${siteName}</p>
              <p style="margin: 0 0 4px 0; color: #6b7280;"><strong>Location:</strong> ${report.location || 'Not specified'}</p>
              <p style="margin: 0 0 4px 0; color: #6b7280;"><strong>Supervisor:</strong> ${report.supervisorName}</p>
              <p style="margin: 0; color: #6b7280;"><strong>Date:</strong> ${new Date(report.timestamp).toLocaleString('el-GR')}</p>
            </div>
            
            ${parsedDescription?.behavioral_observation ? `
              <div style="background: #f0f9ff; padding: 15px; border-radius: 6px; border-left: 3px solid #0ea5e9;">
                <p style="margin: 0 0 8px 0; color: #0c4a6e; font-weight: 600;">Observations:</p>
                <p style="margin: 0; color: #0369a1; line-height: 1.5;">${parsedDescription.behavioral_observation}</p>
              </div>
            ` : ''}
            
            ${parsedDescription?.safety_concerns ? `
              <div style="background: #fef3c7; padding: 15px; border-radius: 6px; border-left: 3px solid #f59e0b; margin-top: 15px;">
                <p style="margin: 0 0 8px 0; color: #92400e; font-weight: 600;">Safety Concerns:</p>
                <p style="margin: 0; color: #b45309; line-height: 1.5;">${parsedDescription.safety_concerns}</p>
              </div>
            ` : ''}
          </div>
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
            <p style="margin: 0; color: #9ca3af; font-size: 12px;">
              This supervisor report was submitted through the OVIT Security system.<br>
              Site: ${siteName} | Supervisor: ${report.supervisorName}
            </p>
          </div>
        </div>
      </div>
    `;

    // Send emails sequentially to avoid rate limiting
    const emailResults: Array<{ success: boolean; email: string; error?: any; response?: any }> = [];
    const recipientArray = Array.from(recipients);
    
    for (let i = 0; i < recipientArray.length; i++) {
      const email = recipientArray[i];
      
      // Add delay between emails (600ms = 1.67 req/s, safely under 2 req/s limit)
      if (i > 0) {
        console.log(`⏳ Waiting 600ms before sending next supervisor email...`);
        await new Promise(resolve => setTimeout(resolve, 600));
      }
      
      try {
        console.log(`📧 Sending supervisor email ${i + 1}/${recipientArray.length} to ${email}...`);
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          console.error(`❌ Invalid email format: ${email}`);
          emailResults.push({ success: false, email, error: 'Invalid email format' });
          continue;
        }

        const emailResponse = await resend.emails.send({
          from: 'OVIT Security <notifications@ovitsec.com>',
          to: [email],
          subject: `Ovit Sentinel Supervisor Report - ${report.severity.toUpperCase()}`,
          html: htmlContent
        });

        console.log(`✅ Supervisor email sent successfully to ${email}:`, emailResponse);
        
        // Check if Resend returned an error in the response
        if (emailResponse.error) {
          console.error(`❌ Resend API error for ${email}:`, emailResponse.error);
          emailResults.push({ success: false, email, error: emailResponse.error });
        } else {
          emailResults.push({ success: true, email, response: emailResponse });
        }
      } catch (error: any) {
        console.error(`❌ Failed to send supervisor email to ${email}:`, error);
        console.error(`Full error object:`, {
          name: error.name,
          message: error.message,
          status: error.status,
          statusText: error.statusText,
          stack: error.stack
        });
        emailResults.push({ success: false, email, error: error.message || 'Unknown error' });
      }
    }

    const successfulEmails = emailResults.filter(result => result.success);
    const failedEmails = emailResults.filter(result => !result.success);
    
    console.log(`📊 Supervisor email delivery summary:`);
    console.log(`✅ Successful: ${successfulEmails.length}/${recipientArray.length}`);
    console.log(`❌ Failed: ${failedEmails.length}/${recipientArray.length}`);
    
    if (successfulEmails.length > 0) {
      console.log('✅ Successfully sent to:', successfulEmails.map(r => r.email));
    }
    
    if (failedEmails.length > 0) {
      console.error('❌ Failed to send to:');
      failedEmails.forEach(result => {
        console.error(`  - ${result.email}: ${result.error}`);
      });
    }

    // Log email notifications in database - only for successful emails
    const emailLogPromises = successfulEmails.map(result => {
      return supabase.from('email_notifications').insert({
        notification_type: 'supervisor_report',
        recipient_email: result.email,
        subject: `Ovit Sentinel Supervisor Report - ${report.severity.toUpperCase()}`,
        html_content: htmlContent,
        reference_id: null, // No reportId available from trigger
        team_id: report.teamId,
        site_id: report.siteId,
        status: 'sent'
      });
    });

    await Promise.allSettled(emailLogPromises);

    console.log(`🏁 Supervisor notification completed: ${successfulEmails.length}/${recipientArray.length} emails sent successfully`);

    return new Response(
      JSON.stringify({ 
        message: 'Supervisor report notifications processed',
        recipients: recipientArray.length,
        emailsSent: successfulEmails.length,
        failedEmails: failedEmails.length,
        successfulEmails: successfulEmails.map(r => r.email),
        failedEmailDetails: failedEmails.map(r => ({
          email: r.email,
          error: r.error
        }))
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