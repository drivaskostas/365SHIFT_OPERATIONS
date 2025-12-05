import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ObligationCompletionRequest {
  obligationId: string;
  completionId: string;
  title: string;
  description?: string;
  category?: string;
  priority?: string;
  contractName?: string;
  clientName?: string;
  completedByName: string;
  completedAt: string;
  scheduledDate: string;
  notes?: string;
  checklistResponses?: Record<string, boolean>;
  photoUrls?: string[];
  signatureUrl?: string;
  notificationEmails: string[];
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

    const requestData: ObligationCompletionRequest = await req.json();

    console.log('=== OBLIGATION EMAIL NOTIFICATION START ===');
    console.log('Obligation ID:', requestData.obligationId);
    console.log('Notification emails:', requestData.notificationEmails);

    // Validate we have recipients
    if (!requestData.notificationEmails || requestData.notificationEmails.length === 0) {
      console.log('No notification emails configured, skipping');
      return new Response(
        JSON.stringify({ message: 'No notification emails configured' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Category icons and colors
    const categoryConfig: Record<string, { icon: string; color: string }> = {
      cleaning: { icon: '🧹', color: '#10b981' },
      maintenance: { icon: '🔧', color: '#f59e0b' },
      security: { icon: '🔒', color: '#3b82f6' },
      inspection: { icon: '🔍', color: '#8b5cf6' },
      safety: { icon: '⚠️', color: '#ef4444' },
      administrative: { icon: '📋', color: '#6b7280' },
      other: { icon: '📌', color: '#64748b' }
    };

    const category = requestData.category?.toLowerCase() || 'other';
    const { icon, color } = categoryConfig[category] || categoryConfig.other;

    // Priority colors
    const priorityColors: Record<string, string> = {
      high: '#ef4444',
      medium: '#f59e0b',
      low: '#10b981'
    };
    const priorityColor = priorityColors[requestData.priority?.toLowerCase() || 'medium'] || '#6b7280';

    // Format checklist
    let checklistHtml = '';
    if (requestData.checklistResponses && Object.keys(requestData.checklistResponses).length > 0) {
      const checklistItems = Object.entries(requestData.checklistResponses)
        .map(([item, completed]) => `
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">
              ${completed ? '✅' : '❌'} ${item}
            </td>
          </tr>
        `).join('');
      
      checklistHtml = `
        <div style="margin: 20px 0;">
          <h3 style="color: #374151; margin-bottom: 10px;">📋 Checklist</h3>
          <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden;">
            ${checklistItems}
          </table>
        </div>
      `;
    }

    // Format photos with actual images
    let photosHtml = '';
    if (requestData.photoUrls && requestData.photoUrls.length > 0) {
      const photoImages = requestData.photoUrls.map((url, index) => `
        <div style="margin: 5px; display: inline-block;">
          <a href="${url}" target="_blank">
            <img src="${url}" alt="Photo ${index + 1}" style="max-width: 200px; max-height: 200px; border-radius: 8px; border: 1px solid #e5e7eb;" />
          </a>
        </div>
      `).join('');
      
      photosHtml = `
        <div style="margin: 20px 0;">
          <h3 style="color: #374151; margin-bottom: 10px;">📸 Photos (${requestData.photoUrls.length})</h3>
          <div style="display: flex; flex-wrap: wrap; gap: 10px;">
            ${photoImages}
          </div>
        </div>
      `;
    }

    // Format signature with actual image
    let signatureHtml = '';
    if (requestData.signatureUrl) {
      signatureHtml = `
        <div style="margin: 20px 0;">
          <h3 style="color: #374151; margin-bottom: 10px;">✍️ Signature</h3>
          <div style="background: white; padding: 10px; border-radius: 8px; border: 1px solid #e5e7eb; display: inline-block;">
            <img src="${requestData.signatureUrl}" alt="Signature" style="max-width: 300px; max-height: 150px;" />
          </div>
        </div>
      `;
    }

    // Format notes
    let notesHtml = '';
    if (requestData.notes) {
      notesHtml = `
        <div style="margin: 20px 0;">
          <h3 style="color: #374151; margin-bottom: 10px;">📝 Notes</h3>
          <div style="background: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; border-radius: 8px;">
            ${requestData.notes}
          </div>
        </div>
      `;
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Obligation Completed</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <!-- Header -->
            <div style="background: ${color}; color: white; padding: 25px; border-radius: 16px 16px 0 0; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 10px;">${icon}</div>
              <h1 style="margin: 0; font-size: 24px;">Obligation Completed</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">${requestData.category || 'Task'}</p>
            </div>
            
            <!-- Content -->
            <div style="background: #f9fafb; padding: 25px; border: 1px solid #e5e7eb; border-top: none;">
              <!-- Title -->
              <h2 style="color: #111827; margin: 0 0 20px 0; font-size: 20px;">${requestData.title}</h2>
              
              <!-- Info Grid -->
              <div style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; width: 140px;">Contract:</td>
                    <td style="padding: 8px 0; color: #111827; font-weight: 500;">${requestData.contractName || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Client:</td>
                    <td style="padding: 8px 0; color: #111827; font-weight: 500;">${requestData.clientName || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Priority:</td>
                    <td style="padding: 8px 0;">
                      <span style="background: ${priorityColor}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                        ${(requestData.priority || 'Medium').toUpperCase()}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Scheduled Date:</td>
                    <td style="padding: 8px 0; color: #111827;">${new Date(requestData.scheduledDate).toLocaleDateString('el-GR')}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Completed At:</td>
                    <td style="padding: 8px 0; color: #111827;">${new Date(requestData.completedAt).toLocaleString('el-GR', { timeZone: 'Europe/Athens' })}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280;">Completed By:</td>
                    <td style="padding: 8px 0; color: #111827; font-weight: 500;">${requestData.completedByName}</td>
                  </tr>
                </table>
              </div>

              ${requestData.description ? `
                <div style="margin: 20px 0;">
                  <h3 style="color: #374151; margin-bottom: 10px;">📄 Description</h3>
                  <div style="background: white; padding: 15px; border-radius: 8px; color: #4b5563;">
                    ${requestData.description}
                  </div>
                </div>
              ` : ''}

              ${checklistHtml}
              ${photosHtml}
              ${signatureHtml}
              ${notesHtml}
            </div>
            
            <!-- Footer -->
            <div style="background: #e5e7eb; padding: 20px; border-radius: 0 0 16px 16px; text-align: center;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                This is an automated notification from 365Shift Operations.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send emails
    const emailResults: Array<{ success: boolean; email: string; error?: any; id?: string }> = [];

    for (let i = 0; i < requestData.notificationEmails.length; i++) {
      const email = requestData.notificationEmails[i].trim();
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        console.error(`Invalid email format: ${email}`);
        emailResults.push({ success: false, email, error: 'Invalid email format' });
        continue;
      }

      // Rate limiting delay
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 600));
      }

      try {
        console.log(`📧 Sending email ${i + 1}/${requestData.notificationEmails.length} to ${email}...`);

        const emailResponse = await resend.emails.send({
          from: "365Shift Operations <operations@shiftask.app>",
          to: email,
          subject: `${icon} Obligation Completed: ${requestData.title}`,
          html: emailHtml,
        });

        if (emailResponse.error) {
          console.error(`❌ Resend API error for ${email}:`, emailResponse.error);
          emailResults.push({ success: false, email, error: emailResponse.error });
        } else {
          console.log(`✅ Email sent to ${email}:`, emailResponse.data?.id);
          emailResults.push({ success: true, email, id: emailResponse.data?.id });
        }
      } catch (error: any) {
        console.error(`❌ Failed to send email to ${email}:`, error);
        emailResults.push({ success: false, email, error: error.message });
      }
    }

    // Store email correlations
    for (const result of emailResults.filter(r => r.success && r.id)) {
      try {
        await supabase
          .from('email_correlation')
          .insert({
            resend_message_id: result.id,
            reference_type: 'obligation_completion',
            reference_id: requestData.completionId,
            recipient_email: result.email,
            sent_at: new Date().toISOString()
          });
      } catch (error) {
        console.error(`Failed to store email correlation:`, error);
      }
    }

    const successCount = emailResults.filter(r => r.success).length;
    console.log(`📊 Email summary: ${successCount}/${requestData.notificationEmails.length} sent successfully`);

    return new Response(
      JSON.stringify({
        message: 'Obligation completion notifications processed',
        emailsSent: successCount,
        totalRecipients: requestData.notificationEmails.length,
        results: emailResults
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in send-obligation-email function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);
