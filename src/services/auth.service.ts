import api from "./api";

// export const loginRequest = async (
//     email: string, 
//     password: string
// ) => {
//     try {
//         const response = await api.post("/login", { email, password });
//         const { token, user } = response.data;
        
//         // Extraer el rol del array de roles y convertir a mayúsculas
//         const role = user.roles && user.roles.length > 0 
//             ? user.roles[0].name.toUpperCase() 
//             : 'VENTAS';
        
//         const id = user.id;
//         const last_login_at = user.last_login_at || response.data.last_login_at || null;
//         // marcar si el backend exige cambio obligatorio de contraseña
//         const requires_password_change = user.requires_password_change || response.data.requires_password_change || response.data.requiresPasswordChange || false;

//         localStorage.setItem("token", token);
//         return { token, role, id, requires_password_change, last_login_at };
//     } catch (error) {
//         const status = (error as { response?: { status?: number } })?.response?.status;
//         console.error("Login error:", status ? `HTTP ${status}` : "request failed");
//         throw new Error("Error al iniciar sesión");
//     }
// };

export const loginRequest = async (email: string, password: string) => {

  try {
    const response = await api.post("/login", { email, password });

    if (response.data.requires_2fa) {
      return {
        requires_2fa: true,
        login_token: response.data.login_token,
      };
    }

    const { token, user } = response.data;

    const role =
      user.roles && user.roles.length > 0
        ? user.roles[0].name.toUpperCase()
        : "VENTAS";

    const id = user.id;
    const last_login_at = user.last_login_at || response.data.last_login_at || null;
    const requires_password_change =
      user.requires_password_change ||
      response.data.requires_password_change ||
      false;

    localStorage.setItem("token", token);

    return {
      token,
      role,
      id,
      requires_password_change,
      last_login_at,
      two_factor_enabled: response.data.two_factor_enabled || false,
      requires_2fa: false,
    };
  } catch (error) {
    const response = (error as {
      response?: {
        data?: {
          message?: string;
          attempts_remaining?: number;
          must_recover_password?: boolean;
        };
      };
    }).response;
    const data = response?.data;

    throw Object.assign(
      new Error(data?.message || "Error al iniciar sesión"),
      {
        attempts_remaining: data?.attempts_remaining,
        must_recover_password: data?.must_recover_password,
      }
    );
  }
};

export const logoutRequest = async () => {
    return api.post("/logout");
};

export const meRequest = async () => {
    return api.get("/user");
};

export const forgotPasswordRequest = async (email: string) => {
    const response = await api.post('/forgot-password', { email });
    return response.data;
};

export interface SecurityQuestion {
  id: number;
  question: string;
}

export const getSuperadminSecurityQuestionsRequest = async () => {
  const response = await api.get("/superadmin/security-questions");
  return response.data as { configured: boolean; questions: SecurityQuestion[] };
};

export const updateSuperadminSecurityQuestionsRequest = async (
  current_password: string,
  questions: Array<{ answer: string }>
) => {
  const response = await api.put("/superadmin/security-questions", {
    current_password,
    questions,
  });
  return response.data as { configured: boolean; questions: SecurityQuestion[]; message?: string };
};

export const resetSuperadminPasswordWithSecurityQuestionsRequest = async (
  email: string,
  answers: string[],
  password: string,
  password_confirmation: string,
  two_factor_code?: string
) => {
  const response = await api.post("/superadmin/security-question-reset", {
    email,
    answers,
    password,
    password_confirmation,
    ...(two_factor_code ? { two_factor_code } : {}),
  });
  return response.data;
};

export const changePasswordRequest = async (current_password: string, password: string, password_confirmation: string) => {
    const response = await api.post('/password/change', { current_password, password, password_confirmation });
    if (response.data?.token) {
        localStorage.setItem('token', response.data.token);
    }
    return response.data;
};

export const twoFactorChallengeRequest = async (
  login_token: string,
  code?: string,
  recovery_code?: string
) => {
  const response = await api.post("/two-factor/challenge", {
    login_token,
    ...(code ? { code } : {}),
    ...(recovery_code ? { recovery_code } : {}),
  });

  const { token, user } = response.data;

  const role =
    user.roles && user.roles.length > 0
      ? user.roles[0].name.toUpperCase()
      : "VENTAS";

  localStorage.setItem("token", token);

  return {
    token,
    id: user.id,
    email: user.email,
    role,
    requires_password_change: response.data.requires_password_change,
    last_login_at: user.last_login_at || null,
    two_factor_enabled: true,
  };
};

export const enableTwoFactorRequest = async () => {
  return api.post("/two-factor/enable");
};

export const getTwoFactorQrRequest = async () => {
  const response = await api.get("/two-factor/qr");
  return response.data;
};

export const confirmTwoFactorRequest = async (code: string) => {
  const response = await api.post("/two-factor/confirm", { code });
  return response.data;
};

export const disableTwoFactorRequest = async (password: string) => {
  const response = await api.delete("/two-factor/disable", {
    data: { password },
  });
  return response.data;
};
