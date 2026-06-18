import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { twoFactorChallengeRequest } from "../services/auth.service";
import { useAuth } from "../AuthContext";

export default function TwoFactorChallengePage() {
  const [code, setCode] = useState("");
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
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

    const trimmedCode = code.trim();

    if (!useRecoveryCode && trimmedCode.length !== 6) {
      setError("Ingrese el codigo de 6 digitos");
      return;
    }

    if (useRecoveryCode && trimmedCode.length !== 10) {
      setError("Ingrese un codigo de recuperacion valido");
      return;
    }

    try {
      setLoading(true);

      const result = await twoFactorChallengeRequest(
        loginToken,
        useRecoveryCode ? undefined : trimmedCode,
        useRecoveryCode ? trimmedCode : undefined
      );

      sessionStorage.removeItem("two_factor_login_token");
      sessionStorage.removeItem("two_factor_email");

      login(
        result.id,
        result.email || email,
        result.role,
        result.last_login_at,
        result.two_factor_enabled
      );

      navigate(
        result.role === "SUPERADMIN"
          ? "/"
          : result.role === "ADMIN"
          ? "/clientes"
          : result.role === "VENTAS"
          ? "/cotizaciones"
          : result.role === "SOPORTE"
          ? "/productos"
          : "/not-authorized"
      );
    } catch {
      setError("Codigo invalido o expirado");
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
          Verificacion en dos pasos
        </h1>

        <p className="text-center text-gray-600 mb-6">
          {useRecoveryCode
            ? "Ingresa uno de tus codigos de recuperacion."
            : "Ingresa el codigo de 6 digitos de tu app autenticadora."}
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            value={code}
            onChange={(e) =>
              setCode(
                useRecoveryCode
                  ? e.target.value.replace(/\s/g, "").slice(0, 10)
                  : e.target.value.replace(/\D/g, "").slice(0, 6)
              )
            }
            className={`w-full text-center border-2 border-gray-200 rounded-2xl py-4 mb-5 ${
              useRecoveryCode
                ? "text-xl font-mono"
                : "text-3xl tracking-[0.5em]"
            }`}
            placeholder={useRecoveryCode ? "codigo de recuperacion" : "000000"}
            autoFocus
          />

          <button
            disabled={loading}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold disabled:opacity-50"
          >
            {loading ? "Verificando..." : "Verificar"}
          </button>

          <button
            type="button"
            onClick={() => {
              setUseRecoveryCode((current) => !current);
              setCode("");
              setError("");
            }}
            className="w-full mt-4 text-sm font-semibold text-blue-700 hover:text-blue-900"
          >
            {useRecoveryCode
              ? "Usar codigo de la app autenticadora"
              : "Usar codigo de recuperacion"}
          </button>
        </form>
      </div>
    </div>
  );
}
