
import { supabase } from '../config/supabase';
import type { RolUsuario } from '../models';

export interface NuevoUsuarioAdministrativo {
  cedula: string;
  nombres: string;
  apellidos: string;
  telefono?: string | null;
  correo: string;
  rol: Extract<RolUsuario, 'coordinador_recinto' | 'veedor_mesa'>;
  recintoId?: string;
  jrvId?: string;
}

export interface UsuarioCreado {
  id: string;
  cedula: string;
  nombres: string;
  apellidos: string;
  correo: string;
  rol: RolUsuario;
}

interface RespuestaCrearUsuario {
  mensaje: string;
  usuario: UsuarioCreado;
  asignacion: {
    tipo: 'recinto' | 'jrv';
    recintoId: string | null;
    jrvId: string | null;
  };
  debeCambiarPassword: boolean;
}

export const usuarioService = {
  async crear(
    usuario: NuevoUsuarioAdministrativo
  ): Promise<RespuestaCrearUsuario> {
    const { data, error } =
      await supabase.functions.invoke<RespuestaCrearUsuario>(
        'crear-usuario',
        {
          body: usuario,
        }
      );

    if (error) {
      let mensaje = error.message || 'No se pudo crear el usuario.';

      // Supabase puede devolver el mensaje detallado de la Edge Function.
      try {
        const respuesta = await error.context?.json();

        if (respuesta?.error) {
          mensaje = respuesta.error;
        }
      } catch {
        // Se conserva el mensaje original si no hay respuesta JSON.
      }

      throw new Error(mensaje);
    }

    if (!data?.usuario?.id) {
      throw new Error('El servidor no devolvió los datos del usuario creado.');
    }

    return data;
  },
};
