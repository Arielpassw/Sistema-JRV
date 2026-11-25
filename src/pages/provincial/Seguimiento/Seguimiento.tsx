import { useMemo, useState } from 'react';

import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonChip,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonProgressBar,
  IonSearchbar,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
  useIonViewWillEnter,
} from '@ionic/react';

import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../../contexts/AuthContext';
import { cantonService } from '../../../services/canton.service';
import { parroquiaService } from '../../../services/parroquia.service';
import { recintoService } from '../../../services/recinto.service';
import { jrvService } from '../../../services/jrv.service';
import { actaService } from '../../../services/acta.service';

import type { Acta, JRV, Recinto } from '../../../models';

import './Seguimiento.css';

interface RecintoSeguimiento {
  recinto: Recinto;
  canton: string;
  parroquia: string;
  jrvs: JRV[];
  actas: Acta[];
  actasEsperadas: number;
  pendientes: number;
  avance: number;
}

const TOTAL_ACTAS_POR_JRV = 2;

const Seguimiento: React.FC = () => {
  const navigate = useNavigate();
  const { perfil } = useAuth();

  const [datos, setDatos] = useState<RecintoSeguimiento[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargarSeguimiento = async () => {
    if (perfil?.rol !== 'coordinador_provincial') {
      setError('No tienes permisos para consultar el seguimiento provincial.');
      setDatos([]);
      setCargando(false);
      return;
    }

    if (!perfil.provincia_id) {
      setError('Tu perfil no tiene una provincia asignada.');
      setDatos([]);
      setCargando(false);
      return;
    }

    try {
      setCargando(true);
      setError('');

      // Obtener los cantones correspondientes a la provincia del usuario.
      const cantones = await cantonService.listarPorProvincia(
        perfil.provincia_id
      );

      // Obtener las parroquias de cada cantón.
      const parroquiasPorCanton = await Promise.all(
        cantones.map(async (canton) => {
          const parroquias = await parroquiaService.listarPorCanton(
            canton.id
          );

          return parroquias.map((parroquia) => ({
            canton: canton.nombre,
            parroquia,
          }));
        })
      );

      const parroquias = parroquiasPorCanton.flat();

      // Obtener los recintos de cada parroquia.
      const recintosPorParroquia = await Promise.all(
        parroquias.map(async (item) => {
          const recintos = await recintoService.listarPorParroquia(
            item.parroquia.id
          );

          return recintos.map((recinto) => ({
            recinto,
            canton: item.canton,
            parroquia: item.parroquia.nombre,
          }));
        })
      );

      const recintosBase = recintosPorParroquia.flat();

      // Consultar las JRV y actas de cada recinto.
      const resultado = await Promise.all(
        recintosBase.map(async (item): Promise<RecintoSeguimiento> => {
          const jrvs = await jrvService.listarPorRecinto(item.recinto.id);

          const actasPorJrv = await Promise.all(
            jrvs.map((jrv) => actaService.listarPorJrv(jrv.id))
          );

          const actas = actasPorJrv.flat();
          const actasEsperadas = jrvs.length * TOTAL_ACTAS_POR_JRV;
          const pendientes = Math.max(actasEsperadas - actas.length, 0);

          const avance =
            actasEsperadas > 0
              ? Math.min(actas.length / actasEsperadas, 1) * 100
              : 0;

          return {
            recinto: item.recinto,
            canton: item.canton,
            parroquia: item.parroquia,
            jrvs,
            actas,
            actasEsperadas,
            pendientes,
            avance,
          };
        })
      );

      resultado.sort((a, b) =>
        a.recinto.nombre.localeCompare(b.recinto.nombre)
      );

      setDatos(resultado);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo cargar el seguimiento provincial.'
      );
      setDatos([]);
    } finally {
      setCargando(false);
    }
  };

  useIonViewWillEnter(() => {
    void cargarSeguimiento();
  });

  const resumen = useMemo(() => {
    const totalRecintos = datos.length;

    const totalJrv = datos.reduce(
      (total, item) => total + item.jrvs.length,
      0
    );

    const totalActasEsperadas = datos.reduce(
      (total, item) => total + item.actasEsperadas,
      0
    );

    const totalActasRegistradas = datos.reduce(
      (total, item) => total + item.actas.length,
      0
    );

    const totalPendientes = Math.max(
      totalActasEsperadas - totalActasRegistradas,
      0
    );

    const avance =
      totalActasEsperadas > 0
        ? Math.min(
          (totalActasRegistradas / totalActasEsperadas) * 100,
          100
        )
        : 0;

    return {
      totalRecintos,
      totalJrv,
      totalActasEsperadas,
      totalActasRegistradas,
      totalPendientes,
      avance,
    };
  }, [datos]);

  const datosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();

    if (!termino) {
      return datos;
    }

    return datos.filter((item) => {
      return (
        item.recinto.nombre.toLowerCase().includes(termino) ||
        (item.recinto.codigo ?? '').toLowerCase().includes(termino) ||
        item.canton.toLowerCase().includes(termino) ||
        item.parroquia.toLowerCase().includes(termino)
      );
    });
  }, [datos, busqueda]);

  const obtenerColorAvance = (
    avance: number
  ): 'success' | 'warning' | 'medium' => {
    if (avance >= 100) return 'success';
    if (avance > 0) return 'warning';
    return 'medium';
  };

  const obtenerColorEstado = (
    estado: string
  ): 'success' | 'warning' | 'danger' | 'medium' => {
    const normalizado = estado.toLowerCase();

    if (normalizado.includes('aprob') || normalizado.includes('valid')) {
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
          <IonButton
            slot="start"
            fill="clear"
            onClick={() => navigate('/home')}
          >
            Volver
          </IonButton>

          <IonTitle>Seguimiento provincial</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding seguimiento-content">
        <section className="seguimiento-intro">
          <h1>Avance electoral provincial</h1>
          <p>
            Consulta el avance del registro de actas en los recintos
            electorales de tu provincia.
          </p>
        </section>

        {cargando && (
          <div className="seguimiento-loading">
            <IonSpinner name="crescent" />
            <p>Consultando recintos, JRV y actas...</p>
          </div>
        )}

        {!cargando && error && (
          <IonCard color="danger">
            <IonCardContent>
              <IonText color="light">
                <p>{error}</p>
              </IonText>

              <IonButton
                color="light"
                fill="outline"
                onClick={() => void cargarSeguimiento()}
              >
                Reintentar
              </IonButton>
            </IonCardContent>
          </IonCard>
        )}

        {!cargando && !error && (
          <>
            <div className="seguimiento-resumen">
              <IonCard className="resumen-card">
                <IonCardContent>
                  <span className="resumen-label">Recintos</span>
                  <strong>{resumen.totalRecintos}</strong>
                  <small>Recintos activos</small>
                </IonCardContent>
              </IonCard>

              <IonCard className="resumen-card">
                <IonCardContent>
                  <span className="resumen-label">JRV</span>
                  <strong>{resumen.totalJrv}</strong>
                  <small>Juntas receptoras</small>
                </IonCardContent>
              </IonCard>

              <IonCard className="resumen-card">
                <IonCardContent>
                  <span className="resumen-label">Actas registradas</span>
                  <strong>{resumen.totalActasRegistradas}</strong>
                  <small>
                    De {resumen.totalActasEsperadas} esperadas
                  </small>
                </IonCardContent>
              </IonCard>

              <IonCard className="resumen-card">
                <IonCardContent>
                  <span className="resumen-label">Actas pendientes</span>
                  <strong>{resumen.totalPendientes}</strong>
                  <small>Por registrar</small>
                </IonCardContent>
              </IonCard>
            </div>

            <IonCard className="avance-card">
              <IonCardContent>
                <div className="avance-encabezado">
                  <div>
                    <h2>Avance general</h2>
                    <p>Registro de actas de la provincia</p>
                  </div>

                  <strong>{resumen.avance.toFixed(1)}%</strong>
                </div>

                <IonProgressBar
                  value={resumen.avance / 100}
                  color={obtenerColorAvance(resumen.avance)}
                />

                <div className="avance-detalle">
                  <span>
                    {resumen.totalActasRegistradas} registradas
                  </span>
                  <span>
                    {resumen.totalPendientes} pendientes
                  </span>
                </div>
              </IonCardContent>
            </IonCard>

            <section className="recintos-seguimiento">
              <div className="seguimiento-seccion-titulo">
                <div>
                  <h2>Detalle por recinto</h2>
                  <p>Consulta el avance de cada recinto electoral.</p>
                </div>

                <IonBadge color="primary">
                  {datos.length} recintos
                </IonBadge>
              </div>

              <IonSearchbar
                value={busqueda}
                onIonInput={(event) =>
                  setBusqueda(event.detail.value ?? '')
                }
                placeholder="Buscar recinto, cantón o parroquia"
                debounce={250}
              />

              {datos.length === 0 && (
                <IonCard>
                  <IonCardContent>
                    No existen recintos activos registrados en tu provincia.
                  </IonCardContent>
                </IonCard>
              )}

              {datos.length > 0 && datosFiltrados.length === 0 && (
                <IonCard>
                  <IonCardContent>
                    No se encontraron recintos con ese criterio de búsqueda.
                  </IonCardContent>
                </IonCard>
              )}

              {datosFiltrados.length > 0 && (
                <IonList inset>
                  {datosFiltrados.map((item) => (
                    <IonItem
                      key={item.recinto.id}
                      lines="full"
                      className="recinto-seguimiento-item"
                    >
                      <IonLabel className="ion-text-wrap">
                        <div className="recinto-seguimiento-titulo">
                          <h2>{item.recinto.nombre}</h2>

                          <IonBadge
                            color={obtenerColorAvance(item.avance)}
                          >
                            {item.avance.toFixed(0)}%
                          </IonBadge>
                        </div>

                        <p>
                          Cantón: {item.canton} · Parroquia:{' '}
                          {item.parroquia}
                        </p>

                        <p>
                          Código: {item.recinto.codigo || 'No registrado'}
                        </p>

                        <div className="recinto-seguimiento-datos">
                          <IonChip color="primary">
                            {item.jrvs.length} JRV
                          </IonChip>

                          <IonChip color="success">
                            {item.actas.length} actas registradas
                          </IonChip>

                          <IonChip color="warning">
                            {item.pendientes} pendientes
                          </IonChip>
                        </div>

                        <IonProgressBar
                          value={item.avance / 100}
                          color={obtenerColorAvance(item.avance)}
                        />

                        <p className="recinto-progreso-texto">
                          {item.actas.length} de {item.actasEsperadas}{' '}
                          actas registradas
                        </p>

                        {item.actas.length > 0 && (
                          <div className="actas-registradas">
                            <strong>Actas:</strong>

                            <div className="actas-chips">
                              {item.actas.map((acta) => (
                                <IonChip
                                  key={acta.id}
                                  color={obtenerColorEstado(acta.estado)}
                                >
                                  <IonLabel>
                                    {acta.dignidad} · {acta.estado}
                                  </IonLabel>
                                </IonChip>
                              ))}
                            </div>
                          </div>
                        )}
                      </IonLabel>
                    </IonItem>
                  ))}
                </IonList>
              )}
            </section>
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default Seguimiento;