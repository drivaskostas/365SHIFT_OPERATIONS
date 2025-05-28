
export const EMERGENCY_TYPES = {
  unsafe_area: 'Επικίνδυνη Περιοχή',
  theft_attempt: 'Απόπειρα Κλοπής',
  vandalism: 'Βανδαλισμός',
  suspicious_activity: 'Ύποπτη Δραστηριότητα',
  medical_emergency: 'Ιατρική Επείγουσα Ανάγκη',
  fire_hazard: 'Κίνδυνος Πυρκαγιάς',
  security_breach: 'Παραβίαση Ασφαλείας',
  equipment_malfunction: 'Βλάβη Εξοπλισμού',
  unauthorized_access: 'Μη Εξουσιοδοτημένη Πρόσβαση',
  violence_threat: 'Απειλή Βίας',
  property_damage: 'Ζημιά Περιουσίας',
  environmental_hazard: 'Περιβαλλοντικός Κίνδυνος',
  missing_person: 'Αγνοούμενο Άτομο',
  accident: 'Ατύχημα',
  other: 'Άλλο'
} as const;

export type EmergencyType = keyof typeof EMERGENCY_TYPES;

export interface EmergencyReportData {
  emergency_type: EmergencyType;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  location_description: string;
  involved_persons_details?: string;
  images?: string[];
}

export interface EmergencyReportHistory {
  id: string;
  report_id: string;
  action_type: 'status_change' | 'note_added' | 'created' | 'deleted';
  previous_status?: string;
  new_status?: string;
  note?: string;
  user_id: string;
  user_name: string;
  created_at: string;
}
