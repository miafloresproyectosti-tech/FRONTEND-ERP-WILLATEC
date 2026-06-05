import { X, Copy } from 'lucide-react';

export default function TempPasswordModal({ isOpen, onClose, tempPassword }:{ isOpen:boolean; onClose:()=>void; tempPassword?:string }){
  if(!isOpen) return null;

  const copyToClipboard = async () => {
    if(!tempPassword) return;
    await navigator.clipboard.writeText(tempPassword);
    // No context here; consumer may show toast
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Contraseña Temporal</h3>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center"><X size={18} /></button>
        </div>

        <p className="text-sm text-gray-600 mb-4">Se ha generado una contraseña temporal para el usuario. Copia y entrégala al usuario, solo sirve para un ingreso.</p>

        <div className="bg-gray-100 p-4 rounded-2xl flex items-center justify-between">
          <div className="font-mono text-sm text-gray-800">{tempPassword || '—'}</div>
          <button onClick={copyToClipboard} className="ml-4 bg-blue-600 text-white px-3 py-2 rounded-2xl flex items-center gap-2"><Copy size={14}/> Copiar</button>
        </div>

        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="bg-gray-100 px-4 py-2 rounded-2xl">Cerrar</button>
        </div>
      </div>
    </div>
  );
}
