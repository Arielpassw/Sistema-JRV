
import { useCallback, useState } from 'react';
import {
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
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
  IonText,
  IonTitle,
  IonToolbar,
  useIonViewWillEnter,
} from '@ionic/react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';

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

const DetalleActaRecinto: React.FC = () => {
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

  const [fotografia, setFotografia] = useState<File | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState('');

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const cargarActa = useCallback(async () => {
    if (!actaId || !perfil?.id) {
      setError('No se pudo identificar el acta o el usuario.');
      setCargando(false);
      return;
    }

    if (perfil.rol !== 'coordinador_recinto') {
      setError('No tienes permisos para corregir actas.');
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

      if (actaEncontrada.estado.toLowerCase() === 'aprobada') {
        throw new Error('Esta acta ya está aprobada y no puede modificarse.');
      }

      // Comprobar que el acta pertenece al recinto del coordinador.
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
        throw new Error('No tienes un recinto activo asignado.');
      }

      const jrvEncontrada = await jrvService.obtenerPorId(
        actaEncontrada.jrv_id
      );

      if (!jrvEncontrada) {
        throw new Error('No se encontró la JRV del acta.');
      }

      if (jrvEncontrada.recinto_id !== asignacionRecinto.recinto_id) {
        throw new Error('El acta no pertenece a tu recinto asignado.');
      }

      const recintoEncontrado = await recintoService.obtenerPorId(
        jrvEncontrada.recinto_id
      );

      if (!recintoEncontrado) {
        throw new Error('No se encontró el recinto relacionado.');
      }

      const [detalles, candidaturas] = await Promise.all([
        detalleVotoService.listarPorActa(actaEncontrada.id),
        candidaturaService.listarPorDignidad(actaEncontrada.dignidad),
      ]);

      const resultadosActa = candidaturas.map((candidatura) => {
        const detalle =
          detalles.find(
            (item) => item.candidatura_id === candidatura.id
          ) ?? null;

        return {
          candidatura,
          detalle,
          cantidad: String(detalle?.cantidad_votos ?? 0),
        };
      });

      setActa(actaEncontrada);
      setJrv(jrvEncontrada);
      setRecinto(recintoEncontrado);
      setResultados(resultadosActa);

      setTotalSufragantes(String(actaEncontrada.total_sufragantes));
      setVotosNulos(String(actaEncontrada.votos_nulos));
      setVotosBlancos(String(actaEncontrada.votos_blancos));
      setObservaciones(actaEncontrada.observaciones ?? '');
      setFotografia(null);
      setVistaPrevia('');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo consultar el acta.'
      );
    } finally {
      setCargando(false);
    }
  }, [actaId, perfil?.id, perfil?.rol]);

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

  const seleccionarFotografia = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const archivo = event.target.files?.[0];

    if (!archivo) return;

    if (!archivo.type.startsWith('image/')) {
      setError('Selecciona un archivo de imagen válido.');
      return;
    }

    const tiposPermitidos = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    if (!tiposPermitidos.includes(archivo.type)) {
      setError('La fotografía debe estar en formato JPG, PNG o WEBP.');
      return;
    }

    if (archivo.size > 10 * 1024 * 1024) {
      setError('La fotografía no puede superar los 10 MB.');
      return;
    }

    setError('');
    setFotografia(archivo);
    setVistaPrevia(URL.createObjectURL(archivo));
  };

  const validarDatos = (): string | null => {
    const sufragantes = Number(totalSufragantes);
    const nulos = Number(votosNulos);
    const blancos = Number(votosBlancos);

    const generales = [sufragantes, nulos, blancos];

    if (
      generales.some(
        (valor) => !Number.isInteger(valor) || valor < 0
      )
    ) {
      return 'Los datos generales deben ser números enteros no negativos.';
    }

    const cantidades = resultados.map((resultado) =>
      Number(resultado.cantidad)
    );

    if (
      cantidades.some(
        (cantidad) => !Number.isInteger(cantidad) || cantidad < 0
      )
    ) {
      return 'Los votos por candidatura deben ser enteros no negativos.';
    }

    const totalVotos = cantidades.reduce(
      (total, cantidad) => total + cantidad,
      0
    );

    if (totalVotos + nulos + blancos > sufragantes) {
      return 'La suma de votos no puede superar el total de sufragantes.';
    }

    return null;
  };

  const subirFotografia = async (): Promise<string | null> => {
    if (!fotografia || !acta || !jrv) return null;

    const extensiones: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };

    const extension = extensiones[fotografia.type];

    if (!extension) {
      throw new Error('Formato de fotografía no permitido.');
    }

    // La política de Storage exige: jrvId/actaId.extensión
    const rutaArchivo = `${jrv.id}/${acta.id}.${extension}`;

    const { error: errorSubida } = await supabase.storage
      .from('actas')
      .upload(rutaArchivo, fotografia, {
        upsert: true,
        contentType: fotografia.type,
      });

    if (errorSubida) {
      throw errorSubida;
    }

    const { data } = supabase.storage
      .from('actas')
      .getPublicUrl(rutaArchivo);

    return data.publicUrl;
  };

  const guardarCambios = async () => {
    if (!acta || !jrv) return;

    setError('');
    setMensaje('');

    const errorValidacion = validarDatos();

    if (errorValidacion) {
      setError(errorValidacion);
      return;
    }

    try {
      setGuardando(true);

      // Reemplazar fotografía si se seleccionó una nueva.
      let nuevaFotoUrl: string | null = null;

      if (fotografia) {
        nuevaFotoUrl = await subirFotografia();
      }

      // Actualizar los resultados por candidatura.
      for (const resultado of resultados) {
        const cantidad = Number(resultado.cantidad);

        if (resultado.detalle) {
          await detalleVotoService.actualizar(
            resultado.detalle.id,
            cantidad
          );
        } else {
          await detalleVotoService.registrar({
            acta_id: acta.id,
            candidatura_id: resultado.candidatura.id,
            cantidad_votos: cantidad,
          });
        }
      }

      // Actualizar información general y fotografía.
      const cambios: Parameters<typeof actaService.actualizar>[1] = {
        total_sufragantes: Number(totalSufragantes),
        votos_nulos: Number(votosNulos),
        votos_blancos: Number(votosBlancos),
        observaciones: observaciones.trim() || null,
      };

      if (nuevaFotoUrl) {
        cambios.foto_url = nuevaFotoUrl;
      }

      const actaActualizada = await actaService.actualizar(
        acta.id,
        cambios
      );

      setActa(actaActualizada);
      setFotografia(null);
      setVistaPrevia('');
      setMensaje('El acta se corrigió correctamente.');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudieron guardar las correcciones.'
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
          <IonButtons slot="start">
            <IonBackButton defaultHref="/recinto/actas" />
          </IonButtons>
          <IonTitle>Corregir acta</IonTitle>
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
                    <p><strong>Dignidad:</strong> {acta.dignidad}</p>
                    <p><strong>Recinto:</strong> {recinto.nombre}</p>
                    <p><strong>JRV:</strong> N.º {jrv.numero}</p>
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

                <IonCard>
                  <IonCardHeader>
                    <IonCardTitle>Fotografía del acta</IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    {vistaPrevia || acta.foto_url ? (
                      <img
                        src={vistaPrevia || acta.foto_url || ''}
                        alt="Fotografía del acta electoral"
                        style={{
                          width: '100%',
                          maxHeight: '450px',
                          objectFit: 'contain',
                          borderRadius: '8px',
                        }}
                      />
                    ) : (
                      <IonText color="medium">
                        <p>Esta acta no tiene fotografía registrada.</p>
                      </IonText>
                    )}

                    <IonButton
                      expand="block"
                      fill="outline"
                      onClick={() =>
                        document.getElementById('foto-acta-recinto')?.click()
                      }
                    >
                      Seleccionar nueva fotografía
                    </IonButton>

                    <input
                      id="foto-acta-recinto"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      capture="environment"
                      onChange={seleccionarFotografia}
                      hidden
                    />

                    {fotografia && (
                      <IonText color="success">
                        <p>Fotografía nueva seleccionada.</p>
                      </IonText>
                    )}
                  </IonCardContent>
                </IonCard>

                {(acta.latitud !== null || acta.longitud !== null) && (
                  <IonCard>
                    <IonCardHeader>
                      <IonCardTitle>Ubicación registrada</IonCardTitle>
                    </IonCardHeader>
                    <IonCardContent>
                      <p>Latitud: {acta.latitud ?? 'No disponible'}</p>
                      <p>Longitud: {acta.longitud ?? 'No disponible'}</p>

                      {acta.latitud !== null &&
                        acta.longitud !== null && (
                          <IonButton
                            expand="block"
                            fill="outline"
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
                      <p>No hay candidaturas activas para esta dignidad.</p>
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
                                  Lista: {resultado.candidatura.numero_lista}
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
                        Guardando correcciones...
                      </span>
                    </>
                  ) : (
                    'Guardar correcciones'
                  )}
                </IonButton>
              </>
            )}

            <IonButton
              expand="block"
              fill="clear"
              color="medium"
              onClick={() => navigate('/recinto/actas')}
              disabled={guardando}
            >
              Volver a las actas
            </IonButton>
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default DetalleActaRecinto;
