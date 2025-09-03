// Supervisor Reports Constants and Types

export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type Status = 'pending' | 'in-progress' | 'resolved';

export const REPORT_TITLES = {
  'routine_guard_inspection': 'Τακτικός Έλεγχος Φρουρού',
  'performance_evaluation': 'Αξιολόγηση Απόδοσης', 
  'safety_compliance_check': 'Έλεγχος Συμμόρφωσης Ασφαλείας',
  'equipment_inspection': 'Έλεγχος Εξοπλισμού',
  'patrol_quality_assessment': 'Αξιολόγηση Ποιότητας Περιπολίας',
  'incident_follow_up': 'Παρακολούθηση Περιστατικού',
  'training_assessment': 'Αξιολόγηση Εκπαίδευσης',
  'client_interaction_review': 'Αξιολόγηση Αλληλεπίδρασης με Πελάτη',
  'emergency_response_evaluation': 'Αξιολόγηση Αντίδρασης Έκτακτης Ανάγκης',
  'documentation_review': 'Αξιολόγηση Τεκμηρίωσης',
  'communication_assessment': 'Αξιολόγηση Επικοινωνίας',
  'general_observation': 'Γενική Παρατήρηση'
} as const;

export const REPORT_TYPES = {
  'routine_inspection': 'Τακτικός Έλεγχος',
  'incident_investigation': 'Διερεύνηση Περιστατικού',
  'compliance_audit': 'Έλεγχος Συμμόρφωσης',
  'safety_assessment': 'Αξιολόγηση Ασφάλειας',
  'performance_review': 'Αξιολόγηση Απόδοσης',
  'special_observation': 'Ειδική Παρατήρηση'
} as const;

export const OBSERVATION_TYPES = {
  'general_behavior': 'Γενική Συμπεριφορά',
  'patrol_execution': 'Εκτέλεση Περιπολίας',
  'checkpoint_scanning': 'Σάρωση Σημείων Ελέγχου',
  'client_interaction': 'Αλληλεπίδραση με Πελάτη',
  'emergency_response': 'Αντίδραση Έκτακτης Ανάγκης',
  'equipment_handling': 'Χειρισμός Εξοπλισμού',
  'documentation': 'Τεκμηρίωση',
  'communication': 'Επικοινωνία'
} as const;

export const PERFORMANCE_RATINGS = {
  'excellent': 'Άριστη',
  'good': 'Καλή',
  'satisfactory': 'Ικανοποιητική',
  'needs_improvement': 'Χρειάζεται Βελτίωση',
  'poor': 'Κακή'
} as const;

export const COMPLIANCE_STATUS = {
  'fully_compliant': 'Πλήρως Συμμορφωμένος',
  'minor_issues': 'Μικρά Προβλήματα',
  'major_issues': 'Μεγάλα Προβλήματα',
  'non_compliant': 'Μη Συμμορφωμένος'
} as const;

export const EQUIPMENT_STATUS = {
  'fully_operational': 'Πλήρως Λειτουργικός',
  'partial_issues': 'Μερικά Προβλήματα',
  'non_functional': 'Μη Λειτουργικός',
  'missing': 'Λείπει'
} as const;

export const IMMEDIATE_ACTIONS = {
  'none_required': 'Καμία Δεν Απαιτείται',
  'verbal_guidance': 'Προφορική Καθοδήγηση',
  'written_instruction': 'Γραπτές Οδηγίες',
  'corrective_action': 'Διορθωτική Ενέργεια',
  'equipment_repair': 'Επισκευή/Αντικατάσταση Εξοπλισμού',
  'training_scheduled': 'Προγραμματισμένη Εκπαίδευση',
  'disciplinary_action': 'Πειθαρχική Ενέργεια'
} as const;

export const WEATHER_CONDITIONS = {
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
} as const;

export interface SupervisorReportDescription {
  report_type?: keyof typeof REPORT_TYPES;
  observation_type?: keyof typeof OBSERVATION_TYPES;
  selected_guards?: string[];
  behavioral_observation?: string;
  performance_rating?: keyof typeof PERFORMANCE_RATINGS;
  compliance_status?: keyof typeof COMPLIANCE_STATUS;
  safety_concerns?: string;
  other_findings?: string;
  equipment_status?: keyof typeof EQUIPMENT_STATUS;
  immediate_action_taken?: keyof typeof IMMEDIATE_ACTIONS;
  corrective_measures?: string;
  weather_conditions?: keyof typeof WEATHER_CONDITIONS;
  additional_notes?: string;
}

export interface SupervisorReport {
  id?: string;
  supervisor_id: string;
  supervisor_name?: string;
  site_id?: string;
  guard_id?: string;
  team_id?: string;
  title: string;
  description?: SupervisorReportDescription;
  severity: Severity;
  status: Status;
  location?: string;
  latitude?: number;
  longitude?: number;
  notes?: any[];
  image_url?: string;
  incident_time?: string;
  resolved_at?: string;
  resolved_by?: string;
  created_at?: string;
  updated_at?: string;
}

export const getSeverityColor = (severity: Severity): string => {
  switch (severity) {
    case 'low': return 'text-green-600 bg-green-100 border-green-200';
    case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
    case 'high': return 'text-orange-600 bg-orange-100 border-orange-200';
    case 'critical': return 'text-red-600 bg-red-100 border-red-200';
    default: return 'text-gray-600 bg-gray-100 border-gray-200';
  }
};

export const getStatusColor = (status: Status): string => {
  switch (status) {
    case 'pending': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
    case 'in-progress': return 'text-blue-600 bg-blue-100 border-blue-200';
    case 'resolved': return 'text-green-600 bg-green-100 border-green-200';
    default: return 'text-gray-600 bg-gray-100 border-gray-200';
  }
};