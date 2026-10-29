import axios from "axios";

export const SYSTEM_STATUS_EVENT = "erp:system-status";

const notifySystemStatus = (kind: "maintenance" | "server-error", status?: number) => {
    window.dispatchEvent(new CustomEvent(SYSTEM_STATUS_EVENT, {
        detail: { kind, status },
    }));
};

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
    (response) => {
        const contentType = String(response.headers?.["content-type"] || "").toLowerCase();
        const looksLikeMaintenancePage = typeof response.data === "string"
            && (contentType.includes("text/html") || /<!doctype\s+html|<html[\s>]/i.test(response.data));

        if (looksLikeMaintenancePage) {
            notifySystemStatus("maintenance", response.status);
            return Promise.reject(new Error("El sistema se encuentra en mantenimiento."));
        }

        return response;
    },
    (error) => {
        const currentPath = window.location.pathname;
        const status = error?.response?.status;
        const contentType = String(error?.response?.headers?.["content-type"] || "").toLowerCase();
        const responseData = error?.response?.data;
        const looksLikeMaintenancePage = typeof responseData === "string"
            && (contentType.includes("text/html") || /<!doctype\s+html|<html[\s>]/i.test(responseData));

        if (looksLikeMaintenancePage || status === 503) {
            notifySystemStatus("maintenance", status);
        } else if (status === 500 || status === 502 || status === 504) {
            notifySystemStatus("server-error", status);
        }

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
