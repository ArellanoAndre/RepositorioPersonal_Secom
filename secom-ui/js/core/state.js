import { TARIFFS } from '../config/constants.js';

export const state = {
  route: 'historial',

  // Cotizador
  selectedTariff: null,
  wizardStep: 1,
  receiptFile: null,
  receipt: null,
  receiptCanvas: null,

  client: {
    nombre: '',
    telefono: '',
    email: '',
    direccion: '',
  },

  quoteMeta: {
    panelModelo: 'Panel fotovoltaico',
    panelDimensiones: '',
    panelResumen: '',
    inversorModelo: '',
    tipoTecho: 'No especificado',
    sombras: 'No especificado',
    perdidasSombraPct: 0,
    notasFisicas: '',
  },

  overrides: {
    paneles: null,
  },

  params: {
    yieldKwhPerKwpMonth: 135,
    panelWatts: 550,
    costPerKwp: 22000,
    contingencyPct: 0.06,
  },

  quote: null,
  savedQuote: null,

  chart: null,
  exportChart: null,
};

export function structuredCloneSafe(obj){
  try { return structuredClone(obj); } catch { return JSON.parse(JSON.stringify(obj || null)); }
}

export function resetWizard(keepTariff=false){
  state.wizardStep = 1;
  state.receiptFile = null;
  state.receiptCanvas = null;
  state.receipt = null;
  state.quote = null;
  state.savedQuote = null;

  if (!keepTariff) state.selectedTariff = null;

  state.client = { nombre:'', telefono:'', email:'', direccion:'' };
  state.quoteMeta = {
    panelModelo: 'Panel fotovoltaico',
    panelDimensiones: '',
    panelResumen: '',
    inversorModelo: '',
    tipoTecho: 'No especificado',
    sombras: 'No especificado',
    perdidasSombraPct: 0,
    notasFisicas: '',
  };
  state.overrides = { paneles: null };
}

export function startNewQuoteState(){
  state.selectedTariff = null;
  state.overrides = { paneles: null };
  state.quoteMeta = {
    panelModelo: 'Panel fotovoltaico',
    panelDimensiones: '',
    panelResumen: '',
    inversorModelo: '',
    tipoTecho: 'No especificado',
    sombras: 'No especificado',
    perdidasSombraPct: 0,
    notasFisicas: '',
  };
  resetWizard(true);
}

export function guessTariffFromQuote(q){
  if (q?.selectedTariff?.key){
    const found = TARIFFS.find(t => t.key === q.selectedTariff.key);
    if (found) return found;
  }
  const tp = q?.receipt?.tipoPeriodo || '';
  const isBim = String(tp).toLowerCase().includes('bim');
  const candidates = TARIFFS.filter(t => t.kind !== 'cashvolt');
  const pref = candidates.find(t => String(t.label||'').toLowerCase().includes('dom')) || candidates[0];
  if (!pref) return candidates[0] || null;
  const match = candidates.find(t => (isBim ? t.periodo === 'Bimestral' : t.periodo === 'Mensual') && String(t.label||'').toLowerCase().includes('doméstica'));
  return match || pref;
}
