import type { UUID, FechaISO } from './common.model';

export interface Acta {
  id: UUID;
  jrv_id: UUID;
  dignidad: string;
  total_sufragantes: number;
  votos_nulos: number;
  votos_blancos: number;
  foto_url: string | null;
  latitud: number | null;
  longitud: number | null;
  estado: string;
  registrado_por: UUID | null;
  observaciones: string | null;
  fecha_registro: FechaISO | null;
  creado_en: FechaISO;
  actualizado_en: FechaISO;
}
