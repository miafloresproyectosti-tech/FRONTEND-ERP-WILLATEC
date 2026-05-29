import { useState, useEffect } from "react";
import type { Cliente } from "../../types/cotizaciones.type";

interface Props {
  usuarioNombre?: string;

  disabled: boolean;
  
  clienteId: number | null;
  setClienteId: (id: number) => void;

  clientes: Cliente[];  
  
  cotizacion: any;

  plantillaId: number;
  setPlantillaId: (id: number) => void;

  monedaId: number;
  setMonedaId: (id: number) => void;
  tipoCambioSolesADolar: number;
  setTipoCambioSolesADolar: (v:number) => void;
  tipoCambioDolarASoles: number;
  setTipoCambioDolarASoles: (v:number) => void;

  plataformaId:number;
  setPlataformaId: (id:number) =>void;

  estado_cotizacion_id: number;
  setEstadoCotizacionId: (id: number) => void;

  modoDistribucion: 'POR_ITEM' | 'POR_CANTIDAD';
  setModoDistribucion: (v: 'POR_ITEM' | 'POR_CANTIDAD') => void;
  
  fecha: string;
  setFecha: (v: string) => void;

  validezDias: number | undefined;
  setValidezDias: (v: number | undefined) => void;

  titulo: string;
  setTitulo: (v:string) => void;

  plantillas: { id: number; nombre: string; incluye_igv: Boolean }[];
  plataformas: { id: number; nombre: string} [];
}

export function CotizacionGeneralForm({ 
  usuarioNombre,
  clienteId,
  setClienteId,
  clientes,
  plantillaId,
  setPlantillaId,
  monedaId,
  setMonedaId,
  tipoCambioSolesADolar,
  setTipoCambioSolesADolar,
  tipoCambioDolarASoles,
  setTipoCambioDolarASoles,
  plataformaId,
  setPlataformaId,
  estado_cotizacion_id,
  setEstadoCotizacionId,
  modoDistribucion,
  setModoDistribucion,
  validezDias,
  setValidezDias,
  plantillas,
  plataformas,
  titulo,
  setTitulo,
  disabled,
  cotizacion
}: Props) {

  const [searchClienteInput, setSearchClienteInput] = useState('');
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);

  const selectedCliente = clientes.find((c) => c.id === clienteId);

  const [plantillaImposesMoneda, setPlantillaImposesMoneda] = useState(false);

  const detectMonedaFromPlantilla = (nombre?: string): number | null => {
    if (!nombre) return null;
    const up = nombre.toUpperCase();
    if (up.includes('DOLAR') || up.includes('DÓLAR') || up.includes('USD')) return 2;
    if (up.includes('SOLES') || up.includes('S/')) return 1;
    return null;
  };

  const getEjecutivoNombre = () => {
    const ejecutivo = cotizacion?.user || cotizacion?.usuario;
    const nombres = ejecutivo?.user?.nombres;
    const apellidos = ejecutivo?.user?.apellidos;

    if (nombres) {
      return `${nombres}${apellidos ? ` ${apellidos}` : ''}`;
    }

    if (usuarioNombre) {
      return usuarioNombre;
    }

    return cotizacion?.user_id ? `Usuario #${cotizacion.user_id}` : 'Desconocido';
  };
  
  const filteredClientes = clientes.filter(cliente =>
    cliente.nombre.toLowerCase().includes(searchClienteInput.toLowerCase())
  );

  const handleClienteSelect = (cliente: Cliente) => {
    setClienteId(cliente.id);
    setSearchClienteInput(cliente.nombre);
    setShowClienteDropdown(false);
    if (cliente.moneda_id) {
      setMonedaId(cliente.moneda_id);
    }
  };

  const handlePlantillaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    setPlantillaId(id);
    const plantilla = plantillas.find(p => p.id === id);
    const moneda = detectMonedaFromPlantilla(plantilla?.nombre);
    if (moneda) {
      setMonedaId(moneda);
      setPlantillaImposesMoneda(true);
    } else {
      setPlantillaImposesMoneda(false);
    }
  };

  // Inicializar bloqueo de moneda si la plantilla actual impone moneda
  useEffect(() => {
    const plantilla = plantillas.find(p => p.id === plantillaId);
    const moneda = detectMonedaFromPlantilla(plantilla?.nombre);
    if (moneda) {
      setMonedaId(moneda);
      setPlantillaImposesMoneda(true);
    } else {
      setPlantillaImposesMoneda(false);
    }
  }, [plantillaId, plantillas]);

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-xl text-gray-800 mb-4">Información General</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-sm mb-2 text-gray-700">Cliente</label>
                <input 
                  disabled={disabled}
                  type="text"
                  value={searchClienteInput || selectedCliente?.nombre || ''}
                  onChange={(e) => {
                    setSearchClienteInput(e.target.value);
                    setShowClienteDropdown(true);
                  }}
                  onFocus={() => setShowClienteDropdown(true)}
                  placeholder="Buscar cliente..."
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                
                {showClienteDropdown && !disabled && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                    {filteredClientes.length > 0 ? (
                      filteredClientes.map((cliente) => (
                        <button
                          key={cliente.id}
                          type="button"
                          onClick={() => handleClienteSelect(cliente)}
                          className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 text-gray-800 text-sm"
                        >
                          {cliente.nombre}
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-gray-400 text-sm text-center">
                        No se encontraron clientes
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm mb-2 text-gray-700">Ejecutivo</label>
                <div className="px-4 py-2 border rounded-lg bg-gray-50 text-gray-700">
                  {getEjecutivoNombre()}
                </div>
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
                  value={validezDias || ''}
                  onChange={(e) => setValidezDias(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder='Ingresa días de validez, ej: 30'
                />
              </div>
              <div>
                <label className="block text-sm mb-2 text-gray-700">Plantilla</label>
                <select disabled={disabled}
                  value={plantillaId ?? ''}
                  onChange={handlePlantillaChange}
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
                <select disabled={disabled || plantillaImposesMoneda}
                  value={monedaId}
                  onChange={(e) => { setMonedaId(Number(e.target.value)); setPlantillaImposesMoneda(false); }}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="" disabled >Seleccionar moneda</option>
                  <option value={1}>PEN (S/)</option>
                  <option value={2}>USD ($)</option>
                </select>
                {plantillaImposesMoneda && (
                  <p className="text-xs text-gray-500 mt-1">Moneda asignada por la plantilla</p>
                )}
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm mb-2 text-gray-700">Soles → USD</label>
                    <input
                      disabled={disabled}
                      type="number"
                      step="0.01"
                      value={tipoCambioSolesADolar}
                      onChange={(e) => setTipoCambioSolesADolar(Number(e.target.value || 0))}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2 text-gray-700">USD → Soles</label>
                    <input
                      disabled={disabled}
                      type="number"
                      step="0.01"
                      value={tipoCambioDolarASoles}
                      onChange={(e) => setTipoCambioDolarASoles(Number(e.target.value || 0))}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm mb-2 text-gray-700">Requerimiento Via: </label>
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
