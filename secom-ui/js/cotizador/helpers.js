import { state } from '../core/state.js';

export function validateReceiptAgainstSelection(receipt, selected){
  if (!receipt || !selected) return { ok:true, message:'Listo para continuar.' };

  const selPeriodo = selected.periodo;
  const recPeriodo = receipt.tipoPeriodo;
  if (selPeriodo && recPeriodo && selPeriodo !== recPeriodo){
    return {
      ok:false,
      message:`El tipo seleccionado es ${selPeriodo}, pero el recibo está marcado como ${recPeriodo}. Verifica el periodo facturado.`
    };
  }

  return { ok:true, message:'Tarifa y periodo verificados.' };
}

export function ensurePanelesEnInsumos(panelesRecomendados){
  const n = Math.max(0, Math.round(Number(panelesRecomendados || 0)));
  if (!state.receipt) return;

  state.receipt.insumos = Array.isArray(state.receipt.insumos) ? state.receipt.insumos : [];

  const panelRows = state.receipt.insumos.filter(it => (it?.meta?.kind === 'panel') || String(it?.codigo||'').toUpperCase() === 'PV');
  const totalPaneles = panelRows.reduce((a,it)=>a + (Number(it?.cantidad||0) || 0), 0);

  if (panelRows.length === 0 || totalPaneles === 0){
    state.receipt.insumos = state.receipt.insumos.filter(it => String(it?.codigo||'').toUpperCase() !== 'PV');
    state.receipt.insumos.unshift({
      codigo: 'PV',
      descripcion: `Módulo fotovoltaico ${state.params.panelWatts} W`,
      cantidad: n || 1,
      unidad: 'UD',
      precio: 0,
      meta: { kind:'panel', watts: Number(state.params.panelWatts||550), medidas: '' }
    });
  }
}
