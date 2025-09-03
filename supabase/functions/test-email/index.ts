import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestEmailRequest {
  recipient: string;
  subject?: string;
  message?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('🚀 Test email function started');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;

    console.log('🔑 Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseServiceKey: !!supabaseServiceKey, 
      hasResendApiKey: !!resendApiKey,
      resendKeyLength: resendApiKey?.length || 0
    });

    if (!supabaseUrl || !supabaseServiceKey || !resendApiKey) {
      console.error('❌ Missing environment variables');
      throw new Error('Missing required environment variables');
    }

    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ No authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    
    // Verify the user token and get user info
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ User authenticated:', user.email);

    // Check if user is admin
    const { data: userRoles, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (roleError) {
      console.error('❌ Role check error:', roleError);
      return new Response(
        JSON.stringify({ error: 'Error checking user roles' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isAdmin = userRoles?.some(r => r.role === 'admin' || r.role === 'super_admin');
    if (!isAdmin) {
      console.error('❌ User not admin:', user.email);
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Admin access confirmed for:', user.email);

    const { recipient, subject = 'Test Email από OVIT Security', message = 'Αυτό είναι ένα test email από το σύστημα OVIT Security.' }: TestEmailRequest = await req.json();

    console.log('📧 Sending test email to:', recipient);

    const resend = new Resend(resendApiKey);

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 20px;">
        <div style="background: white; border-radius: 8px; padding: 30px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb;">
            <h1 style="color: #1f2937; margin: 0; font-size: 28px; font-weight: 700;">OVIT Security</h1>
            <p style="color: #6b7280; margin: 8px 0 0 0; font-size: 16px; font-weight: 500;">Test Email Notification</p>
          </div>
          
          <div style="margin-bottom: 25px; padding: 20px; background: #f0f9ff; border-radius: 8px; border-left: 4px solid #0ea5e9;">
            <h3 style="margin: 0 0 15px 0; color: #0369a1; font-size: 18px; font-weight: 600;">Test Message</h3>
            <p style="margin: 0; color: #0369a1; line-height: 1.6; font-size: 16px;">${message}</p>
          </div>
          
          <div style="margin-bottom: 25px; padding: 15px; background: #ecfdf5; border-radius: 6px; border-left: 3px solid #10b981;">
            <p style="margin: 0; color: #047857; font-size: 14px;">
              <strong>✅ Email system status:</strong> Working correctly<br>
              <strong>📧 Sent from:</strong> notifications@ovitguardly.com<br>
              <strong>⏰ Timestamp:</strong> ${new Date().toLocaleString('el-GR')}<br>
              <strong>👤 Sent by:</strong> ${user.email}
            </p>
          </div>
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
            <p style="margin: 0; color: #9ca3af; font-size: 12px;">
              This is a test email from the OVIT Security notification system.<br>
              If you received this email, the system is working correctly.
            </p>
          </div>
        </div>
      </div>
    `;

    const emailResult = await resend.emails.send({
      from: 'OVIT Security <notifications@ovitguardly.com>',
      to: [recipient],
      subject: subject,
      html: htmlContent
    });

    console.log('✅ Test email sent successfully:', emailResult);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Test email sent successfully',
        recipient,
        emailId: emailResult.data?.id,
        sentBy: user.email,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('❌ Error in test email function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);