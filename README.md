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
config.js                  → generado en el deploy (NO está en el repo)
.github/workflows/deploy.yml → inyecta el secreto y publica en GitHub Pages
```

La clave API se guarda como **secreto de GitHub Actions** (`BREVO_API_KEY`). En cada deploy, el workflow genera `config.js` con esa clave y publica solo la carpeta `site/`.Por eso la clave no aparece en el historial de Git.

> **Limitación inherente:** al ser una página estática sin backend, la clave viaja al navegador dentro de `config.js` y es visible para quien inspeccione el sitio publicado. Para un piloto de clase es aceptable; para producción, conviene mover las llamadas a un servidor o función serverless.

## Flujo al enviar el formulario

1. `POST https://api.brevo.com/v3/contacts` → contacto con atributos y `listIds: [3]`, `updateEnabled: true`.
2. `POST https://api.brevo.com/v3/smtp/email` → confirmación al correo del estudiante.
3. `POST https://api.brevo.com/v3/smtp/email` → aviso a `administracionollacomun@gmail.com` con `replyTo` al estudiante.

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
| Sin costo / planes gratuitos | Brevo y GitHub Pages en plan gratuito. |
| Sin datos sensibles | No se piden RUT, contraseñas, ClaveÚnica, datos bancarios ni de salud. |

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
- [ ] Logo definitivo.
- [ ] Pruebas con estudiantes reales y medición de umbrales.

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
