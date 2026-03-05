import { $, $$, toast } from '../utils.js';
import { escapeHtml } from '../core/escape.js';
import { state, resetWizard, startNewQuoteState, structuredCloneSafe, guessTariffFromQuote } from '../core/state.js';
import { TARIFFS } from '../config/constants.js';

import { renderRecibo, mountRecibo } from './recibo.js';
import { renderDatos, mountDatos } from './datos.js';
import { renderCotizacion, mountCotizacion } from './cotizacion.js';
import { renderExportar, mountExportar } from './exportar.js';

export function startNewQuoteFlow(){
  startNewQuoteState();
  renderCotizadorRoute();
}

export function gotoPaso(n){
  state.wizardStep = n;
  buildStepper();
  renderWizard();
}

function buildStepper(){
  const el = $('#stepper');
  if (!el) return;

  const steps = [
    { n:1, label:'Recibo' },
    { n:2, label:'Datos' },
    { n:3, label:'Cotización' },
    { n:4, label:'Exportar' },
  ];

  el.innerHTML = steps.map((s, i) => {
    const cls = s.n === state.wizardStep ? 'is-active' : (s.n < state.wizardStep ? 'is-done' : '');
    const line = i < steps.length - 1 ? '<div class="stepper__line"></div>' : '';
    return `
      <div class="stepper__item ${cls}">
        <div class="stepper__dot">${s.n}</div>
        <div class="stepper__label">${escapeHtml(s.label)}</div>
      </div>
      ${line}
    `;
  }).join('');

  window.lucide?.createIcons();
}

function renderWizard(){
  const left = $('#wizardLeft');
  const right = $('#wizardRight');
  if (!left || !right) return;

  if (state.wizardStep === 1){
    left.innerHTML = renderRecibo().left;
    right.innerHTML = renderRecibo().right;
    mountRecibo({ gotoPaso });
  } else if (state.wizardStep === 2){
    left.innerHTML = renderDatos().left;
    right.innerHTML = renderDatos().right;
    mountDatos({ gotoPaso });
  } else if (state.wizardStep === 3){
    left.innerHTML = renderCotizacion().left;
    right.innerHTML = renderCotizacion().right;
    mountCotizacion({ gotoPaso });
  } else {
    left.innerHTML = renderExportar().left;
    right.innerHTML = renderExportar().right;
    mountExportar({ gotoPaso });
  }

  window.lucide?.createIcons();
}

function renderTariffSelector(){
  const choices = TARIFFS.filter(t => t.kind !== 'cashvolt');
  const groups = {};
  for (const t of choices){
    const key = t.familia || 'Tarifas';
    groups[key] = groups[key] || [];
    groups[key].push(t);
  }

  return `
    <div class="card">
      <div class="row" style="justify-content:space-between; align-items:center; gap:12px">
        <div>
          <div class="card__title">Nueva cotización</div>
          <div class="card__subtitle">Selecciona una tarifa para iniciar</div>
        </div>
      </div>

      <div class="grid" style="gap:12px; margin-top:14px">
        ${Object.entries(groups).map(([g, items]) => `
          <div class="card" style="box-shadow:none; border:1px solid var(--border)">
            <div class="card__title" style="font-size:14px">${escapeHtml(g)}</div>
            <div class="grid" style="gap:10px; margin-top:10px">
              ${items.map(t => `
                <button class="btn btn--primary" data-tariff="${escapeHtml(t.key)}" style="justify-content:space-between">
                  <span>${escapeHtml(t.label)}</span>
                  <span class="badge">${escapeHtml(t.periodo || '')}</span>
                </button>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function wireTariffSelector(){
  $$('#route-cotizador [data-tariff]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.tariff;
      const found = TARIFFS.find(t => t.key === key);
      if (!found) return;
      state.selectedTariff = found;
      state.wizardStep = 1;
      resetWizard(true);
      renderCotizadorRoute();
      toast({ title:'Tarifa seleccionada', message:found.label, icon:'check-circle' });
    });
  });
}

export function renderCotizadorRoute(){
  const root = $('#route-cotizador');
  if (!root) return;

  if (!state.selectedTariff){
    root.innerHTML = renderTariffSelector();
    wireTariffSelector();
    window.lucide?.createIcons();
    return;
  }

  root.innerHTML = `
    <div class="row" style="justify-content:space-between; align-items:center; gap:12px">
      <div class="pill">
        <span class="pill__dot"></span>
        <span>Tarifa seleccionada:</span>&nbsp;<b>${escapeHtml(state.selectedTariff.label)}</b>
      </div>
      <button class="btn" id="btnChangeTarifa"><i data-lucide="repeat-2"></i>Cambiar</button>
    </div>

    <div class="card card--flat" style="box-shadow:none; margin-top:12px">
      <div class="stepper" id="stepper"></div>
      <div class="wizard" id="wizard">
        <div class="wizard__col" id="wizardLeft"></div>
        <div class="wizard__col" id="wizardRight"></div>
      </div>
    </div>
  `;

  $('#btnChangeTarifa')?.addEventListener('click', () => {
    state.selectedTariff = null;
    resetWizard(false);
    renderCotizadorRoute();
  });

  buildStepper();
  renderWizard();
}

export function loadQuoteForEditing(q){
  state.selectedTariff = guessTariffFromQuote(q);

  state.wizardStep = 3;
  state.receiptFile = null;
  state.receiptCanvas = null;
  state.receipt = structuredCloneSafe(q.receipt || {});
  state.client = structuredCloneSafe(q.client || { nombre:'', telefono:'', email:'', direccion:'' });
  state.params = structuredCloneSafe(q.params || state.params);
  state.quote = structuredCloneSafe(q.quote || null);
  state.overrides = structuredCloneSafe(q.overrides || { paneles: null });
  state.quoteMeta = structuredCloneSafe(q.quoteMeta || q.receipt?.instalacion || state.quoteMeta);
  state.savedQuote = q;

  renderCotizadorRoute();
  gotoPaso(3);
}
