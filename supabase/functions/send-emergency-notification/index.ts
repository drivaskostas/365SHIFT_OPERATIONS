
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

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
  involvedPersons?: string;
  incidentTime?: string;
  resolvedBy?: string;
  status?: string;
  notes?: any[];
  latitude?: number;
  longitude?: number;
  patrolId?: string;
  location?: string;
  imageUrl?: string;
  timestamp?: string;
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
      images = [],
      involvedPersons,
      incidentTime,
      resolvedBy,
      status,
      notes,
      latitude,
      longitude,
      patrolId,
      location,
      imageUrl,
      timestamp
    }: EmergencyNotificationRequest = await req.json();

    console.log('Processing emergency notification for report:', reportId);
    console.log('Received siteId:', siteId);
    console.log('Received teamId:', teamId);
    console.log('Received severity:', severity);

    // Get site name if siteId is provided
    let siteName = '';
    if (siteId) {
      const { data: siteData } = await supabase
        .from('guardian_sites')
        .select('name')
        .eq('id', siteId)
        .single();
      siteName = siteData?.name || '';
      console.log('Site name found:', siteName);
    }

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
        
        recipients = adminUsers.map((user: any) => ({
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

    // Get complete emergency data from database if available
    let fullEmergencyData = null;
    if (reportId) {
      const { data: emergencyData } = await supabase
        .from('emergency_reports')
        .select('*')
        .eq('id', reportId)
        .single();
      fullEmergencyData = emergencyData;
    }

    // Build image attachments array for embedding - prevent duplication
    const imageAttachments = [];
    let reportImages = [];
    
    // Collect all images from different sources
    if (imageUrl) {
      reportImages.push(imageUrl);
    }
    
    if (images && images.length > 0) {
      reportImages = reportImages.concat(images);
    }
    
    // Remove duplicates and limit to 5 images max
    const uniqueImages = Array.from(new Set(reportImages)).slice(0, 5);
    console.log('Processing emergency images:', {
      originalCount: reportImages.length,
      uniqueCount: uniqueImages.length,
      finalCount: uniqueImages.length
    });
    
    // Download and encode all unique images for embedding
    if (uniqueImages.length > 0) {
      for (let i = 0; i < uniqueImages.length; i++) {
        const imgUrl = uniqueImages[i];
        console.log(`Processing emergency image ${i + 1}/${uniqueImages.length}:`, imgUrl.substring(0, 50) + '...');
        
        try {
          if (imgUrl.startsWith('data:')) {
            // Handle base64 data URLs (from camera/file selection)
            const [mimeTypeSection, base64Data] = imgUrl.split(',');
            if (!base64Data) {
              console.error('Invalid data URL format for emergency image:', i + 1);
              continue;
            }
            
            const mimeType = mimeTypeSection.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
            const extension = mimeType.split('/')[1] || 'jpg';
            
            imageAttachments.push({
              filename: `emergency_image_${i + 1}.${extension}`,
              content: base64Data,
              content_id: `emergency_img_${i + 1}`,
              disposition: 'inline'
            });
            console.log(`✅ Successfully processed emergency data URL image ${i + 1} (${mimeType})`);
          } else {
            // Handle regular URLs (fetch and convert)
            console.log(`Fetching emergency external image ${i + 1}:`, imgUrl);
            const response = await fetch(imgUrl);
            if (response.ok) {
              const arrayBuffer = await response.arrayBuffer();
              const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
              
              // Determine MIME type from URL or use default
              let mimeType = 'image/jpeg';
              if (imgUrl.includes('.png')) mimeType = 'image/png';
              else if (imgUrl.includes('.gif')) mimeType = 'image/gif';
              else if (imgUrl.includes('.webp')) mimeType = 'image/webp';
              
              imageAttachments.push({
                filename: `emergency_image_${i + 1}.${mimeType.split('/')[1]}`,
                content: base64,
                content_id: `emergency_img_${i + 1}`,
                disposition: 'inline'
              });
              console.log(`✅ Successfully processed emergency external image ${i + 1} (${mimeType})`);
            } else {
              console.error(`Failed to fetch emergency external image ${i + 1}:`, response.status, response.statusText);
            }
          }
        } catch (error) {
          console.error(`Error processing emergency image ${i + 1}:`, error);
        }
      }
      console.log('📸 Final emergency image attachments count:', imageAttachments.length);
    } else {
      console.log('No images to process for this emergency report');
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Emergency Report Notification</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 700px; margin: 0 auto; padding: 20px;">
            <div style="background: ${severityColors[severity as keyof typeof severityColors]}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">🚨 EMERGENCY REPORT</h1>
              <p style="margin: 5px 0 0 0; font-size: 18px;">Severity: ${severityLabels[severity as keyof typeof severityLabels]}</p>
            </div>
            
            <div style="background: #f9f9f9; padding: 20px; border: 1px solid #ddd;">
              <h2 style="color: #333; margin-top: 0;">${title}</h2>
              
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0;">
                <div>
                  <strong>Emergency Type:</strong> ${emergencyType.replace(/_/g, ' ').toUpperCase()}
                </div>
                <div>
                  <strong>Reported by:</strong> ${guardName}
                </div>
                ${siteName ? `
                <div>
                  <strong>Site:</strong> ${siteName}
                </div>
                ` : ''}
                <div>
                  <strong>Report Time:</strong> ${timestamp ? new Date(timestamp).toLocaleString('el-GR', { timeZone: 'Europe/Athens' }) : new Date().toLocaleString('el-GR', { timeZone: 'Europe/Athens' })}
                </div>
                ${incidentTime ? `
                <div>
                  <strong>Incident Time:</strong> ${new Date(incidentTime).toLocaleString('el-GR', { timeZone: 'Europe/Athens' })}
                </div>
                ` : ''}
                ${status ? `
                <div>
                  <strong>Status:</strong> <span style="text-transform: uppercase; font-weight: bold;">${status}</span>
                </div>
                ` : ''}
                ${resolvedBy ? `
                <div>
                  <strong>Resolved By:</strong> ${resolvedBy}
                </div>
                ` : ''}
                ${patrolId ? `
                <div>
                  <strong>Patrol ID:</strong> ${patrolId}
                </div>
                ` : ''}
                ${latitude && longitude ? `
                <div>
                  <strong>GPS Coordinates:</strong> ${latitude.toFixed(6)}, ${longitude.toFixed(6)}
                </div>
                ` : ''}
              </div>

              <div style="margin: 20px 0;">
                <strong>Location:</strong>
                <div style="background: white; padding: 10px; border-left: 4px solid #007bff; margin: 5px 0; border-radius: 4px;">
                  ${locationDescription || location || 'Location not specified'}
                </div>
              </div>
              
              <div style="margin: 20px 0;">
                <strong>Description:</strong>
                <div style="background: white; padding: 15px; border-left: 4px solid ${severityColors[severity as keyof typeof severityColors]}; margin: 10px 0; border-radius: 4px;">
                  ${description}
                </div>
              </div>

              ${involvedPersons ? `
                <div style="margin: 20px 0;">
                  <strong>Involved Persons:</strong>
                  <div style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 10px 0; border-radius: 4px;">
                    ${involvedPersons}
                  </div>
                </div>
              ` : ''}

              ${notes && notes.length > 0 ? `
                <div style="margin: 20px 0;">
                  <strong>Additional Notes:</strong>
                  ${notes.map((note: any, index: number) => `
                    <div style="background: #f8f9fa; padding: 10px; margin: 5px 0; border-radius: 4px; border-left: 3px solid #6c757d;">
                      <small style="color: #6c757d;">Note ${index + 1}:</small><br>
                      ${typeof note === 'string' ? note : note.text || JSON.stringify(note)}
                    </div>
                  `).join('')}
                </div>
              ` : ''}
              
              ${imageAttachments.length > 0 ? `
                <div style="margin: 20px 0;">
                  <strong>Evidence Photos (${imageAttachments.length}):</strong>
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin: 10px 0;">
                    ${imageAttachments.map((attachment, index) => `
                      <div style="text-align: center;">
                        <img src="cid:${attachment.content_id}" alt="Emergency Evidence ${index + 1}" style="max-width: 100%; height: auto; border-radius: 4px; border: 1px solid #ddd;" />
                        <p style="margin: 5px 0; font-size: 12px; color: #666;">Evidence Photo ${index + 1}</p>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            </div>
            
            <div style="background: #e3f2fd; padding: 15px; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0 0 15px 0; font-size: 14px;">
                This is an automated notification from Sentinel Guard Emergency Reporting System.
                <br>Please respond appropriately based on your emergency protocols.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin: 15px auto;">
                <tr>
                  <td style="background-color: #007bff; border-radius: 6px; text-align: center;">
                    <a href="mailto:${recipients.map(r => r.email).join(',')}?subject=Re: 🚨 EMERGENCY: ${severityLabels[severity as keyof typeof severityLabels]} - ${title}" 
                       style="display: inline-block; padding: 12px 24px; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px; border-radius: 6px;">
                      📧 Reply to All
                    </a>
                  </td>
                </tr>
              </table>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send emails sequentially to avoid rate limiting
    const emailResults: Array<{ success: boolean; email: string; error?: any; response?: any; id?: string }> = [];
    
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      
      // Add delay between emails (600ms = 1.67 req/s, safely under 2 req/s limit)
      if (i > 0) {
        console.log(`⏳ Waiting 600ms before sending next email...`);
        await new Promise(resolve => setTimeout(resolve, 600));
      }
      
      try {
        console.log(`📧 Sending email ${i + 1}/${recipients.length} to ${recipient.email}...`);
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(recipient.email)) {
          console.error(`❌ Invalid email format: ${recipient.email}`);
          emailResults.push({ success: false, email: recipient.email, error: 'Invalid email format' });
          continue;
        }

        const emailData: any = {
          from: "OVIT Emergency <emergency@notifications.ovitguardly.com>",
          to: [recipient.email],
          subject: `🚨 EMERGENCY: ${severityLabels[severity as keyof typeof severityLabels]} - ${title}`,
          html: emailHtml,
        };

        // Add attachments if we have images
        if (imageAttachments.length > 0) {
          emailData.attachments = imageAttachments;
        }

        const emailResponse = await resend.emails.send(emailData);

        console.log(`✅ Email sent successfully to ${recipient.email}:`, emailResponse);
        
        // Check if Resend returned an error in the response
        if (emailResponse.error) {
          console.error(`❌ Resend API error for ${recipient.email}:`, emailResponse.error);
          emailResults.push({ success: false, email: recipient.email, error: emailResponse.error });
        } else {
          emailResults.push({ 
            success: true, 
            email: recipient.email, 
            response: emailResponse, 
            id: emailResponse.data?.id 
          });
        }
      } catch (error: any) {
        console.error(`❌ Failed to send email to ${recipient.email}:`, error);
        console.error(`Full error object:`, {
          name: error.name,
          message: error.message,
          status: error.status,
          statusText: error.statusText,
          stack: error.stack
        });
        emailResults.push({ success: false, email: recipient.email, error: error.message || 'Unknown error' });
      }
    }
    console.log('📧 All email results summary:', emailResults.map(result => ({
      email: result.email,
      success: result.success,
      error: result.error
    })));
    
    const successfulEmails = emailResults.filter(result => result.success);
    const failedEmails = emailResults.filter(result => !result.success);
    
    console.log(`📊 Email delivery summary:`);
    console.log(`✅ Successful: ${successfulEmails.length}/${recipients.length}`);
    console.log(`❌ Failed: ${failedEmails.length}/${recipients.length}`);
    
    if (successfulEmails.length > 0) {
      console.log('✅ Successfully sent to:', successfulEmails.map(r => r.email));
    }
    
    if (failedEmails.length > 0) {
      console.error('❌ Failed to send to:');
      failedEmails.forEach(result => {
        console.error(`  - ${result.email}: ${result.error}`);
      });
    }

    console.log(`🏁 Emergency notification completed: ${successfulEmails.length}/${recipients.length} emails sent successfully`);

    return new Response(
      JSON.stringify({
        message: 'Emergency notifications processed',
        recipients: recipients.length,
        emailsSent: successfulEmails.length,
        failedEmails: failedEmails.length,
        successfulEmails: successfulEmails.map(r => r.email),
        failedEmailDetails: failedEmails.map(r => ({
          email: r.email,
          error: r.error
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
