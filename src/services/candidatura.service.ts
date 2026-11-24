import { supabase } from '../config/supabase';
import type { Candidatura } from '../models';
import { verificarErrorSupabase } from './supabase-error';

export const candidaturaService = {
  async listarActivas(): Promise<Candidatura[]> {
    const { data, error } = await supabase
      .from('candidaturas')
      .select('*')
      .eq('activa', true)
      .order('nombre_candidato');

    verificarErrorSupabase(error);
    return (data ?? []) as Candidatura[];
  },

  async listarPorDignidad(dignidad: string): Promise<Candidatura[]> {
    const { data, error } = await supabase
      .from('candidaturas')
      .select('*')
      .eq('dignidad', dignidad)
      .eq('activa', true)
      .order('nombre_candidato');

    verificarErrorSupabase(error);
    return (data ?? []) as Candidatura[];
  },

  async listarPorOrganizacion(
    organizacionId: string
  ): Promise<Candidatura[]> {
    const { data, error } = await supabase
      .from('candidaturas')
      .select('*')
      .eq('organizacion_id', organizacionId)
      .eq('activa', true)
      .order('nombre_candidato');

    verificarErrorSupabase(error);
    return (data ?? []) as Candidatura[];
  },
};
