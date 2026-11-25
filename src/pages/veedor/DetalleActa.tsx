
import { useCallback, useState } from 'react';
import {
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonSpinner,
  IonTextarea,
  IonTitle,
  IonToolbar,
  useIonViewWillEnter,
} from '@ionic/react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';
import { actaService } from '../../services/acta.service';
import { detalleVotoService } from '../../services/detalle-voto.service';
import { candidaturaService } from '../../services/candidatura.service';
import { asignacionService } from '../../services/asignacion.service';
import { jrvService } from '../../services/jrv.service';
import { recintoService } from '../../services/recinto.service';

import type {
  Acta,
  DetalleVoto,
  Candidatura,
  JRV,
  Recinto,
} from '../../models';

interface ResultadoEditable {
  candidatura: Candidatura;
  detalle: DetalleVoto | null;
  cantidad: string;
}

const DetalleActa: React.FC = () => {
  const { actaId } = useParams<{ actaId: string }>();
  const { perfil } = useAuth();
  const navigate = useNavigate();

  const [acta, setActa] = useState<Acta | null>(null);
  const [jrv, setJrv] = useState<JRV | null>(null);
  const [recinto, setRecinto] = useState<Recinto | null>(null);

  const [resultados, setResultados] = useState<ResultadoEditable[]>([]);

  const [totalSufragantes, setTotalSufragantes] = useState('0');
  const [votosNulos, setVotosNulos] = useState('0');
  const [votosBlancos, setVotosBlancos] = useState('0');
  const [observaciones, setObservaciones] = useState('');

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const cargarActa = useCallback(async () => {
    if (!actaId || !perfil?.id) {
      setError('No se encontró el identificador del acta o del usuario.');
      setCargando(false);
      return;
    }

    try {
      setCargando(true);
      setError('');
      setMensaje('');

      const actaEncontrada = await actaService.obtenerPorId(actaId);

      if (!actaEncontrada) {
        throw new Error('No se encontró el acta solicitada.');
      }

      // Comprobar que la JRV pertenece a las asignaciones del veedor.
      const asignaciones = await asignacionService.listarPorPerfil(perfil.id);

      const tieneAcceso = asignaciones.some(
        (asignacion) =>
          asignacion.activa &&
          asignacion.tipo_asignacion === 'jrv' &&
          asignacion.jrv_id === actaEncontrada.jrv_id
      );

      if (!tieneAcceso) {
        throw new Error('No tienes autorización para consultar esta acta.');
      }

      const jrvEncontrada = await jrvService.obtenerPorId(
        actaEncontrada.jrv_id
      );

      if (!jrvEncontrada) {
        throw new Error('No se encontró la JRV relacionada con el acta.');
      }

      const recintoEncontrado = await recintoService.obtenerPorId(
        jrvEncontrada.recinto_id
      );

      if (!recintoEncontrado) {
        throw new Error('No se encontró el recinto relacionado con el acta.');
      }

      const [detalles, candidaturas] = await Promise.all([
        detalleVotoService.listarPorActa(actaEncontrada.id),
        candidaturaService.listarPorDignidad(actaEncontrada.dignidad),
      ]);

      const resultadosActa: ResultadoEditable[] = candidaturas.map(
        (candidatura) => {
          const detalle =
            detalles.find(
              (item) => item.candidatura_id === candidatura.id
            ) ?? null;

          return {
            candidatura,
            detalle,
            cantidad: String(detalle?.cantidad_votos ?? 0),
          };
        }
      );

      setActa(actaEncontrada);
      setJrv(jrvEncontrada);
      setRecinto(recintoEncontrado);
      setResultados(resultadosActa);

      setTotalSufragantes(String(actaEncontrada.total_sufragantes));
      setVotosNulos(String(actaEncontrada.votos_nulos));
      setVotosBlancos(String(actaEncontrada.votos_blancos));
      setObservaciones(actaEncontrada.observaciones ?? '');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo consultar el acta.'
      );
    } finally {
      setCargando(false);
    }
  }, [actaId, perfil?.id]);

  useIonViewWillEnter(() => {
    void cargarActa();
  });

  const actualizarVoto = (candidaturaId: string, cantidad: string) => {
    setResultados((actuales) =>
      actuales.map((resultado) =>
        resultado.candidatura.id === candidaturaId
          ? { ...resultado, cantidad }
          : resultado
      )
    );
  };

  const validarDatos = (): string | null => {
    const sufragantes = Number(totalSufragantes);
    const nulos = Number(votosNulos);
    const blancos = Number(votosBlancos);

    const valoresGenerales = [sufragantes, nulos, blancos];

    if (
      valoresGenerales.some(
        (valor) => !Number.isInteger(valor) || valor < 0
      )
    ) {
      return 'Los valores generales deben ser números enteros no negativos.';
    }

    const cantidades = resultados.map((resultado) =>
      Number(resultado.cantidad)
    );

    if (
      cantidades.some(
        (cantidad) => !Number.isInteger(cantidad) || cantidad < 0
      )
    ) {
      return 'Los votos por candidatura deben ser números enteros no negativos.';
    }

    const totalCandidaturas = cantidades.reduce(
      (total, cantidad) => total + cantidad,
      0
    );

    if (totalCandidaturas + nulos + blancos > sufragantes) {
      return 'La suma de votos por candidaturas, nulos y blancos no puede superar el total de sufragantes.';
    }

    return null;
  };

  const guardarCambios = async () => {
    if (!acta) return;

    setError('');
    setMensaje('');

    const errorValidacion = validarDatos();

    if (errorValidacion) {
      setError(errorValidacion);
      return;
    }

    try {
      setGuardando(true);

      // Actualizar los detalles de votos.
      for (const resultado of resultados) {
        const cantidad = Number(resultado.cantidad);

        if (resultado.detalle) {
          await detalleVotoService.actualizar(
            resultado.detalle.id,
            cantidad
          );
        } else {
          const nuevoDetalle = await detalleVotoService.registrar({
            acta_id: acta.id,
            candidatura_id: resultado.candidatura.id,
            cantidad_votos: cantidad,
          });

          resultado.detalle = nuevoDetalle;
        }
      }

      // Actualizar los datos generales del acta.
      const actaActualizada = await actaService.actualizar(acta.id, {
        total_sufragantes: Number(totalSufragantes),
        votos_nulos: Number(votosNulos),
        votos_blancos: Number(votosBlancos),
        observaciones: observaciones.trim() || null,
      });

      setActa(actaActualizada);
      setMensaje('Los resultados del acta se actualizaron correctamente.');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudieron guardar los cambios.'
      );
    } finally {
      setGuardando(false);
    }
  };

  const formatoFecha = (fecha: string | null) => {
    if (!fecha) return 'No registrada';

    return new Date(fecha).toLocaleString('es-EC', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Detalle del acta</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {cargando ? (
          <div className="ion-text-center ion-padding">
            <IonSpinner name="crescent" />
            <p>Cargando información del acta...</p>
          </div>
        ) : (
          <>
            {error && (
              <IonCard color="danger">
                <IonCardContent>{error}</IonCardContent>
              </IonCard>
            )}

            {mensaje && (
              <IonCard color="success">
                <IonCardContent>{mensaje}</IonCardContent>
              </IonCard>
            )}

            {acta && jrv && recinto && (
              <>
                <IonCard>
                  <IonCardHeader>
                    <IonCardTitle>Información del acta</IonCardTitle>
                  </IonCardHeader>

                  <IonCardContent>
                    <p>
                      <strong>Dignidad:</strong> {acta.dignidad}
                    </p>
                    <p>
                      <strong>Recinto:</strong> {recinto.nombre}
                    </p>
                    <p>
                      <strong>JRV:</strong> N.º {jrv.numero}
                    </p>
                    <p>
                      <strong>Fecha de registro:</strong>{' '}
                      {formatoFecha(acta.fecha_registro)}
                    </p>
                    <p>
                      <strong>Estado:</strong>{' '}
                      <IonBadge color="primary">{acta.estado}</IonBadge>
                    </p>
                  </IonCardContent>
                </IonCard>

                {acta.foto_url && (
                  <IonCard>
                    <IonCardHeader>
                      <IonCardTitle>Fotografía del acta</IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <img
                        src={acta.foto_url}
                        alt="Fotografía del acta electoral"
                        style={{
                          width: '100%',
                          maxHeight: '450px',
                          objectFit: 'contain',
                          borderRadius: '8px',
                        }}
                      />
                    </IonCardContent>
                  </IonCard>
                )}

                {(acta.latitud !== null || acta.longitud !== null) && (
                  <IonCard>
                    <IonCardHeader>
                      <IonCardTitle>Ubicación registrada</IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <p>Latitud: {acta.latitud ?? 'No disponible'}</p>
                      <p>Longitud: {acta.longitud ?? 'No disponible'}</p>
                      {acta.latitud !== null && acta.longitud !== null && (
                        <IonButton
                          fill="outline"
                          expand="block"
                          href={`https://www.google.com/maps?q=${acta.latitud},${acta.longitud}`}
                          target="_blank"
                        >
                          Ver ubicación en Google Maps
                        </IonButton>
                      )}
                    </IonCardContent>
                  </IonCard>
                )}

                <IonCard>
                  <IonCardHeader>
                    <IonCardTitle>Datos generales del escrutinio</IonCardTitle>
                  </IonCardHeader>

                  <IonCardContent>
                    <IonItem>
                      <IonInput
                        label="Total de sufragantes"
                        labelPlacement="stacked"
                        type="number"
                        min="0"
                        value={totalSufragantes}
                        onIonInput={(e) =>
                          setTotalSufragantes(e.detail.value ?? '0')
                        }
                      />
                    </IonItem>

                    <IonItem>
                      <IonInput
                        label="Votos nulos"
                        labelPlacement="stacked"
                        type="number"
                        min="0"
                        value={votosNulos}
                        onIonInput={(e) =>
                          setVotosNulos(e.detail.value ?? '0')
                        }
                      />
                    </IonItem>

                    <IonItem>
                      <IonInput
                        label="Votos blancos"
                        labelPlacement="stacked"
                        type="number"
                        min="0"
                        value={votosBlancos}
                        onIonInput={(e) =>
                          setVotosBlancos(e.detail.value ?? '0')
                        }
                      />
                    </IonItem>
                  </IonCardContent>
                </IonCard>

                <IonCard>
                  <IonCardHeader>
                    <IonCardTitle>Resultados por candidatura</IonCardTitle>
                  </IonCardHeader>

                  <IonCardContent>
                    {resultados.length === 0 ? (
                      <p>
                        No se encontraron candidaturas activas para esta
                        dignidad.
                      </p>
                    ) : (
                      <IonList>
                        {resultados.map((resultado) => (
                          <IonItem key={resultado.candidatura.id}>
                            <IonLabel className="ion-text-wrap">
                              <h2>
                                {resultado.candidatura.nombre_candidato}
                              </h2>
                              {resultado.candidatura.numero_lista !== null && (
                                <p>
                                  Lista:{' '}
                                  {resultado.candidatura.numero_lista}
                                </p>
                              )}
                            </IonLabel>

                            <IonInput
                              slot="end"
                              type="number"
                              min="0"
                              value={resultado.cantidad}
                              onIonInput={(e) =>
                                actualizarVoto(
                                  resultado.candidatura.id,
                                  e.detail.value ?? '0'
                                )
                              }
                              style={{
                                maxWidth: '100px',
                                textAlign: 'right',
                              }}
                            />
                          </IonItem>
                        ))}
                      </IonList>
                    )}
                  </IonCardContent>
                </IonCard>

                <IonCard>
                  <IonCardHeader>
                    <IonCardTitle>Observaciones</IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    <IonTextarea
                      label="Observaciones del acta"
                      labelPlacement="stacked"
                      autoGrow
                      value={observaciones}
                      onIonInput={(e) =>
                        setObservaciones(e.detail.value ?? '')
                      }
                    />
                  </IonCardContent>
                </IonCard>

                <IonButton
                  expand="block"
                  onClick={() => void guardarCambios()}
                  disabled={guardando || resultados.length === 0}
                >
                  {guardando ? (
                    <>
                      <IonSpinner name="crescent" />
                      <span style={{ marginLeft: '10px' }}>
                        Guardando cambios...
                      </span>
                    </>
                  ) : (
                    'Guardar resultados'
                  )}
                </IonButton>
              </>
            )}

            <IonButton
              expand="block"
              fill="clear"
              color="medium"
              onClick={() => navigate('/veedor/actas')}
              disabled={guardando}
            >
              Volver a mis actas
            </IonButton>
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default DetalleActa;
