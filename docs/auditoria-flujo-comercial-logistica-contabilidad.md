# Auditoria del flujo Comercial, Logistica y Contabilidad

Fecha de revision: 2026-08-12  
Alcance: ERP-WILLATEC backend Laravel + frontend React.

## 1. Resumen ejecutivo

El sistema ya tiene una base importante para cotizaciones, ordenes de compra recibidas, ordenes de compra emitidas, productos internos, productos externos, proveedores, Kardex, series, documentos y auditoria.

La estructura actual permite operar el flujo comercial-logistico basico:

1. Se crea una cotizacion.
2. Se registra una OC recibida del cliente.
3. Se seleccionan items de esa cotizacion.
4. Se reserva stock cuando el item esta asociado a un producto interno.
5. Se convierte producto externo a interno cuando corresponde.
6. Se registra entrada en Kardex.
7. Se seleccionan series.
8. Se marca entrega.
9. Se registra salida de inventario.

Sin embargo, el sistema todavia mezcla responsabilidades de comercial, logistica y contabilidad dentro de las mismas tablas y pantallas. Esto funciona para una operacion inicial, pero puede limitar el crecimiento cuando se necesite manejar:

- varias OC recibidas por una misma cotizacion,
- compras parciales a proveedores,
- recepciones parciales,
- despachos parciales,
- facturas de proveedor distintas a la recepcion fisica,
- facturas al cliente distintas a la entrega fisica,
- cuentas por pagar,
- cuentas por cobrar,
- XML/UBL,
- conciliacion de pagos,
- trazabilidad contable completa.

La recomendacion principal es no rehacer lo que ya funciona. El camino correcto es evolucionar con tablas nuevas alrededor de las tablas actuales, manteniendo compatibilidad con `cotizaciones`, `oc_recibidas`, `oc_emitidas`, `productos`, `producto_series` e `inventario_movimientos`.

## 2. Tablas y componentes reutilizables

### 2.1 Cotizaciones

Tabla principal: `cotizaciones`  
Modelo: `App\Models\Cotizacion`  
Controlador: `App\Http\Controllers\Api\CotizacionController`

Uso actual:

- cabecera comercial,
- cliente,
- moneda,
- forma de pago,
- plantilla,
- estados de aprobacion,
- modificaciones,
- exportacion PDF,
- relacion con oportunidades/licitationes,
- relacion con OC recibidas y emitidas.

Conclusion: se debe reutilizar. Es el documento comercial origen.

### 2.2 Items de cotizacion

Tabla principal: `cotizacion_items`  
Modelo: `App\Models\CotizacionItem`

Campos relevantes detectados:

- `cotizacion_id`,
- `producto_id`,
- `producto_externo_id`,
- `descripcion`,
- `cantidad`,
- `costo_unitario`,
- `costo_base`,
- `margen`,
- `precio_venta`,
- `garantia_meses`,
- `proveedor`,
- `link_proveedor`,
- `importacion_calculo`,
- `orden`.

Conclusion: se debe reutilizar como detalle comercial. No debe convertirse en tabla de despacho ni de compra real. Para eso conviene crear tablas satelite.

### 2.3 Proveedores por item de cotizacion

Tabla principal: `cotizacion_item_proveedores`  
Modelo: `App\Models\CotizacionItemProveedor`

Campos relevantes:

- `cotizacion_item_id`,
- `proveedor_id`,
- `nombre`,
- `link`,
- `precio`,
- `notas`,
- `orden`.

Conclusion: es reutilizable para referencia comercial de proveedores. Ya tiene `proveedor_id`, lo cual ayuda a evitar duplicados como `Deltron`, `DELtron`, `deltron`. Debe mantenerse opcional para no volver lenta la cotizacion.

### 2.4 Proveedores

Tabla principal: `proveedores`  
Modelo: `App\Models\Proveedor`  
Controlador: `App\Http\Controllers\Api\ProveedorController`

Uso actual:

- busqueda por nombre, RUC, contacto, correo,
- registro desde Kardex y emision de OC,
- asociacion opcional con proveedores de items.

Conclusion: se debe reutilizar como catalogo maestro. Conviene reforzar normalizacion de nombre y alias, pero no bloquear el flujo comercial si solo se conoce el nombre.

### 2.5 Productos internos

Tabla principal: `productos`  
Modelo: `App\Models\Producto`  
Controlador: `App\Http\Controllers\Api\ProductoController`

Campos relevantes:

- `stock_actual`,
- `stock_reservado`,
- `stock_disponible`,
- `costo_unitario`,
- `costo_promedio`,
- `valor_stock`,
- `moneda_id`,
- `serie`,
- `factura_numero`,
- `ubicacion_almacen`,
- `categoria_id`.

Conclusion: se debe reutilizar como maestro de producto/stock por modelo. Los campos `serie` y `factura_numero` son legado util, pero no deben ser la fuente principal cuando hay varias unidades del mismo producto.

### 2.6 Series de productos

Tabla principal: `producto_series`  
Modelo: `App\Models\ProductoSerie`

Campos relevantes:

- `producto_id`,
- `serie`,
- `factura_numero`,
- `documento_path`,
- `proveedor_id`,
- `costo_unitario`,
- `moneda_id`,
- `fecha_ingreso`,
- `estado`,
- `oc_recibida_id`,
- `cotizacion_item_id`,
- `fecha_salida`.

Conclusion: se debe reutilizar. Esta tabla es la base para trazabilidad por unidad fisica. Debe mantenerse como fuente principal para garantia, serie entregada y estado fisico.

### 2.7 Movimientos Kardex

Tabla principal: `inventario_movimientos`  
Modelo: `App\Models\InventarioMovimiento`  
Servicio: `App\Services\InventarioService`  
Controlador: `App\Http\Controllers\Api\InventarioController`

Tipos actuales:

- `entrada`,
- `salida`,
- `reserva`,
- `liberacion_reserva`,
- `devolucion`,
- `ajuste_manual`,
- `sincronizacion_woocommerce`,
- `reverso`.

Campos relevantes:

- stock antes/despues,
- entrada/salida/saldo,
- costo unitario,
- costo promedio antes/despues,
- valor movimiento,
- valor stock despues,
- documento,
- proveedor,
- moneda,
- IP,
- user agent,
- usuario creador.

Conclusion: se debe reutilizar. Es la bitacora del inventario. No debe reemplazar a recepciones, despachos ni comprobantes; debe registrar los efectos de esos documentos.

### 2.8 Relacion movimientos-series

Tabla principal: `inventario_movimiento_producto_serie`

Conclusion: se debe reutilizar. Permite que un movimiento tenga varias series. Es clave para salidas de dos o mas unidades.

### 2.9 OC recibidas

Tabla principal: `oc_recibidas`  
Modelo: `App\Models\OcRecibida`  
Controlador: `App\Http\Controllers\Api\OcRecibidaController`

Estados actuales:

- `pendiente`,
- `en_proceso`,
- `por_entrega`,
- `atendido`,
- `cancelado`.

Documentos directos actuales:

- OC cliente,
- guia de remision/emision,
- factura.

Conclusion: se debe reutilizar como documento recibido del cliente. Ya se corrigio la limitacion inicial para permitir multiples OC recibidas por una misma cotizacion.

### 2.10 Items de OC recibida

Tabla principal: `oc_recibida_items`  
Modelo: `App\Models\OcRecibidaItem`

Campos relevantes:

- `oc_recibida_id`,
- `cotizacion_item_id`,
- `cantidad_cotizada`,
- `cantidad_recibida`,
- `seleccionado`,
- `comprado`,
- `entregado`.

Conclusion: se debe reutilizar, pero conviene evolucionarla. Actualmente `comprado` en la practica significa que hay stock reservado o que el item ya fue cubierto por inventario, no necesariamente que exista una compra real al proveedor.

### 2.11 OC emitidas a proveedor

Tabla principal: `oc_emitidas`  
Modelo: `App\Models\OcEmitida`  
Controlador: `App\Http\Controllers\Api\OcEmitidaController`

Uso actual:

- emision de OC a proveedor,
- proveedor,
- items,
- PDF,
- factura,
- comprobante de pago,
- documentos adicionales.

Conclusion: se debe reutilizar como documento de compra/proveedor. Debe integrarse despues con recepciones y cuentas por pagar.

### 2.12 Items de OC emitida

Tabla principal: `oc_emitida_items`  
Modelo: `App\Models\OcEmitidaItem`

Conclusion: se debe reutilizar. Puede ser base para recepciones parciales.

### 2.13 Documentos adicionales

Tabla principal: `oc_documentos_adicionales`  
Modelo: `App\Models\OcDocumentoAdicional`

Uso actual:

- documentos adicionales de OC recibidas,
- documentos adicionales de OC emitidas.

Conclusion: reutilizable, pero limitado. No tiene `tipo_documento`, `descripcion`, ni relacion polimorfica para usarlo con recepciones, despachos, comprobantes u otros documentos.

### 2.14 Control de pagos frontend

Pantallas detectadas:

- `src/pages/administracion/control-pagos/ControlPagoFacturasClientesPage.tsx`,
- `src/pages/administracion/control-pagos/ControlPagosProveedoresPage.tsx`.

Estado actual:

- manejan datos locales en frontend,
- no se detecto backend persistente para cuentas por cobrar/pagar,
- no hay tablas especificas de pagos/cobros/comprobantes.

Conclusion: no se debe tomar como flujo contable real todavia. Sirve como prototipo visual.

## 3. Flujo actual real

### 3.1 Desde cotizacion hasta OC recibida

1. Ventas crea una cotizacion.
2. Si el cliente envia OC, el usuario registra una OC recibida.
3. El backend arma una vista previa desde los items pendientes de la cotizacion.
4. Se pueden seleccionar algunos items y cantidades.
5. La OC recibida guarda sus items en `oc_recibida_items`.
6. Si el item ya tiene `producto_id`, el sistema intenta reservar stock inmediatamente.
7. Si el item viene de producto externo, se debe convertir o asociar a interno para poder reservar.
8. La cotizacion puede quedar aprobada/parcialmente aprobada/OC registrada segun el caso.

### 3.2 Reserva de stock

La reserva la maneja `InventarioService::reservarStock`.

Efectos:

- valida stock disponible,
- crea movimiento `reserva`,
- aumenta `stock_reservado`,
- recalcula `stock_disponible`,
- usa `idempotency_key` para evitar duplicados.

Observacion: la reserva se registra contra `oc_recibida` y `cotizacion_item`. Esto esta bien para trazabilidad.

### 3.3 Conversion de producto externo a interno

La conversion la maneja `ProductoExternoController::convertirAInterno`.

Efectos:

- crea o reutiliza un producto interno,
- actualiza `producto_externo.producto_id`,
- actualiza `cotizacion_items.producto_id` donde correspondia,
- registra una entrada en Kardex,
- intenta reservar retroactivamente OC recibidas pendientes.

Observacion: el flujo es util, pero esta mezclando conversion comercial, entrada de inventario y reserva logistica en una misma accion.

### 3.4 Entrega y salida de stock

La entrega se maneja en `OcRecibidaController::updateItems`.

Flujo detectado:

1. Se marca un item como entregado.
2. Si el producto tiene series, se exige seleccionar la cantidad exacta de series.
3. Las series seleccionadas pasan temporalmente a `reservado`.
4. Cuando la OC queda en estado `atendido`, se llama a `registrarSalidaAtendida`.
5. El Kardex registra una salida.
6. Las series pasan a estado de salida, por ejemplo `vendido`.

Problema importante: `registrarSalidaAtendida` exige que `oc_recibida.factura_path` exista. Esto ata la salida fisica de almacen a la factura, cuando contablemente y logisticamente deberian ser procesos separados.

### 3.5 OC emitida a proveedor

La OC emitida se crea desde una cotizacion y proveedor seleccionado.

Flujo detectado:

1. Se listan proveedores usados en los items de cotizacion.
2. Se selecciona proveedor.
3. Se cargan items de ese proveedor.
4. Se crea `oc_emitida`.
5. Se generan items y PDF.
6. Se pueden adjuntar factura, comprobante de pago y documentos adicionales.

Observacion: hoy no hay recepcion fisica vinculada a `oc_emitida`. Tampoco hay una cuenta por pagar derivada de la factura del proveedor.

## 4. Problemas estructurales detectados

### Criticos

1. La salida fisica depende del archivo de factura en `oc_recibidas`.
   - Riesgo: logistica no podria cerrar entrega si contabilidad aun no subio factura.
   - Recomendacion: separar entrega/despacho de facturacion.

2. El campo `comprado` de `oc_recibida_items` no representa una compra real.
   - Hoy funciona como indicador de que el item ya esta cubierto/reservado por stock.
   - Recomendacion: renombrar visualmente a "Cubierto por stock" o crear campos logisticos nuevos.

3. No existen entidades de recepcion de compra.
   - La entrada Kardex funciona, pero no hay documento logistico de recepcion.
   - Recomendacion: crear `recepciones_compra` y `recepcion_items`.

4. No existen cuentas por pagar ni cuentas por cobrar reales.
   - Las pantallas de control de pagos son frontend-local.
   - Recomendacion: crear comprobantes, CxP, CxC, pagos y cobros.

5. El listado/detalle de OC recibidas ejecuta sincronizaciones de inventario.
   - `index` y `show` llaman metodos que pueden modificar reservas/salidas.
   - Riesgo: una consulta puede alterar datos.
   - Recomendacion: mover esas sincronizaciones a servicios explicitos, jobs o acciones transaccionales.

### Altos

1. Los documentos directos en OC recibida/emitida limitan el crecimiento.
   - Una OC puede tener muchos documentos.
   - Recomendacion: centralizar documentos con tipo y relacion.

2. No existe despacho/atencion parcial.
   - La OC pasa a atendida cuando todo esta entregado.
   - Recomendacion: crear `oc_atenciones` y `oc_atencion_items`.

3. Las series pueden registrar estado, pero falta una entidad de salida/despacho.
   - La serie sabe que salio, pero no hay "acto logistico" formal independiente.

4. El costo promedio se actualiza desde entradas manuales/conversiones.
   - Falta distinguir costo provisional, costo confirmado y regularizacion por factura.

5. La recepcion de productos externos convertidos a internos queda demasiado acoplada a factura obligatoria.
   - En algunos casos se puede recibir fisicamente sin XML/factura final.

### Medios

1. `oc_documentos_adicionales` no tiene tipo de documento.
2. `productos.serie` y `productos.factura_numero` son campos legado que pueden confundir frente a `producto_series`.
3. `inventario_movimientos.producto_serie_id` convive con la tabla pivote de multiples series.
4. No hay deduplicacion documental por numero, proveedor, RUC, monto o hash.
5. No hay parser XML/UBL ni validacion SUNAT.
6. No hay vencimientos financieros por factura.

### Bajos

1. Algunos nombres de campos siguen mezclando conceptos comerciales/logisticos.
2. Los roles actuales estan creciendo por excepciones puntuales.
3. Hay reglas de permisos en rutas y tambien en controladores; conviene consolidar con policies.

## 5. Relaciones que limitan el crecimiento

### 5.1 `oc_recibidas.cotizacion_id`

La migracion `2026_08_10_000001_allow_multiple_oc_recibidas_per_cotizacion.php` ya elimina la restriccion unica. Eso habilita multiples OC por una misma cotizacion.

Estado: correcto.

### 5.2 `oc_recibida_items`

Tiene unique por:

- `oc_recibida_id`,
- `cotizacion_item_id`.

Esto permite que un mismo item de cotizacion este en varias OC distintas, siempre que no se repita dentro de la misma OC.

Estado: correcto para multiples OC.

Limitacion pendiente:

- falta controlar explicitamente cantidades acumuladas por item si hay varios despachos o varias compras.

### 5.3 `oc_emitidas`

No se detecto unique sobre `cotizacion_id`, por lo que puede haber varias OC emitidas por cotizacion.

Estado: correcto.

Limitacion pendiente:

- no tiene relacion formal con recepciones de compra ni comprobantes de proveedor.

### 5.4 `inventario_movimientos`

Puede registrar entradas, salidas, reservas y devoluciones.

Limitacion:

- no representa por si sola una recepcion fisica ni un despacho. Solo registra el movimiento de stock.

### 5.5 `producto_series`

Permite trazabilidad por serie.

Limitaciones:

- el estado de la serie carga mucha semantica,
- la salida queda referenciada a OC/item, pero no a una tabla formal de atencion/despacho.

## 6. Flujo futuro recomendado

### 6.1 Comercial

Responsabilidad:

- crear cotizacion,
- modificar cotizacion,
- registrar OC recibida,
- seleccionar los items que el cliente acepto,
- registrar documentos comerciales del cliente,
- solicitar atencion a logistica.

No deberia:

- decidir salida fisica,
- forzar factura para entregar,
- modificar stock manualmente.

### 6.2 Logistica

Responsabilidad:

- ver OC recibidas pendientes de atencion,
- validar stock disponible,
- reservar stock,
- generar requerimiento de compra si falta stock,
- recibir productos comprados,
- asignar series,
- registrar despacho/atencion,
- generar salida Kardex.

### 6.3 Compras

Responsabilidad:

- convertir necesidades en OC emitidas a proveedor,
- manejar compras parciales,
- vincular items de OC emitida con recepciones.

Puede ser un rol nuevo o una funcion de logistica/admin en primera fase.

### 6.4 Contabilidad

Responsabilidad:

- registrar factura proveedor,
- subir XML/PDF,
- crear cuenta por pagar,
- registrar pagos,
- registrar factura cliente,
- crear cuenta por cobrar,
- registrar cobros,
- conciliar documentos.

No deberia:

- alterar stock directamente,
- marcar entregas fisicas,
- modificar la cotizacion comercial.

## 7. Tablas a mantener

Estas tablas deben mantenerse y usarse como base:

- `cotizaciones`,
- `cotizacion_items`,
- `cotizacion_item_proveedores`,
- `proveedores`,
- `productos`,
- `producto_series`,
- `inventario_movimientos`,
- `inventario_movimiento_producto_serie`,
- `oc_recibidas`,
- `oc_recibida_items`,
- `oc_emitidas`,
- `oc_emitida_items`,
- `oc_documentos_adicionales`,
- `monedas`,
- `users`,
- `activity_log` o auditoria actual.

## 8. Tablas que conviene evolucionar

### 8.1 `oc_recibidas`

Agregar en el futuro campos separados por responsabilidad:

- `estado_comercial`,
- `estado_logistico`,
- `estado_documental`,
- `estado_financiero`.

Motivo: una OC puede estar aceptada comercialmente, parcialmente despachada logisticamente, pendiente de documentos contables y pendiente de cobro.

### 8.2 `oc_recibida_items`

Agregar campos logisticos:

- `cantidad_reservada`,
- `cantidad_pendiente_compra`,
- `cantidad_atendida`,
- `estado_logistico`.

Motivo: `comprado` y `entregado` se quedan cortos cuando hay compras o entregas parciales.

### 8.3 `oc_emitidas`

Agregar campos para compras:

- `proveedor_id`,
- `estado_recepcion`,
- `estado_facturacion`,
- `estado_pago`.

Motivo: la OC emitida debe saber si ya fue recibida, facturada y pagada.

### 8.4 `oc_emitida_items`

Agregar:

- `cantidad_recibida`,
- `cantidad_pendiente`,
- `estado_recepcion`.

Motivo: una OC a proveedor puede recibirse parcialmente.

### 8.5 `inventario_movimientos`

Agregar en el futuro:

- `costo_tipo` (`provisional`, `confirmado`, `regularizacion`),
- `comprobante_id`,
- `recepcion_item_id`,
- `oc_atencion_item_id`.

Motivo: enlazar movimientos a documentos logisticos y contables sin perder el Kardex actual.

### 8.6 `oc_documentos_adicionales`

Evolucion recomendada:

- `tipo_documento`,
- `descripcion`,
- `documentable_type`,
- `documentable_id`,
- `hash_archivo`.

Motivo: convertirla gradualmente en tabla general de documentos.

## 9. Tablas nuevas recomendadas

### 9.1 `requerimientos_compra`

Necesaria.

Uso:

- agrupar faltantes de stock generados por OC recibidas,
- indicar si se debe comprar,
- asignar responsable,
- alimentar OC emitidas a proveedor.

Campos sugeridos:

- `id`,
- `oc_recibida_id`,
- `estado`,
- `prioridad`,
- `solicitado_por`,
- `asignado_a`,
- `observacion`,
- timestamps.

### 9.2 `requerimiento_compra_items`

Necesaria.

Uso:

- detalle de productos faltantes por item de OC recibida.

Campos sugeridos:

- `requerimiento_compra_id`,
- `oc_recibida_item_id`,
- `cotizacion_item_id`,
- `producto_id`,
- `producto_externo_id`,
- `descripcion`,
- `cantidad_requerida`,
- `cantidad_comprada`,
- `estado`.

### 9.3 `recepciones_compra`

Necesaria.

Uso:

- registrar entrada fisica al almacen,
- independiente de la factura contable.

Campos sugeridos:

- `id`,
- `oc_emitida_id`,
- `proveedor_id`,
- `fecha_recepcion`,
- `documento_referencia`,
- `estado`,
- `recibido_por`,
- `observacion`.

### 9.4 `recepcion_items`

Necesaria.

Uso:

- detalle recibido por producto,
- cantidades,
- costo provisional,
- series,
- enlace con entrada Kardex.

Campos sugeridos:

- `recepcion_compra_id`,
- `oc_emitida_item_id`,
- `producto_id`,
- `cantidad`,
- `costo_unitario_provisional`,
- `moneda_id`,
- `inventario_movimiento_id`.

### 9.5 `oc_atenciones`

Necesaria para escalar.

Uso:

- registrar una entrega/despacho al cliente,
- permitir atenciones parciales,
- separar entrega fisica de factura.

Campos sugeridos:

- `id`,
- `oc_recibida_id`,
- `numero`,
- `fecha_atencion`,
- `estado`,
- `tipo_salida`,
- `entregado_por`,
- `observacion`.

### 9.6 `oc_atencion_items`

Necesaria.

Uso:

- detalle de cada atencion/despacho,
- enlace a series,
- enlace a salida Kardex.

Campos sugeridos:

- `oc_atencion_id`,
- `oc_recibida_item_id`,
- `producto_id`,
- `cantidad`,
- `inventario_movimiento_id`,
- `estado`.

### 9.7 `comprobantes`

Necesaria para la meta contable.

Uso:

- facturas de proveedor,
- facturas al cliente,
- notas de credito,
- boletas,
- XML/PDF,
- relacion con CxP/CxC.

Campos sugeridos:

- `id`,
- `tipo_operacion` (`compra`, `venta`),
- `tipo_comprobante`,
- `serie`,
- `numero`,
- `emisor_ruc`,
- `emisor_nombre`,
- `receptor_ruc`,
- `receptor_nombre`,
- `fecha_emision`,
- `fecha_vencimiento`,
- `moneda_id`,
- `subtotal`,
- `igv`,
- `total`,
- `xml_path`,
- `pdf_path`,
- `estado_validacion`,
- `hash_archivo`,
- timestamps.

### 9.8 `comprobante_items`

Recomendable, y necesaria si se parsea XML a detalle.

Uso:

- validar montos por linea,
- regularizar costos,
- cruzar compras contra recepciones.

### 9.9 `cuentas_por_pagar`

Necesaria.

Uso:

- deuda con proveedores,
- vencimientos,
- saldo,
- estado de pago.

### 9.10 `cuentas_por_cobrar`

Necesaria.

Uso:

- deuda de clientes,
- vencimientos,
- saldo,
- estado de cobranza.

### 9.11 `pagos`

Necesaria.

Uso:

- pagos a proveedores,
- parcial o total,
- adjuntos y comprobantes.

### 9.12 `cobros`

Necesaria.

Uso:

- cobros de clientes,
- parcial o total,
- medio de pago,
- evidencia.

## 10. Escenarios solicitados

### A. Cliente envia OC parcial de una cotizacion

Estado actual:

- Soportado en parte.
- `oc_recibidas` ya permite multiples OC por una cotizacion.
- `preview` calcula cantidades pendientes.

Riesgo:

- falta entidad de atencion parcial real.

Recomendacion:

- mantener OC recibidas multiples,
- agregar `oc_atenciones` para entregas parciales.

### B. Cliente envia dos OC de la misma cotizacion en dias distintos

Estado actual:

- Soportado por la migracion que quito unique de `cotizacion_id`.
- Cada OC tiene sus propios items.

Riesgo:

- cantidades acumuladas dependen de consultas y reglas del controlador.

Recomendacion:

- crear una funcion central para calcular saldo pendiente por item,
- usarla en preview, store y reportes.

### C. Un item requiere compra a proveedor

Estado actual:

- Se puede emitir OC a proveedor desde cotizacion/proveedor.
- No existe requerimiento formal de compra ni recepcion vinculada.

Recomendacion:

- crear `requerimientos_compra`,
- desde OC recibida generar faltantes,
- desde requerimiento emitir OC proveedor.

### D. Producto entra al almacen antes de emitir factura

Estado actual:

- Kardex permite entrada con documento opcional en algunos flujos.
- Conversion de producto externo exige factura.

Riesgo:

- la recepcion fisica queda forzada a factura.

Recomendacion:

- permitir recepcion fisica con costo provisional,
- asociar factura despues mediante `comprobantes`.

### E. Se entrega producto pero factura se emite despues

Estado actual:

- `registrarSalidaAtendida` exige `factura_path`.

Riesgo:

- bloquea logistica si contabilidad aun no tiene factura.

Recomendacion:

- separar `oc_atenciones` de `comprobantes`,
- salida Kardex debe depender de entrega autorizada, no de factura.

### F. Factura proveedor llega con XML

Estado actual:

- Se puede subir XML como archivo en algunos endpoints.
- No se parsea ni se valida como comprobante.

Recomendacion:

- crear `comprobantes`,
- agregar parser XML/UBL en fase posterior,
- relacionar comprobante de compra con OC emitida/recepcion.

### G. Factura cliente llega con XML

Estado actual:

- No hay tabla backend de facturas cliente real.

Recomendacion:

- crear `comprobantes` tipo venta,
- crear `cuentas_por_cobrar`,
- vincular a OC recibida/cotizacion.

### H. Pago parcial o total

Estado actual:

- Control visual en frontend, sin persistencia backend detectada.

Recomendacion:

- crear `pagos` y `cobros`,
- permitir varios pagos/cobros por cuenta,
- recalcular saldo,
- auditar cambios.

## 11. Matriz de roles recomendada

| Modulo / Accion | Ventas | Logistica | Admin | Contabilidad | Superadmin |
|---|---:|---:|---:|---:|---:|
| Crear cotizacion | Si | No | No | No | Si |
| Modificar cotizacion propia | Si | No | No | No | Si |
| Aprobar cotizacion | No | No | Segun regla actual | No | Si |
| Registrar OC recibida | Si | No | No | No | Si |
| Subir documentos OC recibida | Si, propia | No | Si | Si | Si |
| Editar datos comerciales OC | Si, propia | No | No | No | Si |
| Reservar stock | No directo | Si | Si | No | Si |
| Seleccionar series | No recomendado | Si | Si | No | Si |
| Registrar entrega/despacho | No recomendado | Si | Si | No | Si |
| Registrar entrada Kardex | No | Si | Si | No | Si |
| Registrar salida manual Kardex | No | Si | Si | No | Si |
| Emitir OC proveedor | Si o compras | Si/compras | Si | No | Si |
| Registrar factura proveedor | No | No | Si | Si | Si |
| Registrar pago proveedor | No | No | Si | Si | Si |
| Registrar factura cliente | No | No | Si | Si | Si |
| Registrar cobro cliente | No | No | Si | Si | Si |
| Auditoria | No | No | No | No | Si |

Nota: esta matriz es recomendada para el flujo futuro. No implica cambiar permisos aun.

## 12. Orden de implementacion recomendado

### Fase 1: estabilizar lo existente

Objetivo: no romper produccion.

Acciones:

1. Documentar estados actuales.
2. Quitar efectos secundarios de `index` y `show` de OC recibidas.
3. Crear servicios explicitos para sincronizacion de reservas.
4. Separar visualmente `comprado` de "cubierto por stock".
5. Revisar que Kardex no dependa de archivos contables para salida fisica.

### Fase 2: logistica formal

Acciones:

1. Crear `oc_atenciones` y `oc_atencion_items`.
2. Mover seleccion de series a flujo logistico.
3. Permitir entregas parciales.
4. Registrar salida Kardex desde atencion.
5. Mantener compatibilidad con `oc_recibida_items.entregado`.

### Fase 3: compras y recepcion

Acciones:

1. Crear `requerimientos_compra`.
2. Crear `recepciones_compra`.
3. Enlazar OC emitidas a recepciones.
4. Registrar entradas Kardex desde recepcion.
5. Manejar costo provisional.

### Fase 4: documentos y comprobantes

Acciones:

1. Crear `comprobantes`.
2. Migrar uso de factura directa a comprobante asociado.
3. Mantener campos antiguos como cache/compatibilidad.
4. Agregar tipos a documentos adicionales.

### Fase 5: cuentas por pagar y cobrar

Acciones:

1. Crear `cuentas_por_pagar`.
2. Crear `pagos`.
3. Crear `cuentas_por_cobrar`.
4. Crear `cobros`.
5. Actualizar pantallas de control de pagos para usar backend.

### Fase 6: XML/UBL y validaciones

Acciones:

1. Parser XML factura proveedor.
2. Parser XML factura cliente.
3. Deteccion de duplicados.
4. Validacion de totales.
5. Conciliacion con OC/recepcion/atencion.

## 13. Archivos principales a tocar despues

Backend:

- `app/Http/Controllers/Api/OcRecibidaController.php`
- `app/Http/Controllers/Api/OcEmitidaController.php`
- `app/Http/Controllers/Api/InventarioController.php`
- `app/Http/Controllers/Api/ProductoExternoController.php`
- `app/Services/InventarioService.php`
- `app/Models/OcRecibida.php`
- `app/Models/OcRecibidaItem.php`
- `app/Models/OcEmitida.php`
- `app/Models/OcEmitidaItem.php`
- `app/Models/InventarioMovimiento.php`
- `app/Models/ProductoSerie.php`
- `routes/api.php`
- nuevas migraciones en `database/migrations`

Frontend:

- `src/pages/OrdenesCompraPage.tsx`
- `src/pages/InventarioMovimientos.tsx`
- `src/pages/Productos.tsx`
- `src/services/ordenCompra.service.ts`
- `src/services/inventario.service.ts`
- `src/pages/administracion/control-pagos/ControlPagoFacturasClientesPage.tsx`
- `src/pages/administracion/control-pagos/ControlPagosProveedoresPage.tsx`
- posibles pantallas nuevas para recepciones, atenciones y comprobantes.

## 14. Riesgos tecnicos

1. Cambiar estados actuales sin capa de compatibilidad puede romper dashboards, filtros y notificaciones.
2. Mover la salida Kardex sin migrar datos puede dejar OC atendidas con stock inconsistente.
3. Reusar `factura_path` para documentos contables y logisticos puede generar ambiguedad.
4. Crear CxP/CxC sin comprobantes centrales duplicaria informacion.
5. Parsear XML antes de definir el modelo contable puede crear deuda tecnica.
6. Dar permisos amplios por ruta y restringir por controlador puede generar errores confusos para usuarios.
7. Las sincronizaciones automaticas dentro de consultas pueden provocar cambios inesperados y lentitud.

## 15. Recomendacion de arquitectura

La arquitectura objetivo debe separar documentos por responsabilidad:

```text
Cotizacion
  -> OC recibida cliente
      -> Items OC recibida
      -> Requerimientos de compra
      -> Atenciones / despachos
          -> Salidas Kardex
          -> Series entregadas
      -> Comprobante venta
          -> Cuenta por cobrar
          -> Cobros

OC emitida proveedor
  -> Recepciones de compra
      -> Entradas Kardex
      -> Series ingresadas
  -> Comprobante compra
      -> Cuenta por pagar
      -> Pagos
```

El Kardex debe seguir siendo la fuente de movimiento de stock, pero no debe ser el unico documento operativo. Las tablas de atencion y recepcion deben explicar por que ocurrio el movimiento.

## 16. Decisiones que requieren confirmacion

Antes de implementar, se deben confirmar estas decisiones:

1. Si la salida fisica puede realizarse sin factura del cliente.
2. Si se aceptaran entregas parciales de una OC recibida.
3. Si logistica sera el unico rol que puede seleccionar series.
4. Si compras sera un rol propio o lo asumira logistica/admin.
5. Si contabilidad registrara facturas de proveedor y cliente desde una misma pantalla de comprobantes.
6. Si el XML sera obligatorio o solo complementario.
7. Si el costo promedio se ajustara al recibir mercaderia o al confirmar factura.
8. Si los documentos adicionales actuales se migraran a una tabla general de documentos.

## 17. Conclusion

El sistema esta en buen punto para evolucionar. No conviene reemplazar las tablas actuales porque ya contienen logica valiosa y datos operativos. El mejor camino es agregar una capa formal de logistica y contabilidad:

- recepciones para entradas,
- atenciones/despachos para salidas,
- comprobantes para facturas/XML,
- cuentas por pagar/cobrar para control financiero,
- pagos/cobros para cierre contable.

La primera implementacion deberia enfocarse en separar entrega fisica de factura, formalizar atenciones de OC recibidas y evitar que las consultas modifiquen inventario. Despues de eso, se puede avanzar con compras, recepciones y contabilidad sin romper el flujo comercial actual.

## 18. Implementacion realizada

### Fase 1: estabilizacion

Fecha: 2026-08-12

Cambios realizados:

1. Se elimino la mutacion de inventario desde los GET de OC recibidas.
   - `OcRecibidaController::index` ya no ejecuta sincronizaciones de reserva/salida.
   - `OcRecibidaController::show` ya no ejecuta sincronizaciones de reserva/salida.
   - Los GET quedan orientados a lectura.

2. Se desacoplo la entrega fisica de la factura.
   - `registrarSalidaAtendida` ya no exige `factura_path`.
   - Si existe factura, el movimiento Kardex conserva `documento_tipo = factura`.
   - Si no existe factura, el movimiento queda trazado contra la OC recibida.

3. Se agregaron estados independientes a `oc_recibidas`.
   - `estado_comercial`
   - `estado_logistico`
   - `estado_documental`
   - `estado_financiero`
   - El campo legacy `estado` se mantiene intacto para compatibilidad.

4. Se ajusto el concepto visual del campo legacy `comprado`.
   - En frontend deja de mostrarse como compra real.
   - Se presenta como `Cubierto` / stock asegurado.
   - El payload mantiene `comprado` para no romper compatibilidad.

Archivos modificados:

- `app/Http/Controllers/Api/OcRecibidaController.php`
- `app/Models/OcRecibida.php`
- `database/migrations/2026_08_12_000001_add_independent_statuses_to_oc_recibidas_table.php`
- `src/pages/OrdenesCompraPage.tsx`

Pendiente para siguientes fases:

- Crear atenciones/despachos formales.
- Mover seleccion de series al flujo logistico.
- Crear requerimientos de compra.
- Implementar compras directas y compras con OC proveedor.
- Implementar recepciones de compra.
- Implementar comprobantes, CxP, pagos, CxC y cobros.

### Fase 2: atenciones y logistica

Fecha: 2026-08-12

Cambios realizados:

1. Se crearon atenciones logisticas formales.
   - Tabla `oc_atenciones`.
   - Tabla `oc_atencion_items`.
   - Tabla pivote `oc_atencion_item_producto_serie`.

2. Se permitieron multiples atenciones por una misma OC.
   - Una OC puede atenderse parcialmente.
   - La suma de cantidades preparadas/entregadas no puede superar lo solicitado.

3. La seleccion de series paso al flujo logistico.
   - Escritura permitida para `superadmin`, `admin` y `logistica`.
   - Ventas conserva consulta, pero no opera entrega/series.

4. Se agrego salida Kardex desde atencion.
   - La confirmacion usa `InventarioService`.
   - No se modifica stock directamente desde controladores.
   - La salida usa idempotencia por item de atencion.

5. Se protegio la reutilizacion de series.
   - Una serie no puede estar en dos atenciones activas.
   - Para producto serializado, cantidad atendida debe coincidir con cantidad de series seleccionadas.

6. Se mantuvo compatibilidad legacy.
   - `oc_recibida_items.entregado` se actualiza solo como espejo de compatibilidad.
   - `oc_recibidas.estado` se mantiene sincronizado.
   - `estado_logistico` queda como fuente principal logistica.

7. Se evito doble salida con el flujo legacy.
   - El endpoint legacy de items queda restringido a roles logisticos/administrativos.
   - Si ya existen atenciones activas, no permite marcar entrega por el endpoint legacy.

Archivos principales:

- `app/Services/OcAtencionService.php`
- `app/Http/Controllers/Api/OcAtencionController.php`
- `app/Http/Requests/StoreOcAtencionRequest.php`
- `app/Http/Requests/ConfirmarOcAtencionRequest.php`
- `app/Models/OcAtencion.php`
- `app/Models/OcAtencionItem.php`
- `database/migrations/2026_08_12_000002_create_oc_atenciones_tables.php`
- `database/migrations/2026_08_12_000003_add_oc_atencion_item_id_to_inventario_movimientos_table.php`
- `src/services/ordenCompra.service.ts`
- `src/pages/OrdenesCompraPage.tsx`

Pruebas:

- `tests/Feature/OcAtencionFlowTest.php`

Pendiente para Fase 3 al cierre de esta etapa:

- Requerimientos de compra.
- Generacion de faltantes solo por stock no cubierto.
- No implementar compras/recepciones/comprobantes hasta completar requerimientos.

### Fase 3: requerimientos de compra

Fecha: 2026-08-12

Cambios realizados:

1. Se crearon requerimientos de compra formales.
   - Tabla `requerimientos_compra`.
   - Tabla `requerimiento_compra_items`.

2. Se permite crear requerimientos sin OC recibida.
   - Origenes soportados: `oc_cliente`, `reposicion_stock`, `manual`, `licitacion`, `otro`.

3. Se agrego generacion desde OC recibida por faltante real.
   - Cantidad requerida = cantidad solicitada - cantidad cubierta/reservada - requerimientos activos previos.
   - Si un item externo aun no existe como producto interno, igual puede generar requerimiento.

4. Se protegió la idempotencia.
   - Un doble click o doble request no duplica el requerimiento activo.
   - El segundo intento devuelve el requerimiento activo existente si ya no queda faltante real.

5. Se mantuvo separacion de responsabilidades.
   - Crear requerimientos no modifica stock.
   - Crear requerimientos no genera Kardex.
   - Compras, recepciones, comprobantes, CxP/CxC y XML quedan fuera de esta fase.

Archivos principales:

- `app/Services/RequerimientoCompraService.php`
- `app/Http/Controllers/Api/RequerimientoCompraController.php`
- `app/Http/Requests/StoreRequerimientoCompraRequest.php`
- `app/Http/Requests/GenerarRequerimientoDesdeOcRequest.php`
- `app/Models/RequerimientoCompra.php`
- `app/Models/RequerimientoCompraItem.php`
- `database/migrations/2026_08_12_000004_create_requerimientos_compra_tables.php`

Pruebas:

- `tests/Feature/RequerimientoCompraFlowTest.php`

Pendiente para Fase 4:

- Crear compras.
- Consumir requerimientos desde compras.
- Actualizar cantidades compradas sin tocar stock.
- Mantener recepcion y Kardex para Fase 5.
