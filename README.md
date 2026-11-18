# CampusSwap

> Nombre **provisional**. Pendiente de definir el nombre final y el logo.

Landing de inicio + formulario de validación para el **Desafío 4: "Segunda mano en el campus"** (Unidad 3, Fichas de desafíos digitales · Desarrollo de Productos · New Ventures Program).

## Qué contiene la página

1. **Hero con el formulario grande y destacado** — es lo primero que se ve, porque es la pieza clave de validación.
2. **Ejemplo de productos en venta** — tarjetas con nombre, precio, pequeña descripción, categoría, estado (`Disponible`/`Reservado`) y punto de entrega en el campus.
3. **Integración 100% Brevo** — el formulario hace `POST` directo al endpoint de un formulario de Brevo. No hay Netlify ni servidor propio, y **la clave API no aparece en el código**.

### Correos

| Destinatario | Quién lo envía | Cómo |
| --- | --- | --- |
| Correo del estudiante | Brevo | **Confirmación simple** configurada en el formulario (plantilla de agradecimiento). |
| `administracionollacomun@gmail.com` | Brevo | **Automatización** disparada por el envío del formulario → acción *Notify by email*. |

## Estructura

```
.
├── index.html   # Landing + catálogo de ejemplo + formulario (POST a Brevo)
├── README.md    # Este archivo y las instrucciones de configuración
└── .gitignore
```

## Configuración en Brevo (paso a paso)

### 1. Verificar el remitente

En Brevo: **Settings → Senders & Domains (Remitentes y dominios)**. Confirma que `administracionollacomun@gmail.com` aparece como remitente verificado. Si no está, Brevo rechazará los correos.

### 2. Crear los atributos de contacto

En **Contacts → Contact attributes (Atributos de contacto)** crea estos campos si no existen (todos en mayúsculas, tal cual):

| Atributo | Tipo | Uso |
| --- | --- | --- |
| `CARRERA` | Texto | Carrera del estudiante |
| `ROL` | Texto | `vender`, `comprar` o `ambos` |
| `ITEMS` | Selección múltiple | Implementos que tiene para vender |
| `DETALLE` | Texto larga | Resumen legible para el correo de administración |
| `CANAL_ACTUAL` | Texto | Dónde intentó vender antes |
| `EARLY_ACCESS` | Texto | `true` / `false` |

> `EMAIL` ya existe por defecto en Brevo.

### 3. Crear el formulario en Brevo

1. **Marketing → Forms → Create sign-up form → Full page/embedded**.
2. Nómbralo, por ejemplo: `CampusSwap · Acceso anticipado`.
3. En el constructor, agrega los campos con sus atributos (`EMAIL`, `CARRERA`, `ROL`, `ITEMS`, `DETALLE`, `CANAL_ACTUAL`, `EARLY_ACCESS`). Puedes ocultar `DETALLE` si el editor lo permite; el formulario de la web ya lo rellena automáticamente.
4. Asocia una lista, por ejemplo: `CampusSwap - Lista fundadora`.
5. En **Settings**, elige **Simple confirmation email** (confirmación simple) y selecciona una plantilla de agradecimiento (paso 4). Así el estudiante recibe el correo apenas envía, sin doble opt-in.
6. En **Share / Embed**, copia el código **HTML** (o *Simple HTML*) y busca dentro la URL del `action`, parecida a:
   ```
   https://tu-cuenta.sibforms.com/serve/MUIF...
   ```
7. Pega esa URL en `index.html`, reemplazando el valor de:
   ```js
   const BREVO_FORM_ACTION = 'https://TU-CUENTA.sibforms.com/serve/MUIF...';
   ```

> No copies todo el embed: nuestra página ya tiene su propio diseño. Solo necesitamos la URL de envío. Los nombres de los campos de nuestro formulario ya coinciden con los atributos de Brevo.

### 4. Plantilla de confirmación para el estudiante

En **Marketing → Templates → Email**, crea una plantilla (p. ej. `CampusSwap - Gracias por tu interés`) con este contenido:

**Asunto:** `¡Gracias por tu interés en CampusSwap! 🎉`

**Cuerpo:**
```html
<h1>¡Gracias por sumarte! 🙌</h1>
<p>Recibimos tu registro para el piloto de <strong>CampusSwap</strong>, el mercado de segunda mano dentro del campus UDD.</p>
<p>Te escribiremos al correo apenas habilitemos la carga de productos esta semana.</p>
<p>Mientras tanto, recuerda: <strong>sin pagos en la app, trato directo en el campus y 0% comisión.</strong></p>
<p>CampusSwap · Piloto Fin de Semestre · UDD</p>
```

Luego selecciónala en los ajustes del formulario (paso 3.5).

### 5. Aviso a administración (automatización)

1. Agrega `administracionollacomun@gmail.com` como contacto en Brevo (**Contacts → Add a contact**). El paso *Notify by email* solo puede notificar a contactos existentes.
2. **Automations → Workflows → Create an automation → desde cero**.
3. **Trigger:** arrastra *Forms - Form submitted* y selecciona el formulario `CampusSwap · Acceso anticipado`.
4. **Action:** arrastra *Messaging - Notify by email*.
5. Configura:
   - **From:** el remitente verificado (`administracionollacomun@gmail.com`).
   - **Who do you want to notify?:** *One or more contacts* → `administracionollacomun@gmail.com`.
   - **Asunto:** `Nuevo registro CampusSwap · {{params.contact.CARRERA}}`
   - **Cuerpo:**
     ```text
     Nuevo registro de acceso anticipado en CampusSwap:

     Correo: {{params.contact.EMAIL}}
     Carrera: {{params.contact.CARRERA}}
     Rol: {{params.contact.ROL}}
     Detalle: {{params.contact.DETALLE}}
     Acceso anticipado: {{params.contact.EARLY_ACCESS}}

     Fecha: {{params.contact.DETALLE}}
     ```
     > En la sección *What event data to display* deja seleccionado **The email doesn't have variables**, tal como indica Brevo para este tipo de notificación.
6. Guarda, activa la automatización y (recomendado) activa **Allow contact re-entry after exit**.

### 6. Publicar

Ahora es un sitio estático: funciona en **GitHub Pages**, en cualquier hosting o abriendo `index.html`. No necesitas Netlify ni variables de entorno.

## Restricciones del desafío cubiertas

| Restricción de la ficha | Cómo se aborda |
| --- | --- |
| Solo entre estudiantes de la universidad | Se pide correo institucional y carrera. |
| Sin pagos en línea en el MVP | Copy explícito: "Sin pagos en la app · Trato directo en el campus · 0% comisión". |
| No se permiten productos prohibidos | El catálogo de ejemplo solo muestra implementos académicos. |
| Debe probarse a fin de semestre, cuando hay poca demanda | Hero enfocado en "vender antes de irte de vacaciones" y medición de oferta acumulada. |
| Sin costo / planes gratuitos | Brevo y GitHub Pages tienen planes gratuitos suficientes para el piloto. |
| Sin datos sensibles | No se piden RUT, contraseñas, ClaveÚnica, datos bancarios ni de salud. |

## Evidencia esperada (métricas)

| Métrica de comportamiento | Umbral de éxito (propuesto, confirmar antes de probar) |
| --- | --- |
| Registros válidos con correo institucional | ≥ 30 en 3 días |
| % de registros con al menos un implemento para vender | ≥ 20% |
| Registros que marcan "Quiero acceso anticipado" | ≥ 50% |
| Carreras distintas representadas | ≥ 3 |

## Seguridad

La clave API que se compartió en la conversación **no se usa ni se guarda en este repositorio**. Como ya fue expuesta, se recomienda **rotarla en Brevo** (*Settings → API keys → Generate new key*) aunque ya no sea necesaria para este proyecto.

## Estado

- [x] Landing de inicio con catálogo de ejemplo (nombre, precio, descripción, estado y entrega).
- [x] Formulario grande y destacado en el hero.
- [x] Envío directo a Brevo sin Netlify ni clave en el frontend.
- [ ] Crear formulario en Brevo y pegar su URL `action` en `index.html`.
- [ ] Configurar plantilla de confirmación y automatización al correo de administración.
- [ ] Nombre y logo definitivos.
- [ ] Pruebas con estudiantes reales y medición de umbrales.
