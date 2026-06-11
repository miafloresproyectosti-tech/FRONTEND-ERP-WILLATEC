import api from "./api";

export const loginRequest = async (
    email: string, 
    password: string
) => {
    try {
        const response = await api.post("/login", { email, password });
        const { token, user } = response.data;
        
        // Extraer el rol del array de roles y convertir a mayúsculas
        const role = user.roles && user.roles.length > 0 
            ? user.roles[0].name.toUpperCase() 
            : 'VENTAS';
        
        const id = user.id;
        const last_login_at = user.last_login_at || response.data.last_login_at || null;
        // marcar si el backend exige cambio obligatorio de contraseña
        const requires_password_change = user.requires_password_change || response.data.requires_password_change || response.data.requiresPasswordChange || false;

        localStorage.setItem("token", token);
        return { token, role, id, requires_password_change, last_login_at };
    } catch (error) {
        const status = (error as { response?: { status?: number } })?.response?.status;
        console.error("Login error:", status ? `HTTP ${status}` : "request failed");
        throw new Error("Error al iniciar sesión");
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

export const changePasswordRequest = async (current_password: string, password: string, password_confirmation: string) => {
    const response = await api.post('/password/change', { current_password, password, password_confirmation });
    if (response.data?.token) {
        localStorage.setItem('token', response.data.token);
    }
    return response.data;
};
