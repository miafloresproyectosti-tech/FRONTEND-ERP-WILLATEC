import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api",
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
},

    (error) => {
        return Promise.reject(error);
    });

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const currentPath = window.location.pathname;

        const isAuthFlow =
            currentPath === "/login" ||
            currentPath === "/two-factor" ||
            currentPath === "/change-password";

        if (error?.response?.status === 401 && !isAuthFlow) {
            localStorage.removeItem("user");
            localStorage.removeItem("token");
            window.location.assign("/login");
        }

        return Promise.reject(error);
    }
);

export default api;
