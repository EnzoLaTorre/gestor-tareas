// ============================================================
// Gestor de Tareas v2 · POO en JavaScript puro
// Arquitectura:
//   - Tarea (base) y TareaUrgente (herencia / polimorfismo)
//   - GestorTareas (encapsula: CRUD, filtros, orden, persistencia)
//   - UI (controla el DOM y la interacción)
// ============================================================

const STORAGE_KEY = 'gestor-tareas-v2-tasks';
const THEME_KEY = 'gestor-tareas-v2-theme';

// ---------- Constantes de dominio ----------
const PRIORIDADES = { alta: 3, media: 2, baja: 1 };

// ---------- Utilidad: generador de id único ----------
// crypto.randomUUID() solo está disponible en contextos seguros (https/localhost).
// Para que funcione también abriendo el archivo con file://, se usa un fallback
// que siempre genera un valor único.
function generarId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ============================================================
// Clase base: Tarea
// ============================================================
class Tarea {
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
class TareaUrgente extends Tarea {
  constructor(props) {
    super({ ...props, prioridad: 'alta' });
    this.tipo = 'urgente';
  }
}

// ============================================================
// GestorTareas: encapsula la colección y su persistencia
// ============================================================
class GestorTareas {
  constructor() {
    this.tareas = [];
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
    const tarea = this.tareas.find((t) => t.id === id);
    if (!tarea) return false;
    if (datos.titulo !== undefined) tarea.titulo = datos.titulo;
    if (datos.prioridad !== undefined) tarea.prioridad = datos.prioridad;
    if (datos.categoria !== undefined) tarea.categoria = datos.categoria;
    if ('fechaLimite' in datos) tarea.fechaLimite = datos.fechaLimite;
    this.guardar();
    return true;
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
    const q = texto.trim().toLowerCase();
    if (!q) return this.tareas;
    return this.tareas.filter((t) => t.titulo.toLowerCase().includes(q));
  }

  // ---- Filtros combinados (estado + categoría) ----
  filtrar(filtroEstado, categoria = 'todas') {
    let resultado = this.tareas;

    if (filtroEstado === 'pendientes') resultado = this.obtenerPendientes();
    else if (filtroEstado === 'completadas') resultado = this.obtenerCompletadas();
    else if (filtroEstado === 'vencidas') resultado = this.obtenerVencidas();

    if (categoria !== 'todas') {
      resultado = resultado.filter((t) => t.categoria === categoria);
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
      case 'creacion':
      default:
        return copia.sort((a, b) => new Date(a.fechaCreacion) - new Date(b.fechaCreacion));
    }
  }

  _fechaValor(t) {
    return t.fechaLimite ? new Date(t.fechaLimite + 'T00:00:00').getTime() : Infinity;
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
    const datos = this.tareas.map((t) => t.toJSON());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(datos));
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

// ============================================================
// UI: controla el DOM, eventos y renderizado
// ============================================================
class UI {
  constructor() {
    this.gestor = new GestorTareas();
    this.gestor.limpiarIdsDuplicados();
    this.gestor.guardar();

    this.filtroEstado = 'todas';
    this.categoriaFiltro = 'todas';
    this.criterioOrden = 'creacion';
    this.busqueda = '';
    this.editandoId = null;

    this._cacheElementos();
    this._aplicarTemaGuardado();
    this._bindEventos();
    this.render();
  }

  _cacheElementos() {
    this.form = document.getElementById('taskForm');
    this.titleInput = document.getElementById('task-title');
    this.prioritySelect = document.getElementById('task-priority');
    this.categorySelect = document.getElementById('task-category');
    this.dateInput = document.getElementById('task-date');
    this.submitBtn = document.getElementById('submitBtn');
    this.cancelEditBtn = document.getElementById('cancelEditBtn');
    this.formTitle = document.getElementById('formTitle');

    this.searchInput = document.getElementById('task-search');
    this.filterCategory = document.getElementById('filter-category');
    this.sortOptions = document.getElementById('sort-options');

    this.taskList = document.getElementById('taskList');
    this.emptyNoTasks = document.getElementById('emptyNoTasks');
    this.emptyNoResults = document.getElementById('emptyNoResults');

    this.statTotal = document.getElementById('statTotal');
    this.statPendientes = document.getElementById('statPendientes');
    this.statCompletadas = document.getElementById('statCompletadas');
    this.statVencidas = document.getElementById('statVencidas');
    this.statAlta = document.getElementById('statAlta');
    this.progressPct = document.getElementById('progressPct');
    this.progressFill = document.getElementById('progressFill');

    this.themeToggle = document.getElementById('themeToggle');
    this.filterButtons = document.querySelectorAll('.filter-btn');

    this.editModal = document.getElementById('editModal');
    this.editForm = document.getElementById('editForm');
    this.editTitle = document.getElementById('edit-title');
    this.editPriority = document.getElementById('edit-priority');
    this.editCategory = document.getElementById('edit-category');
    this.editDate = document.getElementById('edit-date');
    this.editModalClose = document.getElementById('editModalClose');
    this.editModalCancel = document.getElementById('editModalCancel');
  }

  _bindEventos() {
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this._manejarEnvioFormulario();
    });
    this.cancelEditBtn.addEventListener('click', () => this._salirDeEdicion());

    this.searchInput.addEventListener('input', (e) => {
      this.busqueda = e.target.value;
      this.render();
    });

    this.filterCategory.addEventListener('change', (e) => {
      this.categoriaFiltro = e.target.value;
      this.render();
    });

    this.sortOptions.addEventListener('change', (e) => {
      this.criterioOrden = e.target.value;
      this.render();
    });

    this.filterButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.filterButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.filtroEstado = btn.dataset.filter;
        this.render();
      });
    });

    this.themeToggle.addEventListener('click', () => this._alternarTema());

    // Modal de edición
    this.editModalClose.addEventListener('click', () => this._cerrarModal());
    this.editModalCancel.addEventListener('click', () => this._cerrarModal());
    this.editForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this._manejarGuardarEdicion();
    });
    this.editModal.addEventListener('click', (e) => {
      if (e.target === this.editModal) this._cerrarModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.editModal.hidden) this._cerrarModal();
    });
  }

  // ---- Crear / Editar tarea ----
  _manejarEnvioFormulario() {
    if (this.editandoId) {
      this._guardarEdicionDesdeForm();
      return;
    }

    const titulo = this.titleInput.value.trim();
    const errorEl = this.form.querySelector('[data-error-for="title"]');

    if (!this._validarTitulo(titulo, this.titleInput, errorEl)) return;

    this.gestor.agregar({
      titulo,
      prioridad: this.prioritySelect.value,
      categoria: this.categorySelect.value,
      fechaLimite: this.dateInput.value || null,
    });

    this.form.reset();
    this.prioritySelect.value = 'media';
    this.categorySelect.value = 'estudio';
    this.render();
    this.titleInput.focus();
  }

  _guardarEdicionDesdeForm() {
    const titulo = this.titleInput.value.trim();
    const errorEl = this.form.querySelector('[data-error-for="title"]');
    if (!this._validarTitulo(titulo, this.titleInput, errorEl)) return;

    this.gestor.editar(this.editandoId, {
      titulo,
      prioridad: this.prioritySelect.value,
      categoria: this.categorySelect.value,
      fechaLimite: this.dateInput.value || null,
    });
    this._salirDeEdicion();
    this.render();
    this.titleInput.focus();
  }

  _salirDeEdicion() {
    this.editandoId = null;
    this.formTitle.textContent = 'Nueva tarea';
    this.submitBtn.textContent = 'Agregar tarea';
    this.cancelEditBtn.classList.add('hidden');
    this._limpiarErroresForm();
  }

  // ---- Edición desde tarjeta (modal) ----
  _abrirModalEdicion(tarea) {
    this.editTitle.value = tarea.titulo;
    this.editPriority.value = tarea.prioridad;
    this.editCategory.value = tarea.categoria;
    this.editDate.value = tarea.fechaLimite || '';
    this._editandoIdModal = tarea.id;
    this.editModal.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => this.editTitle.focus(), 50);
  }

  _cerrarModal() {
    this.editModal.hidden = true;
    this._editandoIdModal = null;
    document.body.style.overflow = '';
  }

  _manejarGuardarEdicion() {
    const titulo = this.editTitle.value.trim();
    const errorEl = this.editForm.querySelector('[data-error-for="edit-title"]');
    if (!this._validarTitulo(titulo, this.editTitle, errorEl)) return;

    this.gestor.editar(this._editandoIdModal, {
      titulo,
      prioridad: this.editPriority.value,
      categoria: this.editCategory.value,
      fechaLimite: this.editDate.value || null,
    });
    this._cerrarModal();
    this.render();
  }

  // ---- Validación ----
  _validarTitulo(titulo, input, errorEl) {
    const field = input.closest('.field');
    if (!titulo) {
      field.classList.add('invalid');
      errorEl.textContent = 'El título no puede estar vacío.';
      return false;
    }
    if (titulo.length < 3) {
      field.classList.add('invalid');
      errorEl.textContent = 'El título debe tener al menos 3 caracteres.';
      return false;
    }
    field.classList.remove('invalid');
    errorEl.textContent = '';
    return true;
  }

  _limpiarErroresForm() {
    this.form.querySelectorAll('.field.invalid').forEach((f) => f.classList.remove('invalid'));
    this.form.querySelectorAll('.error').forEach((e) => (e.textContent = ''));
  }

  // ---- Render principal ----
  // Pipeline: filtrar por estado+categoría → buscar por título → ordenar
  render() {
    const tareas = this._obtenerTareasVisibles();
    this._renderEstadisticas();
    this._renderTareas(tareas);
  }

  _obtenerTareasVisibles() {
    let tareas = this.gestor.filtrar(this.filtroEstado, this.categoriaFiltro);
    if (this.busqueda.trim()) {
      const q = this.busqueda.trim().toLowerCase();
      tareas = tareas.filter((t) => t.titulo.toLowerCase().includes(q));
    }
    return this.gestor.ordenar(tareas, this.criterioOrden);
  }

  _renderEstadisticas() {
    const e = this.gestor.estadisticas();
    this.statTotal.textContent = e.total;
    this.statPendientes.textContent = e.pendientes;
    this.statCompletadas.textContent = e.completadas;
    this.statVencidas.textContent = e.vencidas;
    this.statAlta.textContent = e.prioridadAlta;
    this.progressPct.textContent = `${e.progreso}%`;
    this.progressFill.style.width = `${e.progreso}%`;
  }

  _renderTareas(tareas) {
    const hayFiltros = this.filtroEstado !== 'todas' || this.categoriaFiltro !== 'todas' || this.busqueda.trim();

    if (tareas.length === 0) {
      this.taskList.innerHTML = '';
      const sinNada = this.gestor.tareas.length === 0 && !hayFiltros;
      this.emptyNoTasks.classList.toggle('active', sinNada);
      this.emptyNoResults.classList.toggle('active', !sinNada);
      return;
    }

    this.emptyNoTasks.classList.remove('active');
    this.emptyNoResults.classList.remove('active');
    this.taskList.innerHTML = tareas.map((t) => this._tareaHTML(t)).join('');
    this._bindTareaEventos(tareas);
  }

  _tareaHTML(tarea) {
    const completada = tarea.completada;
    const vencida = tarea.estaVencida();

    const fechaTexto = tarea.fechaLimite
      ? new Date(tarea.fechaLimite + 'T00:00:00').toLocaleDateString('es-ES')
      : null;

    const badgeVencida = vencida
      ? `<span class="overdue-badge">🚨 ${vencida ? `Vencida hace ${tarea.diasDeAtraso()} día${tarea.diasDeAtraso() === 1 ? '' : 's'}` : 'Vencida'}</span>`
      : '';

    const urgente = tarea.tipo === 'urgente'
      ? '<span class="task-urgent-flag">URGENTE</span>'
      : '';

    const etiquetaCat = tarea.categoria.charAt(0).toUpperCase() + tarea.categoria.slice(1);

    return `
      <li class="task-item p-${tarea.prioridad} ${completada ? 'completed' : ''} ${vencida ? 'overdue' : ''}"
          data-id="${tarea.id}">
        <input type="checkbox" class="checkbox" ${completada ? 'checked' : ''} aria-label="Completar tarea">
        <div class="task-body">
          <div class="task-text">${this._escapar(tarea.titulo)}${urgente}</div>
          <div class="task-meta">
            <span class="meta-chip prio">
              <span class="prio-dot ${tarea.prioridad}"></span>
              <span class="prio-label ${tarea.prioridad}">${tarea.prioridad}</span>
            </span>
            ${tarea.categoria ? `<span class="cat-chip">${etiquetaCat}</span>` : ''}
            ${fechaTexto ? `<span class="meta-chip date">📅 ${fechaTexto}</span>` : ''}
            ${badgeVencida}
          </div>
        </div>
        <div class="task-actions">
          <button class="task-icon-btn edit" aria-label="Editar tarea">✏️</button>
          <button class="task-icon-btn delete" aria-label="Eliminar tarea">×</button>
        </div>
      </li>
    `;
  }

  _escapar(texto) {
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
  }

  _bindTareaEventos(tareas) {
    const items = this.taskList.querySelectorAll('.task-item');

    items.forEach((item) => {
      const id = item.dataset.id;
      const tarea = tareas.find((t) => t.id === id);
      const checkbox = item.querySelector('.checkbox');
      const editBtn = item.querySelector('.edit');
      const deleteBtn = item.querySelector('.delete');

      if (tarea) {
        checkbox.addEventListener('change', () => {
          this.gestor.toggleCompletada(id);
          item.classList.add('checking');
          setTimeout(() => this.render(), 180);
        });

        editBtn.addEventListener('click', () => this._abrirModalEdicion(tarea));

        deleteBtn.addEventListener('click', () => {
          item.classList.add('removing');
          setTimeout(() => {
            this.gestor.eliminar(id);
            this.render();
          }, 250);
        });
      }
    });
  }

  // ---- Tema (dark / light) ----
  _aplicarTemaGuardado() {
    const guardado = localStorage.getItem(THEME_KEY);
    const tema = guardado === 'light' ? 'light' : 'dark';
    document.body.dataset.theme = tema;
  }

  _alternarTema() {
    const actual = document.body.dataset.theme;
    const nuevo = actual === 'dark' ? 'light' : 'dark';
    document.body.dataset.theme = nuevo;
    localStorage.setItem(THEME_KEY, nuevo);
  }
}

// ============================================================
// Inicialización
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  new UI();
});
