// ============================================================
// Gestor de Tareas v2 · POO en JavaScript puro
// Arquitectura:
//   - Tarea (base) y TareaUrgente (herencia / polimorfismo)
//   - GestorTareas (encapsula: CRUD, filtros, orden, persistencia)
//   - UI (controla el DOM y la interacción)
// ============================================================

// Clave de localStorage donde se guarda y recupera la lista de tareas
const STORAGE_KEY = 'gestor-tareas-v2-tasks';
// Clave de localStorage donde se guarda el tema (claro/oscuro) elegido por el usuario
const THEME_KEY = 'gestor-tareas-v2-theme';

// ---------- Constantes de dominio ----------
// Tabla de pesos para cada nivel de prioridad (alta tiene más valor que baja);
// se usa en el ordenamiento por prioridad para comparar tareas
const PRIORIDADES = { alta: 3, media: 2, baja: 1 };

// ---------- Utilidad: generador de id único ----------
// crypto.randomUUID() solo está disponible en contextos seguros (https/localhost).
// Para que funcione también abriendo el archivo con file://, se usa un fallback
// que siempre genera un valor único.
// Genera un identificador único para cada tarea
function generarId() {
  // Comprueba si el navegador dispone de crypto y de la función randomUUID
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    // Devuelve un UUID estándar único del navegador
    return crypto.randomUUID();
  }
  // Fallback: combina la fecha (en base 36) con un número aleatorio para crear un id único
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ============================================================
// Clase base: Tarea
// ============================================================
class Tarea {
  // Constructor: recibe un objeto con los datos de la tarea y asigna valores por defecto
  constructor({ titulo, prioridad = 'media', categoria = 'otros', fechaLimite = null }) {
    // Asigna un id único generado automáticamente
    this.id = generarId();
    // Guarda el título que escribió el usuario
    this.titulo = titulo;
    // Guarda la prioridad de la tarea: 'alta' | 'media' | 'baja'
    this.prioridad = prioridad; // 'alta' | 'media' | 'baja'
    // Guarda la categoría a la que pertenece: 'trabajo' | 'estudio' | 'personal' | 'otros'
    this.categoria = categoria; // 'trabajo' | 'estudio' | 'personal' | 'otros'
    // Guarda la fecha límite en formato 'YYYY-MM-DD', o null si no tiene
    this.fechaLimite = fechaLimite; // 'YYYY-MM-DD' | null
    // Registra el momento exacto en que se creó la tarea (fecha y hora en formato ISO)
    this.fechaCreacion = new Date().toISOString();
    // Al principio la tarea nunca está completada
    this.completada = false;
    // Marca el tipo ('normal') para poder reconstruir la herencia al cargar desde localStorage
    this.tipo = 'normal'; // permite reconstruir la herencia
  }

  // Alterna el estado completado/pendiente de la tarea
  toggleCompletada() {
    // Invierte el valor actual: de false pasa a true, y viceversa
    this.completada = !this.completada;
    // Devuelve el nuevo estado para que quien llama sepa si quedó completada
    return this.completada;
  }

  // Una tarea vence solo si está pendiente y superó su fecha límite.
  // Devuelve true si la tarea está vencida
  estaVencida() {
    // Si está completada o no tiene fecha límite, nunca se considera vencida
    if (this.completada || !this.fechaLimite) return false;
    // Obtiene la fecha de hoy
    const hoy = new Date();
    // Pone la hora de "hoy" a medianoche para comparar solo por día (ignora la hora actual)
    hoy.setHours(0, 0, 0, 0);
    // Convierte la fecha límite (string) a un objeto Date al inicio del día
    const limite = new Date(this.fechaLimite + 'T00:00:00');
    // La tarea está vencida si la fecha límite es anterior a hoy
    return limite < hoy;
  }

  // Devuelve cuántos días lleva de retraso la tarea (0 si no está vencida)
  diasDeAtraso() {
    // Si está completada, no tiene fecha límite o no está vencida, no hay retraso
    if (this.completada || !this.fechaLimite || !this.estaVencida()) return 0;
    // Obtiene la fecha de hoy
    const hoy = new Date();
    // Ajusta hoy a medianoche para que la resta se haga solo por días
    hoy.setHours(0, 0, 0, 0);
    // Convierte la fecha límite a objeto Date al inicio del día
    const limite = new Date(this.fechaLimite + 'T00:00:00');
    // Resta las fechas (en milisegundos) y divide para obtener los días exactos de retraso
    return Math.floor((hoy - limite) / (1000 * 60 * 60 * 24));
  }

  // Convierte la tarea en un objeto plano para poder guardarla en localStorage
  toJSON() {
    // Devuelve un objeto con todas las propiedades de la tarea en formato serializable
    return {
      id: this.id, // el id único
      titulo: this.titulo, // el título
      prioridad: this.prioridad, // la prioridad
      categoria: this.categoria, // la categoría
      fechaLimite: this.fechaLimite, // la fecha límite
      fechaCreacion: this.fechaCreacion, // la fecha de creación
      completada: this.completada, // si está completada
      tipo: this.tipo, // el tipo, para saber si es tarea normal o urgente
    };
  }

  // Reconstruye instancias desde datos planos (recupera los métodos).
  // Crea una instancia de Tarea (o TareaUrgente) a partir de un objeto plano guardado
  static desdeJSON(d) {
    // Comprueba si la tarea guardada era de tipo 'urgente'
    if (d.tipo === 'urgente') {
      // Crea una nueva TareaUrgente con el título y la fecha límite guardados
      const t = new TareaUrgente({ titulo: d.titulo, fechaLimite: d.fechaLimite });
      // Restaura el id original guardado
      t.id = d.id;
      // Restaura la categoría original guardada
      t.categoria = d.categoria;
      // Restaura la fecha de creación original guardada
      t.fechaCreacion = d.fechaCreacion;
      // Restaura si estaba completada o no
      t.completada = d.completada;
      // Restaura la prioridad original guardada
      t.prioridad = d.prioridad;
      // Devuelve la tarea urgente reconstruida con sus métodos
      return t;
    }
    // Crea una nueva Tarea normal con todos los datos guardados
    const t = new Tarea({
      titulo: d.titulo, // el título guardado
      prioridad: d.prioridad, // la prioridad guardada
      categoria: d.categoria, // la categoría guardada
      fechaLimite: d.fechaLimite, // la fecha límite guardada
    });
    // Restaura el id original guardado
    t.id = d.id;
    // Restaura la fecha de creación original guardada
    t.fechaCreacion = d.fechaCreacion;
    // Restaura si estaba completada o no
    t.completada = d.completada;
    // Devuelve la tarea normal reconstruida con sus métodos
    return t;
  }
}

// ============================================================
// Herencia: TareaUrgente
// Reutiliza Tarea pero refuerza la prioridad alta (polimorfismo).
// ============================================================
class TareaUrgente extends Tarea {
  // Constructor de la tarea urgente, hereda de Tarea
  constructor(props) {
    // Llama al constructor de la clase padre forzando siempre la prioridad 'alta'
    super({ ...props, prioridad: 'alta' });
    // Cambia el tipo a 'urgente' para distinguirla de la tarea normal
    this.tipo = 'urgente';
  }
}

// ============================================================
// GestorTareas: encapsula la colección y su persistencia
// ============================================================
class GestorTareas {
  // Constructor: prepara la colección de tareas
  constructor() {
    // Inicializa la lista de tareas como vacía
    this.tareas = [];
    // Carga las tareas que ya estaban guardadas en localStorage
    this.cargar();
  }

  // ---- CRUD ----
  // Añade una nueva tarea a la colección
  agregar({ titulo, prioridad = 'media', categoria = 'otros', fechaLimite = null }) {
    // Variable que guardará la tarea creada (normal o urgente)
    let tarea;
    // Comprueba si la prioridad elegida es 'alta'
    if (prioridad === 'alta') {
      // Crea una TareaUrgente, que ya fuerza prioridad alta
      tarea = new TareaUrgente({ titulo, categoria, fechaLimite });
    } else {
      // Crea una Tarea normal con la prioridad, categoría y fecha indicadas
      tarea = new Tarea({ titulo, prioridad, categoria, fechaLimite });
    }
    // Agrega la tarea nueva al final de la lista
    this.tareas.push(tarea);
    // Guarda la lista actualizada en localStorage
    this.guardar();
    // Devuelve la tarea recién creada por si se necesita
    return tarea;
  }

  // Elimina una tarea de la colección por su id
  eliminar(id) {
    // Filtra la lista quedándose con todas las tareas cuyo id sea distinto al buscado
    this.tareas = this.tareas.filter((t) => t.id !== id);
    // Guarda la lista actualizada en localStorage
    this.guardar();
  }

  // Edita los datos de una tarea existente
  editar(id, datos) {
    // Busca la tarea que tenga ese id dentro de la lista
    const tarea = this.tareas.find((t) => t.id === id);
    // Si no existe la tarea, devuelve false para indicar que no se pudo editar
    if (!tarea) return false;
    // Si el objeto datos trae un nuevo título, lo asigna a la tarea
    if (datos.titulo !== undefined) tarea.titulo = datos.titulo;
    // Si trae una nueva prioridad, la asigna a la tarea
    if (datos.prioridad !== undefined) tarea.prioridad = datos.prioridad;
    // Si trae una nueva categoría, la asigna a la tarea
    if (datos.categoria !== undefined) tarea.categoria = datos.categoria;
    // Si la propiedad fechaLimite está presente (aunque sea null), la asigna
    if ('fechaLimite' in datos) tarea.fechaLimite = datos.fechaLimite;
    // Guarda los cambios en localStorage
    this.guardar();
    // Devuelve true para indicar que la edición fue exitosa
    return true;
  }

  // Alterna el estado completado/pendiente de una tarea por su id
  toggleCompletada(id) {
    // Busca la tarea que tenga ese id
    const tarea = this.tareas.find((t) => t.id === id);
    // Si no existe, devuelve false
    if (!tarea) return false;
    // Llama al método de la tarea que invierte su estado completado
    tarea.toggleCompletada();
    // Guarda el cambio en localStorage
    this.guardar();
    // Devuelve true para indicar que la operación fue exitosa
    return true;
  }

  // ---- Consultas por estado ----
  // Devuelve solo las tareas que aún no están completadas
  obtenerPendientes() {
    // Filtra la lista quedándose con las tareas donde completada sea false
    return this.tareas.filter((t) => !t.completada);
  }

  // Devuelve solo las tareas que ya están completadas
  obtenerCompletadas() {
    // Filtra la lista quedándose con las tareas donde completada sea true
    return this.tareas.filter((t) => t.completada);
  }

  // Devuelve solo las tareas que están vencidas
  obtenerVencidas() {
    // Filtra las tareas usando el método estaVencida de cada una
    return this.tareas.filter((t) => t.estaVencida());
  }

  // ---- Búsqueda por título (insensible a mayúsculas) ----
  // Filtra las tareas cuyo título contenga el texto buscado
  buscar(texto) {
    // Limpia espacios y convierte el texto a minúsculas para comparar sin distinguir mayúsculas
    const q = texto.trim().toLowerCase();
    // Si el texto está vacío, devuelve todas las tareas (no filtra nada)
    if (!q) return this.tareas;
    // Devuelve las tareas cuyo título (en minúsculas) contenga el texto buscado
    return this.tareas.filter((t) => t.titulo.toLowerCase().includes(q));
  }

  // ---- Filtros combinados (estado + categoría) ----
  // Aplica un filtro por estado y opcionalmente por categoría
  filtrar(filtroEstado, categoria = 'todas') {
    // Empieza usando todas las tareas como base
    let resultado = this.tareas;

    // Si el filtro es 'pendientes', se queda solo con las pendientes
    if (filtroEstado === 'pendientes') resultado = this.obtenerPendientes();
    // Si el filtro es 'completadas', se queda solo con las completadas
    else if (filtroEstado === 'completadas') resultado = this.obtenerCompletadas();
    // Si el filtro es 'vencidas', se queda solo con las vencidas
    else if (filtroEstado === 'vencidas') resultado = this.obtenerVencidas();

    // Si se eligió una categoría concreta (distinta de 'todas')
    if (categoria !== 'todas') {
      // Filtra el resultado anterior quedándose solo con las tareas de esa categoría
      resultado = resultado.filter((t) => t.categoria === categoria);
    }
    // Devuelve la lista ya filtrada
    return resultado;
  }

  // ---- Ordenamiento ----
  // Ordena una lista de tareas según el criterio elegido
  ordenar(tareas, criterio) {
    // Crea una copia del arreglo para no modificar la lista original
    const copia = [...tareas];
    // Decide qué orden aplicar según el criterio recibido
    switch (criterio) {
      case 'fecha-proxima': // ordenar por la fecha límite más cercana primero
        // Ordena de menor a mayor valor de fecha (las más próximas primero)
        return copia.sort((a, b) => this._fechaValor(a) - this._fechaValor(b));
      case 'fecha-lejana': // ordenar por la fecha límite más lejana primero
        // Ordena de mayor a menor valor de fecha (las más lejanas primero)
        return copia.sort((a, b) => this._fechaValor(b) - this._fechaValor(a));
      case 'prioridad': // ordenar por nivel de prioridad
        // Ordena usando el peso de cada prioridad, de mayor a menor
        return copia.sort((a, b) => PRIORIDADES[b.prioridad] - PRIORIDADES[a.prioridad]);
      case 'nombre-az': // ordenar por título de forma alfabética ascendente
        // Compara los títulos en español de la A a la Z
        return copia.sort((a, b) => a.titulo.localeCompare(b.titulo, 'es'));
      case 'nombre-za': // ordenar por título de forma alfabética descendente
        // Compara los títulos en español de la Z a la A
        return copia.sort((a, b) => b.titulo.localeCompare(a.titulo, 'es'));
      case 'manual': // ordenar según el orden guardado (arrastre manual)
        return copia; // ya es una copia: respeta el orden en que está guardado
      case 'creacion': // ordenar por fecha de creación
      default: // cualquier otro caso usa el mismo criterio
        // Ordena de menor a mayor fecha de creación
        return copia.sort((a, b) => new Date(a.fechaCreacion) - new Date(b.fechaCreacion));
    }
  }

  // Devuelve el valor numérico (timestamp) de la fecha límite de una tarea
  _fechaValor(t) {
    // Si hay fecha límite devuelve su timestamp; si no, devuelve Infinity para que quede al final
    return t.fechaLimite ? new Date(t.fechaLimite + 'T00:00:00').getTime() : Infinity;
  }

  // Reordena la colección según una lista de ids dada (usada tras arrastrar)
  reordenar(idsEnOrden) {
    // Crea un mapa que asocia cada id con su tarea para buscarla rápido
    const porId = new Map(this.tareas.map((t) => [t.id, t]));

    // Lista donde se irá construyendo el nuevo orden
    const reordenadas = [];
    // Recorre los ids en el orden indicado por el usuario
    for (const id of idsEnOrden) {
      // Si ese id existe en el mapa
      if (porId.has(id)) {
        // Agrega la tarea correspondiente al nuevo orden
        reordenadas.push(porId.get(id));
        // La saca del mapa para no duplicarla más adelante
        porId.delete(id);
      }
    }

    // Recorre las tareas originales para añadir las que no estaban en la lista de ids
    this.tareas.forEach((t) => {
      // Si la tarea sigue en el mapa (no se incluyó antes), se agrega al final
      if (porId.has(t.id)) reordenadas.push(t);
    });

    // Reemplaza la lista original por la nueva lista ya reordenada
    this.tareas = reordenadas;
    // Guarda el nuevo orden en localStorage
    this.guardar();
  }
  // ---- Estadísticas ----
  // Calcula un resumen de números sobre todas las tareas
  estadisticas() {
    // Cuenta el total de tareas
    const total = this.tareas.length;
    // Cuenta cuántas están pendientes
    const pendientes = this.obtenerPendientes().length;
    // Cuenta cuántas están completadas
    const completadas = this.obtenerCompletadas().length;
    // Cuenta cuántas están vencidas
    const vencidas = this.obtenerVencidas().length;
    // Cuenta cuántas tienen prioridad alta
    const prioridadAlta = this.tareas.filter((t) => t.prioridad === 'alta').length;
    // Calcula el porcentaje de progreso: completadas sobre el total (y evita dividir entre cero)
    const progreso = total > 0 ? Math.round((completadas / total) * 100) : 0;
    // Devuelve un objeto con todas las estadísticas calculadas
    return { total, pendientes, completadas, vencidas, prioridadAlta, progreso };
  }

  // ---- Persistencia (localStorage) ----
  // Guarda la lista actual de tareas en localStorage
  guardar() {
    // Convierte cada tarea a su versión plana (objeto) con toJSON
    const datos = this.tareas.map((t) => t.toJSON());
    // Serializa a texto JSON y lo guarda con la clave de almacenamiento
    localStorage.setItem(STORAGE_KEY, JSON.stringify(datos));
  }

  // Carga las tareas guardadas desde localStorage al iniciar
  cargar() {
    // Envuelve en try/catch para no romper la app si hay datos corruptos
    try {
      // Obtiene el texto JSON guardado
      const raw = localStorage.getItem(STORAGE_KEY);
      // Si no hay nada guardado todavía
      if (!raw) {
        // Deja la lista vacía
        this.tareas = [];
        // Termina la carga sin hacer nada más
        return;
      }
      // Convierte el texto JSON de vuelta a un arreglo de objetos
      const datos = JSON.parse(raw);
      // Comprueba que el resultado sea efectivamente un arreglo
      if (!Array.isArray(datos)) {
        // Si no es un arreglo, deja la lista vacía
        this.tareas = [];
        // Termina la carga
        return;
      }
      // Reconstrucción correcta de instancias (recuperan sus métodos).
      // Convierte cada objeto plano de vuelta a una instancia Tarea/TareaUrgente
      this.tareas = datos.map((d) => Tarea.desdeJSON(d));
    } catch (e) {
      // Si ocurre cualquier error al cargar, deja la lista vacía para evitar fallos
      this.tareas = [];
    }
  }

  // Compatibilidad: para migrar tareas antiguas con id numérico se
  // reasignan ids, garantizando que siempre haya uno único válido.
  // Corrige ids duplicados o vacíos que puedan existir por migraciones antiguas
  limpiarIdsDuplicados() {
    // Set para recordar qué ids ya se han visto
    const vistos = new Set();
    // Recorre la lista y, por cada tarea...
    this.tareas = this.tareas.map((t) => {
      // ...si la tarea no tiene id o su id ya existía antes
      if (!t.id || vistos.has(t.id)) {
        // La asigna un id nuevo y único
        t.id = generarId();
      }
      // Registra el id (el actual) como ya visto
      vistos.add(t.id);
      // Devuelve la tarea (posiblemente con el id corregido)
      return t;
    });
  }
}

// ============================================================
// UI: controla el DOM, eventos y renderizado
// ============================================================
class UI {
  // Constructor: prepara toda la interfaz al cargar la aplicación
  constructor() {
    // Crea el gestor que maneja las tareas (carga las guardadas automáticamente)
    this.gestor = new GestorTareas();
    // Corrige posibles ids duplicados o vacíos de versiones antiguas
    this.gestor.limpiarIdsDuplicados();
    // Guarda de nuevo la lista ya saneada en localStorage
    this.gestor.guardar();

    // Filtro de estado actual: 'todas' | 'pendientes' | 'completadas' | 'vencidas'
    this.filtroEstado = 'todas';
    // Filtro de categoría actual: 'todas' o una categoría concreta
    this.categoriaFiltro = 'todas';
    // Criterio de orden actual (empieza en 'manual', el orden guardado)
    this.criterioOrden = 'manual';
    // Texto de búsqueda actual (vacío por defecto)
    this.busqueda = '';
    // Id de la tarea que se está editando desde el formulario principal (null = no editando)
    this.editandoId = null;
    // Objeto con el estado del arrastre en curso (o null si no hay arrastre)
    this._drag = null; // objeto con el estado del arrastre en curso

    // Guarda una referencia al manejador de movimiento con ratón (para poder quitarlo luego)
    this._onMouseMove = (e) => this._manejarMove(e, false);
    // Guarda la referencia al manejador de soltar el botón del ratón
    this._onMouseUp = () => this._finalizarDrag();
    // Guarda la referencia al manejador de movimiento del dedo en pantalla táctil
    this._onTouchMove = (e) => this._manejarMove(e, true);
    // Guarda la referencia al manejador de levantar el dedo en pantalla táctil
    this._onTouchEnd = () => this._finalizarDrag();
    // Guarda la referencia al manejador de cancelar el toque (por ejemplo si el navegador roba el gesto)
    this._onTouchCancel = () => this._cancelarDrag();
    // Guarda en referencias los elementos del DOM que se usarán con frecuencia
    this._cacheElementos();
    // Aplica el tema (claro/oscuro) que el usuario tenía guardado
    this._aplicarTemaGuardado();
    // Conecta todos los eventos (clics, envíos, cambios, etc.) con sus manejadores
    this._bindEventos();
    // Dibuja la lista de tareas y las estadísticas por primera vez
    this.render();
  }

  // Guarda en propiedades del objeto las referencias a los elementos del DOM
  _cacheElementos() {
    // Formulario para crear/editar tareas
    this.form = document.getElementById('taskForm');
    // Campo de texto donde se escribe el título de la tarea
    this.titleInput = document.getElementById('task-title');
    // Selector desplegable de prioridad
    this.prioritySelect = document.getElementById('task-priority');
    // Selector desplegable de categoría
    this.categorySelect = document.getElementById('task-category');
    // Campo de fecha límite
    this.dateInput = document.getElementById('task-date');
    // Botón para enviar el formulario
    this.submitBtn = document.getElementById('submitBtn');
    // Botón para cancelar la edición
    this.cancelEditBtn = document.getElementById('cancelEditBtn');
    // Título del formulario (cambia entre 'Nueva tarea' y 'Editar tarea')
    this.formTitle = document.getElementById('formTitle');

    // Campo de búsqueda de tareas
    this.searchInput = document.getElementById('task-search');
    // Selector de filtro por categoría
    this.filterCategory = document.getElementById('filter-category');
    // Selector de opciones de ordenamiento
    this.sortOptions = document.getElementById('sort-options');

    // Contenedor donde se dibujan las tarjetas de tareas
    this.taskList = document.getElementById('taskList');
    // Mensaje que aparece cuando no hay ninguna tarea
    this.emptyNoTasks = document.getElementById('emptyNoTasks');
    // Mensaje que aparece cuando el filtro/búsqueda no arroja resultados
    this.emptyNoResults = document.getElementById('emptyNoResults');

    // Elementos donde se muestran las estadísticas (números)
    this.statTotal = document.getElementById('statTotal');
    this.statPendientes = document.getElementById('statPendientes');
    this.statCompletadas = document.getElementById('statCompletadas');
    this.statVencidas = document.getElementById('statVencidas');
    this.statAlta = document.getElementById('statAlta');
    // Elemento de texto con el porcentaje de progreso
    this.progressPct = document.getElementById('progressPct');
    // Barra que se rellena según el progreso
    this.progressFill = document.getElementById('progressFill');

    // Interruptor que cambia entre tema claro y oscuro
    this.themeToggle = document.getElementById('theme-toggle');
    // Todos los botones que filtran por estado (Todas, Pendientes, etc.)
    this.filterButtons = document.querySelectorAll('.filter-btn');

    // Modal (ventana emergente) para editar una tarea
    this.editModal = document.getElementById('editModal');
    // Formulario dentro del modal de edición
    this.editForm = document.getElementById('editForm');
    // Campo de título dentro del modal
    this.editTitle = document.getElementById('edit-title');
    // Campo de prioridad dentro del modal
    this.editPriority = document.getElementById('edit-priority');
    // Campo de categoría dentro del modal
    this.editCategory = document.getElementById('edit-category');
    // Campo de fecha dentro del modal
    this.editDate = document.getElementById('edit-date');
    // Botón para cerrar el modal
    this.editModalClose = document.getElementById('editModalClose');
    // Botón para cancelar la edición desde el modal
    this.editModalCancel = document.getElementById('editModalCancel');
  }

  // Conecta los eventos de los elementos con sus funciones manejadoras
  _bindEventos() {
    // Al enviar el formulario principal de tareas
    this.form.addEventListener('submit', (e) => {
      // Evita que la página se recargue al enviar el formulario
      e.preventDefault();
      // Llama al método que decide si crear o editar la tarea
      this._manejarEnvioFormulario();
    });
    // Al hacer clic en "cancelar edición" sale del modo edición
    this.cancelEditBtn.addEventListener('click', () => this._salirDeEdicion());

    // Mientras el usuario escribe en el campo de búsqueda
    this.searchInput.addEventListener('input', (e) => {
      // Guarda el texto escrito como texto de búsqueda
      this.busqueda = e.target.value;
      // Redibuja la lista para aplicar la búsqueda en vivo
      this.render();
    });

    // Al cambiar el filtro de categoría
    this.filterCategory.addEventListener('change', (e) => {
      // Guarda la categoría elegida
      this.categoriaFiltro = e.target.value;
      // Redibuja la lista con el nuevo filtro
      this.render();
    });

    // Al cambiar el criterio de ordenamiento
    this.sortOptions.addEventListener('change', (e) => {
      // Guarda el criterio elegido
      this.criterioOrden = e.target.value;
      // Redibuja la lista en el nuevo orden
      this.render();
    });

    // Para cada botón de filtro por estado
    this.filterButtons.forEach((btn) => {
      // Al hacer clic en un botón de filtro
      btn.addEventListener('click', () => {
        // Quita la clase 'active' de todos los botones (los deselecciona)
        this.filterButtons.forEach((b) => b.classList.remove('active'));
        // Marca como activo el botón que se pulsó
        btn.classList.add('active');
        // Guarda el estado que indica ese botón (leído del atributo data-filter)
        this.filtroEstado = btn.dataset.filter;
        // Redibuja la lista con el nuevo filtro de estado
        this.render();
      });
    });

    // Al cambiar el interruptor de tema, alterna entre claro/oscuro
    this.themeToggle.addEventListener('change', () => this._alternarTema());

    // Modal de edición
    // Al hacer clic en la X del modal, lo cierra
    this.editModalClose.addEventListener('click', () => this._cerrarModal());
    // Al hacer clic en "cancelar" del modal, lo cierra
    this.editModalCancel.addEventListener('click', () => this._cerrarModal());
    // Al enviar el formulario del modal
    this.editForm.addEventListener('submit', (e) => {
      // Evita el envio clásico que recargaría la página
      e.preventDefault();
      // Guarda los cambios editados de la tarea
      this._manejarGuardarEdicion();
    });
    // Al hacer clic en el fondo oscuro del modal (fuera de la ventana)
    this.editModal.addEventListener('click', (e) => {
      // Si el clic fue justo sobre el fondo y no sobre la ventana, lo cierra
      if (e.target === this.editModal) this._cerrarModal();
    });
    // Cuando se pulsa una tecla en todo el documento
    document.addEventListener('keydown', (e) => {
      // Si se pulsa Escape y el modal está abierto, lo cierra
      if (e.key === 'Escape' && !this.editModal.hidden) this._cerrarModal();
    });
    // Delegación del arrastre: mouse y táctil manejan sus propios eventos
    // (un solo listener sobre la lista, aunque el HTML se re-renderice).
    // Al presionar el ratón sobre la lista de tareas, inicia el posible arrastre
    this.taskList.addEventListener('mousedown', (e) => this._iniciarDrag(e, false));
    // Al tocar la lista en pantalla táctil, inicia el posible arrastre (modo no bloqueante)
    this.taskList.addEventListener('touchstart', (e) => this._iniciarDrag(e, true), { passive: true });
  }

  // ---- Crear / Editar tarea ----
  // Decide si crear una tarea nueva o guardar una edición desde el formulario
  _manejarEnvioFormulario() {
    // Si estamos en modo edición (hay un id de tarea en edición)
    if (this.editandoId) {
      // Guarda los cambios de la tarea que se estaba editando
      this._guardarEdicionDesdeForm();
      // Termina, no crea una tarea nueva
      return;
    }

    // Toma el título escrito y le quita los espacios del principio y del final
    const titulo = this.titleInput.value.trim();
    // Busca el elemento que mostrará el error del campo de título
    const errorEl = this.form.querySelector('[data-error-for="title"]');

    // Si el título no pasa la validación, se detiene aquí (el error ya se mostró)
    if (!this._validarTitulo(titulo, this.titleInput, errorEl)) return;

    // Pide al gestor que cree la tarea con los datos de los campos del formulario
    this.gestor.agregar({
      titulo, // el título validado
      prioridad: this.prioritySelect.value, // la prioridad elegida
      categoria: this.categorySelect.value, // la categoría elegida
      fechaLimite: this.dateInput.value || null, // la fecha, o null si está vacía
    });

    // Limpia todos los campos del formulario
    this.form.reset();
    // Restablece la prioridad al valor por defecto 'media'
    this.prioritySelect.value = 'media';
    // Restablece la categoría al valor por defecto 'estudio'
    this.categorySelect.value = 'estudio';
    // Redibuja la lista para que aparezca la tarea nueva
    this.render();
    // Deja el cursor listo para escribir otra tarea
    this.titleInput.focus();
  }

  // Guarda los cambios de la tarea que estaba en edición en el formulario principal
  _guardarEdicionDesdeForm() {
    // Toma el título escrito y le quita los espacios
    const titulo = this.titleInput.value.trim();
    // Busca el elemento que mostrará el error del campo de título
    const errorEl = this.form.querySelector('[data-error-for="title"]');
    // Si el título no es válido, se detiene (el error ya se mostró)
    if (!this._validarTitulo(titulo, this.titleInput, errorEl)) return;

    // Pide al gestor que edite la tarea en edición con los nuevos datos
    this.gestor.editar(this.editandoId, {
      titulo, // el nuevo título
      prioridad: this.prioritySelect.value, // la nueva prioridad
      categoria: this.categorySelect.value, // la nueva categoría
      fechaLimite: this.dateInput.value || null, // la nueva fecha, o null si está vacía
    });
    // Sale del modo edición y restablece el formulario
    this._salirDeEdicion();
    // Redibuja la lista con los cambios aplicados
    this.render();
    // Devuelve el cursor al campo de título
    this.titleInput.focus();
  }

  // Sale del modo edición devolviendo el formulario a su estado normal
  _salirDeEdicion() {
    // Quita el id en edición (ya no se está editando)
    this.editandoId = null;
    // Vuelve a poner el título del formulario en 'Nueva tarea'
    this.formTitle.textContent = 'Nueva tarea';
    // Vuelve a poner el texto del botón de enviar en 'Agregar tarea'
    this.submitBtn.textContent = 'Agregar tarea';
    // Oculta el botón de cancelar edición
    this.cancelEditBtn.classList.add('hidden');
    // Borra cualquier mensaje de error visible en el formulario
    this._limpiarErroresForm();
  }

  // ---- Edición desde tarjeta (modal) ----
  // Abre el modal de edición precargando los datos de una tarea
  _abrirModalEdicion(tarea) {
    // Llena el campo de título del modal con el título de la tarea
    this.editTitle.value = tarea.titulo;
    // Llena el campo de prioridad con la prioridad de la tarea
    this.editPriority.value = tarea.prioridad;
    // Llena el campo de categoría con la categoría de la tarea
    this.editCategory.value = tarea.categoria;
    // Llena el campo de fecha con la fecha límite (o vacío si no hay)
    this.editDate.value = tarea.fechaLimite || '';
    // Recuerda el id de la tarea que se está editando en el modal
    this._editandoIdModal = tarea.id;
    // Hace visible el modal (quita el atributo hidden)
    this.editModal.hidden = false;
    // Bloquea el desplazamiento del fondo mientras el modal está abierto
    document.body.style.overflow = 'hidden';
    // Tras un pequeño retardo enfoca el campo de título para editar de inmediato
    setTimeout(() => this.editTitle.focus(), 50);
  }

  // Cierra el modal de edición
  _cerrarModal() {
    // Oculta el modal
    this.editModal.hidden = true;
    // Olvida el id de la tarea que se estaba editando
    this._editandoIdModal = null;
    // Restablece el desplazamiento del fondo (ya no está bloqueado)
    document.body.style.overflow = '';
  }

  // Guarda los cambios hechos en el modal de edición
  _manejarGuardarEdicion() {
    // Toma el título escrito en el modal y le quita los espacios
    const titulo = this.editTitle.value.trim();
    // Busca el elemento de error del campo de título del modal
    const errorEl = this.editForm.querySelector('[data-error-for="edit-title"]');
    // Si el título no es válido, se detiene (el error ya se mostró)
    if (!this._validarTitulo(titulo, this.editTitle, errorEl)) return;

    // Pide al gestor que edite la tarea del modal con los nuevos datos
    this.gestor.editar(this._editandoIdModal, {
      titulo, // el nuevo título
      prioridad: this.editPriority.value, // la nueva prioridad
      categoria: this.editCategory.value, // la nueva categoría
      fechaLimite: this.editDate.value || null, // la nueva fecha, o null si está vacía
    });
    // Cierra el modal
    this._cerrarModal();
    // Redibuja la lista con los cambios aplicados
    this.render();
  }

  // ---- Validación ----
  // Valida el título de una tarea y muestra el error correspondiente
  _validarTitulo(titulo, input, errorEl) {
    // Busca el contenedor del campo (clase .field) para marcarlo con error
    const field = input.closest('.field');
    // Si el título está vacío
    if (!titulo) {
      // Marca el campo como inválido (estilo rojo)
      field.classList.add('invalid');
      // Muestra el mensaje de error en el elemento de error
      errorEl.textContent = 'El título no puede estar vacío.';
      // Devuelve false para indicar que no pasó la validación
      return false;
    }
    // Si el título tiene menos de 3 caracteres
    if (titulo.length < 3) {
      // Marca el campo como inválido
      field.classList.add('invalid');
      // Muestra el mensaje de que debe tener al menos 3 caracteres
      errorEl.textContent = 'El título debe tener al menos 3 caracteres.';
      // Devuelve false para indicar que no pasó la validación
      return false;
    }
    // Si llegó aquí el título es válido: quita el estado de inválido
    field.classList.remove('invalid');
    // Limpia el mensaje de error
    errorEl.textContent = '';
    // Devuelve true para indicar que pasó la validación
    return true;
  }

  // Limpia todos los mensajes de error del formulario
  _limpiarErroresForm() {
    // Quita la clase 'invalid' a todos los campos marcados como inválidos
    this.form.querySelectorAll('.field.invalid').forEach((f) => f.classList.remove('invalid'));
    // Vacía el texto de todos los elementos con clase 'error'
    this.form.querySelectorAll('.error').forEach((e) => (e.textContent = ''));
  }

  // ---- Render principal ----
  // Pipeline: filtrar por estado+categoría → buscar por título → ordenar
  // Dibuja la interfaz completa: estadísticas y lista de tareas
  render() {
    // Obtiene las tareas que deben mostrarse según filtros, búsqueda y orden
    const tareas = this._obtenerTareasVisibles();
    // Actualiza los números y la barra de estadísticas
    this._renderEstadisticas();
    // Dibuja las tarjetas de tareas en la lista
    this._renderTareas(tareas);
  }

  // Calcula qué tareas se deben mostrar según los filtros, la búsqueda y el orden actuales
  _obtenerTareasVisibles() {
    // Empieza filtrando por estado y categoría usando el gestor
    let tareas = this.gestor.filtrar(this.filtroEstado, this.categoriaFiltro);
    // Si hay texto en el campo de búsqueda
    if (this.busqueda.trim()) {
      // Convierte el texto a minúsculas y sin espacios
      const q = this.busqueda.trim().toLowerCase();
      // Filtra las tareas cuyo título (en minúsculas) contenga el texto
      tareas = tareas.filter((t) => t.titulo.toLowerCase().includes(q));
    }
    // Ordena la lista según el criterio elegido y la devuelve
    return this.gestor.ordenar(tareas, this.criterioOrden);
  }

  // Actualiza los números y la barra de progreso de las estadísticas
  _renderEstadisticas() {
    // Pide al gestor el resumen de estadísticas
    const e = this.gestor.estadisticas();
    // Muestra el número total de tareas
    this.statTotal.textContent = e.total;
    // Muestra el número de tareas pendientes
    this.statPendientes.textContent = e.pendientes;
    // Muestra el número de tareas completadas
    this.statCompletadas.textContent = e.completadas;
    // Muestra el número de tareas vencidas
    this.statVencidas.textContent = e.vencidas;
    // Muestra el número de tareas de prioridad alta
    this.statAlta.textContent = e.prioridadAlta;
    // Muestra el porcentaje de progreso como texto
    this.progressPct.textContent = `${e.progreso}%`;
    // Ajusta el ancho de la barra de progreso según el porcentaje
    this.progressFill.style.width = `${e.progreso}%`;
  }

  // Dibuja las tarjetas de tareas en la lista (o los mensajes de vacío)
  _renderTareas(tareas) {
    // Comprueba si hay algún filtro o búsqueda activos
    const hayFiltros = this.filtroEstado !== 'todas' || this.categoriaFiltro !== 'todas' || this.busqueda.trim();

    // Si no hay tareas que mostrar
    if (tareas.length === 0) {
      // Vacía la lista de tareas en el DOM
      this.taskList.innerHTML = '';
      // Comprueba si no hay ninguna tarea guardada y no hay filtros activos
      const sinNada = this.gestor.tareas.length === 0 && !hayFiltros;
      // Muestra el mensaje de "no hay tareas" solo si realmente no hay nada
      this.emptyNoTasks.classList.toggle('active', sinNada);
      // Muestra el mensaje de "sin resultados" cuando hay filtros pero nada coincide
      this.emptyNoResults.classList.toggle('active', !sinNada);
      // Termina, no hay tarjetas que dibujar
      return;
    }

    // Oculta el mensaje de "no hay tareas"
    this.emptyNoTasks.classList.remove('active');
    // Oculta el mensaje de "sin resultados"
    this.emptyNoResults.classList.remove('active');
    // Convierte cada tarea a su HTML y lo inserta todo en la lista
    this.taskList.innerHTML = tareas.map((t) => this._tareaHTML(t)).join('');
    // Conecta los eventos (clic, cambiar checkbox, botones) de cada tarjeta
    this._bindTareaEventos(tareas);
  }

  // Genera el HTML (estructura) de una tarjeta de tarea
  _tareaHTML(tarea) {
    // Guarda si la tarea está completada
    const completada = tarea.completada;
    // Guarda si la tarea está vencida
    const vencida = tarea.estaVencida();

    // Convierte la fecha límite a un texto legible (o null si no hay fecha)
    const fechaTexto = tarea.fechaLimite
      ? new Date(tarea.fechaLimite + 'T00:00:00').toLocaleDateString('es-ES')
      : null;

    // Crea la insignia de "vencida" solo si la tarea está vencida
    const badgeVencida = vencida
      // Texto que indica los días de retraso (maneja singular/plural)
      ? `<span class="overdue-badge">🚨 ${vencida ? `Vencida hace ${tarea.diasDeAtraso()} día${tarea.diasDeAtraso() === 1 ? '' : 's'}` : 'Vencida'}</span>`
      : '';

    // Crea la etiqueta "URGENTE" solo si la tarea es de tipo urgente
    const urgente = tarea.tipo === 'urgente'
      ? '<span class="task-urgent-flag">URGENTE</span>'
      : '';

    // Pone la primera letra de la categoría en mayúscula (ej. 'trabajo' → 'Trabajo')
    const etiquetaCat = tarea.categoria.charAt(0).toUpperCase() + tarea.categoria.slice(1);

    // La plantilla siguiente arma la tarjeta de la tarea:
    //  - <li> contiene la tarjeta y sus clases según prioridad/completada/vencida
    //  - el <input type="checkbox"> marca/desmarca la tarea como completada
    //  - .task-body agrupa el título (escapado) + la etiqueta URGENTE y los metadatos
    //  - .task-meta reúne los chips de prioridad, categoría, fecha y vencida
    //  - .task-actions contiene los botones de editar (✏️) y eliminar (×)
    // Devuelve la plantilla HTML completa de la tarjeta
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

  // Evita problemas de seguridad escapando caracteres especiales del título
  _escapar(texto) {
    // Crea un elemento div temporal
    const div = document.createElement('div');
    // Al asignar el texto con textContent se escapan automáticamente los caracteres HTML
    div.textContent = texto;
    // Devuelve el texto ya escapado (innerHTML contiene el equivalente seguro)
    return div.innerHTML;
  }

  // Conecta los eventos (checkbox, editar, eliminar) de cada tarjeta de tarea
  _bindTareaEventos(tareas) {
    // Obtiene todas las tarjetas <li> del DOM
    const items = this.taskList.querySelectorAll('.task-item');

    // Para cada tarjeta visible
    items.forEach((item) => {
      // Lee el id de la tarea guardado en el atributo data-id
      const id = item.dataset.id;
      // Busca la tarea correspondiente dentro de la lista pasada
      const tarea = tareas.find((t) => t.id === id);
      // Referencia a la casilla (checkbox) de la tarjeta
      const checkbox = item.querySelector('.checkbox');
      // Referencia al botón de editar de la tarjeta
      const editBtn = item.querySelector('.edit');
      // Referencia al botón de eliminar de la tarjeta
      const deleteBtn = item.querySelector('.delete');

      // Solo conecta eventos si encontró la tarea (evita problemas)
      if (tarea) {
        // Al cambiar el estado de la casilla
        checkbox.addEventListener('change', () => {
          // Pide al gestor que alterne el estado completado de la tarea
          this.gestor.toggleCompletada(id);
          // Añade una clase que dispara la animación de "checked"
          item.classList.add('checking');
          // Tras una breve pausa redibuja para aplicar el cambio visual
          setTimeout(() => this.render(), 180);
        });

        // Al hacer clic en el botón de editar, abre el modal con la tarea
        editBtn.addEventListener('click', () => this._abrirModalEdicion(tarea));

        // Al hacer clic en el botón de eliminar
        deleteBtn.addEventListener('click', () => {
          // Añade una clase que dispara la animación de eliminación
          item.classList.add('removing');
          // Tras la animación...
          setTimeout(() => {
            // ...le pide al gestor que elimine la tarea
            this.gestor.eliminar(id);
            // Y redibuja la lista
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
  // Inicia el posible arrastre de una tarjeta al presionar sobre ella
  _iniciarDrag(e, esTouch) {
    // No robar los clics de botones ni del checkbox.
    // Si el clic fue sobre un botón o la casilla, no se inicia el arrastre
    if (e.target.closest('button, .checkbox, input')) return;

    // Busca la tarjeta <li> más cercana al punto presionado
    const item = e.target.closest('.task-item');
    // Si no hay ninguna tarjeta, no se hace nada
    if (!item) return;

    // Obtiene la posición vertical del puntero (dedo o ratón) sobre la pantalla
    const y = esTouch ? e.touches[0].clientY : e.clientY;

    // Guarda el estado completo del posible arrastre
    this._drag = {
      item, // la tarjeta que se arrastra
      esTouch, // si es un gesto táctil o de ratón
      startY: y, // la posición vertical inicial
      activo: false, // si el arrastre ya se considera activo
      holdTimer: null, // temporizador del "mantener presionado" en táctil
    };

    // Táctil: "mantener presionado" activa el arrastre; si el dedo se mueve
    // antes de completar el hold, es un scroll normal y se cancela.
    // Si es un gesto táctil
    if (esTouch) {
      // Programa un temporizador de 350 ms
      this._drag.holdTimer = setTimeout(() => {
        // Si mientras tanto el arrastre se canceló, no hace nada
        if (!this._drag) return;
        // Marca el arrastre como activo (ya es un arrastre real)
        this._drag.activo = true;
        // Activa la tarjeta (añade estilos de "arrastrando")
        this._activarDrag(this._drag.item);
      }, 350);
    }

    // Bloquea la selección de texto del conjunto (también el callout de iOS).
    // Añade una clase que evita seleccionar texto mientras se arrastra
    this.taskList.classList.add('is-dragging');

    // touchmove debe ser no-pasivo para poder llamar a preventDefault().
    // Escucha el movimiento del dedo (no pasivo para poder frenar el scroll)
    window.addEventListener('touchmove', this._onTouchMove, { passive: false });
    // Escucha el momento en que se levanta el dedo
    window.addEventListener('touchend', this._onTouchEnd);
    // Escucha la cancelación del toque
    window.addEventListener('touchcancel', this._onTouchCancel);
    // Escucha el movimiento del ratón
    window.addEventListener('mousemove', this._onMouseMove);
    // Escucha el momento en que se suelta el botón del ratón
    window.addEventListener('mouseup', this._onMouseUp);
  }

  // Activa visualmente una tarjeta durante el arrastre
  _activarDrag(item) {
    // Añade la clase 'dragging' que le da estilos de tarjeta en movimiento
    item.classList.add('dragging');
    // Refuerza el bloqueo de scroll mientras se arrastra (evita que el navegador se robe el gesto)
    item.style.touchAction = 'none'; // refuerza el bloqueo de scroll mientras arrastras
  }

  // Maneja el movimiento durante el arrastre (con ratón o con el dedo)
  _manejarMove(e, esTouch) {
    // Si no hay arrastre o el tipo de evento no coincide, se ignora
    if (!this._drag || this._drag.esTouch !== esTouch) return;
    // Referencia corta al estado del arrastre
    const drag = this._drag;
    // Posición vertical actual del puntero
    const y = esTouch ? e.touches[0].clientY : e.clientY;

    // Si el arrastre aún no está activo
    if (!drag.activo) {
      // Calcula cuánto se ha movido el puntero desde el inicio
      const distancia = Math.abs(y - drag.startY);
      // Si es un gesto táctil
      if (esTouch) {
        // El dedo se movió antes del hold: scroll normal, se cancela el intento.
        // Si se movió más de 12 px antes del hold, se cancela el arrastre (era un scroll)
        if (distancia > 12) this._cancelarDrag();
        // Termina sin arrastrar
        return;
      }
      // Umbral en mouse: evita arrancar con un clic
      // Si el ratón se movió menos de 5 px, no se considera arrastre (era un clic)
      if (distancia < 5) return;
      // Superado el umbral, marca el arrastre como activo
      drag.activo = true;
      // Activa visualmente la tarjeta
      this._activarDrag(drag.item);
    }

    // Solo al arrastrar se frena la página: así el navegador entrega todos
    // los touchmove en lugar de robárselos para el scroll a mitad de gesto.
    // En táctil, evita que la página haga scroll mientras se arrastra
    if (esTouch) e.preventDefault();

    // Referencia a la lista de tareas
    const lista = this.taskList;
    // Lista de las otras tarjetas (las que no se están arrastrando)
    const resto = [...lista.querySelectorAll('.task-item:not(.dragging)')];

    // Lugar de inserción: la mitad vertical de cada tarjeta decide "antes de cuál".
    // Variable que guardará la tarjeta delante de la cual se insertará la arrastrada
    let insertarAntes = null;
    // Recorre las demás tarjetas para ver dónde debe ir la arrastrada
    for (const otro of resto) {
      // Obtiene la posición y tamaño de la otra tarjeta
      const r = otro.getBoundingClientRect();
      // Si el puntero está por encima de la mitad de esa tarjeta
      if (y < r.top + r.height / 2) {
        // Se insertará antes de esta tarjeta
        insertarAntes = otro;
        // Deja de buscar
        break;
      }
    }

    // Marca la tarjeta destino (indicador visual) y mueve el DOM en vivo.
    // Quita la marca 'drag-over' de cualquier tarjeta que la tuviera antes
    lista.querySelectorAll('.drag-over').forEach((el) => el.classList.remove('drag-over'));
    // Añade la marca a la tarjeta destino (si existe) para resaltarla
    if (insertarAntes) insertarAntes.classList.add('drag-over');

    // Mueve la tarjeta arrastrada a su nueva posición usando la animación FLIP
    this._moverConFLIP(lista, drag.item, insertarAntes);
  }

  // FLIP: First / Last / Invert / Play. Anima las tarjetas no arrastradas
  // para que "cedan" su espacio deslizándose en lugar de saltar de golpe.
  // Mueve la tarjeta arrastrada y anima a las demás con la técnica FLIP
  _moverConFLIP(lista, dragged, insertarAntes) {
    // Obtiene todas las tarjetas que no se están arrastrando
    const items = [...lista.querySelectorAll('.task-item:not(.dragging)')];
    // Mapa que guardará la posición vertical inicial de cada tarjeta
    const antes = new Map();

    // First: registra la posición inicial de cada tarjeta
    items.forEach((it) => antes.set(it, it.getBoundingClientRect().top));
    // Mueve la tarjeta arrastrada a su nuevo lugar en el DOM
    lista.insertBefore(dragged, insertarAntes);

    // Invert: coloca cada tarjeta donde estaba antes del movimiento.
    // Recorre las demás tarjetas
    items.forEach((it) => {
      // Calcula cuánto se desplazó cada tarjeta tras el movimiento
      const delta = antes.get(it) - it.getBoundingClientRect().top;
      // Si no se movió, no necesita ajuste
      if (!delta) return;
      // Desactiva la transición para aplicar la posición "invertida" sin animar
      it.style.transition = 'none';
      // Desplaza la tarjeta a donde estaba antes usando un transform
      it.style.transform = `translateY(${delta}px)`;
    });

    // Fuerza el layout para que el navegador aplique la posición invertida.
    // Obliga al navegador a recalcular el layout (lectura forzada)
    void lista.offsetHeight;

    // Play: se quita el transform y la transición hace el deslizamiento.
    // Recorre de nuevo las tarjetas
    items.forEach((it) => {
      // Activa la transición de transform para que se deslicen suavemente
      it.style.transition = 'transform 0.18s ease';
      // Quita el transform: la tarjeta vuelve a su sitio de forma animada
      it.style.transform = '';
    });
  }

  // Finaliza el arrastre cuando se suelta el puntero o el dedo
  _finalizarDrag() {
    // Si no hay arrastre activo, no hace nada
    if (!this._drag) return;
    // Referencia al estado del arrastre
    const drag = this._drag;

    // Quita los estilos de "arrastrando" y "drag-over" de la tarjeta
    drag.item.classList.remove('dragging', 'drag-over');
    // Restablece la propiedad touchAction para permitir el scroll normal
    drag.item.style.touchAction = '';

    // Sin arrastre real (un simple clic/tap): solo limpiar, sin re-render.
    // Si nunca llegó a ser un arrastre real (era un clic o toque)
    if (!drag.activo) {
      // Solo limpia el estado, sin reordenar
      this._limpiarDrag();
      // Termina
      return;
    }

    // El orden final del DOM ES el nuevo orden: lo persistimos en la colección.
    // Lee el orden final de las tarjetas en el DOM
    const orden = [...this.taskList.querySelectorAll('.task-item')].map((li) => li.dataset.id);
    // Pide al gestor que guarde el nuevo orden
    this.gestor.reordenar(orden);
    // Fuerza el criterio de orden a 'manual' (respeta el orden por arrastre)
    this.criterioOrden = 'manual';
    // Actualiza el selector desplegable para que muestre 'manual'
    this.sortOptions.value = 'manual';

    // Limpia el estado del arrastre
    this._limpiarDrag();
    // Redibuja la lista con el nuevo orden
    this.render();
  }

  // Cancela el arrastre (por ejemplo si el navegador roba el gesto)
  _cancelarDrag() {
    // Si no hay arrastre, no hace nada
    if (!this._drag) return;
    // Referencia a la tarjeta del arrastre
    const item = this._drag.item;
    // Recuerda si el arrastre ya estaba activo
    const estabaActivo = this._drag.activo;
    // Quita los estilos de arrastre de la tarjeta
    item.classList.remove('dragging', 'drag-over');
    // Restablece el touchAction
    item.style.touchAction = '';
    // Limpia el estado del arrastre
    this._limpiarDrag();
    // Solo re-renderiza si el DOM ya se estaba moviendo en vivo.
    // Si el arrastre ya había movido tarjetas, las vuelve a su sitio
    if (estabaActivo) this.render();
  }

  // Limpia todo el estado y los listeners del arrastre
  _limpiarDrag() {
    // Si hay un temporizador de hold pendiente, lo cancela
    if (this._drag && this._drag.holdTimer) clearTimeout(this._drag.holdTimer);
    // Borra el estado del arrastre
    this._drag = null;
    // Quita la clase que bloqueaba la selección de texto
    this.taskList.classList.remove('is-dragging');
    // Deja de escuchar el movimiento del dedo
    window.removeEventListener('touchmove', this._onTouchMove);
    // Deja de escuchar el fin del toque
    window.removeEventListener('touchend', this._onTouchEnd);
    // Deja de escuchar la cancelación del toque
    window.removeEventListener('touchcancel', this._onTouchCancel);
    // Deja de escuchar el movimiento del ratón
    window.removeEventListener('mousemove', this._onMouseMove);
    // Deja de escuchar la liberación del botón del ratón
    window.removeEventListener('mouseup', this._onMouseUp);
  }

  // ---- Tema (dark / light) ----
  // Aplica el tema que el usuario tenía guardado al cargar
  _aplicarTemaGuardado() {
    // Lee el tema guardado en localStorage
    const guardado = localStorage.getItem(THEME_KEY);
    // Decide el tema: 'light' si estaba guardado, si no 'dark' por defecto
    const tema = guardado === 'light' ? 'light' : 'dark';
    // Aplica el tema como atributo en la etiqueta <html> (lo usa el CSS)
    document.documentElement.dataset.theme = tema;
    // Marca el interruptor según el tema: activado si es claro
    this.themeToggle.checked = tema === 'light';
  }

  // Alterna entre tema claro y oscuro
  _alternarTema() {
    // Referencia a la etiqueta raíz <html>
    const raiz = document.documentElement;
    // Lee el tema actual
    const actual = raiz.dataset.theme;
    // Calcula el tema nuevo (lo contrario al actual)
    const nuevo = actual === 'dark' ? 'light' : 'dark';

    // Desactiva transiciones temporalmente para que el cambio de tema sea
    // instantáneo (evita la animación lenta/el repintado costoso en móvil).
    // Añade una clase que desactiva las transiciones de tema
    raiz.classList.add('theme-transition-disabled');
    // Aplica el tema nuevo en el atributo de la raíz
    raiz.dataset.theme = nuevo;
    // Guarda el tema nuevo en localStorage para la próxima carga
    localStorage.setItem(THEME_KEY, nuevo);
    // Espera dos frames de animación para asegurar que el tema se aplicó
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Re-activa las transiciones (el cambio de tema ya terminó)
        raiz.classList.remove('theme-transition-disabled');
      });
    });
  }
}

// ============================================================
// Inicialización
// ============================================================
// Cuando el DOM termine de cargarse, arranca la aplicación
document.addEventListener('DOMContentLoaded', () => {
  // Crea la interfaz (gestor de tareas + eventos + render)
  new UI();
  // Muestra la pantalla de bienvenida animada
  iniciarBienvenida();
});

// ============================================================
// MEPOOL · Pantalla de bienvenida
// ============================================================
// Controla la pantalla de bienvenida que aparece al inicio
function iniciarBienvenida() {
  // Busca el elemento de la pantalla de bienvenida
  const screen = document.getElementById('welcome-screen');
  // Si no existe la pantalla, no hace nada
  if (!screen) return;

  // Bandera para no ocultar la pantalla más de una vez
  let terminada = false;

  // Función que oculta la pantalla de bienvenida con animación
  const ocultar = () => {
    // Si ya se ocultó antes, no se vuelve a ejecutar
    if (terminada) return;
    // Marca que ya se ejecutó el ocultamiento
    terminada = true;
    // Añade la clase que dispara la animación de revelado
    screen.classList.add('is-revealing');
    // pausa para que el flash pegue su pico y luego desvanecer la bienvenida
    // Espera al siguiente frame de animación
    requestAnimationFrame(() => {
      // Tras un pequeño retardo...
      setTimeout(() => {
        // Añade la clase que oculta la pantalla por completo
        screen.classList.add('is-hidden');
        // al terminar la transición, liberar el DOM
        // Función que elimina la pantalla del DOM
        const liberar = () => screen.remove();
        // Si la pantalla aún está en el DOM
        if (screen.parentElement) {
          // Cuando termine la transición CSS, elimina la pantalla (una sola vez)
          screen.addEventListener('transitionend', () => screen.remove(), { once: true });
          // Respaldo: si la transición no dispara, elimina igualmente tras 1.6 s
          setTimeout(liberar, 1600); // respaldo por si transitionend no dispara
        }
      }, 320);
    });
  };

  // Disparador determinista: el flash y la transición salen siempre igual,
  // en PC y móvil, sin depender de prefers-reduced-motion.
  // Programa el ocultamiento automático tras 5.2 segundos
  setTimeout(ocultar, 5200);
}

