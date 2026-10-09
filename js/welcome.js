// ============================================================
// MEPOOL · Pantalla de bienvenida (una vez por sesión)
// ============================================================

const CLAVE = 'mepool-welcome-visto';

export function iniciarBienvenida() {
  const screen = document.getElementById('welcome-screen');
  if (!screen) return;

  let yaVista = false;
  try {
    yaVista = sessionStorage.getItem(CLAVE) === '1';
  } catch (e) {
    yaVista = false;
  }

  // La intro se muestra una sola vez por sesión.
  if (yaVista) {
    screen.remove();
    return;
  }
  try {
    sessionStorage.setItem(CLAVE, '1');
  } catch (e) {
    /* almacenamiento no disponible: se muestra igual */
  }

  let terminada = false;

  const ocultar = () => {
    if (terminada) return;
    terminada = true;
    screen.removeEventListener('click', ocultar);
    window.removeEventListener('keydown', ocultar);
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

  // Se puede saltar con clic o con cualquier tecla.
  screen.addEventListener('click', ocultar);
  window.addEventListener('keydown', ocultar);

  setTimeout(ocultar, 1500);
}
