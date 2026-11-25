import { useCallback, useMemo, useState } from 'react';

import {
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
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
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
  useIonViewWillEnter,
} from '@ionic/react';

import { useAuth } from '../../../contexts/AuthContext';

import type { Acta, JRV, Perfil, Recinto } from '../../../models';

import { asignacionService } from '../../../services/asignacion.service';
import { jrvService } from '../../../services/jrv.service';
import { perfilService } from '../../../services/perfil.service';
import { recintoService } from '../../../services/recinto.service';
import { actaService } from '../../../services/acta.service';

import './Seguimiento.css';

interface VeedorAsignado {
  perfil: Perfil;
}

interface JRVSeguimiento {
  jrv: JRV;
  actas: Acta[];
  veedores: VeedorAsignado[];
  actasEsperadas: number;
  pendientes: number;
  avance: number;
}

const TOTAL_ACTAS_POR_JRV = 2;

const SeguimientoRecinto: React.FC = () => {
  const { perfil: perfilActual } = useAuth();

  const [recinto, setRecinto] = useState<Recinto | null>(null);
  const [datos, setDatos] = useState<JRVSeguimiento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargarDatos = useCallback(async () => {
    if (!perfilActual?.id) {
      setError('No se pudo identificar tu perfil.');
      setCargando(false);
      return;
    }

    if (perfilActual.rol !== 'coordinador_recinto') {
      setError('No tienes permisos para consultar el seguimiento del recinto.');
      setCargando(false);
      return;
    }

    try {
      setCargando(true);
      setError('');

      // Obtener el recinto asignado al coordinador.
      const asignacionesPerfil = await asignacionService.listarPorPerfil(
        perfilActual.id
      );

      const asignacionRecinto = asignacionesPerfil.find(
        (asignacion) =>
          asignacion.activa &&
          asignacion.tipo_asignacion === 'recinto' &&
          asignacion.recinto_id
      );

      if (!asignacionRecinto?.recinto_id) {
        setRecinto(null);
        setDatos([]);
        setError('No tienes un recinto activo asignado.');
        return;
      }

      const recintoAsignado = await recintoService.obtenerPorId(
        asignacionRecinto.recinto_id
      );

      if (!recintoAsignado) {
        setRecinto(null);
        setDatos([]);
        setError('No se encontró la información de tu recinto.');
        return;
      }

      setRecinto(recintoAsignado);

      // Obtener las JRV del recinto asignado.
      const mesas = await jrvService.listarPorRecinto(recintoAsignado.id);

      // Consultar actas y veedores de cada JRV.
      const seguimientoPorJrv = await Promise.all(
        mesas.map(async (mesa): Promise<JRVSeguimiento> => {
          const [actas, asignaciones] = await Promise.all([
            actaService.listarPorJrv(mesa.id),
            asignacionService.listarPorJrv(mesa.id),
          ]);

          const asignacionesVeedores = asignaciones.filter(
            (asignacion) =>
              asignacion.activa &&
              asignacion.tipo_asignacion === 'jrv' &&
              asignacion.jrv_id === mesa.id
          );

          const perfilesVeedores = await Promise.all(
            asignacionesVeedores.map(async (asignacion) => {
              const perfil = await perfilService.obtenerPorId(
                asignacion.perfil_id
              );

              if (
                !perfil ||
                !perfil.activo ||
                perfil.rol !== 'veedor_mesa'
              ) {
                return null;
              }

              return { perfil };
            })
          );

          const veedores = perfilesVeedores.filter(
            (item): item is VeedorAsignado => item !== null
          );

          const actasEsperadas = TOTAL_ACTAS_POR_JRV;
          const pendientes = Math.max(
            actasEsperadas - actas.length,
            0
          );

          const avance =
            actasEsperadas > 0
              ? Math.min((actas.length / actasEsperadas) * 100, 100)
              : 0;

          return {
            jrv: mesa,
            actas,
            veedores,
            actasEsperadas,
            pendientes,
            avance,
          };
        })
      );

      seguimientoPorJrv.sort(
        (a, b) => a.jrv.numero - b.jrv.numero
      );

      setDatos(seguimientoPorJrv);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo cargar el seguimiento del recinto.'
      );
      setDatos([]);
    } finally {
      setCargando(false);
    }
  }, [perfilActual?.id, perfilActual?.rol]);

  useIonViewWillEnter(() => {
    void cargarDatos();
  });

  const resumen = useMemo(() => {
    const totalJrv = datos.length;

    const totalActas = datos.reduce(
      (total, item) => total + item.actas.length,
      0
    );

    const totalEsperadas = datos.reduce(
      (total, item) => total + item.actasEsperadas,
      0
    );

    const totalPendientes = Math.max(
      totalEsperadas - totalActas,
      0
    );

    const veedoresUnicos = new Set(
      datos.flatMap((item) =>
        item.veedores.map((veedor) => veedor.perfil.id)
      )
    );

    const totalVeedores = veedoresUnicos.size;

    const avance =
      totalEsperadas > 0
        ? Math.min((totalActas / totalEsperadas) * 100, 100)
        : 0;

    const jrvsCompletas = datos.filter(
      (item) => item.actas.length >= item.actasEsperadas
    ).length;

    return {
      totalJrv,
      totalActas,
      totalEsperadas,
      totalPendientes,
      totalVeedores,
      avance,
      jrvsCompletas,
    };
  }, [datos]);

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

          <IonTitle>Seguimiento del recinto</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding seguimiento-recinto-content">
        <section className="seguimiento-recinto-intro">
          <h1>Avance de mi recinto</h1>
          <p>
            Supervisa el registro de actas y las asignaciones de veedores
            en tus Juntas Receptoras del Voto.
          </p>
        </section>

        {cargando && (
          <div className="seguimiento-recinto-loading">
            <IonSpinner name="crescent" />
            <p>Cargando información del recinto...</p>
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
                onClick={() => void cargarDatos()}
              >
                Reintentar
              </IonButton>
            </IonCardContent>
          </IonCard>
        )}

        {!cargando && !error && recinto && (
          <>
            <IonCard className="recinto-info-card">
              <IonCardContent>
                <span className="recinto-info-label">RECINTO ASIGNADO</span>
                <h2>{recinto.nombre}</h2>
                <p>
                  {recinto.direccion || 'Dirección no registrada'}
                </p>
                <p>
                  Código: {recinto.codigo || 'No registrado'}
                </p>
              </IonCardContent>
            </IonCard>

            <div className="seguimiento-recinto-resumen">
              <IonCard>
                <IonCardContent>
                  <span>JRV</span>
                  <strong>{resumen.totalJrv}</strong>
                  <small>Juntas receptoras</small>
                </IonCardContent>
              </IonCard>

              <IonCard>
                <IonCardContent>
                  <span>Veedores</span>
                  <strong>{resumen.totalVeedores}</strong>
                  <small>Asignados activamente</small>
                </IonCardContent>
              </IonCard>

              <IonCard>
                <IonCardContent>
                  <span>Actas registradas</span>
                  <strong>{resumen.totalActas}</strong>
                  <small>De {resumen.totalEsperadas} esperadas</small>
                </IonCardContent>
              </IonCard>

              <IonCard>
                <IonCardContent>
                  <span>Actas pendientes</span>
                  <strong>{resumen.totalPendientes}</strong>
                  <small>Por registrar</small>
                </IonCardContent>
              </IonCard>
            </div>

            <IonCard className="seguimiento-recinto-avance">
              <IonCardContent>
                <div className="seguimiento-recinto-avance-header">
                  <div>
                    <h2>Avance general</h2>
                    <p>Registro de actas del recinto</p>
                  </div>

                  <strong>{resumen.avance.toFixed(1)}%</strong>
                </div>

                <IonProgressBar
                  value={resumen.avance / 100}
                  color={obtenerColorAvance(resumen.avance)}
                />

                <div className="seguimiento-recinto-avance-detalle">
                  <span>
                    {resumen.jrvsCompletas} de {resumen.totalJrv} JRV
                    completas
                  </span>
                  <span>
                    {resumen.totalPendientes} actas pendientes
                  </span>
                </div>
              </IonCardContent>
            </IonCard>

            <section className="seguimiento-jrv-section">
              <div className="seguimiento-jrv-heading">
                <div>
                  <h2>Detalle por JRV</h2>
                  <p>Estado de actas y veedores asignados.</p>
                </div>

                <IonBadge color="primary">
                  {datos.length} JRV
                </IonBadge>
              </div>

              {datos.length === 0 ? (
                <IonCard>
                  <IonCardContent>
                    <IonText color="medium">
                      <p>
                        Este recinto todavía no tiene JRV registradas.
                      </p>
                    </IonText>
                  </IonCardContent>
                </IonCard>
              ) : (
                <IonList inset>
                  {datos.map((item) => (
                    <IonItem
                      key={item.jrv.id}
                      lines="full"
                      className="seguimiento-jrv-item"
                    >
                      <IonLabel className="ion-text-wrap">
                        <div className="seguimiento-jrv-title">
                          <h2>JRV {item.jrv.numero}</h2>

                          <IonBadge
                            color={obtenerColorAvance(item.avance)}
                          >
                            {item.avance.toFixed(0)}%
                          </IonBadge>
                        </div>

                        <p>
                          Electores: {item.jrv.total_electores}
                        </p>

                        <p>
                          Estado de la JRV: {item.jrv.estado}
                        </p>

                        <div className="seguimiento-jrv-chips">
                          <IonChip color="success">
                            {item.actas.length} actas registradas
                          </IonChip>

                          <IonChip color="warning">
                            {item.pendientes} pendientes
                          </IonChip>

                          <IonChip color="primary">
                            {item.veedores.length} veedores
                          </IonChip>
                        </div>

                        <IonProgressBar
                          value={item.avance / 100}
                          color={obtenerColorAvance(item.avance)}
                        />

                        <p className="seguimiento-jrv-progreso">
                          {item.actas.length} de {item.actasEsperadas}{' '}
                          actas registradas
                        </p>

                        <div className="seguimiento-jrv-subsection">
                          <strong>Actas registradas</strong>

                          {item.actas.length === 0 ? (
                            <p>No se han registrado actas.</p>
                          ) : (
                            <div className="seguimiento-jrv-chips">
                              {item.actas.map((acta) => (
                                <IonChip
                                  key={acta.id}
                                  color={obtenerColorEstado(acta.estado)}
                                >
                                  {acta.dignidad} · {acta.estado}
                                </IonChip>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="seguimiento-jrv-subsection">
                          <strong>Veedores asignados</strong>

                          {item.veedores.length === 0 ? (
                            <p>No hay veedores asignados a esta JRV.</p>
                          ) : (
                            <div className="seguimiento-veedores-lista">
                              {item.veedores.map((veedor) => (
                                <p key={veedor.perfil.id}>
                                  {veedor.perfil.nombres}{' '}
                                  {veedor.perfil.apellidos}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      </IonLabel>
                    </IonItem>
                  ))}
                </IonList>
              )}
            </section>

            <IonButton
              expand="block"
              fill="outline"
              onClick={() => void cargarDatos()}
              disabled={cargando}
              className="ion-margin-top"
            >
              Actualizar seguimiento
            </IonButton>
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default SeguimientoRecinto;