import api from "../services/api";

function getBackendBaseUrl(): string {
  const baseUrl = api.defaults.baseURL || window.location.origin;

  try {
    const url = new URL(baseUrl, window.location.origin);

    url.pathname = url.pathname
      .replace(/\/api\/?$/, "")
      .replace(/\/public\/api\/?$/, "/public");

    url.search = "";
    url.hash = "";

    return url.toString().replace(/\/$/, "");
  } catch {
    return window.location.origin;
  }
}

export function normalizeStorageImagePath(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.startsWith("data:")) return value;

  const cleanValue = value.trim().replace(/\\/g, "/");
  const extractPath = (path: string) => {
    const cleanPath = path.replace(/^\/+/, "");
    const storageMatch = cleanPath.match(/(?:^|\/)(?:storage\/app\/public|public\/storage|storage)\/(.+)$/);
    return storageMatch?.[1] || cleanPath;
  };

  try {
    const url = new URL(cleanValue);
    return extractPath(url.pathname);
  } catch {
    return extractPath(cleanValue);
  }
}

export function normalizeStorageImageUrl(value: string | null | undefined): string {
  if (!value) return "";
  if (value.startsWith("data:")) return value;

  const path = normalizeStorageImagePath(value);
  if (!path) return "";

  return `${getBackendBaseUrl()}/storage/${path.replace(/^\/+/, "")}`;
}

// Usa imagen_url si existe (ya viene completa del backend),
// si no, construye la URL desde la ruta relativa
export function resolveItemImageUrl(
  imagen_url?: string | null,
  imagen?: string | null
): string {
  if (imagen_url) return imagen_url;
  return normalizeStorageImageUrl(imagen);
}