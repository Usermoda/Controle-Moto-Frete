// ===== resumos-ui.js =====
const mensalState = { mesFiltro: '' };

function renderSemanal() {
  const rows = resumoSemanal(state.data.lancamentos, state.data.config);
  const $tbody = document.querySelector('#tabela-semanal tbody');
  if (!rows.length) {
    $tbody.innerHTML = '<tr><td colspan="10" class="empty-state">Sem dados ainda.</td></tr>';
    return;
  }
  $tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${r.mes}</td>
      <td>${r.semana}</td>
      <td class="align-right">${fmtBRL(r.receita)}</td>
      <td class="align-right">${fmtBRL(r.combustivel)}</td>
      <td class="align-right">${fmtBRL(r.manutencao)}</td>
      <td class="align-right">${fmtBRL(r.outras)}</td>
      <td class="align-right">${fmtBRL(r.totalDespesas)}</td>
      <td class="align-right">${fmtBRL(r.liquido)}</td>
      <td class="align-right">${r.guardado ? fmtBRL(r.guardado) : '—'}</td>
      <td class="${classeStatus(r.status)}">${r.status}</td>
    </tr>
  `).join('');
}

function renderMensal() {
  const rows = resumoMensal(state.data.lancamentos, state.data.config);
  const mesFiltro = mensalState.mesFiltro;

  // Popula dropdown de meses (todos que aparecem nos lançamentos)
  const $filter = document.querySelector('#filter-mensal-mes');
  if ($filter) {
    const mesesUnicos = [...new Set(state.data.lancamentos.map(l => l.mes).filter(Boolean))]
      .sort((a, b) => MESES.indexOf(a) - MESES.indexOf(b));
    const cur = $filter.value;
    $filter.innerHTML = '<option value="">Todos os meses (geral)</option>' +
      mesesUnicos.map(m => `<option value="${m}">${m}</option>`).join('');
    $filter.value = mesesUnicos.includes(cur) ? cur : (mesesUnicos.includes(mesFiltro) ? mesFiltro : '');
  }

  // Se filtrado por mês: calcula totais só daquele mês; senão de tudo
  const lancsAtivos = mesFiltro
    ? state.data.lancamentos.filter(l => l.mes === mesFiltro)
    : state.data.lancamentos;
  const totais = totaisGerais(lancsAtivos, state.data.config);

  const prefixo = mesFiltro || 'Total';
  const $title = document.querySelector('#mensal-title');
  if ($title) $title.textContent = mesFiltro ? `Resumo — ${mesFiltro}` : 'Resumo Mensal';

  const $totais = document.querySelector('#totais-gerais');
  $totais.innerHTML = `
    <div class="summary-card receita"><div class="label">${prefixo} Receita</div><div class="value">${fmtBRL(totais.receita)}</div></div>
    <div class="summary-card despesa"><div class="label">${prefixo} Despesa</div><div class="value">${fmtBRL(totais.despesa)}</div></div>
    <div class="summary-card liquido"><div class="label">Lucro Líquido</div><div class="value">${fmtBRL(totais.liquido)}</div></div>
    <div class="summary-card"><div class="label">Combustível</div><div class="value">${fmtBRL(totais.combustivel)}</div></div>
    <div class="summary-card"><div class="label">Manutenção</div><div class="value">${fmtBRL(totais.manutencao)}</div></div>
    <div class="summary-card"><div class="label">Dias faturamento</div><div class="value">${totais.diasFat}</div></div>
    <div class="summary-card"><div class="label">Média/lançamento</div><div class="value">${fmtBRL(totais.mediaReceita)}</div></div>
    <div class="summary-card"><div class="label">${prefixo} Guardado</div><div class="value">${fmtBRL(totais.guardado)}</div></div>
    <div class="summary-card"><div class="label">Meta Reserva</div><div class="value">${fmtBRL(totais.metaReservaAcumulada)}</div></div>
    <div class="summary-card ${totais.saldoReserva >= 0 ? 'receita' : 'despesa'}">
      <div class="label">Saldo Reserva</div><div class="value">${fmtBRL(totais.saldoReserva)}</div>
    </div>
  `;

  // Tabela mensal — sempre mostra todos (contexto histórico), destaca o filtrado
  const $tbody = document.querySelector('#tabela-mensal tbody');
  if (!rows.length) {
    $tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Sem dados ainda.</td></tr>';
    return;
  }
  $tbody.innerHTML = rows.map(r => `
    <tr${r.mes === mesFiltro ? ' class="highlighted"' : ''}>
      <td>${r.mes}</td>
      <td class="align-right">${fmtBRL(r.receita)}</td>
      <td class="align-right">${fmtBRL(r.despesa)}</td>
      <td class="align-right">${fmtBRL(r.liquido)}</td>
      <td class="align-right">${r.diasFat}</td>
      <td class="align-right">${fmtBRL(r.media)}</td>
      <td class="align-right">${r.guardado ? fmtBRL(r.guardado) : '—'}</td>
      <td class="${classeStatus(r.statusReserva)}">${r.statusReserva}</td>
    </tr>
  `).join('');
}

function initMensalUI() {
  const $filter = document.querySelector('#filter-mensal-mes');
  if ($filter) $filter.onchange = (e) => {
    mensalState.mesFiltro = e.target.value;
    renderMensal();
  };
}
