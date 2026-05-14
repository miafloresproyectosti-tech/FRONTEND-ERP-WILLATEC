import api from "./api";

// export const loginRequest = async (
//     email: string, 
//     password: string
// ) => {
//     try {
//         const response = await api.post("/auth/login", { email, password });
//         const { token, role } = response.data;
//         localStorage.setItem("token", token);
//         return { token, role };
//     } catch (error) {
//         console.error("Login error:", error);
//         throw new Error("Error al iniciar sesión");
//     }
// };

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
        
        localStorage.setItem("token", token);
        return { token, role };
    } catch (error) {
        console.error("Login error:", error);
        throw new Error("Error al iniciar sesión");
    }
};

export const logoutRequest = async () => {
    return api.post("/logout");
};

export const meRequest = async () => {
    return api.get("/user");
};
