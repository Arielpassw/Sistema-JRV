import { supabase } from '../config/supabase';
import type { Parroquia } from '../models';
import { verificarErrorSupabase } from './supabase-error';

export const parroquiaService = {
  async listarPorCanton(cantonId: string): Promise<Parroquia[]> {
    const { data, error } = await supabase
      .from('parroquias')
      .select('*')
      .eq('canton_id', cantonId)
      .eq('activa', true)
      .order('nombre');

    verificarErrorSupabase(error);
    return (data ?? []) as Parroquia[];
  },

  async obtenerPorId(id: string): Promise<Parroquia | null> {
    const { data, error } = await supabase
      .from('parroquias')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    verificarErrorSupabase(error);
    return data as Parroquia | null;
  },
};
