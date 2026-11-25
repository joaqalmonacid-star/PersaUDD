# OllaComun

> Nombre definitivo: **OllaComun** · Logo MECO integrado.

Marketplace funcional para el **Desafío 4: "Segunda mano en el campus"** (Unidad 3, Fichas de desafíos digitales · Desarrollo de Productos · New Ventures Program).

**Sitio publicado:** https://joaqalmonacid-star.github.io/PersaUDD/
**Backend en Render:** https://ollacomun-auth.onrender.com

## Qué contiene

1. **Landing tipo marketplace** (`index.html`): buscador arriba al centro por **nombre o categoría**, grilla de productos reales y menú lateral derecho con categorías por **carrera**, **tipo de producto** y **funcionalidad**.
2. **Publicación de productos**: botón «+ Publicar producto» que abre un formulario con imagen, precio, carrera, tipo, funcionalidad y lugar de entrega. Cada producto guarda su **estado en el tiempo** (`disponible` → `reservado` → `vendido`) con historial de cambios.
3. **Cuentas completas** (`auth.html`): registro exige **nombre, apellido, correo, carrera y teléfono** (ninguno opcional) más contraseña. Al crear la cuenta, Brevo envía un correo de confirmación desde `administracionollacomun@gmail.com`.
4. **Menú de usuario** arriba a la derecha: al presionar el nombre se despliegan **Perfil**, **Soporte** y **Cerrar sesión** (ya no hay botón «Salir»).
5. **Perfil editable** (`perfil.html`): el estudiante puede cambiar todos sus datos y ver/gestionar el estado de sus publicaciones.
6. **Soporte** (`soporte.html`): correo de contacto y preguntas frecuentes.
7. **Base de datos alojada** (MongoDB Atlas): cuentas y productos viven en la nube, no en la PC de nadie.

## Arquitectura

```
index.html                  → marketplace: búsqueda, categorías, grilla y publicación
auth.html                   → login / registro (5 datos obligatorios)
perfil.html                 → edición de perfil + "Mis publicaciones"
soporte.html                → ayuda y contacto
auth-config.js              → URL del backend en Render
backend/server.js           → API Express: auth, perfil, productos, Brevo
backend/store.js            → adaptador de almacenamiento (MongoDB / JSON local)
render.yaml                 → blueprint del servicio en Render
.github/workflows/deploy.yml → publica los HTML en GitHub Pages
```

La clave de Brevo **nunca viaja al navegador**: el registro la usa dentro del backend en Render. El front solo conoce `auth-config.js` con la URL de la API.

## Base de datos (MongoDB Atlas, gratis)

Se usa el tier **M0 Free** de MongoDB Atlas (512 MB), alojado en la nube. No se instala nada en tu PC.

### Crearla una vez

1. Crea cuenta en https://www.mongodb.com/atlas y un **Shared Cluster** (M0 Free).
2. En **Database Access** crea un usuario (usuario + contraseña) con rol *Read and write to any database*.
3. En **Network Access** agrega `0.0.0.0/0` (Render necesita conectarse desde una IP dinámica).
4. En **Database → Connect → Connect your application**, copia el connection string. Queda así:
   `mongodb+srv://USUARIO:CONTRASEÑA@cluster0.xxxxx.mongodb.net/`
5. En Render entra a **ollacomun-auth → Environment** y agrega:
   - `MONGODB_URI` = el connection string completo (reemplaza `<password>` por tu contraseña real).
   - `MONGODB_DB` = `ollacomun` (ya viene en `render.yaml`).

El backend crea automáticamente las colecciones `users` y `products`, el índice único de correo y siembra 6 productos de ejemplo la primera vez.

> Si `MONGODB_URI` no está configurada, el backend usa archivos JSON en `backend/data/` **solo para desarrollo local**. En Render debes configurar Mongo para que los datos no se pierdan al reiniciar.

## Endpoints

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/health` | Estado, tipo de storage, si Brevo está configurado y remitente. |
| `GET` | `/api/categories` | Listas de carreras, tipos, funcionalidades, estados e imágenes. |
| `POST` | `/api/register` | Crea cuenta con los 5 datos obligatorios + contraseña; solo correos `@udd.cl` (excepto el admin `joaq.almonacid@gmail.com`); envía correo Brevo. |
| `POST` | `/api/login` | Valida credenciales y devuelve JWT de 7 días. |
| `GET` | `/api/me` | Datos del usuario autenticado. |
| `PUT` | `/api/me` | Actualiza nombre, apellido, correo `@udd.cl`, carrera y teléfono. |
| `GET` | `/api/products` | Lista productos. Filtros: `q`, `carrera`, `tipo`, `funcionalidad`, `status`, `mine=true`. |
| `GET` | `/api/products/:id` | Detalle del producto. Del vendedor solo expone `name` y `carrera`. |
| `POST` | `/api/products/:id/contact` | Envía por Brevo un correo al vendedor con nombre, apellido, carrera y teléfono del comprador autenticado (requiere sesión). |
| `POST` | `/api/products` | Publica un producto con hasta 5 fotos en base64 (requiere sesión). |
| `PUT` | `/api/products/:id` | Edita un producto propio. |
| `PATCH` | `/api/products/:id/status` | Cambia el estado y agrega una entrada al historial. |

Las contraseñas se guardan con **bcrypt** (hash, nunca en texto plano). El token JWT se guarda en `localStorage`.

### Detalle y contacto de productos

Cada tarjeta del mercado abre `producto.html?id=...` con la ficha completa del producto y su galería de fotos. El historial de estados se conserva solo en el backend y **no se envía ni se muestra al usuario**. La vista pública del vendedor contiene **solo nombre y carrera**: correo, teléfono y demás datos personales nunca se envían al navegador. El botón **Contactar** requiere sesión y el backend toma los datos del comprador desde la base de datos (no del formulario), por lo que no se pueden falsificar. El correo se envía desde `administracionollacomun@gmail.com` con `replyTo` apuntando al comprador. Para los 6 productos de demostración, el destinatario es el equipo OllaComun.

### Publicación, edición y filtros

- El botón **+ Publicar producto** (arriba a la derecha) abre `publicar.html`, donde se ingresan todos los datos y se suben hasta **5 fotos desde el dispositivo**. Las imágenes se redimensionan en el navegador y se guardan como data URI en MongoDB; no se usa ningún servicio de imágenes externo.
- En **Mi perfil → Mis publicaciones** cada producto es clicable y tiene acciones rápidas: **Disponible**, **Reservado**, **Vendido**, **No disponible**, **Editar** (panel en línea) y **Editar todo** (`publicar.html?edit=id`).
- El menú de filtros está a la **izquierda** y es desplegable (`<details>`); en móvil arranca cerrado, se oculta al elegir una categoría y desplaza la página hasta las publicaciones.
- La **vitrina personalizada** muestra, sobre la barra buscadora, un carrusel deslizante con productos disponibles de la misma carrera que tiene el usuario en su perfil.
- El buscador incluye botón de lupa y sugerencias en vivo con los nombres de productos que coinciden; al hacer clic en una sugerencia se abre su ficha.
- Los estados posibles son `disponible`, `reservado`, `vendido` y `no_disponible`.

## Variables de entorno del backend

| Variable | Valor | Dónde se configura |
| --- | --- | --- |
| `JWT_SECRET` | Cadena larga y aleatoria | La genera Render (`generateValue: true`). |
| `BREVO_API_KEY` | Tu clave API de Brevo | **Manual en Render** (`sync: false`). Nunca en Git. |
| `BREVO_SENDER_EMAIL` | `administracionollacomun@gmail.com` | `render.yaml` (remitente verificado). |
| `BREVO_SENDER_NAME` | `OllaComun` | `render.yaml`. |
| `MONGODB_URI` | Connection string de Atlas | **Manual en Render** (`sync: false`). |
| `MONGODB_DB` | `ollacomun` | `render.yaml`. |

### Verificar el deploy

Abre https://ollacomun-auth.onrender.com/health. Debe mostrar:

```json
{
  "status": "ok",
  "storage": "mongo",
  "brevoConfigured": true,
  "sender": "administracionollacomun@gmail.com"
}
```

Si `storage` es `file` o `brevoConfigured` es `false`, faltan `MONGODB_URI` o `BREVO_API_KEY` en Render (**Environment → Add Environment Variable**, luego *Save Changes* y Render redepliega solo).

## Desarrollo local

```bash
cd backend
npm install
copy .env.example .env   # Windows; en macOS/Linux usa "cp"
npm start
```

Sin `MONGODB_URI` se usa `backend/data/users.json` y `backend/data/products.json` (ignorados por Git). Para apuntar el frontend local a la API, cambia `window.AUTH_API_URL` en `auth-config.js` a `http://localhost:3000`.

Cada push a `main` dispara el workflow y actualiza GitHub Pages. En Cloudflare Pages haz un deploy nuevo desde `main`.

## Restricciones del desafío cubiertas

| Restricción de la ficha | Cómo se aborda |
| --- | --- |
| Solo entre estudiantes de la universidad | Registro obligatorio con correo institucional, carrera y teléfono. |
| Sin pagos en línea en el MVP | Copy explícito y precio informativo; trato directo en el campus. |
| No se permiten productos prohibidos | Categorías acotadas a implementos académicos. |
| Debe probarse a fin de semestre | Hero enfocado en vender antes de las vacaciones. |
| Sin costo / planes gratuitos | Brevo, GitHub Pages, Render y MongoDB Atlas en plan gratuito. |
| Sin datos sensibles | No se piden RUT, ClaveÚnica, datos bancarios ni de salud. Contraseñas hasheadas con bcrypt. |

## Evidencia esperada (métricas)

| Métrica | Umbral propuesto |
| --- | --- |
| Cuentas creadas con los 5 datos | ≥ 30 en 3 días |
| Productos publicados | ≥ 15 en 3 días |
| Productos con estado cambiado a reservado/vendido | ≥ 30% |
| Carreras distintas representadas | ≥ 3 |
| Búsquedas con resultados | ≥ 50% de búsquedas |

## Estado

- [x] Marketplace con búsqueda por nombre/categoría y menú lateral.
- [x] Publicación de productos y estado con historial.
- [x] Registro con 5 datos obligatorios y correo de confirmación Brevo.
- [x] Menú desplegable: Perfil, Soporte, Cerrar sesión.
- [x] Páginas `perfil.html` y `soporte.html`.
- [x] Backend en Render con MongoDB Atlas (sin datos en la PC).
- [x] Logo MECO, paleta oficial y fondo degradado.
- [ ] Configurar `MONGODB_URI` en Render (paso pendiente del usuario).
- [ ] Pruebas con estudiantes reales y medición de umbrales.

## Identidad visual

- **Logo:** `images/meco_logo.png` (MECO), en navbar y favicon.
- **Fondo:** degradado suave en celeste, azul marino y verde sobre blanco, sin puntos.
- **Paleta oficial** aplicada en `:root`: blanco `#ffffff`, azul marino `#00295b`, negro `#000000`, azul noche `#000027`, rojo `#ed1c24`, verde `#005f02`, celeste `#29abe2`, amarillo `#fcee21`, verde oscuro `#0d280e`.

## Créditos de las imágenes

Fotos en `images/`, de dominio público o licencias libres (Wikimedia Commons):

| Producto | Archivo | Autor | Licencia | Fuente |
| --- | --- | --- | --- | --- |
| Calculadora | `calculadora.jpg` | mg | Dominio público | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Casio_fx-991MS_scientific_calculator_1aa.jpg) |
| Escuadra y cartabón | `reglas.jpg` | Wiki LIC | CC BY-SA 4.0 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Delin_03_Escuadra%26Cartab%C3%B3nDSC00010.jpg) |
| Libro de cálculo | `libro.jpg` | Dmitry Makeev | Dominio público | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Civer_of_Differential_and_integral_calculus_by_Nikolai_Piskunow.jpg) |
| Bata de laboratorio | `bata.jpg` | Pi. from Leiden | CC BY 2.0 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Lab_coats.jpg) |
| Adaptador USB | `cables.jpg` | Fructibus | CC0 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:USB_OTG_Type-C_Adapter_-_A.jpg) |
| Compás de dibujo | `instrumentos.jpg` | Slashme | CC0 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Anker_compass_wide.jpg) |
