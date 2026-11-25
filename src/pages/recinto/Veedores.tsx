
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  IonBackButton,
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
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
  IonTitle,
  IonToast,
  IonToolbar,
} from '@ionic/react';
import { useAuth } from '../../contexts/AuthContext';
import type { Asignacion, JRV, Perfil, Recinto } from '../../models';
import { asignacionService } from '../../services/asignacion.service';
import { jrvService } from '../../services/jrv.service';
import { perfilService } from '../../services/perfil.service';
import { recintoService } from '../../services/recinto.service';
import { usuarioService } from '../../services/usuario.service';

interface VeedorAsignado {
  perfil: Perfil;
  jrv: JRV;
  asignacion: Asignacion;
}

const Veedores: React.FC = () => {
  const { perfil: perfilActual } = useAuth();

  const [recinto, setRecinto] = useState<Recinto | null>(null);
  const [jrv, setJrv] = useState<JRV[]>([]);
  const [veedores, setVeadores] = useState<VeedorAsignado[]>([]);

  const [jrvId, setJrvId] = useState('');
  const [cedula, setCedula] = useState('');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');

  const [nuevasJrv, setNuevasJrv] = useState<Record<string, string>>({});
  const [reasignandoId, setReasignandoId] = useState<string | null>(null);

  const [cargando, setCargando] = useState(true);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState('');

  const [toast, setToast] = useState({
    abierto: false,
    mensaje: '',
    color: 'success',
  });

  const mostrarToast = (mensaje: string, color = 'success') => {
    setToast({ abierto: true, mensaje, color });
  };

  const cargarDatos = useCallback(async () => {
    if (!perfilActual?.id) {
      setError('No se pudo identificar tu perfil.');
      setCargando(false);
      return;
    }

    try {
      setCargando(true);
      setError('');

      const asignacionesPerfil = await asignacionService.listarPorPerfil(
        perfilActual.id
      );

      const asignacionRecinto = asignacionesPerfil.find(
        (item) =>
          item.activa &&
          item.tipo_asignacion === 'recinto' &&
          item.recinto_id
      );

      if (!asignacionRecinto?.recinto_id) {
        setRecinto(null);
        setJrv([]);
        setVeadores([]);
        setError('No tienes un recinto activo asignado.');
        return;
      }

      const recintoAsignado = await recintoService.obtenerPorId(
        asignacionRecinto.recinto_id
      );

      if (!recintoAsignado) {
        setError('No se encontró la información de tu recinto.');
        return;
      }

      setRecinto(recintoAsignado);

      const mesas = await jrvService.listarPorRecinto(recintoAsignado.id);
      setJrv(mesas);

      const asignacionesPorJrv = await Promise.all(
        mesas.map(async (mesa) => {
          const asignaciones = await asignacionService.listarPorJrv(mesa.id);

          return asignaciones
            .filter(
              (asignacion) =>
                asignacion.activa &&
                asignacion.tipo_asignacion === 'jrv' &&
                asignacion.jrv_id === mesa.id
            )
            .map((asignacion) => ({
              perfilId: asignacion.perfil_id,
              jrv: mesa,
              asignacion,
            }));
        })
      );

      const asignaciones = asignacionesPorJrv.flat();

      const veedoresCargados = await Promise.all(
        asignaciones.map(async (asignacion) => {
          const perfil = await perfilService.obtenerPorId(
            asignacion.perfilId
          );

          if (
            !perfil ||
            !perfil.activo ||
            perfil.rol !== 'veedor_mesa'
          ) {
            return null;
          }

          return {
            perfil,
            jrv: asignacion.jrv,
            asignacion: asignacion.asignacion,
          };
        })
      );

      setVeadores(
        veedoresCargados.filter(
          (item): item is VeedorAsignado => item !== null
        )
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo cargar la información de los veedores.'
      );
    } finally {
      setCargando(false);
    }
  }, [perfilActual?.id]);

  useEffect(() => {
    void cargarDatos();
  }, [cargarDatos]);

  const limpiarFormulario = () => {
    setCedula('');
    setNombres('');
    setApellidos('');
    setTelefono('');
    setCorreo('');
    setJrvId('');
  };

  const crearVeedor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!jrvId) {
      mostrarToast('Selecciona la JRV a la que se asignará el veedor.', 'warning');
      return;
    }

    if (!/^\d{10}$/.test(cedula.trim())) {
      mostrarToast('La cédula debe contener exactamente 10 dígitos.', 'warning');
      return;
    }

    try {
      setCreando(true);

      const respuesta = await usuarioService.crear({
        cedula: cedula.trim(),
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        telefono: telefono.trim() || null,
        correo: correo.trim().toLowerCase(),
        rol: 'veedor_mesa',
        jrvId,
      });

      limpiarFormulario();

      mostrarToast(
        respuesta.mensaje || 'Veedor creado y asignado correctamente.'
      );

      await cargarDatos();
    } catch (err) {
      mostrarToast(
        err instanceof Error ? err.message : 'No se pudo crear el veedor.',
        'danger'
      );
    } finally {
      setCreando(false);
    }
  };

  const reasignarVeedor = async (veedor: VeedorAsignado) => {
    const nuevaJrvId = nuevasJrv[veedor.perfil.id];

    if (!nuevaJrvId) {
      mostrarToast('Selecciona la nueva JRV.', 'warning');
      return;
    }

    if (nuevaJrvId === veedor.jrv.id) {
      mostrarToast('Selecciona una JRV diferente a la actual.', 'warning');
      return;
    }

    const nuevaMesa = jrv.find((mesa) => mesa.id === nuevaJrvId);

    if (!nuevaMesa) {
      mostrarToast('La JRV seleccionada no es válida.', 'danger');
      return;
    }

    const confirmar = window.confirm(
      `¿Deseas reasignar a ${veedor.perfil.nombres} ${veedor.perfil.apellidos} de la JRV ${veedor.jrv.numero} a la JRV ${nuevaMesa.numero}?`
    );

    if (!confirmar) return;

    try {
      setReasignandoId(veedor.perfil.id);

      await asignacionService.reasignarVeedor(
        veedor.asignacion.id,
        nuevaJrvId
      );

      setNuevasJrv((actual) => ({
        ...actual,
        [veedor.perfil.id]: '',
      }));

      mostrarToast('Veedor reasignado correctamente.');
      await cargarDatos();
    } catch (err) {
      mostrarToast(
        err instanceof Error
          ? err.message
          : 'No se pudo reasignar al veedor.',
        'danger'
      );
    } finally {
      setReasignandoId(null);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" />
          </IonButtons>
          <IonTitle>Gestión de veedores</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonText color="medium">
          <p>
            Registra veedores, asígnalos a las JRV y realiza reasignaciones
            dentro de tu recinto.
          </p>
        </IonText>

        {recinto && (
          <IonCard>
            <IonCardContent>
              <h2>{recinto.nombre}</h2>
              <p>JRV disponibles: {jrv.length}</p>
            </IonCardContent>
          </IonCard>
        )}

        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Registrar veedor</IonCardTitle>
          </IonCardHeader>

          <IonCardContent>
            <form onSubmit={crearVeedor}>
              <IonItem>
                <IonLabel position="stacked">Cédula</IonLabel>
                <IonInput
                  value={cedula}
                  onIonInput={(event) =>
                    setCedula(
                      String(event.detail.value ?? '')
                        .replace(/\D/g, '')
                        .slice(0, 10)
                    )
                  }
                  inputmode="numeric"
                  maxlength={10}
                  placeholder="Ingrese la cédula"
                  required
                />
              </IonItem>

              <IonItem>
                <IonLabel position="stacked">Nombres</IonLabel>
                <IonInput
                  value={nombres}
                  onIonInput={(event) =>
                    setNombres(String(event.detail.value ?? ''))
                  }
                  placeholder="Nombres del veedor"
                  required
                />
              </IonItem>

              <IonItem>
                <IonLabel position="stacked">Apellidos</IonLabel>
                <IonInput
                  value={apellidos}
                  onIonInput={(event) =>
                    setApellidos(String(event.detail.value ?? ''))
                  }
                  placeholder="Apellidos del veedor"
                  required
                />
              </IonItem>

              <IonItem>
                <IonLabel position="stacked">Teléfono</IonLabel>
                <IonInput
                  value={telefono}
                  onIonInput={(event) =>
                    setTelefono(String(event.detail.value ?? ''))
                  }
                  inputmode="tel"
                  placeholder="Teléfono (opcional)"
                />
              </IonItem>

              <IonItem>
                <IonLabel position="stacked">Correo electrónico</IonLabel>
                <IonInput
                  type="email"
                  value={correo}
                  onIonInput={(event) =>
                    setCorreo(String(event.detail.value ?? ''))
                  }
                  placeholder="correo@ejemplo.com"
                  required
                />
              </IonItem>

              <IonItem>
                <IonLabel position="stacked">Junta Receptora del Voto</IonLabel>
                <IonSelect
                  value={jrvId}
                  onIonChange={(event) =>
                    setJrvId(String(event.detail.value ?? ''))
                  }
                  placeholder="Selecciona una JRV"
                  interface="popover"
                  required
                >
                  {jrv.map((mesa) => (
                    <IonSelectOption key={mesa.id} value={mesa.id}>
                      JRV {mesa.numero}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>

              <IonButton
                expand="block"
                type="submit"
                className="ion-margin-top"
                disabled={creando || cargando || jrv.length === 0}
              >
                {creando ? (
                  <>
                    <IonSpinner name="crescent" />
                    <span className="ion-margin-start">Creando...</span>
                  </>
                ) : (
                  'Crear y asignar veedor'
                )}
              </IonButton>

              {jrv.length === 0 && !cargando && (
                <IonText color="warning">
                  <p>No hay JRV disponibles para asignar veedores.</p>
                </IonText>
              )}
            </form>
          </IonCardContent>
        </IonCard>

        <IonCard>
          <IonCardHeader>
            <IonCardTitle>
              Veedores registrados ({veedores.length})
            </IonCardTitle>
          </IonCardHeader>

          <IonCardContent>
            {cargando ? (
              <div className="ion-text-center ion-padding">
                <IonSpinner name="crescent" />
                <p>Cargando veedores...</p>
              </div>
            ) : error ? (
              <IonText color="danger">
                <p>{error}</p>
              </IonText>
            ) : veedores.length === 0 ? (
              <IonText color="medium">
                <p>Aún no hay veedores asignados a las JRV de este recinto.</p>
              </IonText>
            ) : (
              <IonList>
                {veedores.map((veedor) => {
                  const jrvDisponibles = jrv.filter(
                    (mesa) => mesa.id !== veedor.jrv.id
                  );

                  return (
                    <IonItem
                      key={`${veedor.perfil.id}-${veedor.asignacion.id}`}
                      lines="full"
                    >
                      <IonLabel className="ion-text-wrap">
                        <h2>
                          {veedor.perfil.nombres} {veedor.perfil.apellidos}
                        </h2>
                        <p>Cédula: {veedor.perfil.cedula}</p>
                        <p>Correo: {veedor.perfil.correo}</p>
                        <p>JRV actual: {veedor.jrv.numero}</p>

                        <IonItem lines="none">
                          <IonLabel position="stacked">
                            Nueva JRV
                          </IonLabel>
                          <IonSelect
                            value={nuevasJrv[veedor.perfil.id] ?? ''}
                            placeholder="Selecciona otra JRV"
                            interface="popover"
                            onIonChange={(event) =>
                              setNuevasJrv((actual) => ({
                                ...actual,
                                [veedor.perfil.id]: String(
                                  event.detail.value ?? ''
                                ),
                              }))
                            }
                          >
                            {jrvDisponibles.map((mesa) => (
                              <IonSelectOption
                                key={mesa.id}
                                value={mesa.id}
                              >
                                JRV {mesa.numero}
                              </IonSelectOption>
                            ))}
                          </IonSelect>
                        </IonItem>

                        <IonButton
                          expand="block"
                          size="default"
                          className="ion-margin-top"
                          disabled={
                            reasignandoId !== null ||
                            !nuevasJrv[veedor.perfil.id] ||
                            jrvDisponibles.length === 0
                          }
                          onClick={() => void reasignarVeedor(veedor)}
                        >
                          {reasignandoId === veedor.perfil.id ? (
                            <>
                              <IonSpinner name="crescent" />
                              <span className="ion-margin-start">
                                Reasignando...
                              </span>
                            </>
                          ) : (
                            'Reasignar veedor'
                          )}
                        </IonButton>
                      </IonLabel>
                    </IonItem>
                  );
                })}
              </IonList>
            )}

            <IonButton
              expand="block"
              fill="outline"
              onClick={() => void cargarDatos()}
              disabled={cargando || reasignandoId !== null}
            >
              Actualizar listado
            </IonButton>
          </IonCardContent>
        </IonCard>

        <IonToast
          isOpen={toast.abierto}
          message={toast.mensaje}
          color={toast.color}
          duration={3500}
          onDidDismiss={() =>
            setToast((actual) => ({ ...actual, abierto: false }))
          }
        />
      </IonContent>
    </IonPage>
  );
};

export default Veedores;
