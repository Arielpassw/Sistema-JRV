import type { UUID, FechaISO } from './common.model';

export interface Asignacion {
  id: UUID;
  perfil_id: UUID;
  tipo_asignacion: string;
  recinto_id: UUID | null;
  jrv_id: UUID | null;
  asignado_por: UUID | null;
  activa: boolean;
  fecha_asignacion: FechaISO;
  fecha_fin: FechaISO | null;
}
