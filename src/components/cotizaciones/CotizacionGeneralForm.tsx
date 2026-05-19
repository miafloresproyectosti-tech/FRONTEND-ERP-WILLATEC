      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* FORM INFO GENERAL */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-xl text-gray-800 mb-4">Información General</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-2 text-gray-700">Cliente</label>
                <select
                  value={clienteId ?? ''}
                  onChange={(e) => {
                    const selectedId = Number(e.target.value);
                    const selectedCliente = clientes.find((c) => c.id === selectedId);
                    setClienteId(selectedId);
                    if (selectedCliente?.moneda_id) {
                    setMonedaId(selectedCliente.moneda_id.toString());
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
              <div>
                <label className="block text-sm mb-2 text-gray-700">Fecha</label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm mb-2 text-gray-700">Validez (días)</label>
                <input
                  type="number"
                  value={validezDias || ''}
                  onChange={(e) => setValidezDias(Number(e.target.value))}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder='Ingresa días de validez, ej: 30'
                />
              </div>
              <div>
                <label className="block text-sm mb-2 text-gray-700">Plantilla</label>
                <select
                  value={plantillaId ?? ''}
                  onChange={(e) => setPlantillaId(Number(e.target.value))}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="" disabled >Seleccionar plantilla</option>
                  {plantillas.map((plantilla: Plantilla) => (
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
                <select
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
                <select
                  value={monedaId}
                  onChange={(e) => setMonedaId(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="" disabled >Seleccionar moneda</option>
                  <option value={1}>PEN (S/)</option>
                  <option value={2}>USD ($)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-2 text-gray-700">Estado</label>
                <select
                  value={estadoCotizacionId}
                  onChange={(e) => setEstadoCotizacionId(Number(e.target.value))}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>Borrador</option>
                  <option value={2}>Enviada</option>
                  <option value={3}>Parcialmente Aprobada</option>
                  <option value={4}>Aprobada</option>
                  <option value={5}>OC_Registrada</option>
                </select>
              </div>
            </div>
          </div>