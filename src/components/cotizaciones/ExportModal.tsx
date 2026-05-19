{/* 5. Modal Exportación */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">Exportar Documento</h3>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleExportarPdf} className="flex items-center justify-center gap-2 p-3 border-2 border-red-100 rounded-xl hover:bg-red-50 text-red-700 font-bold">
                {exportandoPdf ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <FileText className="w-5 h-5" />
                )}

                  {exportandoPdf ? 'Exportando...' : 'PDF'}
              </button>
              {/* <button onClick={() => handleExportarPdf('excel')} className="flex items-center justify-center gap-2 p-3 border-2 border-green-100 rounded-xl hover:bg-green-50 text-green-700 font-bold">
                <FileSpreadsheet className="w-5 h-5" /> Excel
              </button> */}
            </div>
            <button onClick={() => setShowExportModal(false)} className="mt-4 text-sm text-gray-400 hover:underline">Cerrar</button>
          </div>
        </div>
      )}
    </div>
      );