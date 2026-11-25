
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
import type { Perfil, Recinto } from '../../models';
import { cantonService } from '../../services/canton.service';
import { parroquiaService } from '../../services/parroquia.service';
import { recintoService } from '../../services/recinto.service';
import { asignacionService } from '../../services/asignacion.service';
import { perfilService } from '../../services/perfil.service';
import { usuarioService } from '../../services/usuario.service';

interface CoordinadorAsignado {
  perfil: Perfil;
  recinto: Recinto;
}

const Coordinadores: React.FC = () => {
  const { perfil: perfilActual } = useAuth();

  const [recintos, setRecintos] = useState<Recinto[]>([]);
  const [coordinadores, setCoordinadores] = useState<CoordinadorAsignado[]>([]);
  const [recintoId, setRecintoId] = useState('');

  const [cedula, setCedula] = useState('');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');

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
    if (!perfilActual?.provincia_id) {
      setError('Tu perfil no tiene una provincia asignada.');
      setCargando(false);
      return;
    }

    try {
      setCargando(true);
      setError('');

      // Obtener los recintos activos de la provincia del coordinador.
      const cantones = await cantonService.listarPorProvincia(
        perfilActual.provincia_id
      );

      const parroquiasPorCanton = await Promise.all(
        cantones.map((canton) =>
          parroquiaService.listarPorCanton(canton.id)
        )
      );

      const parroquias = parroquiasPorCanton.flat();

      const recintosPorParroquia = await Promise.all(
        parroquias.map((parroquia) =>
          recintoService.listarPorParroquia(parroquia.id)
        )
      );

      const listaRecintos = recintosPorParroquia
        .flat()
        .sort((a, b) => a.nombre.localeCompare(b.nombre));

      setRecintos(listaRecintos);

      // Consultar las asignaciones y perfiles de cada recinto.
      const asignacionesPorRecinto = await Promise.all(
        listaRecintos.map(async (recinto) => {
          const asignaciones =
            await asignacionService.listarPorRecinto(recinto.id);

          return asignaciones
            .filter(
              (asignacion) =>
                asignacion.activa &&
                asignacion.tipo_asignacion === 'recinto' &&
                asignacion.recinto_id === recinto.id
            )
            .map((asignacion) => ({
              perfilId: asignacion.perfil_id,
              recinto,
            }));
        })
      );

      const asignaciones = asignacionesPorRecinto.flat();

      const coordinadoresCargados = await Promise.all(
        asignaciones.map(async (asignacion) => {
          const perfil = await perfilService.obtenerPorId(
            asignacion.perfilId
          );

          if (
            !perfil ||
            !perfil.activo ||
            perfil.rol !== 'coordinador_recinto'
          ) {
            return null;
          }

          return {
            perfil,
            recinto: asignacion.recinto,
          };
        })
      );

      setCoordinadores(
        coordinadoresCargados.filter(
          (item): item is CoordinadorAsignado => item !== null
        )
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar los coordinadores.'
      );
    } finally {
      setCargando(false);
    }
  }, [perfilActual?.provincia_id]);

  useEffect(() => {
    void cargarDatos();
  }, [cargarDatos]);

  const limpiarFormulario = () => {
    setCedula('');
    setNombres('');
    setApellidos('');
    setTelefono('');
    setCorreo('');
    setRecintoId('');
  };

  const crearCoordinador = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!recintoId) {
      mostrarToast('Selecciona el recinto al que se asignará el coordinador.', 'warning');
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
        rol: 'coordinador_recinto',
        recintoId,
      });

      limpiarFormulario();

      mostrarToast(
        respuesta.mensaje || 'Coordinador de recinto creado correctamente.'
      );

      await cargarDatos();
    } catch (err) {
      mostrarToast(
        err instanceof Error
          ? err.message
          : 'No se pudo crear el coordinador.',
        'danger'
      );
    } finally {
      setCreando(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" />
          </IonButtons>
          <IonTitle>Coordinadores de recinto</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonText color="medium">
          <p>
            Administra los coordinadores asignados a los recintos de tu
            provincia.
          </p>
        </IonText>

        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Registrar coordinador</IonCardTitle>
          </IonCardHeader>

          <IonCardContent>
            <form onSubmit={crearCoordinador}>
              <IonItem>
                <IonLabel position="stacked">Cédula</IonLabel>
                <IonInput
                  value={cedula}
                  onIonInput={(event) =>
                    setCedula(String(event.detail.value ?? '').replace(/\D/g, '').slice(0, 10))
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
                  placeholder="Nombres del coordinador"
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
                  placeholder="Apellidos del coordinador"
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
                <IonLabel position="stacked">Recinto asignado</IonLabel>
                <IonSelect
                  value={recintoId}
                  onIonChange={(event) =>
                    setRecintoId(String(event.detail.value ?? ''))
                  }
                  placeholder="Selecciona un recinto"
                  interface="popover"
                  required
                >
                  {recintos.map((recinto) => (
                    <IonSelectOption key={recinto.id} value={recinto.id}>
                      {recinto.nombre}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>

              <IonButton
                expand="block"
                type="submit"
                className="ion-margin-top"
                disabled={creando || cargando || recintos.length === 0}
              >
                {creando ? (
                  <>
                    <IonSpinner name="crescent" />
                    <span className="ion-margin-start">Creando...</span>
                  </>
                ) : (
                  'Crear coordinador'
                )}
              </IonButton>
            </form>

            {recintos.length === 0 && !cargando && (
              <IonText color="warning">
                <p>No hay recintos activos disponibles en tu provincia.</p>
              </IonText>
            )}
          </IonCardContent>
        </IonCard>

        <IonCard>
          <IonCardHeader>
            <IonCardTitle>
              Coordinadores registrados ({coordinadores.length})
            </IonCardTitle>
          </IonCardHeader>

          <IonCardContent>
            {cargando ? (
              <div className="ion-text-center ion-padding">
                <IonSpinner name="crescent" />
                <p>Cargando información...</p>
              </div>
            ) : error ? (
              <IonText color="danger">
                <p>{error}</p>
              </IonText>
            ) : coordinadores.length === 0 ? (
              <IonText color="medium">
                <p>Aún no existen coordinadores asignados a los recintos.</p>
              </IonText>
            ) : (
              <IonList>
                {coordinadores.map(({ perfil, recinto }) => (
                  <IonItem key={`${perfil.id}-${recinto.id}`}>
                    <IonLabel className="ion-text-wrap">
                      <h2>
                        {perfil.nombres} {perfil.apellidos}
                      </h2>
                      <p>Cédula: {perfil.cedula}</p>
                      <p>Correo: {perfil.correo}</p>
                      <p>Recinto: {recinto.nombre}</p>
                      <p>
                        Estado: {perfil.activo ? 'Activo' : 'Inactivo'}
                      </p>
                    </IonLabel>
                  </IonItem>
                ))}
              </IonList>
            )}

            <IonButton
              expand="block"
              fill="outline"
              onClick={() => void cargarDatos()}
              disabled={cargando}
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

export default Coordinadores;
