import { supabase } from '../config/supabase';
import type { Provincia } from '../models';
import { verificarErrorSupabase } from './supabase-error';

export const provinciaService = {
  async listarActivas(): Promise<Provincia[]> {
    const { data, error } = await supabase
      .from('provincias')
      .select('*')
      .eq('activa', true)
      .order('nombre');

    verificarErrorSupabase(error);
    return (data ?? []) as Provincia[];
  },

  async obtenerPorId(id: string): Promise<Provincia | null> {
    const { data, error } = await supabase
      .from('provincias')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    verificarErrorSupabase(error);
    return data as Provincia | null;
  },
};
