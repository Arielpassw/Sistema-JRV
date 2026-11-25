
import { useState, type FormEvent } from 'react';
import {
  IonButton,
  IonContent,
  IonInput,
  IonItem,
  IonLabel,
  IonPage,
  IonText,
  useIonToast,
} from '@ionic/react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../../contexts/AuthContext';

const RecuperarPassword: React.FC = () => {
  const navigate = useNavigate();
  const { recuperarPassword } = useAuth();
  const [presentToast] = useIonToast();

  const [correo, setCorreo] = useState('');
  const [procesando, setProcesando] = useState(false);

  const manejarRecuperacion = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const correoNormalizado = correo.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoNormalizado)) {
      presentToast({
        message: 'Ingresa un correo electrónico válido.',
        duration: 2500,
        color: 'warning',
        position: 'top',
      });
      return;
    }

    setProcesando(true);

    try {
      await recuperarPassword(correoNormalizado);

      presentToast({
        message: 'Si el correo está registrado, recibirás instrucciones para recuperar tu contraseña.',
        duration: 4500,
        color: 'success',
        position: 'top',
      });

      navigate('/login', { replace: true });
    } catch (error) {
      presentToast({
        message:
          error instanceof Error
            ? error.message
            : 'No se pudo solicitar la recuperación.',
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
              <span style={{ fontSize: 34 }}>CNE</span>
            </div>
            <IonText>
              <h1>CNE</h1>
              <p>Sistema de Control Electoral</p>
            </IonText>
          </div>

          <div className="login-card">
            <div className="login-heading">
              <h2>Recuperar contraseña</h2>
              <p>
                Escribe el correo electrónico asociado a tu cuenta.
                Te enviaremos las instrucciones para restablecer tu contraseña.
              </p>
            </div>

            <form onSubmit={manejarRecuperacion}>
              <div className="login-field">
                <IonLabel position="stacked">
                  Correo electrónico
                </IonLabel>
                <IonItem lines="none" className="login-input">
                  <IonInput
                    type="email"
                    value={correo}
                    placeholder="usuario@correo.com"
                    autocomplete="email"
                    onIonInput={(event) =>
                      setCorreo(event.detail.value ?? '')
                    }
                    required
                  />
                </IonItem>
              </div>

              <IonButton
                expand="block"
                type="submit"
                className="login-submit"
                disabled={procesando}
              >
                {procesando ? 'Enviando...' : 'Enviar instrucciones'}
              </IonButton>

              <IonButton
                expand="block"
                fill="clear"
                color="medium"
                type="button"
                onClick={() => navigate('/login')}
              >
                Volver al inicio de sesión
              </IonButton>
            </form>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default RecuperarPassword;
