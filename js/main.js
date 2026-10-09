// ============================================================
// Punto de entrada de MEPOOL
// ============================================================

import { UI } from './UI.js';
import { iniciarBienvenida } from './welcome.js';

document.addEventListener('DOMContentLoaded', () => {
  new UI();
  iniciarBienvenida();
});
