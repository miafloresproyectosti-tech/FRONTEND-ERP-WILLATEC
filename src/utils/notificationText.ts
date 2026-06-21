import type { DatabaseNotification } from "../services/notification.service";

const getCotizacionNumero = (notification: DatabaseNotification) => {
  const value = notification.data.cotizacion_numero;
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

const getActorName = (notification: DatabaseNotification) => {
  const fields = [
    notification.data.sent_by_name,
    notification.data.requested_by_name,
    notification.data.approved_by_name,
    notification.data.rejected_by_name,
    notification.data.registered_by_name,
    notification.data.issued_by_name,
  ];

  const value = fields.find((field) => typeof field === "string" && field.trim());
  return typeof value === "string" ? value.trim() : null;
};

export const getNotificationTitle = (notification: DatabaseNotification) => {
  if (notification.data.title) {
    return notification.data.title;
  }

  const action = String(notification.data.action || "");

  if (action === "enviada_revision") return "Cotizacion enviada para aprobacion";
  if (action === "aprobada") return "Cotizacion aprobada";
  if (action === "rechazada") return "Cotizacion rechazada";
  if (action === "modificacion_solicitada") return "Solicitud de modificacion";
  if (action === "modificacion_en_revision") return "Modificacion enviada a revision";
  if (action === "oc_recibida_registrada") return "OC recibida registrada";
  if (action === "oc_emitida_registrada") return "OC emitida";

  if (notification.type.includes("OcRecibidaRegistradaNotification")) {
    return "OC recibida registrada";
  }

  if (notification.type.includes("OcEmitidaRegistradaNotification")) {
    return "OC emitida";
  }

  if (notification.type.includes("PasswordResetRequestedNotification")) {
    return "Solicitud de restablecimiento";
  }

  return "Notificacion";
};

export const getNotificationDescription = (notification: DatabaseNotification) => {
  const description = notification.data.description || notification.data.message;

  if (typeof description === "string" && description.trim()) {
    return description.replace(/\s+a las\s+\d{1,2}:\d{2}(?::\d{2})?\.?$/i, ".");
  }

  const action = String(notification.data.action || "");
  const numero = getCotizacionNumero(notification);
  const actor = getActorName(notification);
  const target = numero ? `la cotizacion ${numero}` : "la cotizacion";

  if (action === "enviada_revision") {
    return actor
      ? `${actor} envio ${target} para aprobacion.`
      : `${target} fue enviada para aprobacion.`;
  }

  if (action === "aprobada") {
    return actor ? `${target} fue aprobada por ${actor}.` : `${target} fue aprobada.`;
  }

  if (action === "rechazada") {
    const reason = typeof notification.data.reason === "string" && notification.data.reason.trim()
      ? `: ${notification.data.reason.trim()}`
      : "";
    return actor ? `${target} fue rechazada por ${actor}${reason}.` : `${target} fue rechazada${reason}.`;
  }

  if (action === "modificacion_solicitada") {
    return actor
      ? `${actor} solicito modificar ${target}.`
      : `Se solicito modificar ${target}.`;
  }

  if (action === "modificacion_en_revision") {
    return actor
      ? `${actor} envio una modificacion de ${target} para revision.`
      : `Una modificacion de ${target} fue enviada para revision.`;
  }

  if (action === "oc_recibida_registrada") {
    const ocNumero = typeof notification.data.oc_recibida_numero === "string"
      ? notification.data.oc_recibida_numero
      : "OC recibida";
    return actor
      ? `${actor} registro ${ocNumero}${numero ? ` para la cotizacion ${numero}` : ""}.`
      : `${ocNumero}${numero ? ` fue registrada para la cotizacion ${numero}` : " fue registrada"}.`;
  }

  if (action === "oc_emitida_registrada") {
    const proveedor = typeof notification.data.proveedor === "string" && notification.data.proveedor.trim()
      ? ` para el proveedor ${notification.data.proveedor.trim()}`
      : "";
    const ocNumero = typeof notification.data.oc_emitida_numero === "string"
      ? notification.data.oc_emitida_numero
      : "OC emitida";
    return actor
      ? `${actor} emitio ${ocNumero}${proveedor}${numero ? ` correspondiente a la cotizacion ${numero}` : ""}.`
      : `${ocNumero}${proveedor}${numero ? ` correspondiente a la cotizacion ${numero}` : ""}.`;
  }

  return "";
};

export const getNotificationTone = (notification: DatabaseNotification) => {
  const action = String(notification.data.action || "");

  if (action === "aprobada") return "success";
  if (action === "oc_recibida_registrada" || action === "oc_emitida_registrada") return "success";
  if (
    action === "rechazada" ||
    action === "modificacion_solicitada" ||
    action === "modificacion_en_revision"
  ) {
    return "warning";
  }
  if (action === "enviada_revision") return "info";

  if (notification.type.toLowerCase().includes("password")) return "warning";

  return "info";
};
