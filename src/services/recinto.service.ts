import { supabase } from '../config/supabase';
import type { Recinto } from '../models';
import { verificarErrorSupabase } from './supabase-error';

export const recintoService = {
  async listarPorParroquia(parroquiaId: string): Promise<Recinto[]> {
    const { data, error } = await supabase
      .from('recintos')
      .select('*')
      .eq('parroquia_id', parroquiaId)
      .eq('activo', true)
      .order('nombre');

    verificarErrorSupabase(error);
    return (data ?? []) as Recinto[];
  },

  async obtenerPorId(id: string): Promise<Recinto | null> {
    const { data, error } = await supabase
      .from('recintos')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    verificarErrorSupabase(error);
    return data as Recinto | null;
  },
};
