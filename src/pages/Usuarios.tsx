import { useState, useEffect } from 'react';
import { Search, Plus, Pencil, Trash2, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { getUsers, createUser, updateUser, deleteUser, type User as ApiUser, type CreateUserData, type UpdateUserData } from '../services/usuario.service';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: 'activo' | 'inactivo';
  area: 'comercial' | 'soporte' | 'administracion';
  telefono?: string;
  dni?: string;
  cargo?: string;
}

export default function Usuarios() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState<string>('');

  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState({
    id: null as number | null,
    name: '',
    email: '',
    role: 'VENTAS',
    status: 'activo' as 'activo' | 'inactivo',
    area: 'comercial' as 'comercial' | 'soporte' | 'administracion',
    telefono: '',
    dni: '',
    cargo: '',
    password: '',
    password_confirmation: '',
  });

  const [usuarioAEliminar, setUsuarioAEliminar] = useState<User | null>(null);

  // Cargar usuarios al montar el componente
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const apiUsers = await getUsers();
      const formattedUsers: User[] = apiUsers.map((apiUser: ApiUser) => ({
        id: apiUser.id,
        name: `${apiUser.nombres} ${apiUser.apellidos}`,
        email: apiUser.email,
        role: apiUser.roles && apiUser.roles.length > 0 ? apiUser.roles[0].name.toUpperCase() : 'VENTAS',
        status: apiUser.activo ? 'activo' : 'inactivo',
        area: getAreaFromRole(apiUser.roles && apiUser.roles.length > 0 ? apiUser.roles[0].name : 'VENTAS'),
        telefono: apiUser.profile?.telefono || '',
        dni: apiUser.profile?.dni || '',
        cargo: apiUser.profile?.cargo || '',
      }));
      setUsers(formattedUsers);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAreaFromRole = (role: string): 'comercial' | 'soporte' | 'administracion' => {
    switch (role.toUpperCase()) {
      case 'VENTAS':
        return 'comercial';
      case 'SOPORTE':
        return 'soporte';
      case 'ADMIN':
      case 'SUPERADMIN':
        return 'administracion';
      default:
        return 'comercial';
    }
  };

  const getRoleIdFromName = (roleName: string): number => {
    switch (roleName.toUpperCase()) {
      case 'SUPERADMIN':
        return 1;
      case 'ADMIN':
        return 2;
      case 'VENTAS':
        return 3;
      case 'SOPORTE':
        return 4;
      default:
        return 3;
    }
  };

  // Filtrar usuarios por búsqueda y área
  const usuariosFiltrados = users.filter((u) => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         u.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEstado = !filterEstado || u.status === filterEstado;
    return matchesSearch && matchesEstado;
  });

  // PAGINACION
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = usuariosFiltrados.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(usuariosFiltrados.length / itemsPerPage);
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  // Actualizar área automáticamente cuando cambia el rol
  useEffect(() => {
    if (usuarioSeleccionado.role) {
      const nuevaArea = getAreaFromRole(usuarioSeleccionado.role);
      setUsuarioSeleccionado(prev => ({
        ...prev,
        area: nuevaArea
      }));
    }
  }, [usuarioSeleccionado.role]);

  const handleNuevo = () => {
    if (user?.role !== 'SUPERADMIN') return;
    setUsuarioSeleccionado({
      id: null,
      name: '',
      email: '',
      role: 'VENTAS',
      status: 'activo',
      area: 'comercial', // Área por defecto
      telefono: '',
      dni: '',
      cargo: '',
      password: '',
      password_confirmation: '',
    });
    setModoEdicion(false);
    setOpenModal(true);
  };

  const handleEditar = (usuario: User) => {
    if (user?.role !== 'SUPERADMIN') return;

    setUsuarioSeleccionado({
      id: usuario.id,
      name: usuario.name,
      email: usuario.email,
      role: usuario.role,
      status: usuario.status,
      area: usuario.area,
      telefono: usuario.telefono || '',
      dni: usuario.dni || '',
      cargo: usuario.cargo || '',
      password: '',
      password_confirmation: '',
    });
    setModoEdicion(true);
    setOpenModal(true);
  };

  const handleEliminar = (usuario: User) => {
    if (user?.role !== 'SUPERADMIN') return;
    setUsuarioAEliminar(usuario);
  };

  const confirmarEliminar = async () => {
    if (!usuarioAEliminar) return;

    try {
      setSaving(true);
      await deleteUser(usuarioAEliminar.id);
      await loadUsers(); // Recargar la lista
      setUsuarioAEliminar(null);
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleGuardar = async () => {
    if (!usuarioSeleccionado.name || !usuarioSeleccionado.email) return;

    try {
      setSaving(true);

      const [nombres, ...apellidosArr] = usuarioSeleccionado.name.split(' ');
      const apellidos = apellidosArr.join(' ');

      if (modoEdicion && usuarioSeleccionado.id) {
        // Actualizar usuario existente
        const updateData: UpdateUserData = {
          nombres,
          apellidos,
          email: usuarioSeleccionado.email,
          telefono: usuarioSeleccionado.telefono,
          dni: usuarioSeleccionado.dni,
          cargo: usuarioSeleccionado.cargo,
          role: usuarioSeleccionado.role.toLowerCase(), // Enviar nombre del rol en minúsculas
          activo: usuarioSeleccionado.status === 'activo',
        };

        await updateUser(usuarioSeleccionado.id, updateData);
      } else {
        // Crear nuevo usuario
        if (!usuarioSeleccionado.password) {
          alert('La contraseña es requerida para nuevos usuarios');
          setSaving(false);
          return;
        }

        const createData: CreateUserData = {
          nombres,
          apellidos,
          email: usuarioSeleccionado.email,
          password: usuarioSeleccionado.password,
          password_confirmation: usuarioSeleccionado.password_confirmation,
          role: getRoleIdFromName(usuarioSeleccionado.role), // Cambiado de role_id a role
          telefono: usuarioSeleccionado.telefono,
          dni: usuarioSeleccionado.dni,
          cargo: usuarioSeleccionado.cargo,
        };

        await createUser(createData);
      }

      await loadUsers(); // Recargar la lista
      setOpenModal(false);
    } catch (error) {
      console.error('Error al guardar usuario:', error);
      alert('Error al guardar el usuario. Verifica los datos e intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const canAddUser = user?.role === 'SUPERADMIN';

  return (
    <div className="space-y-6 p-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Usuarios
          </h1>
          <p className="text-gray-500 mt-1">
            Gestión de usuarios del sistema ({users.length} total)
          </p>
        </div>

        {canAddUser && (
          <button
            onClick={handleNuevo}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl flex items-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
          >
            <Plus size={20} />
            Nuevo Usuario
          </button>
        )}
      </div>

      {/* BUSCADOR Y FILTRO */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex items-center gap-3 bg-gray-100 px-4 py-3 rounded-2xl flex-1">
            <Search size={18} className="text-gray-500 flex-shrink-0" />
            <input
              type="text"
              placeholder="Buscar usuario por nombre, email o rol..."
              value={searchTerm}
              onChange={handleSearch}
              className="bg-transparent outline-none w-full text-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-gray-700">Filtrar por Estado:</label>
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 bg-white/80 backdrop-blur-sm transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <option value="">Todos</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABLA */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600">Cargando usuarios...</span>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Usuario</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Rol</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Estado</th>
                <th className="text-center px-6 py-4 text-sm font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {currentItems.length > 0 ? (
                currentItems.map((u) => (
                  <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50 transition-all duration-200">
                    <td className="px-6 py-5">
                      <h3 className="font-semibold text-gray-800">{u.name}</h3>
                      <p className="text-sm text-gray-500">{u.email}</p>
                      {u.cargo && <p className="text-xs text-gray-400">{u.cargo}</p>}
                    </td>

                    <td className="px-6 py-5 text-gray-600">{u.role}</td>

                    <td className="px-6 py-5">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        u.status === 'activo'
                          ? 'bg-green-100 text-green-700 border border-green-200'
                          : 'bg-red-100 text-red-700 border border-red-200'
                      }`}>
                        {u.status}
                      </span>
                    </td>

                    <td className="px-6 py-5">
                      {canAddUser && (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditar(u)}
                            className="w-11 h-11 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-200 transition-all duration-200 hover:scale-105 shadow-sm"
                            title="Editar"
                          >
                            <Pencil size={18} />
                          </button>

                          <button
                            onClick={() => handleEliminar(u)}
                            className="w-11 h-11 rounded-xl bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200 transition-all duration-200 hover:scale-105 shadow-sm"
                            title="Eliminar"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm || filterEstado ? 'No se encontraron usuarios' : 'No hay usuarios'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* PAGINACION */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Mostrando {indexOfFirstItem + 1} a {Math.min(indexOfLastItem, usuariosFiltrados.length)} de {usuariosFiltrados.length} usuarios
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <ChevronLeft size={18} />
                </button>

                {pages.map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 font-medium ${
                      currentPage === page
                        ? 'bg-blue-600 text-white shadow-md hover:shadow-lg'
                        : 'text-gray-600 hover:bg-gray-200 hover:shadow-sm'
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL CONFIRMAR ELIMINAR */}
      {usuarioAEliminar && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl border border-gray-200">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} className="text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                ¿Eliminar usuario?
              </h3>
              <p className="text-gray-600">
                ¿Estás seguro de que deseas eliminar <strong>"{usuarioAEliminar.name}"</strong>?
              </p>
            </div>
            <div className="flex gap-3 pt-6 border-t border-gray-200">
              <button
                onClick={() => setUsuarioAEliminar(null)}
                disabled={saving}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-6 rounded-2xl transition-all duration-200 font-medium disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEliminar}
                disabled={saving}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded-2xl transition-all duration-200 font-medium shadow-sm hover:shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  'Eliminar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREAR / EDITAR */}
      {openModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-white to-gray-50 w-full max-w-2xl rounded-3xl p-8 shadow-2xl border border-white/50 max-h-[90vh] overflow-y-auto">
            {/* HEADER */}
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-200">
              <div className="space-y-1">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  {modoEdicion ? 'Editar Usuario' : 'Nuevo Usuario'}
                </h2>
                <p className="text-gray-500 text-sm">
                  Completa toda la información del usuario
                </p>
              </div>

              <button
                onClick={() => setOpenModal(false)}
                className="w-12 h-12 rounded-2xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all duration-200 hover:scale-105 shadow-sm"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            {/* FORM */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* NOMBRE */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    Nombre completo
                  </label>
                  <input
                    value={usuarioSeleccionado.name}
                    onChange={(e) =>
                      setUsuarioSeleccionado({
                        ...usuarioSeleccionado,
                        name: e.target.value,
                      })
                    }
                    className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 bg-white/80 backdrop-blur-sm transition-all duration-200 shadow-sm hover:shadow-md"
                    placeholder="Nombre del usuario"
                  />
                </div>

                {/* EMAIL */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    value={usuarioSeleccionado.email}
                    onChange={(e) =>
                      setUsuarioSeleccionado({
                        ...usuarioSeleccionado,
                        email: e.target.value,
                      })
                    }
                    className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 bg-white/80 backdrop-blur-sm transition-all duration-200 shadow-sm hover:shadow-md"
                    placeholder="usuario@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* ROL */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Rol</label>
                  <select
                    value={usuarioSeleccionado.role}
                    onChange={(e) =>
                      setUsuarioSeleccionado({
                        ...usuarioSeleccionado,
                        role: e.target.value,
                      })
                    }
                    className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 bg-white/80 backdrop-blur-sm transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    <option value="SUPERADMIN">Superadministrador</option>
                    <option value="ADMIN">Administrador</option>
                    <option value="VENTAS">Ventas</option>
                    <option value="SOPORTE">Soporte</option>
                  </select>
                </div>

                {/* AREA */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Área</label>
                  <input
                    type="text"
                    value={usuarioSeleccionado.area}
                    readOnly
                    className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed"
                    placeholder="Se determina automáticamente por el rol"
                  />
                </div>

                {/* ESTADO - Solo en edición */}
                {modoEdicion && (
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Estado</label>
                    <select
                      value={usuarioSeleccionado.status}
                      onChange={(e) =>
                        setUsuarioSeleccionado({
                          ...usuarioSeleccionado,
                          status: e.target.value as 'activo' | 'inactivo',
                        })
                      }
                      className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 bg-white/80 backdrop-blur-sm transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      <option value="activo">Activo</option>
                      <option value="inactivo">Inactivo</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* TELEFONO */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Teléfono</label>
                  <input
                    type="tel"
                    value={usuarioSeleccionado.telefono}
                    onChange={(e) =>
                      setUsuarioSeleccionado({
                        ...usuarioSeleccionado,
                        telefono: e.target.value,
                      })
                    }
                    className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 bg-white/80 backdrop-blur-sm transition-all duration-200 shadow-sm hover:shadow-md"
                    placeholder="942834089"
                  />
                </div>

                {/* DNI */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">DNI</label>
                  <input
                    value={usuarioSeleccionado.dni}
                    onChange={(e) =>
                      setUsuarioSeleccionado({
                        ...usuarioSeleccionado,
                        dni: e.target.value,
                      })
                    }
                    className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 bg-white/80 backdrop-blur-sm transition-all duration-200 shadow-sm hover:shadow-md"
                    placeholder="41962526"
                  />
                </div>
              </div>

              {/* CARGO */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Cargo</label>
                <input
                  value={usuarioSeleccionado.cargo}
                  onChange={(e) =>
                    setUsuarioSeleccionado({
                      ...usuarioSeleccionado,
                      cargo: e.target.value,
                    })
                  }
                  className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 bg-white/80 backdrop-blur-sm transition-all duration-200 shadow-sm hover:shadow-md"
                  placeholder="Gerente General"
                />
              </div>

              {/* CONTRASEÑA - Solo para nuevos usuarios */}
              {!modoEdicion && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      Contraseña
                    </label>
                    <input
                      type="password"
                      value={usuarioSeleccionado.password}
                      onChange={(e) =>
                        setUsuarioSeleccionado({
                          ...usuarioSeleccionado,
                          password: e.target.value,
                        })
                      }
                      className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 bg-white/80 backdrop-blur-sm transition-all duration-200 shadow-sm hover:shadow-md"
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      Confirmar Contraseña
                    </label>
                    <input
                      type="password"
                      value={usuarioSeleccionado.password_confirmation}
                      onChange={(e) =>
                        setUsuarioSeleccionado({
                          ...usuarioSeleccionado,
                          password_confirmation: e.target.value,
                        })
                      }
                      className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 bg-white/80 backdrop-blur-sm transition-all duration-200 shadow-sm hover:shadow-md"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              )}

              {/* BOTONES */}
              <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setOpenModal(false)}
                  disabled={saving}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-4 px-6 rounded-2xl transition-all duration-200 font-semibold shadow-sm hover:shadow-md disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleGuardar}
                  disabled={saving || !usuarioSeleccionado.name || !usuarioSeleccionado.email}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-4 px-6 rounded-2xl transition-all duration-200 font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-sm flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      {modoEdicion ? 'Actualizando...' : 'Creando...'}
                    </>
                  ) : (
                    modoEdicion ? 'Actualizar Usuario' : 'Crear Usuario'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}