# Handoff tecnico: compras, recepciones, contabilidad y XML

Fecha: 2026-08-12  
Proyecto: ERP-WILLATEC  
Stack: Laravel 12 API REST, React + Vite, Sanctum, Spatie Permission, MySQL produccion, PostgreSQL/local segun entorno.

## 1. Estado implementado

### Fase 1: estabilizacion

Implementado:

- GET de OC recibidas queda read-only.
- `OcRecibidaController::index` ya no sincroniza inventario.
- `OcRecibidaController::show` ya no sincroniza inventario.
- La salida logistica ya no depende de factura.
- La factura pendiente se refleja como estado documental, no como bloqueo de entrega.
- `comprado` se mantiene como campo legacy, pero visualmente se interpreta como stock cubierto/asegurado.
- Se agregaron estados independientes a `oc_recibidas`.

### Fase 2: atenciones logisticas

Implementado:

- Atenciones parciales por OC recibida.
- Multiples atenciones por una misma OC.
- Seleccion de series desde flujo logistico.
- Confirmacion de atencion genera salida Kardex via `InventarioService`.
- Confirmacion idempotente por item de atencion.
- Serie no reutilizable en dos atenciones activas.
- Sin factura ni guia como bloqueo logistico.
- `estado_logistico` pasa a ser fuente principal logistica.
- `oc_recibida_items.entregado` y `oc_recibidas.estado` siguen sincronizados por compatibilidad.

### Fase 3: requerimientos de compra

Implementado:

- Requerimientos de compra independientes de OC.
- Generacion desde OC por faltante real.
- Soporte para origenes: `oc_cliente`, `reposicion_stock`, `manual`, `licitacion`, `otro`.
- Productos externos pueden generar requerimiento sin producto interno.
- Requerimientos activos previos se descuentan del faltante.
- Doble request no duplica: el segundo request devuelve el requerimiento activo existente.
- Crear requerimiento no toca stock ni Kardex.

## 2. Migraciones creadas hasta ahora

Fase 1:

- Backend: `database/migrations/2026_08_12_000001_add_independent_statuses_to_oc_recibidas_table.php`

Fase 2:

- Backend: `database/migrations/2026_08_12_000002_create_oc_atenciones_tables.php`
- Backend: `database/migrations/2026_08_12_000003_add_oc_atencion_item_id_to_inventario_movimientos_table.php`

Fase 3:

- Backend: `database/migrations/2026_08_12_000004_create_requerimientos_compra_tables.php`

No usar `migrate:fresh`. En produccion deben ejecutarse como migraciones incrementales.

## 3. Tablas nuevas y relaciones

### `oc_atenciones`

Relaciones:

- `oc_atenciones.oc_recibida_id -> oc_recibidas.id`
- `preparado_por -> users.id`
- `entregado_por -> users.id`
- `created_by -> users.id`

Modelo:

- `App\Models\OcAtencion`

Estados:

- `borrador`
- `preparando`
- `despachado`
- `entregado`
- `cancelado`

### `oc_atencion_items`

Relaciones:

- `oc_atencion_items.oc_atencion_id -> oc_atenciones.id`
- `oc_atencion_items.oc_recibida_item_id -> oc_recibida_items.id`
- `oc_atencion_items.producto_id -> productos.id`
- `oc_atencion_items.inventario_movimiento_id -> inventario_movimientos.id`

Modelo:

- `App\Models\OcAtencionItem`

### `oc_atencion_item_producto_serie`

Relaciones:

- `oc_atencion_item_id -> oc_atencion_items.id`
- `producto_serie_id -> producto_series.id`

Uso:

- vincular series seleccionadas a cada item de atencion.

### `requerimientos_compra`

Relaciones:

- `oc_recibida_id -> oc_recibidas.id`, nullable
- `solicitado_por -> users.id`
- `asignado_a -> users.id`

Modelo:

- `App\Models\RequerimientoCompra`

### `requerimiento_compra_items`

Relaciones:

- `requerimiento_compra_id -> requerimientos_compra.id`
- `oc_recibida_item_id -> oc_recibida_items.id`, nullable
- `cotizacion_item_id -> cotizacion_items.id`, nullable
- `producto_id -> productos.id`, nullable
- `producto_externo_id -> productos_externos.id`, nullable

Modelo:

- `App\Models\RequerimientoCompraItem`

## 4. Campos legacy que deben mantenerse

No eliminar todavia:

- `oc_recibidas.estado`
- `oc_recibidas.factura_path`
- `oc_recibidas.factura_numero`
- `oc_recibidas.guia_emision_path`
- `oc_recibida_items.comprado`
- `oc_recibida_items.entregado`
- `oc_emitidas.factura_path`
- `oc_emitidas.comprobante_pago_path`
- `productos.serie`
- `productos.factura_numero`
- `inventario_movimientos.producto_serie_id`

Estos campos siguen siendo necesarios durante la transicion.

## 5. Services existentes y metodos relevantes

### `App\Services\InventarioService`

Usar siempre para movimientos de stock.

Metodos relevantes:

- `reservarStock`
- `liberarReserva`
- `registrarSalidaDesdeReserva`
- `registrarSalida`
- `registrarEntrada`

Regla:

- Ningun controlador debe modificar `stock_actual`, `stock_reservado` o `stock_disponible` directamente.

### `App\Services\OcAtencionService`

Metodos:

- `crear`
- `confirmar`
- `cancelar`

Responsabilidades:

- validar cantidades,
- validar series,
- confirmar atencion,
- generar salida Kardex,
- mantener idempotencia,
- actualizar estados y campos legacy.

### `App\Services\RequerimientoCompraService`

Metodos:

- `crearManual`
- `generarDesdeOc`
- `calcularFaltantesOc`

Responsabilidades:

- crear requerimientos manuales,
- calcular faltantes reales por OC,
- descontar stock cubierto/reservado,
- descontar requerimientos activos previos,
- evitar duplicados,
- no tocar stock ni Kardex.

## 6. Controllers y endpoints actuales

### OC recibidas

Controller:

- `App\Http\Controllers\Api\OcRecibidaController`

Endpoints relevantes:

- `GET /api/oc-recibidas`
- `POST /api/oc-recibidas`
- `GET /api/oc-recibidas/{ocRecibida}`
- `PATCH /api/oc-recibidas/{ocRecibida}/items`
- `PATCH /api/oc-recibidas/{ocRecibida}/items/{item}/asociar-producto`
- `PATCH /api/oc-recibidas/{ocRecibida}/cancelar`
- `POST /api/oc-recibidas/{ocRecibida}/documentos`

Nota:

- `PATCH /items` es legacy y queda restringido a `superadmin|admin|logistica`.
- Si la OC tiene atenciones activas, no debe usarse para marcar entrega.

### Atenciones

Controller:

- `App\Http\Controllers\Api\OcAtencionController`

Endpoints:

- `GET /api/oc-recibidas/{ocRecibida}/atenciones`
- `POST /api/oc-recibidas/{ocRecibida}/atenciones`
- `GET /api/oc-atenciones/{ocAtencion}`
- `PATCH /api/oc-atenciones/{ocAtencion}/confirmar`
- `PATCH /api/oc-atenciones/{ocAtencion}/cancelar`

### Requerimientos de compra

Controller:

- `App\Http\Controllers\Api\RequerimientoCompraController`

Endpoints:

- `GET /api/requerimientos-compra`
- `POST /api/requerimientos-compra`
- `GET /api/requerimientos-compra/{requerimientoCompra}`
- `GET /api/oc-recibidas/{ocRecibida}/requerimientos/faltantes`
- `POST /api/oc-recibidas/{ocRecibida}/requerimientos/generar`

## 7. Modelos y relaciones Eloquent importantes

### `OcRecibida`

Relaciones importantes:

- `items`
- `atenciones`
- `requerimientosCompra`
- `documentosAdicionales`
- `cotizacion`
- `cliente`
- `usuario`

### `OcRecibidaItem`

Relaciones:

- `ocRecibida`
- `cotizacionItem`
- `atencionItems`
- `requerimientoCompraItems`

### `OcAtencion`

Relaciones:

- `ocRecibida`
- `items`
- `preparadoPor`
- `entregadoPor`
- `createdBy`

### `OcAtencionItem`

Relaciones:

- `atencion`
- `ocRecibidaItem`
- `producto`
- `inventarioMovimiento`
- `series`

### `ProductoSerie`

Relaciones nuevas:

- `ocAtencionItems`

### `InventarioMovimiento`

Relacion nueva:

- `ocAtencionItem`

### `RequerimientoCompra`

Relaciones:

- `items`
- `ocRecibida`
- `solicitadoPor`
- `asignadoA`

### `RequerimientoCompraItem`

Relaciones:

- `requerimiento`
- `ocRecibidaItem`
- `cotizacionItem`
- `producto`
- `productoExterno`

## 8. Permisos/roles actuales

### Atenciones

Lectura:

- `superadmin`
- `ventas`
- `admin`
- `contabilidad`
- `logistica`

Escritura:

- `superadmin`
- `admin`
- `logistica`

### Requerimientos

Lectura:

- `superadmin`
- `admin`
- `logistica`
- `contabilidad`
- `ventas`

Creacion/generacion:

- `superadmin`
- `admin`
- `logistica`

### OC recibidas

Crear:

- `superadmin`
- `ventas`

Subir documentos:

- `superadmin`
- `ventas`, si es propia
- `admin`
- `contabilidad`

## 9. Funcionamiento actual

### Reserva

- Se realiza con `InventarioService::reservarStock`.
- Usa movimiento `reserva`.
- Usa idempotency key: `oc-recibida:{oc_id}:reserva:cotizacion-item:{cotizacion_item_id}`.
- Aumenta `stock_reservado`.
- No se debe hacer por controlador directamente.

### Atencion

- Logistica crea `oc_atenciones`.
- Cada item se guarda en `oc_atencion_items`.
- Si hay series, se vinculan en `oc_atencion_item_producto_serie`.
- La cantidad preparada no puede superar pendiente.

### Salida Kardex

- Se genera al confirmar atencion.
- Usa `InventarioService::registrarSalidaDesdeReserva`.
- Referencia: `referencia_tipo = oc_atencion`.
- La salida descuenta `stock_actual` y libera reserva asociada.
- El movimiento se enlaza a `oc_atencion_items.inventario_movimiento_id`.

### Series

- Producto serializado requiere series.
- Cantidad de la atencion debe coincidir con cantidad de series.
- Una serie no puede estar en dos atenciones activas.
- Al confirmar, `InventarioService` marca las series como `vendido`.

### Requerimientos de compra

- Pueden nacer manualmente o desde OC.
- Desde OC se calcula faltante:
  - `solicitado`
  - menos `cubierto/reservado`
  - menos `requerimientos activos previos`
- Si no hay faltante, no crea nuevo requerimiento.
- Si ya existe un requerimiento activo y se repite el request, devuelve el activo.
- No toca stock.
- No genera Kardex.

## 10. Reglas de idempotencia utilizadas

Reserva legacy:

- `oc-recibida:{oc_id}:reserva:cotizacion-item:{cotizacion_item_id}`

Salida legacy:

- `oc-recibida:{oc_id}:salida:cotizacion-item:{cotizacion_item_id}`

Salida por atencion:

- `oc-atencion:{atencion_id}:item:{atencion_item_id}:salida`

Generacion de requerimientos:

- No usa columna idempotency.
- Usa transaccion con lock sobre `oc_recibidas`.
- Calcula requerimientos activos previos.
- Segundo request serializado no crea duplicado porque el faltante queda cubierto por el requerimiento activo.

## 11. Estados implementados

### `oc_recibidas.estado`

- `pendiente`
- `en_proceso`
- `por_entrega`
- `atendido`
- `cancelado`

### `oc_recibidas.estado_comercial`

- `registrada`
- `en_atencion`
- `cerrada`
- `cancelada`

### `oc_recibidas.estado_logistico`

- `pendiente`
- `preparando`
- `parcial`
- `entregado`

### `oc_recibidas.estado_documental`

- `pendiente`
- `incompleto`
- `completo`

### `oc_recibidas.estado_financiero`

- `pendiente`

### `oc_atenciones.estado`

- `borrador`
- `preparando`
- `despachado`
- `entregado`
- `cancelado`

### `requerimientos_compra.estado`

- `pendiente`
- `en_gestion`
- `parcialmente_comprado`
- `comprado`
- `cancelado`

## 12. Deuda tecnica y tests legacy fallando

Suite completa actual:

- 20 tests pasan.
- 2 tests fallan.

Fallos conocidos no relacionados con Fases 1-3:

1. `Tests\Feature\CotizacionModificacionTest`
   - Espera `200` al aprobar modificacion.
   - Backend devuelve `422`.

2. `Tests\Feature\InventarioServiceTest`
   - Espera que producto de stock sin SKU devuelva `422`.
   - Sistema actual permite crear con SKU automatico y devuelve `201`.

No corregir dentro de compras/contabilidad sin revisar reglas actuales.

## 13. Riesgos conocidos

- El endpoint legacy `PATCH /oc-recibidas/{id}/items` aun existe por compatibilidad.
- La reserva legacy no maneja reserva parcial automaticamente; Fase 3 calcula correctamente si existe reserva parcial, pero la generacion parcial automatica de reserva no esta implementada.
- `estado_financiero` existe pero aun no tiene logica real.
- Requerimientos ya pueden generar compras en Fase 4 mediante `compra_items.requerimiento_compra_item_id`.
- `cantidad_comprada` de requerimiento ya se recalcula desde compras confirmadas; `cantidad_recibida` queda para Fase 5.
- No hay aun CxP/CxC real.
- Control de pagos frontend sigue siendo prototipo/local en partes del sistema.
- No hay parser XML todavia.

---

# Fase 4 - Compras

## Estado real al 2026-08-13

Fase 4 backend y frontend quedan implementados.

Decision final aplicada:

- No existe `compras.requerimiento_compra_id`.
- La relacion con requerimientos vive en `compra_items.requerimiento_compra_item_id`.
- Una compra puede agrupar items de varios requerimientos.
- Una compra puede tener items manuales sin requerimiento.
- Crear compra no modifica stock, no genera Kardex y no incrementa `cantidad_comprada`.
- Confirmar compra recalcula `requerimiento_compra_items.cantidad_comprada` desde compras confirmadas.
- Cancelar compra recalcula cantidades y estados.
- Compra confirmada significa pendiente de recepcion.

Frontend agregado:

- `src/pages/RequerimientosCompra.tsx`
- `src/pages/Compras.tsx`
- `src/components/compras/CompraFormModal.tsx`
- `src/services/requerimientoCompra.service.ts`
- `src/services/compra.service.ts`

Rutas frontend:

- `/compras/requerimientos`
- `/compras`

Permisos:

- Lectura: `SUPERADMIN`, `ADMIN`, `LOGISTICA`, `CONTABILIDAD`.
- Escritura: `SUPERADMIN`, `ADMIN`, `LOGISTICA`.
- Ventas no ve modulo interno de compras.

Nota para Fase 5: construir recepciones contra `compra_items`; no asumir compra ligada a un unico requerimiento.

## Objetivo

Crear la entidad real de compra, independiente de OC emitida. Una compra puede ser directa o con OC proveedor.

## Migraciones faltantes

Crear:

- `create_compras_table`
- `create_compra_items_table`

## Tablas

### `compras`

Campos:

- `id`
- `numero` unique
- `requerimiento_compra_id` nullable FK
- `proveedor_id` FK
- `oc_emitida_id` nullable FK
- `modalidad`
- `estado`
- `fecha_compra` nullable
- `moneda_id` nullable FK
- `subtotal_estimado` nullable decimal
- `total_estimado` nullable decimal
- `observacion` nullable
- `creado_por` FK users
- timestamps

Modalidad:

- `directa`
- `oc_proveedor`

Estados:

- `borrador`
- `confirmada`
- `parcialmente_recibida`
- `recibida`
- `cancelada`

### `compra_items`

Campos:

- `id`
- `compra_id` FK
- `requerimiento_compra_item_id` nullable FK
- `oc_emitida_item_id` nullable FK
- `producto_id` nullable FK
- `producto_externo_id` nullable FK
- `descripcion`
- `cantidad`
- `cantidad_recibida`
- `costo_unitario_estimado` nullable
- `moneda_id` nullable FK
- `estado`
- timestamps

## Modelos

Crear:

- `App\Models\Compra`
- `App\Models\CompraItem`

Relaciones:

- Compra `belongsTo` RequerimientoCompra, Proveedor, OcEmitida, Moneda, User.
- Compra `hasMany` CompraItem.
- CompraItem `belongsTo` Compra, RequerimientoCompraItem, OcEmitidaItem, Producto, ProductoExterno, Moneda.

## Services

Crear:

- `App\Services\CompraService`

Metodos:

- `crear`
- `confirmar`
- `cancelar`
- `actualizarEstadosDesdeRecepcion` (preparar para Fase 5)

Reglas:

- `oc_emitida_id` debe ser nullable.
- Si modalidad es `oc_proveedor`, validar que exista `oc_emitida_id`.
- Si modalidad es `directa`, `oc_emitida_id` debe ser null.
- Una compra puede cubrir parte de un requerimiento.
- Suma de compras activas no debe superar cantidad requerida del item.
- No modificar stock.
- No generar Kardex.

## Controllers

Crear:

- `App\Http\Controllers\Api\CompraController`

Endpoints:

- `GET /api/compras`
- `POST /api/compras`
- `GET /api/compras/{compra}`
- `PATCH /api/compras/{compra}/confirmar`
- `PATCH /api/compras/{compra}/cancelar`

## Requests

Crear:

- `StoreCompraRequest`
- `ConfirmarCompraRequest`

## Permisos

Lectura:

- `superadmin`
- `admin`
- `logistica`
- `contabilidad`

Escritura:

- `superadmin`
- `admin`
- `logistica`

## Archivos a modificar

- `routes/api.php`
- `app/Models/RequerimientoCompra.php`
- `app/Models/RequerimientoCompraItem.php`
- posiblemente `app/Models/OcEmitida.php`
- posiblemente `app/Models/OcEmitidaItem.php`

## Dependencias

- Fase 3 debe estar implementada.
- Proveedores deben existir.

## Orden exacto

1. Crear migraciones.
2. Crear modelos y relaciones.
3. Crear requests.
4. Crear `CompraService`.
5. Crear controller.
6. Agregar rutas.
7. Crear tests.
8. Documentar.

## Tests necesarios

- Compra directa sin OC emitida.
- Compra con OC proveedor.
- Varias compras para un mismo requerimiento.
- No superar cantidad requerida.
- Cancelacion no afecta stock.
- Confirmacion no afecta stock.

## Criterios de aceptacion

- Compra directa funciona sin `oc_emitida`.
- Compra con OC proveedor funciona con `oc_emitida_id`.
- Compra puede cubrir parcial.
- No hay Kardex en Fase 4.

## Riesgos

- Confundir compra con recepcion.
- Vincular obligatoriamente OC proveedor.
- Mover stock en esta fase.

---

# Fase 5 - Recepciones

## Estado real al 2026-08-13

Fase 5 backend queda implementado.

Archivos creados:

- `database/migrations/2026_08_13_000001_create_recepciones_compra_tables.php`
- `database/migrations/2026_08_13_000002_add_recepcion_trace_to_inventory_tables.php`
- `app/Models/RecepcionCompra.php`
- `app/Models/RecepcionItem.php`
- `app/Services/RecepcionCompraService.php`
- `app/Http/Controllers/Api/RecepcionCompraController.php`
- `app/Http/Requests/StoreRecepcionCompraRequest.php`
- `app/Http/Requests/ConfirmarRecepcionCompraRequest.php`
- `tests/Feature/RecepcionCompraFlowTest.php`

Tablas:

- `recepciones_compra`
- `recepcion_items`

Trazabilidad:

- `inventario_movimientos.recepcion_item_id`
- `inventario_movimientos.costo_tipo`
- `producto_series.recepcion_item_id`

Reglas implementadas:

- Crear recepcion no modifica stock ni Kardex.
- Confirmar recepcion genera entrada Kardex con `InventarioService::registrarEntrada`.
- Confirmar recepcion es idempotente por item con key `recepcion-compra:{recepcion_id}:item:{item_id}:entrada`.
- No se permite recibir mas que lo comprado.
- Compra puede recibirse parcialmente.
- Factura proveedor no es obligatoria.
- Series se registran al confirmar y quedan disponibles.
- Series duplicadas se bloquean antes de llamar a inventario.
- Recepcion confirmada no se cancela porque ya genero Kardex; un reverso explicito queda para una fase futura si se requiere.

Estados:

- `recepciones_compra.estado`: `borrador`, `confirmada`, `cancelada`.
- `recepcion_items.estado`: `pendiente`, `confirmado`, `cancelado`.
- `compras.estado`: pasa a `parcialmente_recibida` o `recibida`.

Nota para Fase 6: los comprobantes proveedor deben vincularse a compras y opcionalmente a recepciones, pero recepcion fisica no depende de factura.

## Objetivo

Registrar recepcion fisica de compras, parcial o total, y generar entrada Kardex con costo provisional.

## Migraciones

Crear:

- `create_recepciones_compra_table`
- `create_recepcion_items_table`
- `add_recepcion_item_id_and_costo_tipo_to_inventario_movimientos_table`
- evaluar `add_recepcion_item_id_to_producto_series_table`

## Tablas

### `recepciones_compra`

Campos:

- `id`
- `numero` unique
- `compra_id` FK
- `proveedor_id` FK
- `fecha_recepcion`
- `estado`
- `recibido_por`
- `observacion`
- timestamps

Estados:

- `borrador`
- `confirmada`
- `anulada`

### `recepcion_items`

Campos:

- `id`
- `recepcion_compra_id`
- `compra_item_id`
- `producto_id`
- `cantidad`
- `costo_unitario_provisional`
- `moneda_id`
- `inventario_movimiento_id`
- timestamps

## Modelos

Crear:

- `RecepcionCompra`
- `RecepcionItem`

## Services

Crear:

- `RecepcionCompraService`

Metodos:

- `crear`
- `confirmar`
- `anular`

Reglas:

- No permitir recibir mas que cantidad comprada.
- Recepcion puede ser parcial.
- Confirmar genera entrada Kardex con `InventarioService::registrarEntrada`.
- `costo_tipo = provisional`.
- Series se registran en recepcion.
- Factura no es obligatoria para recibir.

## Controllers

Crear:

- `RecepcionCompraController`

Endpoints:

- `GET /api/recepciones-compra`
- `POST /api/compras/{compra}/recepciones`
- `GET /api/recepciones-compra/{recepcion}`
- `PATCH /api/recepciones-compra/{recepcion}/confirmar`
- `PATCH /api/recepciones-compra/{recepcion}/anular`

## Requests

- `StoreRecepcionCompraRequest`
- `ConfirmarRecepcionCompraRequest`

## Permisos

Lectura:

- `superadmin`, `admin`, `logistica`, `contabilidad`

Escritura:

- `superadmin`, `admin`, `logistica`

## Archivos a modificar

- `InventarioMovimiento`
- `ProductoSerie`
- `Compra`
- `CompraItem`
- `routes/api.php`

## Dependencias

- Fase 4 compras.
- `InventarioService`.

## Tests

- Recepcion parcial 6 de 10.
- Segunda recepcion completa 4 de 10.
- No recibir mas de lo comprado.
- Entrada Kardex idempotente.
- Recepcion sin factura.
- Series ingresadas quedan disponibles.

## Criterios de aceptacion

- Recepcion confirmada aumenta stock.
- No requiere factura.
- Compra cambia a parcialmente_recibida/recibida.

## Riesgos

- Duplicar entrada al confirmar dos veces.
- Sobrescribir costo historico.
- Reusar series existentes vendidas.

---

# Fase 6 - Comprobantes

## Objetivo

Centralizar facturas/comprobantes de compra y venta sin depender de OC emitida/recibida 1:1.

## Migraciones

Crear:

- `create_comprobantes_table`
- `create_comprobante_items_table`

## Tabla `comprobantes`

Campos:

- `id`
- `tipo_operacion`
- `tipo_comprobante`
- `serie`
- `numero`
- `fecha_emision`
- `fecha_vencimiento`
- `emisor_ruc`
- `emisor_nombre`
- `receptor_ruc`
- `receptor_nombre`
- `moneda_id`
- `subtotal`
- `igv`
- `total`
- `xml_path`
- `pdf_path`
- `xml_hash`
- `origen_datos`
- `estado_validacion`
- `proveedor_id`
- `cliente_id`
- `compra_id`
- `oc_recibida_id`
- `cotizacion_id`
- `created_by`
- timestamps

Tipos:

- `tipo_operacion`: `compra`, `venta`
- `origen_datos`: `xml`, `manual`
- `estado_validacion`: `pendiente`, `validado_xml`, `manual`, `observado`

## Tabla `comprobante_items`

Campos:

- `comprobante_id`
- `codigo`
- `descripcion`
- `unidad_medida`
- `cantidad`
- `valor_unitario`
- `precio_unitario`
- `subtotal`
- `igv`
- `total`
- `producto_id`
- `compra_item_id`
- `recepcion_item_id`

## Services

Crear:

- `ComprobanteService`

Metodos:

- `crearManual`
- `confirmarCompra`
- `confirmarVenta`
- `detectarDuplicado`

Reglas:

- Compra puede tener varias facturas.
- OC cliente puede tener varias facturas.
- Factura proveedor se asocia a `compra_id`, no obliga `oc_emitida_id`.
- Dedupe por `emisor_ruc + tipo_comprobante + serie + numero`.
- `xml_hash` unico si existe.

## Controllers

- `ComprobanteController`

Endpoints:

- `GET /api/contabilidad/comprobantes`
- `POST /api/contabilidad/comprobantes`
- `GET /api/contabilidad/comprobantes/{comprobante}`
- `POST /api/compras/{compra}/comprobantes`
- `POST /api/oc-recibidas/{ocRecibida}/comprobantes`

## Requests

- `StoreComprobanteRequest`

## Permisos

Lectura:

- `superadmin`, `admin`, `contabilidad`

Escritura:

- `superadmin`, `admin`, `contabilidad`

## Tests

- Factura proveedor sin OC emitida.
- Varias facturas por compra.
- Varias facturas por OC recibida.
- Duplicado por serie/numero.
- Duplicado por XML hash.

## Riesgos

- Duplicar campos legacy de OC.
- Crear CxP/CxC antes de confirmar comprobante.

---

# Fase 7 - Cuentas por pagar / Pagos

## Objetivo

Generar cuentas por pagar desde comprobantes de compra y registrar pagos parciales/totales.

## Migraciones

Crear:

- `create_cuentas_por_pagar_table`
- `create_pagos_table`

## `cuentas_por_pagar`

Campos:

- `comprobante_id`
- `proveedor_id`
- `fecha_emision`
- `fecha_vencimiento`
- `moneda_id`
- `monto_total`
- `monto_pagado`
- `saldo`
- `estado`

Estados:

- `pendiente`
- `parcial`
- `pagada`
- `vencida`
- `anulada`

## `pagos`

Campos:

- `cuenta_por_pagar_id`
- `fecha_pago`
- `monto`
- `moneda_id`
- `medio_pago`
- `numero_operacion`
- `documento_path`
- `observacion`
- `registrado_por`
- `estado`

## Services

- `CuentaPorPagarService`

Metodos:

- `generarDesdeComprobante`
- `registrarPago`
- `recalcularSaldo`
- `anularPago`

Reglas:

- No permitir pagos confirmados sobre saldo salvo permiso administrativo.
- Saldo se recalcula desde pagos validos.
- Estado no debe ser unica fuente.

## Controllers

- `CuentaPorPagarController`
- `PagoController`

Endpoints:

- `GET /api/contabilidad/cuentas-por-pagar`
- `GET /api/contabilidad/cuentas-por-pagar/{cuenta}`
- `POST /api/contabilidad/cuentas-por-pagar/{cuenta}/pagos`
- `PATCH /api/contabilidad/pagos/{pago}/anular`

## Tests

- CxP desde factura compra.
- Pago parcial.
- Pago total.
- No exceder saldo.
- Recalculo correcto.
- Vencimiento.

## Riesgos

- Guardar saldo manual sin recalculo.
- Monedas distintas sin definir conversion.

---

# Fase 8 - Cuentas por cobrar / Cobros

## Objetivo

Generar cuentas por cobrar desde comprobantes de venta y registrar cobros parciales/totales.

## Migraciones

Crear:

- `create_cuentas_por_cobrar_table`
- `create_cobros_table`

## `cuentas_por_cobrar`

Campos:

- `comprobante_id`
- `cliente_id`
- `oc_recibida_id`
- `fecha_emision`
- `fecha_vencimiento`
- `moneda_id`
- `monto_total`
- `monto_cobrado`
- `saldo`
- `estado`

## `cobros`

Campos:

- `cuenta_por_cobrar_id`
- `fecha_cobro`
- `monto`
- `moneda_id`
- `medio_pago`
- `numero_operacion`
- `documento_path`
- `observacion`
- `registrado_por`
- `estado`

## Services

- `CuentaPorCobrarService`

Metodos:

- `generarDesdeComprobante`
- `registrarCobro`
- `recalcularSaldo`
- `anularCobro`

## Controllers

- `CuentaPorCobrarController`
- `CobroController`

Endpoints:

- `GET /api/contabilidad/cuentas-por-cobrar`
- `GET /api/contabilidad/cuentas-por-cobrar/{cuenta}`
- `POST /api/contabilidad/cuentas-por-cobrar/{cuenta}/cobros`
- `PATCH /api/contabilidad/cobros/{cobro}/anular`

## Tests

- CxC desde factura venta.
- Cobro parcial.
- Cobro total.
- No exceder saldo.
- Vencimiento.

## Riesgos

- Confundir OC recibida con factura emitida.
- Manejar varias facturas por OC.

---

# Fase 9 - XML SUNAT / UBL

## Objetivo

Previsualizar XML UBL sin consumir APIs SUNAT ni hacer scraping.

## Archivos nuevos

Crear carpeta:

- `app/Services/Sunat/`

Crear:

- `SunatXmlService.php`
- `FacturaUblParser.php`

## Endpoint

- `POST /api/contabilidad/comprobantes/preview-xml`

## Request

- `PreviewComprobanteXmlRequest`

## Reglas

- Validar archivo XML.
- Parsear UBL con namespaces.
- Extraer cabecera, emisor, receptor, moneda, totales e items.
- Generar SHA-256.
- Detectar duplicado por hash y por emisor/tipo/serie/numero.
- Detectar tipo operacion con `COMPANY_RUC`.
- Si emisor es Willatec: venta.
- Si receptor es Willatec: compra.
- Si ninguno coincide: observado/rechazado.
- No guardar en preview.

## Tests

- XML compra.
- XML venta.
- XML duplicado por hash.
- XML duplicado por serie/numero.
- XML mal formado.
- XML donde Willatec no participa.

## Riesgos

- Variantes UBL.
- Encodings.
- Montos con redondeos.

---

# Fase 10 - Frontend y alertas

## Objetivo

Construir UI completa para fases 4-9 y alertas operativas.

## Frontend nuevo/modificado

Crear o adaptar:

- `src/pages/logistica/AtencionesPendientes.tsx`
- `src/pages/compras/RequerimientosCompra.tsx`
- `src/pages/compras/Compras.tsx`
- `src/pages/compras/RecepcionesCompra.tsx`
- `src/pages/contabilidad/Comprobantes.tsx`
- `src/pages/contabilidad/CuentasPorPagar.tsx`
- `src/pages/contabilidad/CuentasPorCobrar.tsx`

Servicios:

- `src/services/requerimientoCompra.service.ts`
- `src/services/compra.service.ts`
- `src/services/recepcionCompra.service.ts`
- `src/services/comprobante.service.ts`
- `src/services/cuentaPorPagar.service.ts`
- `src/services/cuentaPorCobrar.service.ts`

## Alertas

Agregar alertas para:

- OC con faltantes sin requerimiento.
- Requerimientos pendientes.
- Compras confirmadas sin recepcion.
- Recepciones sin factura.
- CxP vencida.
- CxC vencida.
- Comprobantes observados.

## Orden

1. Requerimientos UI.
2. Compras UI.
3. Recepciones UI.
4. Comprobantes UI.
5. CxP/Pagos UI.
6. CxC/Cobros UI.
7. Alertas.
8. Dashboard.

## Riesgos

- Tablas demasiado anchas.
- Acciones de contabilidad visibles a roles incorrectos.
- Confundir documentos legacy con comprobantes.

## Criterios de aceptacion

- Logistica ve faltantes y requerimientos.
- Compras puede gestionar compra directa/con OC.
- Recepcion genera stock.
- Contabilidad ve facturas, CxP/CxC.
- Alertas claras por pendientes.
- Responsive consistente con tablas actuales.

---

# Cierre real Fases 4-10 al 2026-08-13

## Implementado

### Fase 4

- Frontend de requerimientos de compra.
- Frontend de compras.
- Compra directa y compra con OC proveedor.
- Compra confirmada no mueve inventario.

### Fase 5

- Backend de recepciones de compra.
- Multiples recepciones por compra.
- Confirmacion de recepcion genera entrada Kardex mediante `InventarioService`.
- Series recibidas asociadas a `recepcion_item_id`.
- Frontend de recepciones.

### Fase 6

- Backend central de comprobantes.
- `comprobantes` y `comprobante_items`.
- Comprobante de compra o venta.
- Duplicados por `xml_hash` y por emisor/tipo/serie/numero.
- Frontend de comprobantes y preview XML.

### Fase 7

- `cuentas_por_pagar`.
- `pagos`.
- Pagos parciales, totales, multiples.
- Recalculo de saldo desde pagos validos.
- Idempotencia por `idempotency_key`.
- Frontend CxP / pagos.

### Fase 8

- `cuentas_por_cobrar`.
- `cobros`.
- Cobros parciales, totales, multiples.
- Recalculo de saldo desde cobros validos.
- Idempotencia por `idempotency_key`.
- Sincronizacion de `oc_recibidas.estado_financiero`.
- Frontend CxC / cobros.

### Fase 9

- `App\Services\Sunat\FacturaUblParser`.
- `App\Services\Sunat\SunatXmlService`.
- `POST /api/contabilidad/comprobantes/preview-xml`.
- Clasificacion con `COMPANY_RUC`.
- No se conecta a SUNAT.

### Fase 10

- Navegacion separada: Compras, Recepciones, Contabilidad.
- Indicadores en `AlertasOperativas`.
- Endpoint `GET /api/operaciones/alertas`.

## Migraciones nuevas

- `2026_08_12_172024_create_compras_tables.php`
- `2026_08_13_000001_create_recepciones_compra_tables.php`
- `2026_08_13_000002_add_recepcion_trace_to_inventory_tables.php`
- `2026_08_13_000003_create_comprobantes_tables.php`
- `2026_08_13_000004_create_cuentas_por_pagar_tables.php`
- `2026_08_13_000005_create_cuentas_por_cobrar_tables.php`

## Endpoints nuevos principales

- `/api/compras`
- `/api/recepciones-compra`
- `/api/contabilidad/comprobantes`
- `/api/contabilidad/comprobantes/preview-xml`
- `/api/contabilidad/cuentas-por-pagar`
- `/api/contabilidad/cuentas-por-cobrar`
- `/api/operaciones/alertas`

## Pruebas ejecutadas

Backend:

```bash
php artisan test tests\Feature\CompraFlowTest.php tests\Feature\RecepcionCompraFlowTest.php tests\Feature\ComprobanteFlowTest.php tests\Feature\CuentaPorPagarFlowTest.php tests\Feature\CuentaPorCobrarFlowTest.php tests\Feature\SunatXmlPreviewTest.php
```

Resultado:

- 33 tests passed.
- 203 assertions.

Frontend:

```bash
npx tsc --noEmit
npm run build
```

Resultado:

- Build exitoso.
- Warning no bloqueante: chunks grandes de Vite.

## Riesgos pendientes

- El preview XML cubre UBL comun, pero pueden existir variantes SUNAT con nodos opcionales o estructuras distintas.
- Los comprobantes guardados desde XML quedan sin enlazar automaticamente a compra/OC/cliente/proveedor; ese matching automatico puede agregarse despues.
- Las alertas son indicadores agregados, no una bandeja con drill-down por cada item.
- La recepcion frontend crea borrador desde saldos pendientes de una compra, pero la seleccion fina de series/costos puede requerir una segunda mejora visual.
