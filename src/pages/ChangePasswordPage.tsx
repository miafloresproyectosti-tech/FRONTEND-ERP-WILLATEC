import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  changePasswordRequest,
  loginRequest,
  meRequest,
} from "../services/auth.service";
import { useNotifications } from "../NotificationContext";
import { useAuth } from "../AuthContext";

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { showToast } = useNotifications();
  const { login } = useAuth();

  const storedEmail = sessionStorage.getItem("temp_user_email") || "";
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Si no hay password temporal, el usuario puede ingresar su password actual.
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!currentPassword) {
      setError("Debe ingresar la contrasena actual");
      return;
    }

    if (!password || password.length < 6) {
      setError("La contrasena debe tener al menos 6 caracteres");
      return;
    }

    if (password !== passwordConfirmation) {
      setError("Las contrasenas no coinciden");
      return;
    }

    try {
      setLoading(true);
      await changePasswordRequest(
        currentPassword,
        password,
        passwordConfirmation
      );

      if (storedEmail) {
        const { role, id, last_login_at, two_factor_enabled } =
          await loginRequest(storedEmail, password);
        login(id, storedEmail, role, last_login_at, two_factor_enabled);
      } else {
        const me = await meRequest();
        const role =
          me.data?.roles && me.data.roles.length > 0
            ? me.data.roles[0].name.toUpperCase()
            : "VENTAS";
        const id = me.data?.id;
        const email = me.data?.email || "";
        login(
          id,
          email,
          role,
          me.data?.last_login_at || null,
          !!me.data?.two_factor_confirmed_at
        );
      }

      showToast({
        title: "Contrasena cambiada",
        description: "Tu contrasena fue cambiada correctamente",
        type: "success",
      });
      sessionStorage.removeItem("temp_user_email");
      sessionStorage.removeItem("temp_user_id");
      navigate("/");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error al cambiar contrasena";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow">
        <h2 className="text-2xl font-bold mb-4">Cambiar contrasena</h2>
        <p className="text-sm text-gray-600 mb-4">
          Ingresa una nueva contrasena para completar el acceso.
        </p>

        {error && <div className="text-sm text-red-600 mb-3">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="Contrasena actual"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full px-4 py-3 border rounded-2xl"
          />

          <input
            type="password"
            placeholder="Nueva contrasena"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border rounded-2xl"
          />

          <input
            type="password"
            placeholder="Confirmar contrasena"
            value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
            className="w-full px-4 py-3 border rounded-2xl"
          />

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="flex-1 bg-gray-100 py-3 rounded-2xl"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-3 rounded-2xl"
            >
              {loading ? "Guardando..." : "Cambiar contrasena"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
