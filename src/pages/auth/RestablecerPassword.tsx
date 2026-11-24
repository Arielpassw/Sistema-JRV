
import {
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonPage,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/react';

import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { supabase } from '../../config/supabase';
import { authService } from '../../services/auth.service';

const RestablecerPassword: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [password, setPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [validando, setValidando] = useState(true);
  const [sesionValida, setSesionValida] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    const estado = location.state as
      | { recoveryError?: string }
      | null;

    if (estado?.recoveryError) {
      setError(estado.recoveryError);
      setValidando(false);
      return;
    }

    const comprobarSesion = async () => {
      const { data, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError || !data.session) {
        setSesionValida(false);
      } else {
        setSesionValida(true);
      }

      setValidando(false);
    };

    void comprobarSesion();
  }, [location.state]);

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError('');
    setMensaje('');

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (password !== confirmacion) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setProcesando(true);

    try {
      await authService.actualizarPassword(password);

      setMensaje('Tu contraseña se actualizó correctamente.');

      setTimeout(() => {
        navigate('/home', { replace: true });
      }, 1200);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo actualizar la contraseña.'
      );
    } finally {
      setProcesando(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Restablecer contraseña</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {validando ? (
          <IonText>
            <p>Verificando enlace de recuperación...</p>
          </IonText>
        ) : !sesionValida ? (
          <>
            <IonText color="danger">
              <h2>No se pudo validar el enlace</h2>
              <p>
                {error ||
                  'El enlace ha expirado o no es válido. Solicita uno nuevo.'}
              </p>
            </IonText>

            <IonButton
              expand="block"
              onClick={() => navigate('/home', { replace: true })}
            >
              Volver al inicio
            </IonButton>
          </>
        ) : (
          <>
            <IonText>
              <h2>Establece tu nueva contraseña</h2>
              <p>
                Ingresa una contraseña segura de al menos 8 caracteres.
              </p>
            </IonText>

            <form onSubmit={handleSubmit}>
              <IonItem>
                <IonLabel position="stacked">
                  Nueva contraseña
                </IonLabel>
                <IonInput
                  type="password"
                  value={password}
                  onIonInput={(event) =>
                    setPassword(event.detail.value ?? '')
                  }
                  autocomplete="new-password"
                  required
                />
              </IonItem>

              <IonItem>
                <IonLabel position="stacked">
                  Confirmar contraseña
                </IonLabel>
                <IonInput
                  type="password"
                  value={confirmacion}
                  onIonInput={(event) =>
                    setConfirmacion(event.detail.value ?? '')
                  }
                  autocomplete="new-password"
                  required
                />
              </IonItem>

              {error && (
                <IonText color="danger">
                  <p>{error}</p>
                </IonText>
              )}

              {mensaje && (
                <IonText color="success">
                  <p>{mensaje}</p>
                </IonText>
              )}

              <IonButton
                className="ion-margin-top"
                expand="block"
                type="submit"
                disabled={procesando}
              >
                {procesando
                  ? 'Actualizando...'
                  : 'Guardar nueva contraseña'}
              </IonButton>
            </form>
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default RestablecerPassword;
