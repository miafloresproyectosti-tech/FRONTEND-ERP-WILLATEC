import { useState } from 'react';
import { Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';

export default function LoginComponent() {

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = (e: React.FormEvent) => {
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

    // Simular login
    setTimeout(() => {
      let role = 'VENTAS';
      if (email.includes('super')) role = 'SUPERADMIN';
      else if (email.includes('admin')) role = 'ADMIN';
      else if (email.includes('soporte')) role = 'SOPORTE';

      login(email, role);
      setLoading(false);
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
    }, 1500);
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900">
      {/* Hero Section */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12">
        <div className="max-w-md text-white">
          <h1 className="text-5xl font-black mb-6 bg-gradient-to-r from-white to-blue-100 bg-clip-text">
            ERP Empresarial
          </h1>
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
                <p className="text-blue-100 text-sm">Plantillas en dólares y soles</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-white/10 backdrop-blur-sm rounded-2xl">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-lg font-bold">✓</span>
              </div>
              <div>
                <h3 className="text-lg font-bold mb-1">Roles y Permisos</h3>
                <p className="text-blue-100 text-sm">Control total de accesos</p>
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
                <span className="text-white text-3xl font-black">ERP</span>
              </div>
              <h2 className="text-4xl font-black text-gray-900 mb-2">Bienvenido</h2>
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
                    className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 text-lg placeholder-gray-400"
                    placeholder="super@empresa.com"
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
            </form>

            {/* Usuarios Demo */}
            <div className="mt-10 pt-8 border-t-2 border-gray-100">
              <p className="text-sm font-semibold text-gray-700 text-center mb-6">👥 Usuarios de Prueba</p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
                  <div className="font-mono text-purple-800">super@empresa.com</div>
                  <div className="text-purple-600 font-bold">SUPERADMIN</div>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="font-mono text-blue-800">admin@empresa.com</div>
                  <div className="text-blue-600 font-bold">ADMIN</div>
                </div>
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl">
                  <div className="font-mono text-orange-800">ventas@empresa.com</div>
                  <div className="text-orange-600 font-bold">VENTAS</div>
                </div>
                <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-xl col-span-2">
                  <div className="font-mono text-cyan-800">soporte@empresa.com</div>
                  <div className="text-cyan-600 font-bold">SOPORTE</div>
                </div>
              </div>
              <p className="text-xs text-gray-500 text-center mt-4 font-mono">Contraseña: cualquiera (6+ chars)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}