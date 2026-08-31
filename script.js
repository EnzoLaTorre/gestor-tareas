// ============================================================
// Gestor de Tareas con POO en JavaScript puro
// Demuestra: clases, encapsulamiento, herencia y persistencia.
// ============================================================

// Base de datos simulada con localStorage
const STORAGE_KEY = 'gestor-tareas-tasks';

let nextId = 1;

// ---------- Clase base: Task ----------
class Task {
  constructor(titulo, prioridad = 'media', fechaLimite = null) {
    this.id = Task.getNextId();
    this.titulo = titulo;
    this.prioridad = prioridad; // 'alta' | 'media' | 'baja'
    this.fechaLimite = fechaLimite;
    this.completada = false;
    this.creadaEn = new Date().toLocaleDateString('es-ES');
    this.tipo = 'normal';
  }

  static getNextId() {
    return nextId++;
  }

  toggleComplete() {
    this.completada = !this.completada;
    return this.completada;
  }

  getMeta() {
    return {
      prioridad: this.prioridad,
      fechaLimite: this.fechaLimite,
      creadaEn: this.creadaEn,
    };
  }
}

// ---------- Herencia: UrgentTask ----------
// Subclase que extiende Task y agrega una marca especial (polimorfismo).
class UrgentTask extends Task {
  constructor(titulo, fechaLimite = null) {
    super(titulo, 'alta', fechaLimite);
    this.tipo = 'urgente';
  }

  getMeta() {
    return {
      ...super.getMeta(),
      urgente: true,
    };
  }
}

// ---------- TaskManager: encapsula la colección de tareas ----------
class TaskManager {
  constructor() {
    this.tasks = [];
    this.load();
  }

  addTask(titulo, prioridad = 'media', fechaLimite = null) {
    let task;
    // Polimorfismo: si la prioridad es alta, se crea una UrgentTask.
    if (prioridad === 'alta') {
      task = new UrgentTask(titulo, fechaLimite);
    } else {
      task = new Task(titulo, prioridad, fechaLimite);
    }
    this.tasks.push(task);
    this.save();
    return task;
  }

  deleteTask(id) {
    this.tasks = this.tasks.filter((t) => t.id !== id);
    this.save();
  }

  toggleTask(id) {
    const task = this.tasks.find((t) => t.id === id);
    if (task) {
      task.toggleComplete();
      this.save();
    }
  }

  getPendingCount() {
    return this.tasks.filter((t) => !t.completada).length;
  }

  getFiltered(filter) {
    if (filter === 'pendientes') return this.tasks.filter((t) => !t.completada);
    if (filter === 'completadas') return this.tasks.filter((t) => t.completada);
    return this.tasks;
  }

  // Persistencia en localStorage
  save() {
    const data = this.tasks.map((t) => ({
      id: t.id,
      titulo: t.titulo,
      prioridad: t.prioridad,
      fechaLimite: t.fechaLimite,
      completada: t.completada,
      creadaEn: t.creadaEn,
      tipo: t.tipo,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      this.tasks = data.map((d) => {
        // Se respeta la herencia al recargar: tareas urgentes vuelven como UrgentTask.
        if (d.tipo === 'urgente') {
          const t = new UrgentTask(d.titulo, d.fechaLimite);
          t.id = d.id;
          t.completada = d.completada;
          t.creadaEn = d.creadaEn;
          t.prioridad = d.prioridad;
          return t;
        }
        const t = new Task(d.titulo, d.prioridad, d.fechaLimite);
        t.id = d.id;
        t.completada = d.completada;
        t.creadaEn = d.creadaEn;
        return t;
      });
      if (this.tasks.length) {
        nextId = Math.max(...this.tasks.map((t) => t.id)) + 1;
      }
    } catch (e) {
      this.tasks = [];
    }
  }
}

// ---------- UI: controla el DOM ----------
class UI {
  constructor() {
    this.manager = new TaskManager();
    this.currentFilter = 'todas';

    this.form = document.getElementById('taskForm');
    this.titleInput = document.getElementById('task-title');
    this.prioritySelect = document.getElementById('task-priority');
    this.dateInput = document.getElementById('task-date');
    this.taskList = document.getElementById('taskList');
    this.emptyState = document.getElementById('emptyState');
    this.pendingCount = document.getElementById('pendingCount');
    this.filterButtons = document.querySelectorAll('.filter-btn');

    this.bindEvents();
    this.render();
  }

  bindEvents() {
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });

    this.filterButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.filterButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentFilter = btn.dataset.filter;
        this.render();
      });
    });
  }

  handleSubmit() {
    const titulo = this.titleInput.value.trim();

    // Validación
    const errorEl = document.querySelector('[data-error-for="title"]');
    if (titulo.length < 3) {
      this.titleInput.closest('.field').classList.add('invalid');
      errorEl.textContent = 'El título debe tener al menos 3 caracteres.';
      return;
    }
    this.titleInput.closest('.field').classList.remove('invalid');
    errorEl.textContent = '';

    const prioridad = this.prioritySelect.value;
    const fecha = this.dateInput.value || null;

    this.manager.addTask(titulo, prioridad, fecha);
    this.form.reset();
    this.prioritySelect.value = 'media';
    this.render();
    this.titleInput.focus();
  }

  render() {
    const tasks = this.manager.getFiltered(this.currentFilter);

    this.pendingCount.textContent = this.manager.getPendingCount();

    if (!tasks.length) {
      this.taskList.innerHTML = '';
      this.emptyState.classList.remove('hidden');
      this.emptyState.textContent =
        this.currentFilter === 'todas'
          ? 'No hay tareas. ¡Agrega una arriba!'
          : `No hay tareas ${this.currentFilter}.`;
      return;
    }

    this.emptyState.classList.add('hidden');
    this.taskList.innerHTML = tasks.map((task) => this.taskItemHTML(task)).join('');
    this.bindTaskEvents(tasks);
  }

  taskItemHTML(task) {
    const meta = task.getMeta();
    const dateText = meta.fechaLimite
      ? `<span class="date">📍 ${new Date(meta.fechaLimite).toLocaleDateString('es-ES')}</span>`
      : '';

    // Polimorfismo en acción: las UrgentTask muestran una marca extra.
    const urgentFlag = task.tipo === 'urgente'
      ? '<span class="task-urgent-flag">URGENTE</span>'
      : '';

    return `
      <li class="task-item p-${task.prioridad} ${task.completada ? 'completed' : ''}" data-id="${task.id}">
        <input type="checkbox" class="checkbox" ${task.completada ? 'checked' : ''} aria-label="Completar tarea">
        <div class="task-body">
          <div class="task-text">${task.titulo}${urgentFlag}</div>
          <div class="task-meta">
            <span class="prio ${task.prioridad}">prioridad ${task.prioridad}</span>
            ${dateText}
            <span class="date">creada ${task.creadaEn}</span>
          </div>
        </div>
        <button class="task-delete" aria-label="Eliminar tarea">×</button>
      </li>
    `;
  }

  bindTaskEvents(tasks) {
    const items = this.taskList.querySelectorAll('.task-item');

    items.forEach((item) => {
      const id = Number(item.dataset.id);
      const checkbox = item.querySelector('.checkbox');
      const deleteBtn = item.querySelector('.task-delete');

      checkbox.addEventListener('change', () => {
        this.manager.toggleTask(id);
        this.render();
      });

      deleteBtn.addEventListener('click', () => {
        this.manager.deleteTask(id);
        this.render();
      });
    });
  }
}

// ---------- Inicialización ----------
document.addEventListener('DOMContentLoaded', () => {
  new UI();
});
