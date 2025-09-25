import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

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
  images?: string[];
  location?: string;
  notes?: string;
  incidentTime?: string;
  category?: string;
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
      images = [],
      location,
      notes,
      incidentTime,
      category,
      testMode = false,
      testEmail
    }: ObservationNotificationRequest = await req.json();

    console.log('Processing observation notification for observation:', observationId);

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

    // Get notification recipients - ONLY use site-specific recipients
    let recipients: any[] = [];

    console.log('=== OBSERVATION EMAIL NOTIFICATION START ===');
    console.log('Raw request body:', JSON.stringify({ title, siteId, teamId, guardId, severity, guardName, timestamp, description, images }));
    console.log('Images received:', images?.length || 0, 'images');
    console.log('RESEND_API_KEY found:', Deno.env.get('RESEND_API_KEY') ? Deno.env.get('RESEND_API_KEY')?.substring(0, 10) + '...' : 'NOT FOUND');
    console.log('Timestamp:', new Date().toISOString());

    // Parse request data
    const requestData = {
      title,
      siteId: siteId || '',
      teamId: teamId || '',
      guardId,
      severity,
      guardName,
      timestamp,
      description
    };
    
    console.log('Parsed request data:', JSON.stringify(requestData));

    if (siteId && !testMode) {
      console.log('Looking for site-specific recipients for siteId:', siteId);
      
      const { data: siteRecipients, error: siteError } = await supabase
        .from('site_notification_settings')
        .select('email, name, notify_for_severity')
        .eq('site_id', siteId)
        .eq('active', true);

      if (siteError) {
        console.error('Error fetching site recipients:', siteError);
      }

      console.log('Site-specific recipients found:', siteRecipients?.map(r => r.email) || []);

      if (siteRecipients && siteRecipients.length > 0) {
        recipients = siteRecipients.filter(recipient => {
          if (!recipient.email) return false;
          
          // If no severity filter is set, include the recipient
          if (!recipient.notify_for_severity) return true;
          
          // If severity filter is set and is an array, check if it includes the severity
          if (Array.isArray(recipient.notify_for_severity)) {
            return recipient.notify_for_severity.includes(severity);
          }
          
          // If severity filter is not an array, include the recipient
          return true;
        });
        
        console.log('Site-specific recipients found:', recipients.map(r => r.email));
      }
    }

    // If we have a specific siteId, we should ONLY use site-specific recipients
    // Do NOT fall back to team or admin recipients if siteId is provided
    if (siteId && recipients.length === 0 && !testMode) {
      console.log('No recipients found for specific site:', siteId);
      console.log('This is expected behavior - only site-specific recipients should receive notifications');
      
      return new Response(
        JSON.stringify({ 
          message: 'No recipients configured for this site',
          siteId: siteId,
          observationId: observationId
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle test mode
    if (testMode && testEmail) {
      recipients = [{ email: testEmail, name: 'Test Recipient' }];
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

    // Get complete observation data from database if available
    let fullObservationData = null;
    if (observationId) {
      const { data: observationData } = await supabase
        .from('patrol_observations')
        .select('*')
        .eq('id', observationId)
        .single();
      fullObservationData = observationData;
    }

    // Build image attachments array for embedding - limit to first 5 images to prevent duplication
    const imageAttachments = [];
    console.log('Processing images for observation:', images?.length || 0, 'images found');
    
    // Ensure we only process unique images and limit to 5
    const uniqueImages = Array.from(new Set(images || [])).slice(0, 5);
    console.log('Processing unique images:', uniqueImages.length, 'after deduplication and limiting to 5');
    
    if (uniqueImages.length > 0) {
      for (let i = 0; i < uniqueImages.length; i++) {
        const imageUrl = uniqueImages[i];
        console.log(`Processing image ${i + 1}/${uniqueImages.length}:`, imageUrl.substring(0, 50) + '...');
        
        try {
          if (imageUrl.startsWith('data:')) {
            // Handle base64 data URLs (from camera/file selection)
            const [mimeTypeSection, base64Data] = imageUrl.split(',');
            if (!base64Data) {
              console.error('Invalid data URL format for image:', i + 1);
              continue;
            }
            
            const mimeType = mimeTypeSection.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
            const extension = mimeType.split('/')[1] || 'jpg';
            
            const attachment = {
              filename: `observation_photo_${i + 1}.${extension}`,
              content: base64Data,
              content_id: `observation_img_${i + 1}`,
              disposition: 'inline'
            };
            
            imageAttachments.push(attachment);
            console.log(`✅ Successfully processed data URL image ${i + 1} (${mimeType})`);
          } else {
            // Handle regular URLs (fetch and convert)
            console.log(`Fetching external image ${i + 1}:`, imageUrl);
            const response = await fetch(imageUrl);
            if (response.ok) {
              const arrayBuffer = await response.arrayBuffer();
              const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
              
              // Determine MIME type from URL or use default
              let mimeType = 'image/jpeg';
              if (imageUrl.includes('.png')) mimeType = 'image/png';
              else if (imageUrl.includes('.gif')) mimeType = 'image/gif';
              else if (imageUrl.includes('.webp')) mimeType = 'image/webp';
              
              const attachment = {
                filename: `observation_photo_${i + 1}.${mimeType.split('/')[1]}`,
                content: base64,
                content_id: `observation_img_${i + 1}`,
                disposition: 'inline'
              };
              
              imageAttachments.push(attachment);
              console.log(`✅ Successfully processed external image ${i + 1} (${mimeType})`);
            } else {
              console.error(`Failed to fetch external image ${i + 1}:`, response.status, response.statusText);
            }
          }
        } catch (error) {
          console.error(`Error processing image ${i + 1}:`, error);
        }
      }
      console.log('📸 Final image attachments count:', imageAttachments.length);
    } else {
      console.log('No images to process for this observation');
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Patrol Observation Notification</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 700px; margin: 0 auto; padding: 20px;">
            <div style="background: ${severityColors[severity as keyof typeof severityColors]}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">👁️ PATROL OBSERVATION</h1>
              <p style="margin: 5px 0 0 0; font-size: 18px;">Severity: ${severityLabels[severity as keyof typeof severityLabels]}</p>
            </div>
            
            <div style="background: #f9f9f9; padding: 20px; border: 1px solid #ddd;">
              <h2 style="color: #333; margin-top: 0;">${title}</h2>
              
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0;">
                <div>
                  <strong>Reported by:</strong> ${guardName}
                </div>
                ${siteName ? `
                <div>
                  <strong>Site:</strong> ${siteName}
                </div>
                ` : ''}
                <div>
                  <strong>Observation Time:</strong> ${new Date(timestamp).toLocaleString('el-GR', { timeZone: 'Europe/Athens' })}
                </div>
                ${incidentTime ? `
                <div>
                  <strong>Incident Time:</strong> ${new Date(incidentTime).toLocaleString('el-GR', { timeZone: 'Europe/Athens' })}
                </div>
                ` : ''}
                ${location ? `
                <div>
                  <strong>Location:</strong> ${location}
                </div>
                ` : ''}
                ${category ? `
                <div>
                  <strong>Category:</strong> ${category}
                </div>
                ` : ''}
              </div>
              
              <div style="margin: 20px 0;">
                <strong>Description:</strong>
                <div style="background: white; padding: 15px; border-left: 4px solid ${severityColors[severity as keyof typeof severityColors]}; margin: 10px 0; border-radius: 4px;">
                  ${description}
                </div>
              </div>

              ${notes ? `
                <div style="margin: 20px 0;">
                  <strong>Additional Notes:</strong>
                  <div style="background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 10px 0; border-radius: 4px;">
                    ${notes}
                  </div>
                </div>
              ` : ''}

              ${fullObservationData?.weather_conditions ? `
                <div style="margin: 15px 0;">
                  <strong>Weather Conditions:</strong> ${fullObservationData.weather_conditions}
                </div>
              ` : ''}

              ${fullObservationData?.witness_name ? `
                <div style="margin: 15px 0;">
                  <strong>Witness:</strong> ${fullObservationData.witness_name}
                </div>
              ` : ''}

              ${fullObservationData?.follow_up_required ? `
                <div style="margin: 15px 0; background: #fef3c7; padding: 10px; border-radius: 4px;">
                  <strong>⚠️ Follow-up Required</strong>
                </div>
              ` : ''}
              
              ${images.length > 0 ? `
                <div style="margin: 20px 0;">
                  <strong>Evidence Photos (${images.length}):</strong>
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin: 10px 0;">
                    ${imageAttachments.map((attachment, index) => `
                      <div style="text-align: center;">
                        <img src="cid:${attachment.content_id}" alt="Evidence Photo ${index + 1}" style="max-width: 100%; height: auto; border-radius: 4px; border: 1px solid #ddd;" />
                        <p style="margin: 5px 0; font-size: 12px; color: #666;">Photo ${index + 1}</p>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            </div>
            
            <div style="background: #e3f2fd; padding: 15px; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0 0 15px 0; font-size: 14px;">
                This is an automated notification from Sentinel Guard Patrol Observation System.
                <br>Please review and respond as needed according to your protocols.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin: 15px auto;">
                <tr>
                  <td style="background-color: #007bff; border-radius: 6px; text-align: center;">
                    <a href="mailto:${recipients.map(r => r.email).join(',')}?subject=Re: 👁️ PATROL OBSERVATION: ${severityLabels[severity as keyof typeof severityLabels]} - ${title}" 
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
        console.log(`⏳ Waiting 600ms before sending next observation email...`);
        await new Promise(resolve => setTimeout(resolve, 600));
      }
      
      try {
        console.log(`📧 Sending observation email ${i + 1}/${recipients.length} to ${recipient.email}...`);
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(recipient.email)) {
          console.error(`❌ Invalid email format: ${recipient.email}`);
          emailResults.push({ success: false, email: recipient.email, error: 'Invalid email format' });
          continue;
        }

        const emailData: any = {
          from: "OVIT Observations <observations@notifications.ovitguardly.com>",
          to: [recipient.email],
          subject: `👁️ PATROL OBSERVATION: ${severityLabels[severity as keyof typeof severityLabels]} - ${title}`,
          html: emailHtml,
        };

        // Add attachments if we have images
        if (imageAttachments.length > 0) {
          emailData.attachments = imageAttachments;
        }

        const emailResponse = await resend.emails.send(emailData);

        console.log(`✅ Observation email sent successfully to ${recipient.email}:`, emailResponse);
        
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
        console.error(`❌ Failed to send observation email to ${recipient.email}:`, error);
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
    console.log('📧 All observation email results summary:', emailResults.map(result => ({
      email: result.email,
      success: result.success,
      error: result.error
    })));
    
    const successfulEmails = emailResults.filter(result => result.success);
    const failedEmails = emailResults.filter(result => !result.success);
    
    // Store correlations for deliverability tracking
    for (const emailResult of successfulEmails) {
      if (emailResult.id && observationId) {
        try {
          await supabase
            .from('email_correlation')
            .insert({
              resend_message_id: emailResult.id,
              reference_type: 'patrol_observation',
              reference_id: observationId,
              recipient_email: emailResult.email,
              sent_at: new Date().toISOString()
            });
          console.log(`✅ Stored email correlation for ${emailResult.email}: ${emailResult.id}`);
        } catch (error) {
          console.error(`❌ Failed to store email correlation for ${emailResult.email}:`, error);
        }
      }
    }

    // Update patrol observation with primary email_id for backward compatibility
    const primaryEmailId = successfulEmails.find(result => result.id)?.id;
    if (primaryEmailId && observationId) {
      try {
        const { error: updateError } = await supabase
          .from('patrol_observations')
          .update({ email_id: primaryEmailId })
          .eq('id', observationId);
        
        if (updateError) {
          console.warn('⚠️ Failed to update patrol observation with email_id:', updateError);
        } else {
          console.log('✅ Updated patrol observation with email_id:', primaryEmailId);
        }
      } catch (error) {
        console.warn('⚠️ Error updating patrol observation with email_id:', error);
      }
    }
    
    console.log(`📊 Observation email delivery summary:`);
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

    console.log(`🏁 Observation notification completed: ${successfulEmails.length}/${recipients.length} emails sent successfully`);

    return new Response(
      JSON.stringify({
        message: 'Observation notifications processed',
        recipients: recipients.length,
        emailsSent: successfulEmails.length,
        failedEmails: failedEmails.length,
        successfulEmails: successfulEmails.map(r => r.email),
        failedEmailDetails: failedEmails.map(r => ({
          email: r.email,
          error: r.error
        })),
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