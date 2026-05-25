import type { Cliente } from "../../types/cotizaciones.type";

interface Props {

  disabled: boolean;
  
  clienteId: number | null;
  setClienteId: (id: number) => void;

  clientes: Cliente[];  
  
  cotizacion: any;

  plantillaId: number;
  setPlantillaId: (id: number) => void;

  monedaId: number;
  setMonedaId: (id: number) => void;

  plataformaId:number;
  setPlataformaId: (id:number) =>void;

  estado_cotizacion_id: number;
  setEstadoCotizacionId: (id: number) => void;

  modoDistribucion: 'POR_ITEM' | 'POR_CANTIDAD';
  setModoDistribucion: (v: 'POR_ITEM' | 'POR_CANTIDAD') => void;
  
  fecha: string;
  setFecha: (v: string) => void;

  validezDias: number;
  setValidezDias: (v: number) => void;

  titulo: string;
  setTitulo: (v:string) => void;

  plantillas: { id: number; nombre: string }[];
  plataformas: { id: number; nombre: string} [];
}

export function CotizacionGeneralForm({ 
  clienteId,
  setClienteId,
  clientes,
  plantillaId,
  setPlantillaId,
  monedaId,
  setMonedaId,
  plataformaId,
  setPlataformaId,
  estado_cotizacion_id,
  setEstadoCotizacionId,
  modoDistribucion,
  setModoDistribucion,
  fecha,
  setFecha,
  validezDias,
  setValidezDias,
  plantillas,
  plataformas,
  titulo,
  setTitulo,
  disabled
}: Props) {

  const selectedCliente = clientes.find((c) => c.id === clienteId);
  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-xl text-gray-800 mb-4">Información General</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-2 text-gray-700">Cliente</label>
                <select disabled={disabled}
                  value={clienteId ?? ''}
                  onChange={(e) => {
                    const selectedId = Number(e.target.value);
                    const selectedCliente = clientes.find((c) => c.id === selectedId);
                    setClienteId(selectedId);
                    if (selectedCliente?.moneda_id) {
                    setMonedaId(selectedCliente.moneda_id);
                    }
                  }}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="" disabled>
                    Seleccione un cliente
                  </option>
                  {clientes.map((clienteOption) => (
                    <option key={clienteOption.id} value={clienteOption.id}>
                      {clienteOption.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm mb-2 text-gray-700">Título *</label>
                <input disabled={disabled}
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="ej: Cotización Equipos de Cómputo"
                />
              </div>
              <div>
                <label className="block text-sm mb-2 text-gray-700">Validez (días)</label>
                <input disabled={disabled}
                  type="number"
                  value={validezDias}
                  onChange={(e) => setValidezDias(Number(e.target.value))}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder='Ingresa días de validez, ej: 30'
                />
              </div>
              <div>
                <label className="block text-sm mb-2 text-gray-700">Plantilla</label>
                <select disabled={disabled}
                  value={plantillaId ?? ''}
                  onChange={(e) => setPlantillaId(Number(e.target.value))}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="" disabled >Seleccionar plantilla</option>
                  {plantillas.map((plantilla) => (
                    <option
                      key={plantilla.id}
                      value={plantilla.id}
                    >
                      {plantilla.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-2 text-gray-700">Modo Distribución</label>
                <select disabled={disabled}
                  value={modoDistribucion}
                  onChange={(e)=> setModoDistribucion(e.target.value as 'POR_ITEM' | 'POR_CANTIDAD')}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="" disabled >Seleccionar Modo</option>
                  <option value="POR_ITEM">Por Items</option>
                  <option value="POR_CANTIDAD">Por cantidad de item</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-2 text-gray-700">Moneda</label>
                <select disabled={disabled}
                  value={selectedCliente?.moneda_id || monedaId}
                  onChange={(e) => setMonedaId(Number(e.target.value))}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="" disabled >Seleccionar moneda</option>
                  <option value={1}>PEN (S/)</option>
                  <option value={2}>USD ($)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-2 text-gray-700">Plataforma</label>
                <select disabled={disabled}
                  value={plataformaId ?? 1}
                  onChange={(e) => setPlataformaId(Number(e.target.value))}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="" disabled >Seleccionar plantilla</option>
                  {plataformas.map((plataforma) => (
                    <option
                      key={plataforma.id}
                      value={plataforma.id}
                    >
                      {plataforma.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-2 text-gray-700">Estado</label>
                <select disabled={disabled}
                  value={estado_cotizacion_id}
                  onChange={(e) => setEstadoCotizacionId(Number(e.target.value))}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>Borrador</option>
                  <option value={2}>Enviada</option>
                  <option value={3}>Parcialmente Aprobada</option>
                  <option value={4}>Aprobada</option>
                  <option value={5}>Rechazada</option>
                  <option value={6}>OC_Registrada</option>
                </select>
              </div>
            </div>
          </div>
  )
}
