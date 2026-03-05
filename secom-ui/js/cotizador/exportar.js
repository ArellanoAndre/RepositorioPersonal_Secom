import { $, toast, setPillStatus, formatDateTime } from '../utils.js';
import { escapeHtml, escapeAttr } from '../core/escape.js';
import { state } from '../core/state.js';
import { QUOTE_STATUSES } from '../config/constants.js';
import { computeQuote, buildExportHtml } from '../quoteEngine.js';
import { saveQuote, updateQuote, saveProjectFromQuote } from '../storage.js';
import { syncPanelOverridesFromInsumos } from '../componentes/insumosCrud.js';

export function renderExportar(){
  syncPanelOverridesFromInsumos();
  const q = state.quote || computeQuote(state.receipt, state.client, state.params, state.overrides);
  state.quote = q;

  const currentStatus = state.savedQuote?.status || 'En proceso';
  const exportHtml = buildExportHtml({
    ...q,
    receipt: state.receipt,
    client: state.client,
    params: state.params,
    id: state.savedQuote?.id || '',
    selectedTariff: state.selectedTariff,
    quoteMeta: state.quoteMeta,
  });

  return {
    left: `
      <div class="card__title">Exportar</div>
      <div class="help">Revisa el documento y genera el PDF cuando esté listo.</div>

      <div class="row" style="margin-top:12px; align-items:flex-end">
        <div class="field" style="max-width:320px">
          <label>Estatus de la cotización</label>
          <select id="quoteStatus">
            ${QUOTE_STATUSES.map(s => `<option ${s===currentStatus?'selected':''}>${escapeHtml(s)}</option>`).join('')}
          </select>
        </div>
        <div style="display:flex; gap:10px; flex-wrap:wrap">
          <button class="btn" id="btnUpdateStatus"><i data-lucide="refresh-cw"></i>Actualizar estatus</button>
        </div>
      </div>

      <div class="wizard-actions" style="justify-content:space-between; margin-top:12px">
        <button class="btn" id="btnBack4"><i data-lucide="arrow-left"></i>Volver</button>
        <div style="display:flex; gap:10px; flex-wrap:wrap; justify-content:flex-end">
          <button class="btn" id="btnExport"><i data-lucide="download"></i>Descargar PDF</button>
          <button class="btn" id="btnCashvolt"><i data-lucide="external-link"></i>CashVolt</button>
          <button class="btn btn--primary" id="btnSaveQuote"><i data-lucide="save"></i>Guardar cotización</button>
          <button class="btn" id="btnConfirmProject"><i data-lucide="check"></i>Marcar como proyecto</button>
        </div>
      </div>

      <div class="help" id="msg4" style="margin-top:10px"></div>
    `,

    right: `
      <div class="card__title">Formato final</div>
      <div class="help">Vista previa del documento final.</div>

      <div class="card__subtitle" style="margin-top:12px">Vista previa</div>
      <div class="preview" style="min-height:420px; align-items:flex-start; justify-content:flex-start; overflow:auto; padding:12px">
        ${exportHtml}
      </div>
    `,
  };
}

export function mountExportar({ gotoPaso }){
  if (!state.receipt){
    gotoPaso(1);
    return;
  }

  $('#btnBack4')?.addEventListener('click', () => gotoPaso(3));

  $('#btnCashvolt')?.addEventListener('click', () => {
    window.open('https://cashvolt.com', '_blank', 'noopener');
  });

  $('#btnSaveQuote')?.addEventListener('click', () => {
    try{
      const status = ($('#quoteStatus')?.value || 'En proceso').trim();
      const q = persistQuote(status);
      toast({ title:'Cotización guardada', message:`Se agregó al historial (${q.id}).`, icon:'save' });
      $('#msg4').textContent = `Guardada como ${q.id}.`;
    } catch (e){
      toast({ title:'No se pudo guardar', message: e?.message || 'Revisa los datos.', icon:'x-circle' });
    }
  });

  $('#btnUpdateStatus')?.addEventListener('click', () => {
    try{
      const status = ($('#quoteStatus')?.value || 'En proceso').trim();
      const q = persistQuote(status);
      toast({ title:'Estatus actualizado', message:`${q.id} · ${status}`, icon:'check-circle' });
      $('#msg4').textContent = `Cotización: ${q.id} · Estatus: ${status}`;
    } catch (e){
      toast({ title:'No se pudo actualizar', message: e?.message || 'Revisa los datos.', icon:'x-circle' });
    }
  });

  $('#btnConfirmProject')?.addEventListener('click', () => {
    try{
      const qSaved = persistQuote('Proyecto');
      const project = saveProjectFromQuote({ ...qSaved, status:'Proyecto' });
      updateQuote(qSaved.id, { status:'Proyecto' });
      toast({ title:'Proyecto creado', message:`Se agregó a Proyectos (${project.id}).`, icon:'check' });
      $('#msg4').textContent = `Proyecto: ${project.id}`;
    } catch (e){
      toast({ title:'No se pudo confirmar', message: e?.message || 'Revisa los datos.', icon:'x-circle' });
    }
  });

  $('#btnExport')?.addEventListener('click', exportPdfCurrent);

  if (state.savedQuote?.id){
    $('#msg4').textContent = `Cotización: ${state.savedQuote.id}`;
  }

  renderExportDocChart({ root: document });
}

function persistQuote(status){
  if (!state.client.nombre) throw new Error('Falta el nombre del cliente.');
  if (!state.receipt?.servicio) throw new Error('Falta el No. de servicio.');

  // Mantener meta en el recibo
  state.receipt.instalacion = { ...(state.receipt.instalacion || {}), ...(state.quoteMeta || {}) };

  // Recalcular antes de guardar
  syncPanelOverridesFromInsumos();
  state.quote = computeQuote(state.receipt, state.client, state.params, state.overrides);

  if (state.savedQuote?.id){
    const upd = updateQuote(state.savedQuote.id, {
      status,
      client: state.client,
      receipt: state.receipt,
      quote: state.quote,
      params: state.params,
      selectedTariff: state.selectedTariff,
      overrides: state.overrides,
      quoteMeta: state.quoteMeta,
    });
    state.savedQuote = upd;
    return upd;
  }

  const q = saveQuote({
    status,
    client: state.client,
    receipt: state.receipt,
    quote: state.quote,
    params: state.params,
    selectedTariff: state.selectedTariff,
    overrides: state.overrides,
    quoteMeta: state.quoteMeta,
  });
  state.savedQuote = q;
  return q;
}

export function renderExportDocChart({ root, quote, receipt }){
  const canvas = (root || document).querySelector('#exportChart');
  if (!canvas || !window.Chart) return;

  const q = quote || state.quote;
  const r = receipt || state.receipt;

  // Destroy previous chart
  if (state.exportChart){
    try{ state.exportChart.destroy(); } catch {}
    state.exportChart = null;
  }

  const hist = (r?.historial || []).slice(-12);
  const labels = (hist.length ? hist : Array.from({ length: 12 }, () => ({}))).map((_, i) => `P${i+1}`);
  const consumos = hist.length ? hist.map(h => Number(h.kwh || 0)) : labels.map(() => 0);
  const prodMensual = Number(q?.produccionMensual || 0);
  const produccion = labels.map(() => prodMensual);

  state.exportChart = new window.Chart(canvas, {
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
      plugins: { legend: { labels: { color: 'rgba(0,0,0,0.70)' } } },
      scales: {
        x: { ticks: { color: 'rgba(0,0,0,0.65)' }, grid: { color: 'rgba(0,0,0,0.08)' } },
        y: { ticks: { color: 'rgba(0,0,0,0.65)' }, grid: { color: 'rgba(0,0,0,0.08)' } },
      }
    }
  });
}

async function exportPdfCurrent(){
  if (!window.html2canvas || !window.jspdf){
    toast({ title:'Exportación no disponible', message:'Faltan librerías de exportación en el navegador.', icon:'alert-triangle' });
    return;
  }

  setPillStatus('Generando PDF…', 'busy');

  try{
    if (!state.savedQuote?.id){
      state.savedQuote = persistQuote('Guardada');
    }

    const area = $('#exportDoc');
    if (!area) throw new Error('No se encontró el documento de exportación.');

    renderExportDocChart({ root: document });
    await new Promise(r => setTimeout(r, 60));

    const canvas = await window.html2canvas(area, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });

    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 28;

    const imgW = pageW - margin*2;
    const imgH = canvas.height * (imgW / canvas.width);

    let heightLeft = imgH;
    let position = margin;

    pdf.addImage(imgData, 'JPEG', margin, position, imgW, imgH);
    heightLeft -= (pageH - margin*2);

    while (heightLeft > 0){
      pdf.addPage();
      position = margin - (imgH - heightLeft);
      pdf.addImage(imgData, 'JPEG', margin, position, imgW, imgH);
      heightLeft -= (pageH - margin*2);
    }

    const name = (state.client.nombre || 'Cliente').trim().replace(/\s+/g,'_').slice(0, 36);
    const filename = `Cotizacion_SECOM_${name}_${state.savedQuote.id}.pdf`;
    pdf.save(filename);

    toast({ title:'PDF generado', message:'Descarga iniciada.', icon:'download' });
    setPillStatus('Listo', 'ok');
  } catch (e){
    console.error(e);
    toast({ title:'No se pudo exportar', message: e?.message || 'Intenta de nuevo.', icon:'x-circle' });
    setPillStatus('Error', 'error');
  }
}

export async function exportPdfFromStoredQuote(q){
  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.left = '-9999px';
  wrapper.style.top = '0';
  wrapper.style.width = '800px';

  const recomputed = computeQuote(q.receipt || {}, q.client || {}, q.params || {}, q.overrides || {});
  const html = buildExportHtml({
    ...recomputed,
    receipt: q.receipt,
    client: q.client,
    params: q.params,
    id: q.id,
    selectedTariff: q.selectedTariff,
    quoteMeta: q.quoteMeta,
  });
  wrapper.innerHTML = html;
  document.body.appendChild(wrapper);

  try{
    setPillStatus('Generando PDF…', 'busy');
    const area = wrapper.querySelector('#exportDoc');

    // Chart
    renderExportDocChart({ root: wrapper, quote: recomputed, receipt: q.receipt });
    await new Promise(r => setTimeout(r, 60));

    const canvas = await window.html2canvas(area, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });

    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 28;

    const imgW = pageW - margin*2;
    const imgH = canvas.height * (imgW / canvas.width);

    let heightLeft = imgH;
    let position = margin;

    pdf.addImage(imgData, 'JPEG', margin, position, imgW, imgH);
    heightLeft -= (pageH - margin*2);

    while (heightLeft > 0){
      pdf.addPage();
      position = margin - (imgH - heightLeft);
      pdf.addImage(imgData, 'JPEG', margin, position, imgW, imgH);
      heightLeft -= (pageH - margin*2);
    }

    const name = (q.client?.nombre || 'Cliente').trim().replace(/\s+/g,'_').slice(0, 36);
    pdf.save(`Cotizacion_SECOM_${name}_${q.id}.pdf`);

    toast({ title:'PDF generado', message:'Descarga iniciada.', icon:'download' });
    setPillStatus('Listo', 'ok');
  } catch (e){
    console.error(e);
    toast({ title:'No se pudo exportar', message: e?.message || 'Intenta de nuevo.', icon:'x-circle' });
    setPillStatus('Error', 'error');
  } finally {
    wrapper.remove();
  }
}
