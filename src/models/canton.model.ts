import type { UUID, FechaISO } from './common.model';

export interface Canton {
  id: UUID;
  provincia_id: UUID;
  codigo: string | null;
  nombre: string;
  activo: boolean;
  creado_en: FechaISO;
}
