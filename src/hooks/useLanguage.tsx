
import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'el';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translation dictionary
const translations = {
  en: {
    // App title and navigation
    'app.title': 'Sentinel Guard',
    'nav.dashboard': 'Dashboard',
    'nav.scan': 'Scan',
    'nav.report': 'Report',
    
    // Dashboard
    'dashboard.welcome': 'Welcome, Security Officer',
    'dashboard.on_duty': 'On Duty',
    'dashboard.scan_description': 'Scan QR checkpoints',
    'dashboard.report_description': 'Log observations',
    'dashboard.emergency': 'Emergency',
    'dashboard.emergency_description': 'Report emergencies',
    'dashboard.patrol_rounds': 'Patrol Rounds',
    'dashboard.observations': 'Observations',
    'dashboard.incidents': 'Incidents',
    'dashboard.status': 'Status',
    'dashboard.active': 'Active',
    'dashboard.recent_activity': 'Recent Activity',
    'dashboard.checkpoint_scanned': 'Checkpoint Scanned',
    'dashboard.observation_logged': 'Observation Logged',
    'dashboard.patrol_started': 'Patrol Started',
    'dashboard.night_shift': 'Night Shift',
    'dashboard.minutes_ago': 'minutes ago',
    'dashboard.hour_ago': 'hour ago',
    
    // Emergency types
    'emergency.unsafe_area': 'Unsafe Area',
    'emergency.theft_attempt': 'Theft Attempt',
    'emergency.dangerous_object': 'Dangerous Object',
    'emergency.suspicious_incident': 'Suspicious Incident',
    'emergency.vandalism': 'Vandalism',
    'emergency.theft': 'Theft',
    'emergency.material_damage': 'Material Damage',
    'emergency.perimeter_breach': 'Perimeter Breach',
    'emergency.malfunction': 'Malfunction/Breakdown',
    'emergency.company_personnel_incident': 'Incident Involving Company Personnel',
    'emergency.visitor_incident': 'Incident Involving Visitor',
    'emergency.union_action': 'Union Action - Protest',
    'emergency.public_authority_inspection': 'Inspection by Public Authority',
    'emergency.perimeter_alarm': 'Perimeter Breach Alarm Indication',
    'emergency.fire_alarm': 'Fire Safety Alarm Indication',
    'emergency.natural_disaster': 'Natural Disaster',
    'emergency.other': 'Other',
    
    // Common UI elements
    'common.submit': 'Submit',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.close': 'Close',
    'common.back': 'Back',
    'common.loading': 'Loading...',
    
    // Buttons
    'button.sign_out': 'Sign Out',
    'button.language': 'Language',
    
    // Patrol observation
    'observation.title': 'Patrol Observation',
    'observation.details': 'Observation Details',
    'observation.observation_title': 'Observation Title',
    'observation.severity': 'Severity Level',
    'observation.description': 'Description',
    'observation.evidence_photos': 'Evidence Photos',
    'observation.capture_photos': 'Capture Photos',
    'observation.add_photo': 'Add Another Photo',
    'observation.take_photo': 'Take Photo',
    'observation.submit_observation': 'Submit Observation',
    
    // Severity levels
    'severity.low': 'Low - Minor issue',
    'severity.medium': 'Medium - Requires attention',
    'severity.high': 'High - Urgent action needed',
    'severity.critical': 'Critical - Immediate response',
    
    // Emergency report
    'emergency.title': 'EMERGENCY REPORT',
    'emergency.protocol_active': 'Emergency Protocol Active',
    'emergency.prioritized': 'This report will be prioritized and sent immediately',
    'emergency.details': 'Emergency Details',
    'emergency.type': 'Emergency Type',
    'emergency.emergency_title': 'Emergency Title',
    'emergency.emergency_severity': 'Emergency Severity',
    'emergency.incident_date': 'Incident Date',
    'emergency.incident_time': 'Incident Time',
    'emergency.location_description': 'Location Description',
    'emergency.detailed_description': 'Detailed Description',
    'emergency.involved_persons': 'Involved Persons (Optional)',
    'emergency.send_report': 'SEND EMERGENCY REPORT',
    'emergency.need_help': 'Need Immediate Help?',
    'emergency.call_emergency': 'Call emergency services',
    'emergency.call_911': 'Call 911',
    
    // Severity levels for emergency
    'emergency.severity.critical': 'Critical - Life threatening',
    'emergency.severity.high': 'High - Urgent security threat',
    'emergency.severity.medium': 'Medium - Security concern',
    'emergency.severity.low': 'Low - Minor incident',
    
    // Location and time
    'location.auto_captured': 'Auto-captured location',
    'location.gps_coordinates': 'GPS coordinates will be captured',
    
    // Placeholders
    'placeholder.observation_title': 'Brief description of the observation',
    'placeholder.emergency_title': 'Brief description of the emergency',
    'placeholder.description': 'Provide detailed information about the observation...',
    'placeholder.emergency_description': 'Describe the emergency situation in detail...',
    'placeholder.location_description': 'Describe the exact location of the incident',
    'placeholder.involved_persons': 'List any persons involved in the incident...',
    
    // Validation messages
    'validation.min_characters': 'minimum characters',
    'validation.required': 'This field is required',
    
    // Camera
    'camera.error': 'Camera Error',
    'camera.permission_error': 'Unable to access camera. Please check permissions.',
  },
  el: {
    // App title and navigation
    'app.title': 'Sentinel Guard',
    'nav.dashboard': 'Πίνακας Ελέγχου',
    'nav.scan': 'Σάρωση',
    'nav.report': 'Αναφορά',
    
    // Dashboard
    'dashboard.welcome': 'Καλώς ήρθατε, Αξιωματικέ Ασφαλείας',
    'dashboard.on_duty': 'Σε Υπηρεσία',
    'dashboard.scan_description': 'Σάρωση σημείων ελέγχου QR',
    'dashboard.report_description': 'Καταγραφή παρατηρήσεων',
    'dashboard.emergency': 'Έκτακτη Ανάγκη',
    'dashboard.emergency_description': 'Αναφορά εκτάκτων αναγκών',
    'dashboard.patrol_rounds': 'Περιπολίες',
    'dashboard.observations': 'Παρατηρήσεις',
    'dashboard.incidents': 'Περιστατικά',
    'dashboard.status': 'Κατάσταση',
    'dashboard.active': 'Ενεργός',
    'dashboard.recent_activity': 'Πρόσφατη Δραστηριότητα',
    'dashboard.checkpoint_scanned': 'Σημείο Ελέγχου Σαρώθηκε',
    'dashboard.observation_logged': 'Παρατήρηση Καταγράφηκε',
    'dashboard.patrol_started': 'Περιπολία Ξεκίνησε',
    'dashboard.night_shift': 'Νυχτερινή Βάρδια',
    'dashboard.minutes_ago': 'λεπτά πριν',
    'dashboard.hour_ago': 'ώρα πριν',
    
    // Emergency types
    'emergency.unsafe_area': 'Ανασφαλής Χώρος',
    'emergency.theft_attempt': 'Απόπειρα Υπεξαίρεσης',
    'emergency.dangerous_object': 'Επικίνδυνο Αντικείμενο',
    'emergency.suspicious_incident': 'Ύποπτο Περιστατικό',
    'emergency.vandalism': 'Βανδαλισμός',
    'emergency.theft': 'Υπεξαίρεση',
    'emergency.material_damage': 'Φθορά Υλικού',
    'emergency.perimeter_breach': 'Παραβίαση Περιμέτρου',
    'emergency.malfunction': 'Βλάβη',
    'emergency.company_personnel_incident': 'Συμβάν με Εμπλεκόμενο Προσωπικό της Εταιρείας',
    'emergency.visitor_incident': 'Συμβάν με Εμπλεκόμενο Επισκέπτη',
    'emergency.union_action': 'Συνδικαλιστική Δράση - Διαμαρτυρία',
    'emergency.public_authority_inspection': 'Έλεγχος από Δημόσια Αρχή',
    'emergency.perimeter_alarm': 'Ένδειξη Συναγερμού Παραβίασης Περιμέτρου',
    'emergency.fire_alarm': 'Ένδειξη Συναγερμού Πυρασφάλειας',
    'emergency.natural_disaster': 'Φυσική Καταστροφή',
    'emergency.other': 'Άλλο',
    
    // Common UI elements
    'common.submit': 'Υποβολή',
    'common.cancel': 'Ακύρωση',
    'common.save': 'Αποθήκευση',
    'common.delete': 'Διαγραφή',
    'common.edit': 'Επεξεργασία',
    'common.close': 'Κλείσιμο',
    'common.back': 'Πίσω',
    'common.loading': 'Φόρτωση...',
    
    // Buttons
    'button.sign_out': 'Αποσύνδεση',
    'button.language': 'Γλώσσα',
    
    // Patrol observation
    'observation.title': 'Παρατήρηση Περιπολίας',
    'observation.details': 'Λεπτομέρειες Παρατήρησης',
    'observation.observation_title': 'Τίτλος Παρατήρησης',
    'observation.severity': 'Επίπεδο Σοβαρότητας',
    'observation.description': 'Περιγραφή',
    'observation.evidence_photos': 'Φωτογραφίες Αποδεικτικών Στοιχείων',
    'observation.capture_photos': 'Λήψη Φωτογραφιών',
    'observation.add_photo': 'Προσθήκη Άλλης Φωτογραφίας',
    'observation.take_photo': 'Λήψη Φωτογραφίας',
    'observation.submit_observation': 'Υποβολή Παρατήρησης',
    
    // Severity levels
    'severity.low': 'Χαμηλή - Μικρό πρόβλημα',
    'severity.medium': 'Μέση - Απαιτεί προσοχή',
    'severity.high': 'Υψηλή - Απαιτείται επείγουσα δράση',
    'severity.critical': 'Κρίσιμη - Άμεση απόκριση',
    
    // Emergency report
    'emergency.title': 'ΑΝΑΦΟΡΑ ΕΚΤΑΚΤΗΣ ΑΝΑΓΚΗΣ',
    'emergency.protocol_active': 'Πρωτόκολλο Έκτακτης Ανάγκης Ενεργό',
    'emergency.prioritized': 'Αυτή η αναφορά θα δοθεί προτεραιότητα και θα σταλεί αμέσως',
    'emergency.details': 'Λεπτομέρειες Έκτακτης Ανάγκης',
    'emergency.type': 'Τύπος Έκτακτης Ανάγκης',
    'emergency.emergency_title': 'Τίτλος Έκτακτης Ανάγκης',
    'emergency.emergency_severity': 'Σοβαρότητα Έκτακτης Ανάγκης',
    'emergency.incident_date': 'Ημερομηνία Περιστατικού',
    'emergency.incident_time': 'Ώρα Περιστατικού',
    'emergency.location_description': 'Περιγραφή Τοποθεσίας',
    'emergency.detailed_description': 'Λεπτομερής Περιγραφή',
    'emergency.involved_persons': 'Εμπλεκόμενα Άτομα (Προαιρετικό)',
    'emergency.send_report': 'ΑΠΟΣΤΟΛΗ ΑΝΑΦΟΡΑΣ ΕΚΤΑΚΤΗΣ ΑΝΑΓΚΗΣ',
    'emergency.need_help': 'Χρειάζεστε Άμεση Βοήθεια;',
    'emergency.call_emergency': 'Καλέστε τις υπηρεσίες έκτακτης ανάγκης',
    'emergency.call_911': 'Καλέστε 100',
    
    // Severity levels for emergency
    'emergency.severity.critical': 'Κρίσιμη - Απειλή για τη ζωή',
    'emergency.severity.high': 'Υψηλή - Επείγουσα απειλή ασφαλείας',
    'emergency.severity.medium': 'Μέση - Θέμα ασφαλείας',
    'emergency.severity.low': 'Χαμηλή - Μικρό περιστατικό',
    
    // Location and time
    'location.auto_captured': 'Αυτόματη καταγραφή τοποθεσίας',
    'location.gps_coordinates': 'Οι συντεταγμένες GPS θα καταγραφούν',
    
    // Placeholders
    'placeholder.observation_title': 'Σύντομη περιγραφή της παρατήρησης',
    'placeholder.emergency_title': 'Σύντομη περιγραφή της έκτακτης ανάγκης',
    'placeholder.description': 'Παρέχετε λεπτομερείς πληροφορίες για την παρατήρηση...',
    'placeholder.emergency_description': 'Περιγράψτε την κατάσταση έκτακτης ανάγκης λεπτομερώς...',
    'placeholder.location_description': 'Περιγράψτε την ακριβή τοποθεσία του περιστατικού',
    'placeholder.involved_persons': 'Αναφέρετε τυχόν άτομα που εμπλέκονται στο περιστατικό...',
    
    // Validation messages
    'validation.min_characters': 'ελάχιστοι χαρακτήρες',
    'validation.required': 'Αυτό το πεδίο είναι υποχρεωτικό',
    
    // Camera
    'camera.error': 'Σφάλμα Κάμερας',
    'camera.permission_error': 'Αδυναμία πρόσβασης στην κάμερα. Παρακαλώ ελέγξτε τις άδειες.',
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');

  // Initialize language from localStorage or browser preference
  useEffect(() => {
    const savedLanguage = localStorage.getItem('sentinel-language') as Language;
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'el')) {
      setLanguageState(savedLanguage);
    } else {
      // Detect browser language
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.startsWith('el')) {
        setLanguageState('el');
      } else {
        setLanguageState('en');
      }
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('sentinel-language', lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || translations.en[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
