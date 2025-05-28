
export const EMERGENCY_TYPES = {
  unsafe_area: {
    en: 'Unsafe Area',
    el: 'Ανασφαλής Χώρος'
  },
  theft_attempt: {
    en: 'Theft Attempt',
    el: 'Απόπειρα Υπεξαίρεσης'
  },
  dangerous_object: {
    en: 'Dangerous Object',
    el: 'Επικίνδυνο Αντικείμενο'
  },
  suspicious_incident: {
    en: 'Suspicious Incident',
    el: 'Ύποπτο Περιστατικό'
  },
  vandalism: {
    en: 'Vandalism',
    el: 'Βανδαλισμός'
  },
  theft: {
    en: 'Theft',
    el: 'Υπεξαίρεση'
  },
  material_damage: {
    en: 'Material Damage',
    el: 'Φθορά Υλικού'
  },
  perimeter_breach: {
    en: 'Perimeter Breach',
    el: 'Παραβίαση Περιμέτρου'
  },
  malfunction: {
    en: 'Malfunction/Breakdown',
    el: 'Βλάβη'
  },
  company_personnel_incident: {
    en: 'Incident Involving Company Personnel',
    el: 'Συμβάν με Εμπλεκόμενο Προσωπικό της Εταιρείας'
  },
  visitor_incident: {
    en: 'Incident Involving Visitor',
    el: 'Συμβάν με Εμπλεκόμενο Επισκέπτη'
  },
  union_action: {
    en: 'Union Action - Protest',
    el: 'Συνδικαλιστική Δράση - Διαμαρτυρία'
  },
  public_authority_inspection: {
    en: 'Inspection by Public Authority',
    el: 'Έλεγχος από Δημόσια Αρχή'
  },
  perimeter_alarm: {
    en: 'Perimeter Breach Alarm Indication',
    el: 'Ένδειξη Συναγερμού Παραβίασης Περιμέτρου'
  },
  fire_alarm: {
    en: 'Fire Safety Alarm Indication',
    el: 'Ένδειξη Συναγερμού Πυρασφάλειας'
  },
  natural_disaster: {
    en: 'Natural Disaster',
    el: 'Φυσική Καταστροφή'
  },
  other: {
    en: 'Other',
    el: 'Άλλο'
  }
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
