import { supabase } from '../config/supabase';
import { DetalleVoto } from '../models';
import { verificarErrorSupabase } from './supabase-error';

export type NuevoDetalleVoto = Pick<
  DetalleVoto,
  'acta_id' | 'candidatura_id' | 'cantidad_votos'
>;

export const detalleVotoService = {
  async listarPorActa(actaId: string): Promise<DetalleVoto[]> {
    const { data, error } = await supabase
      .from('detalle_votos')
      .select('*')
      .eq('acta_id', actaId)
      .order('creado_en', { ascending: true });

    verificarErrorSupabase(error);
    return (data ?? []) as DetalleVoto[];
  },

  async registrar(
    detalle: NuevoDetalleVoto
  ): Promise<DetalleVoto> {
    this.validarCantidad(detalle.cantidad_votos);

    const { data, error } = await supabase
      .from('detalle_votos')
      .insert(detalle)
      .select('*')
      .single();

    verificarErrorSupabase(error);

    if (!data) {
      throw new Error('No se pudo registrar el detalle de votos.');
    }

    return data as DetalleVoto;
  },

  async actualizar(
    id: string,
    cantidadVotos: number
  ): Promise<DetalleVoto> {
    this.validarCantidad(cantidadVotos);

    const { data, error } = await supabase
      .from('detalle_votos')
      .update({
        cantidad_votos: cantidadVotos,
        actualizado_en: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    verificarErrorSupabase(error);

    if (!data) {
      throw new Error('No se pudo actualizar el detalle de votos.');
    }

    return data as DetalleVoto;
  },

  validarCantidad(cantidad: number): void {
    if (!Number.isInteger(cantidad) || cantidad < 0) {
      throw new Error(
        'La cantidad de votos debe ser un número entero mayor o igual a cero.'
      );
    }
  },
};