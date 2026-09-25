// ===== app.js — bootstrap =====
const DEFAULT_CONFIG = {
  metaSemanal: 570,
  metaMinima: 470,
  metaReservaDiaria: 10,
  apps: ['iFood', '99Food', 'iFood/99Food (junto)'],
  tipos: ['Receita', 'Despesa', 'Controle'],
  categorias: ['Entrega', 'Combustivel', 'Manutencao', 'Alimentacao', 'Folga', 'Bonus', 'Gorjeta', 'Outros']
};

const state = {
  data: { version: 1, config: { ...DEFAULT_CONFIG }, lancamentos: [] },
  currentTab: 'lancamentos'
};

function markDirty() {
  scheduleSave(state.data);
  reRenderAll();
}

async function saveImmediately() {
  await saveNow(state.data);
  reRenderAll();
}

function reRenderAll() {
  renderLancamentos();
  renderSemanal();
  renderMensal();
  renderConfig();
}

function showSetup() {
  document.getElementById('setup-screen').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
}

function showApp() {
  document.getElementById('setup-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  // Mostra FAB se a aba atual é lancamentos (padrão)
  const $fab = document.getElementById('fab-novo');
  if ($fab) $fab.classList.toggle('visible', state.currentTab === 'lancamentos');
}

function bindSetup() {
  const $bin = document.getElementById('setup-bin');
  const $key = document.getElementById('setup-key');
  const $status = document.getElementById('setup-status');
  const $test = document.getElementById('setup-test');
  const $save = document.getElementById('setup-save');

  $test.onclick = async () => {
    $status.textContent = 'Testando...';
    $status.className = 'setup-status';
    try {
      await testConnection($bin.value, $key.value);
      $status.textContent = '✓ Conexão OK. Você pode salvar.';
      $status.className = 'setup-status ok';
    } catch (err) {
      $status.textContent = `✗ ${err.message}`;
      $status.className = 'setup-status err';
    }
  };

  $save.onclick = async () => {
    if (!$bin.value.trim() || !$key.value.trim()) {
      $status.textContent = 'Preencha ambos os campos.';
      $status.className = 'setup-status err';
      return;
    }
    $status.textContent = 'Conectando...';
    $status.className = 'setup-status';
    try {
      await testConnection($bin.value, $key.value);
      saveCreds($bin.value, $key.value);
      await bootstrapApp();
    } catch (err) {
      $status.textContent = `✗ ${err.message}`;
      $status.className = 'setup-status err';
    }
  };
}

function bindSyncStatus() {
  const $wrap = document.getElementById('sync-status');
  const $label = $wrap.querySelector('.sync-label');
  const render = (status, message) => {
    $wrap.className = 'sync-status ' + status;
    $label.textContent = ({
      saved: 'Salvo',
      saving: 'Salvando...',
      pending: 'Pendente',
      error: 'Erro',
      offline: 'Offline'
    })[status] || status;
    $wrap.title = message || '';
  };
  onSyncStatus(render);
  _syncStatusFn = render;
}

function bindTabs() {
  const tabs = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.tab-panel');
  const $fab = document.getElementById('fab-novo');
  tabs.forEach(tab => {
    tab.onclick = () => {
      const name = tab.dataset.tab;
      state.currentTab = name;
      tabs.forEach(t => t.classList.toggle('active', t === tab));
      panels.forEach(p => p.classList.toggle('active', p.dataset.panel === name));
      if ($fab) $fab.classList.toggle('visible', name === 'lancamentos');
    };
  });
}

function toast(message, type = 'info') {
  const $t = document.getElementById('toast');
  $t.textContent = message;
  $t.className = 'toast ' + type;
  setTimeout(() => $t.classList.add('hidden'), 3000);
}

function applyData(data) {
  const lancs = Array.isArray(data.lancamentos) ? data.lancamentos : [];
  // Migration: normaliza datas com formato ISO datetime pra YYYY-MM-DD
  for (const l of lancs) {
    if (l.data && typeof l.data === 'string' && l.data.length > 10) {
      l.data = l.data.slice(0, 10);
    }
  }
  state.data = {
    version: data.version || 1,
    config: { ...DEFAULT_CONFIG, ...(data.config || {}) },
    lancamentos: lancs
  };
}

// Bootstrap: cache-first, só baixa do JSONBin se não tiver cache local
async function bootstrapApp() {
  showApp();
  const cache = loadCache();
  if (cache) {
    applyData(cache);
    setSyncStatus('saved', `Local (última sync: ${fmtSyncTime(getLastSyncedAt())})`);
    reRenderAll();
    return;
  }
  // Primeira vez ou cache foi limpo — baixa do remoto
  try {
    setSyncStatus('saving', 'Baixando dados do JSONBin...');
    const remote = await loadRemote();
    applyData(remote);
    setSyncStatus('saved', 'Baixado do JSONBin');
  } catch (err) {
    toast('Erro ao carregar do JSONBin: ' + err.message, 'error');
    setSyncStatus('error', err.message);
    applyData({}); // vazio
  }
  reRenderAll();
}

// Sync silencioso antes de salvar — puxa remoto e mergeia com estado local
// Retorna true se ok, false se falhou (nesse caso não bloqueamos o save)
async function syncAntesDeSalvar() {
  try {
    setSyncStatus('saving', 'Sincronizando antes de salvar...');
    const remote = await loadRemote();
    // Substitui config e lancamentos pelos do remoto — o save posterior
    // vai adicionar/editar/excluir em cima da versão mais recente
    if (remote && Array.isArray(remote.lancamentos)) {
      state.data.lancamentos = remote.lancamentos;
      state.data.config = { ...DEFAULT_CONFIG, ...(remote.config || {}) };
    }
    return true;
  } catch (err) {
    setSyncStatus('error', 'Sync falhou');
    toast('Sync falhou: ' + err.message + '. Salvando mesmo assim.', 'error');
    return false;
  }
}

// Sync manual — envia pendentes primeiro (se houver), depois baixa do JSONBin
async function sincronizarDaNuvem() {
  const $btn = document.getElementById('header-sync');
  if ($btn) $btn.classList.add('syncing');
  try {
    // 1. Envia alterações locais pendentes primeiro (se houver)
    await flush().catch(() => {});
    // 2. Baixa versão mais recente do JSONBin
    setSyncStatus('saving', 'Baixando do JSONBin...');
    const remote = await loadRemote();
    applyData(remote);
    setSyncStatus('saved', 'Sincronizado');
    reRenderAll();
    toast('Dados sincronizados', 'success');
  } catch (err) {
    setSyncStatus('error', err.message);
    toast('Erro na sync: ' + err.message, 'error');
  } finally {
    if ($btn) $btn.classList.remove('syncing');
  }
}

function fmtSyncTime(iso) {
  if (!iso) return 'nunca';
  const d = new Date(iso);
  const now = new Date();
  const diffMin = Math.floor((now - d) / 60000);
  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `${diffMin} min atrás`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h atrás`;
  return d.toLocaleDateString('pt-BR');
}

// Callback do sync status pra facilitar setar depois do bootstrap
let _syncStatusFn = null;
function setSyncStatus(status, message) { if (_syncStatusFn) _syncStatusFn(status, message); }

async function loadSeed() {
  const seedLancs = SEED_DATA.lancamentos.map(l => ({
    ...l,
    id: l.id || `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }));
  state.data.lancamentos = seedLancs;
  state.data.config = { ...DEFAULT_CONFIG, ...state.data.config };
  await saveImmediately();
  toast(`${seedLancs.length} lançamentos carregados`, 'success');
}

function injectIcons() {
  document.querySelectorAll('[data-icon]').forEach(el => {
    const name = el.dataset.icon;
    if (!name || el.querySelector('svg')) return;
    el.insertAdjacentHTML('afterbegin', icon(name));
  });
}

function startAppAfterAuth() {
  // Se tem credenciais hardcoded, salva no localStorage e loga direto no JSONBin
  if (typeof CREDENTIALS !== 'undefined' && CREDENTIALS.binId && CREDENTIALS.masterKey) {
    saveCreds(CREDENTIALS.binId, CREDENTIALS.masterKey);
    bootstrapApp();
    return;
  }
  const creds = getCreds();
  if (!creds) showSetup();
  else bootstrapApp();
}

window.addEventListener('DOMContentLoaded', () => {
  injectIcons();
  bindSyncStatus();
  bindSetup();
  bindTabs();
  initLancamentosUI();
  initConfigUI();
  initMensalUI();
  initExportUI();
  initDropdowns();
  initLoginUI();
  // FAB (mobile) — reusa handler do botão novo
  const $fab = document.getElementById('fab-novo');
  if ($fab) $fab.onclick = () => document.getElementById('btn-novo').click();

  // Botão de sync no header
  const $headerSync = document.getElementById('header-sync');
  if ($headerSync) $headerSync.onclick = () => sincronizarDaNuvem();

  // Gate de auth
  if (!isLoggedIn()) {
    document.getElementById('login-screen').classList.remove('hidden');
    setTimeout(() => document.getElementById('login-user').focus(), 100);
    return;
  }
  startAppAfterAuth();
});

window.addEventListener('beforeunload', () => {
  flush().catch(() => {});
});
