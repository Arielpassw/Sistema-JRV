
import type { Session } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';

import { supabase } from '../config/supabase';

interface LoginCedulaResponse {
  session: Session;
}

const URL_RECUPERACION_ANDROID =
  'ec.cnecontrol://auth/restablecer';

const obtenerUrlRecuperacion = (): string => {
  if (Capacitor.isNativePlatform()) {
    return URL_RECUPERACION_ANDROID;
  }

  return `${window.location.origin}/auth/restablecer`;
};

export const authService = {
  async iniciarSesion(
    cedula: string,
    password: string
  ): Promise<Session> {
    const cedulaLimpia = cedula.trim();

    if (!/^\d{10}$/.test(cedulaLimpia)) {
      throw new Error(
        'La cédula debe contener exactamente 10 dígitos.'
      );
    }

    if (!password) {
      throw new Error('Debes ingresar tu contraseña.');
    }

    const { data, error } =
      await supabase.functions.invoke<LoginCedulaResponse>(
        'login-cedula',
        {
          body: {
            cedula: cedulaLimpia,
            password,
          },
        }
      );

    if (error) {
      throw new Error(
        error.message || 'No se pudo iniciar sesión.'
      );
    }

    if (
      !data?.session?.access_token ||
      !data.session.refresh_token
    ) {
      throw new Error(
        'El servidor no devolvió una sesión válida.'
      );
    }

    const { data: sessionData, error: sessionError } =
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });

    if (sessionError) {
      throw new Error(sessionError.message);
    }

    if (!sessionData.session) {
      throw new Error('No se pudo establecer la sesión.');
    }

    return sessionData.session;
  },

  async cerrarSesion(): Promise<void> {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new Error(error.message);
    }
  },

  async recuperarPassword(correo: string): Promise<void> {
    const correoLimpio = correo.trim().toLowerCase();

    if (!correoLimpio) {
      throw new Error(
        'Debes ingresar tu correo electrónico.'
      );
    }

    const { error } =
      await supabase.auth.resetPasswordForEmail(
        correoLimpio,
        {
          redirectTo: obtenerUrlRecuperacion(),
        }
      );

    if (error) {
      throw new Error(error.message);
    }
  },

  async procesarEnlaceRecuperacion(
    url: string
  ): Promise<void> {
    let enlace: URL;

    try {
      enlace = new URL(url);
    } catch {
      throw new Error('El enlace de recuperación no es válido.');
    }

    const esAndroid =
      enlace.protocol === 'ec.cnecontrol:' &&
      enlace.hostname === 'auth' &&
      enlace.pathname === '/restablecer';

    const esWeb =
      enlace.pathname === '/auth/restablecer';

    if (!esAndroid && !esWeb) {
      throw new Error(
        'El enlace no corresponde a la recuperación de contraseña.'
      );
    }

    const parametrosHash = new URLSearchParams(
      enlace.hash.replace(/^#/, '')
    );

    const parametros = enlace.searchParams;

    const descripcionError =
      parametros.get('error_description') ??
      parametrosHash.get('error_description');

    if (descripcionError) {
      throw new Error(descripcionError);
    }

    const codigo =
      parametros.get('code') ??
      parametrosHash.get('code');

    if (codigo) {
      const { error } =
        await supabase.auth.exchangeCodeForSession(codigo);

      if (error) {
        throw new Error(error.message);
      }

      return;
    }

    const tokenHash =
      parametros.get('token_hash') ??
      parametrosHash.get('token_hash');

    if (tokenHash) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'recovery',
      });

      if (error) {
        throw new Error(error.message);
      }

      return;
    }

    const accessToken =
      parametros.get('access_token') ??
      parametrosHash.get('access_token');

    const refreshToken =
      parametros.get('refresh_token') ??
      parametrosHash.get('refresh_token');

    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        throw new Error(error.message);
      }

      return;
    }

    throw new Error(
      'El enlace no contiene un código o una sesión de recuperación válida.'
    );
  },

  async actualizarPassword(password: string): Promise<void> {
    if (password.length < 8) {
      throw new Error(
        'La contraseña debe tener al menos 8 caracteres.'
      );
    }

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      throw new Error(error.message);
    }
  },


  async cambiarPasswordInicial(password: string): Promise<void> {
    if (password.length < 8) {
      throw new Error(
        'La contraseña debe tener al menos 8 caracteres.'
      );
    }

    if (password === 'Ecuador2026') {
      throw new Error(
        'Debes utilizar una contraseña diferente de la contraseña inicial.'
      );
    }

    const { error } = await supabase.functions.invoke(
      'cambiar-password-inicial',
      {
        body: { password },
      }
    );

    if (error) {
      let mensaje = error.message || 'No se pudo cambiar la contraseña.';

      if (error.context instanceof Response) {
        try {
          const respuesta = await error.context.json();

          if (typeof respuesta?.error === 'string') {
            mensaje = respuesta.error;
          }
        } catch {
          // Se conserva el mensaje original si la respuesta no es JSON.
        }
      }

      throw new Error(mensaje);
    }
  },

};
