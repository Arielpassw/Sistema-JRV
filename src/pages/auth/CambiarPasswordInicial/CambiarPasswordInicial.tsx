
import { useState, type FormEvent } from 'react';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonPage,
  IonText,
  useIonToast,
} from '@ionic/react';
import { eye, eyeOff, lockClosedOutline } from 'ionicons/icons';
import { Navigate, useNavigate } from 'react-router-dom';

import { useAuth } from '../../../contexts/AuthContext';

import '../Login/Login.css';

const CambiarPasswordInicial: React.FC = () => {
  const navigate = useNavigate();

  const {
    perfil,
    loading,
    autenticado,
    cambiarPasswordInicial,
  } = useAuth();

  const [presentToast] = useIonToast();

  const [password, setPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [procesando, setProcesando] = useState(false);

  if (loading) {
    return (
      <IonPage>
        <IonContent className="ion-text-center ion-padding">
          Verificando cuenta...
        </IonContent>
      </IonPage>
    );
  }

  if (!autenticado || !perfil) {
    return <Navigate to="/login" replace />;
  }

  if (!perfil.debe_cambiar_password) {
    return <Navigate to="/home" replace />;
  }

  const manejarCambio = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password.length < 8) {
      presentToast({
        message: 'La contraseña debe tener al menos 8 caracteres.',
        duration: 3000,
        color: 'warning',
        position: 'top',
      });
      return;
    }

    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      presentToast({
        message: 'Incluye al menos una minúscula, una mayúscula y un número.',
        duration: 3500,
        color: 'warning',
        position: 'top',
      });
      return;
    }

    if (password !== confirmacion) {
      presentToast({
        message: 'Las contraseñas no coinciden.',
        duration: 3000,
        color: 'warning',
        position: 'top',
      });
      return;
    }

    setProcesando(true);

    try {
      await cambiarPasswordInicial(password);

      presentToast({
        message: 'Contraseña actualizada correctamente.',
        duration: 3000,
        color: 'success',
        position: 'top',
      });

      navigate('/home', { replace: true });
    } catch (error) {
      presentToast({
        message:
          error instanceof Error
            ? error.message
            : 'No se pudo actualizar la contraseña.',
        duration: 3500,
        color: 'danger',
        position: 'top',
      });
    } finally {
      setProcesando(false);
    }
  };

  return (
    <IonPage>
      <IonContent fullscreen className="login-content">
        <div className="login-container">
          <div className="login-brand">
            <div className="login-logo">
              <IonIcon icon={lockClosedOutline} />
            </div>
            <IonText>
              <h1>CNE</h1>
              <p>Sistema de Control Electoral</p>
            </IonText>
          </div>

          <div className="login-card">
            <div className="login-heading">
              <h2>Cambia tu contraseña</h2>
              <p>
                Por seguridad, debes establecer una nueva contraseña
                antes de continuar.
              </p>
            </div>

            <form onSubmit={manejarCambio}>
              <div className="login-field">
                <IonLabel position="stacked">
                  Nueva contraseña
                </IonLabel>
                <IonItem lines="none" className="login-input">
                  <IonInput
                    value={password}
                    type={mostrarPassword ? 'text' : 'password'}
                    placeholder="Nueva contraseña"
                    autocomplete="new-password"
                    onIonInput={(event) =>
                      setPassword(event.detail.value ?? '')
                    }
                    required
                  />
                  <IonButton
                    fill="clear"
                    color="medium"
                    slot="end"
                    type="button"
                    onClick={() => setMostrarPassword(!mostrarPassword)}
                  >
                    <IonIcon icon={mostrarPassword ? eyeOff : eye} />
                  </IonButton>
                </IonItem>
              </div>

              <div className="login-field">
                <IonLabel position="stacked">
                  Confirmar contraseña
                </IonLabel>
                <IonItem lines="none" className="login-input">
                  <IonInput
                    value={confirmacion}
                    type={mostrarPassword ? 'text' : 'password'}
                    placeholder="Repite la contraseña"
                    autocomplete="new-password"
                    onIonInput={(event) =>
                      setConfirmacion(event.detail.value ?? '')
                    }
                    required
                  />
                </IonItem>
              </div>

              <IonText color="medium">
                <p style={{ fontSize: 12, lineHeight: 1.6 }}>
                  La contraseña debe tener al menos 8 caracteres,
                  una letra mayúscula, una minúscula y un número.
                </p>
              </IonText>

              <IonButton
                expand="block"
                type="submit"
                className="login-submit"
                disabled={procesando}
              >
                {procesando ? 'Actualizando...' : 'Guardar contraseña'}
              </IonButton>
            </form>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default CambiarPasswordInicial;
