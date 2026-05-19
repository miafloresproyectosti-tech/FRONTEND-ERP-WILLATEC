{/* 1. Modal Selección de Tipo de Item */}
      {showItemTypeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">Agregar nuevo item</h3>
              <button onClick={() => setShowItemTypeModal(false)}><X className="w-6 h-6 text-gray-400" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => handleItemTypeSelection('catalogo')}
                className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-blue-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <Package className="w-8 h-8 text-blue-600" />
                <span className="font-semibold text-blue-700">Catálogo Local</span>
              </button>
              <button 
                onClick={() => handleItemTypeSelection('personalizado')}
                className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-purple-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-colors"
              >
                <ArrowLeftRight className="w-8 h-8 text-purple-600" />
                <span className="font-semibold text-purple-700">Producto Externo</span>
              </button>
            </div>
          </div>
        </div>
      )}