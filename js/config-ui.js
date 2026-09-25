// ===== config-ui.js =====
function renderConfig() {
  const cfg = state.data.config;
  document.querySelector('#cfg-meta-semanal').value = cfg.metaSemanal ?? '';
  document.querySelector('#cfg-meta-minima').value = cfg.metaMinima ?? '';
  document.querySelector('#cfg-meta-reserva').value = cfg.metaReservaDiaria ?? '';
  renderTags('#cfg-apps', cfg.apps, 'apps');
  renderTags('#cfg-categorias', cfg.categorias, 'categorias');

  const creds = getCreds();
  if (creds) {
    document.querySelector('#cfg-bin').value = creds.binId;
    document.querySelector('#cfg-key').value = creds.masterKey;
  }
}

function renderTags(sel, items, key) {
  const $el = document.querySelector(sel);
  $el.innerHTML = items.map((it, i) => `
    <span class="tag">${it}<button data-remove="${key}" data-idx="${i}" title="Remover">&times;</button></span>
  `).join('') || '<span class="muted small">Vazio</span>';
  $el.querySelectorAll('button[data-remove]').forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.idx, 10);
      state.data.config[key].splice(idx, 1);
      markDirty();
    };
  });
}

function initConfigUI() {
  document.querySelector('#cfg-salvar-metas').onclick = () => {
    state.data.config.metaSemanal = parseFloat(document.querySelector('#cfg-meta-semanal').value) || 0;
    state.data.config.metaMinima = parseFloat(document.querySelector('#cfg-meta-minima').value) || 0;
    state.data.config.metaReservaDiaria = parseFloat(document.querySelector('#cfg-meta-reserva').value) || 0;
    markDirty();
    toast('Metas salvas', 'success');
  };

  document.querySelectorAll('button[data-add]').forEach(btn => {
    btn.onclick = () => {
      const key = btn.dataset.add;
      const inputSel = key === 'apps' ? '#cfg-app-novo' : '#cfg-categoria-novo';
      const $inp = document.querySelector(inputSel);
      const v = $inp.value.trim();
      if (!v) return;
      if (!state.data.config[key].includes(v)) {
        state.data.config[key].push(v);
        markDirty();
      }
      $inp.value = '';
    };
  });

  document.querySelector('#cfg-testar').onclick = async () => {
    const $st = document.querySelector('#cfg-conexao-status');
    $st.textContent = 'Testando...';
    try {
      await testConnection(document.querySelector('#cfg-bin').value, document.querySelector('#cfg-key').value);
      $st.textContent = '✓ Conexão OK';
      $st.style.color = 'var(--success)';
    } catch (err) {
      $st.textContent = '✗ ' + err.message;
      $st.style.color = 'var(--danger)';
    }
  };

  document.querySelector('#cfg-salvar-conexao').onclick = () => {
    const bin = document.querySelector('#cfg-bin').value.trim();
    const key = document.querySelector('#cfg-key').value.trim();
    if (!bin || !key) { toast('Preencha Bin ID e Master Key', 'error'); return; }
    saveCreds(bin, key);
    toast('Credenciais salvas. Recarregue a página.', 'success');
  };

  document.querySelector('#cfg-exportar').onclick = () => {
    const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `motofrete-backup-${stamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  document.querySelector('#cfg-importar-file').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed.lancamentos)) throw new Error('JSON inválido: falta lancamentos[]');
      if (!confirm(`Importar ${parsed.lancamentos.length} lançamentos? Isso substitui os atuais.`)) return;
      state.data = {
        version: parsed.version || 1,
        config: { ...state.data.config, ...(parsed.config || {}) },
        lancamentos: parsed.lancamentos
      };
      await saveImmediately();
      toast('Backup importado', 'success');
    } catch (err) {
      toast('Erro ao importar: ' + err.message, 'error');
    } finally {
      e.target.value = '';
    }
  };

  document.querySelector('#cfg-seed').onclick = async () => {
    if (state.data.lancamentos.length > 0 &&
        !confirm(`Isso vai substituir os ${state.data.lancamentos.length} lançamentos atuais. Continuar?`)) return;
    try {
      await loadSeed();
    } catch (err) {
      toast('Erro: ' + err.message, 'error');
    }
  };

  document.querySelector('#cfg-limpar').onclick = async () => {
    if (!confirm('Apagar TODOS os lançamentos? Esta ação não pode ser desfeita.')) return;
    const c = prompt('Digite APAGAR para confirmar:');
    if (c !== 'APAGAR') { toast('Cancelado', 'info'); return; }
    state.data.lancamentos = [];
    await saveImmediately();
    toast('Lançamentos apagados', 'success');
  };
}
