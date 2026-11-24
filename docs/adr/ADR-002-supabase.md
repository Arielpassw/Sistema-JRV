# ADR-002: Supabase centraliza los servicios backend de la aplicación

## Estado

Aceptado.

## Fecha

2026-11-23

## Autor(es) y equipo

**Autores de la decisión:** Ariel Alexander Arias Toasa y Obando Suárez Dilan Artemio.

**Modalidad:** Decisión arquitectónica grupal, acordada durante la reunión de planificación del proyecto.

**Implementación en este repositorio:** [Repositorio](https://github.com/Arielpassw/Sistema-JRV)

Cada integrante realizará la implementación correspondiente en su propio repositorio de GitHub.

## Requisitos relacionados

- **R2:** Administración y registro de usuarios según sus roles.
- **R3:** Autenticación, inicio de sesión y gestión de credenciales.
- **R4-R6:** Gestión de recintos, JRV, asignaciones y registro de resultados electorales.
- **R7:** Almacenamiento de fotografías y datos de ubicación.
- **R8:** Persistencia de información y aplicación de controles de seguridad.
- **R9:** Separación entre presentación, lógica de negocio y acceso a datos.

## Contexto

El Sistema de Control Electoral CNE necesita una infraestructura backend que permita gestionar usuarios, almacenar información electoral, administrar relaciones entre entidades y proteger los datos según los permisos de cada usuario.

La solución debe proporcionar autenticación, persistencia de información, almacenamiento de archivos y mecanismos de seguridad para restringir el acceso a los recursos.

También se consideran criterios como la facilidad de integración con Ionic React, disponibilidad de servicios en la nube, escalabilidad, mantenimiento y herramientas para administrar la información.

Se requiere evitar que la lógica de acceso a los datos dependa exclusivamente de validaciones realizadas desde la interfaz móvil.

## Alternativas consideradas

- **Firebase:** plataforma de Google que ofrece autenticación, bases de datos, almacenamiento y otros servicios administrados. Se consideró por sus herramientas para aplicaciones móviles, aunque su enfoque de bases de datos NoSQL no se ajusta de manera tan directa al modelo relacional requerido.
- **Supabase:** plataforma backend basada en PostgreSQL que ofrece autenticación, almacenamiento de archivos, APIs y funcionalidades en tiempo real. Permite gestionar información relacional y aplicar políticas de seguridad directamente en la base de datos.

## Decisión

Se selecciona **Supabase** como plataforma backend principal del Sistema de Control Electoral CNE.

La configuración contempla los siguientes servicios:

- **Supabase Auth:** autenticación y administración de sesiones de usuarios.
- **Supabase Database:** persistencia de la información electoral mediante PostgreSQL.
- **Supabase Storage:** almacenamiento privado de fotografías de las actas.
- **Row Level Security (RLS):** políticas de seguridad para controlar el acceso a los registros según el usuario, su rol y sus asignaciones.
- **Supabase Realtime:** capacidad para recibir cambios de información en tiempo real cuando los módulos lo requieran.
- **Supabase Edge Functions:** posibilidad de ejecutar operaciones administrativas o sensibles en el servidor cuando sea necesario.

La aplicación se conectará mediante la biblioteca oficial `@supabase/supabase-js`.

Las credenciales administrativas y las claves secretas no se expondrán en el cliente móvil. La aplicación utilizará únicamente la clave pública correspondiente y las restricciones de seguridad configuradas en Supabase.

## Consecuencias

### Beneficios

- Centraliza los principales servicios backend en una misma plataforma.
- Proporciona una base de datos relacional basada en PostgreSQL.
- Facilita la autenticación y administración de usuarios.
- Permite proteger los registros mediante políticas RLS.
- Ofrece almacenamiento de archivos para las fotografías de las actas.
- Facilita la integración con Ionic React mediante su biblioteca JavaScript.
- Reduce la necesidad de desarrollar y mantener una API propia para las operaciones habituales.

### Obligaciones

- Configurar correctamente las políticas RLS de todas las tablas.
- Mantener protegidas las credenciales y claves administrativas.
- Definir relaciones y restricciones de integridad en PostgreSQL.
- Administrar los permisos de acceso al almacenamiento privado.
- Gestionar adecuadamente los errores de conexión y autenticación.
- Documentar las operaciones que requieran funciones del lado del servidor.

### Limitaciones y riesgos

- La disponibilidad del backend depende de la conectividad y del servicio de Supabase.
- Una configuración incorrecta de las políticas RLS podría permitir accesos no autorizados o bloquear operaciones legítimas.
- Se deben considerar los límites de uso y las condiciones del plan contratado.
- Las operaciones administrativas sensibles requieren controles adicionales y no deben ejecutarse exponiendo credenciales privilegiadas en la aplicación móvil.

## Verificación

La decisión se verifica mediante los siguientes elementos:

**Archivos del proyecto:**

- `src/config/supabase.ts`: configuración del cliente de Supabase.
- `.env.example`: variables de entorno necesarias para establecer la conexión.
- `.gitignore`: exclusión de archivos que contienen credenciales locales.
- `package.json`: dependencia `@supabase/supabase-js`.

**Verificaciones realizadas en Supabase:**

- Creación de las tablas correspondientes al modelo electoral.
- Activación de Row Level Security en las tablas.
- Configuración de políticas de acceso según roles y asignaciones.
- Creación de funciones y triggers para validar operaciones.
- Creación del bucket privado `actas` para almacenar fotografías.
- Configuración de políticas de acceso al almacenamiento.

**Comandos de verificación:**

```powershell
npm install
ionic serve
```

La conexión debe comprobarse desde la aplicación utilizando las credenciales locales y las operaciones autorizadas para el usuario autenticado.

Las pruebas funcionales completas de todos los roles y módulos deberán registrarse durante la integración de la aplicación.

## Uso de IA

- **Herramienta:** ChatGPT.
- **Consulta realizada:** análisis de alternativas backend para una aplicación móvil de control electoral que requiere autenticación, base de datos relacional, almacenamiento de fotografías y control de acceso por roles.
- **Respuesta sugerida:** utilizar Supabase por su integración con PostgreSQL, autenticación, almacenamiento y políticas RLS.
- **Aceptación:** ambos integrantes acordaron utilizar Supabase durante la reunión de definición arquitectónica.
- **Verificación humana:** el autor de este repositorio configuró el proyecto Supabase, creó las tablas, funciones, triggers, políticas RLS y el almacenamiento privado, verificando su configuración mediante consultas y pruebas en el panel de Supabase.

## Trazabilidad

- **Commit de documentación ADR:** [469d9fc — Documentación ADR](https://github.com/Arielpassw/Sistema-JRV/commit/469d9fc)
- **Commit de implementación:** [`cc00d88` — Modelos TypeScript de tablas electorales](https://github.com/Arielpassw/Sistema-JRV/commit/cc00d88).
[1c30d20 - Implementar servicios de Supabase](https://github.com/Arielpassw/Sistema-JRV/commit/1c30d20)
- **Repositorio de implementación:** https://github.com/Arielpassw/Sistema-JRV

La configuración del backend y la base de datos fue realizada individualmente por Ariel Alexander Arias Toasa en este repositorio.

## Consenso del equipo

**Integrantes:**

- Ariel Alexander Arias Toasa.
- Obando Suárez Dilan Artemio.

**Argumentos expuestos:** durante la reunión se analizaron las necesidades del sistema relacionadas con autenticación, persistencia de información, almacenamiento de fotografías y seguridad de los datos. Se compararon las alternativas disponibles y su adecuación a la arquitectura de la aplicación.

**Objeciones:** no hubo objeciones, ya que ambos integrantes estuvieron de acuerdo con lo expuesto y con las alternativas presentadas.

**Acuerdo final:** ambos integrantes acordaron utilizar Supabase como plataforma backend principal del Sistema de Control Electoral CNE.

**Minuto del video:** 04:01 – 06:22.

---

## A.5 Acta de consolidación

**Integrantes:** Ariel Alexander Arias Toasa y Obando Suárez Dilan Artemio.

**Fecha de reunión:** 23/11/2026.

**Enlace al video:** [Ver video en YouTube](https://youtu.be/acl_hGWJ8hk).

Ambos integrantes reconocen esta decisión como parte de la línea base arquitectónica del Sistema de Control Electoral CNE. Cualquier sustitución deberá documentarse mediante un nuevo ADR.