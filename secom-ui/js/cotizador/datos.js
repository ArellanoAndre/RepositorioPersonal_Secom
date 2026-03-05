import { $, toast } from '../utils.js';
import { escapeAttr, escapeHtml } from '../core/escape.js';
import { state } from '../core/state.js';
import { INSUMO_CATALOG } from '../config/constants.js';
import { computeQuote } from '../quoteEngine.js';
import { validateReceiptAgainstSelection } from './helpers.js';
import { setupInsumosCrud, syncPanelOverridesFromInsumos } from '../componentes/insumosCrud.js';
import { formatCurrencyMXN, formatNumber } from '../utils.js';

export function renderDatos(){
  const r = state.receipt;
  if (!r){
    return {
      left: `<div class="help">No hay recibo cargado. Regresa al paso anterior.</div>`,
      right: `<div class="help">—</div>`,
    };
  }

  const ajusteKwh = Number(r?.ajusteConsumo?.kwhMes || 0);
  const ajusteNota = (r?.ajusteConsumo?.nota || '').trim();
  const impuestosPct = Number.isFinite(Number(r?.impuestosPct)) ? Number(r.impuestosPct) : 0.16;

  return {
    left: `
      <div class="card__title">Revisión y ajustes</div>
      <div class="help">Verifica los datos extraídos del recibo. Puedes corregirlos antes de generar la cotización.</div>

      <div class="card__subtitle" style="margin-top:12px">Datos del recibo</div>

      <div class="row" style="margin-top:10px">
        <div class="field">
          <label>No. de servicio</label>
          <input id="rServicio" placeholder="###########" value="${escapeAttr(r?.servicio || '')}" />
        </div>
        <div class="field">
          <label>Tarifa</label>
          <input id="rTarifa" placeholder="1B / DAC / ..." value="${escapeAttr(r?.tarifa || '')}" />
        </div>
      </div>

      <div class="row" style="margin-top:10px">
        <div class="field" style="flex:1.4">
          <label>Titular del recibo</label>
          <input id="rTitular" placeholder="Nombre en el recibo" value="${escapeAttr(r?.titularRecibo || r?.nombre || '')}" />
        </div>
        <div class="field" style="flex:1">
          <label>Estado (abreviatura)</label>
          <input id="rEstado" placeholder="SON" value="${escapeAttr(String(r?.estado || ''))}" />
        </div>
      </div>

      <div class="row" style="margin-top:10px">
        <div class="field" style="flex:1.4">
          <label>Periodo facturado</label>
          <input id="rPeriodo" placeholder="DD MMM AA - DD MMM AA" value="${escapeAttr(r?.periodo?.raw || '')}" />
        </div>
        <div class="field" style="flex:1">
          <label>Tipo de periodo</label>
          <select id="rTipoPeriodo">
            <option ${r?.tipoPeriodo === 'Mensual' ? 'selected' : ''}>Mensual</option>
            <option ${r?.tipoPeriodo === 'Bimestral' ? 'selected' : ''}>Bimestral</option>
          </select>
        </div>
      </div>

      <div class="row" style="margin-top:10px">
        <div class="field">
          <label>Consumo del periodo (kWh)</label>
          <input id="rConsumo" type="number" min="0" step="1" value="${escapeAttr(String(r?.consumoPeriodo || 0))}" />
        </div>
        <div class="field">
          <label>Total a pagar (MXN)</label>
          <input id="rTotal" type="number" min="0" step="1" value="${escapeAttr(String(r?.totalAPagar || 0))}" />
        </div>
      </div>

      <div class="row" style="margin-top:10px">
        <div class="field">
          <label>No. hilos</label>
          <input id="rHilos" placeholder="1" value="${escapeAttr(String(r?.hilos || ''))}" />
        </div>
        <div class="field">
          <label>Ajuste de consumo (kWh/mes)</label>
          <input id="rAjusteKwh" type="number" step="1" value="${escapeAttr(String(ajusteKwh))}" />
        </div>
      </div>

      <div class="field" style="margin-top:10px">
        <label>Nota del ajuste de consumo</label>
        <textarea id="rAjusteNota" rows="2" placeholder="Ejemplo: Se considera la carga de un vehículo eléctrico.">${escapeHtml(ajusteNota)}</textarea>
      </div>

      <div class="card__subtitle" style="margin-top:14px">Datos del cliente</div>

      <div class="row" style="margin-top:10px">
        <div class="field">
          <label>Nombre del cliente</label>
          <input id="cNombre" placeholder="Nombre del cliente" value="${escapeAttr(state.client.nombre)}" />
        </div>
        <div class="field">
          <label>Teléfono</label>
          <input id="cTel" placeholder="(###) ### ####" value="${escapeAttr(state.client.telefono)}" />
        </div>
      </div>

      <div class="row" style="margin-top:10px">
        <div class="field">
          <label>Correo</label>
          <input id="cEmail" placeholder="cliente@correo.com" value="${escapeAttr(state.client.email)}" />
        </div>
        <div class="field">
          <label>Tipo seleccionado</label>
          <input value="${escapeAttr(state.selectedTariff?.label || '')}" disabled />
        </div>
      </div>

      <div class="field" style="margin-top:10px">
        <label>Dirección</label>
        <textarea id="cDir" rows="3" placeholder="Dirección del servicio">${escapeHtml(state.client.direccion)}</textarea>
      </div>

      <div class="card__subtitle" style="margin-top:14px">Insumos de la cotización</div>
      <div class="help">Agrega, edita o elimina insumos. Los paneles también se administran desde esta tabla.</div>

      <div class="row" style="margin-top:10px; align-items:flex-end">
        <div class="field" style="flex:2">
          <label>Agregar desde catálogo</label>
          <select id="insCatalog">
            <option value="">Selecciona un insumo…</option>
            ${INSUMO_CATALOG.map((it, idx) => `<option value="${idx}">${escapeHtml(it.codigo)} · ${escapeHtml(it.descripcion)}</option>`).join('')}
          </select>
        </div>
        <div style="display:flex; gap:10px; flex-wrap:wrap">
          <button class="btn" id="btnAddCatalog"><i data-lucide="plus"></i>Agregar</button>
          <button class="btn" id="btnAddManual"><i data-lucide="edit-3"></i>Agregar manual</button>
        </div>
      </div>

      <div style="overflow:auto; margin-top:10px">
        <table class="table table--tight" id="insTable">
          <thead>
            <tr>
              <th style="min-width:160px">CÓDIGO</th>
              <th style="min-width:300px">DESCRIPCIÓN</th>
              <th style="min-width:120px">CANTIDAD</th>
              <th style="min-width:120px">UNIDAD</th>
              <th style="min-width:140px">PRECIO</th>
              <th style="min-width:140px">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            <tr><td colspan="6" style="color:var(--muted)">Cargando insumos…</td></tr>
          </tbody>
        </table>
      </div>

      <div class="insumos-summary" style="margin-top:10px">
        <div class="insumos-summary__row"><span>Subtotal</span><b id="insSubtotal">—</b></div>
        <div class="insumos-summary__row">
          <span>Impuestos (IVA %)</span>
          <div style="display:flex; align-items:center; gap:10px">
            <input id="insTaxPct" class="insumos-summary__tax" type="number" min="0" max="30" step="0.5" value="${escapeAttr(String(Math.round(impuestosPct*100*10)/10))}" />
            <b id="insTaxes">—</b>
          </div>
        </div>
        <div class="insumos-summary__row insumos-summary__row--total"><span>Total</span><b id="insTotal">—</b></div>
      </div>

      <div class="wizard-actions" style="justify-content:space-between">
        <button class="btn" id="btnBack2"><i data-lucide="arrow-left"></i>Volver</button>
        <button class="btn btn--success" id="btnNext2"><i data-lucide="arrow-right"></i>Continuar</button>
      </div>

      <div class="help" id="msg2" style="margin-top:10px"></div>
    `,

    right: renderDatosRight(),
  };
}

function renderDatosRight(){
  const r = state.receipt;
  const hist = (r?.historial || []).slice(-8);
  const val = validateReceiptAgainstSelection(r, state.selectedTariff);
  const q = computeQuote(r, state.client, state.params, state.overrides);

  return `
    <div class="card__title">Resumen detectado</div>

    <div class="row" style="margin-top:10px">
      <div class="kpi" style="flex:1">
        <div class="kpi__label">Tipo seleccionado</div>
        <div class="kpi__value" style="font-size:13px">${escapeHtml(state.selectedTariff?.label || '—')}</div>
      </div>
      <div class="kpi" style="flex:1">
        <div class="kpi__label">Validación</div>
        <div class="kpi__value" style="font-size:13px">${val.ok ? 'Correcta' : 'Revisar'}</div>
      </div>
    </div>

    <div class="help" style="margin-top:8px">${escapeHtml(val.message)}</div>

    <div class="kpi">
      <div class="kpi__label">No. de servicio</div>
      <div class="kpi__value">${escapeHtml(r?.servicio || '—')}</div>
    </div>

    <div class="row" style="margin-top:10px">
      <div class="kpi" style="flex:1">
        <div class="kpi__label">Periodo</div>
        <div class="kpi__value" style="font-size:13px">${escapeHtml(r?.periodo?.raw || '—')}</div>
      </div>
      <div class="kpi" style="flex:1">
        <div class="kpi__label">Total a pagar</div>
        <div class="kpi__value" style="font-size:14px">${r?.totalAPagar ? formatCurrencyMXN(r.totalAPagar) : '—'}</div>
      </div>
    </div>

    <div class="kpi" style="margin-top:10px">
      <div class="kpi__label">Consumo del periodo</div>
      <div class="kpi__value">${r?.consumoPeriodo ? `${formatNumber(r.consumoPeriodo)} kWh` : '—'}</div>
    </div>

    <div class="card__subtitle" style="margin-top:14px">Consumo histórico (kWh)</div>
    <div style="display:flex; gap:8px; flex-wrap:wrap">
      ${hist.length ? hist.map(h => `<span class="badge">${formatNumber(h.kwh)} kWh</span>`).join('') : '<span class="badge">Sin datos</span>'}
    </div>

    <div class="card__subtitle" style="margin-top:14px">Resumen de cotización</div>
    <div class="kpi" style="margin-top:8px">
      <div class="kpi__label">Total de cotización</div>
      <div class="kpi__value" id="kpiQuoteTotal" style="font-size:14px">${formatCurrencyMXN(q.inversion || 0)}</div>
    </div>
  `;
}

export function mountDatos({ gotoPaso }){
  if (!state.receipt){
    gotoPaso(1);
    return;
  }

  $('#btnBack2')?.addEventListener('click', () => gotoPaso(1));

  setupInsumosCrud({
    onTotalsUpdated: () => {
      // Mantener panelResumen actualizado para el siguiente paso
      syncPanelOverridesFromInsumos();
    }
  });

  $('#btnNext2')?.addEventListener('click', () => {
    const toNum = (v) => {
      const s = String(v||'').replace(/,/g,'').trim();
      const n = Number(s);
      return Number.isFinite(n) ? n : 0;
    };

    state.receipt.servicio = $('#rServicio').value.trim();
    state.receipt.tarifa = $('#rTarifa').value.trim().toUpperCase();
    state.receipt.titularRecibo = ($('#rTitular')?.value || '').trim();
    state.receipt.periodo = state.receipt.periodo || { raw:'', start:null, end:null, days:0 };
    state.receipt.periodo.raw = $('#rPeriodo').value.trim();
    state.receipt.tipoPeriodo = $('#rTipoPeriodo').value;
    state.receipt.periodo.days = state.receipt.tipoPeriodo === 'Bimestral' ? 60 : 30;
    state.receipt.consumoPeriodo = toNum($('#rConsumo').value);
    state.receipt.totalAPagar = toNum($('#rTotal').value);
    state.receipt.hilos = ($('#rHilos').value || '').trim();
    state.receipt.estado = ($('#rEstado').value || '').trim().toUpperCase();

    const ajKwh = toNum($('#rAjusteKwh')?.value);
    const ajNota = ($('#rAjusteNota')?.value || '').trim();
    state.receipt.ajusteConsumo = { kwhMes: ajKwh, nota: ajNota };

    state.client.nombre = $('#cNombre').value.trim();
    state.client.telefono = $('#cTel').value.trim();
    state.client.email = $('#cEmail').value.trim();
    state.client.direccion = $('#cDir').value.trim();

    const msg = $('#msg2');
    if (!state.client.nombre){
      msg.textContent = 'Por favor, captura el nombre del cliente.';
      toast({ title:'Falta información', message:'El nombre del cliente es obligatorio.', icon:'alert-triangle' });
      return;
    }
    msg.textContent = '';

    syncPanelOverridesFromInsumos();
    gotoPaso(3);
  });
}
