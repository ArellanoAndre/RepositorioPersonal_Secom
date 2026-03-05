import { $, toast, setPillStatus } from '../utils.js';
import { escapeHtml } from '../core/escape.js';
import { state } from '../core/state.js';
import { analyzeReceiptFile } from '../receiptParser.js';
import { computeQuote } from '../quoteEngine.js';
import { ensurePanelesEnInsumos } from './helpers.js';

export function renderRecibo(){
  return {
    left: `
      <div class="card__title">Recibo de luz</div>
      <div class="help">Sube un archivo PDF o una imagen (JPG/PNG) del recibo.</div>

      <input id="fileInput" type="file" accept="application/pdf,image/png,image/jpeg" hidden />

      <div class="dropzone" id="dropzone" tabindex="0" role="button" aria-label="Cargar recibo">
        <div class="dropzone__icon"><i data-lucide="upload"></i></div>
        <div style="min-width:0">
          <div class="dropzone__title">Arrastre y suelte aquí, o seleccione un archivo</div>
          <div class="dropzone__sub" id="fileHint">PDF o imagen</div>
        </div>
      </div>

      <div class="wizard-actions">
        <button class="btn btn--primary" id="btnAnalyze"><i data-lucide="scan"></i>Analizar</button>
        <button class="btn" id="btnClear"><i data-lucide="trash-2"></i>Limpiar</button>
      </div>

      <div class="kpis">
        <div class="kpi">
          <div class="kpi__label">Tarifa</div>
          <div class="kpi__value" id="kpiTarifa">—</div>
        </div>
        <div class="kpi">
          <div class="kpi__label">Consumo periodo</div>
          <div class="kpi__value" id="kpiConsumo">—</div>
        </div>
        <div class="kpi">
          <div class="kpi__label">Total a pagar</div>
          <div class="kpi__value" id="kpiTotal">—</div>
        </div>
        <div class="kpi">
          <div class="kpi__label">No. de servicio</div>
          <div class="kpi__value" id="kpiServicio">—</div>
        </div>
        <div class="kpi">
          <div class="kpi__label">Periodo</div>
          <div class="kpi__value" id="kpiPeriodo">—</div>
        </div>
        <div class="kpi">
          <div class="kpi__label">Tipo de periodo</div>
          <div class="kpi__value" id="kpiTipoPeriodo">—</div>
        </div>
      </div>
    `,
    right: `
      <div class="card__title">Vista previa</div>
      <div class="help">Revisa el documento antes de analizar.</div>

      <div class="preview" id="preview" style="margin-top:10px">
        <div class="preview__empty" id="previewEmpty">
          <i data-lucide="file"></i>
          <div style="margin-top:8px">Aún no has seleccionado un archivo.</div>
        </div>
      </div>

      <div class="card" style="box-shadow:none; border:1px solid var(--border); margin-top:12px">
        <div class="card__title" style="font-size:14px">Progreso</div>
        <div class="help" id="analyzeMsg" style="margin-top:8px"></div>
        <div class="wizard-actions" style="justify-content:flex-end; margin-top:10px">
          <button class="btn btn--success" id="btnStep1Next" disabled><i data-lucide="arrow-right"></i>Continuar</button>
        </div>
      </div>
    `
  };
}

export function mountRecibo({ gotoPaso }){
  const fileInput = $('#fileInput');
  const dz = $('#dropzone');

  const pickFile = () => fileInput?.click();

  dz?.addEventListener('click', pickFile);
  dz?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') pickFile();
  });

  dz?.addEventListener('dragover', (e) => {
    e.preventDefault();
    dz.classList.add('is-dragover');
  });
  dz?.addEventListener('dragleave', () => dz.classList.remove('is-dragover'));
  dz?.addEventListener('drop', (e) => {
    e.preventDefault();
    dz.classList.remove('is-dragover');
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileSelected(f);
  });

  fileInput?.addEventListener('change', () => {
    const f = fileInput.files?.[0];
    if (f) handleFileSelected(f);
  });

  $('#btnClear')?.addEventListener('click', () => {
    state.receiptFile = null;
    state.receipt = null;
    state.receiptCanvas = null;
    state.quote = null;
    state.savedQuote = null;
    updateFileHint();
    updatePreview();
    clearKpis();
    $('#btnStep1Next').disabled = true;
    $('#analyzeMsg').textContent = '';
  });

  $('#btnAnalyze')?.addEventListener('click', async () => {
    if (!state.receiptFile){
      toast({ title:'Falta el archivo', message:'Selecciona un recibo para continuar.', icon:'alert-triangle' });
      return;
    }

    setPillStatus('Analizando…', 'busy');
    $('#analyzeMsg').textContent = 'Procesando recibo…';
    $('#btnAnalyze').disabled = true;

    try{
      const result = await analyzeReceiptFile(state.receiptFile, {
        selectedTariff: state.selectedTariff,
        onProgress: (p) => {
          if (p?.message) $('#analyzeMsg').textContent = p.message;
        }
      });

      state.receipt = result.parsed;
      state.receipt.insumos = Array.isArray(state.receipt.insumos) ? state.receipt.insumos : [];
      state.receipt.impuestosPct = Number.isFinite(Number(state.receipt.impuestosPct)) ? Number(state.receipt.impuestosPct) : 0.16;
      state.receiptCanvas = result.canvas;

      // Recomendar paneles y colocarlos en insumos (editables)
      const tmpQuote = computeQuote(state.receipt, state.client, state.params, state.overrides);
      state.receipt.recomendacionPaneles = tmpQuote.panelesAuto;
      ensurePanelesEnInsumos(tmpQuote.panelesAuto);

      // Prefill
      state.receipt.titularRecibo = state.receipt.titularRecibo || state.receipt.nombre || '';
      state.client.direccion = state.client.direccion || state.receipt.direccion || '';

      updateKpisFromReceipt();

      setPillStatus('Listo', 'ok');
      $('#analyzeMsg').textContent = 'Recibo analizado correctamente.';
      $('#btnStep1Next').disabled = false;

      toast({ title:'Recibo listo', message:'Datos detectados y listos para cotizar.', icon:'check-circle' });
    } catch (err){
      console.error(err);
      setPillStatus('Error', 'error');
      $('#analyzeMsg').textContent = err?.message || 'No se pudo analizar el recibo.';
      toast({ title:'No se pudo analizar', message: err?.message || 'Verifica el archivo e inténtalo de nuevo.', icon:'x-circle' });
    } finally {
      $('#btnAnalyze').disabled = false;
    }
  });

  $('#btnStep1Next')?.addEventListener('click', () => gotoPaso(2));

  // Init
  updateFileHint();
  updatePreview();
  clearKpis();
  if ($('#kpiTarifa') && state.selectedTariff?.label) $('#kpiTarifa').textContent = state.selectedTariff.label;
}

function handleFileSelected(file){
  state.receiptFile = file;
  state.receipt = null;
  state.receiptCanvas = null;
  state.quote = null;
  state.savedQuote = null;

  updateFileHint();
  updatePreview();

  $('#btnStep1Next').disabled = true;
  $('#analyzeMsg').textContent = '';

  clearKpis();
  if ($('#kpiTarifa') && state.selectedTariff?.label) $('#kpiTarifa').textContent = state.selectedTariff.label;
}

function updateFileHint(){
  const f = state.receiptFile;
  $('#fileHint').textContent = f ? `${f.name} · ${(f.size/1024/1024).toFixed(2)} MB` : 'PDF o imagen';
}

function clearKpis(){
  $('#kpiConsumo').textContent = '—';
  $('#kpiTotal').textContent = '—';
  $('#kpiServicio').textContent = '—';
  $('#kpiPeriodo').textContent = '—';
  $('#kpiTipoPeriodo').textContent = '—';
}

function updateKpisFromReceipt(){
  const r = state.receipt;
  if (!r) return;

  $('#kpiTarifa').textContent = state.selectedTariff?.label || r.tarifa || '—';
  $('#kpiConsumo').textContent = r.consumoPeriodo ? `${r.consumoPeriodo} kWh` : '—';
  $('#kpiTotal').textContent = r.totalAPagar ? `$${Number(r.totalAPagar).toLocaleString('es-MX')}` : '—';
  $('#kpiServicio').textContent = r.servicio || '—';
  $('#kpiPeriodo').textContent = r.periodo?.raw || '—';
  $('#kpiTipoPeriodo').textContent = r.tipoPeriodo || '—';
}

function updatePreview(){
  const preview = $('#preview');
  const empty = $('#previewEmpty');

  preview?.querySelectorAll('canvas,img,iframe').forEach(x => x.remove());

  if (!state.receiptFile){
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  const isPdf = state.receiptFile.type === 'application/pdf' || state.receiptFile.name.toLowerCase().endsWith('.pdf');
  const url = URL.createObjectURL(state.receiptFile);

  if (!isPdf){
    const img = document.createElement('img');
    img.src = url;
    img.onload = () => URL.revokeObjectURL(url);
    preview?.appendChild(img);
    return;
  }

  const iframe = document.createElement('iframe');
  iframe.src = url;
  iframe.onload = () => URL.revokeObjectURL(url);
  iframe.style.width = '100%';
  iframe.style.height = '440px';
  iframe.style.border = '0';
  preview?.appendChild(iframe);
}
