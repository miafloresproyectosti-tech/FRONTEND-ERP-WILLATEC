import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { twoFactorChallengeRequest } from "../services/auth.service";
import { useAuth } from "../AuthContext";

export default function TwoFactorChallengePage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const loginToken = sessionStorage.getItem("two_factor_login_token");
    const email = sessionStorage.getItem("two_factor_email");

    if (!loginToken || !email) {
      navigate("/login");
      return;
    }

    if (code.length !== 6) {
      setError("Ingrese el código de 6 dígitos");
      return;
    }

    try {
      setLoading(true);

      const result = await twoFactorChallengeRequest(loginToken, code);

      sessionStorage.removeItem("two_factor_login_token");
      sessionStorage.removeItem("two_factor_email");

      login(result.id, result.email || email, result.role, result.last_login_at);

      navigate(
        result.role === "SUPERADMIN"
          ? "/"
          : result.role === "ADMIN"
          ? "/clientes"
          : result.role === "VENTAS"
          ? "/cotizaciones"
          : "/"
      );
    } catch {
      setError("Código inválido o expirado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center">
            <ShieldCheck className="text-white w-8 h-8" />
          </div>
        </div>

        <h1 className="text-2xl font-black text-center mb-2">
          Verificación en dos pasos
        </h1>

        <p className="text-center text-gray-600 mb-6">
          Ingresa el código de 6 dígitos de tu app autenticadora.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="w-full text-center text-3xl tracking-[0.5em] border-2 border-gray-200 rounded-2xl py-4 mb-5"
            placeholder="000000"
            autoFocus
          />

          <button
            disabled={loading}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold disabled:opacity-50"
          >
            {loading ? "Verificando..." : "Verificar"}
          </button>
        </form>
      </div>
    </div>
  );
}