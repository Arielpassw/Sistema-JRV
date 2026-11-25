
import { useCallback, useState } from 'react';
import {
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
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
  useIonViewWillEnter,
} from '@ionic/react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';
import type { Acta, JRV, Recinto } from '../../models';

import { asignacionService } from '../../services/asignacion.service';
import { recintoService } from '../../services/recinto.service';
import { jrvService } from '../../services/jrv.service';
import { actaService } from '../../services/acta.service';

interface ActaRecinto {
  acta: Acta;
  jrv: JRV;
}

const ActasRecinto: React.FC = () => {
  const { perfil } = useAuth();
  const navigate = useNavigate();

  const [recinto, setRecinto] = useState<Recinto | null>(null);
  const [actas, setActas] = useState<ActaRecinto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargarActas = useCallback(async () => {
    if (!perfil?.id) {
      setError('No se pudo identificar tu perfil.');
      setCargando(false);
      return;
    }

    if (perfil.rol !== 'coordinador_recinto') {
      setError('No tienes permisos para consultar las actas del recinto.');
      setCargando(false);
      return;
    }

    try {
      setCargando(true);
      setError('');

      // Obtener el recinto asignado al coordinador.
      const asignaciones = await asignacionService.listarPorPerfil(
        perfil.id
      );

      const asignacionRecinto = asignaciones.find(
        (item) =>
          item.activa &&
          item.tipo_asignacion === 'recinto' &&
          item.recinto_id
      );

      if (!asignacionRecinto?.recinto_id) {
        setRecinto(null);
        setActas([]);
        setError('No tienes un recinto activo asignado.');
        return;
      }

      const recintoAsignado = await recintoService.obtenerPorId(
        asignacionRecinto.recinto_id
      );

      if (!recintoAsignado) {
        setRecinto(null);
        setActas([]);
        setError('No se encontró la información de tu recinto.');
        return;
      }

      setRecinto(recintoAsignado);

      // Consultar todas las JRV del recinto.
      const mesas = await jrvService.listarPorRecinto(
        recintoAsignado.id
      );

      // Consultar las actas de cada JRV.
      const resultados = await Promise.all(
        mesas.map(async (mesa): Promise<ActaRecinto[]> => {
          const actasJrv = await actaService.listarPorJrv(mesa.id);

          return actasJrv.map((acta) => ({
            acta,
            jrv: mesa,
          }));
        })
      );

      const todasLasActas = resultados
        .flat()
        .sort((a, b) => {
          const fechaA = a.acta.fecha_registro
            ? new Date(a.acta.fecha_registro).getTime()
            : 0;

          const fechaB = b.acta.fecha_registro
            ? new Date(b.acta.fecha_registro).getTime()
            : 0;

          return fechaB - fechaA;
        });

      setActas(todasLasActas);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar las actas del recinto.'
      );
      setActas([]);
    } finally {
      setCargando(false);
    }
  }, [perfil?.id, perfil?.rol]);

  useIonViewWillEnter(() => {
    void cargarActas();
  });

  const formatoFecha = (fecha: string | null) => {
    if (!fecha) return 'No registrada';

    return new Date(fecha).toLocaleString('es-EC', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const obtenerColorEstado = (
    estado: string
  ): 'success' | 'warning' | 'danger' | 'medium' => {
    const normalizado = estado.toLowerCase();

    if (
      normalizado.includes('aprob') ||
      normalizado.includes('valid')
    ) {
      return 'success';
    }

    if (
      normalizado.includes('observ') ||
      normalizado.includes('revis')
    ) {
      return 'warning';
    }

    if (
      normalizado.includes('rechaz') ||
      normalizado.includes('error')
    ) {
      return 'danger';
    }

    return 'medium';
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" />
          </IonButtons>

          <IonTitle>Actas del recinto</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {cargando ? (
          <div className="ion-text-center ion-padding">
            <IonSpinner name="crescent" />
            <p>Cargando actas del recinto...</p>
          </div>
        ) : error ? (
          <IonCard color="danger">
            <IonCardContent>
              <IonText color="light">
                <p>{error}</p>
              </IonText>

              <IonButton
                color="light"
                fill="outline"
                onClick={() => void cargarActas()}
              >
                Reintentar
              </IonButton>
            </IonCardContent>
          </IonCard>
        ) : (
          <>
            <IonCard>
              <IonCardContent>
                <IonText color="medium">
                  <p>RECINTO ASIGNADO</p>
                </IonText>

                <h2>{recinto?.nombre}</h2>

                <p>
                  {recinto?.direccion || 'Dirección no registrada'}
                </p>

                <p>
                  <strong>Actas registradas:</strong> {actas.length}
                </p>
              </IonCardContent>
            </IonCard>

            <div className="ion-padding-vertical">
              <h2>Actas registradas</h2>
              <p>
                Consulta y corrige los datos y fotografías de las actas
                correspondientes a las JRV de tu recinto.
              </p>
            </div>

            {actas.length === 0 ? (
              <IonCard>
                <IonCardContent>
                  <IonText color="medium">
                    <p>
                      Todavía no existen actas registradas en las JRV
                      de este recinto.
                    </p>
                  </IonText>
                </IonCardContent>
              </IonCard>
            ) : (
              <IonList inset>
                {actas.map(({ acta, jrv }) => (
                  <IonItem
                    key={acta.id}
                    lines="full"
                    className="ion-padding-vertical"
                  >
                    <IonLabel className="ion-text-wrap">
                      <h2>
                        {acta.dignidad} · JRV {jrv.numero}
                      </h2>

                      <p>
                        Registrada: {formatoFecha(acta.fecha_registro)}
                      </p>

                      <p>
                        Sufragantes: {acta.total_sufragantes}
                      </p>

                      <p>
                        Fotografía:{' '}
                        {acta.foto_url
                          ? 'Registrada'
                          : 'No disponible'}
                      </p>

                      <div className="ion-padding-top">
                        <IonBadge
                          color={obtenerColorEstado(acta.estado)}
                        >
                          {acta.estado}
                        </IonBadge>
                      </div>

                      <IonButton
                        size="small"
                        className="ion-margin-top"
                        onClick={() =>
                          navigate(`/recinto/actas/${acta.id}`)
                        }
                      >
                        Consultar y corregir
                      </IonButton>
                    </IonLabel>
                  </IonItem>
                ))}
              </IonList>
            )}

            <IonButton
              expand="block"
              fill="outline"
              onClick={() => void cargarActas()}
              disabled={cargando}
            >
              Actualizar listado
            </IonButton>
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default ActasRecinto;
