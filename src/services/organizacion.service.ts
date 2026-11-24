import { supabase } from '../config/supabase';
import type { Organizacion } from '../models';
import { verificarErrorSupabase } from './supabase-error';

export const organizacionService = {
  async listarActivas(): Promise<Organizacion[]> {
    const { data, error } = await supabase
      .from('organizaciones')
      .select('*')
      .eq('activa', true)
      .order('nombre');

    verificarErrorSupabase(error);
    return (data ?? []) as Organizacion[];
  },

  async obtenerPorId(id: string): Promise<Organizacion | null> {
    const { data, error } = await supabase
      .from('organizaciones')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    verificarErrorSupabase(error);
    return data as Organizacion | null;
  },
};
