import { supabase } from '../config/supabase';
import type { JRV } from '../models';
import { verificarErrorSupabase } from './supabase-error';

export const jrvService = {
  async listarPorRecinto(recintoId: string): Promise<JRV[]> {
    const { data, error } = await supabase
      .from('jrv')
      .select('*')
      .eq('recinto_id', recintoId)
      .order('numero');

    verificarErrorSupabase(error);
    return (data ?? []) as JRV[];
  },

  async obtenerPorId(id: string): Promise<JRV | null> {
    const { data, error } = await supabase
      .from('jrv')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    verificarErrorSupabase(error);
    return data as JRV | null;
  },
};
