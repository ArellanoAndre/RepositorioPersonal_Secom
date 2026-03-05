const KEY_QUOTES = 'secom_quotes_v1';
const KEY_PROJECTS = 'secom_projects_v1';
const KEY_QUOTE_SEQ = 'secom_quote_seq_v1';
const KEY_PROJECT_SEQ = 'secom_project_seq_v1';

function readJson(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}

export function getQuotes(){
  return readJson(KEY_QUOTES, []);
}

function readInt(key, fallback=0){
  try{
    const raw = localStorage.getItem(key);
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

function writeInt(key, value){
  localStorage.setItem(key, String(value));
}

function ensureQuoteSeq(){
  // If sequence doesn't exist, derive it from existing COT-### ids
  const existing = getQuotes();
  const seq = readInt(KEY_QUOTE_SEQ, 0);
  if (seq > 0) return seq;
  let max = 0;
  for (const q of existing){
    const m = String(q.id || '').match(/^COT-(\d{1,})$/);
    if (m){
      const v = Number(m[1]);
      if (Number.isFinite(v)) max = Math.max(max, v);
    }
  }
  const next = max + 1;
  writeInt(KEY_QUOTE_SEQ, next);
  return next;
}

function nextQuoteId(){
  const next = ensureQuoteSeq();
  // Persist the next value for the following save
  writeInt(KEY_QUOTE_SEQ, next + 1);
  return `COT-${String(next).padStart(3,'0')}`;
}

function ensureProjectSeq(){
  const existing = getProjects();
  const seq = readInt(KEY_PROJECT_SEQ, 0);
  if (seq > 0) return seq;
  let max = 0;
  for (const p of existing){
    const m = String(p.id || '').match(/^PRO-(\d{1,})$/);
    if (m){
      const v = Number(m[1]);
      if (Number.isFinite(v)) max = Math.max(max, v);
    }
  }
  const next = max + 1;
  writeInt(KEY_PROJECT_SEQ, next);
  return next;
}

function nextProjectId(){
  const next = ensureProjectSeq();
  writeInt(KEY_PROJECT_SEQ, next + 1);
  return `PRO-${String(next).padStart(3,'0')}`;
}

export function saveQuote(quote){
  const all = getQuotes();
  const q = { id: nextQuoteId(), createdAt: Date.now(), status: 'Guardada', ...quote };
  all.unshift(q);
  writeJson(KEY_QUOTES, all);
  return q;
}

export function updateQuote(id, patch){
  const all = getQuotes();
  const idx = all.findIndex(q => q.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...patch, updatedAt: Date.now() };
  writeJson(KEY_QUOTES, all);
  return all[idx];
}

export function removeQuote(id){
  const all = getQuotes().filter(q => q.id !== id);
  writeJson(KEY_QUOTES, all);
}

export function getProjects(){
  return readJson(KEY_PROJECTS, []);
}

export function saveProjectFromQuote(quote){
  const all = getProjects();

  // Avoid duplicates (one project per quote)
  const qid = quote?.id;
  if (qid){
    const existing = all.find(p => p.quoteId === qid);
    if (existing) return existing;
  }

  const p = {
    id: nextProjectId(),
    createdAt: Date.now(),
    status: quote?.status || 'En planeación',
    ...quote,
    quoteId: qid,
  };
  all.unshift(p);
  writeJson(KEY_PROJECTS, all);
  return p;
}

export function saveProject(project){
  const all = getProjects();
  const p = {
    id: nextProjectId(),
    createdAt: Date.now(),
    status: 'En planeación',
    ...project,
  };
  all.unshift(p);
  writeJson(KEY_PROJECTS, all);
  return p;
}

export function updateProject(id, patch){
  const all = getProjects();
  const idx = all.findIndex(p => p.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...patch, updatedAt: Date.now() };
  writeJson(KEY_PROJECTS, all);
  return all[idx];
}

export function removeProject(id){
  const all = getProjects().filter(p => p.id !== id);
  writeJson(KEY_PROJECTS, all);
}

export function resetAllData(){
  localStorage.removeItem(KEY_QUOTES);
  localStorage.removeItem(KEY_PROJECTS);
  localStorage.removeItem(KEY_QUOTE_SEQ);
  localStorage.removeItem(KEY_PROJECT_SEQ);
}
