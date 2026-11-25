
import { useState, type FormEvent } from 'react';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonLoading,
  IonPage,
  IonText,
  useIonToast,
} from '@ionic/react';
import {
  eye,
  eyeOff,
  lockClosedOutline,
  personOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../../contexts/AuthContext';

import './Login.css';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { iniciarSesion } = useAuth();
  const [presentToast] = useIonToast();

  const [cedula, setCedula] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [procesando, setProcesando] = useState(false);

  const manejarIngreso = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!/^\d{10}$/.test(cedula)) {
      presentToast({
        message: 'Ingresa una cédula válida de 10 dígitos.',
        duration: 2500,
        color: 'warning',
        position: 'top',
      });
      return;
    }

    if (!password.trim()) {
      presentToast({
        message: 'Ingresa tu contraseña.',
        duration: 2500,
        color: 'warning',
        position: 'top',
      });
      return;
    }

    setProcesando(true);

    try {
      await iniciarSesion(cedula, password);
      navigate('/home', { replace: true });
    } catch (error) {
      presentToast({
        message:
          error instanceof Error
            ? error.message
            : 'No se pudo iniciar sesión. Verifica tus datos.',
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
              <IonIcon icon={shieldCheckmarkOutline} />
            </div>

            <IonText>
              <h1>CNE</h1>
              <p>Sistema de Control Electoral</p>
            </IonText>
          </div>

          <div className="login-card">
            <div className="login-heading">
              <h2>Bienvenido</h2>
              <p>Ingresa tus credenciales para continuar.</p>
            </div>

            <form onSubmit={manejarIngreso}>
              <div className="login-field">
                <IonLabel position="stacked">Número de cédula</IonLabel>
                <IonItem lines="none" className="login-input">
                  <IonIcon
                    icon={personOutline}
                    slot="start"
                    aria-hidden="true"
                  />
                  <IonInput
                    value={cedula}
                    placeholder="Ej. 1712345678"
                    type="text"
                    inputmode="numeric"
                    maxlength={10}
                    autocomplete="username"
                    onIonInput={(event) =>
                      setCedula(
                        (event.detail.value ?? '').replace(/\D/g, '').slice(0, 10)
                      )
                    }
                    required
                  />
                </IonItem>
              </div>

              <div className="login-field">
                <IonLabel position="stacked">Contraseña</IonLabel>
                <IonItem lines="none" className="login-input">
                  <IonIcon
                    icon={lockClosedOutline}
                    slot="start"
                    aria-hidden="true"
                  />
                  <IonInput
                    value={password}
                    placeholder="Ingresa tu contraseña"
                    type={mostrarPassword ? 'text' : 'password'}
                    autocomplete="current-password"
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
                    aria-label={
                      mostrarPassword
                        ? 'Ocultar contraseña'
                        : 'Mostrar contraseña'
                    }
                    onClick={() => setMostrarPassword(!mostrarPassword)}
                  >
                    <IonIcon icon={mostrarPassword ? eyeOff : eye} />
                  </IonButton>
                </IonItem>
              </div>

              <div className="login-recovery">
                <button
                  type="button"
                  onClick={() => navigate('/auth/recuperar')}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <IonButton
                expand="block"
                type="submit"
                className="login-submit"
                disabled={procesando}
              >
                Iniciar sesión
              </IonButton>
            </form>
          </div>

          <div className="login-footer">
            <p>Sistema de uso institucional</p>
            <p>Consejo Nacional Electoral · Ecuador</p>
          </div>
        </div>

        <IonLoading
          isOpen={procesando}
          message="Verificando credenciales..."
        />
      </IonContent>
    </IonPage>
  );
};

export default Login;
