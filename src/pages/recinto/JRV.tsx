
import { useCallback, useEffect, useState } from 'react';
import {
  IonBackButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { useAuth } from '../../contexts/AuthContext';
import type { JRV, Recinto } from '../../models';
import { asignacionService } from '../../services/asignacion.service';
import { recintoService } from '../../services/recinto.service';
import { jrvService } from '../../services/jrv.service';

const JRVPage: React.FC = () => {
  const { perfil } = useAuth();

  const [recinto, setRecinto] = useState<Recinto | null>(null);
  const [jrv, setJrv] = useState<JRV[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargarDatos = useCallback(async () => {
    if (!perfil?.id) {
      setError('No se pudo identificar tu perfil.');
      setCargando(false);
      return;
    }

    try {
      setCargando(true);
      setError('');

      const asignaciones = await asignacionService.listarPorPerfil(perfil.id);
      const asignacionRecinto = asignaciones.find(
        (item) =>
          item.activa &&
          item.tipo_asignacion === 'recinto' &&
          item.recinto_id
      );

      if (!asignacionRecinto?.recinto_id) {
        setRecinto(null);
        setJrv([]);
        setError('No tienes un recinto activo asignado.');
        return;
      }

      const recintoAsignado = await recintoService.obtenerPorId(
        asignacionRecinto.recinto_id
      );

      if (!recintoAsignado) {
        setRecinto(null);
        setJrv([]);
        setError('No se encontró la información de tu recinto.');
        return;
      }

      setRecinto(recintoAsignado);

      const mesas = await jrvService.listarPorRecinto(recintoAsignado.id);
      setJrv(mesas);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo cargar la información del recinto.'
      );
    } finally {
      setCargando(false);
    }
  }, [perfil?.id]);

  useEffect(() => {
    void cargarDatos();
  }, [cargarDatos]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" />
          </IonButtons>
          <IonTitle>Mis JRV</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {cargando ? (
          <div className="ion-text-center ion-padding">
            <IonSpinner name="crescent" />
            <p>Cargando tus mesas electorales...</p>
          </div>
        ) : error ? (
          <IonCard>
            <IonCardContent>
              <IonText color="danger">
                <p>{error}</p>
              </IonText>
            </IonCardContent>
          </IonCard>
        ) : (
          <>
            <IonCard>
              <IonCardHeader>
                <IonCardTitle>Mi recinto</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <h2>{recinto?.nombre}</h2>
                <p>{recinto?.direccion || 'Dirección no registrada'}</p>
                <p>JRV asignadas: {jrv.length}</p>
              </IonCardContent>
            </IonCard>

            <IonCard>
              <IonCardHeader>
                <IonCardTitle>Juntas Receptoras del Voto</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                {jrv.length === 0 ? (
                  <IonText color="medium">
                    <p>Este recinto todavía no tiene JRV registradas.</p>
                  </IonText>
                ) : (
                  <IonList>
                    {jrv.map((mesa) => (
                      <IonItem key={mesa.id}>
                        <IonLabel>
                          <h2>JRV {mesa.numero}</h2>
                          <p>Electores: {mesa.total_electores}</p>
                          <p>Estado: {mesa.estado}</p>
                        </IonLabel>
                      </IonItem>
                    ))}
                  </IonList>
                )}
              </IonCardContent>
            </IonCard>
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default JRVPage;
