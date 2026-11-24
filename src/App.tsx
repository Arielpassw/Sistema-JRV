
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
import RestablecerPassword from './pages/auth/RestablecerPassword';
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
      } catch (err) {
        const mensaje =
          err instanceof Error
            ? err.message
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
        if (
          window.location.pathname === '/auth/restablecer'
        ) {
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
          path="/auth/restablecer"
          element={<RestablecerPassword />}
        />

        <Route
          path="/home"
          element={<Home />}
        />

        <Route
          path="/"
          element={<Navigate to="/home" replace />}
        />
      </IonRouterOutlet>
    </IonReactRouter>
  </IonApp>
);

export default App;
