// ===== export.js — Exportação PDF e Excel =====

const CDN_XLSX = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
const CDN_JSPDF = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
const CDN_AUTOTABLE = 'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js';

const loadedScripts = new Set();

function loadScript(src) {
  if (loadedScripts.has(src)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => { loadedScripts.add(src); resolve(); };
    s.onerror = () => reject(new Error(`Falha ao carregar ${src}`));
    document.head.appendChild(s);
  });
}

async function ensureXLSX() {
  if (typeof XLSX === 'undefined') await loadScript(CDN_XLSX);
}

async function ensurePDF() {
  if (typeof window.jspdf === 'undefined') await loadScript(CDN_JSPDF);
  if (!window.jspdf.jsPDF.API.autoTable) await loadScript(CDN_AUTOTABLE);
}

function stampFile(prefix) {
  const stamp = new Date().toISOString().slice(0, 10);
  return `${prefix}-${stamp}`;
}

// ============ Coletores de dados ============
function dadosLancamentos() {
  const list = [...state.data.lancamentos].sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  return {
    headers: ['Data', 'Mês', 'Semana', 'Dia', 'App', 'Tipo', 'Categoria', 'Descrição', 'Valor', 'Km', 'Guardado', 'Observação'],
    rows: list.map(l => [
      l.data || '', l.mes || '', l.semana || '', l.diaSemana || '',
      l.app || '', l.tipo || '', l.categoria || '', l.descricao || '',
      Number(l.valor) || 0, l.km ?? '', Number(l.valorGuardado) || 0, l.observacao || ''
    ])
  };
}

function dadosSemanal() {
  const rows = resumoSemanal(state.data.lancamentos, state.data.config);
  return {
    headers: ['Mês', 'Semana', 'Receita', 'Combustível', 'Manutenção', 'Outras', 'Despesas', 'Líquido', 'Guardado', 'Status'],
    rows: rows.map(r => [
      r.mes, r.semana, r.receita, r.combustivel, r.manutencao,
      r.outras, r.totalDespesas, r.liquido, r.guardado, r.status
    ])
  };
}

function dadosMensal() {
  const rows = resumoMensal(state.data.lancamentos, state.data.config);
  return {
    headers: ['Mês', 'Receita', 'Despesa', 'Líquido', 'Dias c/ fat.', 'Média/lanç.', 'Guardado', 'Status Reserva'],
    rows: rows.map(r => [
      r.mes, r.receita, r.despesa, r.liquido, r.diasFat, r.media, r.guardado, r.statusReserva
    ])
  };
}

// ============ Excel ============
async function exportarExcel(tipo) {
  try {
    await ensureXLSX();
    const wb = XLSX.utils.book_new();

    const datasets = tipo === 'all'
      ? [
          { nome: 'Lançamentos', data: dadosLancamentos() },
          { nome: 'Resumo Semanal', data: dadosSemanal() },
          { nome: 'Resumo Mensal', data: dadosMensal() }
        ]
      : tipo === 'lancamentos'
      ? [{ nome: 'Lançamentos', data: dadosLancamentos() }]
      : tipo === 'semanal'
      ? [{ nome: 'Resumo Semanal', data: dadosSemanal() }]
      : [{ nome: 'Resumo Mensal', data: dadosMensal() }];

    datasets.forEach(({ nome, data }) => {
      const ws = XLSX.utils.aoa_to_sheet([data.headers, ...data.rows]);
      // Auto width
      const colWidths = data.headers.map((h, i) => {
        const maxLen = Math.max(h.length, ...data.rows.map(r => String(r[i] ?? '').length));
        return { wch: Math.min(maxLen + 2, 40) };
      });
      ws['!cols'] = colWidths;
      XLSX.utils.book_append_sheet(wb, ws, nome.slice(0, 31));
    });

    XLSX.writeFile(wb, `${stampFile('motofrete')}.xlsx`);
    toast('Excel exportado', 'success');
  } catch (err) {
    toast('Erro ao exportar: ' + err.message, 'error');
  }
}

// ============ PDF ============
async function exportarPDF(tipo) {
  try {
    await ensurePDF();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    const datasets = tipo === 'all'
      ? [
          { titulo: 'Lançamentos', data: dadosLancamentos() },
          { titulo: 'Resumo Semanal', data: dadosSemanal() },
          { titulo: 'Resumo Mensal', data: dadosMensal() }
        ]
      : tipo === 'lancamentos'
      ? [{ titulo: 'Lançamentos', data: dadosLancamentos() }]
      : tipo === 'semanal'
      ? [{ titulo: 'Resumo Semanal', data: dadosSemanal() }]
      : [{ titulo: 'Resumo Mensal', data: dadosMensal() }];

    // Header geral
    doc.setFontSize(16);
    doc.text('Controle Motofrete', 14, 15);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, 14, 21);

    let firstTable = true;
    datasets.forEach(({ titulo, data }, idx) => {
      if (!firstTable) doc.addPage();
      firstTable = false;

      doc.setFontSize(13);
      doc.setTextColor(0);
      doc.text(titulo, 14, 30);

      const body = data.rows.map(row =>
        row.map(v => typeof v === 'number' ? v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(v ?? ''))
      );

      doc.autoTable({
        startY: 35,
        head: [data.headers],
        body,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { left: 8, right: 8 }
      });
    });

    doc.save(`${stampFile('motofrete')}.pdf`);
    toast('PDF exportado', 'success');
  } catch (err) {
    toast('Erro ao exportar: ' + err.message, 'error');
  }
}

// ============ Bind buttons ============
function initExportUI() {
  document.querySelectorAll('[data-export]').forEach(btn => {
    btn.onclick = () => {
      const [formato, tipo] = btn.dataset.export.split(':');
      if (formato === 'excel') exportarExcel(tipo);
      else if (formato === 'pdf') exportarPDF(tipo);
    };
  });
}
