# Guia para redisenar listados por modulo

## 1. Auditar filtros

1. Listar todos los filtros visibles del modulo.
2. Mantener solo los filtros usados a diario.
3. Mover filtros secundarios a un panel "Mas filtros" si luego se necesitan.
4. Evitar mostrar rangos de fecha o categorias si no ayudan a la decision rapida.
5. Si existen cards de estado que filtran el listado, no repetir un select de estado en la barra.

## 2. Simplificar barra superior

1. Usar busqueda principal como primer control.
2. Dejar 1 a 2 selects clave, por ejemplo estado y responsable.
3. Agregar un selector de vista: `Lista` y `Tarjetas`.
4. Mantener el alto de la barra en una sola fila cuando sea posible.

## 3. Agregar modo lista / tarjetas

1. Crear estado local:

```tsx
const [viewMode, setViewMode] = useState<"table" | "cards">("table");
```

2. Agregar botones con iconos `List` y `LayoutGrid`.
3. Reutilizar la vista mobile de tarjetas tambien en desktop cuando `viewMode === "cards"`.
4. Ocultar la tabla cuando `viewMode === "cards"`.

Ejemplo en el render del listado:

```tsx
<div className={`grid gap-3 p-4 ${viewMode === "cards" ? "md:grid-cols-2 2xl:grid-cols-3" : "lg:hidden"}`}>
  {/* tarjetas */}
</div>

<div className={`${viewMode === "cards" ? "hidden" : "hidden overflow-x-auto lg:block"}`}>
  {/* tabla */}
</div>
```

Esto sirve para que la misma tarjeta que se usa en mobile tambien se pueda mostrar en desktop, y para que la tabla no se pinte cuando el usuario elige vista de tarjetas.

## 4. Mejorar tarjetas

1. Mostrar primero estado, tipo y titulo principal.
2. Usar bloques compactos para responsable, fecha, vigencia o total.
3. Poner acciones al pie.
4. Evitar textos largos sin `truncate` o `line-clamp`.

## 5. Mejorar tablas

1. Mantener columnas estrictamente necesarias.
2. Usar acciones sticky a la derecha solo si la tabla es ancha.
3. Reducir columnas informativas duplicadas.
4. Si hay muchos datos, permitir tarjetas como alternativa.

## 6. Replicar en otros modulos

1. Ubicar el componente de pagina del modulo.
2. Identificar `filters`, `filteredItems`, `paginatedItems`.
3. Quitar filtros no criticos de la UI, no necesariamente de la logica.
4. Agregar `viewMode`.
5. Crear o reutilizar tarjetas.
6. Condicionar tabla/tarjetas segun `viewMode`.
7. Validar con `npx tsc --noEmit`.
8. Validar con `npm run build`.

## 7. Ajuste global para zoom 100%

1. No resolver el problema con zoom del navegador; ajustar densidad del sistema.
2. Mantener el layout base compacto: padding general `p-3 sm:p-4 lg:p-5` y contenedores `rounded-2xl`.
3. Usar topbar de altura moderada, por ejemplo `h-16`.
4. En barras de filtros, preferir `h-11`, `rounded-xl`, `gap-3` y `px-3`.
5. Evitar obligar 5 o 6 controles en una sola fila cuando el sidebar esta abierto.
6. Usar grids que respiren:

```tsx
<div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-[minmax(260px,1fr)_145px_145px_190px_190px_auto]">
  {/* filtros */}
</div>
```

7. Si hay muchos filtros, dejar el selector de vista en una segunda fila en `xl` y pasarlo a la misma fila solo en `2xl`.
8. Las tablas anchas deben tener `overflow-x-auto`; las tarjetas deben ser alternativa real para trabajar sin scroll horizontal.

## Aplicado en Seguimiento Licitaciones

- Se retiraron filtros visibles de categoria y rango de vigencia.
- Se mantuvo busqueda, estado y ejecutivo.
- El filtro de estado solo aparece cuando no se muestran cards de estado.
- Se agrego selector `Lista / Tarjetas`.
- La vista de tarjetas ahora tambien puede usarse en desktop.
