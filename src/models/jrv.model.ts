import type { UUID, FechaISO } from './common.model';

export interface JRV {
  id: UUID;
  recinto_id: UUID;
  numero: number;
  total_electores: number;
  estado: string;
  creado_en: FechaISO;
}
