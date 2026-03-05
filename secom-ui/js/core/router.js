import { $$, $ } from '../utils.js';
import { state } from './state.js';

const TITLE_MAP = {
  cotizador: { t: 'Crear cotización', c: 'Cotizaciones / Crear' },
  proyectos: { t: 'Proyectos', c: 'Proyectos / Gestión' },
  historial: { t: 'Lista de cotizaciones', c: 'Cotizaciones / Lista' },
  opciones: { t: 'Preferencias', c: 'Sistema / Preferencias' },
};

export function setRoute(route){
  state.route = route;

  $$('.nav__item').forEach(el => el.classList.toggle('is-active', el.dataset.route === route));
  $$('.route').forEach(el => el.classList.toggle('is-active', el.id === `route-${route}`));

  const meta = TITLE_MAP[route] || { t:'SECOM', c:'' };
  const title = $('#pageTitle');
  const crumb = $('#pageCrumb');
  if (title) title.textContent = meta.t;
  if (crumb) crumb.textContent = meta.c;
}
