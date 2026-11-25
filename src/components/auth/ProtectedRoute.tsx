
import {
  IonContent,
  IonPage,
  IonSpinner,
  IonText,
} from '@ionic/react';
import { Navigate } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { loading, autenticado, perfil } = useAuth();

  if (loading) {
    return (
      <IonPage>
        <IonContent className="ion-text-center ion-padding">
          <IonSpinner name="crescent" />
          <IonText>
            <p>Verificando acceso...</p>
          </IonText>
        </IonContent>
      </IonPage>
    );
  }

  if (!autenticado || !perfil) {
    return <Navigate to="/login" replace />;
  }

  if (perfil.debe_cambiar_password) {
    return <Navigate to="/auth/cambiar-password" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
