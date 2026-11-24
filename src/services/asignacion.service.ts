import { supabase } from '../config/supabase';
import { Asignacion } from '../models';
import { verificarErrorSupabase } from './supabase-error';

export type NuevaAsignacion = Pick<
  Asignacion,
  'perfil_id' | 'tipo_asignacion'
> & {
  recinto_id?: string | null;
  jrv_id?: string | null;
};

export const asignacionService = {
  async listarPorPerfil(perfilId: string): Promise<Asignacion[]> {
    const { data, error } = await supabase
      .from('asignaciones')
      .select('*')
      .eq('perfil_id', perfilId)
      .eq('activa', true)
      .order('fecha_asignacion', { ascending: false });

    verificarErrorSupabase(error);
    return (data ?? []) as Asignacion[];
  },

  async listarPorRecinto(recintoId: string): Promise<Asignacion[]> {
    const { data, error } = await supabase
      .from('asignaciones')
      .select('*')
      .eq('recinto_id', recintoId)
      .eq('activa', true)
      .order('fecha_asignacion', { ascending: false });

    verificarErrorSupabase(error);
    return (data ?? []) as Asignacion[];
  },

  async listarPorJrv(jrvId: string): Promise<Asignacion[]> {
    const { data, error } = await supabase
      .from('asignaciones')
      .select('*')
      .eq('jrv_id', jrvId)
      .eq('activa', true)
      .order('fecha_asignacion', { ascending: false });

    verificarErrorSupabase(error);
    return (data ?? []) as Asignacion[];
  },

  async crear(asignacion: NuevaAsignacion): Promise<Asignacion> {
    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    verificarErrorSupabase(authError);

    if (!authData.user) {
      throw new Error('No existe una sesión de usuario activa.');
    }

    const { data, error } = await supabase
      .from('asignaciones')
      .insert({
        perfil_id: asignacion.perfil_id,
        tipo_asignacion: asignacion.tipo_asignacion,
        recinto_id: asignacion.recinto_id ?? null,
        jrv_id: asignacion.jrv_id ?? null,
        asignado_por: authData.user.id,
        activa: true,
      })
      .select('*')
      .single();

    verificarErrorSupabase(error);

    if (!data) {
      throw new Error('No se pudo crear la asignación.');
    }

    return data as Asignacion;
  },

  async desactivar(id: string): Promise<Asignacion> {
    const { data, error } = await supabase
      .from('asignaciones')
      .update({
        activa: false,
        fecha_fin: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('activa', true)
      .select('*')
      .single();

    verificarErrorSupabase(error);

    if (!data) {
      throw new Error('No se encontró una asignación activa para desactivar.');
    }

    return data as Asignacion;
  },
};