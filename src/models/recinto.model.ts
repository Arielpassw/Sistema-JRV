import type { UUID, FechaISO } from './common.model';

export interface Recinto {
  id: UUID;
  parroquia_id: UUID;
  codigo: string | null;
  nombre: string;
  direccion: string | null;
  latitud: number | null;
  longitud: number | null;
  activo: boolean;
  creado_en: FechaISO;
}
