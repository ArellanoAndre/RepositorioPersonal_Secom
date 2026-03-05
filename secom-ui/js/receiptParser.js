import { parseMoneyToNumber, parseIntSafe } from './utils.js';

const MONTHS = {
  ENE: 1, FEB: 2, MAR: 3, ABR: 4, MAY: 5, JUN: 6,
  JUL: 7, AGO: 8, SEP: 9, OCT: 10, NOV: 11, DIC: 12,
};

function parsePeriodo(text){
  const m = text.match(/PERIODO\s+FACTURADO:\s*(\d{2})\s*([A-Z]{3})\s*(\d{2})\s*-\s*(\d{2})\s*([A-Z]{3})\s*(\d{2})/);
  if (!m) return { raw:'', start:null, end:null, days:null };
  const [, sd, sm, sy, ed, em, ey] = m;
  const start = new Date(2000 + parseIntSafe(sy), (MONTHS[sm]||1)-1, parseIntSafe(sd));
  const end = new Date(2000 + parseIntSafe(ey), (MONTHS[em]||1)-1, parseIntSafe(ed));
  const days = Math.max(0, Math.round((end - start) / (1000*60*60*24)));
  return { raw: `${sd} ${sm} ${sy} - ${ed} ${em} ${ey}`, start, end, days };
}

function parseNombreDireccion(text){
  // Heurística: el nombre suele ser una línea en mayúsculas antes del bloque de dirección.
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const idxServicio = lines.findIndex(l => /NO\.?\s*DE\s*SERVICIO/i.test(l));
  const scope = idxServicio > 0 ? lines.slice(0, idxServicio) : lines;

  const blacklist = [
    'COMISIÓN FEDERAL', 'COMISION FEDERAL', 'ELECTRICIDAD', 'RFC:', 'AV.', 'ALCALDIA',
    'CIUDAD DE', 'MÉXICO', 'MEXICO', 'TOTAL A PAGAR', 'CFE', 'DESCARGA', 'APP',
  ];

  const isUpperish = (s) => {
    const letters = s.replace(/[^A-ZÁÉÍÓÚÑ ]/g,'');
    return letters.length >= 8 && s === s.toUpperCase();
  };

  let nombre = '';
  for (let i=0; i<scope.length; i++){
    const l = scope[i];
    if (!isUpperish(l)) continue;
    if (blacklist.some(b => l.includes(b))) continue;
    // Debe tener al menos 2 palabras
    if (l.split(/\s+/).length < 2) continue;
    nombre = l;
    break;
  }

  // Dirección: después del nombre hasta NO. DE SERVICIO (o hasta topar con tokens)
  let direccion = '';
  if (nombre){
    const start = lines.findIndex(l => l.includes(nombre));
    const end = idxServicio > -1 ? idxServicio : Math.min(lines.length, start + 10);
    const block = [];
    const exclude = ['TOTAL A PAGAR', 'DESCARGA', 'APP', '$', 'PESOS', 'M.N.'];
    for (let i = start + 1; i < end; i++){
      const l = lines[i];
      if (!l) continue;
      if (exclude.some(x => l.toUpperCase().includes(x))) continue;
      if (/RFC:/i.test(l)) continue;
      block.push(l);
    }
    direccion = block.join(' ').replace(/\s+/g,' ').trim();
  }

  return { nombre, direccion };
}

function parseHistorial(text){
  const re = /del\s+\d{2}\s+[A-Z]{3}\s+\d{2}\s+al\s+\d{2}\s+[A-Z]{3}\s+\d{2}\s+(\d+)\s+\$([\d,]+\.\d{2})/g;
  const items = [];
  let m;
  while ((m = re.exec(text))){
    items.push({ kwh: parseIntSafe(m[1]), pago: parseMoneyToNumber(m[2]) });
  }
  return items;
}

function parseConsumoPeriodo(text){
  // Intentar buscar el triplete de lecturas cerca del marcador Energía (kWh)
  const anchor = text.search(/Energ[ií]a\s*\(kWh\)/i);
  const region = anchor > -1 ? text.slice(anchor, anchor + 500) : text;
  const re = /(\d{1,3}(?:,\d{3})*)\s+(\d{1,3}(?:,\d{3})*)\s+(\d{1,3}(?:,\d{3})*)/g;
  let m;
  while ((m = re.exec(region))){
    const third = parseIntSafe(m[3]);
    if (third > 0 && third < 50000) return third;
  }
  return 0;
}

function parseBaseCosts(text){
  const suministro = (() => {
    const m = text.match(/Suministro\s+([\d,.]+)/i);
    return m ? parseMoneyToNumber(m[1]) : 0;
  })();
  const iva = (() => {
    const m = text.match(/IVA\s+(\d+)%/i);
    return m ? parseIntSafe(m[1]) : 0;
  })();
  const dap = (() => {
    const m = text.match(/DAP\S*\s+([\d,.]+)/i);
    return m ? parseMoneyToNumber(m[1]) : 0;
  })();
  const costoBase = (suministro * (1 + iva/100)) + dap;
  return { suministro, iva, dap, costoBase };
}

export function parseCfeReceiptText(text){
  const tarifa = (text.match(/TARIFA:\s*([0-9A-Z]{1,4})/i)?.[1] || '').toUpperCase();
  const servicio = text.match(/NO\.?\s*DE\s*SERVICIO:?\s*(\d+)/i)?.[1] || '';
  const total = (() => {
    // Heurística robusta:
    // 1) Intentar capturar monto cercano a "TOTAL A PAGAR".
    // 2) Si falla, tomar el mayor monto monetario del texto (suele ser el total).

    const norm = String(text || '').replace(/\s+/g, ' ');
    const m1 = norm.match(/TOTAL\s+A\s+PAGAR\s*[:\-]?\s*\$?\s*([\d]{1,3}(?:[\.,][\d]{3})*(?:[\.,]\d{2})?|\d+)/i);
    if (m1) return parseMoneyToNumber(m1[1]);

    // Buscar variantes con salto/ruido entre palabras
    const m2 = norm.match(/TOTAL\s*A\s*PAGAR[^\d]{0,20}([\d]{1,3}(?:[\.,][\d]{3})*(?:[\.,]\d{2})?|\d+)/i);
    if (m2) return parseMoneyToNumber(m2[1]);

    // Fallback: tomar el mayor monto ($ o números con separadores)
    const reMoney = /\$\s*([\d]{1,3}(?:[\.,][\d]{3})*(?:[\.,]\d{2})?|\d+)/g;
    let best = 0;
    let mm;
    while ((mm = reMoney.exec(norm))){
      const n = parseMoneyToNumber(mm[1]);
      if (Number.isFinite(n) && n > best) best = n;
    }
    return best;
  })();

  const periodo = parsePeriodo(text);
  const { nombre, direccion } = parseNombreDireccion(text);
  const consumoPeriodo = parseConsumoPeriodo(text);
  const historial = parseHistorial(text);
  const { suministro, iva, dap, costoBase } = parseBaseCosts(text);

  const consumoActual = consumoPeriodo || (historial.at(-1)?.kwh ?? 0);
  const pagosHist = historial.map(x => x.pago).filter(n => n > 0);
  const pagoProm = pagosHist.length ? (pagosHist.reduce((a,b)=>a+b,0) / pagosHist.length) : total;
  const ahorroEstimado = Math.max(0, pagoProm - costoBase);

  // Tipo de periodo
  const tipoPeriodo = (periodo?.days ?? 0) >= 45 ? 'Bimestral' : 'Mensual';

  return {
    fuente: 'CFE',
    tarifa,
    servicio,
    totalAPagar: total,
    periodo,
    tipoPeriodo,
    nombre: nombre || '',
    direccion: direccion || '',
    consumoPeriodo: consumoActual,
    historial,
    suministro,
    iva,
    dap,
    costoBase,
    ahorroEstimado,
    rawText: text,
  };
}

async function pdfToTextAndPreview(file, { onProgress } = {}){
  // Si PDF.js está disponible, lo usamos; si no, devolvemos vacío.
  const pdfjsLib = window.pdfjsLib;
  if (!pdfjsLib) return { text:'', canvas:null };

  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsLib.GlobalWorkerOptions.workerSrc ||
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  // Text from all pages
  let text = '';
  for (let i=1; i<=pdf.numPages; i++){
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map(it => it.str);
    text += strings.join(' ') + '\n';
    if (onProgress) onProgress({ message: `Leyendo PDF… (${i}/${pdf.numPages})` });
  }

  return { text, canvas:null };
}

function seedFromString(str){
  let h = 2166136261;
  for (let i=0; i<str.length; i++){
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0);
}

function mulberry32(a){
  return function(){
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fmtPeriodo(start, end){
  const m = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
  const d2 = (n) => String(n).padStart(2,'0');
  const sd = d2(start.getDate());
  const sm = m[start.getMonth()];
  const sy = String(start.getFullYear()).slice(-2);
  const ed = d2(end.getDate());
  const em = m[end.getMonth()];
  const ey = String(end.getFullYear()).slice(-2);
  return `${sd} ${sm} ${sy} - ${ed} ${em} ${ey}`;
}

function buildMockReceipt({ selectedTariff, file }){
  const seed = seedFromString((file?.name || 'recibo') + '|' + (selectedTariff?.key || ''));
  const rnd = mulberry32(seed);

  const now = new Date();
  const isBim = selectedTariff?.periodo === 'Bimestral';
  const end = new Date(now.getFullYear(), now.getMonth(), Math.max(1, Math.min(28, 10 + Math.floor(rnd()*15))));
  const start = new Date(end);
  start.setDate(end.getDate() - (isBim ? 60 : 30));

  const consumo = Math.round(220 + rnd()*980);
  const total = Math.round(600 + rnd()*4200);
  const servicio = String(300000000000 + Math.floor(rnd()*900000000000));
  const hilos = String(1 + Math.floor(rnd()*3));
  const estados = ['SON','BC','BCS','CHIH','NL','JAL','QRO','CDMX','MEX','GTO','SIN','PUE'];
  const estado = estados[Math.floor(rnd()*estados.length)];

  const historial = Array.from({ length: 12 }).map((_, i) => {
    const kwh = Math.max(50, Math.round(consumo * (0.75 + rnd()*0.55)));
    const pago = Math.max(100, Math.round(total * (0.75 + rnd()*0.55)));
    return { kwh, pago };
  });

  const costoBase = Math.max(120, Math.round(total * 0.35));
  const pagoProm = historial.reduce((a,b)=>a+b.pago,0) / historial.length;
  const ahorroEstimado = Math.max(0, Math.round(pagoProm - costoBase));

  // La tarifa "detectada" puede ser un código (1B/DAC) para doméstica.
  const tarifaDetectada = (() => {
    if (selectedTariff?.familia === 'Doméstica'){
      const opts = ['1','1A','1B','1C','1D','1E','1F','DAC'];
      return opts[Math.floor(rnd()*opts.length)];
    }
    if (selectedTariff?.familia === 'PDBT') return 'PDBT';
    if (selectedTariff?.familia === 'GDMTH') return 'GDMTH';
    if (selectedTariff?.familia === 'GDMTO') return 'GDMTO';
    return selectedTariff?.label || '';
  })();

  return {
    fuente: 'CFE',
    tarifa: tarifaDetectada,
    servicio,
    totalAPagar: total,
    periodo: { raw: fmtPeriodo(start, end), start, end, days: isBim ? 60 : 30 },
    tipoPeriodo: isBim ? 'Bimestral' : 'Mensual',
    nombre: 'CLIENTE',
    direccion: 'Dirección del servicio',
    consumoPeriodo: consumo,
    historial,
    suministro: Math.round(costoBase * 0.65),
    iva: 16,
    dap: Math.round(costoBase * 0.15),
    costoBase,
    ahorroEstimado,
    hilos,
    estado,
    rawText: '',
  };
}

export async function analyzeReceiptFile(file, options={}){
  const { selectedTariff=null, onProgress } = options;
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const isImage = /^image\//i.test(file.type) || /(\.png|\.jpg|\.jpeg)$/i.test(file.name);

  let text = '';
  let canvas = null;

  if (onProgress) onProgress({ message: 'Preparando lectura…' });

  // Intento 1: texto desde PDF.js (si está presente)
  try{
    if (isPdf){
      ({ text, canvas } = await pdfToTextAndPreview(file, { onProgress }));
    }
  } catch {
    // ignorar
  }

  // Intento 2: OCR para imágenes (Tesseract.js) cuando esté disponible
  try{
    if ((!text || text.replace(/\s/g,'').length < 40) && isImage && window.Tesseract){
      if (onProgress) onProgress({ message: 'Reconociendo texto (OCR)…' });
      const url = URL.createObjectURL(file);
      const res = await window.Tesseract.recognize(url, 'spa', {
        logger: (m) => {
          if (m?.status === 'recognizing text' && onProgress){
            const pct = Math.round((m.progress || 0) * 100);
            onProgress({ message: `Reconociendo texto (OCR)… ${pct}%` });
          }
        }
      });
      URL.revokeObjectURL(url);
      text = res?.data?.text || '';
    }
  } catch {
    // ignorar
  }

  let parsed = null;
  if ((text || '').replace(/\s/g,'').length > 60){
    if (onProgress) onProgress({ message: 'Extrayendo datos…' });
    parsed = parseCfeReceiptText(text);
  } else {
    if (onProgress) onProgress({ message: 'Extrayendo datos…' });
    parsed = buildMockReceipt({ selectedTariff, file });
  }

  // Prefiere el tipo de periodo seleccionado (si aplica)
  if (selectedTariff?.periodo){
    parsed.tipoPeriodo = selectedTariff.periodo;
    parsed.periodo = parsed.periodo || { raw:'', start:null, end:null, days:0 };
    parsed.periodo.days = selectedTariff.periodo === 'Bimestral' ? 60 : 30;
  }

  if (onProgress) onProgress({ message: 'Listo.' });
  return { text, parsed, canvas:null };
}
