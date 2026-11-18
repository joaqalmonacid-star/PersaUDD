# CampusSwap

> Nombre **provisional**. Pendiente de definir el nombre final y el logo.

Landing de inicio + formulario de validación para el **Desafío 4: "Segunda mano en el campus"** (Unidad 3, Fichas de desafíos digitales · Desarrollo de Productos · New Ventures Program).

## Qué contiene la página

1. **Hero con el formulario grande y destacado** — es lo primero que se ve, porque es la pieza clave de validación.
2. **Ejemplo de productos en venta** — tarjetas con nombre, precio, pequeña descripción, categoría, estado (`Disponible`/`Reservado`) y punto de entrega en el campus.
3. **Integración con Brevo** — al enviar el formulario:
   - Se envía un correo de **confirmación y agradecimiento** al estudiante.
   - Se envía un correo de **aviso a administración** (`administracionollacomun@gmail.com`) con todos los datos del registro.

## El problema

Cada semestre, cientos de estudiantes compran implementos que usarán unos meses (calculadoras científicas, libros de cálculo, batas de laboratorio, materiales de maqueta). Al terminar el ramo quedan guardados. Hoy la compraventa ocurre en grupos de Instagram y WhatsApp donde las publicaciones se pierden en horas, no se sabe si el producto sigue disponible y nadie confía en pagar por adelantado.

## El MVP

Landing estática + una Netlify Function que envía los correos. Cumple la restricción de "MVP sin programar" en el sentido de que no hay base de datos ni backend propio: solo una función serverless gratuita para usar la API de Brevo de forma segura.

> **Seguridad:** la clave API de Brevo **nunca** está en el código. Se lee de la variable de entorno `BREVO_API_KEY` en Netlify.

## Estructura

```
.
├── index.html                         # Landing + catálogo de ejemplo + formulario
├── netlify.toml                       # Configuración de publicación y funciones
├── netlify/functions/submit-form.js   # Endpoint que envía los 2 correos vía Brevo
└── README.md                          # Este archivo
```

## Configuración (importante)

El formulario llama a `/.netlify/functions/submit-form`, que solo funciona cuando el sitio está desplegado en **Netlify** (GitHub Pages no ejecuta funciones).

### Pasos

1. Crear una cuenta en [Netlify](https://www.netlify.com/) y conectar el repo `joaqalmonacid-star/PersaUDD`.
2. En Netlify: **Site settings → Environment variables → Add variable**:
   - `BREVO_API_KEY` = tu clave API de Brevo (la que empieza con `xkeysib-...`).
3. Configuración del build (ya viene en `netlify.toml`):
   - Publish directory: `.` (raíz)
   - Functions directory: `netlify/functions`
4. Hacer deploy. Cada push a `main` actualiza el sitio automáticamente.

### Verificar el remitente en Brevo

Brevo solo envía desde remitentes verificados. Confirma en **Settings → Senders & Domains** que `administracionollacomun@gmail.com` esté validado como remitente. Si no, los correos pueden ser rechazados con un error 400/401.

### Prueba local (opcional)

Con [Netlify CLI](https://docs.netlify.com/cli/get-started/):

```bash
npm install -g netlify-cli
netlify link      # conecta con tu sitio de Netlify para tomar las variables de entorno
netlify dev
```

Luego abre `http://localhost:8888` y envía el formulario.

## Correos que envía la función

| Destinatario | Asunto | Contenido |
| --- | --- | --- |
| Correo del estudiante | `¡Gracias por tu interés en CampusSwap! 🎉` | Agradecimiento y aviso de que se escribirá al habilitar la carga de productos. |
| `administracionollacomun@gmail.com` | `Nuevo registro CampusSwap · {carrera}` | Correo, carrera, rol, implementos, canal anterior, acceso anticipado y fecha. |

## Restricciones del desafío cubiertas

| Restricción de la ficha | Cómo se aborda |
| --- | --- |
| Solo entre estudiantes de la universidad | Se pide correo institucional y carrera. |
| Sin pagos en línea en el MVP | Copy explícito: "Sin pagos en la app · Trato directo en el campus · 0% comisión". |
| No se permiten productos prohibidos | El catálogo de ejemplo solo muestra implementos académicos. |
| Debe probarse a fin de semestre, cuando hay poca demanda | El hero enfocado en "vender antes de irte de vacaciones" y la medición de oferta acumulada. |
| Sin costo / planes gratuitos | Netlify y Brevo tienen planes gratuitos suficientes para el piloto. |
| Sin datos sensibles | No se piden RUT, contraseñas, ClaveÚnica, datos bancarios ni de salud. |

## Evidencia esperada (métricas)

La ficha pide: **productos publicados, intercambios concretados y tiempo entre la publicación y la venta**. En esta fase se miden estos proxies:

| Métrica de comportamiento | Umbral de éxito (propuesto, confirmar antes de probar) |
| --- | --- |
| Registros válidos con correo institucional | ≥ 30 en 3 días |
| % de registros con al menos un implemento para vender | ≥ 20% |
| Registros que marcan "Quiero acceso anticipado" | ≥ 50% |
| Carreras distintas representadas | ≥ 3 |

## Estado

- [x] Landing de inicio con catálogo de ejemplo (nombre, precio, descripción, estado y entrega).
- [x] Formulario grande y destacado en el hero.
- [x] Envío vía Brevo (confirmación al estudiante + aviso a administración).
- [x] Clave API protegida como variable de entorno.
- [ ] Nombre y logo definitivos.
- [ ] Conectar Netlify y configurar `BREVO_API_KEY`.
- [ ] Pruebas con estudiantes reales y medición de umbrales.
