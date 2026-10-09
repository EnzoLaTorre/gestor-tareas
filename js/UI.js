// ============================================================
// UI: controla el DOM, eventos y renderizado
// ============================================================

import { THEME_KEY } from './config.js';
import { Tarea } from './Tarea.js';
import { GestorTareas } from './GestorTareas.js';

export class UI {
  constructor() {
    this.gestor = new GestorTareas();
    this.gestor.limpiarIdsDuplicados();
    this.gestor.guardar();

    this.filtroEstado = 'todas';
    this.categoriaFiltro = 'todas';
    this.criterioOrden = 'manual';
    this.busqueda = '';
    this.editandoId = null;
    this._editandoIdModal = null;
    this._ultimoFoco = null;
    this._toastTimer = null;
    this._drag = null; // objeto con el estado del arrastre en curso

    this._onMouseMove = (e) => this._manejarMove(e, false);
    this._onMouseUp = () => this._finalizarDrag();
    this._onTouchMove = (e) => this._manejarMove(e, true);
    this._onTouchEnd = () => this._finalizarDrag();
    this._onTouchCancel = () => this._cancelarDrag();
    this._cacheElementos();
    this.gestor.onError = (msg) => this._mostrarToast(msg);
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

    this.clearCompletedBtn = document.getElementById('clearCompletedBtn');
    this.exportBtn = document.getElementById('exportBtn');
    this.importBtn = document.getElementById('importBtn');
    this.importFile = document.getElementById('importFile');
    this.remindersBtn = document.getElementById('remindersBtn');

    this.toast = document.getElementById('toast');
    this.toastMsg = document.getElementById('toastMsg');
    this.toastAction = document.getElementById('toastAction');
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
        this.filterButtons.forEach((b) => {
          b.classList.remove('active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
        this.filtroEstado = btn.dataset.filter;
        this.render();
      });
    });

    this.themeToggle.addEventListener('change', () => this._alternarTema());

    // Acciones de la lista
    this.clearCompletedBtn.addEventListener('click', () => this._limpiarCompletadas());
    this.exportBtn.addEventListener('click', () => this._exportarJSON());
    this.importBtn.addEventListener('click', () => this.importFile.click());
    this.importFile.addEventListener('change', (e) => this._importarJSON(e));
    this.remindersBtn.addEventListener('click', () => this._activarRecordatorios());
    this.toastAction.addEventListener('click', () => {
      if (typeof this._toastAccion === 'function') this._toastAccion();
    });

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
      if (this.editModal.hidden) return;
      if (e.key === 'Escape') {
        this._cerrarModal();
      } else if (e.key === 'Tab') {
        this._atraparFoco(e);
      }
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

    const fechaLimite = this.dateInput.value || null;
    this.gestor.agregar({
      titulo,
      prioridad: this.prioritySelect.value,
      categoria: this.categorySelect.value,
      fechaLimite,
    });

    this.form.reset();
    this.prioritySelect.value = 'media';
    this.categorySelect.value = 'estudio';
    this.render();
    this.titleInput.focus();
    this._advertirFechaPasada(fechaLimite);
  }

  _guardarEdicionDesdeForm() {
    const titulo = this.titleInput.value.trim();
    const errorEl = this.form.querySelector('[data-error-for="title"]');
    if (!this._validarTitulo(titulo, this.titleInput, errorEl)) return;

    const fechaLimite = this.dateInput.value || null;
    this.gestor.editar(this.editandoId, {
      titulo,
      prioridad: this.prioritySelect.value,
      categoria: this.categorySelect.value,
      fechaLimite,
    });
    this._salirDeEdicion();
    this.render();
    this.titleInput.focus();
    this._advertirFechaPasada(fechaLimite);
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
    this._ultimoFoco = document.activeElement;
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
    // Devuelve el foco al elemento que abrió el modal.
    if (this._ultimoFoco && typeof this._ultimoFoco.focus === 'function') {
      this._ultimoFoco.focus();
    }
    this._ultimoFoco = null;
  }

  // Mantiene el foco dentro del modal mientras está abierto.
  _atraparFoco(e) {
    const focusables = this.editModal.querySelectorAll(
      'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'
    );
    const visibles = [...focusables].filter((el) => !el.hidden && el.offsetParent !== null);
    if (!visibles.length) return;

    const primero = visibles[0];
    const ultimo = visibles[visibles.length - 1];
    const activo = document.activeElement;

    if (e.shiftKey && activo === primero) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && activo === ultimo) {
      e.preventDefault();
      primero.focus();
    }
  }

  _manejarGuardarEdicion() {
    const titulo = this.editTitle.value.trim();
    const errorEl = this.editForm.querySelector('[data-error-for="edit-title"]');
    if (!this._validarTitulo(titulo, this.editTitle, errorEl)) return;

    const fechaLimite = this.editDate.value || null;
    this.gestor.editar(this._editandoIdModal, {
      titulo,
      prioridad: this.editPriority.value,
      categoria: this.editCategory.value,
      fechaLimite,
    });
    this._cerrarModal();
    this.render();
    this._advertirFechaPasada(fechaLimite);
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
    const tareas = this.gestor.filtrar(this.filtroEstado, this.categoriaFiltro, this.busqueda);
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
    const accionCheckbox = completada ? 'Marcar como pendiente' : 'Marcar como completada';

    return `
      <li class="task-item p-${tarea.prioridad} ${completada ? 'completed' : ''} ${vencida ? 'overdue' : ''}"
          data-id="${tarea.id}" tabindex="0"
          aria-label="${this._escaparAtributo(tarea.titulo)}. Usa Alt+flechas para reordenar.">
        <input type="checkbox" class="checkbox" ${completada ? 'checked' : ''}
               aria-label="${accionCheckbox}: ${this._escaparAtributo(tarea.titulo)}">
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
          <button class="task-icon-btn edit" aria-label="Editar ${this._escaparAtributo(tarea.titulo)}">✏️</button>
          <button class="task-icon-btn delete" aria-label="Eliminar ${this._escaparAtributo(tarea.titulo)}">×</button>
        </div>
      </li>
    `;
  }

  _escapar(texto) {
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
  }

  // Escapa también las comillas para poder usar el texto dentro de atributos.
  _escaparAtributo(texto) {
    return this._escapar(String(texto)).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
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

        // Reordena con el teclado (Alt + flechas) cuando el orden es manual.
        item.addEventListener('keydown', (e) => {
          if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
          e.preventDefault();
          this._moverConTeclado(id, e.key === 'ArrowUp' ? -1 : 1);
        });

        deleteBtn.addEventListener('click', () => {
          const indice = this.gestor.tareas.findIndex((t) => t.id === id);
          const eliminada = this.gestor.tareas[indice];
          item.classList.add('removing');
          setTimeout(() => {
            this.gestor.eliminar(id);
            this.render();
            this._mostrarToast(`"${eliminada.titulo}" eliminada`, {
              texto: 'Deshacer',
              onClick: () => {
                this.gestor.insertarEn(indice, eliminada);
                this.render();
                this._ocultarToast();
              },
            });
          }, 250);
        });
      }
    });
  }

  // Mueve una tarea una posición arriba/abajo en el orden manual.
  _moverConTeclado(id, delta) {
    const ids = this.gestor.tareas.map((t) => t.id);
    const i = ids.indexOf(id);
    const j = i + delta;
    if (i === -1 || j < 0 || j >= ids.length) return;

    [ids[i], ids[j]] = [ids[j], ids[i]];
    this.gestor.reordenar(ids);
    this.criterioOrden = 'manual';
    this.sortOptions.value = 'manual';
    this.render();

    const movida = this.taskList.querySelector(`.task-item[data-id="${id}"]`);
    if (movida) movida.focus();
  }

  // ---- Toast (avisos + deshacer) ----
  _mostrarToast(mensaje, accion = null) {
    this.toastMsg.textContent = mensaje;
    if (accion && accion.texto && typeof accion.onClick === 'function') {
      this.toastAction.textContent = accion.texto;
      this.toastAction.hidden = false;
      this._toastAccion = accion.onClick;
    } else {
      this.toastAction.hidden = true;
      this._toastAccion = null;
    }
    this.toast.hidden = false;
    requestAnimationFrame(() => this.toast.classList.add('is-visible'));

    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => this._ocultarToast(), 5000);
  }

  _ocultarToast() {
    clearTimeout(this._toastTimer);
    this.toast.classList.remove('is-visible');
    this._toastAccion = null;
    this._toastTimer = setTimeout(() => {
      this.toast.hidden = true;
    }, 250);
  }

  // ---- Exportar / Importar ----
  _exportarJSON() {
    const datos = this.gestor.tareas.map((t) => t.toJSON());
    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const fecha = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `mepool-tareas-${fecha}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    this._mostrarToast(`${datos.length} tarea(s) exportada(s).`);
  }

  _importarJSON(e) {
    const archivo = e.target.files && e.target.files[0];
    e.target.value = ''; // permite volver a elegir el mismo archivo
    if (!archivo) return;

    const lector = new FileReader();
    lector.onload = () => {
      try {
        const datos = JSON.parse(lector.result);
        if (!Array.isArray(datos)) throw new Error('formato');
        const importadas = datos
          .filter((d) => d && typeof d.titulo === 'string' && d.titulo.trim())
          .map((d) => Tarea.desdeJSON(d));
        if (!importadas.length) throw new Error('vacío');

        const reemplazar =
          this.gestor.tareas.length === 0 ||
          confirm(`Se importarán ${importadas.length} tarea(s) y se reemplazarán las actuales. ¿Continuar?`);
        if (!reemplazar) return;

        this.gestor.tareas = importadas;
        this.gestor.limpiarIdsDuplicados();
        this.gestor.guardar();
        this.render();
        this._mostrarToast(`${importadas.length} tarea(s) importada(s).`);
      } catch (err) {
        this._mostrarToast('El archivo no es un JSON de tareas válido.');
      }
    };
    lector.readAsText(archivo);
  }

  // ---- Limpiar completadas ----
  _limpiarCompletadas() {
    const removidas = this.gestor.eliminarCompletadas();
    if (!removidas.length) {
      this._mostrarToast('No hay tareas completadas para limpiar.');
      return;
    }
    this.render();
    this._mostrarToast(`${removidas.length} tarea(s) completada(s) eliminada(s).`, {
      texto: 'Deshacer',
      onClick: () => {
        this.gestor.restaurarEnBloque(removidas);
        this.render();
        this._ocultarToast();
      },
    });
  }

  // ---- Recordatorios (Notification API) ----
  _activarRecordatorios() {
    if (typeof Notification === 'undefined') {
      this._mostrarToast('Tu navegador no soporta notificaciones.');
      return;
    }
    const notificar = () => {
      const vencidas = this.gestor.obtenerVencidas();
      if (!vencidas.length) {
        this._mostrarToast('No tienes tareas vencidas. Todo en orden.');
        return;
      }
      const cuerpo = vencidas
        .slice(0, 5)
        .map((t) => `• ${t.titulo} (vencida hace ${t.diasDeAtraso()} día(s))`)
        .join('\n');
      new Notification('MEPOOL · Tareas vencidas', {
        body: `${vencidas.length} tarea(s) vencida(s):\n${cuerpo}`,
      });
      this._mostrarToast(`Recordatorio enviado: ${vencidas.length} tarea(s) vencida(s).`);
    };

    if (Notification.permission === 'granted') notificar();
    else if (Notification.permission === 'denied') {
      this._mostrarToast('Las notificaciones están bloqueadas en el navegador.');
    } else {
      Notification.requestPermission().then((permiso) => {
        if (permiso === 'granted') notificar();
        else this._mostrarToast('No se activaron los recordatorios.');
      });
    }
  }

  // ---- Aviso de fecha límite ya pasada (no bloquea) ----
  _advertirFechaPasada(fechaLimite) {
    if (!fechaLimite) return;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const limite = new Date(fechaLimite + 'T00:00:00');
    if (limite < hoy) this._mostrarToast('Atención: la fecha límite ya pasó.');
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
