# Conexión de Kai Señas a Supabase

Proyecto: `sfcgfxawpdnpaeewtnrh` (Kai Señas). SDK oficial: `@supabase/supabase-js`, versión exacta 2.118.0 y lockfile del proyecto.

## Configuración

La URL y la clave publicable están preparadas en `src/lib/supabase.ts`. No son claves de administración: todos los permisos se aplican con Auth y RLS. Se pueden reemplazar con `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`; nunca usar claves secretas o service_role en variables VITE.

En Supabase > Authentication > URL Configuration, establecer para desarrollo:

- Site URL: `http://localhost:5173`
- Redirect URLs: `http://localhost:5173/login` y `http://127.0.0.1:5173/login`

Para producción, añadir también la URL HTTPS real de la aplicación y su ruta `/login`. Este ajuste es necesario para que los correos de confirmación y recuperación regresen a la aplicación correcta. No se ha desactivado la confirmación de correo.

## Funciones conectadas

- Registro, acceso por correo/contraseña, recuperación de contraseña y cierre de sesión.
- Perfil propio y nombre visible. El rol se lee de `user_roles`; los metadatos del navegador no conceden permisos.
- Catálogo, mantenimiento y visibilidad desde la base. Se actualizan al volver a la pestaña y cada 20 segundos. Si no se puede comprobar el catálogo, las prácticas se bloquean con opción de reintentar.
- Progreso entre dispositivos para cuentas; progreso local independiente para invitado.
- Una cola local por cuenta y una clave por UUID de intento permiten reintentar sin duplicar datos ni reemplazar la cola de otra pestaña.
- La aplicación comprueba la identidad antes de sincronizar; RLS verifica cada escritura. Un cambio de cuenta desmonta sus contextos y evita mostrar resultados de la cuenta anterior.
- Importación explícita de un resumen por seña desde el invitado, como legado sin validar. Repetir la misma importación no duplica el mismo resumen. La fuente local se conserva.
- Panel `/administracion` para admin/superadmin: mantenimiento y visibilidad de módulos y señas. No permite cambiar roles, etapas de madurez ni habilitar modelos que no existen.
- Captura de muestras solo para cuentas admin/superadmin, también en producción. Sigue siendo exportación de datos para entrenamiento local; no publica modelos.

## Progreso e integridad

Se conserva la validación sostenida de 1,5 segundos. La confianza del modelo no se transforma en un resultado competitivo. Los resúmenes importados no completan ejercicios, no elevan una marca ya validada y no participan por sí solos en el promedio.

Las cuentas pueden consultar e insertar su historial, pero no actualizar ni eliminar resultados remotos. El botón de reinicio solo existe para invitado. No borrar caché o datos del sitio si hay sesiones pendientes: estas permanecen en ese navegador hasta sincronizar.

Un resultado rechazado por mantenimiento o permisos queda pendiente con un mensaje, mientras otras sesiones disponibles pueden sincronizarse. «Sincronizar ahora» permite reintentar. No se presenta un fallo de sincronización como guardado confirmado en la nube.

## Primera cuenta administradora

Todas las cuentas nuevas reciben el rol user, incluso la primera. Registra y confirma tu cuenta; después se debe asignar tu UUID como primer superadmin desde el acceso confiable al proyecto. No hay autoascenso en el navegador y no hace falta compartir la contraseña con el asistente.

## Verificación

- 28 pruebas automatizadas aprobadas y compilación TypeScript/Vite correcta.
- Navegador contra el proyecto real: carga del catálogo, inicio de sesión, actualización de perfil, lectura del progreso, bloqueo de administración para user, acceso de admin, guardado de mantenimiento y cierre de sesión con vuelta al invitado.
- Se utilizó una cuenta temporal; se cerró su sesión, se restauró el motivo de mantenimiento original y se eliminaron la cuenta, sus registros y sus auditorías de prueba. La limpieza se verificó por consulta.
- SQL: el payload usado por el SDK y `ON CONFLICT DO NOTHING` funcionan con los permisos de authenticated; repetir el UUID no modifica ni duplica el intento. La prueba se revirtió.
- Confirmación y recuperación por correo no se probaron con una bandeja real. La captura con cámara y el comportamiento offline de principio a fin requieren una prueba en tu dispositivo; las reglas y la cola sí tienen pruebas automatizadas.

El aviso de tamaño de paquete de Vite sigue pendiente de una futura división de la carga por pantalla. No impide compilar. El ranking competitivo y la revisión/publicación de modelos continúan como etapas siguientes.
