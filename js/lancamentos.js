// ===== lancamentos.js — CRUD + form =====
const $ = (sel) => document.querySelector(sel);

const filters = { mes: '', tipo: '' };

function uid() {
  return `l-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function openModal(lanc = null) {
  const modal = $('#modal-lancamento');
  const title = $('#modal-title');
  const form = $('#form-lancamento');
  title.textContent = lanc ? 'Editar lançamento' : 'Novo lançamento';

  populateSelect($('#f-tipo'), state.data.config.tipos);
  populateSelect($('#f-categoria'), state.data.config.categorias);
  populateSelect($('#f-app'), ['', ...state.data.config.apps]);

  if (lanc) {
    $('#f-id').value = lanc.id;
    $('#f-data').value = lanc.data || '';
    $('#f-tipo').value = lanc.tipo || 'Receita';
    $('#f-categoria').value = lanc.categoria || '';
    $('#f-app').value = lanc.app || '';
    $('#f-valor').value = lanc.valor ?? '';
    $('#f-guardado').value = lanc.valorGuardado ?? 0;
    $('#f-km').value = lanc.km ?? '';
    $('#f-referencia').value = lanc.referencia || 'Diario';
    $('#f-descricao').value = lanc.descricao || '';
    $('#f-observacao').value = lanc.observacao || '';
  } else {
    form.reset();
    $('#f-id').value = '';
    const today = new Date();
    const iso = today.toISOString().slice(0, 10);
    $('#f-data').value = iso;
    $('#f-tipo').value = 'Receita';
    $('#f-categoria').value = 'Entrega';
    $('#f-app').value = state.data.config.apps[0] || '';
    $('#f-guardado').value = 0;
    $('#f-descricao').value = 'Faturamento do dia';
    $('#f-referencia').value = 'Diario';
  }
  aplicarRegrasCategoria();
  modal.classList.remove('hidden');
}

function closeModal() {
  $('#modal-lancamento').classList.add('hidden');
}

// Mapeamento categoria → tipo padrão
const CATEGORIA_TIPO = {
  'Entrega': 'Receita',
  'Bonus': 'Receita',
  'Gorjeta': 'Receita',
  'Combustivel': 'Despesa',
  'Manutencao': 'Despesa',
  'Alimentacao': 'Despesa',
  'Outros': 'Despesa',
  'Folga': 'Controle'
};

function aplicarRegrasCategoria() {
  const cat = $('#f-categoria').value;
  const tipoSugerido = CATEGORIA_TIPO[cat];
  if (tipoSugerido) $('#f-tipo').value = tipoSugerido;

  const isFolga = cat === 'Folga';
  const $valor = $('#f-valor'), $app = $('#f-app'), $km = $('#f-km'),
        $desc = $('#f-descricao'), $guardado = $('#f-guardado');

  // Esconde/mostra os .field containers para deixar o form limpo
  const setHidden = (input, hidden) => {
    const field = input.closest('.field');
    if (field) field.classList.toggle('hidden', hidden);
    input.required = !hidden && input.hasAttribute('data-required');
  };
  // Marca campos que originalmente são required (uma vez)
  if (!$valor.hasAttribute('data-required') && $valor.required) $valor.setAttribute('data-required', '1');

  setHidden($valor, isFolga);
  setHidden($app, isFolga);
  setHidden($km, isFolga);
  setHidden($guardado, isFolga);

  if (isFolga) {
    $valor.value = 0;
    $app.value = '';
    $km.value = '';
    $guardado.value = 0;
    $desc.value = 'Dia de folga';
  } else if (!$desc.value || $desc.value === 'Dia de folga') {
    $desc.value = tipoSugerido === 'Receita' ? 'Faturamento do dia' :
                  cat === 'Combustivel' ? 'Abastecimento' :
                  cat === 'Manutencao' ? 'Manutenção da moto' :
                  cat === 'Alimentacao' ? 'Alimentação' : '';
  }
}

function populateSelect(el, options) {
  const current = el.value;
  el.innerHTML = '';
  options.forEach(opt => {
    const o = document.createElement('option');
    o.value = opt; o.textContent = opt || '—';
    el.appendChild(o);
  });
  if (options.includes(current)) el.value = current;
}

async function submitForm(e) {
  e.preventDefault();
  const id = $('#f-id').value;
  const data = normalizarData($('#f-data').value);
  const derived = derivarCamposData(data);
  const lanc = {
    id: id || uid(),
    data,
    mes: derived.mes,
    semana: derived.semana,
    diaSemana: derived.diaSemana,
    app: $('#f-app').value || null,
    tipo: $('#f-tipo').value,
    categoria: $('#f-categoria').value,
    descricao: $('#f-descricao').value || null,
    valor: parseFloat($('#f-valor').value) || 0,
    km: $('#f-km').value ? parseFloat($('#f-km').value) : null,
    observacao: $('#f-observacao').value || null,
    referencia: $('#f-referencia').value || 'Diario',
    valorGuardado: parseFloat($('#f-guardado').value) || 0
  };

  const $submitBtn = $('#form-lancamento button[type="submit"]');
  if ($submitBtn) { $submitBtn.disabled = true; $submitBtn.textContent = 'Sincronizando...'; }

  try {
    // Sync antes de salvar → garante que estamos aplicando mudança na versão mais recente
    await syncAntesDeSalvar();

    if (id) {
      const idx = state.data.lancamentos.findIndex(l => l.id === id);
      if (idx >= 0) state.data.lancamentos[idx] = lanc;
      else state.data.lancamentos.push(lanc); // foi apagado remotamente; re-adiciona
    } else {
      state.data.lancamentos.push(lanc);
    }
    closeModal();
    await saveImmediately();
  } finally {
    if ($submitBtn) { $submitBtn.disabled = false; $submitBtn.textContent = 'Salvar'; }
  }
}

function ordenarLancs(list) {
  return [...list].sort((a, b) => {
    if (a.data && b.data) return b.data.localeCompare(a.data);
    if (a.data) return -1;
    if (b.data) return 1;
    const ma = MESES.indexOf(a.mes || ''), mb = MESES.indexOf(b.mes || '');
    if (ma !== mb) return mb - ma;
    return (b.semana || '').localeCompare(a.semana || '');
  });
}

function fmtData(l) {
  if (l.data) {
    // Aceita "YYYY-MM-DD" ou "YYYY-MM-DDTHH:MM:SS..." — extrai só a data
    const isoDate = String(l.data).slice(0, 10);
    const [y, m, d] = isoDate.split('-');
    if (y && m && d) return `${d}/${m}/${y.slice(2)}`;
  }
  return l.semana || '—';
}

function renderLancamentos() {
  const $mes = $('#filter-mes');
  const mesesUnicos = [...new Set(state.data.lancamentos.map(l => l.mes).filter(Boolean))]
    .sort((a, b) => MESES.indexOf(a) - MESES.indexOf(b));
  const curMes = $mes.value;
  $mes.innerHTML = '<option value="">Todos os meses</option>' +
    mesesUnicos.map(m => `<option value="${m}">${m}</option>`).join('');
  if (mesesUnicos.includes(curMes)) $mes.value = curMes;

  let list = state.data.lancamentos.filter(l => {
    if (filters.mes && l.mes !== filters.mes) return false;
    if (filters.tipo && l.tipo !== filters.tipo) return false;
    return true;
  });
  list = ordenarLancs(list);

  const receita = list.filter(l => l.tipo === 'Receita').reduce((s, l) => s + (Number(l.valor) || 0), 0);
  const despesa = list.filter(l => l.tipo === 'Despesa').reduce((s, l) => s + (Number(l.valor) || 0), 0);
  const guardado = list.reduce((s, l) => s + (Number(l.valorGuardado) || 0), 0);
  const $sum = $('#quick-summary');
  $sum.innerHTML = `
    <div class="summary-card receita"><div class="label">Receita</div><div class="value">${fmtBRL(receita)}</div></div>
    <div class="summary-card despesa"><div class="label">Despesa</div><div class="value">${fmtBRL(despesa)}</div></div>
    <div class="summary-card liquido"><div class="label">Líquido</div><div class="value">${fmtBRL(receita - despesa)}</div></div>
    <div class="summary-card"><div class="label">Guardado</div><div class="value">${fmtBRL(guardado)}</div></div>
    <div class="summary-card"><div class="label">Lançamentos</div><div class="value">${list.length}</div></div>
  `;

  const $tbody = $('#tabela-lancamentos tbody');
  const $empty = $('#empty-lancamentos');
  if (!list.length) {
    $tbody.innerHTML = '';
    $empty.classList.remove('hidden');
    return;
  }
  $empty.classList.add('hidden');
  $tbody.innerHTML = list.map(l => `
    <tr data-id="${l.id}">
      <td>${fmtData(l)}</td>
      <td>${l.diaSemana || ''}</td>
      <td>${l.app || '—'}</td>
      <td><span class="badge badge-${(l.tipo || '').toLowerCase()}">${l.tipo || ''}</span></td>
      <td>${l.categoria || ''}</td>
      <td class="align-right">${fmtBRL(l.valor)}</td>
      <td class="align-right">${l.valorGuardado ? fmtBRL(l.valorGuardado) : '—'}</td>
      <td>
        <div class="row-actions">
          <button class="edit" data-action="edit" data-id="${l.id}" title="Editar">${icon('edit', 'icon-sm')}</button>
          <button class="delete" data-action="delete" data-id="${l.id}" title="Excluir">${icon('trash', 'icon-sm')}</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function initLancamentosUI() {
  $('#btn-novo').onclick = () => openModal();
  $('#form-lancamento').onsubmit = submitForm;
  $('#f-categoria').onchange = aplicarRegrasCategoria;

  document.querySelectorAll('#modal-lancamento [data-close]').forEach(el => {
    el.onclick = closeModal;
  });

  $('#filter-mes').onchange = (e) => {
    filters.mes = e.target.value;
    renderLancamentos();
  };
  document.querySelectorAll('#filter-tipo .chip').forEach(chip => {
    chip.onclick = () => {
      document.querySelectorAll('#filter-tipo .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      filters.tipo = chip.dataset.tipo;
      renderLancamentos();
    };
  });

  $('#tabela-lancamentos tbody').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    const lanc = state.data.lancamentos.find(l => l.id === id);
    if (!lanc) return;
    if (btn.dataset.action === 'edit') {
      openModal(lanc);
    } else if (btn.dataset.action === 'delete') {
      if (confirm('Excluir este lançamento?')) {
        (async () => {
          await syncAntesDeSalvar();
          state.data.lancamentos = state.data.lancamentos.filter(l => l.id !== id);
          await saveImmediately();
        })();
      }
    }
  });
}
