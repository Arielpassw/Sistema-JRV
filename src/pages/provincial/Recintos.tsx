
import { useEffect, useState } from 'react';

import {
  IonButton,
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
} from '@ionic/react';

import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';
import { cantonService } from '../../services/canton.service';
import { parroquiaService } from '../../services/parroquia.service';
import { recintoService } from '../../services/recinto.service';

import type { Recinto } from '../../models';

const Recintos: React.FC = () => {
  const navigate = useNavigate();
  const { perfil } = useAuth();

  const [recintos, setRecintos] = useState<Recinto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const cargarRecintos = async () => {
      if (!perfil?.provincia_id) {
        setError('Tu perfil no tiene una provincia asignada.');
        setCargando(false);
        return;
      }

      try {
        setCargando(true);
        setError('');

        // 1. Obtener los cantones de la provincia del coordinador.
        const cantones = await cantonService.listarPorProvincia(
          perfil.provincia_id
        );

        // 2. Obtener las parroquias de esos cantones.
        const parroquiasPorCanton = await Promise.all(
          cantones.map((canton) =>
            parroquiaService.listarPorCanton(canton.id)
          )
        );

        const parroquias = parroquiasPorCanton.flat();

        // 3. Obtener los recintos de esas parroquias.
        const recintosPorParroquia = await Promise.all(
          parroquias.map((parroquia) =>
            recintoService.listarPorParroquia(parroquia.id)
          )
        );

        const resultado = recintosPorParroquia
          .flat()
          .sort((a, b) => a.nombre.localeCompare(b.nombre));

        setRecintos(resultado);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'No se pudieron cargar los recintos.'
        );
      } finally {
        setCargando(false);
      }
    };

    void cargarRecintos();
  }, [perfil?.provincia_id]);

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

          <IonTitle>Recintos electorales</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonCard>
          <IonCardContent>
            <h2>Recintos de mi provincia</h2>
            <p>
              Consulta los recintos electorales disponibles dentro de tu
              ámbito provincial.
            </p>

            <IonText color="primary">
              <h1>{cargando ? '—' : recintos.length}</h1>
            </IonText>
            <IonText color="medium">
              <p>Recintos encontrados</p>
            </IonText>
          </IonCardContent>
        </IonCard>

        {cargando && (
          <div className="ion-text-center ion-padding">
            <IonSpinner name="crescent" />
            <p>Cargando recintos...</p>
          </div>
        )}

        {!cargando && error && (
          <IonCard color="danger">
            <IonCardContent>{error}</IonCardContent>
          </IonCard>
        )}

        {!cargando && !error && recintos.length === 0 && (
          <IonCard>
            <IonCardContent>
              No existen recintos activos registrados en tu provincia.
            </IonCardContent>
          </IonCard>
        )}

        {!cargando && !error && recintos.length > 0 && (
          <IonList inset>
            {recintos.map((recinto) => (
              <IonItem key={recinto.id}>
                <IonLabel>
                  <h2>{recinto.nombre}</h2>
                  <p>
                    Código: {recinto.codigo || 'No registrado'}
                  </p>
                  <p>
                    Dirección: {recinto.direccion || 'No registrada'}
                  </p>
                </IonLabel>
              </IonItem>
            ))}
          </IonList>
        )}
      </IonContent>
    </IonPage>
  );
};

export default Recintos;
