# ADR-005: Zustand y React Context API permiten gestionar el estado de la aplicación

## Estado

Aceptado

## Fecha

2026-11-23

## Autor(es) y equipo

**Autores de la decisión:** Ariel Alexander Arias Toasa y Obando Suárez Dilan Artemio.

**Modalidad:** Decisión arquitectónica grupal, acordada durante la reunión de planificación del proyecto.

**Implementación en este repositorio:** [Repositorio](https://github.com/Arielpassw/Sistema-JRV)

Cada integrante realizará la implementación correspondiente en su propio repositorio de GitHub.

## Requisitos relacionados

- **R2.** Gestionar los usuarios y sus respectivos roles dentro de la aplicación.
- **R3.** Permitir la autenticación de usuarios y administrar el estado de sus sesiones.
- **R4.** Facilitar el acceso a la información correspondiente al coordinador provincial.
- **R5.** Gestionar las operaciones correspondientes al coordinador de recinto.
- **R6.** Permitir que los veedores accedan a las JRV asignadas y realicen el registro de información electoral.
- **R9.** Separar la presentación, la lógica de negocio y el acceso a los datos, manteniendo una arquitectura organizada.

## Contexto

La aplicación requiere administrar información que debe estar disponible en diferentes pantallas y componentes. Entre estos datos se encuentran la sesión del usuario autenticado, su perfil, su rol y otra información necesaria para controlar el acceso a las funcionalidades correspondientes.

Al desarrollar la aplicación con React, es necesario contar con mecanismos que permitan compartir y actualizar información entre distintos componentes sin tener que transmitirla manualmente mediante propiedades a través de múltiples niveles de la estructura.

Además, debido a las diferentes funcionalidades y roles de la aplicación, se necesita una administración organizada del estado global, que facilite el mantenimiento del código y permita separar los datos compartidos de la lógica específica de cada componente.

Por esta razón, se requiere seleccionar alternativas que permitan gestionar el estado de la aplicación de manera eficiente y mantener una estructura organizada.

## Alternativas consideradas

- **React Context API:** funcionalidad integrada en React que permite compartir información entre componentes mediante proveedores de contexto, evitando transmitir propiedades manualmente por múltiples niveles.

- **Zustand:** biblioteca de gestión de estado para React que permite crear almacenes centralizados (*stores*) y acceder a ellos desde diferentes componentes, sin necesidad de utilizar proveedores para cada almacén.

## Decisión

Se decidió utilizar **React Context API** de manera complementaria para gestionar el estado de la aplicación.

Ambas alternativas permitirán organizar la información compartida según su responsabilidad:

- **React Context API:** se utilizará para proporcionar información y servicios compartidos mediante proveedores de contexto, especialmente los relacionados con la autenticación y la sesión del usuario.

La información sensible y las operaciones de autenticación continuarán gestionándose mediante Supabase. 
React Context API únicamente permitirán administrar y compartir el estado necesario dentro de la interfaz; no reemplazarán los controles de seguridad del backend ni las políticas RLS de Supabase.

## Consecuencias

**Beneficios:**

- Permite compartir información entre componentes sin recurrir constantemente a Prop Drilling.
- Facilita la administración del estado de autenticación y la información del usuario.
- Permite centralizar estados globales mediante los almacenes de Zustand.
- Facilita compartir información y servicios mediante React Context API.
- Reduce la duplicación de lógica relacionada con el estado compartido.
- Permite separar las responsabilidades de administración del estado.

**Obligaciones y limitaciones:**

- Se debe determinar qué información corresponde administrar mediante Context API 
- Se debe evitar almacenar información innecesaria en el estado global.
- Los cambios en los estados deben gestionarse correctamente para evitar renderizados innecesarios.
- La gestión de sesiones debe mantenerse sincronizada con Supabase Auth.
- Es necesario mantener una estructura organizada para facilitar el mantenimiento de los contextos y almacenes.

**Riesgos:**

- Una utilización excesiva del estado global puede dificultar el mantenimiento de la aplicación.
- Si no se controla correctamente el estado de autenticación, podrían presentarse inconsistencias en la navegación o en la visualización de información del usuario.
- Una configuración incorrecta de los almacenes o proveedores puede ocasionar problemas al compartir y actualizar información.

## Verificación

La decisión se puede verificar mediante los siguientes elementos y pruebas:

**Archivos de referencia:**

- `src/contexts/`: directorio destinado a los contextos de la aplicación.
- `AuthContext`: contexto para proporcionar información relacionada con la autenticación y sesión del usuario, si se mantiene esta organización.
- `src/main.tsx` o el punto de entrada correspondiente: comprobar la configuración de los proveedores de contexto.

**Pruebas funcionales:**

- Comprobar que la información proporcionada mediante React Context API puede consultarse desde diferentes componentes.
- Comprobar que los cambios en la sesión se reflejan correctamente en los componentes consumidores.
- Verificar que cerrar sesión actualiza el estado correspondiente de la aplicación.
- Comprobar que los componentes pueden acceder al estado compartido sin transmitir manualmente las mismas propiedades a través de múltiples niveles.
- Verificar que la información administrada por Context API 

**Comandos de verificación:**

```bash
npm install
ionic build
ionic serve
```

## Uso de IA

**Herramienta utilizada:** ChatGPT.

**Consulta realizada:** análisis de alternativas para administrar el estado global de una aplicación desarrollada con React, considerando React Context API y Zustand.

**Respuesta sugerida:** se analizaron las características, ventajas y limitaciones de las alternativas, considerando la necesidad de compartir información de autenticación, sesión, perfil y otros estados globales entre diferentes componentes.

**Aceptación:** ambos integrantes estuvieron de acuerdo con la utilización de React Context API, considerando que permiten complementar la administración del estado global.

**Verificación humana:** el autor de este repositorio verificará la implementación de los contextos, así como la sincronización del estado de autenticación con Supabase.

## Trazabilidad

- **Repositorio de implementación:**  
https://github.com/Arielpassw/Sistema-JRV

- **Commit de documentación ADR:** [469d9fc — Documentación ADR](https://github.com/Arielpassw/Sistema-JRV/commit/469d9fc)

- **Commit de implementación:** pendiente de identificar el commit específico que respalde la implementación de Zustand y React Context API.

La decisión arquitectónica fue grupal; la implementación documentada en este repositorio corresponde a Ariel Alexander Arias Toasa.

## Consenso del equipo

**Integrantes participantes:**

- Ariel Alexander Arias Toasa.
- Obando Suárez Dilan Artemio.

**Argumentos expuestos:** se consideró necesario disponer de mecanismos que permitan compartir información y administrar el estado global de la aplicación.React Context API facilita proporcionar información y servicios compartidos entre componentes. 

**Objeciones:** no hubo objeciones, ya que ambos integrantes estuvieron de acuerdo con lo expuesto y con las alternativas presentadas.

**Acuerdo final:** ambos integrantes acordaron utilizar React Context API para gestionar el estado de la aplicación.

**Referencia del video:** 12:00 – 14:42.

---

## A.5 Acta de consolidación

**Integrantes:** Ariel Alexander Arias Toasa y Obando Suárez Dilan Artemio.

**Fecha de reunión:** 23/11/2026.

**Enlace al video:** [Ver video en YouTube](https://youtu.be/acl_hGWJ8hk).

Todos los integrantes reconocen esta línea base y documentarán cualquier sustitución mediante un nuevo ADR.