import { useState } from "react";
import { Mail, X } from "lucide-react";
import {
  forgotPasswordRequest,
  resetSuperadminPasswordWithSecurityQuestionsRequest,
  type SecurityQuestion,
} from "../../services/auth.service";
import { useNotifications } from "../../NotificationContext";

const getErrorMessage = (error: unknown, fallback: string) => {
  const responseMessage = (
    error as { response?: { data?: { message?: string } }; message?: string }
  )?.response?.data?.message;

  if (responseMessage) return responseMessage;
  if (error instanceof Error) return error.message;

  return fallback;
};

export default function ResetPasswordModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [questions, setQuestions] = useState<SecurityQuestion[]>([]);
  const [answers, setAnswers] = useState<string[]>(["", ""]);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { showToast } = useNotifications();

  if (!isOpen) return null;

  const isSecurityQuestionStep = questions.length > 0;

  const resetState = () => {
    setEmail("");
    setQuestions([]);
    setAnswers(["", ""]);
    setRequiresTwoFactor(false);
    setTwoFactorCode("");
    setPassword("");
    setPasswordConfirmation("");
    setError("");
  };

  const closeModal = () => {
    resetState();
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Ingrese su correo");
      return;
    }

    if (isSecurityQuestionStep) {
      if (answers.some((answer) => !answer.trim())) {
        setError("Responde todas las preguntas de seguridad");
        return;
      }

      if (requiresTwoFactor && !twoFactorCode.trim()) {
        setError("Ingresa el código de verificación de 2 pasos");
        return;
      }

      if (password.length < 6) {
        setError("La nueva contraseña debe tener al menos 6 caracteres");
        return;
      }

      if (password !== passwordConfirmation) {
        setError("Las contraseñas no coinciden");
        return;
      }

      try {
        setLoading(true);
        const response = await resetSuperadminPasswordWithSecurityQuestionsRequest(
          email,
          answers,
          password,
          passwordConfirmation,
          requiresTwoFactor ? twoFactorCode : undefined,
        );
        showToast({
          title: "Contraseña restablecida",
          description: response?.message || "Ya puedes iniciar sesión con tu nueva contraseña",
          type: "success",
        });
        closeModal();
      } catch (err: unknown) {
        setError(getErrorMessage(err, "Error al restablecer contraseña"));
      } finally {
        setLoading(false);
      }

      return;
    }

    try {
      setLoading(true);
      const response = await forgotPasswordRequest(email);

      if (response?.recovery_type === "security_questions") {
        const receivedQuestions = response.questions || [];
        setQuestions(receivedQuestions);
        setAnswers(receivedQuestions.map(() => ""));
        setRequiresTwoFactor(Boolean(response.requires_2fa));
        return;
      }

      showToast({
        title: response?.recovery_type === "security_questions_unavailable"
          ? "Recuperación no disponible"
          : "Solicitud recibida",
        description: response?.message || "Se notificó al administrador para restablecer su contraseña",
        type: response?.recovery_type === "security_questions_unavailable" ? "warning" : "info",
      });
      closeModal();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Error al solicitar restablecimiento"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Recuperar contraseña</h3>
          <button
            onClick={closeModal}
            className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          {isSecurityQuestionStep
            ? "Responde tus preguntas de seguridad y define una nueva contraseña."
            : "Ingresa tu correo y el superadministrador podrá generar una contraseña temporal para tu acceso."}
        </p>

        {error && <div className="mb-3 text-sm text-red-600">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Correo</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isSecurityQuestionStep}
                className="w-full pl-10 pr-3 py-3 border rounded-2xl disabled:bg-gray-50"
                placeholder="tu@correo.com"
              />
            </div>
          </div>

          {isSecurityQuestionStep && (
            <>
              {questions.map((question, index) => (
                <div key={question.id} className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">{question.question}</label>
                  <input
                    value={answers[index] || ""}
                    onChange={(event) =>
                      setAnswers((current) =>
                        current.map((answer, answerIndex) =>
                          answerIndex === index ? event.target.value : answer,
                        ),
                      )
                    }
                    className="w-full px-3 py-3 border rounded-2xl"
                    autoComplete="off"
                  />
                </div>
              ))}

              {requiresTwoFactor && (
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Código de verificación 2FA</label>
                  <input
                    value={twoFactorCode}
                    onChange={(event) => setTwoFactorCode(event.target.value)}
                    className="w-full px-3 py-3 border rounded-2xl"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Nueva contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full px-3 py-3 border rounded-2xl"
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Confirmar contraseña</label>
                <input
                  type="password"
                  value={passwordConfirmation}
                  onChange={(event) => setPasswordConfirmation(event.target.value)}
                  className="w-full px-3 py-3 border rounded-2xl"
                  autoComplete="new-password"
                />
              </div>
            </>
          )}

          <div className="flex gap-3 mt-2">
            <button type="button" onClick={closeModal} className="flex-1 bg-gray-100 py-3 rounded-2xl">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white py-3 rounded-2xl">
              {loading ? "Enviando..." : isSecurityQuestionStep ? "Restablecer" : "Solicitar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
