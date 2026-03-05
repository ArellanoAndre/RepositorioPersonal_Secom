import { $, openModal, closeModal, toast } from '../utils.js';
import { resetAllData } from '../storage.js';
import { state, resetWizard } from '../core/state.js';
import { renderHistorialTable } from './historial.js';
import { renderProyectosTable } from './proyectos.js';
import { setRoute } from '../core/router.js';

export function renderOpcionesRoute(){
  const root = $('#route-opciones');
  if (!root) return;

  const theme = document.documentElement.dataset.theme || 'dark';

  root.innerHTML = `
    <div class="grid" style="gap:14px">
      <div class="card">
        <div class="card__title">Apariencia</div>
        <div class="card__subtitle">Tema del sistema</div>

        <div class="row" style="align-items:center">
          <div class="help" style="flex:1">
            Cambia entre modo claro y modo oscuro. La preferencia se guarda en este equipo.
          </div>
          <div class="field" style="max-width:240px">
            <label>Tema</label>
            <select id="themeSelect">
              <option value="dark" ${theme==='dark'?'selected':''}>Dark mode</option>
              <option value="light" ${theme==='light'?'selected':''}>Light mode</option>
            </select>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card__title">Datos</div>
        <div class="card__subtitle">Administración de historial y proyectos</div>

        <div class="row" style="align-items:center">
          <div class="help" style="flex:1">
            Puedes limpiar el historial y proyectos almacenados localmente.
          </div>
          <button class="btn btn--danger" id="btnReset"><i data-lucide="trash-2"></i>Limpiar todo</button>
        </div>
      </div>
    </div>
  `;

  $('#themeSelect')?.addEventListener('change', (e) => {
    const t = e.target.value;
    document.documentElement.dataset.theme = t;
    localStorage.setItem('secom_theme', t);
    toast({ title:'Tema actualizado', message:`Modo ${t === 'dark' ? 'oscuro' : 'claro'} activado.`, icon:'palette' });
  });

  $('#btnReset')?.addEventListener('click', () => {
    openModal({
      title: 'Limpiar datos',
      subtitle: 'Acción irreversible',
      bodyHtml: `
        <div class="help">Se eliminarán todas las cotizaciones del historial y todos los proyectos guardados en este equipo.</div>
        <div class="help" style="margin-top:10px">¿Deseas continuar?</div>
      `,
      footHtml: `
        <button class="btn" data-close="true"><i data-lucide="x"></i>Cancelar</button>
        <button class="btn btn--danger" id="confirmReset"><i data-lucide="trash-2"></i>Limpiar</button>
      `
    });

    $('#confirmReset')?.addEventListener('click', () => {
      resetAllData();
      toast({ title:'Datos eliminados', message:'Historial y proyectos han sido limpiados.', icon:'check-circle' });
      closeModal();
      renderHistorialTable();
      renderProyectosTable();
      resetWizard(true);
      setRoute('historial');
    });

    window.lucide?.createIcons();
  });

  window.lucide?.createIcons();
}
