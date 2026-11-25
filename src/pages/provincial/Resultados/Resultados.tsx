
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
  IonSearchbar,
  IonSelect,
  IonSelectOption,
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
import { detalleVotoService } from '../../../services/detalle-voto.service';
import { candidaturaService } from '../../../services/candidatura.service';

import type { Acta } from '../../../models/acta.model';
import type { Candidatura } from '../../../models/candidatura.model';
import type { DetalleVoto } from '../../../models/detalle-voto.model';

import './Resultados.css';

interface ActaTerritorial {
  acta: Acta;
  canton: string;
  parroquia: string;
  recinto: string;
}

interface ResultadoCandidatura {
  candidatura: Candidatura;
  votos: number;
}

interface ResultadoDignidad {
  dignidad: string;
  votosTotales: number;
  candidaturas: ResultadoCandidatura[];
  actasContabilizadas: number;
}

const Resultados: React.FC = () => {
  const navigate = useNavigate();
  const { perfil } = useAuth();

  const [actasTerritoriales, setActasTerritoriales] = useState<ActaTerritorial[]>([]);
  const [candidaturas, setCandidaturas] = useState<Candidatura[]>([]);
  const [detalles, setDetalles] = useState<DetalleVoto[]>([]);

  const [filtroCanton, setFiltroCanton] = useState('todos');
  const [filtroParroquia, setFiltroParroquia] = useState('todos');
  const [filtroDignidad, setFiltroDignidad] = useState('todas');
  const [busqueda, setBusqueda] = useState('');

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [cantonesDisponibles, setCantonesDisponibles] = useState<
    { id: string; nombre: string }[]
  >([]);

  const [parroquiasDisponibles, setParroquiasDisponibles] = useState<
    { id: string; nombre: string; cantonId: string }[]
  >([]);

  const cargarResultados = async () => {
    if (perfil?.rol !== 'coordinador_provincial') {
      setError('No tienes permisos para consultar los resultados provinciales.');
      setCargando(false);
      return;
    }

    if (!perfil.provincia_id) {
      setError('Tu perfil no tiene una provincia asignada.');
      setCargando(false);
      return;
    }

    try {
      setCargando(true);
      setError('');

      const cantones = await cantonService.listarPorProvincia(
        perfil.provincia_id
      );

      setCantonesDisponibles(
        cantones.map((canton) => ({
          id: canton.id,
          nombre: canton.nombre,
        }))
      );

      const parroquiasPorCanton = await Promise.all(
        cantones.map(async (canton) => {
          const parroquias = await parroquiaService.listarPorCanton(
            canton.id
          );

          return parroquias.map((parroquia) => ({
            id: parroquia.id,
            nombre: parroquia.nombre,
            cantonId: canton.id,
          }));
        })
      );

      const parroquias = parroquiasPorCanton.flat();
      setParroquiasDisponibles(parroquias);

      const recintosPorParroquia = await Promise.all(
        parroquias.map(async (parroquia) => {
          const recintos = await recintoService.listarPorParroquia(
            parroquia.id
          );

          const canton = cantones.find(
            (item) => item.id === parroquia.cantonId
          );

          return recintos.map((recinto) => ({
            recinto,
            canton: canton?.nombre ?? 'Sin cantón',
            parroquia: parroquia.nombre,
          }));
        })
      );

      const recintos = recintosPorParroquia.flat();

      const actasPorRecinto = await Promise.all(
        recintos.map(async (item) => {
          const jrvs = await jrvService.listarPorRecinto(item.recinto.id);

          const actasPorJrv = await Promise.all(
            jrvs.map((jrv) => actaService.listarPorJrv(jrv.id))
          );

          return actasPorJrv.flat().map((acta) => ({
            acta,
            canton: item.canton,
            parroquia: item.parroquia,
            recinto: item.recinto.nombre,
          }));
        })
      );

      const actas = actasPorRecinto.flat();

      const candidaturasActivas = await candidaturaService.listarActivas();

      const detallesPorActa = await Promise.all(
        actas.map((item) => detalleVotoService.listarPorActa(item.acta.id))
      );

      setActasTerritoriales(actas);
      setCandidaturas(candidaturasActivas);
      setDetalles(detallesPorActa.flat());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar los resultados provinciales.'
      );

      setActasTerritoriales([]);
      setCandidaturas([]);
      setDetalles([]);
    } finally {
      setCargando(false);
    }
  };

  useIonViewWillEnter(() => {
    void cargarResultados();
  });

  const parroquiasFiltradas = useMemo(() => {
    if (filtroCanton === 'todos') {
      return parroquiasDisponibles;
    }

    return parroquiasDisponibles.filter(
      (parroquia) => parroquia.cantonId === filtroCanton
    );
  }, [parroquiasDisponibles, filtroCanton]);

  const actasFiltradas = useMemo(() => {
    return actasTerritoriales.filter((item) => {
      const coincideCanton =
        filtroCanton === 'todos' ||
        cantonesDisponibles.find(
          (canton) => canton.nombre === item.canton
        )?.id === filtroCanton;

      const parroquia = parroquiasDisponibles.find(
        (p) => p.nombre === item.parroquia &&
          p.cantonId === cantonesDisponibles.find(
            (c) => c.nombre === item.canton
          )?.id
      );

      const coincideParroquia =
        filtroParroquia === 'todos' ||
        parroquia?.id === filtroParroquia;

      return coincideCanton && coincideParroquia;
    });
  }, [
    actasTerritoriales,
    filtroCanton,
    filtroParroquia,
    cantonesDisponibles,
    parroquiasDisponibles,
  ]);

  const resultados = useMemo(() => {
    const actasPorDignidad = new Map<string, Set<string>>();

    actasFiltradas.forEach(({ acta }) => {
      if (!actasPorDignidad.has(acta.dignidad)) {
        actasPorDignidad.set(acta.dignidad, new Set());
      }

      actasPorDignidad.get(acta.dignidad)?.add(acta.id);
    });

    const dignidades = Array.from(
      new Set(candidaturas.map((candidatura) => candidatura.dignidad))
    ).filter((dignidad) => actasPorDignidad.has(dignidad));

    return dignidades
      .filter(
        (dignidad) =>
          filtroDignidad === 'todas' || dignidad === filtroDignidad
      )
      .map((dignidad): ResultadoDignidad => {
        const candidaturasDignidad = candidaturas.filter(
          (candidatura) => candidatura.dignidad === dignidad
        );

        const actasDignidad = actasFiltradas.filter(
          (item) => item.acta.dignidad === dignidad
        );

        const idsActas = new Set(
          actasDignidad.map((item) => item.acta.id)
        );

        const detallesDignidad = detalles.filter(
          (detalle) => idsActas.has(detalle.acta_id)
        );

        const resultadosCandidaturas = candidaturasDignidad.map(
          (candidatura): ResultadoCandidatura => {
            const votos = detallesDignidad
              .filter(
                (detalle) =>
                  detalle.candidatura_id === candidatura.id
              )
              .reduce(
                (total, detalle) => total + detalle.cantidad_votos,
                0
              );

            return { candidatura, votos };
          }
        );

        resultadosCandidaturas.sort((a, b) => b.votos - a.votos);

        const votosTotales = resultadosCandidaturas.reduce(
          (total, item) => total + item.votos,
          0
        );

        const actasConDetalles = actasDignidad.filter((item) =>
          detallesDignidad.some(
            (detalle) => detalle.acta_id === item.acta.id
          )
        ).length;

        return {
          dignidad,
          votosTotales,
          candidaturas: resultadosCandidaturas,
          actasContabilizadas: actasConDetalles,
        };
      })
      .sort((a, b) => a.dignidad.localeCompare(b.dignidad));
  }, [actasFiltradas, candidaturas, detalles, filtroDignidad]);

  const resumen = useMemo(() => {
    const actasConVotos = new Set(
      detalles.map((detalle) => detalle.acta_id)
    );

    const actasDelFiltro = actasFiltradas.map((item) => item.acta.id);

    const actasContabilizadas = actasDelFiltro.filter(
      (id) => actasConVotos.has(id)
    ).length;

    const votosTotales = resultados.reduce(
      (total, resultado) => total + resultado.votosTotales,
      0
    );

    return {
      actasRegistradas: actasFiltradas.length,
      actasContabilizadas,
      votosTotales,
      dignidades: resultados.length,
    };
  }, [actasFiltradas, detalles, resultados]);

  const resultadosBusqueda = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();

    if (!termino) {
      return resultados;
    }

    return resultados.map((resultado) => ({
      ...resultado,
      candidaturas: resultado.candidaturas.filter((item) =>
        item.candidatura.nombre_candidato.toLowerCase().includes(termino)
      ),
    }));
  }, [resultados, busqueda]);

  const formatearNumero = (valor: number) =>
    new Intl.NumberFormat('es-EC').format(valor);

  const obtenerPorcentaje = (
    votos: number,
    total: number
  ) => {
    if (total === 0) return 0;
    return (votos / total) * 100;
  };

  const cambiarCanton = (valor: string) => {
    setFiltroCanton(valor);
    setFiltroParroquia('todos');
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

          <IonTitle>Resultados consolidados</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding resultados-content">
        <section className="resultados-intro">
          <h1>Consolidado electoral provincial</h1>
          <p>
            Consulta los votos registrados por candidatura y dignidad
            electoral dentro de tu provincia.
          </p>
        </section>

        {cargando && (
          <div className="resultados-loading">
            <IonSpinner name="crescent" />
            <p>Consolidando actas y detalles de votación...</p>
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
                onClick={() => void cargarResultados()}
              >
                Reintentar
              </IonButton>
            </IonCardContent>
          </IonCard>
        )}

        {!cargando && !error && (
          <>
            <div className="resultados-resumen">
              <IonCard>
                <IonCardContent>
                  <span>Actas registradas</span>
                  <strong>{formatearNumero(resumen.actasRegistradas)}</strong>
                </IonCardContent>
              </IonCard>

              <IonCard>
                <IonCardContent>
                  <span>Actas con votos</span>
                  <strong>{formatearNumero(resumen.actasContabilizadas)}</strong>
                </IonCardContent>
              </IonCard>

              <IonCard>
                <IonCardContent>
                  <span>Votos por candidaturas</span>
                  <strong>{formatearNumero(resumen.votosTotales)}</strong>
                </IonCardContent>
              </IonCard>

              <IonCard>
                <IonCardContent>
                  <span>Dignidades</span>
                  <strong>{formatearNumero(resumen.dignidades)}</strong>
                </IonCardContent>
              </IonCard>
            </div>

            <IonCard className="resultados-aviso">
              <IonCardContent>
                <IonBadge color="warning">Información de seguimiento</IonBadge>
                <p>
                  Estos valores corresponden a los detalles de votos
                  registrados en las actas disponibles. No representan una
                  proclamación oficial de resultados.
                </p>
              </IonCardContent>
            </IonCard>

            <section className="resultados-filtros">
              <h2>Filtros de consulta</h2>

              <IonItem>
                <IonLabel>Cantón</IonLabel>
                <IonSelect
                  value={filtroCanton}
                  interface="popover"
                  onIonChange={(event) =>
                    cambiarCanton(event.detail.value)
                  }
                >
                  <IonSelectOption value="todos">
                    Todos los cantones
                  </IonSelectOption>

                  {cantonesDisponibles.map((canton) => (
                    <IonSelectOption key={canton.id} value={canton.id}>
                      {canton.nombre}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>

              <IonItem>
                <IonLabel>Parroquia</IonLabel>
                <IonSelect
                  value={filtroParroquia}
                  interface="popover"
                  onIonChange={(event) =>
                    setFiltroParroquia(event.detail.value)
                  }
                >
                  <IonSelectOption value="todos">
                    Todas las parroquias
                  </IonSelectOption>

                  {parroquiasFiltradas.map((parroquia) => (
                    <IonSelectOption
                      key={parroquia.id}
                      value={parroquia.id}
                    >
                      {parroquia.nombre}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>

              <IonItem>
                <IonLabel>Dignidad</IonLabel>
                <IonSelect
                  value={filtroDignidad}
                  interface="popover"
                  onIonChange={(event) =>
                    setFiltroDignidad(event.detail.value)
                  }
                >
                  <IonSelectOption value="todas">
                    Todas las dignidades
                  </IonSelectOption>

                  {Array.from(
                    new Set(candidaturas.map((item) => item.dignidad))
                  ).map((dignidad) => (
                    <IonSelectOption key={dignidad} value={dignidad}>
                      {dignidad}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              </IonItem>

              <IonSearchbar
                value={busqueda}
                onIonInput={(event) =>
                  setBusqueda(event.detail.value ?? '')
                }
                placeholder="Buscar candidato"
                debounce={250}
              />
            </section>

            <section className="resultados-listado">
              <div className="resultados-seccion-titulo">
                <div>
                  <h2>Resultados por dignidad</h2>
                  <p>Votos acumulados por candidatura.</p>
                </div>

                <IonBadge color="primary">
                  {resultadosBusqueda.length} dignidades
                </IonBadge>
              </div>

              {resultados.length === 0 && (
                <IonCard>
                  <IonCardContent>
                    No existen resultados para los filtros seleccionados.
                  </IonCardContent>
                </IonCard>
              )}

              {resultadosBusqueda.map((resultado) => (
                <IonCard
                  key={resultado.dignidad}
                  className="resultado-dignidad-card"
                >
                  <IonCardContent>
                    <div className="resultado-dignidad-encabezado">
                      <div>
                        <h2>{resultado.dignidad}</h2>
                        <p>
                          {resultado.actasContabilizadas} actas con
                          detalles de votos
                        </p>
                      </div>

                      <div className="resultado-total">
                        <strong>
                          {formatearNumero(resultado.votosTotales)}
                        </strong>
                        <span>Votos</span>
                      </div>
                    </div>

                    {resultado.candidaturas.length === 0 && (
                      <p>
                        No se encontraron candidaturas para esta búsqueda.
                      </p>
                    )}

                    <IonList lines="none">
                      {resultado.candidaturas.map((item, index) => {
                        const porcentaje = obtenerPorcentaje(
                          item.votos,
                          resultado.votosTotales
                        );

                        return (
                          <IonItem
                            key={item.candidatura.id}
                            className="resultado-candidatura"
                          >
                            <IonLabel className="ion-text-wrap">
                              <div className="candidatura-encabezado">
                                <div className="candidatura-nombre">
                                  <IonBadge color={index === 0 ? 'success' : 'medium'}>
                                    {index + 1}
                                  </IonBadge>

                                  <h3>
                                    {item.candidatura.nombre_candidato}
                                  </h3>
                                </div>

                                <strong>
                                  {formatearNumero(item.votos)} votos
                                </strong>
                              </div>

                              <div className="candidatura-progreso">
                                <div
                                  className="candidatura-progreso-barra"
                                  style={{ width: `${porcentaje}%` }}
                                />
                              </div>

                              <div className="candidatura-pie">
                                <span>
                                  {porcentaje.toFixed(2)}%
                                </span>

                                {item.candidatura.numero_lista !== null && (
                                  <IonChip color="primary">
                                    Lista {item.candidatura.numero_lista}
                                  </IonChip>
                                )}
                              </div>
                            </IonLabel>
                          </IonItem>
                        );
                      })}
                    </IonList>
                  </IonCardContent>
                </IonCard>
              ))}
            </section>
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default Resultados;
