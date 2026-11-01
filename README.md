# Kai Señas · Frontend

Aplicación web para aprender y practicar señas con la cámara, consultar el progreso personal y administrar ejercicios y versiones de modelos.

El navegador utiliza **MediaPipe** para localizar las manos y **TensorFlow.js** para clasificar las poses con los modelos disponibles. **Supabase** gestiona las cuentas, los roles, el catálogo, el progreso y el flujo de revisión de modelos.

> El reconocimiento depende del modelo, las capturas de entrenamiento y las condiciones de la cámara. La confianza de una predicción no equivale a una medida de dominio de la lengua de señas.

## Estado del proyecto

| Área | Estado |
|---|---|
| Inicio, cuenta y progreso | Disponibles |
| Prácticas de vocales, abecedario y números | Disponibles según el modelo y el catálogo |
| Matemáticas | Experimental; fuera del promedio durante alpha y beta |
| Captura de muestras | Disponible dentro de Administración |
| Subida, revisión y publicación de modelos | Conectadas a Supabase |
| Competición | Vista informativa; ranking todavía no habilitado |
| Temporadas semanales y personalizadas | Reglas acordadas; implementación pendiente |

**Rama de integración del trabajo actual:** `actualizacion`. Las funciones disponibles pueden diferir respecto a `main`.

## Tecnologías

Versiones declaradas en el proyecto:

- React 18.3 y TypeScript 5.8.
- Vite 7.1.
- React Router 7.8.
- MediaPipe Tasks Vision 0.10.
- TensorFlow.js 4.22.
- Supabase JS **2.118.0**, fijada a esa versión.
- CSS Modules y estilos globales; Bootstrap figura entre las dependencias.

`package-lock.json` determina las versiones concretas instaladas. Firebase permanece como dependencia heredada; la conexión actual de cuentas y datos utiliza Supabase.

## Requisitos

- Git.
- Node.js compatible con Vite: `^20.19.0 || >=22.12.0`. En las verificaciones del proyecto se utilizó Node.js 24.22.1. El equipo debe acordar y usar una misma versión compatible.
- npm.
- Navegador moderno con acceso a cámara.
- Conexión a Internet para Supabase y para los recursos externos de MediaPipe.

La cámara requiere permiso del navegador y un contexto seguro: `localhost` durante el desarrollo o HTTPS en el despliegue. Abrir la web por una dirección HTTP de la red local puede impedir su acceso.

**No hace falta Python ni ejecutar el entrenador para iniciar el frontend.** El entrenamiento se realiza en un repositorio separado.

## Instalación y ejecución

```powershell
git clone https://github.com/seblas28/Kai-senas-app.git
cd Kai-senas-app
git switch actualizacion
npm ci
npm run dev
```

Abre la dirección que muestre Vite, normalmente `http://localhost:5173`.

Si el repositorio ya está clonado, ejecuta los comandos desde la carpeta que contiene `package.json`. En la estructura local del proyecto puede llamarse `lenguaje-senas`.

`npm ci` instala lo registrado en el lockfile. No borres `package-lock.json` para resolver un error de instalación sin revisar primero su causa.

### Comandos disponibles

| Comando | Uso |
|---|---|
| `npm ci` | Instalar las dependencias del lockfile |
| `npm run dev` | Iniciar el servidor de desarrollo |
| `npm test` | Ejecutar las pruebas automatizadas |
| `npm run build` | Comprobar TypeScript y generar `dist/` |
| `npm run preview` | Revisar localmente una compilación ya generada |

`preview` sirve para comprobar el resultado compilado; no sustituye la configuración del alojamiento de producción.

## Conexión con Supabase

La inicialización está en `src/lib/supabase.ts`. El código contiene valores publicables predeterminados del proyecto compartido **Kai Señas**. Si no defines variables, el frontend se conecta a ese proyecto.

Para configurar otro entorno, crea `.env.local` en la raíz:

```dotenv
VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=TU_CLAVE_PUBLICABLE
```

Solicita al responsable la URL y la clave **publicable** del entorno correspondiente. Reinicia Vite después de cambiar estas variables.

- `.env.local` está excluido por `.gitignore`.
- Las variables `VITE_*` llegan al navegador. Nunca pongas contraseñas, una clave secreta o `service_role` en ellas.
- Los permisos efectivos se aplican en Supabase con Auth, roles y RLS; no dependen de ocultar botones.
- `npm ci` no crea la base de datos ni sus políticas. Para un proyecto Supabase nuevo hay que aplicar el esquema y los permisos acordados con el responsable.

### Confirmación de correo y recuperación

El responsable de Supabase debe configurar las URLs permitidas de Auth para que los enlaces regresen a `/login`:

```text
http://localhost:5173/login
http://127.0.0.1:5173/login
https://DOMINIO-DEL-DESPLIEGUE/login
```

La Site URL debe corresponder al entorno configurado. Si Vite usa otro puerto, coordina su incorporación a las URLs permitidas antes de probar los correos. Las cuentas nuevas reciben el rol `user`; registrarse no concede permisos administrativos.

## Recorrido de la aplicación

### Aprendices e invitados

1. Explorar los cursos desde Inicio.
2. Seleccionar una práctica disponible.
3. Encender la cámara y seguir la referencia del ejercicio.
4. Mantener la seña para completar la validación sostenida.
5. Consultar resultados e historial desde Mi Progreso.

Se puede practicar como invitado. Las nuevas prácticas de una cuenta se sincronizan entre dispositivos cuando hay conexión.

La validación actual requiere una predicción correcta sostenida durante aproximadamente **1,5 segundos**, con confianza mínima del **97 %** y varios frames distintos. Una detección aislada no completa el ejercicio. Cambiar a otra pestaña durante la validación reinicia esa racha.

### Cámara y encuadre

- Video y canvas comparten proporción, ajuste y espejo; el encuadre utiliza las dimensiones reales del stream.
- Se contemplan cambios entre 4:3, 16:9 y otras proporciones, sin forzar que todas las cámaras trabajen a 720p.
- El laboratorio permite detectar hasta dos manos. Para una seña de una mano, captura una sola mano a la vez; entrena ejemplos de derecha e izquierda si quieres admitir ambas.
- Los operadores de matemáticas utilizan referencias de dos manos.
- La voz y su botón se retiraron del frontend.

El encuadre alineado no garantiza que el modelo reconozca correctamente todas las cámaras o personas. Comprueba también distancia, iluminación y calidad de los datos.

## Roles y permisos

| Acción | Usuario | Admin | Superadmin |
|---|---|---|---|
| Practicar y consultar su progreso | Sí | Sí | Sí |
| Editar su nombre visible | Sí | Sí | Sí |
| Capturar muestras | No | Sí | Sí |
| Cambiar mantenimiento y visibilidad | No | Sí | Sí |
| Subir modelos a revisión | No | Sí | Sí |
| Aprobar o rechazar modelos | No | No | Sí |
| Publicar o restaurar una versión aprobada | No | No | Sí |
| Asignar roles desde este panel | No | No | No |

Los roles se consultan desde `user_roles`. La asignación inicial o modificación de roles debe realizarse mediante el acceso confiable al proyecto, nunca alterando datos del navegador.

Al recuperar el foco de la ventana se revisan los permisos. El laboratorio mantiene su estado durante la revisión de un administrador ya conocido; perder el permiso o cerrar sesión vuelve a bloquear el acceso.

## Progreso y sincronización

- Invitado: progreso guardado en este navegador.
- Cuenta: historial remoto propio y cola local de sesiones pendientes de sincronizar.
- «Sincronizar ahora» permite reintentar los envíos pendientes.
- La importación de resúmenes de invitado es explícita. Se conserva como historial **sin validar**: no completa automáticamente las señas.
- No borres los datos del sitio mientras tengas sesiones pendientes que quieras conservar.

El promedio personal da el mismo peso a cada categoría elegible. Las señas sin validación sostenida cuentan como cero. **Matemáticas queda excluida durante alpha y beta.**

El porcentaje completado de una tarjeta indica cuántas señas se validaron; es distinto del promedio de sus puntuaciones. El progreso personal no se publica automáticamente como puntuación competitiva.

## Administración, captura y modelos

Administración reúne mantenimiento, captura de muestras, modelos y consulta de permisos.

### Capturar datos

1. Elegir el módulo desde Administración → Captura de muestras.
2. Seleccionar la etiqueta y capturar frames nuevos.
3. Descargar el dataset JSON.
4. Limpiar las muestras de la pantalla antes de comenzar otra sesión independiente.

Las muestras permanecen en memoria mientras la pantalla sigue montada. **Descarga antes de recargar, cerrar la pestaña o cambiar de módulo.** La corrección del foco no agrega almacenamiento persistente de capturas.

Incluye `Nulo` y sesiones independientes. Copiar un dataset no agrega diversidad. La auditoría del entrenador comprueba estructura y duplicados; la calidad se evalúa con pruebas separadas.

### Entrenar y publicar

El entrenamiento local vive en [lenguaje-senas-ia](https://github.com/seblas28/lenguaje-senas-ia), con su propia guía y entorno Python. Puede utilizarse su interfaz de escritorio; el frontend no inicia el entrenamiento en un servidor.

```text
Capturar → descargar datasets → auditar → entrenar localmente
        → subir una versión → revisar → aprobar → publicar
```

- Se admite un paquete individual **`model.kai.json`**, generado por el entrenador local.
- También se admite una exportación TensorFlow.js compatible: `model.json`, etiquetas y todos los `.bin` asociados.
- El formato actual exige 126 coordenadas, etiquetas únicas con `Nulo`, pesos float32 y una arquitectura de capas densas compatible. Límite de paquete: 2 MiB.
- No se suben `.h5`, `.keras`, ZIP, datasets ni entornos virtuales al panel de modelos.
- Una subida crea una versión pendiente. Aprobarla todavía no la activa.
- Solo el superadmin publica o restaura una versión aprobada.
- Publicar actualiza la cobertura de señas, pero conserva mantenimiento y visibilidad. Revisa las señas nuevas antes de activarlas.
- Las prácticas nuevas cargan la versión publicada. Si no existe una para el módulo, utilizan el modelo base incluido en `public/`.

No uses una copia manual del entrenador a `public/` como sustituto del flujo de aprobación. No subas un modelo solo por tener un porcentaje alto: revisa test, matriz de confusión, Nulo y capturas nuevas ajenas al ajuste del modelo. J/Z siguen pendientes de reconocimiento temporal.

## Rutas principales

| Ruta | Pantalla |
|---|---|
| `/` | Inicio y cursos |
| `/login` | Cuenta, ingreso, registro y recuperación |
| `/progreso` | Progreso personal |
| `/ranking` | Vista de competición en preparación |
| `/practice/:category` | Selección de seña |
| `/practice/:category/:sign` | Práctica de una seña |
| `/practice/matematicas` | Calculadora experimental |
| `/administracion` | Panel para admin/superadmin |
| `/administracion?seccion=captura` | Selección del módulo de captura |
| `/administracion/captura/:category` | Laboratorio de captura |
| `/training/:category` | Enlace antiguo; redirige al laboratorio |

Identificadores de módulo: `vocales`, `abecedario`, `numeros`, `matematicas`.

## Organización del código

```text
src/
  assets/          Imágenes y referencias de señas
  components/      Navegación, controles, prácticas y control de acceso
  context/         Sesión, catálogo, progreso y tema
  data/            Definiciones de categorías y señas
  domain/          Validación, cálculos, cola y formato de modelos
  hooks/           Comportamiento compartido, incluido el encuadre de video
  lib/             Cliente Supabase, tipos y carga de modelos
  pages/           Páginas agrupadas en carpetas propias
  utils/           Utilidades
public/            Modelos base y recursos servidos directamente
tests/             Pruebas automatizadas
```

`ModuleGate` protege las rutas de práctica/captura. Los proveedores de contexto separan los datos por cuenta. Los modelos y etiquetas deben mantener el mismo orden de salida.

## Trabajo en equipo

Crear una rama para cada tarea a partir de `actualizacion`, por ejemplo:

```powershell
git switch actualizacion
git pull --ff-only
git switch -c feat/mejora-descripcion
```

Antes de integrar:

1. Revisar `git diff` y comprobar que el cambio corresponde a la tarea.
2. Ejecutar `npm test` y `npm run build`.
3. Probar las pantallas afectadas; los cambios de cámara requieren comprobación física además de las pruebas de código.
4. Probar los roles relevantes si se modifican pantallas administrativas.
5. Crear un commit y una pull request hacia la rama acordada, explicando el cambio y cómo se verificó.

No subir `node_modules/`, `dist/`, `.env.local`, credenciales, entornos Python ni datasets de personas al frontend. Conservar `package-lock.json` en los cambios de dependencias. Evitar editar directamente `node_modules`: sus archivos se regeneran al instalar.

## Despliegue

La salida de producción es `dist/`. El repositorio incluye `vercel.json` con la redirección de rutas de la SPA hacia `index.html`.

El responsable del despliegue debe comprobar las variables publicables de Supabase, las URLs de Auth del dominio real, HTTPS y la carga de recursos externos de MediaPipe. Recargar directamente una ruta como `/progreso` debe funcionar.

Cambiar código local no actualiza automáticamente una versión ya desplegada. El despliegue debe seguir el flujo acordado por el equipo.

## Problemas frecuentes

| Síntoma | Comprobar |
|---|---|
| `ENOENT ... package.json` | Ejecutar npm desde la raíz del frontend, no desde `system32` u otra carpeta |
| Falla la instalación | Revisar el primer error, versión de Node y lockfile; usar `npm ci` con el servidor detenido |
| Error dentro de Rollup/esbuild | Compartir la traza completa; el nombre de la dependencia no identifica por sí solo la causa |
| `checksum`, `zlib`, `TAR_ENTRY_INVALID` | La instalación no es válida; resolver la integridad antes de compilar |
| Avisos `use client` ignorado o paquete grande | Revisar si el proceso termina correctamente; esos avisos conocidos por sí solos no significan fallo |
| Cámara sin acceso | Permisos, HTTPS/localhost y disponibilidad del dispositivo |
| Puntos desalineados | Comprobar la versión con `useVideoAspectRatio` y probar el encuadre con la cámara real |
| Práctica bloqueada | Catálogo, mantenimiento, visibilidad y cobertura del modelo |
| Administración no aparece | Sesión, rol asignado y resultado de la consulta de permisos |
| Confirmación o recuperación no regresa a la web | URLs permitidas de Supabase y dirección/puerto del frontend |
| Progreso pendiente | Conexión y mensaje de sincronización; conservar los datos locales mientras se resuelve |

## Pendientes principales

- Implementar el ranking competitivo con evaluaciones apropiadas; las prácticas actuales son resultados personales enviados por el cliente.
- Implementar temporadas semanales automáticas de lunes a domingo, horario de Lima.
- Permitir a admin/superadmin programar una temporada personalizada que sustituya a la siguiente semanal, sin cortar una activa; conservar resultados y retomar después el calendario automático.
- Continuar mejorando modelos con pruebas entre personas, manos, cámaras y sesiones independientes.
- Resolver las señas que necesitan movimiento, especialmente J/Z.
- Ampliar verificaciones físicas de cámara, recuperación por correo, sincronización entre dispositivos y comportamiento sin conexión.
- Reducir el tamaño inicial del JavaScript mediante carga por pantalla cuando se aborde la optimización.

El número de pruebas puede cambiar entre ramas. El criterio de revisión es que las pruebas vigentes y la compilación terminen correctamente, junto con la verificación manual relevante.
