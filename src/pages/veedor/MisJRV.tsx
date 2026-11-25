
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
import { jrvService } from '../../services/jrv.service';
import { recintoService } from '../../services/recinto.service';

interface JRVAsignada {
  jrv: JRV;
  recinto: Recinto;
}

const MisJRV: React.FC = () => {
  const { perfil } = useAuth();

  const [mesas, setMesas] = useState<JRVAsignada[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargarMesas = useCallback(async () => {
    if (!perfil?.id) {
      setError('No se pudo identificar tu perfil.');
      setCargando(false);
      return;
    }

    try {
      setCargando(true);
      setError('');

      const asignaciones = await asignacionService.listarPorPerfil(
        perfil.id
      );

      const asignacionesActivas = asignaciones.filter(
        (asignacion) =>
          asignacion.activa &&
          asignacion.tipo_asignacion === 'jrv' &&
          asignacion.jrv_id
      );

      const resultados = await Promise.all(
        asignacionesActivas.map(async (asignacion) => {
          const mesa = await jrvService.obtenerPorId(
            asignacion.jrv_id!
          );

          if (!mesa) {
            return null;
          }

          const recinto = await recintoService.obtenerPorId(
            mesa.recinto_id
          );

          if (!recinto) {
            return null;
          }

          return {
            jrv: mesa,
            recinto,
          };
        })
      );

      setMesas(
        resultados.filter(
          (resultado): resultado is JRVAsignada =>
            resultado !== null
        )
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar tus JRV.'
      );
    } finally {
      setCargando(false);
    }
  }, [perfil?.id]);

  useEffect(() => {
    void cargarMesas();
  }, [cargarMesas]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" />
          </IonButtons>
          <IonTitle>Mis JRV asignadas</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonText color="medium">
          <p>
            Consulta las Juntas Receptoras del Voto que tienes asignadas.
          </p>
        </IonText>

        {cargando ? (
          <div className="ion-text-center ion-padding">
            <IonSpinner name="crescent" />
            <p>Cargando tus asignaciones...</p>
          </div>
        ) : error ? (
          <IonCard>
            <IonCardContent>
              <IonText color="danger">
                <p>{error}</p>
              </IonText>
            </IonCardContent>
          </IonCard>
        ) : mesas.length === 0 ? (
          <IonCard>
            <IonCardContent>
              <IonText color="medium">
                <p>No tienes JRV activas asignadas.</p>
              </IonText>
            </IonCardContent>
          </IonCard>
        ) : (
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>
                Mis juntas ({mesas.length})
              </IonCardTitle>
            </IonCardHeader>

            <IonCardContent>
              <IonList>
                {mesas.map(({ jrv, recinto }) => (
                  <IonItem key={jrv.id}>
                    <IonLabel className="ion-text-wrap">
                      <h2>JRV {jrv.numero}</h2>
                      <p>Recinto: {recinto.nombre}</p>
                      <p>Electores: {jrv.total_electores}</p>
                      <p>Estado: {jrv.estado}</p>
                    </IonLabel>
                  </IonItem>
                ))}
              </IonList>
            </IonCardContent>
          </IonCard>
        )}

        <IonText color="medium">
          <p className="ion-text-center">
            Total de JRV asignadas: {mesas.length}
          </p>
        </IonText>
      </IonContent>
    </IonPage>
  );
};

export default MisJRV;
