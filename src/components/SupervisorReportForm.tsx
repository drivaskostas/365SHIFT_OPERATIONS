import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FileText, X, MapPin, Users } from 'lucide-react';
import { 
  REPORT_TITLES, 
  REPORT_TYPES, 
  OBSERVATION_TYPES, 
  PERFORMANCE_RATINGS, 
  COMPLIANCE_STATUS, 
  EQUIPMENT_STATUS, 
  IMMEDIATE_ACTIONS, 
  WEATHER_CONDITIONS,
  SupervisorReportDescription,
  getSeverityColor 
} from "@/constants/supervisorReports";

interface SupervisorReportFormProps {
  onClose: () => void;
}

interface GuardianSite {
  id: string;
  name: string;
  address: string;
  team_id: string;
}

interface TeamMember {
  profile_id: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    full_name: string | null;
  };
}

const SupervisorReportForm = ({ onClose }: SupervisorReportFormProps) => {
  const { profile } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sites, setSites] = useState<GuardianSite[]>([]);
  const [guards, setGuards] = useState<TeamMember[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [location, setLocation] = useState<{ latitude?: number; longitude?: number }>({});

  const [formData, setFormData] = useState({
    title: '',
    severity: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    guard_id: '',
    location_text: '',
    incident_time: (() => {
      const greekTime = new Date().toLocaleString("sv-SE", {timeZone: "Europe/Athens"});
      return greekTime.slice(0, 16);
    })(),
    followup_deadline: '',
    // Structured description fields
    description: {
      report_type: '' as keyof typeof REPORT_TYPES | '',
      observation_type: '' as keyof typeof OBSERVATION_TYPES | '',
      selected_guards: [] as string[],
      behavioral_observation: '',
      performance_rating: '' as keyof typeof PERFORMANCE_RATINGS | '',
      compliance_status: '' as keyof typeof COMPLIANCE_STATUS | '',
      safety_concerns: '',
      other_findings: '',
      equipment_status: '' as keyof typeof EQUIPMENT_STATUS | '',
      immediate_action_taken: '' as keyof typeof IMMEDIATE_ACTIONS | '',
      corrective_measures: '',
      weather_conditions: '' as keyof typeof WEATHER_CONDITIONS | '',
      additional_notes: ''
    } as SupervisorReportDescription
  });

  useEffect(() => {
    fetchAvailableSites();
    getCurrentLocation();
  }, []);

  useEffect(() => {
    if (selectedSite) {
      fetchSiteGuards(selectedSite);
    }
  }, [selectedSite]);

  const getCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.log('Location access denied or unavailable:', error);
        }
      );
    }
  };

  const fetchAvailableSites = async () => {
    try {
      const { data: sitesData, error } = await supabase
        .from('guardian_sites')
        .select('id, name, address, team_id')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setSites(sitesData || []);
    } catch (error) {
      console.error('Error fetching sites:', error);
      toast({
        title: language === 'el' ? 'Σφάλμα' : 'Error',
        description: language === 'el' ? 'Αδυναμία φόρτωσης έργων' : 'Failed to load sites',
        variant: 'destructive'
      });
    }
  };

  const fetchSiteGuards = async (siteId: string) => {
    try {
      const site = sites.find(s => s.id === siteId);
      if (!site) return;

      const { data: teamMembers, error } = await supabase
        .from('team_members')
        .select('profile_id')
        .eq('team_id', site.team_id);

      if (error) throw error;

      if (teamMembers && teamMembers.length > 0) {
        const profileIds = teamMembers.map(tm => tm.profile_id);
        
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, full_name')
          .in('id', profileIds);

        if (profilesError) throw profilesError;

        const guardsWithProfiles = profiles?.map(profile => ({
          profile_id: profile.id,
          profiles: {
            first_name: profile.first_name,
            last_name: profile.last_name,
            full_name: profile.full_name
          }
        })) || [];

        setGuards(guardsWithProfiles);
      }
    } catch (error) {
      console.error('Error fetching site guards:', error);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      toast({
        title: language === 'el' ? 'Σφάλμα' : 'Error',
        description: language === 'el' ? 'Παρακαλώ επιλέξτε εικόνα' : 'Please select an image file',
        variant: 'destructive'
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: language === 'el' ? 'Σφάλμα' : 'Error',
        description: language === 'el' ? 'Η εικόνα πρέπει να είναι μικρότερη από 5MB' : 'Image must be smaller than 5MB',
        variant: 'destructive'
      });
      return;
    }

    setImageFile(file);
    setIsUploadingImage(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `supervisor-report-${Date.now()}.${fileExt}`;
      const filePath = `supervisor-reports/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('reports')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('reports')
        .getPublicUrl(filePath);

      setImageUrl(publicUrl);
      toast({
        title: language === 'el' ? 'Επιτυχία' : 'Success',
        description: language === 'el' ? 'Η εικόνα μεταφορτώθηκε επιτυχώς' : 'Image uploaded successfully'
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: language === 'el' ? 'Σφάλμα' : 'Error',
        description: language === 'el' ? 'Αποτυχία μεταφόρτωσης εικόνας' : 'Failed to upload image',
        variant: 'destructive'
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id || !selectedSite) return;

    setIsSubmitting(true);

    try {
      const selectedSiteData = sites.find(s => s.id === selectedSite);
      
      const reportData = {
        supervisor_id: profile.id,
        supervisor_name: profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
        site_id: selectedSite,
        team_id: selectedSiteData?.team_id,
        guard_id: formData.description.selected_guards?.[0] || null, // Primary guard for compatibility
        title: formData.title,
        report_type: formData.description.report_type || 'general',
        description: JSON.stringify(formData.description), // Store as JSON
        severity: formData.severity,
        location: formData.location_text,
        latitude: location.latitude,
        longitude: location.longitude,
        incident_time: formData.incident_time ? (() => {
          // Convert to Greek timezone and then to ISO string
          const greekTime = new Date(formData.incident_time);
          return new Date(greekTime.getTime() + (greekTime.getTimezoneOffset() * 60000)).toISOString();
        })() : null,
        image_url: imageUrl || null,
        notes: JSON.stringify(formData.description.selected_guards?.map(guardId => {
          const guard = guards.find(g => g.profile_id === guardId);
          return {
            type: 'guard_selection',
            guard_id: guardId,
            guard_name: guard ? getGuardName(guard) : 'Unknown'
          };
        }) || [])
      };

      console.log('Submitting supervisor report:', reportData);
      const { data, error } = await supabase
        .from('supervisor_reports')
        .insert([reportData])
        .select()
        .single();

      if (error) throw error;

      console.log('Supervisor report submitted successfully, sending notifications...');

      // Send notification email
      try {
        console.log('Calling supervisor notification with params:', {
          title: reportData.title,
          severity: reportData.severity,
          supervisorName: reportData.supervisor_name,
          siteId: reportData.site_id,
          teamId: reportData.team_id,
          supervisorId: reportData.supervisor_id
        });

        await supabase.functions.invoke('send-supervisor-notification', {
          body: {
            title: reportData.title,
            description: reportData.description,
            severity: reportData.severity,
            supervisorName: reportData.supervisor_name,
            timestamp: (() => {
              // If data.created_at exists, convert to Greek timezone, otherwise use current Greek time
              if (data.created_at) {
                return new Date(data.created_at).toLocaleString("en-US", {timeZone: "Europe/Athens"});
              }
              return new Date().toLocaleString("en-US", {timeZone: "Europe/Athens"});
            })(),
            location: reportData.location || '',
            incidentTime: reportData.incident_time,
            imageUrl: reportData.image_url,
            images: (reportData as any).images, // Include images array if present
            siteId: reportData.site_id,
            teamId: reportData.team_id,
            supervisorId: reportData.supervisor_id
          }
        });

        console.log('Supervisor notification sent successfully');
      } catch (notificationError) {
        console.error('❌ Failed to send supervisor notification:', notificationError);
        console.error('Error details:', JSON.stringify(notificationError, null, 2));
        // Don't throw here - report was saved successfully, notification failure shouldn't block the user
      }

      toast({
        title: language === 'el' ? 'Επιτυχία' : 'Success',
        description: language === 'el' ? 'Η αναφορά εποπτείας υποβλήθηκε επιτυχώς' : 'Supervisor report submitted successfully'
      });

      onClose();
    } catch (error) {
      console.error('Error submitting supervisor report:', error);
      toast({
        title: language === 'el' ? 'Σφάλμα' : 'Error',
        description: language === 'el' ? 'Αποτυχία υποβολής αναφοράς' : 'Failed to submit report',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getGuardName = (guard: TeamMember) => {
    const profile = guard.profiles;
    return profile?.full_name || 
           (profile?.first_name && profile?.last_name ? `${profile.first_name} ${profile.last_name}` : 
            profile?.first_name || profile?.last_name || 'Unknown Guard');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {language === 'el' ? 'Αναφορά Εποπτείας' : 'Supervisor Report'}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* 1. Βασικές Πληροφορίες (Basic Information) */}
            <div className="space-y-4 p-6 bg-gray-50/50 rounded-lg border">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">1</div>
                <h3 className="text-lg font-semibold">{language === 'el' ? 'Βασικές Πληροφορίες' : 'Basic Information'}</h3>
              </div>
              
              <div>
                <Label htmlFor="title">{language === 'el' ? 'Τίτλος Αναφοράς' : 'Report Title'} *</Label>
                <Select value={formData.title} onValueChange={(value) => setFormData({...formData, title: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'el' ? 'Επιλέξτε τίτλο αναφοράς' : 'Select report title'} />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(REPORT_TITLES).map(([key, value]) => (
                      <SelectItem key={key} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="severity">{language === 'el' ? 'Τύπος Αναφοράς' : 'Report Type'}</Label>
                <Select 
                  value={formData.description.report_type} 
                  onValueChange={(value) => setFormData({
                    ...formData, 
                    description: {...formData.description, report_type: value as keyof typeof REPORT_TYPES}
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'el' ? 'Επιλέξτε τύπο' : 'Select type'} />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(REPORT_TYPES).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="severity_rating">{language === 'el' ? 'Σπουδαιότητα' : 'Severity'} *</Label>
                <Select value={formData.severity} onValueChange={(value: any) => setFormData({...formData, severity: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low" className="text-green-600">
                      {language === 'el' ? 'Χαμηλή' : 'Low'}
                    </SelectItem>
                    <SelectItem value="medium" className="text-yellow-600">
                      {language === 'el' ? 'Μέτρια' : 'Medium'}
                    </SelectItem>
                    <SelectItem value="high" className="text-orange-600">
                      {language === 'el' ? 'Υψηλή' : 'High'}
                    </SelectItem>
                    <SelectItem value="critical" className="text-red-600">
                      {language === 'el' ? 'Κρίσιμη' : 'Critical'}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 2. Τοποθεσία & Περιβάλλον (Location & Environment) */}
            <div className="space-y-4 p-6 bg-gray-50/50 rounded-lg border">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">2</div>
                <h3 className="text-lg font-semibold">{language === 'el' ? 'Τοποθεσία & Περιβάλλον' : 'Location & Environment'}</h3>
              </div>
              
              <div>
                <Label htmlFor="site">{language === 'el' ? 'Έργο' : 'Site'} *</Label>
                <Select value={selectedSite} onValueChange={setSelectedSite}>
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'el' ? 'Επιλέξτε έργο' : 'Select site'} />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map((site) => (
                      <SelectItem key={site.id} value={site.id}>
                        {site.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="weather_conditions">{language === 'el' ? 'Φυσικές/Καιρικές Συνθήκες τον Καιρό της Επίσκεψης' : 'Weather/Physical Conditions During Visit'}</Label>
                  <Select 
                    value={formData.description.weather_conditions} 
                    onValueChange={(value) => setFormData({
                      ...formData, 
                      description: {...formData.description, weather_conditions: value as keyof typeof WEATHER_CONDITIONS}
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'el' ? 'Επιλέξτε συνθήκες' : 'Select conditions'} />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(WEATHER_CONDITIONS).map(([key, value]) => (
                        <SelectItem key={key} value={key}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="incident_time">{language === 'el' ? 'Ημερομηνία/Ώρα Συμβάντος' : 'Date/Time of Incident'}</Label>
                  <Input
                    id="incident_time"
                    type="datetime-local"
                    value={formData.incident_time}
                    onChange={(e) => setFormData({...formData, incident_time: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="location_text">{language === 'el' ? 'Συγκεκριμένη Τοποθεσία' : 'Specific Location'}</Label>
                <Input
                  id="location_text"
                  value={formData.location_text}
                  onChange={(e) => setFormData({...formData, location_text: e.target.value})}
                  placeholder={language === 'el' ? 'Περιγράψτε την ακριβή τοποθεσία ή την περιοχή' : 'Describe the exact location or area'}
                />
              </div>
            </div>

            {/* 3. Λεπτομέρειες Παρατήρησης (Observation Details) */}
            <div className="space-y-4 p-6 bg-gray-50/50 rounded-lg border">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">3</div>
                <h3 className="text-lg font-semibold">{language === 'el' ? 'Λεπτομέρειες Παρατήρησης' : 'Observation Details'}</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="observation_type">{language === 'el' ? 'Τύπος Παρατήρησης' : 'Observation Type'}</Label>
                  <Select 
                    value={formData.description.observation_type} 
                    onValueChange={(value) => setFormData({
                      ...formData, 
                      description: {...formData.description, observation_type: value as keyof typeof OBSERVATION_TYPES}
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'el' ? 'Επιλέξτε τύπο παρατήρησης' : 'Select observation type'} />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(OBSERVATION_TYPES).map(([key, value]) => (
                        <SelectItem key={key} value={key}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="performance_rating">{language === 'el' ? 'Αξιολόγηση Απόδοσης' : 'Performance Assessment'}</Label>
                  <Select 
                    value={formData.description.performance_rating} 
                    onValueChange={(value) => setFormData({
                      ...formData, 
                      description: {...formData.description, performance_rating: value as keyof typeof PERFORMANCE_RATINGS}
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'el' ? 'Επιλέξτε αξιολόγηση' : 'Select assessment'} />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PERFORMANCE_RATINGS).map(([key, value]) => (
                        <SelectItem key={key} value={key}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="compliance_status">{language === 'el' ? 'Κατάσταση Συμμόρφωσης' : 'Compliance Status'}</Label>
                  <Select 
                    value={formData.description.compliance_status} 
                    onValueChange={(value) => setFormData({
                      ...formData, 
                      description: {...formData.description, compliance_status: value as keyof typeof COMPLIANCE_STATUS}
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'el' ? 'Επιλέξτε κατάσταση' : 'Select status'} />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(COMPLIANCE_STATUS).map(([key, value]) => (
                        <SelectItem key={key} value={key}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="equipment_status">{language === 'el' ? 'Κατάσταση Εξοπλισμού' : 'Equipment Status'}</Label>
                  <Select 
                    value={formData.description.equipment_status} 
                    onValueChange={(value) => setFormData({
                      ...formData, 
                      description: {...formData.description, equipment_status: value as keyof typeof EQUIPMENT_STATUS}
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'el' ? 'Επιλέξτε κατάσταση εξοπλισμού' : 'Select equipment status'} />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(EQUIPMENT_STATUS).map(([key, value]) => (
                        <SelectItem key={key} value={key}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Guard Selection and Behavioral Observations */}
              <div className="space-y-4">
                {guards.length > 0 && (
                  <div>
                    <Label className="flex items-center gap-2 text-sm font-medium text-foreground mb-3">
                      <Users className="h-4 w-4" />
                      {language === 'el' ? 'Επιλογή Φρουρών' : 'Guard Selection'}
                    </Label>
                    <div className="space-y-3 max-h-40 overflow-y-auto border border-border rounded-lg p-4 bg-card shadow-sm">
                      {guards.map((guard) => (
                        <div key={guard.profile_id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                          <Checkbox
                            id={`guard-${guard.profile_id}`}
                            checked={formData.description.selected_guards?.includes(guard.profile_id)}
                            onCheckedChange={(checked) => {
                              const currentGuards = formData.description.selected_guards || [];
                              const newGuards = checked 
                                ? [...currentGuards, guard.profile_id]
                                : currentGuards.filter(id => id !== guard.profile_id);
                              setFormData({
                                ...formData,
                                description: {...formData.description, selected_guards: newGuards}
                              });
                            }}
                            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                          <Label 
                            htmlFor={`guard-${guard.profile_id}`} 
                            className="text-sm font-medium text-foreground cursor-pointer flex-grow"
                          >
                            {getGuardName(guard)}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="behavioral_observation">{language === 'el' ? 'Συμπεριφορικές Παρατηρήσεις' : 'Behavioral Observations'}</Label>
                  <Textarea
                    id="behavioral_observation"
                    value={formData.description.behavioral_observation}
                    onChange={(e) => setFormData({
                      ...formData, 
                      description: {...formData.description, behavioral_observation: e.target.value}
                    })}
                    placeholder={language === 'el' ? 'Συμπεριφορικές παρατηρήσεις που παρατηρήθηκαν (συμπεριφορά, εγρήγορση, επικοινωνία, κ.λ.π.)' : 'Behavioral observations noted (behavior, alertness, communication, etc.)'}
                    rows={3}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="safety_concerns">{language === 'el' ? 'Ανησυχίες Ασφάλειας' : 'Safety Concerns'}</Label>
                <Textarea
                  id="safety_concerns"
                  value={formData.description.safety_concerns}
                  onChange={(e) => setFormData({
                    ...formData, 
                    description: {...formData.description, safety_concerns: e.target.value}
                  })}
                  placeholder={language === 'el' ? 'Οποιεσδήποτε ανησυχίες ασφάλειας που προσδιορίστηκαν' : 'Any safety concerns identified'}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="other_findings">{language === 'el' ? 'Άλλα Ευρήματα' : 'Other Findings'}</Label>
                <Textarea
                  id="other_findings"
                  value={formData.description.other_findings}
                  onChange={(e) => setFormData({
                    ...formData, 
                    description: {...formData.description, other_findings: e.target.value}
                  })}
                  placeholder={language === 'el' ? 'Οποιεσδήποτε άλλες σημαντικές παρατηρήσεις ή συμβάντα' : 'Any other significant observations or incidents'}
                  rows={3}
                />
              </div>
            </div>

            {/* 4. Ενέργειες & Μέτρα (Actions & Measures) */}
            <div className="space-y-4 p-6 bg-gray-50/50 rounded-lg border">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">4</div>
                <h3 className="text-lg font-semibold">{language === 'el' ? 'Ενέργειες & Μέτρα' : 'Actions & Measures'}</h3>
              </div>

              <div>
                <Label htmlFor="immediate_action">{language === 'el' ? 'Άμεσες Ενέργειες που Λήφθηκαν' : 'Immediate Actions Taken'}</Label>
                <Select 
                  value={formData.description.immediate_action_taken} 
                  onValueChange={(value) => setFormData({
                    ...formData, 
                    description: {...formData.description, immediate_action_taken: value as keyof typeof IMMEDIATE_ACTIONS}
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'el' ? 'Επιλέξτε άμεση ενέργεια' : 'Select immediate action'} />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(IMMEDIATE_ACTIONS).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="corrective_measures">{language === 'el' ? 'Διορθωτικά Μέτρα' : 'Corrective Measures'}</Label>
                <Textarea
                  id="corrective_measures"
                  value={formData.description.corrective_measures}
                  onChange={(e) => setFormData({
                    ...formData, 
                    description: {...formData.description, corrective_measures: e.target.value}
                  })}
                  placeholder={language === 'el' ? 'Λεπτομερή περιγραφή διορθωτικών μέτρων που λήφθηκαν ή απαιτούνται' : 'Detailed description of corrective measures taken or required'}
                  rows={3}
                />
              </div>
            </div>

            {/* 5. Φωτογραφία Αποδεικτικού Στοιχείου (Evidence Photo) */}
            <div className="space-y-4 p-6 bg-gray-50/50 rounded-lg border">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">5</div>
                <h3 className="text-lg font-semibold">{language === 'el' ? 'Φωτογραφία Αποδεικτικού Στοιχείου' : 'Evidence Photo'}</h3>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                {!imageUrl ? (
                  <div>
                    <Input
                      id="image"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isUploadingImage}
                      className="hidden"
                    />
                    <Label 
                      htmlFor="image" 
                      className="cursor-pointer flex flex-col items-center gap-2 p-4"
                    >
                      <div className="w-12 h-12 border-2 border-gray-400 rounded border-dashed flex items-center justify-center">
                        📷
                      </div>
                      <div className="text-sm text-gray-600">
                        {isUploadingImage 
                          ? (language === 'el' ? 'Μεταφόρτωση εικόνας...' : 'Uploading image...') 
                          : (language === 'el' ? 'Upload Image' : 'Upload Image')
                        }
                      </div>
                      <div className="text-xs text-gray-500">
                        {language === 'el' ? 'No image uploaded\nClick to add an image' : 'No image uploaded\nClick to add an image'}
                      </div>
                    </Label>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <img src={imageUrl} alt="Evidence" className="max-w-full max-h-48 object-cover rounded" />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => setImageUrl('')}
                    >
                      {language === 'el' ? 'Αφαίρεση' : 'Remove'}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* 6. Προθεσμίες Παρακολουθίας (Follow-up Deadlines) */}
            <div className="space-y-4 p-6 bg-gray-50/50 rounded-lg border">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">6</div>
                <h3 className="text-lg font-semibold">{language === 'el' ? 'Προθεσμίες Παρακολουθίας' : 'Follow-up Deadlines'}</h3>
              </div>

              <div>
                <Label htmlFor="followup_deadline">{language === 'el' ? 'Προθεσμίες Ενεργειών' : 'Action Deadlines'}</Label>
                <Textarea
                  id="followup_deadline"
                  value={formData.followup_deadline}
                  onChange={(e) => setFormData({...formData, followup_deadline: e.target.value})}
                  placeholder={language === 'el' ? 'Οποιεσδήποτε άλλες σχετικές πληροφορίες, παρακολούθησα των εκθέσεων ή προτάσεις' : 'Any other relevant information, report follow-up, or recommendations'}
                  rows={2}
                />
              </div>
            </div>

            {/* Additional Notes */}
            <div className="space-y-4 p-6 bg-gray-50/50 rounded-lg border">
              <h3 className="text-lg font-semibold">{language === 'el' ? 'Προσθήκες Πληροφορίες' : 'Additional Information'}</h3>
              
              <div>
                <Label htmlFor="additional_notes">{language === 'el' ? 'Προσθήκες Ενεργειας' : 'Additional Notes'}</Label>
                <Textarea
                  id="additional_notes"
                  value={formData.description.additional_notes}
                  onChange={(e) => setFormData({
                    ...formData, 
                    description: {...formData.description, additional_notes: e.target.value}
                  })}
                  placeholder={language === 'el' ? 'Οποιεσδήποτε άλλες σχετικές πληροφορίες, παρακολούθησα των εκθέσεων ή προτάσεις' : 'Any other relevant information, report follow-up, or recommendations'}
                  rows={3}
                />
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-between gap-4 pt-6 border-t-2">
              <Button type="button" variant="outline" onClick={onClose} className="px-8">
                {language === 'el' ? 'Ακύρωση Φόρμας' : 'Cancel Form'}
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || !selectedSite || !formData.title.trim()}
                className="px-8 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmitting 
                  ? (language === 'el' ? 'Υποβολή...' : 'Submitting...') 
                  : (language === 'el' ? 'Υποβολή Αναφοράς' : 'Submit Report')
                }
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupervisorReportForm;