import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

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
  images?: string[];
  image_url?: string;
  imageUrl?: string;
  siteId: string;
  teamId: string;
  supervisorId: string;
  guardId?: string;
  guardName?: string;
  shiftDate?: string;
  notes?: any[];
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
        adminUsers.forEach((user: any) => {
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

    // Convert recipients Set to array for easier handling
    const recipientArray = Array.from(recipients);

    // Get complete supervisor report data from database if available
    let fullReportData = null;
    const { data: reportData } = await supabase
      .from('supervisor_reports')
      .select('*')
      .eq('supervisor_id', report.supervisorId)
      .eq('site_id', report.siteId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (reportData && reportData.length > 0) {
      fullReportData = reportData[0];
    }

    // Parse description if it's JSON
    let parsedDescription;
    try {
      parsedDescription = JSON.parse(report.description);
    } catch {
      parsedDescription = { behavioral_observation: report.description };
    }

    // Use actual timestamp from database if available, otherwise use request timestamp
    const reportTimestamp = fullReportData?.created_at || fullReportData?.updated_at || report.timestamp;
    const incidentTimestamp = fullReportData?.incident_time || report.incidentTime;

    // Build image attachments array for embedding - Handle both single image and array
    const imageAttachments = [];
    let reportImages = [];
    
    // Handle image_url, imageUrl fields (single image) and images array
    if (report.image_url) {
      reportImages.push(report.image_url);
    }
    if (report.imageUrl) {
      reportImages.push(report.imageUrl);
    }
    if (report.images && Array.isArray(report.images)) {
      reportImages = reportImages.concat(report.images);
    }
    
    // Remove duplicates and limit to 5 images max
    const uniqueImages = Array.from(new Set(reportImages)).slice(0, 5);
    console.log('Processing supervisor images:', {
      originalCount: reportImages.length,
      uniqueCount: uniqueImages.length,
      finalCount: uniqueImages.length
    });
    
    // Download and encode all unique images for embedding
    if (uniqueImages.length > 0) {
      for (let i = 0; i < uniqueImages.length; i++) {
        const imgUrl = uniqueImages[i];
        console.log(`Processing supervisor image ${i + 1}/${uniqueImages.length}:`, imgUrl.substring(0, 50) + '...');
        
        try {
          if (imgUrl.startsWith('data:')) {
            // Handle base64 data URLs (from camera/file selection)
            const [mimeTypeSection, base64Data] = imgUrl.split(',');
            if (!base64Data) {
              console.error('Invalid data URL format for supervisor image:', i + 1);
              continue;
            }
            
            const mimeType = mimeTypeSection.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
            const extension = mimeType.split('/')[1] || 'jpg';
            
            imageAttachments.push({
              filename: `supervisor_image_${i + 1}.${extension}`,
              content: base64Data,
              content_id: `supervisor_img_${i + 1}`,
              disposition: 'inline'
            });
            console.log(`✅ Successfully processed supervisor data URL image ${i + 1} (${mimeType})`);
          } else {
            // Handle regular URLs (fetch and convert)
            console.log(`Fetching supervisor external image ${i + 1}:`, imgUrl);
            const response = await fetch(imgUrl);
            if (response.ok) {
              const arrayBuffer = await response.arrayBuffer();
              
              // Convert ArrayBuffer to base64 safely to avoid call stack overflow
              const bytes = new Uint8Array(arrayBuffer);
              let binary = '';
              const chunkSize = 8192;
              for (let i = 0; i < bytes.length; i += chunkSize) {
                const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
                binary += String.fromCharCode.apply(null, Array.from(chunk));
              }
              const base64 = btoa(binary);
              
              // Determine MIME type from URL or use default
              let mimeType = 'image/jpeg';
              if (imgUrl.includes('.png')) mimeType = 'image/png';
              else if (imgUrl.includes('.gif')) mimeType = 'image/gif';
              else if (imgUrl.includes('.webp')) mimeType = 'image/webp';
              
              imageAttachments.push({
                filename: `supervisor_image_${i + 1}.${mimeType.split('/')[1]}`,
                content: base64,
                content_id: `supervisor_img_${i + 1}`,
                disposition: 'inline'
              });
              console.log(`✅ Successfully processed supervisor external image ${i + 1} (${mimeType})`);
            } else {
              console.error(`Failed to fetch supervisor external image ${i + 1}:`, response.status, response.statusText);
            }
          }
        } catch (error) {
          console.error(`Error processing supervisor image ${i + 1}:`, error);
        }
      }
      console.log('📸 Final supervisor image attachments count:', imageAttachments.length);
    } else {
      console.log('No images to process for this supervisor report');
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
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; background: #f8fafc; padding: 20px;">
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
              <p style="margin: 0 0 8px 0; color: #374151; font-weight: 600;">Report Details:</p>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <p style="margin: 0 0 4px 0; color: #6b7280;"><strong>Site:</strong> ${siteName}</p>
                <p style="margin: 0 0 4px 0; color: #6b7280;"><strong>Supervisor:</strong> ${report.supervisorName}</p>
                <p style="margin: 0 0 4px 0; color: #6b7280;"><strong>Location:</strong> ${report.location || 'Not specified'}</p>
                <p style="margin: 0 0 4px 0; color: #6b7280;"><strong>Report Date:</strong> ${fullReportData?.created_at ? new Date(fullReportData.created_at).toLocaleString('el-GR', {timeZone: 'Europe/Athens'}) : new Date(report.timestamp).toLocaleString('el-GR', {timeZone: 'Europe/Athens'})}</p>
                ${fullReportData?.incident_time || report.incidentTime ? `
                <p style="margin: 0 0 4px 0; color: #6b7280;"><strong>Incident Time:</strong> ${new Date(fullReportData?.incident_time || report.incidentTime).toLocaleString('el-GR', {timeZone: 'Europe/Athens'})}</p>
                ` : ''}
                ${report.guardName ? `
                <p style="margin: 0 0 4px 0; color: #6b7280;"><strong>Guard:</strong> ${report.guardName}</p>
                ` : ''}
                ${report.shiftDate ? `
                <p style="margin: 0 0 4px 0; color: #6b7280;"><strong>Shift Date:</strong> ${new Date(report.shiftDate).toLocaleDateString('el-GR', {timeZone: 'Europe/Athens'})}</p>
                ` : ''}
                ${parsedDescription?.report_type ? `
                <p style="margin: 0 0 4px 0; color: #6b7280;"><strong>Report Type:</strong> ${parsedDescription.report_type}</p>
                ` : ''}
                ${parsedDescription?.observation_type ? `
                <p style="margin: 0 0 4px 0; color: #6b7280;"><strong>Observation Type:</strong> ${parsedDescription.observation_type}</p>
                ` : ''}
                ${parsedDescription?.performance_rating ? `
                <p style="margin: 0 0 4px 0; color: #6b7280;"><strong>Performance Rating:</strong> ${parsedDescription.performance_rating}</p>
                ` : ''}
                ${parsedDescription?.compliance_status ? `
                <p style="margin: 0 0 4px 0; color: #6b7280;"><strong>Compliance Status:</strong> ${parsedDescription.compliance_status}</p>
                ` : ''}
                ${parsedDescription?.equipment_status ? `
                <p style="margin: 0 0 4px 0; color: #6b7280;"><strong>Equipment Status:</strong> ${parsedDescription.equipment_status}</p>
                ` : ''}
                ${parsedDescription?.immediate_action_taken ? `
                <p style="margin: 0 0 4px 0; color: #6b7280;"><strong>Immediate Action:</strong> ${parsedDescription.immediate_action_taken}</p>
                ` : ''}
                ${parsedDescription?.weather_conditions ? `
                <p style="margin: 0 0 4px 0; color: #6b7280;"><strong>Weather:</strong> ${parsedDescription.weather_conditions}</p>
                ` : ''}
              </div>
            </div>
            
            ${parsedDescription?.behavioral_observation ? `
              <div style="background: #f0f9ff; padding: 15px; border-radius: 6px; border-left: 3px solid #0ea5e9; margin-bottom: 15px;">
                <p style="margin: 0 0 8px 0; color: #0c4a6e; font-weight: 600;">Behavioral Observations:</p>
                <p style="margin: 0; color: #0369a1; line-height: 1.5;">${parsedDescription.behavioral_observation}</p>
              </div>
            ` : ''}
            
            ${parsedDescription?.safety_concerns ? `
              <div style="background: #fef3c7; padding: 15px; border-radius: 6px; border-left: 3px solid #f59e0b; margin-bottom: 15px;">
                <p style="margin: 0 0 8px 0; color: #92400e; font-weight: 600;">Safety Concerns:</p>
                <p style="margin: 0; color: #b45309; line-height: 1.5;">${parsedDescription.safety_concerns}</p>
              </div>
            ` : ''}

            ${parsedDescription?.performance_feedback ? `
              <div style="background: #e0f2fe; padding: 15px; border-radius: 6px; border-left: 3px solid #0288d1; margin-bottom: 15px;">
                <p style="margin: 0 0 8px 0; color: #01579b; font-weight: 600;">Performance Feedback:</p>
                <p style="margin: 0; color: #0277bd; line-height: 1.5;">${parsedDescription.performance_feedback}</p>
              </div>
            ` : ''}

            ${parsedDescription?.client_feedback ? `
              <div style="background: #f3e5f5; padding: 15px; border-radius: 6px; border-left: 3px solid #9c27b0; margin-bottom: 15px;">
                <p style="margin: 0 0 8px 0; color: #4a148c; font-weight: 600;">Client Feedback:</p>
                <p style="margin: 0; color: #7b1fa2; line-height: 1.5;">${parsedDescription.client_feedback}</p>
              </div>
            ` : ''}

            ${parsedDescription?.recommendations ? `
              <div style="background: #e8f5e8; padding: 15px; border-radius: 6px; border-left: 3px solid #4caf50; margin-bottom: 15px;">
                <p style="margin: 0 0 8px 0; color: #1b5e20; font-weight: 600;">Recommendations:</p>
                <p style="margin: 0; color: #2e7d32; line-height: 1.5;">${parsedDescription.recommendations}</p>
              </div>
            ` : ''}

            ${parsedDescription?.other_findings ? `
              <div style="background: #fef2f2; padding: 15px; border-radius: 6px; border-left: 3px solid #f87171; margin-bottom: 15px;">
                <p style="margin: 0 0 8px 0; color: #991b1b; font-weight: 600;">Other Findings:</p>
                <p style="margin: 0; color: #dc2626; line-height: 1.5;">${parsedDescription.other_findings}</p>
              </div>
            ` : ''}

            ${parsedDescription?.corrective_measures ? `
              <div style="background: #fffbeb; padding: 15px; border-radius: 6px; border-left: 3px solid #fbbf24; margin-bottom: 15px;">
                <p style="margin: 0 0 8px 0; color: #92400e; font-weight: 600;">Corrective Measures:</p>
                <p style="margin: 0; color: #d97706; line-height: 1.5;">${parsedDescription.corrective_measures}</p>
              </div>
            ` : ''}

            ${parsedDescription?.additional_notes ? `
              <div style="background: #f8fafc; padding: 15px; border-radius: 6px; border-left: 3px solid #64748b; margin-bottom: 15px;">
                <p style="margin: 0 0 8px 0; color: #334155; font-weight: 600;">Additional Notes:</p>
                <p style="margin: 0; color: #475569; line-height: 1.5;">${parsedDescription.additional_notes}</p>
              </div>
            ` : ''}

            ${fullReportData?.overall_rating ? `
              <div style="background: #fff3e0; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
                <p style="margin: 0 0 8px 0; color: #e65100; font-weight: 600;">Overall Rating:</p>
                <p style="margin: 0; color: #f57c00; font-size: 18px; font-weight: bold;">${fullReportData.overall_rating}/5 ⭐</p>
              </div>
            ` : ''}

            ${report.notes && report.notes.length > 0 ? `
              <div style="margin: 20px 0;">
                <p style="margin: 0 0 10px 0; color: #374151; font-weight: 600;">Additional Notes:</p>
                ${report.notes.map((note: any, index: number) => `
                  <div style="background: #f8f9fa; padding: 10px; margin: 5px 0; border-radius: 4px; border-left: 3px solid #6c757d;">
                    <small style="color: #6c757d;">Note ${index + 1}:</small><br>
                    ${typeof note === 'string' ? note : note.text || JSON.stringify(note)}
                  </div>
                `).join('')}
              </div>
            ` : ''}

            ${imageAttachments.length > 0 ? `
              <div style="margin: 20px 0;">
                <p style="margin: 0 0 10px 0; color: #374151; font-weight: 600;">Evidence Photos (${imageAttachments.length}):</p>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin: 10px 0;">
                  ${imageAttachments.map((attachment, index) => `
                    <div style="text-align: center;">
                      <img src="cid:${attachment.content_id}" alt="Report Evidence ${index + 1}" style="max-width: 100%; height: auto; border-radius: 4px; border: 1px solid #ddd;" />
                      <p style="margin: 5px 0; font-size: 12px; color: #666;">Evidence Photo ${index + 1}</p>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
            <p style="margin: 0 0 15px 0; color: #9ca3af; font-size: 12px;">
              This supervisor report was submitted through the OVIT Security system.<br>
              Site: ${siteName} | Supervisor: ${report.supervisorName}
            </p>
            <table cellpadding="0" cellspacing="0" style="margin: 15px auto;">
              <tr>
                <td style="background-color: #007bff; border-radius: 6px; text-align: center;">
                  <a href="mailto:${recipientArray.join(',')}?subject=Re: Ovit Sentinel Supervisor Report - ${report.severity.toUpperCase()} - ${fullReportData?.created_at ? new Date(fullReportData.created_at).toLocaleString('el-GR', {timeZone: 'Europe/Athens'}) : new Date(report.timestamp).toLocaleString('el-GR', {timeZone: 'Europe/Athens'})}" 
                     style="display: inline-block; padding: 12px 24px; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px; border-radius: 6px;">
                    📧 Reply to All
                  </a>
                </td>
              </tr>
            </table>
          </div>
        </div>
      </div>
    `;

    // Send emails sequentially to avoid rate limiting
    const emailResults: Array<{ success: boolean; email: string; error?: any; response?: any; id?: string }> = [];
    
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

        const emailData: any = {
          from: "OVIT Observations <observations@notifications.ovitguardly.com>",
          to: email,
          subject: `Ovit Sentinel Supervisor Report - ${report.severity.toUpperCase()} - ${fullReportData?.created_at ? new Date(fullReportData.created_at).toLocaleString('el-GR', {timeZone: 'Europe/Athens'}) : new Date(report.timestamp).toLocaleString('el-GR', {timeZone: 'Europe/Athens'})}`,
          html: htmlContent
        };

        // Add attachments if we have images
        if (imageAttachments.length > 0) {
          emailData.attachments = imageAttachments;
        }

        const emailResponse = await resend.emails.send(emailData);

        console.log(`✅ Supervisor email sent successfully to ${email}:`, emailResponse);
        
        // Check if Resend returned an error in the response
        if (emailResponse.error) {
          console.error(`❌ Resend API error for ${email}:`, emailResponse.error);
          emailResults.push({ success: false, email, error: emailResponse.error });
        } else {
          emailResults.push({ 
            success: true, 
            email, 
            response: emailResponse,
            id: emailResponse.data?.id 
          });
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
    
    // Store correlations for deliverability tracking
    for (const emailResult of successfulEmails) {
      if (emailResult.id && fullReportData?.id) {
        try {
          await supabase
            .from('email_correlation')
            .insert({
              resend_message_id: emailResult.id,
              reference_type: 'supervisor_report',
              reference_id: fullReportData.id,
              recipient_email: emailResult.email,
              sent_at: new Date().toISOString()
            });
          console.log(`✅ Stored email correlation for ${emailResult.email}: ${emailResult.id}`);
        } catch (error) {
          console.error(`❌ Failed to store email correlation for ${emailResult.email}:`, error);
        }
      }
    }

    // Update supervisor report with primary email_id for backward compatibility
    const primaryEmailId = successfulEmails.find(result => result.id)?.id;
    if (primaryEmailId && fullReportData?.id) {
      try {
        const { error: updateError } = await supabase
          .from('supervisor_reports')
          .update({ email_id: primaryEmailId })
          .eq('id', fullReportData.id);
        
        if (updateError) {
          console.warn('⚠️ Failed to update supervisor report with email_id:', updateError);
        } else {
          console.log('✅ Updated supervisor report with email_id:', primaryEmailId);
        }
      } catch (error) {
        console.warn('⚠️ Error updating supervisor report with email_id:', error);
      }
    }
    
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