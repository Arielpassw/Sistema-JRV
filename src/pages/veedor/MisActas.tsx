
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
    IonIcon,
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
import { documentTextOutline, refreshOutline } from 'ionicons/icons';
import { useAuth } from '../../contexts/AuthContext';
import { asignacionService } from '../../services/asignacion.service';
import { jrvService } from '../../services/jrv.service';
import { recintoService } from '../../services/recinto.service';
import { actaService } from '../../services/acta.service';
import { useNavigate } from 'react-router-dom';
import type { Acta, JRV, Recinto } from '../../models';

interface ActaConUbicacion {
    acta: Acta;
    jrv: JRV;
    recinto: Recinto;
}

const MisActas: React.FC = () => {
    const { perfil } = useAuth();
    const navigate = useNavigate();
    const [actas, setActas] = useState<ActaConUbicacion[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

    const cargarActas = useCallback(async () => {
        if (!perfil?.id) {
            setActas([]);
            setCargando(false);
            return;
        }

        try {
            setCargando(true);
            setError('');

            const asignaciones = await asignacionService.listarPorPerfil(perfil.id);

            const asignacionesJRV = asignaciones.filter(
                (asignacion) =>
                    asignacion.activa &&
                    asignacion.tipo_asignacion === 'jrv' &&
                    asignacion.jrv_id
            );

            const resultados = await Promise.all(
                asignacionesJRV.map(async (asignacion) => {
                    const jrv = await jrvService.obtenerPorId(asignacion.jrv_id!);

                    if (!jrv) {
                        return [];
                    }

                    const recinto = await recintoService.obtenerPorId(jrv.recinto_id);

                    if (!recinto) {
                        return [];
                    }

                    const actasJRV = await actaService.listarPorJrv(jrv.id);

                    return actasJRV.map((acta) => ({
                        acta,
                        jrv,
                        recinto,
                    }));
                })
            );

            const lista = resultados.flat();

            lista.sort(
                (a, b) =>
                    new Date(b.acta.creado_en).getTime() -
                    new Date(a.acta.creado_en).getTime()
            );

            setActas(lista);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'No se pudieron cargar las actas.'
            );
        } finally {
            setCargando(false);
        }
    }, [perfil?.id]);

    useIonViewWillEnter(() => {
        void cargarActas();
    });

    const formatoFecha = (fecha: string | null) => {
        if (!fecha) return 'Sin fecha de registro';

        return new Date(fecha).toLocaleString('es-EC', {
            dateStyle: 'medium',
            timeStyle: 'short',
        });
    };

    const colorEstado = (estado: string) => {
        switch (estado.toLowerCase()) {
            case 'validada':
            case 'aprobada':
                return 'success';
            case 'observada':
            case 'rechazada':
                return 'danger';
            case 'pendiente':
                return 'warning';
            default:
                return 'medium';
        }
    };

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonTitle>Mis actas</IonTitle>
                    <IonButton
                        slot="end"
                        fill="clear"
                        onClick={() => void cargarActas()}
                        aria-label="Actualizar actas"
                    >
                        <IonIcon icon={refreshOutline} />
                    </IonButton>
                </IonToolbar>
            </IonHeader>

            <IonContent className="ion-padding">
                <IonCard>
                    <IonCardHeader>
                        <IonCardTitle>Actas registradas</IonCardTitle>
                        <IonButton
                            expand="block"
                            onClick={() => navigate('/veedor/registrar-acta')}
                        >
                            Registrar nueva acta
                        </IonButton>
                    </IonCardHeader>
                    <IonCardContent>
                        Consulta las actas correspondientes a tus JRV asignadas.
                        <p>
                            <strong>Total de actas: {actas.length}</strong>
                        </p>
                    </IonCardContent>
                </IonCard>

                {cargando && (
                    <div className="ion-text-center ion-padding">
                        <IonSpinner name="crescent" />
                        <p>Cargando actas...</p>
                    </div>
                )}

                {!cargando && error && (
                    <IonCard color="danger">
                        <IonCardContent>
                            <IonText color="light">{error}</IonText>
                            <IonButton
                                expand="block"
                                fill="outline"
                                color="light"
                                onClick={() => void cargarActas()}
                            >
                                Reintentar
                            </IonButton>
                        </IonCardContent>
                    </IonCard>
                )}

                {!cargando && !error && actas.length === 0 && (
                    <IonCard>
                        <IonCardContent className="ion-text-center">
                            <IonIcon
                                icon={documentTextOutline}
                                size="large"
                                color="medium"
                            />
                            <h2>No hay actas registradas</h2>
                            <IonText color="medium">
                                Cuando registres un acta en una de tus JRV, aparecerá aquí.
                            </IonText>
                        </IonCardContent>
                    </IonCard>
                )}

                {!cargando && !error && actas.length > 0 && (
                    <IonList inset>
                        {actas.map(({ acta, jrv, recinto }) => (
                            <IonItem
                                key={acta.id}
                                lines="full"
                                button
                                detail
                                onClick={() => navigate(`/veedor/actas/${acta.id}`)}
                            >
                                <IonLabel className="ion-text-wrap">
                                    <h2>
                                        <strong>{acta.dignidad}</strong>
                                    </h2>
                                    <p>{recinto.nombre}</p>
                                    <p>JRV N.º {jrv.numero}</p>
                                    <p>
                                        Registrada: {formatoFecha(acta.fecha_registro)}
                                    </p>
                                    <p>Sufragantes: {acta.total_sufragantes}</p>
                                    <IonBadge color={colorEstado(acta.estado)}>
                                        {acta.estado}
                                    </IonBadge>
                                </IonLabel>
                            </IonItem>
                        ))}
                    </IonList>
                )}
            </IonContent>
        </IonPage>
    );
};

export default MisActas;
