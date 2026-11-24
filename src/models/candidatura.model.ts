import type { UUID, FechaISO } from './common.model';

export interface Candidatura {
  id: UUID;
  organizacion_id: UUID;
  dignidad: string;
  nombre_candidato: string;
  numero_lista: number | null;
  foto_url: string | null;
  activa: boolean;
  creado_en: FechaISO;
}
