import { $, debounce, formatCurrencyMXN, formatDateTime, openModal, closeModal, toast } from '../utils.js';
import { escapeHtml, escapeAttr } from '../core/escape.js';
import { QUOTE_STATUSES, TARIFFS } from '../config/constants.js';
import { getQuotes, updateQuote, saveProjectFromQuote, getProjects } from '../storage.js';
import { setRoute } from '../core/router.js';
import { startNewQuoteFlow, loadQuoteForEditing } from '../cotizador/cotizador.js';
import { exportPdfFromStoredQuote } from '../cotizador/exportar.js';
import { renderProyectosTable } from './proyectos.js';

export function renderHistorialRoute(){
  const root = $('#route-historial');
  if (!root) return;

  root.innerHTML = `
    <div class="grid" style="gap:14px">
      <div class="card">
        <div class="row" style="align-items:center; gap:12px">
          <div style="flex:1">
            <div class="card__title">Lista de cotizaciones</div>
            <div class="card__subtitle">Búsqueda y acciones rápidas</div>
          </div>
          <button class="btn btn--primary" id="btnNewQuoteFromList"><i data-lucide="plus"></i>Crear cotización</button>
          <div class="field" style="max-width:320px">
            <label>Buscar</label>
            <input id="histSearch" placeholder="Cliente, tarifa o No. de servicio" />
          </div>
        </div>

        <div style="overflow:auto; margin-top:10px">
          <table class="table" id="historialTable">
            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th>Tarifa</th>
                <th>Periodo</th>
                <th>Total</th>
                <th>Estatus</th>
                <th style="text-align:right">Acciones</th>
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  $('#btnNewQuoteFromList')?.addEventListener('click', () => {
    startNewQuoteFlow();
    setRoute('cotizador');
  });

  $('#histSearch')?.addEventListener('input', debounce(renderHistorialTable, 120));

  renderHistorialTable();
  window.lucide?.createIcons();
}

export function renderHistorialTable(){
  const tbody = $('#historialTable tbody');
  if (!tbody) return;

  const term = ($('#histSearch')?.value || '').toLowerCase().trim();
  const quotes = getQuotes();

  const filtered = term ? quotes.filter(q => {
    const c = (q.client?.nombre || q.receipt?.nombre || '').toLowerCase();
    const t = (q.receipt?.tarifa || '').toLowerCase();
    const s = (q.receipt?.servicio || '').toLowerCase();
    return c.includes(term) || t.includes(term) || s.includes(term) || (q.id||'').toLowerCase().includes(term);
  }) : quotes;

  tbody.innerHTML = filtered.length ? filtered.map(q => {
    const status = q.status || 'En proceso';
    const periodo = q.receipt?.periodo?.raw || '';
    const total = Number(q.quote?.inversion || q.quote?.totalInsumos || q.receipt?.totalAPagar || 0);

    return `
      <tr>
        <td>${escapeHtml(q.id)}</td>
        <td>${escapeHtml(q.client?.nombre || q.receipt?.nombre || '-')}</td>
        <td>${escapeHtml(q.receipt?.tarifa || '-')}</td>
        <td>${escapeHtml(periodo || '-')}</td>
        <td>${formatCurrencyMXN(total)}</td>
        <td>
          <select class="status-select" data-qstatus="${escapeAttr(q.id)}">
            ${QUOTE_STATUSES.map(s => `<option ${s===status?'selected':''}>${escapeHtml(s)}</option>`).join('')}
          </select>
        </td>
        <td>
          <div class="actions">
            <button class="btn" data-action="view" data-id="${q.id}"><i data-lucide="eye"></i>Ver</button>
            <button class="btn" data-action="edit" data-id="${q.id}"><i data-lucide="pencil"></i>Editar</button>
            <button class="btn" data-action="export" data-id="${q.id}"><i data-lucide="download"></i>PDF</button>
            <button class="btn" data-action="confirm" data-id="${q.id}"><i data-lucide="check"></i>Proyecto</button>
          </div>
        </td>
      </tr>
    `;
  }).join('') : `
    <tr><td colspan="7" style="color:var(--muted)">Aún no hay cotizaciones guardadas.</td></tr>
  `;

  window.lucide?.createIcons();

  tbody.querySelectorAll('button[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      const q = getQuotes().find(x => x.id === id);
      if (!q) return;

      if (action === 'view'){
        openModalForQuote(q);
      } else if (action === 'edit'){
        loadQuoteForEditing(q);
        setRoute('cotizador');
        toast({ title:'Edición', message:`Cotización ${q.id} cargada.`, icon:'pencil' });
      } else if (action === 'export'){
        exportPdfFromStoredQuote(q);
      } else if (action === 'confirm'){
        const project = saveProjectFromQuote({ ...q, status:'Proyecto' });
        updateQuote(q.id, { status:'Proyecto' });
        toast({ title:'Proyecto confirmado', message:`Se agregó a Proyectos (${project.id}).`, icon:'check' });
        renderHistorialTable();
        renderProyectosTable();
        setRoute('proyectos');
      }
    });
  });

  tbody.querySelectorAll('select[data-qstatus]').forEach(sel => {
    sel.addEventListener('change', () => {
      const id = sel.dataset.qstatus;
      const status = sel.value;
      updateQuote(id, { status });
      toast({ title:'Estatus actualizado', message:`${id} · ${status}`, icon:'check-circle' });
    });
  });
}

function openModalForQuote(q){
  const r = q.receipt || {};
  const c = q.client || {};

  const body = `
    <div class="grid cols-2">
      <div class="card" style="box-shadow:none">
        <div class="card__title">Cliente</div>
        <div class="help"><b>${escapeHtml(c.nombre || r.nombre || '-')}</b></div>
        <div class="help">${escapeHtml(c.telefono || '-')} · ${escapeHtml(c.email || '-')}</div>
        <div class="help" style="margin-top:8px">${escapeHtml(c.direccion || r.direccion || '-')}</div>
      </div>
      <div class="card" style="box-shadow:none">
        <div class="card__title">Recibo</div>
        <div class="help">No. de servicio: <b>${escapeHtml(r.servicio || '-')}</b></div>
        <div class="help">Tarifa: <b>${escapeHtml(r.tarifa || '-')}</b></div>
        <div class="help">Periodo: <b>${escapeHtml(r.periodo?.raw || '-')}</b></div>
        <div class="help">Total a pagar: <b>${formatCurrencyMXN(r.totalAPagar || 0)}</b></div>
      </div>
    </div>

    <div class="card" style="box-shadow:none; margin-top:12px">
      <div class="card__title">Resumen de cotización</div>
      <div class="row">
        <div class="kpi" style="flex:1">
          <div class="kpi__label">Potencia</div>
          <div class="kpi__value">${Number(q.quote?.kwp || 0).toFixed(2)} kWp</div>
        </div>
        <div class="kpi" style="flex:1">
          <div class="kpi__label">Paneles</div>
          <div class="kpi__value">${escapeHtml(q.quote?.paneles || '—')}</div>
        </div>
        <div class="kpi" style="flex:1">
          <div class="kpi__label">Inversión</div>
          <div class="kpi__value">${formatCurrencyMXN(q.quote?.inversion || 0)}</div>
        </div>
      </div>
    </div>
  `;

  openModal({
    title: q.id,
    subtitle: `Creada ${formatDateTime(q.createdAt)} · Estatus: ${q.status}`,
    bodyHtml: body,
    footHtml: `
      <button class="btn" data-close="true"><i data-lucide="x"></i>Cerrar</button>
      <button class="btn" id="mEdit"><i data-lucide="pencil"></i>Editar</button>
      <button class="btn" id="mExport"><i data-lucide="download"></i>PDF</button>
      <button class="btn btn--success" id="mProject"><i data-lucide="check"></i>Proyecto</button>
    `
  });

  $('#mEdit')?.addEventListener('click', () => {
    closeModal();
    loadQuoteForEditing(q);
    setRoute('cotizador');
  });

  $('#mExport')?.addEventListener('click', () => exportPdfFromStoredQuote(q));

  $('#mProject')?.addEventListener('click', () => {
    const project = saveProjectFromQuote({ ...q, status:'Proyecto' });
    updateQuote(q.id, { status:'Proyecto' });
    toast({ title:'Proyecto creado', message:`Se agregó a Proyectos (${project.id}).`, icon:'check' });
    closeModal();
    renderHistorialTable();
    renderProyectosTable();
    setRoute('proyectos');
  });

  window.lucide?.createIcons();
}
