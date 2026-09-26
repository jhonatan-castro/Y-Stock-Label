const CHAVE = 'estoque-etiquetas-recebimentos-v2';
const $ = id => document.getElementById(id);
let recebimentos = lerDados();

// Caminho relativo: a janela de impressão recebe a pasta atual como base para carregar a logo.
const LOGO_PADRAO = 'logo.png';
const BASE_DO_SISTEMA = new URL('.', window.location.href).href;

const dataHoje = () => new Date().toISOString().slice(0, 10);

// Elementos da tabela de inserção
const corpoInsercao = $('corpoInsercao');
const resumoTabela = $('resumoTabela');

// Inicialização
$('pesquisa').addEventListener('input', renderizarHistorico);
$('exportar').addEventListener('click', exportarBackup);
$('checkTodos').addEventListener('change', alternarTodos);
$('btnImprimirSelecionados').addEventListener('click', imprimirSelecionados);

$('btnAdicionarLinha').addEventListener('click', () => adicionarLinha({}, true));
$('btnMaisLinha').addEventListener('click', () => adicionarLinha({}, true));
$('btnLimparTabela').addEventListener('click', confirmarLimparTabela);
$('btnApenasSalvar').addEventListener('click', apenasSalvarTabela);

// Modal Colar do Excel
const modalExcel = $('modalExcel');
$('btnColarExcel').addEventListener('click', () => {
  $('textoExcel').value = '';
  modalExcel.showModal();
  $('textoExcel').focus();
});
$('btnFecharModal').addEventListener('click', () => modalExcel.close());
$('btnCancelarExcel').addEventListener('click', () => modalExcel.close());
$('btnImportarExcel').addEventListener('click', () => {
  const texto = $('textoExcel').value;
  if (texto.trim()) {
    processarTextoColado(texto);
  }
  modalExcel.close();
});

// Atualiza o resumo quando as configurações de página mudarem
$('porPagina').addEventListener('input', atualizarResumoTabela);

// Submissão da Tabela de Chegadas
$('formularioTabela').addEventListener('submit', salvarEImprimirTabela);

function lerDados() {
  try { return JSON.parse(localStorage.getItem(CHAVE) || '[]'); }
  catch { return []; }
}

function salvarDados() {
  localStorage.setItem(CHAVE, JSON.stringify(recebimentos));
}

function dataFormatada(data) {
  if (!data) return '';
  return data.split('-').reverse().join('/');
}

function normalizarData(texto) {
  if (!texto) return dataHoje();
  texto = texto.trim();
  // Se for DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(texto)) {
    const [d, m, y] = texto.split('/');
    return `${y}-${m}-${d}`;
  }
  // Se já for YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    return texto;
  }
  return dataHoje();
}

function aviso(texto = '', sucesso = false) {
  const el = $('aviso');
  el.textContent = texto;
  el.style.color = sucesso ? '#0d7a3e' : '#a12727';
}

function seguro(texto) {
  const d = document.createElement('div');
  d.textContent = texto ?? '';
  return d.innerHTML;
}

/* ========================================================
   TABELA DE INSERÇÃO DE NOVAS CHEGADAS
======================================================== */

function criarLinhaInsercao(dados = {}) {
  const tr = document.createElement('tr');

  // Obtém a última data informada na tabela (para conveniência do usuário)
  const ultimaData = obterUltimaDataInformada() || dataHoje();

  tr.innerHTML = `
    <td class="num-linha">1</td>
    <td>
      <input class="input-codigo" autocomplete="off" placeholder="Ex: MAN418..." value="${seguro(dados.codigo || '')}">
    </td>
    <td>
      <input class="input-endereco" autocomplete="off" placeholder="Ex: 01.01.01.01A" value="${seguro(dados.endereco || '')}">
    </td>
    <td>
      <input class="input-unidade" value="${seguro(dados.unidade || 'UN')}">
    </td>
    <td>
      <input class="input-data" type="date" value="${dados.dataChegada || ultimaData}">
    </td>
    <td>
      <input class="input-qtd" type="number" min="1" max="999" value="${dados.quantidade || 1}">
    </td>
    <td style="text-align:center">
      <button type="button" class="btn-remover-linha" title="Remover linha">&times;</button>
    </td>
  `;

  const inputCodigo = tr.querySelector('.input-codigo');
  const inputEndereco = tr.querySelector('.input-endereco');
  const inputUnidade = tr.querySelector('.input-unidade');
  const inputData = tr.querySelector('.input-data');
  const inputQtd = tr.querySelector('.input-qtd');
  const btnRemover = tr.querySelector('.btn-remover-linha');

  // Monitora alterações para atualizar o contador
  [inputCodigo, inputEndereco, inputUnidade, inputData, inputQtd].forEach(inp => {
    inp.addEventListener('input', atualizarResumoTabela);
  });

  // Atalhos de teclado para agilidade
  inputCodigo.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      inputEndereco.focus();
    }
  });

  inputEndereco.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const proximaLinha = tr.nextElementSibling;
      if (proximaLinha) {
        proximaLinha.querySelector('.input-codigo').focus();
      } else {
        adicionarLinha({}, true);
      }
    }
  });

  inputQtd.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const proximaLinha = tr.nextElementSibling;
      if (proximaLinha) {
        proximaLinha.querySelector('.input-codigo').focus();
      } else {
        adicionarLinha({}, true);
      }
    }
  });

  tr.addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      salvarEImprimirTabela(e);
    }
  });

  // Intercepta colagem (Excel / TSV) diretamente em qualquer input da tabela
  tr.addEventListener('paste', e => {
    const texto = (e.clipboardData || window.clipboardData)?.getData('text') || '';
    if (texto.includes('\t') || (texto.includes('\n') && texto.trim().split('\n').length > 1)) {
      e.preventDefault();
      processarTextoColado(texto);
    }
  });

  btnRemover.addEventListener('click', () => {
    if (corpoInsercao.children.length > 1) {
      tr.remove();
      atualizarNumerosLinhas();
    }
  });

  return tr;
}

function obterUltimaDataInformada() {
  const inputsData = corpoInsercao.querySelectorAll('.input-data');
  if (!inputsData.length) return null;
  const ultimo = inputsData[inputsData.length - 1];
  return ultimo.value || null;
}

function adicionarLinha(dados = {}, focar = false) {
  const tr = criarLinhaInsercao(dados);
  corpoInsercao.appendChild(tr);
  atualizarNumerosLinhas();
  if (focar) {
    const input = tr.querySelector('.input-codigo');
    input.focus();
    input.select?.();
  }
  return tr;
}

function atualizarNumerosLinhas() {
  const linhas = Array.from(corpoInsercao.children);
  linhas.forEach((tr, idx) => {
    tr.querySelector('.num-linha').textContent = idx + 1;
    const btnRemover = tr.querySelector('.btn-remover-linha');
    btnRemover.disabled = (linhas.length === 1);
  });
  atualizarResumoTabela();
}

function atualizarResumoTabela() {
  const linhas = Array.from(corpoInsercao.children);
  let totalItensValidos = 0;
  let totalEtiquetas = 0;

  linhas.forEach(tr => {
    const cod = tr.querySelector('.input-codigo').value.trim();
    const qtd = Number(tr.querySelector('.input-qtd').value) || 1;
    if (cod) {
      totalItensValidos++;
      totalEtiquetas += Math.max(1, qtd);
    }
  });

  const porPagina = Number($('porPagina').value) || 18;
  const totalFolhas = Math.max(1, Math.ceil(totalEtiquetas / porPagina));

  if (totalItensValidos === 0) {
    resumoTabela.textContent = '0 itens • 0 etiquetas';
  } else {
    const textoFolhas = totalFolhas === 1 ? '1 folha A4' : `${totalFolhas} folhas A4`;
    resumoTabela.textContent = `${totalItensValidos} item(ns) • ${totalEtiquetas} etiqueta(s) no total (${textoFolhas})`;
  }
}

function confirmarLimparTabela() {
  const temDados = Array.from(corpoInsercao.querySelectorAll('.input-codigo')).some(i => i.value.trim());
  if (temDados && !confirm('Deseja limpar todos os itens da tabela de chegadas?')) {
    return;
  }
  corpoInsercao.replaceChildren();
  adicionarLinha({}, true);
  aviso('');
}

// Processa dados copiados do Excel
function processarTextoColado(texto) {
  if (!texto || !texto.trim()) return;
  const linhasTexto = texto.trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (!linhasTexto.length) return;

  const itensExtraidos = [];
  const padraoData = dataHoje();

  linhasTexto.forEach(linha => {
    if (linha.includes('\t')) {
      const colunas = linha.split('\t').map(c => c.trim());
      const codigo = colunas[0] || '';
      const endereco = colunas[1] || '';
      const unidade = colunas[2] || 'UN';
      const dataChegada = normalizarData(colunas[3]);
      const quantidade = colunas[4] && Number(colunas[4]) > 0 ? Number(colunas[4]) : 1;
      if (codigo) {
        itensExtraidos.push({ codigo, endereco, unidade, dataChegada, quantidade });
      }
    } else {
      // Linha sem TAB: pode ter vírgulas ou ser apenas o código
      const partes = linha.split(/[,;]+/).map(p => p.trim()).filter(Boolean);
      partes.forEach(codigo => {
        itensExtraidos.push({ codigo, endereco: '', unidade: 'UN', dataChegada: padraoData, quantidade: 1 });
      });
    }
  });

  if (!itensExtraidos.length) return;

  // Se a primeira linha estiver vazia, substitui
  const primeiraLinha = corpoInsercao.children[0];
  const primeiroCodigo = primeiraLinha ? primeiraLinha.querySelector('.input-codigo').value.trim() : null;

  if (corpoInsercao.children.length === 1 && !primeiroCodigo) {
    corpoInsercao.replaceChildren();
  }

  itensExtraidos.forEach(item => {
    adicionarLinha(item, false);
  });

  atualizarNumerosLinhas();
  aviso(`Foram inseridos ${itensExtraidos.length} item(ns) na tabela.`, true);

  // Foca no primeiro campo de endereço que estiver vazio, ou no código da primeira linha inserida
  const vazio = Array.from(corpoInsercao.querySelectorAll('.input-endereco')).find(i => !i.value.trim());
  if (vazio) vazio.focus();
}

/* ========================================================
   SALVAR DADOS DA TABELA
======================================================== */

function extrairItensValidos() {
  const linhas = Array.from(corpoInsercao.children);
  const itens = [];

  for (let i = 0; i < linhas.length; i++) {
    const tr = linhas[i];
    const codigo = tr.querySelector('.input-codigo').value.trim();
    const endereco = tr.querySelector('.input-endereco').value.trim();
    const unidade = tr.querySelector('.input-unidade').value.trim() || 'UN';
    const dataChegada = tr.querySelector('.input-data').value || dataHoje();
    const quantidade = Number(tr.querySelector('.input-qtd').value) || 1;

    // Linha completamente em branco é ignorada
    if (!codigo && !endereco) {
      continue;
    }

    if (!codigo) {
      tr.querySelector('.input-codigo').focus();
      aviso(`Linha #${i + 1}: Informe o código do item.`);
      return null;
    }

    if (!endereco) {
      tr.querySelector('.input-endereco').focus();
      aviso(`Linha #${i + 1} (${codigo}): Informe o endereço.`);
      return null;
    }

    itens.push({
      codigo,
      endereco,
      unidade,
      dataChegada,
      quantidade: Math.max(1, quantidade),
      logo: LOGO_PADRAO
    });
  }

  if (!itens.length) {
    aviso('Preencha ao menos uma linha com Código e Endereço.');
    return null;
  }

  return itens;
}

function apenasSalvarTabela() {
  const itens = extrairItensValidos();
  if (!itens) return;

  const agora = Date.now();
  const itensParaSalvar = itens.map((it, idx) => ({
    id: String(agora + idx),
    codigo: it.codigo,
    endereco: it.endereco,
    unidade: it.unidade,
    dataChegada: it.dataChegada,
    logo: LOGO_PADRAO
  }));

  recebimentos.unshift(...itensParaSalvar);
  salvarDados();
  renderizarHistorico();
  aviso(`✓ ${itensParaSalvar.length} item(ns) salvo(s) com sucesso no histórico!`, true);

  // Reinicia a tabela com 1 linha vazia pronta para a próxima chegada
  corpoInsercao.replaceChildren();
  adicionarLinha({}, true);
}

function salvarEImprimirTabela(e) {
  if (e) e.preventDefault();
  const itens = extrairItensValidos();
  if (!itens) return;

  const porPagina = Number($('porPagina').value) || 18;

  if (!Number.isInteger(porPagina) || porPagina < 1 || porPagina > 18) {
    return aviso('Informe de 1 a 18 etiquetas por página.');
  }

  // Salva cada item no histórico
  const agora = Date.now();
  const itensParaSalvar = itens.map((it, idx) => ({
    id: String(agora + idx),
    codigo: it.codigo,
    endereco: it.endereco,
    unidade: it.unidade,
    dataChegada: it.dataChegada,
    logo: LOGO_PADRAO
  }));

  recebimentos.unshift(...itensParaSalvar);
  salvarDados();
  renderizarHistorico();
  aviso(`✓ ${itensParaSalvar.length} item(ns) salvo(s)! Gerando etiquetas...`, true);

  // Prepara lista para impressão com a quantidade de cada um
  const itensParaImprimir = itens.map((it, idx) => ({
    item: itensParaSalvar[idx],
    quantidade: it.quantidade
  }));

  imprimirEtiquetas(itensParaImprimir, porPagina);

  // Reinicia a tabela com 1 linha vazia pronta para a próxima chegada
  corpoInsercao.replaceChildren();
  adicionarLinha({}, true);
}

/* ========================================================
   HISTÓRICO DE CHEGADAS
======================================================== */

function renderizarHistorico() {
  const termo = $('pesquisa').value.trim().toLowerCase();
  const lista = recebimentos.filter(item => [item.codigo, item.endereco, item.unidade].some(valor => String(valor).toLowerCase().includes(termo)));
  const corpo = $('historico');
  corpo.replaceChildren();

  $('checkTodos').checked = false;
  atualizarBotaoSelecionados();

  if (!lista.length) {
    const linha = corpo.insertRow();
    const celula = linha.insertCell();
    celula.colSpan = 6;
    celula.className = 'vazio';
    celula.textContent = 'Nenhum recebimento encontrado.';
    return;
  }

  lista.forEach(item => {
    const linha = corpo.insertRow();

    // Checkbox de seleção
    const tdCheck = linha.insertCell();
    tdCheck.className = 'col-check';
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.className = 'check-custom check-item';
    check.dataset.id = item.id;
    check.addEventListener('change', atualizarBotaoSelecionados);
    tdCheck.appendChild(check);

    // Colunas de dados
    [item.codigo, item.endereco, item.unidade, dataFormatada(item.dataChegada)].forEach(valor => {
      linha.insertCell().textContent = valor;
    });

    // Ações individuais
    const tdAcoes = linha.insertCell();
    tdAcoes.className = 'col-acoes';
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.textContent = 'Imprimir';
    botao.addEventListener('click', () => imprimir(item));
    tdAcoes.appendChild(botao);
  });
}

function alternarTodos(e) {
  const marcados = e.target.checked;
  document.querySelectorAll('.check-item').forEach(c => { c.checked = marcados; });
  atualizarBotaoSelecionados();
}

function atualizarBotaoSelecionados() {
  const marcados = document.querySelectorAll('.check-item:checked');
  const botao = $('btnImprimirSelecionados');
  const contador = $('contagemSelecionados');
  if (marcados.length > 0) {
    botao.style.display = 'inline-block';
    contador.textContent = marcados.length;
  } else {
    botao.style.display = 'none';
  }
}

function imprimirSelecionados() {
  const idsSelecionados = Array.from(document.querySelectorAll('.check-item:checked')).map(c => c.dataset.id);
  if (!idsSelecionados.length) return;

  const itens = recebimentos.filter(r => idsSelecionados.includes(String(r.id)));
  if (!itens.length) return;

  const respQtd = prompt(`Imprimir ${itens.length} itens selecionados na mesma página.\n\nQuantas etiquetas de CADA item deseja imprimir?`, '1');
  if (respQtd === null) return;
  const quantidade = Number(respQtd);
  if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 999) return aviso('Quantidade de etiquetas inválida.');

  const porPaginaPadrao = $('porPagina').value || '18';
  const porPagina = Number(porPaginaPadrao);

  const itensParaImprimir = itens.map(item => ({ item, quantidade }));
  imprimirEtiquetas(itensParaImprimir, porPagina);
}

// Impressão individual a partir do histórico
function imprimir(item, quantidade, porPagina) {
  if (quantidade === undefined) {
    const resposta = prompt('Quantas etiquetas deseja imprimir deste item?', '1');
    if (resposta === null) return;
    quantidade = Number(resposta);
  }
  if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 999) return;

  if (porPagina === undefined) {
    const valForm = Number($('porPagina').value);
    const padrao = (Number.isInteger(valForm) && valForm >= 1 && valForm <= 18) ? String(valForm) : '18';
    const resposta = prompt('Quantas etiquetas por página? (1 a 18)', padrao);
    if (resposta === null) return;
    porPagina = Number(resposta);
  }
  if (!Number.isInteger(porPagina) || porPagina < 1 || porPagina > 18) return;

  imprimirEtiquetas([{ item, quantidade }], porPagina);
}

/* ========================================================
   MOTOR DE IMPRESSÃO (TODAS AS INFORMAÇÕES JUNTAS NA ETIQUETA)
======================================================== */

function imprimirEtiquetas(itensComQtd, porPagina = 18) {
  if (!Number.isInteger(porPagina) || porPagina < 1 || porPagina > 18) porPagina = 18;

  const janela = window.open('', '_blank');
  if (!janela) return aviso('Permita pop-ups para este arquivo e tente novamente.');

  const etiquetas = [];

  // Gera todas as etiquetas de cada item com TODAS as informações juntas
  for (const entrada of itensComQtd) {
    const item = entrada.item || entrada;
    const qtd = Number(entrada.quantidade || 1);
    for (let i = 0; i < qtd; i++) {
      etiquetas.push(montarEtiqueta(item));
    }
  }

  if (!etiquetas.length) return aviso('Nenhuma etiqueta para imprimir.');

  const totalPaginas = Math.ceil(etiquetas.length / porPagina);
  const paginas = Array.from({ length: totalPaginas }, (_, indice) =>
    '<section class="pagina">' + etiquetas.slice(indice * porPagina, (indice + 1) * porPagina).join('') + '</section>'
  ).join('');

  janela.document.open();
  janela.document.write('<!doctype html><html><head><meta charset="utf-8"><base href="' + BASE_DO_SISTEMA + '"><title>Etiquetas</title><style>' + estiloImpressao() + '</style></head><body>' + paginas + '</body></html>');
  janela.document.close();
  janela.focus();

  janela.addEventListener('afterprint', () => {
    janela.close();
    window.focus();
  }, { once: true });

  const imprimirAgora = () => setTimeout(() => janela.print(), 150);
  const imagens = Array.from(janela.document.images);
  if (!imagens.length || imagens.every(imagem => imagem.complete)) {
    imprimirAgora();
  } else {
    Promise.all(imagens.map(imagem => new Promise(concluir => {
      imagem.onload = concluir;
      imagem.onerror = concluir;
    }))).then(imprimirAgora);
  }
}

// Monta a etiqueta com TODAS as informações: Código, Logo, Endereço, Unidade e Data
function montarEtiqueta(item) {
  const logo = '<img class="logo" src="' + LOGO_PADRAO + '" alt="Logo Yamaha">';
  return '<article class="etiqueta">' +
    '<div class="codigo-linha">' +
      '<div class="codigo-conteudo">' +
        '<div class="rotulo codigo-rotulo">CÓDIGO DO ITEM</div>' +
        '<div class="codigo">' + seguro(item.codigo) + '</div>' +
      '</div>' +
      logo +
    '</div>' +
    '<hr>' +
    '<div class="dados">' +
      '<div>' +
        '<div class="rotulo">ENDEREÇO</div>' +
        '<div class="valor endereco-valor">' + seguro(item.endereco) + '</div>' +
      '</div>' +
      '<div>' +
        '<div class="rotulo">UNIDADE</div>' +
        '<div class="valor">' + seguro(item.unidade).toUpperCase() + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="data">' +
      '<span>DATA DE CHEGADA</span>' +
      '<strong>' + dataFormatada(item.dataChegada) + '</strong>' +
    '</div>' +
  '</article>';
}

function estiloImpressao() {
  return `
    /* Formato da folha e margens da impressão */
    @page { size: A4 portrait; margin: 5mm; }

    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, sans-serif; }

    .pagina {
      /* Área ocupada por três etiquetas de 55 mm e dois espaços de 5 mm. */
      width: 190mm;
      min-height: 287mm;
      display: grid;
      /* Três colunas de 55 mm */
      grid-template-columns: repeat(3, 55mm);
      /* Altura de cada etiqueta: 30 mm */
      grid-auto-rows: 30mm;
      /* Distância entre etiquetas: 5 mm */
      gap: 5mm;
      align-content: start;
      break-after: page;
      page-break-after: always;
    }

    .pagina:last-child {
      break-after: auto;
      page-break-after: auto;
    }

    .etiqueta {
      width: 55mm;
      height: 30mm;
      padding: 2mm;
      border: .45mm solid #003d7c;
      border-radius: 3mm;
      position: relative;
      overflow: hidden;
    }

    .etiqueta-vazia {
      border: none !important;
      visibility: hidden !important;
      box-shadow: none !important;
      background: transparent !important;
    }

    .codigo-linha { display: flex; align-items: center; justify-content: space-between; gap: 2mm; min-height: 7mm; }
    .codigo-conteudo { min-width: 0; }
    .logo { max-width: 14mm; width: auto; height: 5mm; object-fit: contain; }
    .rotulo { color: #54616d; font-size: 5.8pt; font-weight: bold; }
    .codigo-rotulo { margin-top: 0; }
    .codigo { margin: .4mm 0; font-size: 10pt; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    hr { border: 0; border-top: .3mm solid #c8d0d8; margin: 1mm 0; }

    .dados { display: grid; grid-template-columns: 32mm 1fr; gap: 1mm; margin-top: .8mm; }
    .valor { margin-top: .5mm; font-size: 7pt; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .endereco-valor { font-size: 8.5pt; }

    .data { position: absolute; left: 2mm; right: 2mm; bottom: 2mm; height: 3.5mm; padding: 0; background: transparent; color: #003d7c; font-size: 5.3pt; font-weight: bold; }
    .data span { position: absolute; left: 0; bottom: .5mm; }
    .data strong { position: absolute; left: 34mm; bottom: 0; font-size: 7pt; white-space: nowrap; }

    @media screen {
      body { background: #ddd; }
      .pagina { margin: 10px auto; background: #fff; box-shadow: 0 0 10px rgba(0,0,0,0.15); }
    }
  `;
}

function exportarBackup() {
  const linhas = recebimentos.map(item => '<Row><Cell><Data ss:Type="String">' + xml(item.codigo) + '</Data></Cell><Cell><Data ss:Type="String">' + xml(item.endereco) + '</Data></Cell><Cell><Data ss:Type="String">' + xml(item.unidade) + '</Data></Cell><Cell><Data ss:Type="String">' + xml(dataFormatada(item.dataChegada)) + '</Data></Cell></Row>').join('');
  const planilha = '<?xml version="1.0" encoding="UTF-8"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Etiquetas"><Table><Row><Cell><Data ss:Type="String">Código</Data></Cell><Cell><Data ss:Type="String">Endereço</Data></Cell><Cell><Data ss:Type="String">Unidade</Data></Cell><Cell><Data ss:Type="String">Data de chegada</Data></Cell></Row>' + linhas + '</Table></Worksheet></Workbook>';
  const arquivo = new Blob(['\ufeff', planilha], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const link = document.createElement('a'); link.href = URL.createObjectURL(arquivo); link.download = 'etiquetas-estoque.xls'; link.click(); URL.revokeObjectURL(link.href);
}

function xml(texto) {
  return String(texto).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

// Inicializa com 1 linha vazia na tabela
adicionarLinha({}, false);
renderizarHistorico();
