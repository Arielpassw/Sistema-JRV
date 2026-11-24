import { supabase } from '../config/supabase';
import type { Canton } from '../models';
import { verificarErrorSupabase } from './supabase-error';

export const cantonService = {
  async listarPorProvincia(provinciaId: string): Promise<Canton[]> {
    const { data, error } = await supabase
      .from('cantones')
      .select('*')
      .eq('provincia_id', provinciaId)
      .eq('activo', true)
      .order('nombre');

    verificarErrorSupabase(error);
    return (data ?? []) as Canton[];
  },

  async obtenerPorId(id: string): Promise<Canton | null> {
    const { data, error } = await supabase
      .from('cantones')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    verificarErrorSupabase(error);
    return data as Canton | null;
  },
};
