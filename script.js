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
    this.criterioOrden = 'manual';
    this.busqueda = '';
    this.editandoId = null;
    this._drag = null; // objeto con el estado del arrastre en curso

    this._onMouseMove = (e) => this._manejarMove(e, false);
    this._onMouseUp = () => this._finalizarDrag();
    this._onTouchMove = (e) => this._manejarMove(e, true);
    this._onTouchEnd = () => this._finalizarDrag();
    this._onTouchCancel = () => this._cancelarDrag();
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

    this.themeToggle = document.getElementById('theme-toggle');
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

    this.themeToggle.addEventListener('change', () => this._alternarTema());

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
    // Delegación del arrastre: mouse y táctil manejan sus propios eventos
    // (un solo listener sobre la lista, aunque el HTML se re-renderice).
    this.taskList.addEventListener('mousedown', (e) => this._iniciarDrag(e, false));
    this.taskList.addEventListener('touchstart', (e) => this._iniciarDrag(e, true), { passive: true });
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

  // ---- Arrastrar y soltar (mouse + táctil) ----
  // Doble vía: mousedown/mousemove/mouseup en escritorio y
  // touchstart/touchmove/touchend en móvil. El táctil no usa Pointer Events
  // porque el navegador se apodera del gesto para hacer scroll (pointercancel).
  // La clave: solo se previene el scroll cuando el drag ya está activo.
  _iniciarDrag(e, esTouch) {
    // No robar los clics de botones ni del checkbox.
    if (e.target.closest('button, .checkbox, input')) return;

    const item = e.target.closest('.task-item');
    if (!item) return;

    const y = esTouch ? e.touches[0].clientY : e.clientY;

    this._drag = {
      item,
      esTouch,
      startY: y,
      activo: false,
      holdTimer: null,
    };

    // Táctil: "mantener presionado" activa el arrastre; si el dedo se mueve
    // antes de completar el hold, es un scroll normal y se cancela.
    if (esTouch) {
      this._drag.holdTimer = setTimeout(() => {
        if (!this._drag) return;
        this._drag.activo = true;
        this._activarDrag(this._drag.item);
      }, 350);
    }

    // Bloquea la selección de texto del conjunto (también el callout de iOS).
    this.taskList.classList.add('is-dragging');

    // touchmove debe ser no-pasivo para poder llamar a preventDefault().
    window.addEventListener('touchmove', this._onTouchMove, { passive: false });
    window.addEventListener('touchend', this._onTouchEnd);
    window.addEventListener('touchcancel', this._onTouchCancel);
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('mouseup', this._onMouseUp);
  }

  _activarDrag(item) {
    item.classList.add('dragging');
    item.style.touchAction = 'none'; // refuerza el bloqueo de scroll mientras arrastras
  }

  _manejarMove(e, esTouch) {
    if (!this._drag || this._drag.esTouch !== esTouch) return;
    const drag = this._drag;
    const y = esTouch ? e.touches[0].clientY : e.clientY;

    if (!drag.activo) {
      const distancia = Math.abs(y - drag.startY);
      if (esTouch) {
        // El dedo se movió antes del hold: scroll normal, se cancela el intento.
        if (distancia > 12) this._cancelarDrag();
        return;
      }
      if (distancia < 5) return; // umbral en mouse: evita arrancar con un clic
      drag.activo = true;
      this._activarDrag(drag.item);
    }

    // Solo al arrastrar se frena la página: así el navegador entrega todos
    // los touchmove en lugar de robárselos para el scroll a mitad de gesto.
    if (esTouch) e.preventDefault();

    const lista = this.taskList;
    const resto = [...lista.querySelectorAll('.task-item:not(.dragging)')];

    // Lugar de inserción: la mitad vertical de cada tarjeta decide "antes de cuál".
    let insertarAntes = null;
    for (const otro of resto) {
      const r = otro.getBoundingClientRect();
      if (y < r.top + r.height / 2) {
        insertarAntes = otro;
        break;
      }
    }

    // Marca la tarjeta destino (indicador visual) y mueve el DOM en vivo.
    lista.querySelectorAll('.drag-over').forEach((el) => el.classList.remove('drag-over'));
    if (insertarAntes) insertarAntes.classList.add('drag-over');

    this._moverConFLIP(lista, drag.item, insertarAntes);
  }

  // FLIP: First / Last / Invert / Play. Anima las tarjetas no arrastradas
  // para que "cedan" su espacio deslizándose en lugar de saltar de golpe.
  _moverConFLIP(lista, dragged, insertarAntes) {
    const items = [...lista.querySelectorAll('.task-item:not(.dragging)')];
    const antes = new Map();

    items.forEach((it) => antes.set(it, it.getBoundingClientRect().top));
    lista.insertBefore(dragged, insertarAntes);

    // Invert: coloca cada tarjeta donde estaba antes del movimiento.
    items.forEach((it) => {
      const delta = antes.get(it) - it.getBoundingClientRect().top;
      if (!delta) return;
      it.style.transition = 'none';
      it.style.transform = `translateY(${delta}px)`;
    });

    // Fuerza el layout para que el navegador aplique la posición invertida.
    void lista.offsetHeight;

    // Play: se quita el transform y la transición hace el deslizamiento.
    items.forEach((it) => {
      it.style.transition = 'transform 0.18s ease';
      it.style.transform = '';
    });
  }

  _finalizarDrag() {
    if (!this._drag) return;
    const drag = this._drag;

    drag.item.classList.remove('dragging', 'drag-over');
    drag.item.style.touchAction = '';

    // Sin arrastre real (un simple clic/tap): solo limpiar, sin re-render.
    if (!drag.activo) {
      this._limpiarDrag();
      return;
    }

    // El orden final del DOM ES el nuevo orden: lo persistimos en la colección.
    const orden = [...this.taskList.querySelectorAll('.task-item')].map((li) => li.dataset.id);
    this.gestor.reordenar(orden);
    this.criterioOrden = 'manual';
    this.sortOptions.value = 'manual';

    this._limpiarDrag();
    this.render();
  }

  _cancelarDrag() {
    if (!this._drag) return;
    const item = this._drag.item;
    const estabaActivo = this._drag.activo;
    item.classList.remove('dragging', 'drag-over');
    item.style.touchAction = '';
    this._limpiarDrag();
    // Solo re-renderiza si el DOM ya se estaba moviendo en vivo.
    if (estabaActivo) this.render();
  }

  _limpiarDrag() {
    if (this._drag && this._drag.holdTimer) clearTimeout(this._drag.holdTimer);
    this._drag = null;
    this.taskList.classList.remove('is-dragging');
    window.removeEventListener('touchmove', this._onTouchMove);
    window.removeEventListener('touchend', this._onTouchEnd);
    window.removeEventListener('touchcancel', this._onTouchCancel);
    window.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('mouseup', this._onMouseUp);
  }

  // ---- Tema (dark / light) ----
  _aplicarTemaGuardado() {
    const guardado = localStorage.getItem(THEME_KEY);
    const tema = guardado === 'light' ? 'light' : 'dark';
    document.documentElement.dataset.theme = tema;
    this.themeToggle.checked = tema === 'light';
  }

  _alternarTema() {
    const raiz = document.documentElement;
    const actual = raiz.dataset.theme;
    const nuevo = actual === 'dark' ? 'light' : 'dark';

    // Desactiva transiciones temporalmente para que el cambio de tema sea
    // instantáneo (evita la animación lenta/el repintado costoso en móvil).
    raiz.classList.add('theme-transition-disabled');
    raiz.dataset.theme = nuevo;
    localStorage.setItem(THEME_KEY, nuevo);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        raiz.classList.remove('theme-transition-disabled');
      });
    });
  }
}

// ============================================================
// Inicialización
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  new UI();
  iniciarBienvenida();
});

// ============================================================
// MEPOOL · Pantalla de bienvenida
// ============================================================
function iniciarBienvenida() {
  const screen = document.getElementById('welcome-screen');
  if (!screen) return;

  let terminada = false;

  const ocultar = () => {
    if (terminada) return;
    terminada = true;
    screen.classList.add('is-revealing');
    // pausa para que el flash pegue su pico y luego desvanecer la bienvenida
    requestAnimationFrame(() => {
      setTimeout(() => {
        screen.classList.add('is-hidden');
        // al terminar la transición, liberar el DOM
        const liberar = () => screen.remove();
        if (screen.parentElement) {
          screen.addEventListener('transitionend', () => screen.remove(), { once: true });
          setTimeout(liberar, 1600); // respaldo por si transitionend no dispara
        }
      }, 320);
    });
  };

  // Disparador determinista: el flash y la transición salen siempre igual,
  // en PC y móvil, sin depender de prefers-reduced-motion.
  setTimeout(ocultar, 5200);
}

