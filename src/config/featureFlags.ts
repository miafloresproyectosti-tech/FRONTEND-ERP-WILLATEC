const enabledByDefault = (value: unknown): boolean => value !== "false";

export const featureFlags = {
  soporteTi: enabledByDefault(import.meta.env.VITE_SHOW_SOPORTE_TI),
  controlAdm: enabledByDefault(import.meta.env.VITE_SHOW_CONTROL_ADM),
};
