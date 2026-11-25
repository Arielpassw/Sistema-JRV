
import { useEffect, useRef } from 'react';

import {
  IonApp,
  IonRouterOutlet,
  setupIonicReact,
} from '@ionic/react';

import { IonReactRouter } from '@ionic/react-router';

import {
  Navigate,
  Route,
  useNavigate,
} from 'react-router-dom';

import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

import Home from './pages/Home';

//imports del frontend
import Login from './pages/auth/Login/Login';
import RecuperarPassword from './pages/auth/RecuperarPassword/RecuperarPassword';
import RestablecerPassword from './pages/auth/RestablecerPassword';
import CambiarPasswordInicial from './pages/auth/CambiarPasswordInicial/CambiarPasswordInicial';
import Recintos from './pages/provincial/Recintos';
import Coordinadores from './pages/provincial/Coordinadores';
import JRVPage from './pages/recinto/JRV';
import Veedores from './pages/recinto/Veedores';
import MisJRV from './pages/veedor/MisJRV';
import MisActas from './pages/veedor/MisActas';
import RegistrarActa from './pages/veedor/RegistrarActa';
import DetalleActa from './pages/veedor/DetalleActa';
import SeguimientoProvincial from './pages/provincial/Seguimiento/Seguimiento';
import SeguimientoRecinto from './pages/recinto/Seguimiento/Seguimiento';
import Resultados from './pages/provincial/Resultados/Resultados';
import ActasRecinto from './pages/recinto/Actas';
import DetalleActaRecinto from './pages/recinto/DetalleActa';


import ProtectedRoute from './components/auth/ProtectedRoute';

import { authService } from './services/auth.service';

import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';
import '@ionic/react/css/palettes/dark.system.css';

import './theme/variables.css';

setupIonicReact();

const DeepLinkHandler: React.FC = () => {
  const navigate = useNavigate();
  const enlacesProcesados = useRef<Set<string>>(new Set());

  useEffect(() => {
    let activo = true;

    let listener:
      | { remove: () => Promise<void> }
      | undefined;

    const procesarEnlace = async (url: string) => {
      if (!activo || enlacesProcesados.current.has(url)) {
        return;
      }

      let enlace: URL;

      try {
        enlace = new URL(url);
      } catch {
        return;
      }

      const esAndroid =
        enlace.protocol === 'ec.cnecontrol:' &&
        enlace.hostname === 'auth' &&
        enlace.pathname === '/restablecer';

      const esWeb =
        enlace.pathname === '/auth/restablecer';

      if (!esAndroid && !esWeb) {
        return;
      }

      enlacesProcesados.current.add(url);

      try {
        await authService.procesarEnlaceRecuperacion(url);

        if (activo) {
          navigate('/auth/restablecer', {
            replace: true,
            state: null,
          });
        }
      } catch (error) {
        const mensaje =
          error instanceof Error
            ? error.message
            : 'No se pudo procesar el enlace de recuperación.';

        if (activo) {
          navigate('/auth/restablecer', {
            replace: true,
            state: {
              recoveryError: mensaje,
            },
          });
        }
      }
    };

    const iniciarListener = async () => {
      if (!Capacitor.isNativePlatform()) {
        if (window.location.pathname === '/auth/restablecer') {
          await procesarEnlace(window.location.href);
        }

        return;
      }

      listener = await CapacitorApp.addListener(
        'appUrlOpen',
        ({ url }) => {
          void procesarEnlace(url);
        }
      );

      if (!activo) {
        await listener.remove();
        return;
      }

      const lanzamiento = await CapacitorApp.getLaunchUrl();

      if (lanzamiento?.url) {
        await procesarEnlace(lanzamiento.url);
      }
    };

    void iniciarListener();

    return () => {
      activo = false;

      if (listener) {
        void listener.remove();
      }
    };
  }, [navigate]);

  return null;
};

const App: React.FC = () => (
  <IonApp>
    <IonReactRouter>
      <DeepLinkHandler />

      <IonRouterOutlet>
        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/auth/recuperar"
          element={<RecuperarPassword />}
        />

        <Route
          path="/auth/restablecer"
          element={<RestablecerPassword />}
        />

        <Route
          path="/auth/cambiar-password"
          element={<CambiarPasswordInicial />}
        />

        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />

        <Route
          path="/provincia/recintos"
          element={
            <ProtectedRoute>
              <Recintos />
            </ProtectedRoute>
          }
        />

        <Route
          path="/provincia/coordinadores"
          element={
            <ProtectedRoute>
              <Coordinadores />
            </ProtectedRoute>
          }
        />

        <Route
          path="/provincia/seguimiento"
          element={
            <ProtectedRoute>
              <SeguimientoProvincial />
            </ProtectedRoute>
          }
        />

        <Route
          path="/provincia/resultados"
          element={
            <ProtectedRoute>
              <Resultados />
            </ProtectedRoute>
          }
        />

        <Route
          path="/recinto/jrv"
          element={
            <ProtectedRoute>
              <JRVPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/recinto/veedores"
          element={
            <ProtectedRoute>
              <Veedores />
            </ProtectedRoute>
          }
        />

        <Route
          path="/recinto/seguimiento"
          element={
            <ProtectedRoute>
              <SeguimientoRecinto />
            </ProtectedRoute>
          }
        />

        <Route
          path="/veedor/mis-jrv"
          element={
            <ProtectedRoute>
              <MisJRV />
            </ProtectedRoute>
          }
        />

        <Route
          path="/veedor/actas"
          element={
            <ProtectedRoute>
              <MisActas />
            </ProtectedRoute>
          }
        />

        <Route
          path="/veedor/registrar-acta"
          element={
            <ProtectedRoute>
              <RegistrarActa />
            </ProtectedRoute>
          }
        />

        <Route
          path="/veedor/actas/:actaId"
          element={
            <ProtectedRoute>
              <DetalleActa />
            </ProtectedRoute>
          }
        />

        <Route
          path="/recinto/actas"
          element={
            <ProtectedRoute>
              <ActasRecinto />
            </ProtectedRoute>
          }
        />

        <Route
          path="/recinto/actas/:actaId"
          element={
            <ProtectedRoute>
              <DetalleActaRecinto />
            </ProtectedRoute>
          }
        />

        <Route
          path="/"
          element={<Navigate to="/login" replace />}
        />
      </IonRouterOutlet>
    </IonReactRouter>
  </IonApp>
);

export default App;
