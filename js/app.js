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
  onSyncStatus((status, message) => {
    $wrap.className = 'sync-status ' + status;
    $label.textContent = ({
      saved: 'Salvo',
      saving: 'Salvando...',
      pending: 'Pendente',
      error: 'Erro ao salvar',
      offline: 'Offline'
    })[status] || status;
    $wrap.title = message || '';
  });
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
  if ($fab) $fab.classList.add('visible'); // aba padrão = lancamentos
}

function toast(message, type = 'info') {
  const $t = document.getElementById('toast');
  $t.textContent = message;
  $t.className = 'toast ' + type;
  setTimeout(() => $t.classList.add('hidden'), 3000);
}

async function bootstrapApp() {
  showApp();
  try {
    const remote = await loadRemote();
    state.data = {
      version: remote.version || 1,
      config: { ...DEFAULT_CONFIG, ...(remote.config || {}) },
      lancamentos: Array.isArray(remote.lancamentos) ? remote.lancamentos : []
    };
  } catch (err) {
    toast('Erro ao carregar do JSONBin: ' + err.message, 'error');
    const cache = loadCache();
    if (cache) {
      state.data = {
        version: cache.version || 1,
        config: { ...DEFAULT_CONFIG, ...(cache.config || {}) },
        lancamentos: Array.isArray(cache.lancamentos) ? cache.lancamentos : []
      };
      toast('Usando cache local.', 'info');
    }
  }
  reRenderAll();
}

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

window.addEventListener('DOMContentLoaded', () => {
  injectIcons();
  bindSyncStatus();
  bindSetup();
  bindTabs();
  initLancamentosUI();
  initConfigUI();
  initExportUI();
  // FAB (mobile) — reusa handler do botão novo
  const $fab = document.getElementById('fab-novo');
  if ($fab) $fab.onclick = () => document.getElementById('btn-novo').click();

  // Se tem credenciais hardcoded, salva no localStorage e loga direto
  if (typeof CREDENTIALS !== 'undefined' && CREDENTIALS.binId && CREDENTIALS.masterKey) {
    saveCreds(CREDENTIALS.binId, CREDENTIALS.masterKey);
    bootstrapApp();
    return;
  }
  const creds = getCreds();
  if (!creds) {
    showSetup();
  } else {
    bootstrapApp();
  }
});

window.addEventListener('beforeunload', () => {
  flush().catch(() => {});
});
