// ===== resumos-ui.js =====
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
  const totais = totaisGerais(state.data.lancamentos, state.data.config);

  const $totais = document.querySelector('#totais-gerais');
  $totais.innerHTML = `
    <div class="summary-card receita"><div class="label">Total Receita</div><div class="value">${fmtBRL(totais.receita)}</div></div>
    <div class="summary-card despesa"><div class="label">Total Despesa</div><div class="value">${fmtBRL(totais.despesa)}</div></div>
    <div class="summary-card liquido"><div class="label">Lucro Líquido</div><div class="value">${fmtBRL(totais.liquido)}</div></div>
    <div class="summary-card"><div class="label">Combustível</div><div class="value">${fmtBRL(totais.combustivel)}</div></div>
    <div class="summary-card"><div class="label">Manutenção</div><div class="value">${fmtBRL(totais.manutencao)}</div></div>
    <div class="summary-card"><div class="label">Dias faturamento</div><div class="value">${totais.diasFat}</div></div>
    <div class="summary-card"><div class="label">Média/lançamento</div><div class="value">${fmtBRL(totais.mediaReceita)}</div></div>
    <div class="summary-card"><div class="label">Total Guardado</div><div class="value">${fmtBRL(totais.guardado)}</div></div>
    <div class="summary-card"><div class="label">Meta Reserva</div><div class="value">${fmtBRL(totais.metaReservaAcumulada)}</div></div>
    <div class="summary-card ${totais.saldoReserva >= 0 ? 'receita' : 'despesa'}">
      <div class="label">Saldo Reserva</div><div class="value">${fmtBRL(totais.saldoReserva)}</div>
    </div>
  `;

  const $tbody = document.querySelector('#tabela-mensal tbody');
  if (!rows.length) {
    $tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Sem dados ainda.</td></tr>';
    return;
  }
  $tbody.innerHTML = rows.map(r => `
    <tr>
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
