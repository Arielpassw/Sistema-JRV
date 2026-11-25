
import {
  IonAvatar,
  IonButton,
  IonCard,
  IonCardContent,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonIcon,
  IonPage,
  IonRow,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/react';

import {
  businessOutline,
  peopleOutline,
  clipboardOutline,
  gridOutline,
  personAddOutline,
  documentTextOutline,
  locationOutline,
  logOutOutline,
  shieldCheckmarkOutline,
  statsChartOutline,
  timeOutline,
} from 'ionicons/icons';

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { RolUsuario } from '../models';
import './Home.css';

interface Modulo {
  titulo: string;
  descripcion: string;
  ruta: string;
  icono: string;
}

const modulosPorRol: Record<RolUsuario, Modulo[]> = {
  coordinador_provincial: [
    {
      titulo: 'Recintos electorales',
      descripcion: 'Consultar y gestionar los recintos de la provincia.',
      ruta: '/provincia/recintos',
      icono: businessOutline,
    },
    {
      titulo: 'Coordinadores de recinto',
      descripcion: 'Administrar coordinadores y sus asignaciones.',
      ruta: '/provincia/coordinadores',
      icono: peopleOutline,
    },
    {
      titulo: 'Seguimiento provincial',
      descripcion: 'Supervisar el avance del registro de resultados.',
      ruta: '/provincia/seguimiento',
      icono: statsChartOutline,
    },
    {
      titulo: 'Resultados consolidados',
      descripcion: 'Consultar los votos acumulados por dignidad y candidatura.',
      ruta: '/provincia/resultados',
      icono: statsChartOutline,
    },
  ],

  coordinador_recinto: [
    {
      titulo: 'Juntas receptoras del voto',
      descripcion: 'Consultar las JRV correspondientes a tu recinto.',
      ruta: '/recinto/jrv',
      icono: gridOutline,
    },
    {
      titulo: 'Veedores de mesa',
      descripcion: 'Administrar veedores y asignarlos a las JRV.',
      ruta: '/recinto/veedores',
      icono: personAddOutline,
    },
    {
      titulo: 'Seguimiento del recinto',
      descripcion: 'Consultar el estado del registro de actas.',
      ruta: '/recinto/seguimiento',
      icono: statsChartOutline,
    },
    {
      titulo: 'Gestionar actas',
      descripcion: 'Consultar y corregir actas y fotografías del recinto.',
      ruta: '/recinto/actas',
      icono: documentTextOutline,
    },
  ],

  veedor_mesa: [
    {
      titulo: 'Mis juntas receptoras',
      descripcion: 'Consultar las JRV que tienes asignadas.',
      ruta: '/veedor/mis-jrv',
      icono: gridOutline,
    },
    {
      titulo: 'Registro de actas',
      descripcion: 'Registrar resultados y adjuntar evidencias.',
      ruta: '/veedor/actas',
      icono: documentTextOutline,
    },
  ],
};

const nombresRoles: Record<RolUsuario, string> = {
  coordinador_provincial: 'Coordinador provincial',
  coordinador_recinto: 'Coordinador de recinto',
  veedor_mesa: 'Veedor de mesa',
};

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { perfil, cerrarSesion } = useAuth();

  if (!perfil) {
    return null;
  }

  const rol = perfil.rol;
  const modulos = modulosPorRol[rol];

  const nombreCompleto = `${perfil.nombres} ${perfil.apellidos}`.trim();
  const iniciales = `${perfil.nombres.charAt(0)}${perfil.apellidos.charAt(0)}`.toUpperCase();

  const salir = async () => {
    await cerrarSesion();
    navigate('/login', { replace: true });
  };

  return (
    <IonPage>
      <IonHeader className="home-header">
        <IonToolbar>
          <IonTitle>
            <div className="home-brand">
              <IonIcon icon={shieldCheckmarkOutline} />
              <span>CNE Control Electoral</span>
            </div>
          </IonTitle>

          <IonButton
            slot="end"
            fill="clear"
            color="medium"
            onClick={salir}
            aria-label="Cerrar sesión"
          >
            <IonIcon slot="icon-only" icon={logOutOutline} />
          </IonButton>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="home-content">
        <div className="home-container">
          <section className="welcome-section">
            <div className="welcome-text">
              <IonText color="medium">
                <p className="welcome-eyebrow">PANEL PRINCIPAL</p>
              </IonText>

              <h1>Bienvenido/a</h1>
              <p className="welcome-description">
                Gestiona y supervisa las actividades del proceso electoral.
              </p>
            </div>

            <IonAvatar className="welcome-avatar">
              {perfil.foto_url ? (
                <img src={perfil.foto_url} alt="Foto de perfil" />
              ) : (
                <span>{iniciales || 'U'}</span>
              )}
            </IonAvatar>
          </section>

          <IonCard className="profile-card">
            <IonCardContent>
              <div className="profile-information">
                <div>
                  <p className="profile-label">Usuario autenticado</p>
                  <h2>{nombreCompleto}</h2>
                  <p className="profile-email">{perfil.correo}</p>
                </div>

                <div className="role-indicator">
                  <IonIcon icon={shieldCheckmarkOutline} />
                  <span>{nombresRoles[rol]}</span>
                </div>
              </div>
            </IonCardContent>
          </IonCard>

          <section className="modules-section">
            <div className="section-heading">
              <div>
                <h2>Mis módulos</h2>
                <p>Opciones disponibles según tu rol</p>
              </div>

              <span className="module-count">{modulos.length}</span>
            </div>

            <IonGrid className="modules-grid">
              <IonRow>
                {modulos.map((modulo) => (
                  <IonCol
                    key={modulo.ruta}
                    size="12"
                    sizeMd="6"
                    sizeLg="4"
                  >
                    <IonCard
                      button
                      className="module-card"
                      onClick={() => navigate(modulo.ruta)}
                    >
                      <IonCardContent>
                        <div className="module-icon">
                          <IonIcon icon={modulo.icono} />
                        </div>

                        <h3>{modulo.titulo}</h3>
                        <p>{modulo.descripcion}</p>

                        <div className="module-action">
                          <span>Ingresar al módulo</span>
                          <IonIcon icon={locationOutline} />
                        </div>
                      </IonCardContent>
                    </IonCard>
                  </IonCol>
                ))}
              </IonRow>
            </IonGrid>
          </section>

          <section className="security-note">
            <IonIcon icon={timeOutline} />
            <div>
              <strong>Sesión protegida</strong>
              <p>
                Tus opciones de acceso dependen de tu rol y de los permisos
                asignados en el sistema.
              </p>
            </div>
          </section>

          <div className="home-footer">
            <IonText color="medium">
              <p>Sistema de Control Electoral · CNE</p>
            </IonText>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Home;
