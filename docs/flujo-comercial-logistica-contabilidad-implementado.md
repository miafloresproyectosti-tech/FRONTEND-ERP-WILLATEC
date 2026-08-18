# Flujo comercial, logistica y contabilidad implementado

Fecha de inicio: 2026-08-12

## Estado general

La implementacion comenzo por la Fase 1: estabilizacion del flujo actual.

No se eliminaron estructuras legacy. Los campos actuales siguen existiendo para mantener compatibilidad con produccion.

## Fase 1: estabilizacion

### Tablas modificadas

#### `oc_recibidas`

Se agregaron campos incrementales:

- `estado_comercial`
- `estado_logistico`
- `estado_documental`
- `estado_financiero`

El campo legacy `estado` se mantiene.

### Migraciones creadas

- `2026_08_12_000001_add_independent_statuses_to_oc_recibidas_table.php`

### Backend modificado

#### `OcRecibidaController`

Cambios:

- `index` queda como lectura y ya no sincroniza reservas/salidas.
- `show` queda como lectura y ya no sincroniza reservas/salidas.
- `actualizarEstadoOc` ya no bloquea `atendido` por documentos incompletos.
- `registrarSalidaAtendida` ya no exige factura para generar salida Kardex.
- Si hay factura, el movimiento mantiene el documento asociado.
- Si no hay factura, el movimiento se registra contra la OC recibida.

#### `OcRecibida`

Cambios:

- Se agregaron constantes para estados independientes.
- Se agregaron campos fillable nuevos.

### Frontend modificado

#### `OrdenesCompraPage.tsx`

Cambios:

- El campo legacy `comprado` deja de mostrarse como compra real.
- Visualmente se muestra como `Cubierto`.
- Los mensajes indican `stock asegurado` o `stock cubierto`.
- El contrato API conserva `comprado` para compatibilidad.

## Estados

### Estado legacy

Se mantiene:

- `pendiente`
- `en_proceso`
- `por_entrega`
- `atendido`
- `cancelado`

### Estado comercial

- `registrada`
- `en_atencion`
- `cerrada`
- `cancelada`

### Estado logistico

- `pendiente`
- `preparando`
- `parcial`
- `entregado`

### Estado documental

- `pendiente`
- `incompleto`
- `completo`

### Estado financiero

- `pendiente`

## Compatibilidad legacy

No se eliminaron:

- `oc_recibidas.factura_path`
- `oc_recibidas.factura_numero`
- `oc_recibidas.guia_emision_path`
- `oc_recibida_items.comprado`
- `oc_recibida_items.entregado`

## Decisiones tomadas

1. GET no debe modificar inventario.
2. La factura pendiente no bloquea salida fisica.
3. La ausencia de factura debe reflejarse como estado documental pendiente/incompleto.
4. `comprado` se conserva como campo tecnico legacy, pero se comunica al usuario como stock cubierto/asegurado.

## Pendiente

La siguiente fase debe implementar:

- compras directas o con OC proveedor
- recepciones de compra
- comprobantes, CxP, pagos, CxC y cobros

## Fase 2: atenciones y logistica

Fecha: 2026-08-12

### Tablas creadas

#### `oc_atenciones`

Registra cada atencion/despacho logistico de una OC recibida.

Campos principales:

- `oc_recibida_id`
- `numero`
- `fecha_atencion`
- `estado`
- `tipo_atencion`
- `observacion`
- `preparado_por`
- `entregado_por`
- `fecha_entrega`
- `created_by`

Estados:

- `borrador`
- `preparando`
- `despachado`
- `entregado`
- `cancelado`

#### `oc_atencion_items`

Registra los items atendidos dentro de cada atencion.

Campos principales:

- `oc_atencion_id`
- `oc_recibida_item_id`
- `producto_id`
- snapshot de descripcion, codigo, marca y unidad
- `cantidad`
- `cantidad_entregada`
- `inventario_movimiento_id`
- `estado`

#### `oc_atencion_item_producto_serie`

Tabla pivote entre items de atencion y series.

Uso:

- registrar que series salen en cada atencion,
- validar que una serie no se use en dos atenciones activas,
- permitir consulta comercial posterior.

### Campos agregados

#### `inventario_movimientos`

Se agrego:

- `oc_atencion_item_id`

Uso:

- enlazar la salida Kardex con el item logistico que la origino.

### Servicios creados

#### `OcAtencionService`

Responsabilidades:

- crear atenciones parciales,
- validar que la cantidad atendida no supere lo solicitado,
- validar stock cubierto,
- validar series,
- impedir reutilizacion de series,
- confirmar atencion,
- generar salida Kardex mediante `InventarioService`,
- mantener idempotencia por item de atencion,
- actualizar estados logisticos,
- mantener sincronizados campos legacy `estado` y `oc_recibida_items.entregado`.

### Endpoints creados

Lectura:

- `GET /api/oc-recibidas/{ocRecibida}/atenciones`
- `GET /api/oc-atenciones/{ocAtencion}`

Escritura logistica:

- `POST /api/oc-recibidas/{ocRecibida}/atenciones`
- `PATCH /api/oc-atenciones/{ocAtencion}/confirmar`
- `PATCH /api/oc-atenciones/{ocAtencion}/cancelar`

Roles de escritura:

- `superadmin`
- `admin`
- `logistica`

Roles de lectura:

- `superadmin`
- `ventas`
- `admin`
- `contabilidad`
- `logistica`

### Compatibilidad legacy

Se mantiene:

- `oc_recibida_items.entregado`
- `oc_recibida_items.comprado`
- `oc_recibidas.estado`

Cambios de compatibilidad:

- Ventas ya no puede usar el endpoint legacy para marcar entrega.
- El endpoint legacy de items queda restringido a `superadmin`, `admin` y `logistica`.
- Si una OC ya tiene atenciones logisticas activas, el endpoint legacy no permite marcar entrega para evitar doble salida.

### Reglas implementadas

- Una OC puede tener multiples atenciones.
- Una atencion puede cubrir parcialmente un item.
- La suma preparada en atenciones activas no puede superar la cantidad de la OC.
- La suma entregada confirmada no puede superar la cantidad de la OC.
- Para productos con series, la cantidad de la atencion debe coincidir con la cantidad de series.
- Una serie no puede estar en dos atenciones activas.
- Confirmar una atencion genera salida Kardex con `InventarioService`.
- Confirmar dos veces la misma atencion no duplica la salida Kardex.
- La factura y la guia no bloquean la atencion logistica.
- `estado_logistico` refleja `pendiente`, `preparando`, `parcial` o `entregado`.

### Frontend

Cambios:

- En `OrdenesCompraPage.tsx`, la edicion de entrega/series de OC recibidas queda disponible solo para `SUPERADMIN`, `ADMIN` y `LOGISTICA`.
- Ventas conserva consulta y documentos segun permisos existentes.
- En `ordenCompra.service.ts` se agregaron funciones para consumir atenciones logisticas.

Funciones agregadas:

- `getOcRecibidaAtenciones`
- `createOcAtencion`
- `getOcAtencion`
- `confirmarOcAtencion`
- `cancelarOcAtencion`

### Pruebas agregadas

Archivo:

- `tests/Feature/OcAtencionFlowTest.php`

Escenario cubierto:

- atencion parcial con series,
- salida Kardex desde atencion,
- idempotencia de confirmacion,
- bloqueo de reutilizacion de series,
- segunda atencion parcial,
- cierre logistico final,
- sincronizacion legacy.

## Fase 3: requerimientos de compra

Fecha: 2026-08-12

### Tablas creadas

#### `requerimientos_compra`

Registra necesidades de compra. No depende obligatoriamente de una OC recibida.

Campos principales:

- `numero`
- `origen_tipo`
- `oc_recibida_id`
- `estado`
- `prioridad`
- `solicitado_por`
- `asignado_a`
- `observacion`

Origenes:

- `oc_cliente`
- `reposicion_stock`
- `manual`
- `licitacion`
- `otro`

Estados:

- `pendiente`
- `en_gestion`
- `parcialmente_comprado`
- `comprado`
- `cancelado`

#### `requerimiento_compra_items`

Registra el detalle requerido.

Campos principales:

- `requerimiento_compra_id`
- `oc_recibida_item_id`
- `cotizacion_item_id`
- `producto_id`
- `producto_externo_id`
- `descripcion`
- `cantidad_requerida`
- `cantidad_comprada`
- `cantidad_recibida`
- `estado`

### Servicio creado

#### `RequerimientoCompraService`

Responsabilidades:

- crear requerimientos manuales,
- generar requerimientos desde OC,
- calcular faltantes reales,
- restar cantidades cubiertas/reservadas,
- restar requerimientos activos previos,
- permitir productos externos sin producto interno,
- no modificar stock,
- no generar Kardex.

### Endpoints creados

Requerimientos:

- `GET /api/requerimientos-compra`
- `POST /api/requerimientos-compra`
- `GET /api/requerimientos-compra/{requerimientoCompra}`

Desde OC recibida:

- `GET /api/oc-recibidas/{ocRecibida}/requerimientos/faltantes`
- `POST /api/oc-recibidas/{ocRecibida}/requerimientos/generar`

### Permisos

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

### Reglas implementadas

- Un requerimiento puede existir sin OC recibida.
- Desde OC, solo se genera por faltante real.
- Si solicitado es 10 y cubierto/reservado es 4, se genera 6.
- Los requerimientos activos previos se descuentan.
- Doble request no duplica requerimientos: el segundo devuelve el activo existente.
- Producto externo sin producto interno puede generar requerimiento.
- Crear requerimiento no modifica stock y no crea Kardex.

### Pruebas agregadas

Archivo:

- `tests/Feature/RequerimientoCompraFlowTest.php`

Escenarios cubiertos:

- faltante parcial 10 solicitado, 4 reservado, requerimiento 6,
- producto externo sin interno genera faltante completo,
- doble request no duplica,
- requerimiento manual sin OC recibida,
- no se generan entradas/salidas Kardex.

## Fase 4: compras

Fecha: 2026-08-13

### Backend existente tomado como fuente de verdad

Durante esta etapa se respeto la implementacion backend ya existente:

- `compras`
- `compra_items`
- `Compra`
- `CompraItem`
- `CompraService`
- `CompraController`
- `StoreCompraRequest`
- `ConfirmarCompraRequest`
- `tests/Feature/CompraFlowTest.php`

La relacion real implementada es:

- `Compra` tiene muchos `CompraItem`.
- `CompraItem` puede apuntar a `requerimiento_compra_item_id`.
- Una compra puede agrupar items de varios requerimientos.
- Una compra tambien puede contener items manuales sin requerimiento.

No se implemento `compras.requerimiento_compra_id`.

### Reglas funcionales

- Crear compra deja `estado = borrador`.
- Crear compra no modifica stock.
- Crear compra no genera Kardex.
- Crear compra no incrementa `cantidad_comprada`.
- Confirmar compra recalcula `requerimiento_compra_items.cantidad_comprada`.
- Confirmar compra no modifica stock.
- Confirmar compra no genera Kardex.
- Cancelar compra recalcula cantidades compradas y estados de requerimientos.
- Compra confirmada significa pendiente de recepcion, no producto recibido.

### Modalidades

- `directa`: no requiere OC emitida.
- `oc_proveedor`: requiere OC emitida compatible con el proveedor.

La validacion de proveedor conserva compatibilidad legacy porque `oc_emitidas` aun guarda proveedor como texto.

### Frontend implementado

Pantallas:

- `src/pages/RequerimientosCompra.tsx`
- `src/pages/Compras.tsx`

Componente compartido:

- `src/components/compras/CompraFormModal.tsx`

Servicios:

- `src/services/requerimientoCompra.service.ts`
- `src/services/compra.service.ts`

Rutas:

- `/compras/requerimientos`
- `/compras`

Sidebar:

- Grupo `Compras`.
- Accesos a `Requerimientos` y `Compras`.

### Requerimientos de compra UI

La pantalla muestra:

- numero,
- origen,
- prioridad,
- estado,
- fecha,
- solicitado por,
- items,
- cantidad requerida,
- cantidad comprada,
- cantidad recibida,
- saldo pendiente de compra.

Acciones:

- ver detalle,
- seleccionar varios items pendientes,
- crear compra desde uno o varios requerimientos.

### Compras UI

La pantalla muestra:

- numero,
- proveedor,
- fecha,
- modalidad,
- estado,
- moneda,
- total estimado,
- cantidad de items.

Filtros:

- estado,
- modalidad,
- busqueda.

Detalle:

- proveedor,
- modalidad,
- OC proveedor si aplica,
- fecha,
- estado,
- moneda,
- observacion,
- items,
- requerimiento relacionado,
- cantidad recibida.

Acciones:

- confirmar,
- cancelar.

### Permisos frontend

Lectura:

- `SUPERADMIN`
- `ADMIN`
- `LOGISTICA`
- `CONTABILIDAD`

Escritura:

- `SUPERADMIN`
- `ADMIN`
- `LOGISTICA`

Ventas no tiene permiso `compras` y no ve el modulo interno.

### Ajuste backend menor

Se agrego `logistica` a la lectura de `oc-emitidas` para que pueda seleccionar una OC proveedor compatible desde la creacion de compras.

### Pruebas

Frontend:

- `npx tsc --noEmit`

Backend pendiente de registrar en cierre:

- `php artisan test`

## Fase 5: recepciones de compra

Fecha: 2026-08-13

### Tablas creadas

#### `recepciones_compra`

Representa la llegada fisica de productos comprados.

Campos principales:

- `numero`
- `compra_id`
- `proveedor_id`
- `fecha_recepcion`
- `estado`
- `observacion`
- `recibido_por`
- `confirmado_en`

Estados:

- `borrador`
- `confirmada`
- `cancelada`

#### `recepcion_items`

Detalle de lo recibido.

Campos principales:

- `recepcion_compra_id`
- `compra_item_id`
- `producto_id`
- `descripcion`
- `cantidad`
- `costo_unitario_provisional`
- `moneda_id`
- `estado`
- `inventario_movimiento_id`

### Trazabilidad agregada

Se agrego a `inventario_movimientos`:

- `recepcion_item_id`
- `costo_tipo`

Se agrego a `producto_series`:

- `recepcion_item_id`

### Servicio creado

#### `RecepcionCompraService`

Responsabilidades:

- crear recepciones en borrador,
- validar que la compra este confirmada o parcialmente recibida,
- impedir recibir mas de lo comprado,
- confirmar recepciones de forma idempotente,
- generar entrada Kardex via `InventarioService::registrarEntrada`,
- registrar costo provisional (`costo_tipo = provisional`),
- registrar series recibidas,
- evitar series duplicadas,
- recalcular `compra_items.cantidad_recibida`,
- recalcular `requerimiento_compra_items.cantidad_recibida`,
- recalcular estado de compra.

### Endpoints creados

- `GET /api/recepciones-compra`
- `GET /api/recepciones-compra/{recepcion}`
- `POST /api/compras/{compra}/recepciones`
- `PATCH /api/recepciones-compra/{recepcion}/confirmar`
- `PATCH /api/recepciones-compra/{recepcion}/cancelar`

### Reglas implementadas

- Crear recepcion no modifica stock.
- Crear recepcion no genera Kardex.
- Confirmar recepcion si genera entrada Kardex.
- Confirmar recepcion aumenta inventario.
- Confirmar dos veces no duplica Kardex ni stock.
- La factura del proveedor no es obligatoria para recepcionar.
- Para items sin producto interno, se exige `producto_id` destino al crear recepcion.
- No se permite cancelar recepcion confirmada porque ya genero Kardex.

### Permisos

Lectura:

- `superadmin`
- `admin`
- `logistica`
- `contabilidad`

Escritura:

- `superadmin`
- `admin`
- `logistica`

Ventas no accede al modulo interno de recepciones.

### Pruebas agregadas

Archivo:

- `tests/Feature/RecepcionCompraFlowTest.php`

Escenarios cubiertos:

- recepcion parcial,
- confirmacion con entrada Kardex,
- idempotencia,
- compra completada con varias recepciones,
- bloqueo de sobrerecepcion,
- series disponibles creadas desde recepcion,
- bloqueo de series duplicadas,
- permisos de contabilidad y ventas.

Pruebas ejecutadas:

- `php artisan test tests\Feature\CompraFlowTest.php tests\Feature\RecepcionCompraFlowTest.php`

## Fase 6 - Comprobantes

Se implemento el backend central de comprobantes para compra y venta:

- tablas `comprobantes` y `comprobante_items`,
- modelos `Comprobante` y `ComprobanteItem`,
- servicio `ComprobanteService`,
- endpoint `POST /api/contabilidad/comprobantes`,
- endpoint `POST /api/contabilidad/comprobantes/preview-xml`,
- anulacion logica de comprobantes.

Reglas:

- registrar comprobante no mueve stock,
- registrar comprobante no genera Kardex,
- registrar comprobante no genera automaticamente CxP/CxC,
- duplicados bloqueados por `xml_hash` y por emisor/tipo/serie/numero.

## Fase 7 - Cuentas por pagar

Se implementaron:

- `cuentas_por_pagar`,
- `pagos`,
- `CuentaPorPagarService`,
- pagos parciales y totales,
- bloqueo de sobrepago,
- idempotencia por `idempotency_key`,
- recalculo de saldo desde pagos registrados.

Estados:

- `pendiente`,
- `parcial`,
- `pagada`,
- `vencida`,
- `anulada`.

## Fase 8 - Cuentas por cobrar

Se implementaron:

- `cuentas_por_cobrar`,
- `cobros`,
- `CuentaPorCobrarService`,
- cobros parciales y totales,
- bloqueo de sobrecobro,
- idempotencia por `idempotency_key`,
- sincronizacion de `oc_recibidas.estado_financiero`.

Estados:

- `pendiente`,
- `parcial`,
- `cobrada`,
- `vencida`,
- `anulada`.

## Fase 9 - XML SUNAT / UBL

Se implemento preview XML:

- `App\Services\Sunat\FacturaUblParser`,
- `App\Services\Sunat\SunatXmlService`,
- endpoint `POST /api/contabilidad/comprobantes/preview-xml`,
- uso de `COMPANY_RUC`,
- clasificacion sugerida como compra, venta u observado,
- SHA-256 del XML,
- deteccion de duplicados.

No se implemento API SUNAT ni scraping.

## Fase 10 - Frontend y alertas

Se agregaron pantallas:

- `RequerimientosCompra`,
- `Compras`,
- `RecepcionesCompra`,
- `Comprobantes`,
- `CuentasPorPagar`,
- `CuentasPorCobrar`,
- `AlertasOperativas`.

Se agregaron servicios frontend:

- `compra.service.ts`,
- `requerimientoCompra.service.ts`,
- `recepcionCompra.service.ts`,
- `contabilidad.service.ts`.

Se separo la navegacion en:

- Compras,
- Recepciones,
- Contabilidad,
- Alertas operativas.

Alertas implementadas:

- OC con faltante sin requerimiento,
- requerimientos pendientes,
- compras confirmadas sin recepcion,
- compras parcialmente recibidas,
- recepciones sin factura proveedor,
- comprobantes observados,
- CxP vencidas,
- CxC vencidas,
- documentos cliente pendientes.

Validacion final:

- `php artisan test tests\Feature\CompraFlowTest.php tests\Feature\RecepcionCompraFlowTest.php tests\Feature\ComprobanteFlowTest.php tests\Feature\CuentaPorPagarFlowTest.php tests\Feature\CuentaPorCobrarFlowTest.php tests\Feature\SunatXmlPreviewTest.php`
- Resultado: 33 tests passed, 203 assertions.
- `npx tsc --noEmit`
- `npm run build`
