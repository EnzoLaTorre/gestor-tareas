// ============================================================
// GestorTareas: encapsula la colección y su persistencia
// ============================================================

import { STORAGE_KEY, PRIORIDADES, generarId } from './config.js';
import { Tarea, TareaUrgente } from './Tarea.js';

export class GestorTareas {
  constructor() {
    this.tareas = [];
    this.onError = null; // callback opcional para avisar de fallos de guardado
    this.cargar();
  }

  // ---- CRUD ----
  agregar({ titulo, prioridad = 'media', categoria = 'otros', fechaLimite = null }) {
    let tarea;
    if (prioridad === 'alta') {
      tarea = new TareaUrgente({ titulo, categoria, fechaLimite });
    } else {
      tarea = new Tarea({ titulo, prioridad, categoria, fechaLimite });
    }
    this.tareas.push(tarea);
    this.guardar();
    return tarea;
  }

  eliminar(id) {
    this.tareas = this.tareas.filter((t) => t.id !== id);
    this.guardar();
  }

  editar(id, datos) {
    const indice = this.tareas.findIndex((t) => t.id === id);
    if (indice === -1) return false;

    let tarea = this.tareas[indice];
    if (datos.titulo !== undefined) tarea.titulo = datos.titulo;
    if (datos.categoria !== undefined) tarea.categoria = datos.categoria;
    if ('fechaLimite' in datos) tarea.fechaLimite = datos.fechaLimite;
    if (datos.prioridad !== undefined) {
      tarea.prioridad = datos.prioridad;
      // Mantiene coherente la herencia: alta => TareaUrgente, resto => Tarea.
      tarea = this._convertirTipo(tarea);
      this.tareas[indice] = tarea;
    }
    this.guardar();
    return true;
  }

  // Devuelve una instancia del tipo correcto según la prioridad, conservando
  // identidad, fecha de creación y estado de la tarea original.
  _convertirTipo(tarea) {
    const Clase = tarea.prioridad === 'alta' ? TareaUrgente : Tarea;
    const nueva = new Clase({
      titulo: tarea.titulo,
      prioridad: tarea.prioridad,
      categoria: tarea.categoria,
      fechaLimite: tarea.fechaLimite,
    });
    nueva.id = tarea.id;
    nueva.fechaCreacion = tarea.fechaCreacion;
    nueva.completada = tarea.completada;
    return nueva;
  }

  // Reinserta una tarea en una posición concreta (usado por "Deshacer").
  insertarEn(indice, tarea) {
    const i = Math.max(0, Math.min(indice, this.tareas.length));
    this.tareas.splice(i, 0, tarea);
    this.guardar();
  }

  // Elimina todas las completadas y devuelve [{ indice, tarea }] para deshacer.
  eliminarCompletadas() {
    const removidas = [];
    const restantes = [];
    this.tareas.forEach((t, indice) => {
      if (t.completada) removidas.push({ indice, tarea: t });
      else restantes.push(t);
    });
    if (removidas.length) {
      this.tareas = restantes;
      this.guardar();
    }
    return removidas;
  }

  // Restaura tareas eliminadas en bloque respetando sus índices originales.
  restaurarEnBloque(removidas) {
    [...removidas]
      .sort((a, b) => a.indice - b.indice)
      .forEach(({ indice, tarea }) => {
        const i = Math.max(0, Math.min(indice, this.tareas.length));
        this.tareas.splice(i, 0, tarea);
      });
    this.guardar();
  }

  toggleCompletada(id) {
    const tarea = this.tareas.find((t) => t.id === id);
    if (!tarea) return false;
    tarea.toggleCompletada();
    this.guardar();
    return true;
  }

  // ---- Consultas por estado ----
  obtenerPendientes() {
    return this.tareas.filter((t) => !t.completada);
  }

  obtenerCompletadas() {
    return this.tareas.filter((t) => t.completada);
  }

  obtenerVencidas() {
    return this.tareas.filter((t) => t.estaVencida());
  }

  // ---- Búsqueda por título (insensible a mayúsculas) ----
  buscar(texto) {
    return this.filtrar('todas', 'todas', texto);
  }

  // ---- Filtros combinados (estado + categoría + texto) ----
  filtrar(filtroEstado, categoria = 'todas', texto = '') {
    let resultado = this.tareas;

    if (filtroEstado === 'pendientes') resultado = this.obtenerPendientes();
    else if (filtroEstado === 'completadas') resultado = this.obtenerCompletadas();
    else if (filtroEstado === 'vencidas') resultado = this.obtenerVencidas();

    if (categoria !== 'todas') {
      resultado = resultado.filter((t) => t.categoria === categoria);
    }

    const q = texto.trim().toLowerCase();
    if (q) {
      resultado = resultado.filter((t) => t.titulo.toLowerCase().includes(q));
    }
    return resultado;
  }

  // ---- Ordenamiento ----
  ordenar(tareas, criterio) {
    const copia = [...tareas];
    switch (criterio) {
      case 'fecha-proxima':
        return copia.sort((a, b) => this._fechaValor(a) - this._fechaValor(b));
      case 'fecha-lejana':
        return copia.sort((a, b) => this._fechaValor(b) - this._fechaValor(a));
      case 'prioridad':
        return copia.sort((a, b) => PRIORIDADES[b.prioridad] - PRIORIDADES[a.prioridad]);
      case 'nombre-az':
        return copia.sort((a, b) => a.titulo.localeCompare(b.titulo, 'es'));
      case 'nombre-za':
        return copia.sort((a, b) => b.titulo.localeCompare(a.titulo, 'es'));
      case 'manual':
        return copia; // ya es una copia: respeta el orden en que está guardado
      case 'creacion':
      default:
        return copia.sort((a, b) => new Date(a.fechaCreacion) - new Date(b.fechaCreacion));
    }
  }

  _fechaValor(t) {
    return t.fechaLimite ? new Date(t.fechaLimite + 'T00:00:00').getTime() : Infinity;
  }

  reordenar(idsEnOrden) {
    const porId = new Map(this.tareas.map((t) => [t.id, t]));

    const reordenadas = [];
    for (const id of idsEnOrden) {
      if (porId.has(id)) {
        reordenadas.push(porId.get(id));
        porId.delete(id);
      }
    }

    this.tareas.forEach((t) => {
      if (porId.has(t.id)) reordenadas.push(t);
    });

    this.tareas = reordenadas;
    this.guardar();
  }

  // ---- Estadísticas ----
  estadisticas() {
    const total = this.tareas.length;
    const pendientes = this.obtenerPendientes().length;
    const completadas = this.obtenerCompletadas().length;
    const vencidas = this.obtenerVencidas().length;
    const prioridadAlta = this.tareas.filter((t) => t.prioridad === 'alta').length;
    const progreso = total > 0 ? Math.round((completadas / total) * 100) : 0;
    return { total, pendientes, completadas, vencidas, prioridadAlta, progreso };
  }

  // ---- Persistencia (localStorage) ----
  guardar() {
    try {
      const datos = this.tareas.map((t) => t.toJSON());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(datos));
      return true;
    } catch (e) {
      // Cuota llena, modo privado o almacenamiento bloqueado.
      if (typeof this.onError === 'function') {
        this.onError('No se pudieron guardar los cambios (almacenamiento lleno o bloqueado).');
      }
      return false;
    }
  }

  cargar() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        this.tareas = [];
        return;
      }
      const datos = JSON.parse(raw);
      if (!Array.isArray(datos)) {
        this.tareas = [];
        return;
      }
      // Reconstrucción correcta de instancias (recuperan sus métodos).
      this.tareas = datos.map((d) => Tarea.desdeJSON(d));
    } catch (e) {
      this.tareas = [];
    }
  }

  // Compatibilidad: para migrar tareas antiguas con id numérico se
  // reasignan ids, garantizando que siempre haya uno único válido.
  limpiarIdsDuplicados() {
    const vistos = new Set();
    this.tareas = this.tareas.map((t) => {
      if (!t.id || vistos.has(t.id)) {
        t.id = generarId();
      }
      vistos.add(t.id);
      return t;
    });
  }
}
