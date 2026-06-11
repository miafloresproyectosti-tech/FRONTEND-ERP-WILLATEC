import { useState } from 'react';
import { Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../AuthContext';
import { useNavigate } from 'react-router-dom';
import { loginRequest } from '../../services/auth.service';
import ResetPasswordModal from './ResetPasswordModal';

export default function LoginComponent() {

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Por favor complete todos los campos');
      return;
    }

    if (!validateEmail(email)) {
      setError('Por favor ingrese un correo electrónico válido');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const { role, id, requires_password_change, last_login_at } = await loginRequest(email, password);
      // Si el backend indica que la contraseña es temporal, redirigir a cambio de contraseña
      if (requires_password_change) {
        // Guardar credenciales temporales en sessionStorage para el cambio
        sessionStorage.setItem('temp_user_email', email);
        sessionStorage.setItem('temp_user_id', String(id));
        // Navegar a ruta interna para cambiar contraseña
        navigate('/change-password?temp=1');
        return;
      }

      login(id, email, role, last_login_at);

      const targetRoute =
        role === 'SUPERADMIN'
          ? '/'
          : role === 'ADMIN'
          ? '/clientes'
          : role === 'VENTAS'
          ? '/cotizaciones'
          : role === 'SOPORTE'
          ? '/productos'
          : '/login';
      navigate(targetRoute);
    } catch (err:any) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión, revise sus credenciales');
    } finally {
      setPassword('');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900">
      {/* Hero Section */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12">
        <div className="max-w-md text-white">
          <img
                  src="/logoWILLATEC-white.png"
                  alt="Willatec"
                  className="max-w-45 max-h-45 object-contain"
                />
          <p className="text-xl text-blue-100 mb-8 leading-relaxed">
            Sistema integral de gestión. Cotizaciones, clientes, inventario y reportes en tiempo real.
          </p>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-white/10 backdrop-blur-sm rounded-2xl">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-lg font-bold">✓</span>
              </div>
              <div>
                <h3 className="text-lg font-bold mb-1">Cotizaciones Rápidas</h3>
                <p className="text-blue-100 text-sm">Atiende a los cliente de manera continua y rápida</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-white/10 backdrop-blur-sm rounded-2xl">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-lg font-bold">✓</span>
              </div>
              <div>
                <h3 className="text-lg font-bold mb-1">Gestión Empresarial</h3>
                <p className="text-blue-100 text-sm">Control total de los procesos de la empresa</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/50">
            <div className="text-center mb-10">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                <img
                  src="/logo_willatec.png"
                  alt="Willatec"
                  className="max-w-10 max-h-10 object-contain"
                />
              </div>
              <h2 className="text-4xl font-black text-gray-900 mb-2">Bienvenido(a)</h2>
              <p className="text-gray-600 text-lg">Inicia sesión para continuar</p>
            </div>

            {error && (
              <div className="mb-8 p-4 bg-red-50 border-2 border-red-200 rounded-2xl flex items-start gap-3 shadow-sm">
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-900 font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-3 text-gray-700">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="username"
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 text-lg placeholder-gray-400"
                    placeholder="xxxxxx@willatec.com"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-3 text-gray-700">Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="w-full pl-12 pr-14 py-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 text-lg placeholder-gray-400"
                    placeholder="••••••••"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 transition-colors disabled:opacity-50"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-2xl text-lg font-bold hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-blue-500/50 shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-100 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Iniciando sesión...
                  </span>
                ) : (
                  'Acceder al Sistema'
                )}
              </button>

              <div className="mt-3 text-center">
                <button type="button" onClick={() => setShowResetModal(true)} className="text-sm text-blue-600 hover:underline">¿Olvidaste tu contraseña?</button>
              </div>
            </form>
            {showResetModal && <ResetPasswordModal isOpen={showResetModal} onClose={() => setShowResetModal(false)} />}
          </div>
        </div>
      </div>
    </div>
  );
}
