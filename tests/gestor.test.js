import { beforeEach, describe, expect, it } from 'vitest';
import modulo from '../script.js';

const { Tarea, TareaUrgente, GestorTareas, STORAGE_KEY } = modulo;

// Fecha ISO 'YYYY-MM-DD' relativa a hoy (negativo = pasado).
const fechaRelativa = (dias) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
};

beforeEach(() => {
  localStorage.clear();
});

describe('Tarea', () => {
  it('marca vencida solo si está pendiente y superó la fecha', () => {
    const pasada = new Tarea({ titulo: 'Atrasada', fechaLimite: fechaRelativa(-3) });
    expect(pasada.estaVencida()).toBe(true);
    expect(pasada.diasDeAtraso()).toBeGreaterThanOrEqual(3);

    const futura = new Tarea({ titulo: 'Futura', fechaLimite: fechaRelativa(5) });
    expect(futura.estaVencida()).toBe(false);
    expect(futura.diasDeAtraso()).toBe(0);
  });

  it('una tarea completada no se considera vencida', () => {
    const t = new Tarea({ titulo: 'Hecha', fechaLimite: fechaRelativa(-2) });
    t.toggleCompletada();
    expect(t.completada).toBe(true);
    expect(t.estaVencida()).toBe(false);
  });

  it('sin fecha límite nunca vence', () => {
    const t = new Tarea({ titulo: 'Sin fecha' });
    expect(t.estaVencida()).toBe(false);
  });
});

describe('TareaUrgente (herencia)', () => {
  it('fuerza prioridad alta y tipo urgente', () => {
    const t = new TareaUrgente({ titulo: 'Urgente' });
    expect(t).toBeInstanceOf(Tarea);
    expect(t.prioridad).toBe('alta');
    expect(t.tipo).toBe('urgente');
  });
});

describe('GestorTareas · agregar', () => {
  it('crea TareaUrgente cuando la prioridad es alta', () => {
    const g = new GestorTareas();
    const t = g.agregar({ titulo: 'Producción', prioridad: 'alta' });
    expect(t).toBeInstanceOf(TareaUrgente);
    expect(t.tipo).toBe('urgente');
  });

  it('crea Tarea normal para prioridades media/baja', () => {
    const g = new GestorTareas();
    const t = g.agregar({ titulo: 'Leer', prioridad: 'baja' });
    expect(t).toBeInstanceOf(Tarea);
    expect(t).not.toBeInstanceOf(TareaUrgente);
    expect(t.tipo).toBe('normal');
  });
});

describe('GestorTareas · editar', () => {
  it('al subir a alta convierte la instancia en TareaUrgente', () => {
    const g = new GestorTareas();
    const t = g.agregar({ titulo: 'Revisar', prioridad: 'media' });
    g.editar(t.id, { prioridad: 'alta' });

    const editada = g.tareas.find((x) => x.id === t.id);
    expect(editada).toBeInstanceOf(TareaUrgente);
    expect(editada.tipo).toBe('urgente');
    expect(editada.id).toBe(t.id);
  });

  it('al bajar de alta quita la marca urgente sin perder identidad', () => {
    const g = new GestorTareas();
    const t = g.agregar({ titulo: 'Urgente', prioridad: 'alta' });
    const creada = t.fechaCreacion;
    g.editar(t.id, { prioridad: 'baja' });

    const editada = g.tareas.find((x) => x.id === t.id);
    expect(editada).toBeInstanceOf(Tarea);
    expect(editada).not.toBeInstanceOf(TareaUrgente);
    expect(editada.tipo).toBe('normal');
    expect(editada.id).toBe(t.id);
    expect(editada.fechaCreacion).toBe(creada);
  });

  it('devuelve false si el id no existe', () => {
    const g = new GestorTareas();
    expect(g.editar('inexistente', { titulo: 'x' })).toBe(false);
  });
});

describe('GestorTareas · filtrar y buscar', () => {
  const preparar = () => {
    const g = new GestorTareas();
    g.agregar({ titulo: 'Informe de ventas', prioridad: 'alta', categoria: 'trabajo' });
    g.agregar({ titulo: 'Estudiar SQL', prioridad: 'media', categoria: 'estudio' });
    const completada = g.agregar({ titulo: 'Pagar recibo', prioridad: 'baja', categoria: 'personal' });
    g.toggleCompletada(completada.id);
    g.agregar({
      titulo: 'Tarea vencida',
      prioridad: 'media',
      categoria: 'otros',
      fechaLimite: fechaRelativa(-1),
    });
    return g;
  };

  it('filtra por estado', () => {
    const g = preparar();
    expect(g.obtenerPendientes()).toHaveLength(3);
    expect(g.obtenerCompletadas()).toHaveLength(1);
    expect(g.obtenerVencidas()).toHaveLength(1);
  });

  it('combina estado + categoría + texto', () => {
    const g = preparar();
    expect(g.filtrar('todas', 'trabajo').map((t) => t.titulo)).toEqual(['Informe de ventas']);
    expect(g.filtrar('pendientes', 'todas', 'sql').map((t) => t.titulo)).toEqual(['Estudiar SQL']);
  });

  it('buscar delega en filtrar', () => {
    const g = preparar();
    expect(g.buscar('recibo')).toHaveLength(1);
  });
});

describe('GestorTareas · ordenar', () => {
  it('ordena por prioridad', () => {
    const g = new GestorTareas();
    g.agregar({ titulo: 'Baja', prioridad: 'baja' });
    g.agregar({ titulo: 'Alta', prioridad: 'alta' });
    g.agregar({ titulo: 'Media', prioridad: 'media' });
    expect(g.ordenar(g.tareas, 'prioridad').map((t) => t.titulo)).toEqual(['Alta', 'Media', 'Baja']);
  });

  it('ordena por nombre A-Z', () => {
    const g = new GestorTareas();
    g.agregar({ titulo: 'Zapato' });
    g.agregar({ titulo: 'Árbol' });
    g.agregar({ titulo: 'Mesa' });
    expect(g.ordenar(g.tareas, 'nombre-az').map((t) => t.titulo)).toEqual(['Árbol', 'Mesa', 'Zapato']);
  });
});

describe('GestorTareas · persistencia', () => {
  it('guarda y reconstruye instancias con sus métodos', () => {
    const g = new GestorTareas();
    g.agregar({ titulo: 'Persistente', prioridad: 'alta', fechaLimite: fechaRelativa(-1) });

    const recargado = new GestorTareas();
    expect(recargado.tareas).toHaveLength(1);
    const t = recargado.tareas[0];
    expect(t).toBeInstanceOf(Tarea);
    expect(typeof t.estaVencida).toBe('function');
    expect(t.tipo).toBe('urgente');
    expect(t.estaVencida()).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toHaveLength(1);
  });

  it('carga vacío si el JSON está corrupto', () => {
    localStorage.setItem(STORAGE_KEY, '{no es json');
    expect(new GestorTareas().tareas).toEqual([]);
  });
});

describe('GestorTareas · limpiar completadas y deshacer', () => {
  it('elimina completadas y las restaura en su posición', () => {
    const g = new GestorTareas();
    g.agregar({ titulo: 'A' });
    const b = g.agregar({ titulo: 'B' });
    const c = g.agregar({ titulo: 'C' });
    g.agregar({ titulo: 'D' });
    g.toggleCompletada(b.id);
    g.toggleCompletada(c.id);

    const removidas = g.eliminarCompletadas();
    expect(removidas).toHaveLength(2);
    expect(g.tareas.map((t) => t.titulo)).toEqual(['A', 'D']);

    g.restaurarEnBloque(removidas);
    expect(g.tareas.map((t) => t.titulo)).toEqual(['A', 'B', 'C', 'D']);
  });
});
