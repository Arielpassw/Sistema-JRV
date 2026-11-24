import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import type { Session, User } from '@supabase/supabase-js';

import { supabase } from '../config/supabase';
import { authService } from '../services/auth.service';
import { perfilService } from '../services/perfil.service';
import type { Perfil } from '../models';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  perfil: Perfil | null;
  loading: boolean;
  autenticado: boolean;
  iniciarSesion: (cedula: string, password: string) => Promise<void>;
  cerrarSesion: () => Promise<void>;
  recuperarPassword: (correo: string) => Promise<void>;
  cambiarPasswordInicial: (password: string) => Promise<void>;
  refrescarPerfil: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nuevaSesion) => {
      if (!mounted) return;

      setSession(nuevaSesion);
      setUser(nuevaSesion?.user ?? null);
    });

    const cargarSesionInicial = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        setSession(null);
        setUser(null);
      } else {
        setSession(data.session);
        setUser(data.session?.user ?? null);
      }

      setAuthReady(true);
    };

    void cargarSesionInicial();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const refrescarPerfil = useCallback(async () => {
    if (!user) {
      setPerfil(null);
      return;
    }

    const perfilActual = await perfilService.obtenerPorId(user.id);
    setPerfil(perfilActual);
  }, [user]);

  useEffect(() => {
    let mounted = true;

    const cargarPerfil = async () => {
      if (!authReady) return;

      if (!user) {
        setPerfil(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const perfilActual = await perfilService.obtenerPorId(user.id);

        if (mounted) {
          setPerfil(perfilActual);
        }
      } catch (error) {
        console.error('Error al cargar el perfil:', error);

        if (mounted) {
          setPerfil(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void cargarPerfil();

    return () => {
      mounted = false;
    };
  }, [authReady, user]);

  const iniciarSesion = async (
    cedula: string,
    password: string
  ): Promise<void> => {
    await authService.iniciarSesion(cedula, password);
  };

  const cerrarSesion = async (): Promise<void> => {
    await authService.cerrarSesion();
  };

  const recuperarPassword = async (correo: string): Promise<void> => {
    await authService.recuperarPassword(correo);
  };

  const cambiarPasswordInicial = async (
    password: string
  ): Promise<void> => {
    await authService.cambiarPasswordInicial(password);
    await refrescarPerfil();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        perfil,
        loading,
        autenticado: Boolean(user && perfil),
        iniciarSesion,
        cerrarSesion,
        recuperarPassword,
        cambiarPasswordInicial,
        refrescarPerfil,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth debe utilizarse dentro de un AuthProvider.'
    );
  }

  return context;
};