// ============================================================
// Modelo de dominio: Tarea (base) y TareaUrgente (herencia)
// ============================================================

import { generarId } from './config.js';

export class Tarea {
  constructor({ titulo, prioridad = 'media', categoria = 'otros', fechaLimite = null }) {
    this.id = generarId();
    this.titulo = titulo;
    this.prioridad = prioridad; // 'alta' | 'media' | 'baja'
    this.categoria = categoria; // 'trabajo' | 'estudio' | 'personal' | 'otros'
    this.fechaLimite = fechaLimite; // 'YYYY-MM-DD' | null
    this.fechaCreacion = new Date().toISOString();
    this.completada = false;
    this.tipo = 'normal'; // permite reconstruir la herencia
  }

  toggleCompletada() {
    this.completada = !this.completada;
    return this.completada;
  }

  // Una tarea vence solo si está pendiente y superó su fecha límite.
  estaVencida() {
    if (this.completada || !this.fechaLimite) return false;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const limite = new Date(this.fechaLimite + 'T00:00:00');
    return limite < hoy;
  }

  diasDeAtraso() {
    if (this.completada || !this.fechaLimite || !this.estaVencida()) return 0;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const limite = new Date(this.fechaLimite + 'T00:00:00');
    return Math.floor((hoy - limite) / (1000 * 60 * 60 * 24));
  }

  toJSON() {
    return {
      id: this.id,
      titulo: this.titulo,
      prioridad: this.prioridad,
      categoria: this.categoria,
      fechaLimite: this.fechaLimite,
      fechaCreacion: this.fechaCreacion,
      completada: this.completada,
      tipo: this.tipo,
    };
  }

  // Reconstruye instancias desde datos planos (recupera los métodos).
  static desdeJSON(d) {
    if (d.tipo === 'urgente') {
      const t = new TareaUrgente({ titulo: d.titulo, fechaLimite: d.fechaLimite });
      t.id = d.id;
      t.categoria = d.categoria;
      t.fechaCreacion = d.fechaCreacion;
      t.completada = d.completada;
      t.prioridad = d.prioridad;
      return t;
    }
    const t = new Tarea({
      titulo: d.titulo,
      prioridad: d.prioridad,
      categoria: d.categoria,
      fechaLimite: d.fechaLimite,
    });
    t.id = d.id;
    t.fechaCreacion = d.fechaCreacion;
    t.completada = d.completada;
    return t;
  }
}

// ============================================================
// Herencia: TareaUrgente
// Reutiliza Tarea pero refuerza la prioridad alta (polimorfismo).
// ============================================================
export class TareaUrgente extends Tarea {
  constructor(props) {
    super({ ...props, prioridad: 'alta' });
    this.tipo = 'urgente';
  }
}
