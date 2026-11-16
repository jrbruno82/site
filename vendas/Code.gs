/*
 * Registros de acesso para a planilha Super Descontos.
 * Publique como Web App (executar como proprietário; acesso: qualquer pessoa)
 * e informe a URL da implantação em PLANILHA_API nos dois arquivos HTML.
 */
var PLANILHA_ID = '152quu_L0RTHjXzne_ZTRVpWHCMKzbxQ_KGUcfrvZMyY';
var ABA_ACESSOS = 'acessos';
var COLUNAS_ACESSOS = [
  'Data e hora',
  'Evento',
  'Dispositivo',
  'Navegador',
  'Produto clicado',
  'Categoria selecionada',
  'Faixa de preço',
  'Tipo de oferta selecionado'
];

function doPost(e) {
  var conteudo = e && e.postData && e.postData.contents;
  if (!conteudo || conteudo.length > 20000) return resposta_({ ok: false, erro: 'requisicao_invalida' });

  var dados;
  try {
    dados = JSON.parse(conteudo);
  } catch (erro) {
    return resposta_({ ok: false, erro: 'json_invalido' });
  }
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
    return resposta_({ ok: false, erro: 'requisicao_invalida' });
  }

  var evento = texto_(dados.evento, 20);
  if (['visita', 'clique', 'filtro'].indexOf(evento) < 0) {
    return resposta_({ ok: false, erro: 'evento_invalido' });
  }

  var produto = texto_(dados.produto_clicado, 250);
  if (evento === 'clique' && !produto) return resposta_({ ok: false, erro: 'produto_obrigatorio' });

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return resposta_({ ok: false, erro: 'tente_novamente' });

  try {
    var planilha = SpreadsheetApp.openById(PLANILHA_ID);
    var aba = planilha.getSheetByName(ABA_ACESSOS) || planilha.insertSheet(ABA_ACESSOS);
    if (aba.getLastRow() === 0) {
      aba.getRange(1, 1, 1, COLUNAS_ACESSOS.length).setValues([COLUNAS_ACESSOS]);
    }
    aba.appendRow([
      new Date(),
      evento,
      texto_(dados.dispositivo, 40),
      texto_(dados.navegador, 40),
      produto,
      texto_(dados.categoria_selecionada, 120),
      texto_(dados.faixa_preco, 80),
      texto_(dados.tipo_oferta_selecionado, 120)
    ]);
  } finally {
    lock.releaseLock();
  }

  return resposta_({ ok: true });
}

function texto_(valor, limite) {
  if (typeof valor !== 'string') return '';
  var texto = valor.trim().slice(0, limite);
  return /^[=+\-@]/.test(texto) ? "'" + texto : texto;
}

function resposta_(dados) {
  return ContentService.createTextOutput(JSON.stringify(dados))
    .setMimeType(ContentService.MimeType.JSON);
}
