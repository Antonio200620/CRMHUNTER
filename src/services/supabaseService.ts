import { supabase } from '../supabase';

export const supabaseService = {
  // Auth
  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    
    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
      
    return {
      user: {
        id: data.user.id,
        email: data.user.email,
        name: profile?.name || data.user.email?.split('@')[0] || 'Usuário',
        role: profile?.role || 'user'
      },
      session: data.session
    };
  },

  async register(email: string, password: string, name: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    });
    if (error) throw error;
    
    // Profile is usually created via trigger in Supabase, 
    // but we can do it manually if needed or assume it exists.
    return data;
  },

  async logout() {
    await supabase.auth.signOut();
  },

  // Data
  async getStages() {
    const { data, error } = await supabase
      .from('stages')
      .select('*')
      .order('order', { ascending: true });
    if (error) throw error;
    return data;
  },

  async getLeads() {
    const { data, error } = await supabase
      .from('leads')
      .select('*, stage:stages(name)')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return data.map(l => ({ ...l, stage_name: l.stage?.name }));
  },

  async createLead(lead: any) {
    const { data, error } = await supabase
      .from('leads')
      .insert(lead)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateLead(id: number | string, updates: any) {
    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteLead(id: number | string) {
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async getInteractions(leadId: number | string) {
    const { data, error } = await supabase
      .from('interactions')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async createInteraction(interaction: any) {
    const { data, error } = await supabase
      .from('interactions')
      .insert(interaction)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateInteraction(id: number | string, updates: any) {
    const { data, error } = await supabase
      .from('interactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteInteraction(id: number | string) {
    const { error } = await supabase
      .from('interactions')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async getTasks(leadId: number | string) {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('lead_id', leadId)
      .order('due_date', { ascending: true });
    if (error) throw error;
    return data;
  },

  async createTask(task: any) {
    const { data, error } = await supabase
      .from('tasks')
      .insert(task)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateTask(id: number | string, updates: any) {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteTask(id: number | string) {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async getSettings() {
    const { data, error } = await supabase
      .from('settings')
      .select('*');
    if (error) throw error;
    return data.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
  },

  async updateSettings(settings: any) {
    const upserts = Object.entries(settings).map(([key, value]) => ({ key, value: String(value) }));
    const { error } = await supabase
      .from('settings')
      .upsert(upserts);
    if (error) throw error;
  },

  async getImportBatches() {
    const { data, error } = await supabase
      .from('import_batches')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async createImportBatch(filename: string, leadCount: number) {
    const { data, error } = await supabase
      .from('import_batches')
      .insert({ filename, lead_count: leadCount })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getQuickCommands() {
    const { data, error } = await supabase
      .from('quick_commands')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    return data;
  },

  async createQuickCommand(command: string, result: string) {
    const { data, error } = await supabase
      .from('quick_commands')
      .insert({ command, result })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteQuickCommand(id: number | string) {
    const { error } = await supabase
      .from('quick_commands')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async updateProfile(id: string, updates: any) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async createStage(stage: any) {
    const { data, error } = await supabase
      .from('stages')
      .insert(stage)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateStage(id: number | string, updates: any) {
    const { data, error } = await supabase
      .from('stages')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteStage(id: number | string) {
    const { error } = await supabase
      .from('stages')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async deleteImportBatch(id: number | string) {
    const { error } = await supabase
      .from('import_batches')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async getSavedReports() {
    const { data, error } = await supabase
      .from('saved_reports')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async createSavedReport(report: any) {
    const { data, error } = await supabase
      .from('saved_reports')
      .insert(report)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteSavedReport(id: number | string) {
    const { error } = await supabase
      .from('saved_reports')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // Stats calculation (moved to frontend)
  async getDashboardStats(leads: any[], stages: any[]) {
    const totalLeads = leads.length;
    
    const closedStages = stages.filter(s => ['Fechamento', 'Indicação'].includes(s.name)).map(s => s.id);
    const closedLeads = leads.filter(l => closedStages.includes(l.stage_id)).length;
    
    const conversionRate = totalLeads > 0 ? ((closedLeads / totalLeads) * 100).toFixed(1) : "0.0";

    // Avg time (simplified)
    const closedLeadsData = leads.filter(l => closedStages.includes(l.stage_id));
    let avgDays = 0;
    if (closedLeadsData.length > 0) {
      const totalDays = closedLeadsData.reduce((acc, l) => {
        const created = new Date(l.created_at).getTime();
        const now = new Date().getTime();
        return acc + (now - created) / (1000 * 60 * 60 * 24);
      }, 0);
      avgDays = Math.round(totalDays / closedLeadsData.length);
    }

    const advancedStages = stages.filter(s => ['Proposta', 'Follow up', 'Fechamento'].includes(s.name)).map(s => s.id);
    const advancedLeadsCount = leads.filter(l => advancedStages.includes(l.stage_id)).length;
    const estimatedRevenue = (advancedLeadsCount * 15000).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const stageDistribution = stages.map(s => ({
      name: s.name,
      count: leads.filter(l => l.stage_id === s.id).length
    }));

    return {
      totalLeads,
      conversionRate: `${conversionRate}%`,
      avgTime: avgDays > 0 ? `${avgDays} dias` : 'N/A',
      estimatedRevenue,
      stageDistribution,
      recentInteractions: [] // Can be fetched separately if needed
    };
  }
};
