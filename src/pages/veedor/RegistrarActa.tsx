
import { useCallback, useMemo, useState } from 'react';
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
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTextarea,
  IonTitle,
  IonToolbar,
  useIonViewWillEnter,
} from '@ionic/react';
import { Geolocation } from '@capacitor/geolocation';
import { useNavigate } from 'react-router-dom';

import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../config/supabase';

import { asignacionService } from '../../services/asignacion.service';
import { jrvService } from '../../services/jrv.service';
import { recintoService } from '../../services/recinto.service';
import { candidaturaService } from '../../services/candidatura.service';
import { actaService } from '../../services/acta.service';
import { detalleVotoService } from '../../services/detalle-voto.service';

import type { JRV, Recinto, Candidatura } from '../../models';

interface JRVAsignada {
  jrv: JRV;
  recinto: Recinto;
}

const analizarNitidez = async (archivo: File): Promise<number> => {
  const imagen = new Image();
  const url = URL.createObjectURL(archivo);

  try {
    await new Promise<void>((resolve, reject) => {
      imagen.onload = () => resolve();
      imagen.onerror = () => reject(
        new Error('No se pudo analizar la fotografía.')
      );
      imagen.src = url;
    });

    const canvas = document.createElement('canvas');

    const escala = Math.min(
      1,
      320 / Math.max(imagen.width, imagen.height)
    );

    canvas.width = Math.max(3, Math.round(imagen.width * escala));
    canvas.height = Math.max(3, Math.round(imagen.height * escala));

    const contexto = canvas.getContext('2d');

    if (!contexto) {
      throw new Error('No se pudo analizar la nitidez de la imagen.');
    }

    contexto.drawImage(imagen, 0, 0, canvas.width, canvas.height);

    const { data } = contexto.getImageData(
      0,
      0,
      canvas.width,
      canvas.height
    );

    const obtenerGris = (x: number, y: number): number => {
      const indice = (y * canvas.width + x) * 4;

      return (
        0.299 * data[indice] +
        0.587 * data[indice + 1] +
        0.114 * data[indice + 2]
      );
    };

    const valores: number[] = [];

    for (let y = 1; y < canvas.height - 1; y++) {
      for (let x = 1; x < canvas.width - 1; x++) {
        const centro = obtenerGris(x, y);

        const laplaciano =
          obtenerGris(x - 1, y) +
          obtenerGris(x + 1, y) +
          obtenerGris(x, y - 1) +
          obtenerGris(x, y + 1) -
          4 * centro;

        valores.push(laplaciano);
      }
    }

    const promedio =
      valores.reduce((suma, valor) => suma + valor, 0) /
      valores.length;

    const varianza =
      valores.reduce(
        (suma, valor) => suma + Math.pow(valor - promedio, 2),
        0
      ) / valores.length;

    return varianza;
  } finally {
    URL.revokeObjectURL(url);
  }
};

const RegistrarActa: React.FC = () => {
  const { perfil } = useAuth();
  const navigate = useNavigate();

  const [jrvAsignadas, setJrvAsignadas] = useState<JRVAsignada[]>([]);
  const [candidaturas, setCandidaturas] = useState<Candidatura[]>([]);

  const [jrvId, setJrvId] = useState('');
  const [dignidad, setDignidad] = useState('');

  const [totalSufragantes, setTotalSufragantes] = useState('0');
  const [votosNulos, setVotosNulos] = useState('0');
  const [votosBlancos, setVotosBlancos] = useState('0');

  const [votos, setVotos] = useState<Record<string, string>>({});
  const [observaciones, setObservaciones] = useState('');

  const [fotografia, setFotografia] = useState<File | null>(null);
  const [ubicacion, setUbicacion] = useState<{
    latitud: number;
    longitud: number;
  } | null>(null);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [obteniendoUbicacion, setObteniendoUbicacion] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [capturandoFotografia, setCapturandoFotografia] = useState(false);


  const cargarDatos = useCallback(async () => {
    if (!perfil?.id) {
      setCargando(false);
      return;
    }

    try {
      setCargando(true);
      setError('');

      const [asignaciones, candidaturasActivas] = await Promise.all([
        asignacionService.listarPorPerfil(perfil.id),
        candidaturaService.listarActivas(),
      ]);

      const asignacionesJRV = asignaciones.filter(
        (asignacion) =>
          asignacion.activa &&
          asignacion.tipo_asignacion === 'jrv' &&
          asignacion.jrv_id
      );

      const resultados = await Promise.all(
        asignacionesJRV.map(async (asignacion) => {
          const jrv = await jrvService.obtenerPorId(asignacion.jrv_id!);

          if (!jrv) return null;

          const recinto = await recintoService.obtenerPorId(jrv.recinto_id);

          if (!recinto) return null;

          return { jrv, recinto };
        })
      );

      const jrvValidas = resultados.filter(
        (resultado): resultado is JRVAsignada => resultado !== null
      );

      setJrvAsignadas(jrvValidas);
      setCandidaturas(candidaturasActivas);

      if (jrvValidas.length > 0) {
        setJrvId((actual) => actual || jrvValidas[0].jrv.id);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar los datos del formulario.'
      );
    } finally {
      setCargando(false);
    }
  }, [perfil?.id]);

  useIonViewWillEnter(() => {
    void cargarDatos();
  });

  const dignidades = useMemo(
    () =>
      Array.from(
        new Set(candidaturas.map((candidatura) => candidatura.dignidad))
      ).sort(),
    [candidaturas]
  );

  const candidaturasFiltradas = useMemo(
    () =>
      candidaturas.filter(
        (candidatura) => candidatura.dignidad === dignidad
      ),
    [candidaturas, dignidad]
  );

  const actualizarVoto = (candidaturaId: string, cantidad: string) => {
    setVotos((actuales) => ({
      ...actuales,
      [candidaturaId]: cantidad,
    }));
  };

  const obtenerUbicacion = async () => {
    try {
      setObteniendoUbicacion(true);
      setError('');
      setMensaje('');

      const posicion = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 15000,
      });

      setUbicacion({
        latitud: posicion.coords.latitude,
        longitud: posicion.coords.longitude,
      });

      setMensaje('Ubicación GPS obtenida correctamente.');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo obtener la ubicación GPS.'
      );
    } finally {
      setObteniendoUbicacion(false);
    }
  };

  const capturarFotografia = async () => {
    try {
      setCapturandoFotografia(true);
      setError('');
      setMensaje('');

      const fotografiaCapturada = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        correctOrientation: true,
      });

      if (!fotografiaCapturada.webPath) {
        throw new Error('No se pudo obtener la fotografía.');
      }

      const respuesta = await fetch(fotografiaCapturada.webPath);
      const blob = await respuesta.blob();

      const extension =
        fotografiaCapturada.format === 'jpeg'
          ? 'jpg'
          : fotografiaCapturada.format;

      const tipo =
        extension === 'jpg'
          ? 'image/jpeg'
          : `image/${extension}`;

      const archivo = new File(
        [blob],
        `acta-${Date.now()}.${extension}`,
        { type: tipo }
      );

      if (
        !['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type)
      ) {
        throw new Error('Formato de fotografía no permitido.');
      }

      if (archivo.size > 10 * 1024 * 1024) {
        throw new Error('La fotografía supera el límite de 10 MB.');
      }

      // Analizar nitidez.
      const puntuacion = await analizarNitidez(archivo);

      // Umbral inicial de nitidez; debe calibrarse con fotografías reales.
      if (puntuacion < 70) {
        setFotografia(null);

        setError(
          'La fotografía parece estar borrosa. Limpia la cámara, mejora la iluminación y vuelve a tomarla.'
        );

        return;
      }

      setFotografia(archivo);

      setMensaje(
        `Fotografía aceptada. Nitidez detectada: ${puntuacion.toFixed(0)}.`
      );

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo capturar la fotografía.'
      );
    } finally {
      setCapturandoFotografia(false);
    }
  };

  const subirFotografia = async (actaId: string): Promise<string | null> => {
    if (!fotografia) return null;

    const tiposPermitidos: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };

    const extension = tiposPermitidos[fotografia.type];

    if (!extension) {
      throw new Error('La fotografía debe ser JPG, PNG o WEBP.');
    }

    if (fotografia.size > 10 * 1024 * 1024) {
      throw new Error('La fotografía no puede superar los 10 MB.');
    }

    // La ruta debe coincidir con las políticas RLS de Storage.
    const nombreArchivo = `${jrvId}/${actaId}.${extension}`;

    const { error: errorSubida } = await supabase.storage
      .from('actas')
      .upload(nombreArchivo, fotografia, {
        cacheControl: '3600',
        upsert: false,
        contentType: fotografia.type,
      });

    if (errorSubida) {
      throw new Error(
        `No se pudo subir la fotografía: ${errorSubida.message}`
      );
    }

    const { data } = supabase.storage
      .from('actas')
      .getPublicUrl(nombreArchivo);

    return data.publicUrl;
  };

  const validarFormulario = (): string | null => {
    if (!jrvId) {
      return 'Selecciona una JRV.';
    }

    if (!dignidad) {
      return 'Selecciona la dignidad electoral.';
    }

    const sufragantes = Number(totalSufragantes);
    const nulos = Number(votosNulos);
    const blancos = Number(votosBlancos);

    const cantidades = [sufragantes, nulos, blancos];

    if (
      cantidades.some(
        (cantidad) => !Number.isInteger(cantidad) || cantidad < 0
      )
    ) {
      return 'Los valores de sufragantes, votos nulos y blancos deben ser enteros no negativos.';
    }

    if (candidaturasFiltradas.length === 0) {
      return 'No existen candidaturas activas para la dignidad seleccionada.';
    }

    const totalVotosCandidaturas = candidaturasFiltradas.reduce(
      (total, candidatura) => {
        const cantidad = Number(votos[candidatura.id] ?? '0');
        return total + cantidad;
      },
      0
    );

    const cantidadesVotos = candidaturasFiltradas.map((candidatura) =>
      Number(votos[candidatura.id] ?? '0')
    );

    if (
      cantidadesVotos.some(
        (cantidad) => !Number.isInteger(cantidad) || cantidad < 0
      )
    ) {
      return 'Los votos por candidatura deben ser números enteros no negativos.';
    }

    const totalRegistrado =
      totalVotosCandidaturas + nulos + blancos;

    if (totalRegistrado > sufragantes) {
      return 'La suma de votos por candidaturas, nulos y blancos no puede superar el total de sufragantes.';
    }

    return null;
  };

  const registrarActa = async () => {
    setError('');
    setMensaje('');

    const errorValidacion = validarFormulario();

    if (errorValidacion) {
      setError(errorValidacion);
      return;
    }

    try {
      setGuardando(true);

      // 1. Crear el acta sin fotografía.
      const acta = await actaService.crear({
        jrv_id: jrvId,
        dignidad,
        total_sufragantes: Number(totalSufragantes),
        votos_nulos: Number(votosNulos),
        votos_blancos: Number(votosBlancos),
        foto_url: null,
        latitud: ubicacion?.latitud ?? null,
        longitud: ubicacion?.longitud ?? null,
        observaciones: observaciones.trim() || null,
      });

      // 2. Registrar los votos por candidatura.
      try {
        for (const candidatura of candidaturasFiltradas) {
          await detalleVotoService.registrar({
            acta_id: acta.id,
            candidatura_id: candidatura.id,
            cantidad_votos: Number(votos[candidatura.id] ?? '0'),
          });
        }
      } catch (err) {
        throw new Error(
          `El acta se creó, pero ocurrió un error al guardar sus votos. No vuelvas a registrar la misma acta. ID: ${acta.id}. ${err instanceof Error ? err.message : ''
          }`
        );
      }

      // 3. Subir fotografía y actualizar su URL.
      if (fotografia) {
        try {
          const fotoUrl = await subirFotografia(acta.id);

          if (fotoUrl) {
            await actaService.actualizar(acta.id, {
              foto_url: fotoUrl,
            });
          }
        } catch (err) {
          throw new Error(
            `El acta y sus votos se guardaron, pero no se pudo guardar la fotografía. ID del acta: ${acta.id}. ${err instanceof Error ? err.message : ''
            }`
          );
        }
      }

      // 4. Finalizar.
      setMensaje('Acta, resultados y fotografía registrados correctamente.');

      setTimeout(() => {
        navigate('/veedor/actas');
      }, 1200);

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo registrar el acta.'
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Registrar acta</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {cargando ? (
          <div className="ion-text-center ion-padding">
            <IonSpinner name="crescent" />
            <p>Cargando información...</p>
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

            {jrvAsignadas.length === 0 ? (
              <IonCard>
                <IonCardContent>
                  No tienes JRV asignadas para registrar actas.
                </IonCardContent>
              </IonCard>
            ) : (
              <>
                <IonCard>
                  <IonCardHeader>
                    <IonCardTitle>Información electoral</IonCardTitle>
                  </IonCardHeader>

                  <IonCardContent>
                    <IonItem>
                      <IonSelect
                        label="JRV asignada"
                        labelPlacement="stacked"
                        interface="popover"
                        value={jrvId}
                        onIonChange={(e) => setJrvId(e.detail.value)}
                      >
                        {jrvAsignadas.map(({ jrv, recinto }) => (
                          <IonSelectOption key={jrv.id} value={jrv.id}>
                            {recinto.nombre} - JRV N.º {jrv.numero}
                          </IonSelectOption>
                        ))}
                      </IonSelect>
                    </IonItem>

                    <IonItem>
                      <IonSelect
                        label="Dignidad electoral"
                        labelPlacement="stacked"
                        interface="popover"
                        placeholder="Selecciona una dignidad"
                        value={dignidad}
                        onIonChange={(e) => {
                          setDignidad(e.detail.value);
                          setVotos({});
                        }}
                      >
                        {dignidades.map((opcion) => (
                          <IonSelectOption key={opcion} value={opcion}>
                            {opcion}
                          </IonSelectOption>
                        ))}
                      </IonSelect>
                    </IonItem>
                  </IonCardContent>
                </IonCard>

                <IonCard>
                  <IonCardHeader>
                    <IonCardTitle>Datos del escrutinio</IonCardTitle>
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
                    <IonCardTitle>Votos por candidatura</IonCardTitle>
                  </IonCardHeader>

                  <IonCardContent>
                    {!dignidad ? (
                      <p>Selecciona una dignidad para mostrar sus candidaturas.</p>
                    ) : candidaturasFiltradas.length === 0 ? (
                      <p>No hay candidaturas activas para esta dignidad.</p>
                    ) : (
                      <IonList>
                        {candidaturasFiltradas.map((candidatura) => (
                          <IonItem key={candidatura.id}>
                            <IonLabel className="ion-text-wrap">
                              <h2>{candidatura.nombre_candidato}</h2>
                              {candidatura.numero_lista !== null && (
                                <p>
                                  Lista: {candidatura.numero_lista}
                                </p>
                              )}
                            </IonLabel>

                            <IonInput
                              slot="end"
                              type="number"
                              min="0"
                              value={votos[candidatura.id] ?? '0'}
                              onIonInput={(e) =>
                                actualizarVoto(
                                  candidatura.id,
                                  e.detail.value ?? '0'
                                )
                              }
                              style={{ maxWidth: '100px', textAlign: 'right' }}
                            />
                          </IonItem>
                        ))}
                      </IonList>
                    )}
                  </IonCardContent>
                </IonCard>

                <IonCard>
                  <IonCardHeader>
                    <IonCardTitle>Fotografía del acta</IonCardTitle>
                  </IonCardHeader>

                  <IonCardContent>
                    <p>
                      Captura una fotografía clara y completa del acta de escrutinio.
                    </p>

                    <IonButton
                      expand="block"
                      onClick={() => void capturarFotografia()}
                      disabled={capturandoFotografia || guardando}
                    >
                      {capturandoFotografia ? (
                        <>
                          <IonSpinner name="crescent" />
                          <span style={{ marginLeft: '10px' }}>
                            Analizando fotografía...
                          </span>
                        </>
                      ) : (
                        'Abrir cámara y tomar fotografía'
                      )}
                    </IonButton>

                    {fotografia && (
                      <IonBadge color="success">
                        Fotografía aceptada: {fotografia.name}
                      </IonBadge>
                    )}

                    {!fotografia && (
                      <p>
                        <IonBadge color="warning">
                          Fotografía pendiente
                        </IonBadge>
                      </p>
                    )}
                  </IonCardContent>
                </IonCard>

                <IonCard>
                  <IonCardHeader>
                    <IonCardTitle>Ubicación del registro</IonCardTitle>
                  </IonCardHeader>

                  <IonCardContent>
                    <IonButton
                      expand="block"
                      fill="outline"
                      onClick={() => void obtenerUbicacion()}
                      disabled={obteniendoUbicacion}
                    >
                      {obteniendoUbicacion ? (
                        <IonSpinner name="crescent" />
                      ) : (
                        'Obtener ubicación GPS'
                      )}
                    </IonButton>

                    {ubicacion && (
                      <p>
                        Latitud: {ubicacion.latitud.toFixed(6)}
                        <br />
                        Longitud: {ubicacion.longitud.toFixed(6)}
                      </p>
                    )}
                  </IonCardContent>
                </IonCard>

                <IonCard>
                  <IonCardHeader>
                    <IonCardTitle>Observaciones</IonCardTitle>
                  </IonCardHeader>

                  <IonCardContent>
                    <IonTextarea
                      label="Observaciones adicionales"
                      labelPlacement="stacked"
                      placeholder="Escribe alguna novedad del acta..."
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
                  onClick={() => void registrarActa()}
                  disabled={
                    guardando ||
                    !jrvId ||
                    !dignidad ||
                    candidaturasFiltradas.length === 0
                  }
                >
                  {guardando ? (
                    <>
                      <IonSpinner name="crescent" />
                      <span style={{ marginLeft: '10px' }}>
                        Registrando acta...
                      </span>
                    </>
                  ) : (
                    'Guardar acta'
                  )}
                </IonButton>

                <IonButton
                  expand="block"
                  fill="clear"
                  color="medium"
                  onClick={() => navigate('/veedor/actas')}
                  disabled={guardando}
                >
                  Cancelar
                </IonButton>
              </>
            )}
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default RegistrarActa;
