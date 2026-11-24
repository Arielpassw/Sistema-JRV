import type { UUID, FechaISO } from './common.model';

export interface DetalleVoto {
  id: UUID;
  acta_id: UUID;
  candidatura_id: UUID;
  cantidad_votos: number;
  creado_en: FechaISO;
  actualizado_en: FechaISO;
}
