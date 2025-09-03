import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FileText, X, MapPin } from 'lucide-react';

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
    description: '',
    severity: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    guard_id: '',
    location_text: '',
    incident_time: new Date().toISOString().slice(0, 16),
    immediate_action_taken: '',
    corrective_measures: '',
    additional_notes: ''
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
        guard_id: formData.guard_id || null,
        title: formData.title,
        description: formData.description,
        severity: formData.severity,
        location: formData.location_text,
        latitude: location.latitude,
        longitude: location.longitude,
        incident_time: formData.incident_time ? new Date(formData.incident_time).toISOString() : null,
        image_url: imageUrl || null,
        notes: JSON.stringify([
          { field: 'immediate_action_taken', value: formData.immediate_action_taken },
          { field: 'corrective_measures', value: formData.corrective_measures },
          { field: 'additional_notes', value: formData.additional_notes }
        ].filter(note => note.value.trim() !== ''))
      };

      // Use the existing emergency_reports table as a supervisor report with a special field
      const supervisorReportData = {
        guard_id: profile.id,
        title: `[SUPERVISOR] ${formData.title}`,
        description: formData.description,
        severity: formData.severity,
        status: 'pending',
        location: formData.location_text,
        latitude: location.latitude,
        longitude: location.longitude,
        incident_time: formData.incident_time ? new Date(formData.incident_time).toISOString() : null,
        image_url: imageUrl || null,
        guard_name: profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
        team_id: selectedSiteData?.team_id,
        involved_persons: formData.guard_id ? guards.find(g => g.profile_id === formData.guard_id)?.profiles?.full_name || '' : '',
        notes: JSON.stringify([
          { field: 'supervisor_report', value: 'true' },
          { field: 'site_id', value: selectedSite },
          { field: 'immediate_action_taken', value: formData.immediate_action_taken },
          { field: 'corrective_measures', value: formData.corrective_measures },
          { field: 'additional_notes', value: formData.additional_notes }
        ].filter(note => note.value && note.value.trim() !== ''))
      };

      const { error } = await supabase
        .from('emergency_reports')
        .insert([supervisorReportData]);

      if (error) throw error;

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
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{language === 'el' ? 'Βασικές Πληροφορίες' : 'Basic Information'}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                <div>
                  <Label htmlFor="severity">{language === 'el' ? 'Σπουδαιότητα' : 'Severity'} *</Label>
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

              <div>
                <Label htmlFor="title">{language === 'el' ? 'Τίτλος' : 'Title'} *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder={language === 'el' ? 'Συντομη περιγραφή της αναφοράς' : 'Brief description of the report'}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">{language === 'el' ? 'Περιγραφή' : 'Description'}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder={language === 'el' ? 'Λεπτομερής περιγραφή...' : 'Detailed description...'}
                  rows={4}
                />
              </div>
            </div>

            {/* Guard Selection */}
            {guards.length > 0 && (
              <div>
                <Label htmlFor="guard">{language === 'el' ? 'Φύλακας (προαιρετικό)' : 'Guard (optional)'}</Label>
                <Select value={formData.guard_id} onValueChange={(value) => setFormData({...formData, guard_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'el' ? 'Επιλέξτε φύλακα' : 'Select guard'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{language === 'el' ? 'Χωρίς επιλογή' : 'No selection'}</SelectItem>
                    {guards.map((guard) => (
                      <SelectItem key={guard.profile_id} value={guard.profile_id}>
                        {getGuardName(guard)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Location & Time */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{language === 'el' ? 'Τοποθεσία & Χρόνος' : 'Location & Time'}</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="location_text">
                    <MapPin className="h-4 w-4 inline mr-1" />
                    {language === 'el' ? 'Τοποθεσία' : 'Location'}
                  </Label>
                  <Input
                    id="location_text"
                    value={formData.location_text}
                    onChange={(e) => setFormData({...formData, location_text: e.target.value})}
                    placeholder={language === 'el' ? 'Συγκεκριμένη τοποθεσία...' : 'Specific location...'}
                  />
                </div>

                <div>
                  <Label htmlFor="incident_time">{language === 'el' ? 'Χρόνος Συμβάντος' : 'Incident Time'}</Label>
                  <Input
                    id="incident_time"
                    type="datetime-local"
                    value={formData.incident_time}
                    onChange={(e) => setFormData({...formData, incident_time: e.target.value})}
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{language === 'el' ? 'Δράσεις & Παρατηρήσεις' : 'Actions & Observations'}</h3>
              
              <div>
                <Label htmlFor="immediate_action">{language === 'el' ? 'Άμεση Δράση που Λήφθηκε' : 'Immediate Action Taken'}</Label>
                <Textarea
                  id="immediate_action"
                  value={formData.immediate_action_taken}
                  onChange={(e) => setFormData({...formData, immediate_action_taken: e.target.value})}
                  placeholder={language === 'el' ? 'Περιγράψτε τις άμεσες δράσεις...' : 'Describe immediate actions taken...'}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="corrective_measures">{language === 'el' ? 'Διορθωτικά Μέτρα' : 'Corrective Measures'}</Label>
                <Textarea
                  id="corrective_measures"
                  value={formData.corrective_measures}
                  onChange={(e) => setFormData({...formData, corrective_measures: e.target.value})}
                  placeholder={language === 'el' ? 'Προτεινόμενα διορθωτικά μέτρα...' : 'Recommended corrective measures...'}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="additional_notes">{language === 'el' ? 'Επιπλέον Σημειώσεις' : 'Additional Notes'}</Label>
                <Textarea
                  id="additional_notes"
                  value={formData.additional_notes}
                  onChange={(e) => setFormData({...formData, additional_notes: e.target.value})}
                  placeholder={language === 'el' ? 'Οποιεσδήποτε επιπλέον παρατηρήσεις...' : 'Any additional observations...'}
                  rows={3}
                />
              </div>
            </div>

            {/* Image Upload */}
            <div>
              <Label htmlFor="image">{language === 'el' ? 'Εικόνα (προαιρετικό)' : 'Image (optional)'}</Label>
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={isUploadingImage}
              />
              {isUploadingImage && (
                <p className="text-sm text-muted-foreground mt-1">
                  {language === 'el' ? 'Μεταφόρτωση εικόνας...' : 'Uploading image...'}
                </p>
              )}
              {imageUrl && (
                <div className="mt-2">
                  <img src={imageUrl} alt="Report" className="max-w-full h-32 object-cover rounded" />
                </div>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                {language === 'el' ? 'Ακύρωση' : 'Cancel'}
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || !selectedSite || !formData.title.trim()}
                variant="gradient"
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