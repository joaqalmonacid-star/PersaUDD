# CampusSwap

> Nombre **provisional**. Pendiente de definir el nombre final y el logo.

Landing + formulario de validación para el **Desafío 4: "Segunda mano en el campus"** (Unidad 3, Fichas de desafíos digitales · Desarrollo de Productos · New Ventures Program).

## El problema

Cada semestre, cientos de estudiantes compran implementos que usarán unos meses (calculadoras científicas, libros de cálculo, batas de laboratorio, materiales de maqueta). Al terminar el ramo quedan guardados. Hoy la compraventa ocurre en grupos de Instagram y WhatsApp donde:

- Las publicaciones se pierden en horas.
- No se sabe si el producto sigue disponible.
- Nadie confía en pagar por adelantado.

## La solución (MVP)

Una **landing de acceso anticipado** que valida la demanda antes de construir el producto completo:

1. **Propuesta de valor clara** para vendedores y compradores del segmento principal (estudiantes que venden y estudiantes que compran).
2. **Vista previa del catálogo** con los atributos críticos del desafío: filtros por carrera, precio, estado (`Disponible` / `Reservado`) y punto de entrega dentro del campus.
3. **Formulario de validación** que mide:
   - Correo institucional y carrera (pertenencia a la comunidad).
   - Rol: vender / comprar / ambos.
   - Si es vendedor: qué tiene guardado y dónde intentó venderlo antes.
   - Intención de participar en el piloto.
4. **Estado de éxito** con botón para copiar el link y compartirlo (viralidad orgánica en grupos de curso).
5. **Evento de analítica** (`validacion_form_submit`) listo para Google Tag Manager / GA4.

Este MVP se construyó **sin programación de backend**, cumpliendo la restricción de la ficha: es una landing con formulario. Los datos se capturan en el evento de analítica y en `console.log`; el envío real está preparado pero pendiente de conectar un endpoint.

## Restricciones del desafío cubiertas

| Restricción de la ficha | Cómo se aborda en este MVP |
| --- | --- |
| Solo entre estudiantes de la universidad | Se pide correo institucional (`@udd.cl`) y carrera. |
| Sin pagos en línea en el MVP | Copy explícito: "Sin pagos en la app · Trato directo en el campus · 0% comisión". |
| No se permiten productos prohibidos | Se muestran solo implementos académicos permitidos en el catálogo mock; se reforzará en el formulario de carga cuando se habilite. |
| Debe probarse a fin de semestre, cuando hay poca demanda | La landing se enfoca en "vender antes de irte de vacaciones" y mide oferta acumulada para la próxima temporada. |
| Sin costo / planes gratuitos | HTML estático, sin dependencias de pago; se puede publicar en GitHub Pages. |
| Sin datos sensibles | No se piden RUT, contraseñas, ClaveÚnica, datos bancarios ni de salud. |

## Evidencia esperada (métricas)

La ficha pide: **productos publicados, intercambios concretados y tiempo entre la publicación y la venta**. Para esta primera fase de validación se miden estos proxies en el formulario:

| Métrica de comportamiento | Umbral de éxito (definido antes de probar) |
| --- | --- |
| Registros válidos con correo institucional | ≥ 30 en 3 días |
| % de registros con al menos un implemento para vender | ≥ 20% (1 de cada 5 estudiantes tiene algo guardado) |
| Registros que marcan "Quiero acceso anticipado" | ≥ 50% del total |
| Carreras distintas representadas | ≥ 3 |

*Nota: los umbrales son propuestos por el equipo y deben confirmarse antes de iniciar las pruebas con usuarios reales.*

## Cómo ejecutar / publicar

### Local

No requiere instalación. Abre `index.html` en un navegador, o sirve la carpeta con:

```bash
python -m http.server 8000
```

Luego visita `http://localhost:8000`.

### GitHub Pages

El repo está listo para publicarse con GitHub Pages desde la rama principal (`main`), carpeta `/ (root)`.

### Conectar el formulario a un endpoint

En `index.html`, dentro del listener `submit`, reemplaza el bloque comentado:

```js
await fetch('TU_ENDPOINT_AQUI', {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
});
```

Opciones gratuitas sugeridas: Google Apps Script (atado a una Google Sheet), Formspree (plan gratuito) o Make.com.

## Estructura

```
.
├── index.html   # Landing + preview del catálogo + formulario de validación
└── README.md    # Este archivo
```

## Estado

- [x] Adaptación del index al caso del desafío 4
- [x] Corrección de un `<label>` inválido dentro del `<select>` del index original
- [x] Evento de analítica y manejo del estado de éxito
- [ ] Nombre y logo definitivos
- [ ] Conectar endpoint real de registro
- [ ] Pruebas con estudiantes reales del segmento y medición de umbrales
