import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, GitCompareArrows, X } from 'lucide-react';
import type { CotizacionVersion } from '../../../services/cotizacion.service';

type RecordValue = Record<string, unknown>;
type Snapshot = CotizacionVersion['snapshot'];
type Cambio = { grupo: string; campo: string; antes: unknown; despues: unknown };

const CAMPOS_GENERALES: Record<string, string> = {
  titulo: 'Título', fecha: 'Fecha', validez_dias: 'Validez (días)', forma_pago: 'Forma de pago',
  adelanto: 'Requiere adelanto', adelanto_porcentaje: 'Porcentaje de adelanto',
  entrega_provincia: 'Entrega en provincia', entrega_destino: 'Destino de entrega',
  entrega_multidestino: 'Entrega multidestino', tipo_cambio: 'Tipo de cambio',
  modo_distribucion: 'Modo de distribución', moneda_id: 'Moneda',
  cliente_id: 'Cliente', plantilla_id: 'Plantilla', plataforma_id: 'Plataforma',
  cliente_nombre: 'Nombre del cliente', cliente_ruc: 'RUC', cliente_contacto: 'Contacto',
  cliente_telefono: 'Teléfono', cliente_correo: 'Correo',
  delegado_id: 'Delegado', delegado_cotizacion_id: 'Ejecutivo delegado',
  subtotal: 'Subtotal', igv: 'IGV', total: 'Total', ganancia: 'Ganancia', total_gasto: 'Gasto total',
};
const CAMPOS_ITEM: Record<string, string> = {
  descripcion: 'Descripción', cantidad: 'Cantidad', codigo: 'Código', marca: 'Marca',
  unidad_medida: 'Unidad de medida', nota: 'Nota', garantia_meses: 'Garantía (meses)',
  disponibilidad: 'Disponibilidad', disponibilidad_tipo: 'Tipo de disponibilidad',
  disponibilidad_dias: 'Días de entrega', costo_base: 'Costo base',
  costo_unitario: 'Costo unitario', costo_total: 'Costo total', margen: 'Margen',
  precio_venta: 'Precio de venta', subtotal: 'Subtotal', ganancia: 'Ganancia',
  aplica_costos_adicionales: 'Aplica costos adicionales', destino_entrega: 'Destino',
  destinos_entrega: 'Destinos y variantes', proveedores: 'Proveedores',
  importacion_calculo: 'Cálculo de importación', proveedor: 'Proveedor',
  link_proveedor: 'Enlace del proveedor',
};
const CAMPOS_COSTO: Record<string, string> = {
  tipo: 'Tipo', descripcion: 'Descripción', monto: 'Monto', destino_entrega: 'Destino',
};
const RESTRINGIDOS = new Set([
  'ganancia', 'total_gasto', 'margen', 'costo_base', 'costo_unitario', 'costo_total',
  'importacion_calculo', 'proveedores', 'proveedor', 'link_proveedor',
]);
const objeto = (v: unknown): RecordValue => v && typeof v === 'object' && !Array.isArray(v) ? v as RecordValue : {};
const lista = (v: unknown): RecordValue[] => Array.isArray(v) ? v.map(objeto) : [];
const normalizar = (v: unknown): unknown => {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v.trim())) return Number(v);
  if (Array.isArray(v)) return v.map(normalizar);
  if (typeof v === 'object') return Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, normalizar(x)]));
  return v;
};
const iguales = (a: unknown, b: unknown) => JSON.stringify(normalizar(a)) === JSON.stringify(normalizar(b));
const mostrar = (v: unknown): string => {
  if (v === null || v === undefined || v === '') return 'Sin especificar';
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  if (Array.isArray(v)) return v.length ? JSON.stringify(v, null, 2) : 'Sin registros';
  if (typeof v === 'object') return JSON.stringify(v, null, 2);
  return String(v);
};
function diferenciasCampos(grupo: string, antes: RecordValue, despues: RecordValue, campos: Record<string, string>, verFinanzas: boolean): Cambio[] {
  return Object.entries(campos)
    .filter(([key]) => verFinanzas || !RESTRINGIDOS.has(key))
    .filter(([key]) => !iguales(antes[key], despues[key]))
    .map(([key, campo]) => ({ grupo, campo, antes: antes[key], despues: despues[key] }));
}
function compararListas(
  grupo: string, anteriores: RecordValue[], nuevos: RecordValue[], campos: Record<string, string>,
  identidad: (v: RecordValue, i: number) => string, verFinanzas: boolean,
): Cambio[] {
  const salida: Cambio[] = [];
  const buckets = new Map<string, RecordValue[]>();
  anteriores.forEach((item, i) => {
    const key = identidad(item, i);
    buckets.set(key, [...(buckets.get(key) || []), item]);
  });
  nuevos.forEach((item, i) => {
    const key = identidad(item, i);
    const bucket = buckets.get(key) || [];
    const previo = bucket.shift();
    if (previo) {
      salida.push(...diferenciasCampos(`${grupo}: ${key}`, previo, item, campos, verFinanzas));
    } else {
      salida.push({ grupo: `${grupo}: ${key}`, campo: 'Registro agregado', antes: null,
        despues: Object.fromEntries(Object.keys(campos).filter(k => verFinanzas || !RESTRINGIDOS.has(k)).map(k => [campos[k], item[k]])) });
    }
  });
  buckets.forEach((restantes, key) => restantes.forEach(previo => {
    salida.push({ grupo: `${grupo}: ${key}`, campo: 'Registro eliminado',
      antes: Object.fromEntries(Object.keys(campos).filter(k => verFinanzas || !RESTRINGIDOS.has(k)).map(k => [campos[k], previo[k]])), despues: null });
  }));
  return salida;
}
function comparar(antes: Snapshot, despues: Snapshot, verFinanzas: boolean): Cambio[] {
  const itemsAntes = lista(antes.items), itemsDespues = lista(despues.items);
  return [
    ...diferenciasCampos('Información general', objeto(antes.cotizacion), objeto(despues.cotizacion), CAMPOS_GENERALES, verFinanzas),
    ...compararListas('Ítem', itemsAntes, itemsDespues, CAMPOS_ITEM,
      (v, i) => String(v.codigo || v.producto_externo_id || v.producto_id || v.descripcion || `Posición ${i + 1}`), verFinanzas),
    ...compararListas('Costo adicional', lista(antes.costos), lista(despues.costos), CAMPOS_COSTO,
      (v, i) => String(`${v.tipo || 'Costo'} / ${v.descripcion || ''} / ${v.destino_entrega || ''}` || i), verFinanzas),
  ];
}

interface Props {
  abierto: boolean;
  cerrar: () => void;
  anterior: CotizacionVersion | null;
  nueva: CotizacionVersion | null;
  verFinanzas: boolean;
}
export function CotizacionCambiosModal({ abierto, cerrar, anterior, nueva, verFinanzas }: Props) {
  const [filtro, setFiltro] = useState('Todos');
  const cambios = useMemo(() => anterior && nueva ? comparar(anterior.snapshot, nueva.snapshot, verFinanzas) : [], [anterior, nueva, verFinanzas]);
  const grupos = useMemo(() => ['Todos', ...new Set(cambios.map(c => c.grupo.split(':')[0]))], [cambios]);
  const visibles = filtro === 'Todos' ? cambios : cambios.filter(c => c.grupo.split(':')[0] === filtro);
  useEffect(() => { if (abierto) setFiltro('Todos'); }, [abierto]);
  useEffect(() => {
    if (!abierto) return;
    const cerrarEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrar(); };
    document.addEventListener('keydown', cerrarEscape);
    return () => document.removeEventListener('keydown', cerrarEscape);
  }, [abierto, cerrar]);
  if (!abierto) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 sm:p-6" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) cerrar(); }}>
      <section role="dialog" aria-modal="true" aria-label="Comparación de cambios" className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900"><GitCompareArrows className="h-5 w-5 text-blue-600"/> Comparación de cambios</h2>
            <p className="mt-1 text-sm text-slate-500">{anterior?.numero_version || 'Sin versión anterior'} <ArrowRight className="inline h-4 w-4"/> {nueva?.numero_version || 'Sin versión nueva'}</p>
          </div>
          <button type="button" onClick={cerrar} aria-label="Cerrar modal" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5"/></button>
        </header>
        <div className="overflow-y-auto p-5">
          {!anterior || !nueva ? (
            <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">No se dispone de ambos snapshots para realizar esta comparación.</p>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap gap-2">
                {grupos.map(g => <button key={g} type="button" onClick={() => setFiltro(g)} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${filtro === g ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{g}</button>)}
              </div>
              <p className="mb-4 text-sm text-slate-500">{visibles.length} cambio(s) detectado(s). Solo se muestran campos comparables almacenados en el historial.</p>
              {visibles.length === 0 ? <p className="rounded-lg bg-slate-50 p-5 text-sm text-slate-600">No se detectaron diferencias en estos campos.</p> :
                <div className="space-y-3">{visibles.map((c, i) => (
                  <article key={`${c.grupo}-${c.campo}-${i}`} className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{c.grupo}</p>
                    <h3 className="mb-3 mt-1 text-sm font-semibold text-slate-900">{c.campo}</h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="min-w-0 rounded-lg border border-rose-100 bg-rose-50 p-3"><p className="mb-1 text-xs font-bold text-rose-700">ANTES</p><pre className="whitespace-pre-wrap break-words font-sans text-sm text-slate-700">{mostrar(c.antes)}</pre></div>
                      <div className="min-w-0 rounded-lg border border-emerald-100 bg-emerald-50 p-3"><p className="mb-1 text-xs font-bold text-emerald-700">DESPUÉS</p><pre className="whitespace-pre-wrap break-words font-sans text-sm text-slate-700">{mostrar(c.despues)}</pre></div>
                    </div>
                  </article>
                ))}</div>}
            </>
          )}
        </div>
        <footer className="flex justify-end border-t border-slate-200 p-4"><button type="button" onClick={cerrar} className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800">Cerrar</button></footer>
      </section>
    </div>
  );
}
