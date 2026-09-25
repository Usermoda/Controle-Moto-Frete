// ===== storage.js — JSONBin wrapper =====
const JSONBIN_BASE = 'https://api.jsonbin.io/v3/b';
const LS_CREDS = 'motofrete.creds';
const LS_CACHE = 'motofrete.cache';
const LS_SYNCED_AT = 'motofrete.syncedAt';

function getCreds() {
  try {
    const raw = localStorage.getItem(LS_CREDS);
    if (!raw) return null;
    const c = JSON.parse(raw);
    if (!c.binId || !c.masterKey) return null;
    return c;
  } catch { return null; }
}

function saveCreds(binId, masterKey) {
  localStorage.setItem(LS_CREDS, JSON.stringify({ binId: binId.trim(), masterKey: masterKey.trim() }));
}

function clearCreds() {
  localStorage.removeItem(LS_CREDS);
}

async function testConnection(binId, masterKey) {
  const res = await fetch(`${JSONBIN_BASE}/${binId.trim()}/latest`, {
    method: 'GET',
    headers: {
      'X-Master-Key': masterKey.trim(),
      'X-Bin-Meta': 'false'
    }
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HTTP ${res.status}: ${txt.slice(0, 200)}`);
  }
  return res.json();
}

async function loadRemote() {
  const creds = getCreds();
  if (!creds) throw new Error('Sem credenciais');
  const res = await fetch(`${JSONBIN_BASE}/${creds.binId}/latest`, {
    method: 'GET',
    headers: {
      'X-Master-Key': creds.masterKey,
      'X-Bin-Meta': 'false'
    }
  });
  if (!res.ok) throw new Error(`Falha ao carregar (HTTP ${res.status})`);
  const data = await res.json();
  try {
    localStorage.setItem(LS_CACHE, JSON.stringify(data));
    localStorage.setItem(LS_SYNCED_AT, new Date().toISOString());
  } catch {}
  return data;
}

function loadCache() {
  try {
    const raw = localStorage.getItem(LS_CACHE);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function getLastSyncedAt() {
  return localStorage.getItem(LS_SYNCED_AT);
}

function hasCache() {
  return !!localStorage.getItem(LS_CACHE);
}

async function saveRemote(data) {
  const creds = getCreds();
  if (!creds) throw new Error('Sem credenciais');
  const res = await fetch(`${JSONBIN_BASE}/${creds.binId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': creds.masterKey
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Falha ao salvar (HTTP ${res.status}): ${txt.slice(0, 150)}`);
  }
  try {
    localStorage.setItem(LS_CACHE, JSON.stringify(data));
    localStorage.setItem(LS_SYNCED_AT, new Date().toISOString());
  } catch {}
  return res.json();
}

let pendingData = null;
let saveTimer = null;
let statusCb = null;
let saving = false;

function onSyncStatus(cb) {
  statusCb = cb;
}

function setStatus(status, message) {
  if (statusCb) statusCb(status, message);
}

function scheduleSave(data, delayMs = 800) {
  pendingData = data;
  setStatus('pending', 'Alterações pendentes');
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, delayMs);
}

async function flush() {
  if (!pendingData || saving) return;
  const data = pendingData;
  pendingData = null;
  saving = true;
  setStatus('saving', 'Salvando...');
  try {
    await saveRemote(data);
    setStatus('saved', 'Salvo');
  } catch (err) {
    setStatus('error', err.message);
    pendingData = data;
    throw err;
  } finally {
    saving = false;
  }
}

async function saveNow(data) {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  pendingData = null;
  saving = true;
  setStatus('saving', 'Salvando...');
  try {
    await saveRemote(data);
    setStatus('saved', 'Salvo');
  } catch (err) {
    setStatus('error', err.message);
    throw err;
  } finally {
    saving = false;
  }
}
