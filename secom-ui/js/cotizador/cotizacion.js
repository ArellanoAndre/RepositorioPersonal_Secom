import { $, debounce, formatCurrencyMXN, formatNumber, toast } from '../utils.js';
import { escapeAttr, escapeHtml } from '../core/escape.js';
import { state } from '../core/state.js';
import { computeQuote } from '../quoteEngine.js';
import { syncPanelOverridesFromInsumos } from '../componentes/insumosCrud.js';

export function renderCotizacion(){
  syncPanelOverridesFromInsumos();
  const q = state.quote || computeQuote(state.receipt, state.client, state.params, state.overrides);
  state.quote = q;

  const meta = state.quoteMeta || {};
  const panelResumen = meta.panelResumen || '';

  return {
    left: `
      <div class="card__title">Cotización</div>
      <div class="help">Ajusta parámetros y consideraciones físicas. Los resultados se actualizan al instante.</div>

      <div class="grid cols-3" style="margin-top:12px">
        <div class="kpi">
          <div class="kpi__label">Potencia estimada</div>
          <div class="kpi__value" id="kpiKwp">${q.kwp.toFixed(2)} kWp</div>
        </div>
        <div class="kpi">
          <div class="kpi__label">Paneles</div>
          <div class="kpi__value" id="kpiPaneles" style="font-size:13px">${panelResumen ? escapeHtml(panelResumen) : formatNumber(q.paneles)}</div>
          <div class="help" style="margin-top:6px">Recomendado: <b id="kpiRecomendado">${q.panelesAuto}</b></div>
        </div>
        <div class="kpi">
          <div class="kpi__label">Inversión</div>
          <div class="kpi__value" id="kpiInv">${formatCurrencyMXN(q.inversion)}</div>
        </div>
      </div>

      <div class="grid cols-3" style="margin-top:10px">
        <div class="kpi">
          <div class="kpi__label">Ahorro mensual</div>
          <div class="kpi__value" id="kpiAhorro">${formatCurrencyMXN(q.ahorroMensual)}</div>
        </div>
        <div class="kpi">
          <div class="kpi__label">Retorno</div>
          <div class="kpi__value" id="kpiRetorno">${q.retornoAnios ? `${q.retornoAnios} años` : '—'}</div>
        </div>
        <div class="kpi">
          <div class="kpi__label">Producción</div>
          <div class="kpi__value" id="kpiProd">${formatNumber(q.produccionMensual)} kWh/mes</div>
        </div>
      </div>

      <div class="card__subtitle" style="margin-top:14px">Parámetros</div>

      <div class="row">
        <div class="field">
          <label>Producción promedio</label>
          <input id="pYield" type="number" min="60" max="220" step="1" value="${q.params.yieldKwhPerKwpMonth}" />
        </div>
        <div class="field">
          <label>Panel (W)</label>
          <input id="pPanel" type="number" min="350" max="700" step="10" value="${q.params.panelWatts}" />
        </div>
        <div class="field">
          <label>Costo por kWp (MXN)</label>
          <input id="pCost" type="number" min="12000" max="60000" step="500" value="${q.params.costPerKwp}" />
        </div>
      </div>

      <div class="row" style="margin-top:10px">
        <div class="field">
          <label>Contingencia</label>
          <input id="pCont" type="number" min="0" max="0.2" step="0.01" value="${q.params.contingencyPct}" />
        </div>
        <div class="field">
          <label>Consumo mensual usado</label>
          <input id="kpiConsumoMensual" value="${formatNumber(q.consumoMensual)} kWh/mes" disabled />
        </div>
        <div class="field">
          <label>Pago promedio</label>
          <input id="kpiPagoProm" value="${formatCurrencyMXN(q.pagoProm)}" disabled />
        </div>
      </div>

      <div class="card__subtitle" style="margin-top:14px">Sistema propuesto</div>

      <div class="row" style="margin-top:10px">
        <div class="field" style="flex:1.4">
          <label>Modelo de panel</label>
          <input id="mPanelModelo" placeholder="Ej. Canadian Solar 615W" value="${escapeAttr(meta.panelModelo || '')}" />
        </div>
        <div class="field" style="flex:1">
          <label>Modelo de inversor</label>
          <input id="mInversor" placeholder="Ej. Huawei" value="${escapeAttr(meta.inversorModelo || '')}" />
        </div>
      </div>

      <div class="row" style="margin-top:10px">
        <div class="field">
          <label>Tipo de techo</label>
          <select id="mTecho">
            ${['No especificado','Losa','Lámina','Teja','Otro'].map(x => `<option ${x===meta.tipoTecho?'selected':''}>${escapeHtml(x)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Sombras</label>
          <select id="mSombras">
            <option value="0" ${Number(meta.perdidasSombraPct||0)===0?'selected':''}>Ninguna (0%)</option>
            <option value="0.10" ${Number(meta.perdidasSombraPct||0)===0.10?'selected':''}>Baja (10%)</option>
            <option value="0.20" ${Number(meta.perdidasSombraPct||0)===0.20?'selected':''}>Media (20%)</option>
            <option value="0.35" ${Number(meta.perdidasSombraPct||0)===0.35?'selected':''}>Alta (35%)</option>
          </select>
        </div>
      </div>

      <div class="field" style="margin-top:10px">
        <label>Consideraciones físicas (notas)</label>
        <textarea id="mNotasFisicas" rows="3" placeholder="Área disponible, orientación, sombras por estructuras, tipo de techo, etc.">${escapeHtml(meta.notasFisicas || '')}</textarea>
      </div>

      <div class="wizard-actions" style="justify-content:flex-end">
        <button class="btn" id="btnAutoPaneles"><i data-lucide="refresh-ccw"></i>Aplicar recomendación a paneles</button>
      </div>

      <div class="wizard-actions" style="justify-content:space-between">
        <button class="btn" id="btnBack3"><i data-lucide="arrow-left"></i>Volver</button>
        <button class="btn btn--success" id="btnNext3"><i data-lucide="arrow-right"></i>Generar cotización</button>
      </div>
    `,

    right: `
      <div class="card__title">Consumo vs. producción</div>
      <div class="help">Histórico del recibo y producción mensual estimada del sistema.</div>

      <div style="margin-top:12px">
        <canvas id="chart" height="180"></canvas>
      </div>

      <div class="card__subtitle" style="margin-top:12px">Detalle</div>
      <div style="overflow:auto">
        <table class="table" id="histTable">
          <thead>
            <tr>
              <th>#</th>
              <th>Consumo (kWh)</th>
              <th>Pago (MXN)</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    `,
  };
}

export function mountCotizacion({ gotoPaso }){
  if (!state.receipt){
    gotoPaso(1);
    return;
  }

  $('#btnBack3')?.addEventListener('click', () => gotoPaso(2));
  $('#btnNext3')?.addEventListener('click', () => gotoPaso(4));

  const recompute = () => {
    state.params.yieldKwhPerKwpMonth = Number($('#pYield').value || 135);
    state.params.panelWatts = Number($('#pPanel').value || 550);
    state.params.costPerKwp = Number($('#pCost').value || 22000);
    state.params.contingencyPct = Number($('#pCont').value || 0.06);

    syncPanelOverridesFromInsumos();

    state.quoteMeta.panelModelo = ($('#mPanelModelo')?.value || '').trim();
    state.quoteMeta.inversorModelo = ($('#mInversor')?.value || '').trim();
    state.quoteMeta.tipoTecho = ($('#mTecho')?.value || 'No especificado');
    state.quoteMeta.perdidasSombraPct = Number($('#mSombras')?.value || 0);
    state.quoteMeta.sombras = $('#mSombras')?.selectedOptions?.[0]?.textContent?.split('(')?.[0]?.trim() || 'No especificado';
    state.quoteMeta.notasFisicas = ($('#mNotasFisicas')?.value || '').trim();

    state.receipt.instalacion = {
      tipoTecho: state.quoteMeta.tipoTecho,
      perdidasSombraPct: state.quoteMeta.perdidasSombraPct,
      sombras: state.quoteMeta.sombras,
      notasFisicas: state.quoteMeta.notasFisicas,
      panelModelo: state.quoteMeta.panelModelo,
      panelDimensiones: state.quoteMeta.panelDimensiones,
      panelResumen: state.quoteMeta.panelResumen,
      inversorModelo: state.quoteMeta.inversorModelo,
    };

    state.quote = computeQuote(state.receipt, state.client, state.params, state.overrides);
    updateKpis();
    renderChart();
  };

  const onInput = debounce(recompute, 150);
  ['#pYield','#pPanel','#pCost','#pCont','#mPanelModelo','#mInversor','#mTecho','#mSombras','#mNotasFisicas']
    .forEach(id => $(id)?.addEventListener('input', onInput));

  $('#btnAutoPaneles')?.addEventListener('click', () => {
    const q = computeQuote(state.receipt, state.client, state.params, state.overrides);
    state.receipt.insumos = Array.isArray(state.receipt.insumos) ? state.receipt.insumos : [];

    const idx = state.receipt.insumos.findIndex(it => it?.meta?.kind === 'panel');
    if (idx === -1){
      state.receipt.insumos.unshift({
        codigo:'PV',
        descripcion:`Módulo fotovoltaico ${state.params.panelWatts} W`,
        cantidad:q.panelesAuto,
        unidad:'UD',
        precio:0,
        meta:{ kind:'panel', watts: state.params.panelWatts, medidas:'' }
      });
    } else {
      state.receipt.insumos[idx] = { ...state.receipt.insumos[idx], cantidad: q.panelesAuto };
    }

    syncPanelOverridesFromInsumos();
    state.quote = computeQuote(state.receipt, state.client, state.params, state.overrides);
    updateKpis();
    renderChart();
    toast({ title:'Recomendación aplicada', message:`Paneles recomendados: ${q.panelesAuto}`, icon:'check-circle' });
  });

  renderHistoryTable();
  renderChart();
}

function updateKpis(){
  const q = state.quote;
  if (!q) return;

  $('#kpiKwp').textContent = `${q.kwp.toFixed(2)} kWp`;
  $('#kpiInv').textContent = formatCurrencyMXN(q.inversion);
  $('#kpiAhorro').textContent = formatCurrencyMXN(q.ahorroMensual);
  $('#kpiRetorno').textContent = q.retornoAnios ? `${q.retornoAnios} años` : '—';
  $('#kpiProd').textContent = `${formatNumber(q.produccionMensual)} kWh/mes`;
  $('#kpiRecomendado').textContent = q.panelesAuto;

  const panelResumen = state.quoteMeta.panelResumen;
  $('#kpiPaneles').textContent = panelResumen ? panelResumen : formatNumber(q.paneles);

  $('#kpiConsumoMensual').value = `${formatNumber(q.consumoMensual)} kWh/mes`;
  $('#kpiPagoProm').value = formatCurrencyMXN(q.pagoProm);
}

function renderHistoryTable(){
  const tbody = $('#histTable tbody');
  if (!tbody) return;
  const hist = (state.receipt?.historial || []).slice(-12);

  tbody.innerHTML = hist.length ? hist.map((h, i) => `
    <tr>
      <td>${i+1}</td>
      <td>${formatNumber(h.kwh)}</td>
      <td>${formatCurrencyMXN(h.pago)}</td>
    </tr>
  `).join('') : `
    <tr><td colspan="3" style="color:var(--muted)">Sin datos de consumo histórico.</td></tr>
  `;
}

function renderChart(){
  const canvas = $('#chart');
  if (!canvas || !window.Chart) return;

  if (state.chart){
    try{ state.chart.destroy(); } catch {}
    state.chart = null;
  }

  const hist = (state.receipt?.historial || []).slice(-12);
  const labels = (hist.length ? hist : Array.from({ length: 12 }, () => ({}))).map((_, i) => `P${i+1}`);
  const consumos = hist.length ? hist.map(h => Number(h.kwh || 0)) : labels.map(() => 0);
  const prodMensual = Number(state.quote?.produccionMensual || 0);
  const produccion = labels.map(() => prodMensual);

  const tickColor = getComputedStyle(document.documentElement).getPropertyValue('--muted');

  state.chart = new window.Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Consumo (kWh)', data: consumos, tension: 0.25 },
        { label: 'Producción estimada (kWh/mes)', data: produccion, tension: 0.15 },
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: tickColor } },
        tooltip: { enabled: true },
      },
      scales: {
        x: { ticks: { color: tickColor }, grid: { color: 'rgba(255,255,255,0.06)' } },
        y: { ticks: { color: tickColor }, grid: { color: 'rgba(255,255,255,0.06)' } },
      }
    }
  });
}
