# MEPOOL — Gestor de Tareas

Aplicación web de gestión de tareas construida con **JavaScript puro** aplicando **Programación Orientada a Objetos (POO)**: clases, herencia, polimorfismo, encapsulamiento y persistencia con `localStorage`. Incluye pantalla de bienvenida animada, modo oscuro/claro y un diseño moderno tipo SaaS.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white) ![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white) ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black) ![POO](https://img.shields.io/badge/OOP-Blue?style=flat)

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
- **Estadísticas** dinámicas (total, pendientes, completadas, vencidas, prioridad alta).
- **Barra de progreso** calculada `(completadas / total) * 100`.
- **Persistencia** en `localStorage` con reconstrucción correcta de instancias.
- **Modo oscuro / claro** (el tema se guarda en `localStorage`).
- **Diseño responsive** (escritorio, tablet, celular).
- **Accesibilidad**: labels conectados, `aria-label`, focus visible, navegación por teclado.
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
  id,             // UUID único (crypto.randomUUID con fallback para file://)
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
├── script.js       # Lógica POO (Tarea, GestorTareas, UI)
├── README.md       # Documentación del proyecto
└── img/            # Imágenes del proyecto
    ├── MODOCLARO.jpg
    ├── MODOOSCURO.jpg
    ├── logo-mepool.png
    ├── favicon.png
    └── LOGO.png
```

## Cómo ejecutar

1. Clona o descarga el repositorio.
2. Abre `index.html` en tu navegador.

No requiere instalación, backend ni base de datos externa. Las tareas se guardan en el `localStorage` del navegador.

También puedes ver la versión en vivo en **GitHub Pages**:  
[enzolatorre.github.io/gestor-tareas](https://enzolatorre.github.io/gestor-tareas/)

## Autor

**Enzo La Torre**

- [Portafolio](https://enzolatorre.github.io/Portfolio/)
- [GitHub](https://github.com/EnzoLaTorre)

## Posibles mejoras futuras

- Exportar / importar tareas en JSON.
- Recordatorios y notificaciones de tareas vencidas.
- Etiquetas personalizadas más allá de las categorías fijas.
- Sincronización con una API/backend (opcional).