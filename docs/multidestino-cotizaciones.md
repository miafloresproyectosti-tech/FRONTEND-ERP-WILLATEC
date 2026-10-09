# Multidestino en cotizaciones

Esta guia resume lo implementado en WILLATEC para replicar el comportamiento en el ERP de GSD sin cambiar el flujo base de cotizaciones.

## Objetivo funcional

- Mantener el modo actual de destino unico como comportamiento por defecto.
- Activar multidestino mediante un switch en la cotizacion.
- Permitir que un mismo item tenga varios destinos, cada destino con cantidad propia.
- Cada destino puede tener costo adicional y margen propio.
- El total de venta, ganancia y subtotal se calculan por destino y luego se consolidan en el item.
- Si un item no tiene destino asignado, se asume `Lima Metropolitana`, mostrando avisos para evitar omisiones.
- En PDF, el item aparece una sola vez y sus destinos se listan dentro de la misma fila, con cantidad, precio unitario y subtotal por destino.

## Base de datos

Se agrego una tabla hija para los destinos del item:

- `cotizacion_item_destinos`
- Campos clave:
  - `cotizacion_item_id`
  - `destino_entrega`
  - `detalle_variante`
  - `cantidad`
  - `margen`
  - `costo_unitario`
  - `precio_venta`
  - `subtotal`
  - `costo_total`
  - `ganancia`

Migraciones usadas:

- `database/migrations/2026_09_23_000001_create_cotizacion_item_destinos_table.php`
- `database/migrations/2026_09_23_000002_add_margen_to_cotizacion_item_destinos_table.php`
- `database/migrations/2026_09_23_000003_add_detalle_variante_to_cotizacion_item_destinos_table.php`

## Backend

Archivos principales:

- `app/Models/CotizacionItemDestino.php`
- `app/Models/CotizacionItem.php`
- `app/Services/CotizacionService.php`
- `app/Http/Controllers/Api/CotizacionController.php`

Reglas implementadas:

- `CotizacionItem` tiene relacion `destinosEntrega()`.
- `CotizacionService::recalcular()` distribuye costos adicionales por destino.
- Si el destino tiene `margen`, se usa ese margen; si no, se usa el margen general del item.
- `detalle_variante` es un campo descriptivo opcional del destino y no participa en calculos.
- La suma de cantidades de los destinos debe coincidir con la cantidad total del item.
- El endpoint de listado de cotizaciones carga `items.destinosEntrega` para mostrar los importes por destino en `Cotizaciones.tsx`.
- Si el usuario no debe ver rentabilidad, se ocultan `margen` y `ganancia` tambien en los destinos.

## Frontend

Archivos principales:

- `src/types/cotizaciones.type.ts`
- `src/services/cotizacion.service.ts`
- `src/utils/recalcularItems.ts`
- `src/pages/CotizacionDetail.tsx`
- `src/components/cotizaciones/modals/ItemFormModal.tsx`
- `src/components/cotizaciones/CotizacionItemsTable.tsx`
- `src/pages/Cotizaciones.tsx`

Comportamiento de UI:

- En el modal de item se muestra una seccion de destinos cuando la cotizacion es multidestino.
- Cada destino permite editar destino, detalle / variante, cantidad y margen.
- Se muestran metricas por destino: costo unitario, venta, ganancia y subtotal.
- Si faltan cantidades por asignar o no cuadran con la cantidad del item, se muestra aviso y no se permite guardar.
- En el detalle de cotizacion se ve el destino de cada item.
- En el listado `Cotizaciones.tsx`, cuando una cotizacion es multidestino, el total se muestra desglosado por destino y debajo se conserva el total general como referencia.

## PDF

Plantillas ajustadas:

- `resources/views/pdfs/cotizaciones/willatec-soles.blade.php`
- `resources/views/pdfs/cotizaciones/willatec-soles-estado.blade.php`
- `resources/views/pdfs/cotizaciones/willatec-dolares.blade.php`
- `resources/views/pdfs/cotizaciones/alquiler-estado.blade.php`
- `resources/views/pdfs/cotizaciones/alquiler-privado.blade.php`

Regla visual:

- El producto se imprime una sola vez.
- Dentro de la fila del producto se listan sus destinos.
- Si el destino tiene detalle / variante, se imprime debajo del nombre del destino.
- Las columnas reutilizadas son destino, cantidad, precio unitario y subtotal.
- Los destinos se separan con lineas horizontales internas para mantener lectura limpia.

## Checklist para replicar en GSD

1. Crear la tabla `cotizacion_item_destinos` y correr migraciones.
2. Agregar el modelo `CotizacionItemDestino`.
3. Agregar la relacion `destinosEntrega()` en `CotizacionItem`.
4. Replicar validaciones de `destinos_entrega` en create, update y modificacion de cotizaciones.
5. Replicar `syncItemDestinos` y la validacion de suma de cantidades.
6. Ajustar `CotizacionService::recalcular()` para calcular por destino antes de consolidar el item.
7. Actualizar los tipos de frontend para incluir `destinos_entrega`.
8. Replicar el bloque UI de destinos en el modal de item.
9. Replicar el desglose de destino en tablas de detalle y listado.
10. Actualizar plantillas PDF equivalentes.
11. Probar destino unico, multidestino, modificaciones, aprobacion y generacion de PDF.

## Casos de prueba recomendados

- Cotizacion destino unico sin activar multidestino.
- Cotizacion multidestino con dos items y destinos distintos.
- Un mismo item dividido en dos o mas destinos con cantidades que suman la cantidad total.
- Destinos con costos adicionales diferentes.
- Destinos con margenes diferentes.
- Intentar guardar item con cantidades incompletas.
- Enviar a revision sin costos adicionales para validar el aviso.
- Generar PDF y verificar que el item no se duplique.
- Revisar listado de cotizaciones y confirmar que muestra venta por destino.
