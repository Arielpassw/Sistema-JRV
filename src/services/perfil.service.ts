import { supabase } from '../config/supabase';
import type { Perfil } from '../models';
import { verificarErrorSupabase } from './supabase-error';

export const perfilService = {
  async obtenerPorId(id: string): Promise<Perfil | null> {
    const { data, error } = await supabase
      .from('perfiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    verificarErrorSupabase(error);
    return data as Perfil | null;
  },

  async obtenerPorCedula(cedula: string): Promise<Perfil | null> {
    const { data, error } = await supabase
      .from('perfiles')
      .select('*')
      .eq('cedula', cedula)
      .maybeSingle();

    verificarErrorSupabase(error);
    return data as Perfil | null;
  },

  async actualizarPropioPerfil(
    id: string,
    cambios: Partial<
      Pick<Perfil, 'nombres' | 'apellidos' | 'telefono' | 'foto_url'>
    >
  ): Promise<Perfil> {
    const { data, error } = await supabase
      .from('perfiles')
      .update({
        ...cambios,
        actualizado_en: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    verificarErrorSupabase(error);
    return data as Perfil;
  },
};
