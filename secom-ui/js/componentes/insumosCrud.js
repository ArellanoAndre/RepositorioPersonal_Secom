import { $, toast, openModal, closeModal, formatCurrencyMXN } from '../utils.js';
import { escapeAttr, escapeHtml } from '../core/escape.js';
import { state } from '../core/state.js';
import { INSUMO_CATALOG } from '../config/constants.js';
import { computeQuote } from '../quoteEngine.js';

function toNumber(v){
  const x = Number(String(v ?? '').replace(/,/g,'').trim());
  return Number.isFinite(x) ? x : 0;
}

export function normalizeInsumo(it){
  const meta = it?.meta && typeof it.meta === 'object' ? it.meta : null;
  return {
    codigo: String(it?.codigo ?? '').trim(),
    descripcion: String(it?.descripcion ?? '').trim(),
    cantidad: Math.max(0, toNumber(it?.cantidad ?? 1)),
    unidad: String(it?.unidad ?? 'UD').trim() || 'UD',
    precio: Math.max(0, toNumber(it?.precio ?? 0)),
    meta,
  };
}

export function calcInsumoTotal(it){
  const x = normalizeInsumo(it);
  return Math.round((x.cantidad * x.precio) * 100) / 100;
}

export function computeInsumosTotals(receipt){
  const r = receipt || {};
  const ins = Array.isArray(r.insumos) ? r.insumos : [];
  const subtotal = ins.reduce((acc, it) => acc + calcInsumoTotal(it), 0);
  const pct = Number.isFinite(Number(r.impuestosPct)) ? Number(r.impuestosPct) : 0.16;
  const impuestos = subtotal * pct;
  const total = subtotal + impuestos;
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    impuestos: Math.round(impuestos * 100) / 100,
    total: Math.round(total * 100) / 100,
    pct,
  };
}

export function panelResumenDesdeInsumos(receipt, panelWattsFallback=550){
  const insumos = Array.isArray(receipt?.insumos) ? receipt.insumos : [];
  const panelRows = insumos.filter(it => (it?.meta?.kind === 'panel') || String(it?.codigo||'').toUpperCase() === 'PV');
  if (!panelRows.length) return '';

  const map = new Map();
  for (const it of panelRows){
    const cant = Math.round(toNumber(it?.cantidad || 0));
    if (cant <= 0) continue;
    const watts = Math.round(toNumber(it?.meta?.watts || it?.watts || panelWattsFallback || 0));
    const medidas = String(it?.meta?.medidas || it?.medidas || '').trim();
    const key = `${watts}|${medidas}`;
    const prev = map.get(key) || { cant:0, watts, medidas };
    prev.cant += cant;
    map.set(key, prev);
  }

  return Array.from(map.values()).map(x => {
    const base = `${x.cant} panel${x.cant === 1 ? '' : 'es'} de ${x.watts || '—'} W`;
    return x.medidas ? `${base} (${x.medidas})` : base;
  }).join(' · ');
}

export function syncPanelOverridesFromInsumos(){
  const r = state.receipt || {};
  const ins = Array.isArray(r.insumos) ? r.insumos : [];
  const panelRows = ins
    .map(normalizeInsumo)
    .filter(it => it?.meta?.kind === 'panel' && Number(it.cantidad) > 0);

  if (!panelRows.length){
    state.overrides.paneles = null;
    state.quoteMeta.panelResumen = '';
    return;
  }

  const totalPaneles = panelRows.reduce((a, it) => a + Number(it.cantidad || 0), 0);
  const totalWatts = panelRows.reduce((a, it) => a + (Number(it.meta?.watts || 0) * Number(it.cantidad || 0)), 0);
  const avgWatts = totalPaneles > 0 ? Math.round(totalWatts / totalPaneles) : null;

  state.overrides.paneles = Math.round(totalPaneles);
  if (avgWatts && Number.isFinite(avgWatts) && avgWatts > 0){
    state.params.panelWatts = avgWatts;
  }

  // Resumen y dimensiones
  state.quoteMeta.panelResumen = panelResumenDesdeInsumos(r, state.params.panelWatts || 550);
  const dims = panelRows.map(it => it.meta?.medidas).filter(Boolean);
  state.quoteMeta.panelDimensiones = dims.length ? Array.from(new Set(dims)).join(' · ') : (state.quoteMeta.panelDimensiones || '');
}

function renderInsumoRow(it, i){
  const x = normalizeInsumo(it);
  const total = calcInsumoTotal(x);
  const unidades = ['UD','PZA','M','W','SERV'];
  const isPanel = x?.meta?.kind === 'panel' || String(x.codigo||'').toUpperCase() === 'PV';

  const actions = `
    <div class="tbl-actions">
      <button class="icon-btn icon-btn--sm" type="button" data-move="up" data-i="${i}" title="Subir"><i data-lucide="arrow-up"></i></button>
      <button class="icon-btn icon-btn--sm" type="button" data-move="down" data-i="${i}" title="Bajar"><i data-lucide="arrow-down"></i></button>
      ${isPanel ? `<button class="icon-btn icon-btn--sm" type="button" data-dup="${i}" title="Duplicar"><i data-lucide="copy"></i></button>` : ''}
      ${isPanel ? `<button class="icon-btn icon-btn--sm" type="button" data-split="${i}" title="Desglosar (1 por fila)"><i data-lucide="git-branch"></i></button>` : ''}
      <button class="icon-btn icon-btn--sm" type="button" data-del="${i}" title="Eliminar"><i data-lucide="trash-2"></i></button>
    </div>
  `;

  return `
    <tr data-i="${i}">
      <td>
        <div class="tbl-code">
          <input class="tbl-input" data-field="codigo" value="${escapeAttr(x.codigo)}" placeholder="P1" />
          ${actions}
        </div>
      </td>
      <td>
        <div class="tbl-desc">
          <input class="tbl-input" data-field="descripcion" value="${escapeAttr(x.descripcion)}" placeholder="Descripción" />
          ${isPanel ? `<button class="icon-btn icon-btn--sm" type="button" data-panel="${i}" title="Detalles del panel"><i data-lucide="ruler"></i></button>` : ''}
        </div>
      </td>
      <td><input class="tbl-input" data-field="cantidad" type="number" min="0" step="1" value="${escapeAttr(String(x.cantidad))}" /></td>
      <td>
        <select class="tbl-select" data-field="unidad">
          ${unidades.map(u => `<option ${u===x.unidad?'selected':''}>${escapeHtml(u)}</option>`).join('')}
        </select>
      </td>
      <td><input class="tbl-input" data-field="precio" type="number" min="0" step="0.01" value="${escapeAttr(String(x.precio))}" /></td>
      <td><div class="tbl-total" data-total>${formatCurrencyMXN(total)}</div></td>
    </tr>
  `;
}

export function setupInsumosCrud({ onTotalsUpdated } = {}){
  const r = state.receipt;
  if (!r) return;

  r.insumos = Array.isArray(r.insumos) ? r.insumos : [];
  r.impuestosPct = Number.isFinite(Number(r.impuestosPct)) ? Number(r.impuestosPct) : 0.16;

  const tbody = $('#insTable tbody');
  if (!tbody) return;

  const renderBody = () => {
    const ins = r.insumos;
    tbody.innerHTML = ins.length
      ? ins.map((it, i) => renderInsumoRow(it, i)).join('')
      : `<tr><td colspan="6" style="color:var(--muted)">Aún no hay insumos agregados.</td></tr>`;

    window.lucide?.createIcons();
    updateTotalsUI();
  };

  const updateTotalsUI = () => {
    const t = computeInsumosTotals(r);
    $('#insSubtotal') && ($('#insSubtotal').textContent = formatCurrencyMXN(t.subtotal));
    $('#insTaxes') && ($('#insTaxes').textContent = formatCurrencyMXN(t.impuestos));
    $('#insTotal') && ($('#insTotal').textContent = formatCurrencyMXN(t.total));

    syncPanelOverridesFromInsumos();

    const q = computeQuote(r, state.client, state.params, state.overrides);
    const kpi = $('#kpiQuoteTotal');
    if (kpi) kpi.textContent = formatCurrencyMXN(q.inversion || 0);

    onTotalsUpdated?.({ totals: t, quote: q });
  };

  const readRow = (tr) => {
    const idx = Number(tr?.dataset?.i);
    if (!Number.isFinite(idx)) return null;
    const current = r.insumos[idx] || {};
    const read = (field) => tr.querySelector(`[data-field="${field}"]`);
    const codigo = read('codigo')?.value ?? '';
    const descripcion = read('descripcion')?.value ?? '';
    const cantidad = toNumber(read('cantidad')?.value ?? 0);
    const unidad = read('unidad')?.value ?? 'UD';
    const precio = toNumber(read('precio')?.value ?? 0);

    r.insumos[idx] = normalizeInsumo({ ...current, codigo, descripcion, cantidad, unidad, precio });

    const total = calcInsumoTotal(r.insumos[idx]);
    tr.querySelector('[data-total]') && (tr.querySelector('[data-total]').textContent = formatCurrencyMXN(total));

    return idx;
  };

  // Inicial
  updateTotalsUI();

  $('#btnAddCatalog')?.addEventListener('click', () => {
    const sel = $('#insCatalog');
    if (!sel || sel.value === ''){
      toast({ title:'Selecciona un insumo', message:'Elige un insumo del catálogo para agregar.', icon:'alert-triangle' });
      return;
    }
    const idx = Number(sel.value);
    const base = INSUMO_CATALOG[idx];
    if (!base) return;

    r.insumos.push({
      codigo: base.codigo,
      descripcion: base.descripcion,
      cantidad: 1,
      unidad: base.unidad,
      precio: base.precio,
      meta: base.meta ? { ...base.meta } : null,
    });
    sel.value = '';
    state.quote = null;
    renderBody();
  });

  $('#btnAddManual')?.addEventListener('click', () => {
    r.insumos.push({ codigo: '', descripcion: '', cantidad: 1, unidad: 'UD', precio: 0 });
    state.quote = null;
    renderBody();
  });

  $('#insTaxPct')?.addEventListener('input', () => {
    const n = toNumber($('#insTaxPct').value);
    const pct = Number.isFinite(n) ? Math.max(0, Math.min(30, n)) / 100 : 0.16;
    r.impuestosPct = pct;
    state.quote = null;
    updateTotalsUI();
  });

  tbody.addEventListener('input', (e) => {
    const tr = e.target.closest('tr[data-i]');
    if (!tr) return;
    readRow(tr);
    state.quote = null;
    updateTotalsUI();
  });

  tbody.addEventListener('change', (e) => {
    const tr = e.target.closest('tr[data-i]');
    if (!tr) return;
    readRow(tr);
    state.quote = null;
    updateTotalsUI();
  });

  tbody.addEventListener('click', (e) => {
    const del = e.target.closest('[data-del]');
    if (del){
      const idx = Number(del.dataset.del);
      if (!Number.isFinite(idx)) return;
      r.insumos.splice(idx, 1);
      state.quote = null;
      renderBody();
      return;
    }

    const move = e.target.closest('[data-move]');
    if (move){
      const dir = move.dataset.move;
      const idx = Number(move.dataset.i);
      if (!Number.isFinite(idx)) return;
      const j = dir === 'up' ? idx - 1 : idx + 1;
      if (j < 0 || j >= r.insumos.length) return;
      const tmp = r.insumos[idx];
      r.insumos[idx] = r.insumos[j];
      r.insumos[j] = tmp;
      state.quote = null;
      renderBody();
      return;
    }

    const dup = e.target.closest('[data-dup]');
    if (dup){
      const idx = Number(dup.dataset.dup);
      if (!Number.isFinite(idx)) return;
      const cur = normalizeInsumo(r.insumos[idx] || {});
      if (cur?.meta?.kind !== 'panel') return;
      r.insumos.splice(idx + 1, 0, {
        ...cur,
        meta: cur.meta ? { ...cur.meta } : null,
      });
      state.quote = null;
      renderBody();
      return;
    }

    const split = e.target.closest('[data-split]');
    if (split){
      const idx = Number(split.dataset.split);
      if (!Number.isFinite(idx)) return;
      const cur = normalizeInsumo(r.insumos[idx] || {});
      if (cur?.meta?.kind !== 'panel') return;
      const n = Math.round(cur.cantidad);
      if (n <= 1){
        toast({ title:'Nada que desglosar', message:'La cantidad debe ser mayor a 1.', icon:'info' });
        return;
      }
      const rows = Array.from({ length: n }).map(() => ({
        ...cur,
        cantidad: 1,
        meta: cur.meta ? { ...cur.meta } : null,
      }));
      r.insumos.splice(idx, 1, ...rows);
      state.quote = null;
      renderBody();
      return;
    }

    const pnl = e.target.closest('[data-panel]');
    if (pnl){
      const idx = Number(pnl.dataset.panel);
      if (!Number.isFinite(idx)) return;
      const current = normalizeInsumo(r.insumos[idx] || {});
      if (current?.meta?.kind !== 'panel') return;

      openModal({
        title: 'Detalles del panel',
        subtitle: current.descripcion || 'Panel fotovoltaico',
        bodyHtml: `
          <div class="grid cols-2">
            <div class="field">
              <label>Potencia (W)</label>
              <input id="pWatts" type="number" min="1" step="1" value="${escapeAttr(String(current.meta?.watts || 550))}" />
            </div>
            <div class="field">
              <label>Medidas (ej. 3 x 2 m)</label>
              <input id="pDims" value="${escapeAttr(String(current.meta?.medidas || ''))}" placeholder="2.2 x 1.1 m" />
            </div>
            <div class="field" style="grid-column: span 2">
              <label>Descripción</label>
              <div class="help">Al guardar se ajusta automáticamente. Puedes editarla después si lo deseas.</div>
            </div>
          </div>
        `,
        footHtml: `
          <button class="btn" data-close="true"><i data-lucide="x"></i>Cancelar</button>
          <button class="btn btn--primary" id="btnSavePanel"><i data-lucide="save"></i>Guardar</button>
        `
      });
      window.lucide?.createIcons();

      $('#btnSavePanel')?.addEventListener('click', () => {
        const watts = Math.round(toNumber($('#pWatts')?.value || 0));
        const dims = ($('#pDims')?.value || '').trim();
        const meta = { ...(current.meta || {}), kind:'panel', watts: (watts > 0 ? watts : 550), medidas: dims };
        const desc = `Módulo fotovoltaico ${meta.watts} W${meta.medidas ? ` (${meta.medidas})` : ''}`;
        r.insumos[idx] = { ...current, meta, descripcion: desc };
        closeModal();
        state.quote = null;
        renderBody();
      });
      return;
    }
  });

  renderBody();
}
