import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SupervisorReportPayload {
  record: {
    id: string;
    supervisor_id: string;
    supervisor_name: string;
    site_id: string;
    team_id: string;
    title: string;
    description: string;
    severity: string;
    location: string;
    created_at: string;
  };
  schema: string;
  table: string;
  type: string;
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

    const payload: SupervisorReportPayload = await req.json();
    const report = payload.record;

    console.log('📨 Processing supervisor report notification:', report.id);

    // Get site name
    const { data: siteData } = await supabase
      .from('guardian_sites')
      .select('name')
      .eq('id', report.site_id)
      .single();

    const siteName = siteData?.name || 'Unknown Site';

    // Get all admin and manager emails
    const { data: adminUsers } = await supabase
      .from('user_roles')
      .select('user_id, profiles!inner(email, full_name)')
      .in('role', ['admin', 'super_admin', 'manager']);

    // Get site supervisor notification settings
    const { data: siteNotifications } = await supabase
      .from('site_supervisor_notification_settings')
      .select('email')
      .eq('site_id', report.site_id)
      .eq('active', true);

    // Get client emails for this team
    const { data: clientUsers } = await supabase
      .from('client_teams')
      .select('client_id, profiles!inner(email, full_name)')
      .eq('team_id', report.team_id);

    // Collect all recipient emails
    const recipients = new Set<string>();

    // Add admin/manager emails
    adminUsers?.forEach(user => {
      if (user.profiles?.email) recipients.add(user.profiles.email);
    });

    // Add site notification emails
    siteNotifications?.forEach(setting => {
      if (setting.email) recipients.add(setting.email);
    });

    // Add client emails
    clientUsers?.forEach(client => {
      if (client.profiles?.email) recipients.add(client.profiles.email);
    });

    if (recipients.size === 0) {
      console.log('⚠️ No recipients found for notification');
      return new Response(
        JSON.stringify({ message: 'No recipients found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
              <p style="margin: 0 0 4px 0; color: #6b7280;"><strong>Supervisor:</strong> ${report.supervisor_name}</p>
              <p style="margin: 0; color: #6b7280;"><strong>Date:</strong> ${new Date(report.created_at).toLocaleString('el-GR')}</p>
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
              Report ID: ${report.id}
            </p>
          </div>
        </div>
      </div>
    `;

    // Send emails to all recipients
    const emailPromises = Array.from(recipients).map(email => {
      return resend.emails.send({
        from: 'OVIT Security <notifications@ovitsec.com>',
        to: [email],
        subject: `Ovit Sentinel Supervisor Report - ${report.severity.toUpperCase()}`,
        html: htmlContent
      });
    });

    const emailResults = await Promise.allSettled(emailPromises);
    const successCount = emailResults.filter(result => result.status === 'fulfilled').length;
    const failureCount = emailResults.length - successCount;

    console.log(`✅ Sent ${successCount} emails successfully, ${failureCount} failed`);

    // Log email notifications in database
    const emailLogPromises = Array.from(recipients).map(email => {
      return supabase.from('email_notifications').insert({
        notification_type: 'supervisor_report',
        recipient_email: email,
        subject: `Ovit Sentinel Supervisor Report - ${report.severity.toUpperCase()}`,
        html_content: htmlContent,
        reference_id: report.id,
        team_id: report.team_id,
        site_id: report.site_id,
        status: 'sent'
      });
    });

    await Promise.allSettled(emailLogPromises);

    return new Response(
      JSON.stringify({ 
        message: 'Supervisor report notifications sent successfully',
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