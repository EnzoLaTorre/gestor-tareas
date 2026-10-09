// ============================================================
// Configuración y utilidades compartidas
// ============================================================

export const STORAGE_KEY = 'gestor-tareas-v2-tasks';
export const THEME_KEY = 'gestor-tareas-v2-theme';

// ---------- Constantes de dominio ----------
export const PRIORIDADES = { alta: 3, media: 2, baja: 1 };

// ---------- Utilidad: generador de id único ----------
// crypto.randomUUID() solo está disponible en contextos seguros (https/localhost).
// Para que funcione también en otros contextos, se usa un fallback que siempre
// genera un valor único.
export function generarId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
