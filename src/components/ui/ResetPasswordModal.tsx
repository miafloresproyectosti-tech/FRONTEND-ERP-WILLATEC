import { useState } from 'react';
import { Mail, X } from 'lucide-react';
import { forgotPasswordRequest } from '../../services/auth.service';
import { useNotifications } from '../../NotificationContext';

export default function ResetPasswordModal({ isOpen, onClose }:{ isOpen:boolean; onClose:()=>void }){
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { showToast } = useNotifications();

  if(!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if(!email) { setError('Ingrese su correo'); return; }

    try{
      setLoading(true);
      await forgotPasswordRequest(email);
      showToast({ title: 'Solicitud recibida', description: 'Se notificó al administrador para restablecer su contraseña', type: 'info' });
      setEmail('');
      onClose();
    }catch(err:any){
      setError(err?.message || 'Error al solicitar restablecimiento');
    }finally{ setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Recuperar contraseña</h3>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center"><X size={18} /></button>
        </div>

        <p className="text-sm text-gray-600 mb-4">Ingresa tu correo y el superadministrador podrá generar una contraseña temporal para tu acceso.</p>

        {error && <div className="mb-3 text-sm text-red-600">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Correo</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full pl-10 pr-3 py-3 border rounded-2xl" placeholder="tu@correo.com" />
            </div>
          </div>

          <div className="flex gap-3 mt-2">
            <button type="button" onClick={onClose} className="flex-1 bg-gray-100 py-3 rounded-2xl">Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white py-3 rounded-2xl">{loading? 'Enviando...' : 'Solicitar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
