import type { UUID, FechaISO } from './common.model';

export interface Parroquia {
  id: UUID;
  canton_id: UUID;
  codigo: string | null;
  nombre: string;
  activa: boolean;
  creado_en: FechaISO;
}
