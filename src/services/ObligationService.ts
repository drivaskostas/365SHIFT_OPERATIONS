import { supabase } from '@/lib/supabase';
import type { ContractObligation, ObligationCompletion } from '@/types/database';
import { format } from 'date-fns';

export class ObligationService {
  /**
   * Get obligation by ID with contract and site details
   */
  static async getObligationById(obligationId: string): Promise<ContractObligation | null> {
    // First get the obligation with contract info
    const { data, error } = await supabase
      .from('contract_obligations')
      .select(`
        *,
        service_contracts (
          id,
          team_id,
          contract_name,
          client_name
        )
      `)
      .eq('id', obligationId)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching obligation:', error);
      throw error;
    }

    // If we have a team_id, fetch the site from guardian_sites
    if (data?.service_contracts?.team_id) {
      const { data: siteData } = await supabase
        .from('guardian_sites')
        .select('id, name')
        .eq('team_id', data.service_contracts.team_id)
        .limit(1)
        .single();
      
      if (siteData) {
        (data as any).site_name = siteData.name;
      }
    }

    return data;
  }

  /**
   * Get all active obligations for a supervisor's team
   */
  static async getObligationsForTeam(teamId: string): Promise<ContractObligation[]> {
    const { data, error } = await supabase
      .from('contract_obligations')
      .select(`
        *,
        service_contracts!inner (
          id,
          team_id,
          contract_name,
          client_name
        )
      `)
      .eq('service_contracts.team_id', teamId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching team obligations:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get today's obligations for a supervisor
   */
  static async getTodaysObligations(teamId: string): Promise<{
    obligation: ContractObligation;
    completion: ObligationCompletion | null;
  }[]> {
    const today = format(new Date(), 'yyyy-MM-dd');
    const dayOfWeek = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Get all active obligations for the team
    const obligations = await this.getObligationsForTeam(teamId);

    // Filter obligations that should be done today based on frequency
    const todaysObligations = obligations.filter(obligation => {
      if (obligation.frequency === 'daily') return true;
      if (obligation.frequency === 'weekly' && obligation.specific_days?.includes(dayOfWeek)) return true;
      // For monthly/yearly, we'd need more complex logic
      if (obligation.frequency === 'monthly') {
        const dayOfMonth = new Date().getDate();
        return obligation.specific_days?.includes(dayOfMonth);
      }
      return false;
    });

    // Get completions for today
    const obligationIds = todaysObligations.map(o => o.id);
    
    if (obligationIds.length === 0) {
      return [];
    }

    const { data: completions, error: completionsError } = await supabase
      .from('obligation_completions')
      .select('*')
      .in('obligation_id', obligationIds)
      .eq('scheduled_date', today);

    if (completionsError) {
      console.error('Error fetching completions:', completionsError);
    }

    // Map obligations with their completions
    return todaysObligations.map(obligation => ({
      obligation,
      completion: completions?.find(c => c.obligation_id === obligation.id) || null
    }));
  }

  /**
   * Check if obligation was already completed today
   */
  static async getCompletionForToday(obligationId: string): Promise<ObligationCompletion | null> {
    const today = format(new Date(), 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('obligation_completions')
      .select('*')
      .eq('obligation_id', obligationId)
      .eq('scheduled_date', today)
      .maybeSingle();

    if (error) {
      console.error('Error checking completion:', error);
      throw error;
    }

    return data;
  }

  /**
   * Complete an obligation (upsert)
   */
  static async completeObligation(
    obligationId: string,
    userId: string,
    data: {
      notes?: string;
      checklist_responses?: Record<string, boolean>;
      photo_urls?: string[];
      signature_url?: string;
      issues_found?: string;
    }
  ): Promise<ObligationCompletion> {
    const today = format(new Date(), 'yyyy-MM-dd');

    const { data: completion, error } = await supabase
      .from('obligation_completions')
      .upsert({
        obligation_id: obligationId,
        scheduled_date: today,
        completed_by: userId,
        completed_at: new Date().toISOString(),
        status: 'completed',
        notes: data.notes,
        checklist_responses: data.checklist_responses,
        photo_urls: data.photo_urls,
        signature_url: data.signature_url,
        issues_found: data.issues_found,
      }, {
        onConflict: 'obligation_id,scheduled_date',
      })
      .select()
      .single();

    if (error) {
      console.error('Error completing obligation:', error);
      throw error;
    }

    return completion;
  }

  /**
   * Validate QR code and get obligation
   */
  static async validateObligationQR(qrData: string): Promise<{
    obligation: ContractObligation;
    alreadyCompleted: boolean;
    existingCompletion: ObligationCompletion | null;
  }> {
    let obligationId = qrData;

    // Try to parse as JSON
    try {
      const parsed = JSON.parse(qrData);
      if (parsed.type === 'obligation' && parsed.obligationId) {
        obligationId = parsed.obligationId;
      } else if (parsed.obligationId) {
        obligationId = parsed.obligationId;
      }
    } catch {
      // Not JSON, use raw string as obligation ID
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(obligationId)) {
      throw new Error('Invalid QR code format. This is not an obligation QR code.');
    }

    // Get obligation
    const obligation = await this.getObligationById(obligationId);
    
    if (!obligation) {
      throw new Error('Obligation not found or is no longer active.');
    }

    // Check if already completed today
    const existingCompletion = await this.getCompletionForToday(obligationId);

    return {
      obligation,
      alreadyCompleted: existingCompletion?.status === 'completed',
      existingCompletion,
    };
  }

  /**
   * Get completion history for an obligation
   */
  static async getCompletionHistory(
    obligationId: string,
    limit: number = 30
  ): Promise<ObligationCompletion[]> {
    const { data, error } = await supabase
      .from('obligation_completions')
      .select(`
        *,
        profiles:completed_by (
          id,
          full_name,
          email
        )
      `)
      .eq('obligation_id', obligationId)
      .order('scheduled_date', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching completion history:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Generate QR code URL for an obligation
   */
  static generateObligationQRUrl(obligationId: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/complete-obligation/${obligationId}`;
  }

  /**
   * Generate QR code data (JSON format)
   */
  static generateObligationQRData(obligation: ContractObligation): string {
    return JSON.stringify({
      type: 'obligation',
      obligationId: obligation.id,
      title: obligation.title,
      version: 1,
    });
  }
}
