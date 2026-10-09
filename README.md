# MEPOOL — Gestor de Tareas

Aplicación web de gestión de tareas construida con **JavaScript puro** aplicando **Programación Orientada a Objetos (POO)**: clases, herencia, polimorfismo, encapsulamiento y persistencia con `localStorage`. Incluye pantalla de bienvenida animada, modo oscuro/claro y un diseño moderno tipo SaaS.


## Características principales

- **Crear tareas** con título, prioridad, categoría y fecha límite.
- **Editar y eliminar tareas** con animación.
- **Completar / descompletar** tareas.
- **Prioridades visuales** (alta / media / baja) con indicadores de color.
- **Detección de tareas vencidas** con texto "Vencida hace X días".
- **Buscador dinámico** por título (insensible a mayúsculas/minúsculas).
- **Filtros por estado**: Todas · Pendientes · Completadas · Vencidas.
- **Filtros por categoría**: Trabajo · Estudio · Personal · Otros.
- **Ordenamiento**: fecha límite, prioridad, nombre (A-Z / Z-A), fecha de creación.
- **Arrastrar y soltar** para reordenar tareas manualmente (mouse y táctil) con orden persistido.
- **Reordenar con el teclado** (`Alt` + `↑/↓`).
- **Deshacer al eliminar** tareas y al limpiar completadas (toast de aviso).
- **Exportar / importar** todas las tareas en JSON.
- **Recordatorios** de tareas vencidas con la Notification API.
- **Aviso** cuando la fecha límite elegida ya pasó.
- **Estadísticas** dinámicas (total, pendientes, completadas, vencidas, prioridad alta).
- **Barra de progreso** calculada `(completadas / total) * 100`.
- **Persistencia** en `localStorage` con reconstrucción correcta de instancias.
- **Modo oscuro / claro** (el tema se guarda en `localStorage`).
- **Diseño responsive** (escritorio, tablet, celular).
- **Accesibilidad**: labels conectados, `aria-label`, `aria-pressed` en filtros, focus trap en el modal y navegación por teclado.
- **Estados vacíos** agradables cuando no hay tareas o resultados.

## Programación Orientada a Objetos

| Concepto | Aplicación |
|----------|------------|
| **Clases** | `Tarea`, `TareaUrgente`, `GestorTareas`, `UI` |
| **Encapsulamiento** | `GestorTareas` gestiona internamente la colección, validación y persistencia |
| **Herencia** | `TareaUrgente` extiende de `Tarea` |
| **Polimorfismo** | `toJSON()` / `desdeJSON()` y la marca "URGENTE" se comportan según el tipo de tarea |

### Clase `Tarea`

```javascript
{
  id,             // UUID único (crypto.randomUUID con fallback para contextos no seguros)
  titulo,         // string
  prioridad,      // 'alta' | 'media' | 'baja'
  categoria,      // 'trabajo' | 'estudio' | 'personal' | 'otros'
  fechaLimite,    // 'YYYY-MM-DD' | null
  fechaCreacion,  // ISO string
  completada      // boolean
}
```

### Clase `GestorTareas`

```javascript
// Métodos principales
agregar(titulo, prioridad, categoria, fechaLimite)
eliminar(id)
editar(id, datos)
toggleCompletada(id)

// Consultas
obtenerPendientes()
obtenerCompletadas()
obtenerVencidas()
buscar(texto)
filtrar(criterios)
ordenar(criterio)
estadisticas()

// Persistencia
guardar()   // JSON.stringify + localStorage
cargar()    // JSON.parse + reconstrucción de instancias
```

## Tecnologías utilizadas

- **HTML5** — Estructura semántica y accesible.
- **CSS3** — Variables CSS para temas, animaciones y diseño responsive.
- **JavaScript (ES6+ / POO)** — Lógica de la aplicación con clases, herencia y polimorfismo.
- **localStorage** — Persistencia de datos en el navegador.

> Sin frameworks ni dependencias externas.

## Estructura del proyecto

```text
gestor-tareas/
├── index.html      # Estructura de la aplicación (formulario, lista, estadísticas, modal)
├── style.css       # Estilos, temas oscuro/claro, animaciones, responsive
├── js/             # Lógica en módulos ES (POO)
│   ├── config.js        # Claves de storage, prioridades y utilidades
│   ├── Tarea.js         # Tarea (base) y TareaUrgente (herencia)
│   ├── GestorTareas.js  # Dominio: CRUD, filtros, orden, persistencia
│   ├── UI.js            # DOM, eventos, render, drag & drop, tema
│   ├── welcome.js       # Pantalla de bienvenida
│   └── main.js          # Punto de entrada
├── tests/          # Pruebas unitarias de la capa de dominio (Vitest)
├── package.json    # Scripts y dependencias de desarrollo
├── eslint.config.js
├── vitest.config.mjs
├── README.md       # Documentación del proyecto
└── img/            # Imágenes del proyecto
    ├── logo-mepool.png
    └── favicon.png
```

## Cómo ejecutar

La app usa **módulos ES**, por lo que necesita servirse por HTTP (no basta abrir
el archivo con doble clic). Desde la carpeta del proyecto:

```bash
# con Python
python -m http.server 8000

# o con Node
npx serve .
```

Luego abre `http://localhost:8000` en tu navegador.

No requiere instalación, backend ni base de datos externa. Las tareas se guardan en el `localStorage` del navegador.

También puedes ver la versión en vivo en **GitHub Pages**:  
[enzolatorre.github.io/gestor-tareas](https://enzolatorre.github.io/gestor-tareas/)

## Autor

**Enzo La Torre**

- [Portafolio](https://enzolatorre.github.io/Portfolio/)
- [GitHub](https://github.com/EnzoLaTorre)

## Desarrollo

El proyecto incluye herramientas de calidad (solo para desarrollo, la app no las necesita para funcionar):

```bash
npm install      # instala dependencias de desarrollo
npm test         # ejecuta las pruebas (Vitest + jsdom)
npm run lint     # revisa el código con ESLint
npm run format   # formatea con Prettier
```

## Posibles mejoras futuras

- Etiquetas personalizadas más allá de las categorías fijas.
- Subtareas dentro de cada tarea.
- Sincronización con una API/backend (opcional).