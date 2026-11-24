import type { UUID, FechaISO } from './common.model';

export interface Provincia {
  id: UUID;
  codigo: string | null;
  nombre: string;
  activa: boolean;
  creado_en: FechaISO;
}
