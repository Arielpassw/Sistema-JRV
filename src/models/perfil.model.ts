import type { UUID, FechaISO, RolUsuario } from './common.model';

export interface Perfil {
  id: UUID;
  cedula: string;
  nombres: string;
  apellidos: string;
  telefono: string | null;
  correo: string;
  rol: RolUsuario;
  provincia_id: UUID | null;
  foto_url: string | null;
  debe_cambiar_password: boolean;
  activo: boolean;
  creado_en: FechaISO;
  actualizado_en: FechaISO;
}
