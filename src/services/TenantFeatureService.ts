import { supabase } from '@/integrations/supabase/client';
import type { TenantFeatureSettings } from '@/types/database';

// Default settings when no tenant settings exist
const DEFAULT_SETTINGS: Omit<TenantFeatureSettings, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'created_by'> = {
  show_scan_button: true,
  show_tasks_button: true,
  show_observations_button: true,
  show_report_button: true,
  show_supervisor_report: true,
  show_todays_tasks: true,
  show_patrol_status: true,
  show_emergency_reports: true,
  show_location_tracking: true,
  show_team_observations: true,
  show_patrol_sessions: true,
  show_photo_requirement: true,
  show_signature_requirement: true,
  show_checklist_requirement: true,
  show_notes_field: true,
};

export class TenantFeatureService {
  /**
   * Get feature settings for a tenant
   */
  static async getSettings(tenantId: string): Promise<TenantFeatureSettings | null> {
    const { data, error } = await supabase
      .from('tenant_feature_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching tenant feature settings:', error);
      return null;
    }

    return data;
  }

  /**
   * Get feature settings for current user's tenant
   */
  static async getCurrentUserSettings(): Promise<TenantFeatureSettings | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Get user's tenant_id from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    console.log('User tenant_id:', profile?.tenant_id);

    if (!profile?.tenant_id) {
      console.log('No tenant_id found for user, returning default settings');
      return null;
    }

    const settings = await this.getSettings(profile.tenant_id);
    console.log('Loaded settings for user:', settings);
    return settings;
  }

  /**
   * Get all tenants with their settings (super_admin only)
   */
  static async getAllTenantsWithSettings(): Promise<{
    tenant: { id: string; name: string };
    settings: TenantFeatureSettings | null;
  }[]> {
    console.log('Fetching all tenants...');
    
    // Try to get tenants - select all columns without ordering by name
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('*');

    console.log('Tenants result:', tenants, 'Error:', tenantsError);
    
    // Map tenants to ensure we have id and name
    const mappedTenants = (tenants || []).map(t => {
      console.log('Tenant object:', t);
      return {
        id: t.id,
        // Try different possible column names for the tenant name
        name: t.name || t.tenant_name || t.company_name || t.title || t.display_name || t.organization_name || `Tenant ${t.id?.substring(0, 8)}`
      };
    });
    
    console.log('Mapped tenants:', mappedTenants);

    // If tenants table doesn't exist or is empty, try to get unique tenant_ids from profiles
    if (tenantsError || !tenants || tenants.length === 0) {
      console.log('No tenants found, trying to get from profiles...');
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('tenant_id')
        .not('tenant_id', 'is', null);
      
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return [];
      }

      // Get unique tenant_ids
      const uniqueTenantIds = [...new Set(profiles?.map(p => p.tenant_id).filter(Boolean))];
      console.log('Unique tenant IDs from profiles:', uniqueTenantIds);

      if (uniqueTenantIds.length === 0) {
        // No tenants found anywhere, return empty
        return [];
      }

      // Try to get tenant names from tenants table
      let tenantNames: Record<string, string> = {};
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('id, name')
        .in('id', uniqueTenantIds);
      
      if (tenantData) {
        tenantData.forEach(t => {
          tenantNames[t.id] = t.name;
        });
      }

      // Create tenant objects from IDs
      const tenantsFromProfiles = uniqueTenantIds.map((id, index) => ({
        id: id as string,
        name: tenantNames[id as string] || `Tenant ${index + 1}`
      }));

      // Try to get settings
      const { data: allSettings } = await supabase
        .from('tenant_feature_settings')
        .select('*');

      return tenantsFromProfiles.map(tenant => ({
        tenant,
        settings: allSettings?.find(s => s.tenant_id === tenant.id) || null,
      }));
    }

    // Get settings for existing tenants
    const { data: allSettings, error: settingsError } = await supabase
      .from('tenant_feature_settings')
      .select('*');

    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
    }

    return mappedTenants.map(tenant => ({
      tenant,
      settings: allSettings?.find(s => s.tenant_id === tenant.id) || null,
    }));
  }

  /**
   * Update feature settings for a tenant (super_admin only)
   */
  static async updateSettings(
    tenantId: string,
    settings: Partial<Omit<TenantFeatureSettings, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>>
  ): Promise<TenantFeatureSettings | null> {
    const { data: { user } } = await supabase.auth.getUser();
    
    console.log('Saving settings for tenant:', tenantId);
    console.log('Settings to save:', settings);
    
    const { data, error } = await supabase
      .from('tenant_feature_settings')
      .upsert({
        tenant_id: tenantId,
        ...settings,
        created_by: user?.id,
      }, {
        onConflict: 'tenant_id',
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating tenant feature settings:', error);
      throw error;
    }

    console.log('Settings saved successfully:', data);
    return data;
  }

  /**
   * Create default settings for a tenant
   */
  static async createDefaultSettings(tenantId: string): Promise<TenantFeatureSettings | null> {
    return this.updateSettings(tenantId, DEFAULT_SETTINGS);
  }

  /**
   * Get effective settings (with defaults for missing values)
   */
  static getEffectiveSettings(settings: TenantFeatureSettings | null): typeof DEFAULT_SETTINGS {
    if (!settings) return DEFAULT_SETTINGS;
    
    return {
      show_scan_button: settings.show_scan_button ?? true,
      show_tasks_button: settings.show_tasks_button ?? true,
      show_observations_button: settings.show_observations_button ?? true,
      show_report_button: settings.show_report_button ?? true,
      show_supervisor_report: settings.show_supervisor_report ?? true,
      show_todays_tasks: settings.show_todays_tasks ?? true,
      show_patrol_status: settings.show_patrol_status ?? true,
      show_emergency_reports: settings.show_emergency_reports ?? true,
      show_location_tracking: settings.show_location_tracking ?? true,
      show_team_observations: settings.show_team_observations ?? true,
      show_patrol_sessions: settings.show_patrol_sessions ?? true,
      show_photo_requirement: settings.show_photo_requirement ?? true,
      show_signature_requirement: settings.show_signature_requirement ?? true,
      show_checklist_requirement: settings.show_checklist_requirement ?? true,
      show_notes_field: settings.show_notes_field ?? true,
    };
  }
}
