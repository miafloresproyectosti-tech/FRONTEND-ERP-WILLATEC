export interface PlantillaDescriptor {
  nombre?: string | null;
  formato_pdf?: string | null;
  codigo_moneda?: string | null;
}

const normalizeDescriptor = (plantilla?: PlantillaDescriptor | null) =>
  [
    plantilla?.nombre,
    plantilla?.formato_pdf,
    plantilla?.codigo_moneda,
  ]
    .filter(Boolean)
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();

export const isPlantillaAlquiler = (plantilla?: PlantillaDescriptor | null) => {
  const descriptor = normalizeDescriptor(plantilla);

  if (!descriptor) return false;

  return (
    descriptor.includes("ALQUILER") ||
    (descriptor.includes("GSD") &&
      (descriptor.includes("ESTADO") || descriptor.includes("PRIVADO")))
  );
};

export const getPlantillaDisplayName = (plantilla: PlantillaDescriptor) => {
  const nombre = plantilla.nombre || "";
  const descriptor = normalizeDescriptor(plantilla);

  if (!descriptor.includes("GSD")) return nombre;
  if (descriptor.includes("ESTADO")) return "ALQUILER ESTADO";
  if (descriptor.includes("PRIVADO")) return "ALQUILER PRIVADO";

  return nombre;
};
