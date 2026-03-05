import { $$ } from '../utils.js';
import { initTheme, initIcons, initSidebar, initModalClose } from './layout.js';
import { setRoute } from './router.js';

import { renderCotizadorRoute, startNewQuoteFlow } from '../cotizador/cotizador.js';
import { renderHistorialRoute } from '../pages/historial.js';
import { renderProyectosRoute } from '../pages/proyectos.js';
import { renderOpcionesRoute } from '../pages/opciones.js';

export function initApp(){
  initTheme();
  initIcons();
  const sidebar = initSidebar();
  initModalClose();

  // Navigation
  $$('.nav__item[data-route]').forEach(btn => {
    btn.addEventListener('click', () => {
      const r = btn.dataset.route;
      if (r === 'cotizador'){
        startNewQuoteFlow();
        setRoute('cotizador');
      } else {
        setRoute(r);
        // render on demand
        if (r === 'historial') renderHistorialRoute();
        if (r === 'proyectos') renderProyectosRoute();
        if (r === 'opciones') renderOpcionesRoute();
      }
      sidebar?.classList.remove('is-open');
    });
  });

  renderAll();
  setRoute('historial');
}

function renderAll(){
  renderCotizadorRoute();
  renderHistorialRoute();
  renderProyectosRoute();
  renderOpcionesRoute();
}
