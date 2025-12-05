import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Building2, Save, ToggleLeft, ToggleRight, Loader2, CheckCircle, Settings, Camera, ClipboardList, AlertTriangle, Shield, FileText, Eye, MapPin, Users, Upload, Palette, Image, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { TenantFeatureService } from '@/services/TenantFeatureService';
import { supabase } from '@/integrations/supabase/client';
import type { TenantFeatureSettings } from '@/types/database';

// Theme options
const THEME_OPTIONS = [
  { value: 'default', label: 'Default', color: '#3B82F6', bg: 'bg-blue-500' },
  { value: 'dark', label: 'Dark', color: '#1F2937', bg: 'bg-gray-800' },
  { value: 'blue', label: 'Blue', color: '#2563EB', bg: 'bg-blue-600' },
  { value: 'green', label: 'Green', color: '#059669', bg: 'bg-emerald-600' },
  { value: 'purple', label: 'Purple', color: '#7C3AED', bg: 'bg-purple-600' },
  { value: 'red', label: 'Red', color: '#DC2626', bg: 'bg-red-600' },
];

interface TenantFeatureManagerProps {
  onBack: () => void;
}

interface TenantWithSettings {
  tenant: { id: string; name: string };
  settings: TenantFeatureSettings | null;
}

// Feature configuration for display
const FEATURE_GROUPS = [
  {
    title: 'Quick Actions',
    description: 'Κουμπιά γρήγορων ενεργειών στο dashboard',
    icon: Settings,
    color: 'blue',
    features: [
      { key: 'show_scan_button', label: 'Scan', description: 'Σάρωση QR checkpoints', icon: Camera },
      { key: 'show_tasks_button', label: 'Tasks', description: 'Σάρωση QR εργασιών', icon: ClipboardList },
      { key: 'show_observations_button', label: 'Observations', description: 'Καταγραφή παρατηρήσεων', icon: AlertTriangle },
      { key: 'show_report_button', label: 'Report', description: 'Αναφορά έκτακτης ανάγκης', icon: Shield },
    ]
  },
  {
    title: 'Supervisor Cards',
    description: 'Κάρτες για supervisors/admins',
    icon: FileText,
    color: 'purple',
    features: [
      { key: 'show_supervisor_report', label: 'Supervisor Report', description: 'Αναφορά εποπτείας', icon: FileText },
      { key: 'show_todays_tasks', label: "Today's Tasks", description: 'Σημερινές εργασίες', icon: ClipboardList },
      { key: 'show_patrol_status', label: 'Patrol Status', description: 'Κατάσταση περιπολίας', icon: MapPin },
    ]
  },
  {
    title: 'Feature Modules',
    description: 'Κύρια modules της εφαρμογής',
    icon: Users,
    color: 'green',
    features: [
      { key: 'show_emergency_reports', label: 'Emergency Reports', description: 'Αναφορές έκτακτης ανάγκης', icon: Shield },
      { key: 'show_location_tracking', label: 'Location Tracking', description: 'Παρακολούθηση τοποθεσίας', icon: MapPin },
      { key: 'show_team_observations', label: 'Team Observations', description: 'Παρατηρήσεις ομάδας', icon: Eye },
      { key: 'show_patrol_sessions', label: 'Patrol Sessions', description: 'Συνεδρίες περιπολίας', icon: ClipboardList },
    ]
  },
  {
    title: 'Obligation Completion',
    description: 'Τι βλέπουν οι χρήστες κατά την ολοκλήρωση εργασιών',
    icon: CheckCircle,
    color: 'orange',
    features: [
      { key: 'show_photo_requirement', label: 'Photo Upload', description: 'Δυνατότητα upload φωτογραφίας', icon: Camera },
      { key: 'show_signature_requirement', label: 'Signature', description: 'Δυνατότητα υπογραφής', icon: FileText },
      { key: 'show_checklist_requirement', label: 'Checklist', description: 'Εμφάνιση checklist', icon: ClipboardList },
      { key: 'show_notes_field', label: 'Notes', description: 'Πεδίο σημειώσεων', icon: FileText },
    ]
  }
];

const TenantFeatureManager = ({ onBack }: TenantFeatureManagerProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [tenants, setTenants] = useState<TenantWithSettings[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<TenantWithSettings | null>(null);
  const [localSettings, setLocalSettings] = useState<Record<string, boolean>>({});
  const [brandingSettings, setBrandingSettings] = useState<{
    tenant_name: string;
    app_name: string;
    app_subtitle: string;
    logo_url: string;
    theme: 'default' | 'dark' | 'blue' | 'green' | 'purple' | 'red';
    primary_color: string;
  }>({ tenant_name: '', app_name: 'SENTINEL', app_subtitle: 'SECURITY.SYS', logo_url: '', theme: 'default', primary_color: '#3B82F6' });
  const [hasChanges, setHasChanges] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      setLoading(true);
      const data = await TenantFeatureService.getAllTenantsWithSettings();
      setTenants(data);
      
      // Auto-select first tenant if available
      if (data.length > 0 && !selectedTenant) {
        selectTenant(data[0]);
      }
    } catch (error) {
      console.error('Error loading tenants:', error);
      toast({
        title: 'Error',
        description: 'Failed to load tenants',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const selectTenant = (tenant: TenantWithSettings) => {
    setSelectedTenant(tenant);
    const effective = TenantFeatureService.getEffectiveSettings(tenant.settings);
    setLocalSettings(effective as unknown as Record<string, boolean>);
    setBrandingSettings({
      tenant_name: tenant.settings?.tenant_name || tenant.tenant.name || '',
      app_name: tenant.settings?.app_name || 'SENTINEL',
      app_subtitle: tenant.settings?.app_subtitle || 'SECURITY.SYS',
      logo_url: tenant.settings?.logo_url || '',
      theme: tenant.settings?.theme || 'default',
      primary_color: tenant.settings?.primary_color || '#3B82F6',
    });
    setHasChanges(false);
  };

  const handleToggle = (key: string, value: boolean) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: value
    }));
    setHasChanges(true);
  };

  const handleBrandingChange = (key: keyof typeof brandingSettings, value: string) => {
    setBrandingSettings(prev => ({
      ...prev,
      [key]: key === 'theme' ? value as 'default' | 'dark' | 'blue' | 'green' | 'purple' | 'red' : value
    }));
    setHasChanges(true);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTenant) return;

    // Check file size (max 500KB for base64)
    if (file.size > 500 * 1024) {
      toast({
        title: 'Αρχείο πολύ μεγάλο',
        description: 'Το μέγιστο μέγεθος είναι 500KB',
        variant: 'destructive',
      });
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Μη έγκυρος τύπος αρχείου',
        description: 'Παρακαλώ επιλέξτε εικόνα (PNG, JPG, SVG)',
        variant: 'destructive',
      });
      return;
    }

    setUploadingLogo(true);
    
    // Convert to base64 directly
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      handleBrandingChange('logo_url', base64);
      toast({
        title: 'Logo αποθηκεύτηκε! ✓',
        description: 'Το logo φορτώθηκε επιτυχώς.',
      });
      setUploadingLogo(false);
    };
    reader.onerror = () => {
      toast({
        title: 'Σφάλμα',
        description: 'Αποτυχία ανάγνωσης αρχείου.',
        variant: 'destructive',
      });
      setUploadingLogo(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!selectedTenant) return;

    try {
      setSaving(selectedTenant.tenant.id);
      await TenantFeatureService.updateSettings(selectedTenant.tenant.id, {
        ...localSettings,
        ...brandingSettings,
      });
      
      // Update local state
      setTenants(prev => prev.map(t => 
        t.tenant.id === selectedTenant.tenant.id 
          ? { ...t, settings: { ...t.settings, ...localSettings, ...brandingSettings } as TenantFeatureSettings }
          : t
      ));
      
      setHasChanges(false);
      toast({
        title: 'Αποθηκεύτηκε! ✓',
        description: `Οι ρυθμίσεις για "${selectedTenant.tenant.name}" ενημερώθηκαν.`,
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Σφάλμα',
        description: 'Αποτυχία αποθήκευσης ρυθμίσεων',
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  };

  const handleEnableAll = () => {
    const allEnabled: Record<string, boolean> = {};
    FEATURE_GROUPS.forEach(group => {
      group.features.forEach(feature => {
        allEnabled[feature.key] = true;
      });
    });
    setLocalSettings(allEnabled);
    setHasChanges(true);
  };

  const handleDisableAll = () => {
    const allDisabled: Record<string, boolean> = {};
    FEATURE_GROUPS.forEach(group => {
      group.features.forEach(feature => {
        allDisabled[feature.key] = false;
      });
    });
    setLocalSettings(allDisabled);
    setHasChanges(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-muted-foreground">Φόρτωση tenants...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Settings className="h-7 w-7 text-blue-600" />
              Διαχείριση Features ανά Tenant
            </h1>
            <p className="text-sm text-muted-foreground">
              Ελέγξτε ποια features είναι ορατά για κάθε tenant
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tenant List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Tenants
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {tenants.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Δεν βρέθηκαν tenants
                </p>
              ) : (
                tenants.map(t => (
                  <button
                    key={t.tenant.id}
                    onClick={() => selectTenant(t)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedTenant?.tenant.id === t.tenant.id
                        ? 'bg-blue-100 dark:bg-blue-900/50 border-2 border-blue-500'
                        : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border-2 border-transparent'
                    }`}
                  >
                    <p className="font-medium text-gray-900 dark:text-white">
                      {t.tenant.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.settings ? 'Ρυθμίσεις: Προσαρμοσμένες' : 'Ρυθμίσεις: Προεπιλογή'}
                    </p>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Settings Panel */}
        <div className="lg:col-span-3">
          {selectedTenant ? (
            <div className="space-y-4">
              {/* Tenant Header */}
              <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-blue-800 dark:text-blue-200">
                        {selectedTenant.tenant.name}
                      </h2>
                      <p className="text-sm text-blue-600 dark:text-blue-300">
                        Διαχείριση ορατότητας features
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleEnableAll}
                        className="text-green-600 border-green-300"
                      >
                        <ToggleRight className="h-4 w-4 mr-1" />
                        Όλα ON
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDisableAll}
                        className="text-red-600 border-red-300"
                      >
                        <ToggleLeft className="h-4 w-4 mr-1" />
                        Όλα OFF
                      </Button>
                      <Button
                        onClick={handleSave}
                        disabled={!hasChanges || saving === selectedTenant.tenant.id}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {saving === selectedTenant.tenant.id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-2" />
                        )}
                        Αποθήκευση
                      </Button>
                    </div>
                  </div>
                  {hasChanges && (
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                      ⚠️ Υπάρχουν μη αποθηκευμένες αλλαγές
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Branding Section */}
              <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-900/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Palette className="h-5 w-5 text-purple-600" />
                    Branding & Εμφάνιση
                  </CardTitle>
                  <CardDescription>Προσαρμόστε το όνομα, logo και θέμα του tenant</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Tenant Name */}
                  <div className="space-y-2">
                    <Label htmlFor="tenant_name" className="text-sm font-medium">
                      Όνομα Εταιρείας
                    </Label>
                    <Input
                      id="tenant_name"
                      value={brandingSettings.tenant_name}
                      onChange={(e) => handleBrandingChange('tenant_name', e.target.value)}
                      placeholder="π.χ. Security Company ABC"
                      className="max-w-md"
                    />
                  </div>

                  {/* App Name & Subtitle */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="app_name" className="text-sm font-medium">
                        Όνομα Εφαρμογής (Header)
                      </Label>
                      <Input
                        id="app_name"
                        value={brandingSettings.app_name}
                        onChange={(e) => handleBrandingChange('app_name', e.target.value)}
                        placeholder="SENTINEL"
                        className="font-bold"
                      />
                      <p className="text-xs text-muted-foreground">
                        Εμφανίζεται στο header της εφαρμογής
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="app_subtitle" className="text-sm font-medium">
                        Υπότιτλος Εφαρμογής
                      </Label>
                      <Input
                        id="app_subtitle"
                        value={brandingSettings.app_subtitle}
                        onChange={(e) => handleBrandingChange('app_subtitle', e.target.value)}
                        placeholder="SECURITY.SYS"
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Εμφανίζεται κάτω από το όνομα
                      </p>
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="p-4 rounded-lg bg-gray-900 text-white">
                    <p className="text-xs text-gray-400 mb-2">Προεπισκόπηση Header:</p>
                    <div className="flex items-center gap-3">
                      {brandingSettings.logo_url ? (
                        <img src={brandingSettings.logo_url} alt="Logo" className="h-10 w-10 object-contain" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: brandingSettings.primary_color }}>
                          <Shield className="h-6 w-6 text-white" />
                        </div>
                      )}
                      <div>
                        <h3 className="text-lg font-bold" style={{ color: brandingSettings.primary_color }}>
                          {brandingSettings.app_name || 'SENTINEL'}
                        </h3>
                        <p className="text-xs text-gray-400 font-mono">
                          {brandingSettings.app_subtitle || 'SECURITY.SYS'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Logo Upload */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Logo</Label>
                    <div className="flex items-center gap-4">
                      {brandingSettings.logo_url ? (
                        <div className="relative">
                          <img 
                            src={brandingSettings.logo_url} 
                            alt="Tenant Logo" 
                            className="h-16 w-16 object-contain rounded-lg border bg-white"
                          />
                          <button
                            onClick={() => handleBrandingChange('logo_url', '')}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="h-16 w-16 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
                          <Image className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingLogo}
                        >
                          {uploadingLogo ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4 mr-2" />
                          )}
                          {brandingSettings.logo_url ? 'Αλλαγή Logo' : 'Ανέβασμα Logo'}
                        </Button>
                        <p className="text-xs text-muted-foreground mt-1">
                          PNG, JPG ή SVG, μέγιστο 2MB
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Theme Selection */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Θέμα Χρωμάτων</Label>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                      {THEME_OPTIONS.map(theme => (
                        <button
                          key={theme.value}
                          onClick={() => handleBrandingChange('theme', theme.value)}
                          className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                            brandingSettings.theme === theme.value
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <div 
                            className={`w-8 h-8 rounded-full ${theme.bg}`}
                          />
                          <span className="text-xs font-medium">{theme.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Primary Color */}
                  <div className="space-y-2">
                    <Label htmlFor="primary_color" className="text-sm font-medium">
                      Κύριο Χρώμα
                    </Label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        id="primary_color"
                        value={brandingSettings.primary_color}
                        onChange={(e) => handleBrandingChange('primary_color', e.target.value)}
                        className="w-12 h-10 rounded cursor-pointer border-0"
                      />
                      <Input
                        value={brandingSettings.primary_color}
                        onChange={(e) => handleBrandingChange('primary_color', e.target.value)}
                        placeholder="#3B82F6"
                        className="max-w-32 font-mono"
                      />
                      <div 
                        className="px-4 py-2 rounded text-white text-sm font-medium"
                        style={{ backgroundColor: brandingSettings.primary_color }}
                      >
                        Preview
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Feature Groups */}
              {FEATURE_GROUPS.map(group => (
                <Card key={group.title}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <group.icon className={`h-5 w-5 text-${group.color}-600`} />
                      {group.title}
                    </CardTitle>
                    <CardDescription>{group.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {group.features.map(feature => (
                        <div
                          key={feature.key}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                            localSettings[feature.key]
                              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                              : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${
                              localSettings[feature.key]
                                ? 'bg-green-100 dark:bg-green-800'
                                : 'bg-gray-200 dark:bg-gray-700'
                            }`}>
                              <feature.icon className={`h-4 w-4 ${
                                localSettings[feature.key]
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-gray-500 dark:text-gray-400'
                              }`} />
                            </div>
                            <div>
                              <Label className="font-medium cursor-pointer">
                                {feature.label}
                              </Label>
                              <p className="text-xs text-muted-foreground">
                                {feature.description}
                              </p>
                            </div>
                          </div>
                          <Switch
                            checked={localSettings[feature.key] ?? true}
                            onCheckedChange={(checked) => handleToggle(feature.key, checked)}
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Building2 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-muted-foreground">
                  Επιλέξτε έναν tenant για να διαχειριστείτε τα features
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default TenantFeatureManager;
