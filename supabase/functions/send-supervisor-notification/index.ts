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

    console.log('🔑 Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseServiceKey: !!supabaseServiceKey, 
      hasResendApiKey: !!resendApiKey,
      resendKeyLength: resendApiKey?.length || 0
    });

    if (!supabaseUrl || !supabaseServiceKey || !resendApiKey) {
      console.error('❌ Missing environment variables:', {
        supabaseUrl: !!supabaseUrl,
        supabaseServiceKey: !!supabaseServiceKey,
        resendApiKey: !!resendApiKey
      });
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

    // Constants for mapping values
    const REPORT_TYPES = {
      'routine_inspection': 'Τακτικός Έλεγχος',
      'incident_investigation': 'Διερεύνηση Περιστατικού',
      'compliance_audit': 'Έλεγχος Συμμόρφωσης',
      'safety_assessment': 'Αξιολόγηση Ασφάλειας',
      'performance_review': 'Αξιολόγηση Απόδοσης',
      'special_observation': 'Ειδική Παρατήρηση'
    };

    const OBSERVATION_TYPES = {
      'general_behavior': 'Γενική Συμπεριφορά',
      'patrol_execution': 'Εκτέλεση Περιπολίας',
      'checkpoint_scanning': 'Σάρωση Σημείων Ελέγχου',
      'client_interaction': 'Αλληλεπίδραση με Πελάτη',
      'emergency_response': 'Αντίδραση Έκτακτης Ανάγκης',
      'equipment_handling': 'Χειρισμός Εξοπλισμού',
      'documentation': 'Τεκμηρίωση',
      'communication': 'Επικοινωνία'
    };

    const PERFORMANCE_RATINGS = {
      'excellent': 'Άριστη',
      'good': 'Καλή',
      'satisfactory': 'Ικανοποιητική',
      'needs_improvement': 'Χρειάζεται Βελτίωση',
      'poor': 'Κακή'
    };

    const COMPLIANCE_STATUS = {
      'fully_compliant': 'Πλήρως Συμμορφωμένος',
      'minor_issues': 'Μικρά Προβλήματα',
      'major_issues': 'Μεγάλα Προβλήματα',
      'non_compliant': 'Μη Συμμορφωμένος'
    };

    const EQUIPMENT_STATUS = {
      'fully_operational': 'Πλήρως Λειτουργικός',
      'partial_issues': 'Μερικά Προβλήματα',
      'non_functional': 'Μη Λειτουργικός',
      'missing': 'Λείπει'
    };

    const IMMEDIATE_ACTIONS = {
      'none_required': 'Καμία Δεν Απαιτείται',
      'verbal_guidance': 'Προφορική Καθοδήγηση',
      'written_instruction': 'Γραπτές Οδηγίες',
      'corrective_action': 'Διορθωτική Ενέργεια',
      'equipment_repair': 'Επισκευή/Αντικατάσταση Εξοπλισμού',
      'training_scheduled': 'Προγραμματισμένη Εκπαίδευση',
      'disciplinary_action': 'Πειθαρχική Ενέργεια'
    };

    const WEATHER_CONDITIONS = {
      'clear_day': 'Αίθριος/Μέρα',
      'clear_night': 'Αίθριος/Νύχτα',
      'rainy_day': 'Βροχερός/Μέρα',
      'rainy_night': 'Βροχερός/Νύχτα',
      'windy_day': 'Ανεμώδης/Μέρα',
      'windy_night': 'Ανεμώδης/Νύχτα',
      'hot_day': 'Ζεστός/Μέρα',
      'cold_day': 'Κρύος/Μέρα',
      'cold_night': 'Κρύος/Νύχτα',
      'foggy_day': 'Ομιχλώδης/Μέρα',
      'foggy_night': 'Ομιχλώδης/Νύχτα',
      'cloudy_day': 'Συννεφιασμένος/Μέρα',
      'cloudy_night': 'Συννεφιασμένος/Νύχτα',
      'good_visibility': 'Καλή Ορατότητα',
      'poor_visibility': 'Κακή Ορατότητα',
      'very_poor_visibility': 'Πολύ Κακή Ορατότητα',
      'stormy': 'Καταιγιδώδης',
      'snowy': 'Χιονώδης',
      'humid': 'Υγρός',
      'dry': 'Ξηρός'
    };

    // Create HTML email content with organized sections
    const severityColors = {
      'low': '#10B981',
      'medium': '#F59E0B', 
      'high': '#EF4444',
      'critical': '#DC2626'
    };

    const severityColor = severityColors[report.severity as keyof typeof severityColors] || '#6B7280';

    // Helper function to create a section
    const createSection = (number: number, title: string, content: string) => {
      if (!content.trim()) return '';
      return `
        <div style="margin-bottom: 25px; padding: 20px; background: #f9fafb; border-radius: 8px; border-left: 4px solid #e5e7eb;">
          <div style="display: flex; align-items: center; margin-bottom: 15px;">
            <div style="width: 32px; height: 32px; background: #3b82f6; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 14px; margin-right: 12px;">
              ${number}
            </div>
            <h3 style="margin: 0; color: #374151; font-size: 16px; font-weight: 600;">${title}</h3>
          </div>
          <div style="margin-left: 44px;">
            ${content}
          </div>
        </div>
      `;
    };

    // Section 1: Basic Information
    const basicInfoContent = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div>
          <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Τίτλος Αναφοράς</p>
          <p style="margin: 0 0 12px 0; color: #374151; font-weight: 500;">${report.title}</p>
        </div>
        ${parsedDescription?.report_type ? `
          <div>
            <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Τύπος Αναφοράς</p>
            <p style="margin: 0 0 12px 0; color: #374151; font-weight: 500;">${REPORT_TYPES[parsedDescription.report_type as keyof typeof REPORT_TYPES] || parsedDescription.report_type}</p>
          </div>
        ` : ''}
      </div>
      <div>
        <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Σπουδαιότητα</p>
        <span style="background: ${severityColor}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">
          ${report.severity}
        </span>
      </div>
    `;

    // Section 2: Location & Environment
    const locationContent = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
        <div>
          <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Έργο</p>
          <p style="margin: 0 0 12px 0; color: #374151; font-weight: 500;">${siteName}</p>
        </div>
        ${parsedDescription?.weather_conditions ? `
          <div>
            <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Καιρικές Συνθήκες</p>
            <p style="margin: 0 0 12px 0; color: #374151; font-weight: 500;">${WEATHER_CONDITIONS[parsedDescription.weather_conditions as keyof typeof WEATHER_CONDITIONS] || parsedDescription.weather_conditions}</p>
          </div>
        ` : ''}
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div>
          <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Ημερομηνία/Ώρα Συμβάντος</p>
          <p style="margin: 0 0 12px 0; color: #374151; font-weight: 500;">${report.incidentTime ? new Date(report.incidentTime).toLocaleString('el-GR') : new Date(report.timestamp).toLocaleString('el-GR')}</p>
        </div>
        ${report.location ? `
          <div>
            <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Συγκεκριμένη Τοποθεσία</p>
            <p style="margin: 0 0 12px 0; color: #374151; font-weight: 500;">${report.location}</p>
          </div>
        ` : ''}
      </div>
    `;

    // Section 3: Observation Details
    const observationContent = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 15px;">
        ${parsedDescription?.observation_type ? `
          <div>
            <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Τύπος Παρατήρησης</p>
            <p style="margin: 0 0 12px 0; color: #374151; font-weight: 500;">${OBSERVATION_TYPES[parsedDescription.observation_type as keyof typeof OBSERVATION_TYPES] || parsedDescription.observation_type}</p>
          </div>
        ` : ''}
        ${parsedDescription?.performance_rating ? `
          <div>
            <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Αξιολόγηση Απόδοσης</p>
            <p style="margin: 0 0 12px 0; color: #374151; font-weight: 500;">${PERFORMANCE_RATINGS[parsedDescription.performance_rating as keyof typeof PERFORMANCE_RATINGS] || parsedDescription.performance_rating}</p>
          </div>
        ` : ''}
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 15px;">
        ${parsedDescription?.compliance_status ? `
          <div>
            <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Κατάσταση Συμμόρφωσης</p>
            <p style="margin: 0 0 12px 0; color: #374151; font-weight: 500;">${COMPLIANCE_STATUS[parsedDescription.compliance_status as keyof typeof COMPLIANCE_STATUS] || parsedDescription.compliance_status}</p>
          </div>
        ` : ''}
        ${parsedDescription?.equipment_status ? `
          <div>
            <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Κατάσταση Εξοπλισμού</p>
            <p style="margin: 0 0 12px 0; color: #374151; font-weight: 500;">${EQUIPMENT_STATUS[parsedDescription.equipment_status as keyof typeof EQUIPMENT_STATUS] || parsedDescription.equipment_status}</p>
          </div>
        ` : ''}
      </div>
      ${parsedDescription?.behavioral_observation ? `
        <div style="margin-bottom: 15px;">
          <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Συμπεριφορικές Παρατηρήσεις</p>
          <div style="background: #f0f9ff; padding: 12px; border-radius: 6px; border-left: 3px solid #0ea5e9;">
            <p style="margin: 0; color: #0369a1; line-height: 1.5;">${parsedDescription.behavioral_observation}</p>
          </div>
        </div>
      ` : ''}
      ${parsedDescription?.safety_concerns ? `
        <div style="margin-bottom: 15px;">
          <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Ανησυχίες Ασφάλειας</p>
          <div style="background: #fef3c7; padding: 12px; border-radius: 6px; border-left: 3px solid #f59e0b;">
            <p style="margin: 0; color: #b45309; line-height: 1.5;">${parsedDescription.safety_concerns}</p>
          </div>
        </div>
      ` : ''}
      ${parsedDescription?.other_findings ? `
        <div>
          <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Άλλα Ευρήματα</p>
          <div style="background: #f3f4f6; padding: 12px; border-radius: 6px; border-left: 3px solid #9ca3af;">
            <p style="margin: 0; color: #374151; line-height: 1.5;">${parsedDescription.other_findings}</p>
          </div>
        </div>
      ` : ''}
    `;

    // Section 4: Actions & Measures
    const actionsContent = `
      ${parsedDescription?.immediate_action_taken ? `
        <div style="margin-bottom: 15px;">
          <p style="margin: 0 0 4px 0; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Άμεσες Ενέργειες που Λήφθηκαν</p>
          <p style="margin: 0 0 12px 0; color: #374151; font-weight: 500;">${IMMEDIATE_ACTIONS[parsedDescription.immediate_action_taken as keyof typeof IMMEDIATE_ACTIONS] || parsedDescription.immediate_action_taken}</p>
        </div>
      ` : ''}
      ${parsedDescription?.corrective_measures ? `
        <div>
          <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Διορθωτικά Μέτρα</p>
          <div style="background: #ecfdf5; padding: 12px; border-radius: 6px; border-left: 3px solid #10b981;">
            <p style="margin: 0; color: #047857; line-height: 1.5;">${parsedDescription.corrective_measures}</p>
          </div>
        </div>
      ` : ''}
    `;

    // Section 5: Evidence Photo
    const evidenceContent = report.imageUrl ? `
      <div style="text-align: center;">
        <img src="${report.imageUrl}" alt="Evidence Photo" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 12px; font-style: italic;">Φωτογραφία Αποδεικτικού Στοιχείου</p>
      </div>
    ` : '<p style="margin: 0; color: #9ca3af; font-style: italic;">Δεν έχει επισυναφθεί φωτογραφία</p>';

    // Additional Information
    const additionalContent = parsedDescription?.additional_notes ? `
      <div style="background: #f8fafc; padding: 15px; border-radius: 6px; border-left: 3px solid #64748b;">
        <p style="margin: 0; color: #475569; line-height: 1.5;">${parsedDescription.additional_notes}</p>
      </div>
    ` : '';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; background: #f8fafc; padding: 20px;">
        <div style="background: white; border-radius: 8px; padding: 30px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb;">
            <h1 style="color: #1f2937; margin: 0; font-size: 28px; font-weight: 700;">OVIT Security</h1>
            <p style="color: #6b7280; margin: 8px 0 0 0; font-size: 16px; font-weight: 500;">Supervisor Report Notification</p>
            <div style="margin-top: 15px;">
              <p style="margin: 0; color: #374151; font-size: 14px;"><strong>Supervisor:</strong> ${report.supervisorName}</p>
              <p style="margin: 4px 0 0 0; color: #374151; font-size: 14px;"><strong>Date:</strong> ${new Date(report.timestamp).toLocaleString('el-GR')}</p>
            </div>
          </div>

          <!-- Section 1: Basic Information -->
          ${createSection(1, 'Βασικές Πληροφορίες', basicInfoContent)}

          <!-- Section 2: Location & Environment -->
          ${createSection(2, 'Τοποθεσία & Περιβάλλον', locationContent)}

          <!-- Section 3: Observation Details -->
          ${createSection(3, 'Λεπτομέρειες Παρατήρησης', observationContent)}

          <!-- Section 4: Actions & Measures -->
          ${parsedDescription?.immediate_action_taken || parsedDescription?.corrective_measures ? createSection(4, 'Ενέργειες & Μέτρα', actionsContent) : ''}

          <!-- Section 5: Evidence Photo -->
          ${createSection(5, 'Φωτογραφία Αποδεικτικού Στοιχείου', evidenceContent)}

          <!-- Additional Information -->
          ${additionalContent ? `
            <div style="margin-bottom: 25px; padding: 20px; background: #f9fafb; border-radius: 8px; border-left: 4px solid #e5e7eb;">
              <h3 style="margin: 0 0 15px 0; color: #374151; font-size: 16px; font-weight: 600;">Πρόσθετες Πληροφορίες</h3>
              ${additionalContent}
            </div>
          ` : ''}
          
          <!-- Footer -->
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center;">
            <p style="margin: 0; color: #9ca3af; font-size: 12px;">
              This supervisor report was submitted through the OVIT Security system.<br>
              Site: ${siteName} | Supervisor: ${report.supervisorName}
            </p>
          </div>
        </div>
      </div>
    `;

    // Send emails to all recipients
    console.log(`🔍 Attempting to send ${recipients.size} emails using domain: notifications@ovitguardly.com`);
    
    const emailPromises = Array.from(recipients).map(async (email, index) => {
      try {
        console.log(`📧 Sending email ${index + 1}/${recipients.size} to: ${email}`);
        const result = await resend.emails.send({
          from: 'OVIT Security <notifications@ovitguardly.com>',
          to: [email],
          subject: `Ovit Sentinel Supervisor Report - ${report.severity.toUpperCase()}`,
          html: htmlContent
        });
        console.log(`✅ Email sent successfully to ${email}:`, result);
        return result;
      } catch (emailError) {
        console.error(`❌ Failed to send email to ${email}:`, emailError);
        throw emailError;
      }
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
        reference_id: null, // No reportId available from trigger
        team_id: report.teamId,
        site_id: report.siteId,
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