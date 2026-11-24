import { supabase } from '../config/supabase';
import { Acta } from '../models';
import { verificarErrorSupabase } from './supabase-error';

export type NuevaActa = Pick<Acta, 'jrv_id' | 'dignidad'> &
  Partial<
    Pick<
      Acta,
      | 'total_sufragantes'
      | 'votos_nulos'
      | 'votos_blancos'
      | 'foto_url'
      | 'latitud'
      | 'longitud'
      | 'observaciones'
    >
  >;

export type CambiosActa = Partial<
  Pick<
    Acta,
    | 'total_sufragantes'
    | 'votos_nulos'
    | 'votos_blancos'
    | 'foto_url'
    | 'latitud'
    | 'longitud'
    | 'observaciones'
    | 'estado'
  >
>;

export const actaService = {
  async listarPorJrv(jrvId: string): Promise<Acta[]> {
    const { data, error } = await supabase
      .from('actas')
      .select('*')
      .eq('jrv_id', jrvId)
      .order('creado_en', { ascending: false });

    verificarErrorSupabase(error);
    return (data ?? []) as Acta[];
  },

  async obtenerPorId(id: string): Promise<Acta> {
    const { data, error } = await supabase
      .from('actas')
      .select('*')
      .eq('id', id)
      .single();

    verificarErrorSupabase(error);

    if (!data) {
      throw new Error('No se encontró el acta solicitada.');
    }

    return data as Acta;
  },

  async crear(acta: NuevaActa): Promise<Acta> {
    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    verificarErrorSupabase(authError);

    if (!authData.user) {
      throw new Error('Debes iniciar sesión para registrar un acta.');
    }

    const { data, error } = await supabase
      .from('actas')
      .insert({
        jrv_id: acta.jrv_id,
        dignidad: acta.dignidad,
        total_sufragantes: acta.total_sufragantes ?? 0,
        votos_nulos: acta.votos_nulos ?? 0,
        votos_blancos: acta.votos_blancos ?? 0,
        foto_url: acta.foto_url ?? null,
        latitud: acta.latitud ?? null,
        longitud: acta.longitud ?? null,
        observaciones: acta.observaciones ?? null,
        registrado_por: authData.user.id,
        fecha_registro: new Date().toISOString(),
      })
      .select('*')
      .single();

    verificarErrorSupabase(error);

    if (!data) {
      throw new Error('No se pudo registrar el acta.');
    }

    return data as Acta;
  },

  async actualizar(id: string, cambios: CambiosActa): Promise<Acta> {
    const { data, error } = await supabase
      .from('actas')
      .update({
        ...cambios,
        actualizado_en: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    verificarErrorSupabase(error);

    if (!data) {
      throw new Error('No se pudo actualizar el acta.');
    }

    return data as Acta;
  },
};