import type { UUID, FechaISO } from './common.model';

export interface Organizacion {
  id: UUID;
  nombre: string;
  siglas: string;
  logo_url: string | null;
  activa: boolean;
  creado_en: FechaISO;
}
