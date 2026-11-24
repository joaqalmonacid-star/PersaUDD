# OllaComun

> Nombre definitivo: **OllaComun**. Pendiente: el logo.

Landing de inicio + formulario de validación para el **Desafío 4: "Segunda mano en el campus"** (Unidad 3, Fichas de desafíos digitales · Desarrollo de Productos · New Ventures Program).

**Sitio publicado:** https://joaqalmonacid-star.github.io/PersaUDD/

## Qué contiene la página

1. **Hero con el formulario grande y destacado** — es lo primero que se ve.
2. **Ejemplo de productos en venta** — nombre, precio, descripción, categoría, estado (`Disponible`/`Reservado`) y punto de entrega en el campus.
3. **Integración con Brevo sin Netlify** — al enviar el formulario:
   - Se crea/actualiza un **contacto** en la lista `OllaComun - Lista fundadora` de Brevo.
   - Brevo envía un correo de **confirmación y agradecimiento** al estudiante.
   - Brevo envía un correo de **aviso a administración** (`administracionollacomun@gmail.com`) con todos los datos.

## Configuración ya realizada en Brevo

| Elemento | Estado |
| --- | --- |
| Remitente verificado `administracionollacomun@gmail.com` | ✅ existente |
| Atributos `CARRERA`, `ROL`, `ITEMS`, `DETALLE`, `CANAL_ACTUAL`, `EARLY_ACCESS` | ✅ creados |
| Lista `OllaComun - Lista fundadora` (ID `3`) | ✅ creada |
| Contacto de administración | ✅ creado |
| Secreto `BREVO_API_KEY` en GitHub Actions | ✅ configurado |
| GitHub Pages (build por Actions) | ✅ activado |

## Arquitectura

```
index.html                 → landing + formulario; llama a la API de Brevo
auth.html                  → página aparte de login / registro
auth-config.js             → URL del backend de autenticación en Render
backend/                   → API Node/Express (bcrypt + JWT) para login y registro
render.yaml                → blueprint para desplegar la API en Render
config.js                  → generado en el deploy (NO está en el repo)
.github/workflows/deploy.yml → inyecta el secreto y publica en GitHub Pages + Cloudflare
```

La clave API se guarda como **secreto de GitHub Actions** (`BREVO_API_KEY`). En cada deploy, el workflow genera `config.js` con esa clave y publica solo la carpeta `site/`.Por eso la clave no aparece en el historial de Git.

> **Limitación inherente:** al ser una página estática sin backend, la clave viaja al navegador dentro de `config.js` y es visible para quien inspeccione el sitio publicado. Para un piloto de clase es aceptable; para producción, conviene mover las llamadas a un servidor o función serverless.

## Flujo al enviar el formulario

1. `POST https://api.brevo.com/v3/contacts` → contacto con atributos y `listIds: [3]`, `updateEnabled: true`.
2. `POST https://api.brevo.com/v3/smtp/email` → confirmación al correo del estudiante.
3. `POST https://api.brevo.com/v3/smtp/email` → aviso a `administracionollacomun@gmail.com` con `replyTo` al estudiante.

## Login / Registro con backend en Render

Los botones **Iniciar sesión** y **Registrarse** están arriba a la derecha del navbar y abren `auth.html`, una página aparte. El formulario envía los datos a una API Node/Express desplegada en Render.

### Endpoints

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/health` | Health check usado por Render. |
| `POST` | `/api/register` | Crea cuenta con nombre, correo, contraseña y carrera opcional; envía el correo de confirmación por Brevo. |
| `POST` | `/api/login` | Valida credenciales y devuelve un JWT de 7 días. |
| `GET` | `/api/me` | Devuelve el usuario autenticado (header `Authorization: Bearer <token>`). |

Las contraseñas se guardan con **bcrypt** (hash, nunca en texto plano). El token se guarda en `localStorage` y el navbar cambia a "Hola, nombre" + **Salir** cuando hay sesión activa.

El registro llama a `POST https://api.brevo.com/v3/smtp/email` **desde el servidor**, usando `BREVO_API_KEY`. Así la clave API nunca viaja al navegador. La respuesta incluye `emailSent` para indicar si el correo se envió.

### Variables de entorno de la API

| Variable | Valor | Dónde se pone |
| --- | --- | --- |
| `JWT_SECRET` | Cadena larga y aleatoria | La genera Render automáticamente (`generateValue: true`). |
| `BREVO_API_KEY` | Tu clave API de Brevo | **Manual en Render** (`sync: false`). Nunca va en Git. |
| `BREVO_SENDER_EMAIL` | `administracionollacomun@gmail.com` | `render.yaml` (remitente verificado en Brevo). |
| `BREVO_SENDER_NAME` | `OllaComun` | `render.yaml`. |

### Desplegar la API en Render

1. En Render → **New +** → **Blueprint Instance** y conecta este repo de GitHub.
2. Render detecta `render.yaml` y crea el servicio `ollacomun-auth` (plan free).
3. En el paso de variables, pega tu **BREVO_API_KEY** (marcada como `sync: false`). Las demás ya vienen configuradas.
4. Si el servicio ya existía: abre **ollacomun-auth → Environment** y agrega `BREVO_API_KEY` con tu clave. Render hará un redeploy automático.
5. Espera a que el health check `/health` esté en verde.
6. Copia la URL que te entrega Render (ej. `https://ollacomun-auth.onrender.com`) y, si es distinta, actualízala en `auth-config.js`. Luego haz push para que GitHub Pages y Cloudflare publiquen el cambio.

> El correo de confirmación se envía al correo del estudiante, con remitente `administracionollacomun@gmail.com` (debe estar verificado en Brevo). Si la clave falta o falla, el registro igual se crea y el frontend avisa que no se pudo enviar el correo; revisa los logs de Render para ver el motivo.

### Probar la API en local

```bash
cd backend
npm install
copy .env.example .env   # Windows: usa "cp" en macOS/Linux
npm start
```

Luego:

```bash
curl http://localhost:3000/health
curl -X POST http://localhost:3000/api/register -H "Content-Type: application/json" -d "{\"name\":\"Ana\",\"email\":\"ana@udd.cl\",\"password\":\"secreto123\",\"carrera\":\"Arquitectura\"}"
curl -X POST http://localhost:3000/api/login -H "Content-Type: application/json" -d "{\"email\":\"ana@udd.cl\",\"password\":\"secreto123\"}"
```

Para apuntar el frontend local a tu API, cambia `window.AUTH_API_URL` en `auth-config.js` a `http://localhost:3000`.

> **Limitación del plan free:** Render apaga la instancia tras ~15 min de inactividad; el primer request puede tardar unos segundos. El archivo `backend/data/users.json` es efímero: si el servicio se reinicia, se pierden las cuentas. Para producción real, usa una base de datos de Render y un disco persistente.

## Desarrollo local

`config.js` contiene la configuración de Brevo. GitHub lo genera automáticamente desde el secreto `BREVO_API_KEY` y `index.html` lo carga por **URL absoluta** (`https://joaqalmonacid-star.github.io/PersaUDD/config.js`). Gracias a eso, el formulario funciona igual en GitHub Pages, en Cloudflare Pages o al abrir `index.html` en local, sin necesidad de subir la clave al repo.

Al enviar el formulario verás el mensaje **"¡Enviado correctamente!"** y se dispararán los dos correos: confirmación al estudiante y aviso a administración. Si algo falla, el mensaje de error aparece en rojo justo debajo del botón y los detalles quedan en la consola del navegador.

Cada push a `main` dispara el workflow y actualiza el sitio automáticamente.

## Restricciones del desafío cubiertas

| Restricción de la ficha | Cómo se aborda |
| --- | --- |
| Solo entre estudiantes de la universidad | Se pide correo institucional y carrera. |
| Sin pagos en línea en el MVP | Copy explícito: "Sin pagos en la app · Trato directo en el campus · 0% comisión". |
| No se permiten productos prohibidos | El catálogo de ejemplo solo muestra implementos académicos. |
| Debe probarse a fin de semestre, cuando hay poca demanda | Hero enfocado en "vender antes de irte de vacaciones". |
| Sin costo / planes gratuitos | Brevo, GitHub Pages y Render en plan gratuito. |
| Sin datos sensibles | No se piden RUT, ClaveÚnica, datos bancarios ni de salud. La contraseña del login se almacena solo como hash bcrypt. |

## Evidencia esperada (métricas)

| Métrica de comportamiento | Umbral de éxito (propuesto, confirmar antes de probar) |
| --- | --- |
| Registros válidos con correo institucional | ≥ 30 en 3 días |
| % de registros con al menos un implemento para vender | ≥ 20% |
| Registros que marcan "Quiero acceso anticipado" | ≥ 50% |
| Carreras distintas representadas | ≥ 3 |

## Estado

- [x] Landing de inicio con catálogo de ejemplo.
- [x] Formulario grande y destacado.
- [x] Contactos, atributos y lista creados en Brevo.
- [x] Envío de confirmación al estudiante y aviso a administración.
- [x] Clave como secreto de GitHub + deploy automático en Pages.
- [x] Nombre definitivo: OllaComun.
- [x] Imágenes reales de los productos con licencia libre.
- [x] Logo MECO integrado (navbar y favicon).
- [x] Paleta de colores oficial aplicada.
- [ ] Pruebas con estudiantes reales y medición de umbrales.

## Identidad visual

- **Logo:** `images/meco_logo.png` (MECO), usado en el navbar y como favicon.
- **Fondo:** degradado suave en celeste, azul marino y verde sobre blanco, sin patrón de puntos.
- **Paleta oficial** (`Paleta de colores.txt`), aplicada en `:root` de `index.html`:

| Color | Hex | Uso en la página |
| --- | --- | --- |
| Blanco | `#ffffff` | Fondo y superficies |
| Azul marino | `#00295b` | Primario: títulos, botones, bordes, logo |
| Negro | `#000000` | Texto |
| Azul noche | `#000027` | Texto principal |
| Rojo | `#ed1c24` | Acento: hover del CTA, etiquetas, estados de envío |
| Verde | `#005f02` | Disponible y éxito |
| Celeste | `#29abe2` | Foco de campos y panel de vendedores |
| Amarillo | `#fcee21` | Estado "Reservado" |
| Verde oscuro | `#0d280e` | Refuerzo de la paleta |

## Créditos de las imágenes

Las fotos están en `images/` y son de dominio público o licencias libres (Wikimedia Commons), sin derechos de autor restrictivos:

| Producto | Archivo | Autor | Licencia | Fuente |
| --- | --- | --- | --- | --- |
| Calculadora | `calculadora.jpg` | mg | Dominio público | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Casio_fx-991MS_scientific_calculator_1aa.jpg) |
| Escuadra y cartabón | `reglas.jpg` | Wiki LIC | CC BY-SA 4.0 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Delin_03_Escuadra%26Cartab%C3%B3nDSC00010.jpg) |
| Libro de cálculo | `libro.jpg` | Dmitry Makeev | Dominio público | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Civer_of_Differential_and_integral_calculus_by_Nikolai_Piskunow.jpg) |
| Bata de laboratorio | `bata.jpg` | Pi. from Leiden | CC BY 2.0 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Lab_coats.jpg) |
| Adaptador USB | `cables.jpg` | Fructibus | CC0 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:USB_OTG_Type-C_Adapter_-_A.jpg) |
| Compás de dibujo | `instrumentos.jpg` | Slashme | CC0 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Anker_compass_wide.jpg) |
