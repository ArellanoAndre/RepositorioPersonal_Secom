import { $ } from '../utils.js';
import { closeModal } from '../utils.js';

export function initTheme(){
  const theme = localStorage.getItem('secom_theme') || 'dark';
  document.documentElement.dataset.theme = theme;
}

export function initIcons(){
  if (window.lucide) window.lucide.createIcons();
  else window.addEventListener('load', () => window.lucide?.createIcons(), { once:true });
}

export function initSidebar(){
  const sidebar = $('#sidebar');
  $('#btnSidebarToggle')?.addEventListener('click', () => {
    sidebar?.classList.toggle('is-collapsed');
  });
  $('#btnOpenSidebar')?.addEventListener('click', () => sidebar?.classList.add('is-open'));

  window.addEventListener('resize', () => {
    if (window.innerWidth > 860) sidebar?.classList.remove('is-open');
  });

  return sidebar;
}

export function initModalClose(){
  $('#modal')?.addEventListener('click', (e) => {
    const t = e.target;
    if (t?.dataset?.close === 'true') closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}
