// ===== resumos.js — cálculos =====
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const SEMANAS = ['Semana 1','Semana 2','Semana 3','Semana 4','Semana 5'];
const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sab'];

const CAT_COMBUSTIVEL = 'Combustivel';
const CAT_MANUTENCAO = 'Manutencao';

function derivarCamposData(isoDate) {
  if (!isoDate) return { mes: null, semana: null, diaSemana: null };
  // Normaliza pra "YYYY-MM-DD" (aceita full ISO datetime também)
  const s = String(isoDate).slice(0, 10);
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return { mes: null, semana: null, diaSemana: null };
  const date = new Date(y, m - 1, d);
  const mes = MESES[m - 1];
  const primeiroDia = new Date(y, m - 1, 1);
  const offset = primeiroDia.getDay();
  const semanaNum = Math.ceil((d + offset) / 7);
  const semana = `Semana ${Math.min(semanaNum, 5)}`;
  const diaSemana = DIAS_SEMANA[date.getDay()];
  return { mes, semana, diaSemana };
}

// Normaliza qualquer data pra "YYYY-MM-DD"
function normalizarData(input) {
  if (!input) return '';
  return String(input).slice(0, 10);
}

function categoriaDespesaOutra(cat) {
  return cat && cat !== CAT_COMBUSTIVEL && cat !== CAT_MANUTENCAO;
}

function resumoSemanal(lancamentos, config) {
  const map = new Map();
  for (const l of lancamentos) {
    if (!l.mes || !l.semana) continue;
    const key = `${l.mes}||${l.semana}`;
    if (!map.has(key)) {
      map.set(key, {
        mes: l.mes, semana: l.semana,
        receita: 0, combustivel: 0, manutencao: 0, outras: 0,
        guardado: 0, diasFat: new Set()
      });
    }
    const s = map.get(key);
    const valor = Number(l.valor) || 0;
    if (l.tipo === 'Receita') {
      s.receita += valor;
      if (valor > 0 && l.diaSemana) s.diasFat.add(`${l.data || ''}-${l.diaSemana}`);
    } else if (l.tipo === 'Despesa') {
      if (l.categoria === CAT_COMBUSTIVEL) s.combustivel += valor;
      else if (l.categoria === CAT_MANUTENCAO) s.manutencao += valor;
      else if (categoriaDespesaOutra(l.categoria)) s.outras += valor;
    }
    s.guardado += Number(l.valorGuardado) || 0;
  }

  const rows = [];
  for (const [, s] of map) {
    const totalDespesas = s.combustivel + s.manutencao + s.outras;
    const liquido = s.receita - totalDespesas;
    let status = 'Sem movimento';
    if (s.receita > 0) {
      if (s.receita >= (config.metaSemanal || 0)) status = 'Meta Batida';
      else if (s.receita >= (config.metaMinima || 0)) status = 'Meta Mínima Batida';
      else status = 'Abaixo da Meta';
    }
    const metaReserva = s.diasFat.size * (config.metaReservaDiaria || 0);
    rows.push({
      mes: s.mes, semana: s.semana,
      receita: s.receita, combustivel: s.combustivel, manutencao: s.manutencao,
      outras: s.outras, totalDespesas, liquido,
      metaSemanal: config.metaSemanal, status,
      metaReserva, guardado: s.guardado, diferenca: s.guardado - metaReserva
    });
  }
  rows.sort((a, b) => {
    const im = MESES.indexOf(a.mes) - MESES.indexOf(b.mes);
    if (im !== 0) return im;
    return SEMANAS.indexOf(a.semana) - SEMANAS.indexOf(b.semana);
  });
  return rows;
}

function resumoMensal(lancamentos, config) {
  const map = new Map();
  for (const l of lancamentos) {
    if (!l.mes) continue;
    if (!map.has(l.mes)) {
      map.set(l.mes, {
        mes: l.mes, receita: 0, despesa: 0,
        combustivel: 0, manutencao: 0,
        diasFat: new Set(), guardado: 0, qtdReceita: 0
      });
    }
    const s = map.get(l.mes);
    const valor = Number(l.valor) || 0;
    if (l.tipo === 'Receita') {
      s.receita += valor;
      if (valor > 0) {
        s.qtdReceita += 1;
        if (l.data) s.diasFat.add(l.data);
        else if (l.diaSemana) s.diasFat.add(`${l.semana}-${l.diaSemana}`);
      }
    } else if (l.tipo === 'Despesa') {
      s.despesa += valor;
      if (l.categoria === CAT_COMBUSTIVEL) s.combustivel += valor;
      else if (l.categoria === CAT_MANUTENCAO) s.manutencao += valor;
    }
    s.guardado += Number(l.valorGuardado) || 0;
  }

  const rows = [];
  for (const [, s] of map) {
    const liquido = s.receita - s.despesa;
    const media = s.qtdReceita > 0 ? s.receita / s.qtdReceita : 0;
    const metaReserva = s.diasFat.size * (config.metaReservaDiaria || 0);
    const diferenca = s.guardado - metaReserva;
    let statusReserva = 'Sem movimento';
    if (metaReserva > 0) statusReserva = diferenca >= 0 ? 'Meta Batida' : 'Abaixo da Meta';
    rows.push({
      mes: s.mes, receita: s.receita, despesa: s.despesa, liquido,
      combustivel: s.combustivel, manutencao: s.manutencao,
      diasFat: s.diasFat.size, media,
      metaReserva, guardado: s.guardado, diferenca, statusReserva
    });
  }
  rows.sort((a, b) => MESES.indexOf(a.mes) - MESES.indexOf(b.mes));
  return rows;
}

function totaisGerais(lancamentos, config) {
  let receita = 0, despesa = 0, combustivel = 0, manutencao = 0, guardado = 0;
  let qtdReceita = 0;
  const diasFat = new Set();
  const diasFolga = new Set();
  for (const l of lancamentos) {
    const valor = Number(l.valor) || 0;
    if (l.tipo === 'Receita') {
      receita += valor;
      if (valor > 0) {
        qtdReceita += 1;
        if (l.data) diasFat.add(l.data);
      }
    } else if (l.tipo === 'Despesa') {
      despesa += valor;
      if (l.categoria === CAT_COMBUSTIVEL) combustivel += valor;
      else if (l.categoria === CAT_MANUTENCAO) manutencao += valor;
    } else if (l.tipo === 'Controle' && l.categoria === 'Folga') {
      if (l.data) diasFolga.add(l.data);
      else if (l.mes && l.semana && l.diaSemana) diasFolga.add(`${l.mes}-${l.semana}-${l.diaSemana}`);
    }
    guardado += Number(l.valorGuardado) || 0;
  }
  const metaReserva = diasFat.size * (config.metaReservaDiaria || 0);
  return {
    receita, despesa, liquido: receita - despesa,
    combustivel, manutencao,
    diasFat: diasFat.size, diasFolga: diasFolga.size,
    mediaReceita: qtdReceita > 0 ? receita / qtdReceita : 0,
    guardado, metaReservaAcumulada: metaReserva,
    saldoReserva: guardado - metaReserva
  };
}

function fmtBRL(n) {
  return (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function classeStatus(status) {
  if (status === 'Meta Batida') return 'status-batida';
  if (status === 'Meta Mínima Batida') return 'status-minima';
  if (status === 'Abaixo da Meta') return 'status-abaixo';
  return 'status-sem';
}
