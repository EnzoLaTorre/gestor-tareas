# Gestor de Tareas · POO

Gestor de tareas construido con **JavaScript puro** aplicando **Programación Orientada a Objetos (POO)**: clases, encapsulamiento, herencia y persistencia con `localStorage`.

## ✨ Funcionalidades

- ➕ Crear tareas con título, prioridad (alta/media/baja) y fecha límite opcional.
- ✅ Marcar tareas como completadas / pendientes.
- 🗑️ Eliminar tareas.
- 🔍 Filtros: Todas / Pendientes / Completadas.
- 📊 Contador de tareas pendientes.
- 💾 Persistencia en `localStorage` (las tareas sobreviven al recargar la página).

## 🧠 Conceptos de POO aplicados

| Concepto | Uso en el código |
|----------|------------------|
| **Clases** | `Task`, `UrgentTask`, `TaskManager`, `UI` |
| **Encapsulamiento** | `TaskManager` gestiona internamente el arreglo de tareas y su persistencia |
| **Herencia** | `UrgentTask` extiende de `Task` |
| **Polimorfismo** | `getMeta()` y el flag "URGENTE" se comportan distinto según el tipo de tarea |

## 🛠️ Tecnologías

- HTML
- CSS
- JavaScript (ES6+ / POO)

## 🚀 Cómo ejecutarlo

Abre `index.html` en tu navegador. No requiere instalación ni backend.

## 🔗 Demo

[Ver demo](https://enzolatorre.github.io/gestor-tareas/)
