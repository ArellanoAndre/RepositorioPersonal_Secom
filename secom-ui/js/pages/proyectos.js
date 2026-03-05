import { $, debounce, formatCurrencyMXN, formatDateTime, openModal, closeModal, toast } from '../utils.js';
import { escapeHtml, escapeAttr } from '../core/escape.js';
import { getProjects, getQuotes, saveProjectFromQuote, saveProject, updateProject, updateQuote, removeProject } from '../storage.js';

export function renderProyectosRoute(){
  const root = $('#route-proyectos');
  if (!root) return;

  root.innerHTML = `
    <div class="card">
      <div class="row" style="align-items:center">
        <div style="flex:1">
          <div class="card__title">Proyectos</div>
          <div class="card__subtitle">Gestión de proyectos</div>
        </div>
        <button class="btn btn--primary" id="btnNewProject"><i data-lucide="plus"></i>Agregar proyecto</button>
        <div class="field" style="max-width:320px">
          <label>Buscar</label>
          <input id="projSearch" placeholder="Cliente, estatus o No. de servicio" />
        </div>
      </div>

      <div style="overflow:auto; margin-top:10px">
        <table class="table" id="proyectosTable">
          <thead>
            <tr>
              <th>ID</th>
              <th>Cliente</th>
              <th>No. de servicio</th>
              <th>Potencia</th>
              <th>Inversión</th>
              <th>Estatus</th>
              <th style="text-align:right">Acciones</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </div>
  `;

  $('#projSearch')?.addEventListener('input', debounce(renderProyectosTable, 120));
  $('#btnNewProject')?.addEventListener('click', () => openProjectEditor());
  renderProyectosTable();
  window.lucide?.createIcons();
}

export function renderProyectosTable(){
  const tbody = $('#proyectosTable tbody');
  if (!tbody) return;

  const term = ($('#projSearch')?.value || '').toLowerCase().trim();
  const projects = getProjects();
  const filtered = term ? projects.filter(p => {
    const c = (p.client?.nombre || p.receipt?.nombre || '').toLowerCase();
    const s = (p.receipt?.servicio || '').toLowerCase();
    const st = (p.status || '').toLowerCase();
    return c.includes(term) || s.includes(term) || st.includes(term) || (p.id||'').toLowerCase().includes(term);
  }) : projects;

  tbody.innerHTML = filtered.length ? filtered.map(p => {
    return `
      <tr>
        <td>${escapeHtml(p.id)}</td>
        <td>${escapeHtml(p.client?.nombre || p.receipt?.nombre || '-')}</td>
        <td>${escapeHtml(p.receipt?.servicio || '-')}</td>
        <td>${Number(p.quote?.kwp || 0).toFixed(2)} kWp</td>
        <td>${formatCurrencyMXN(p.quote?.inversion || 0)}</td>
        <td><span class="badge badge--success">${escapeHtml(p.status || '—')}</span></td>
        <td>
          <div class="actions">
            <button class="btn" data-action="view" data-id="${p.id}"><i data-lucide="eye"></i>Ver</button>
            <button class="btn" data-action="edit" data-id="${p.id}"><i data-lucide="pencil"></i>Editar</button>
            <button class="btn" data-action="status" data-id="${p.id}"><i data-lucide="refresh-cw"></i>Estatus</button>
            <button class="btn btn--danger" data-action="delete" data-id="${p.id}"><i data-lucide="trash-2"></i>Eliminar</button>
          </div>
        </td>
      </tr>
    `;
  }).join('') : `
    <tr><td colspan="7" style="color:var(--muted)">Aún no hay proyectos confirmados.</td></tr>
  `;

  window.lucide?.createIcons();

  tbody.querySelectorAll('button[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      const p = getProjects().find(x => x.id === id);
      if (!p) return;

      if (action === 'view') openModalForProject(p);
      else if (action === 'edit') openProjectEditor(p);
      else if (action === 'status') openStatusPicker(p);
      else if (action === 'delete') confirmDeleteProject(p);
    });
  });
}

function confirmDeleteProject(p){
  openModal({
    title: 'Eliminar proyecto',
    subtitle: p.id,
    bodyHtml: `<div class="help">Se eliminará el proyecto <b>${escapeHtml(p.id)}</b>. Esta acción no se puede deshacer.</div>`,
    footHtml: `
      <button class="btn" data-close="true"><i data-lucide="x"></i>Cancelar</button>
      <button class="btn btn--danger" id="btnDelProj"><i data-lucide="trash-2"></i>Eliminar</button>
    `
  });

  $('#btnDelProj')?.addEventListener('click', () => {
    removeProject(p.id);
    toast({ title:'Proyecto eliminado', message:p.id, icon:'trash-2' });
    closeModal();
    renderProyectosTable();
  });
  window.lucide?.createIcons();
}

function openProjectEditor(project=null){
  const isEdit = Boolean(project);
  const quotes = getQuotes();

  const qOptions = quotes.map(q => {
    const cliente = q.client?.nombre || q.receipt?.nombre || 'Cliente';
    const total = formatCurrencyMXN(q.receipt?.totalAPagar || 0);
    return `<option value="${escapeAttr(q.id)}">${escapeHtml(q.id)} · ${escapeHtml(cliente)} · ${total}</option>`;
  }).join('');

  const p = project || {};

  const body = `
    <div class="grid cols-2">
      <div class="field" style="grid-column: span 2">
        <label>Cotización asociada (opcional)</label>
        <select id="pfQuote" ${isEdit ? 'disabled' : ''}>
          <option value="">Sin cotización</option>
          ${qOptions}
        </select>
        <div class="help" style="margin-top:6px">Si seleccionas una cotización, los datos se cargarán automáticamente.</div>
      </div>

      <div class="field">
        <label>Cliente</label>
        <input id="pfCliente" value="${escapeAttr(p.client?.nombre || p.receipt?.nombre || '')}" placeholder="Nombre del cliente" />
      </div>
      <div class="field">
        <label>No. de servicio</label>
        <input id="pfServicio" value="${escapeAttr(p.receipt?.servicio || '')}" placeholder="###########" />
      </div>

      <div class="field">
        <label>Potencia (kWp)</label>
        <input id="pfKwp" type="number" step="0.01" min="0" value="${escapeAttr(String(p.quote?.kwp || 0))}" />
      </div>
      <div class="field">
        <label>Inversión (MXN)</label>
        <input id="pfInv" type="number" step="1" min="0" value="${escapeAttr(String(p.quote?.inversion || 0))}" />
      </div>

      <div class="field" style="grid-column: span 2">
        <label>Estatus</label>
        <select id="pfStatus">
          ${['En planeación','En instalación','En trámite','Completado','Pausado'].map(s => `<option ${p.status===s?'selected':''}>${escapeHtml(s)}</option>`).join('')}
        </select>
      </div>

      <div class="field" style="grid-column: span 2">
        <label>Notas</label>
        <textarea id="pfNotes" rows="3" placeholder="Notas del proyecto">${escapeHtml(p.notes || '')}</textarea>
      </div>
    </div>
  `;

  openModal({
    title: isEdit ? 'Editar proyecto' : 'Agregar proyecto',
    subtitle: isEdit ? p.id : 'Completa la información',
    bodyHtml: body,
    footHtml: `
      <button class="btn" data-close="true"><i data-lucide="x"></i>Cancelar</button>
      <button class="btn btn--primary" id="pfSave"><i data-lucide="save"></i>Guardar</button>
    `
  });

  const applyFromQuote = (qid) => {
    const q = quotes.find(x => x.id === qid);
    if (!q) return;
    $('#pfCliente').value = q.client?.nombre || q.receipt?.nombre || '';
    $('#pfServicio').value = q.receipt?.servicio || '';
    $('#pfKwp').value = Number(q.quote?.kwp || 0).toFixed(2);
    $('#pfInv').value = Math.round(Number(q.quote?.inversion || 0));
  };

  $('#pfQuote')?.addEventListener('change', (e) => {
    const qid = e.target.value;
    if (qid) applyFromQuote(qid);
  });

  $('#pfSave')?.addEventListener('click', () => {
    const qid = $('#pfQuote')?.value || '';
    const status = $('#pfStatus').value;
    const notes = $('#pfNotes').value.trim();
    const cliente = $('#pfCliente').value.trim();
    const servicio = $('#pfServicio').value.trim();
    const kwp = Number($('#pfKwp').value || 0);
    const inv = Number($('#pfInv').value || 0);

    if (!cliente){
      toast({ title:'Falta información', message:'Captura el nombre del cliente.', icon:'alert-triangle' });
      return;
    }

    if (isEdit){
      updateProject(p.id, {
        status,
        notes,
        client: { ...(p.client||{}), nombre: cliente },
        receipt: { ...(p.receipt||{}), servicio },
        quote: { ...(p.quote||{}), kwp, inversion: inv },
      });
      toast({ title:'Proyecto actualizado', message:p.id, icon:'check-circle' });
      closeModal();
      renderProyectosTable();
      return;
    }

    let created;
    if (qid){
      const q = quotes.find(x => x.id === qid);
      if (!q){
        toast({ title:'Cotización no encontrada', message:'Selecciona una cotización válida.', icon:'alert-triangle' });
        return;
      }
      created = saveProjectFromQuote({ ...q, status });
      updateProject(created.id, { status, notes });
      updateQuote(q.id, { status: q.status });
    } else {
      created = saveProject({
        status,
        notes,
        client: { nombre: cliente },
        receipt: { servicio },
        quote: { kwp, inversion: inv },
      });
    }

    toast({ title:'Proyecto guardado', message:created.id, icon:'briefcase' });
    closeModal();
    renderProyectosTable();
  });

  window.lucide?.createIcons();
}

function openModalForProject(p){
  const r = p.receipt || {};
  const c = p.client || {};

  const body = `
    <div class="grid cols-2">
      <div class="card" style="box-shadow:none">
        <div class="card__title">Cliente</div>
        <div class="help"><b>${escapeHtml(c.nombre || r.nombre || '-')}</b></div>
        <div class="help">${escapeHtml(c.telefono || '-')} · ${escapeHtml(c.email || '-')}</div>
        <div class="help" style="margin-top:8px">${escapeHtml(c.direccion || r.direccion || '-')}</div>
      </div>
      <div class="card" style="box-shadow:none">
        <div class="card__title">Sistema</div>
        <div class="help">Potencia: <b>${Number(p.quote?.kwp || 0).toFixed(2)} kWp</b></div>
        <div class="help">Paneles: <b>${escapeHtml(p.quote?.paneles || '—')}</b></div>
        <div class="help">Inversión: <b>${formatCurrencyMXN(p.quote?.inversion || 0)}</b></div>
        <div class="help">Ahorro mensual: <b>${formatCurrencyMXN(p.quote?.ahorroMensual || 0)}</b></div>
      </div>
    </div>

    <div class="card" style="box-shadow:none; margin-top:12px">
      <div class="card__title">Recibo</div>
      <div class="row">
        <div class="kpi" style="flex:1">
          <div class="kpi__label">No. de servicio</div>
          <div class="kpi__value" style="font-size:13px">${escapeHtml(r.servicio || '-')}</div>
        </div>
        <div class="kpi" style="flex:1">
          <div class="kpi__label">Tarifa</div>
          <div class="kpi__value" style="font-size:13px">${escapeHtml(r.tarifa || '-')}</div>
        </div>
        <div class="kpi" style="flex:1">
          <div class="kpi__label">Total</div>
          <div class="kpi__value" style="font-size:13px">${formatCurrencyMXN(r.totalAPagar || 0)}</div>
        </div>
      </div>
    </div>
  `;

  openModal({
    title: p.id,
    subtitle: `Creado ${formatDateTime(p.createdAt)} · Estatus: ${p.status}`,
    bodyHtml: body,
    footHtml: `
      <button class="btn" data-close="true"><i data-lucide="x"></i>Cerrar</button>
      <button class="btn" id="pStatus"><i data-lucide="refresh-cw"></i>Cambiar estatus</button>
    `
  });

  $('#pStatus')?.addEventListener('click', () => openStatusPicker(p));
  window.lucide?.createIcons();
}

function openStatusPicker(p){
  const options = ['En planeación', 'En instalación', 'En trámite', 'Completado', 'Pausado'];
  const body = `
    <div class="help">Selecciona el nuevo estatus para el proyecto <b>${escapeHtml(p.id)}</b>.</div>
    <div class="grid" style="margin-top:12px">
      ${options.map(o => `
        <button class="btn" data-status="${escapeAttr(o)}" style="justify-content:flex-start">
          <i data-lucide="dot"></i>${escapeHtml(o)}
        </button>
      `).join('')}
    </div>
  `;

  openModal({
    title: 'Cambiar estatus',
    subtitle: escapeHtml(p.client?.nombre || p.receipt?.nombre || ''),
    bodyHtml: body,
    footHtml: `<button class="btn" data-close="true"><i data-lucide="x"></i>Cerrar</button>`
  });

  document.querySelectorAll('[data-status]').forEach(btn => {
    btn.addEventListener('click', () => {
      const status = btn.dataset.status;
      updateProject(p.id, { status });
      toast({ title:'Estatus actualizado', message:`${p.id} · ${status}`, icon:'check-circle' });
      closeModal();
      renderProyectosTable();
    });
  });

  window.lucide?.createIcons();
}
