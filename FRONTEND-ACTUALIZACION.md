# Primera actualización del frontend

Supabase se conectará al final, por decisión del proyecto. Esta entrega no contiene cuentas ficticias ni clasificación inventada.

## Incluido
- Progreso local v2 separado por usuario (cuando exista identidad), categoría y seña; invitado por ahora.
- Promedio personal con igual peso por categoría y cero para señas pendientes. Matemáticas excluida en alpha/beta.
- Catálogo con madurez, visibilidad y mantenimiento; bloqueo también al entrar por URL. Fuente provisional: src/domain/modules.ts.
- Abecedario B/C disponible; las demás señas muestran que falta su modelo.
- Laboratorio solo en desarrollo: captura desde el último frame y exportación JSON. No llama al endpoint que sobrescribe modelos.
- Roles user/admin/superadmin definidos y funciones de capacidad. Eliminado el login fijo y el acceso facial experimental. No hay privilegios hasta conectar autenticación real.
- Página de competición explica su disponibilidad futura, sin resultados falsos.
- Liberación de tensores en cada predicción; evaluación explícita de suma/resta.

## Pendiente de backend
Auth, persistencia remota, edición de mantenimiento con permisos, aprobación/activación de modelos y ranking validado. El catálogo local y las rutas de React no sustituyen autorizaciones de servidor.

El JSON exportado contiene category y data; el entrenador necesitará un comando de importación local en la siguiente etapa. La herramienta actual app.py aún no implementa ese comando.

## Progreso anterior
No se borra progressData/recentSessions ni se importa automáticamente: sus claves no distinguen categoría ni propietario. El progreso nuevo usa kai:progress:v2:guest. No se deben publicar las marcas anteriores como competitivas.

## Uso
Instalar las dependencias del lockfile con npm ci, ejecutar npm run dev y abrir Laboratorio local para captura. npm run build comprueba TypeScript y genera la versión de producción; allí el laboratorio está bloqueado.

## Verificación
Se ejecutaron pruebas automatizadas de reglas de promedio, separación de categorías, datos inválidos, capacidades y calculadora. El laboratorio requiere una prueba real con cámara y diversidad de sesiones antes de entrenar modelos publicables.
