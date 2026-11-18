/**
 * Achados do Júnior: liga o site à planilha Afiliado-MELI.
 *
 * GET  -> devolve os produtos da aba "Ofertas" (só campos públicos) e quantas pessoas estão no site agora.
 * POST -> registra eventos do site na aba "Engajamento" e mantém a lista de sessões na aba "Ao vivo".
 *
 * Instalação: na planilha, Extensões > Apps Script, cole este arquivo, salve e faça
 * Implantar > Nova implantação > App da Web, Executar como: Eu, Quem pode acessar: Qualquer pessoa.
 * Copie a URL que termina em /exec e cole no HTML, na constante PLANILHA_API.
 */

const ABA_OFERTAS = 'Ofertas';
const ABA_LOG = 'Engajamento';
const ABA_AO_VIVO = 'Ao vivo';
const LINHA_INICIAL_AO_VIVO = 7;   // primeira linha de sessões na aba "Ao vivo"
const SEGUNDOS_ATIVO = 90;         // sem sinal por mais tempo que isso = saiu
const EVENTOS_PERMITIDOS = ['visita', 'ping', 'clique', 'filtro', 'saida'];

// Colunas lidas da aba Ofertas, pelo nome do cabeçalho. Ganhos e "Preço a receber" nunca saem daqui.
const CAMPOS_PUBLICOS = {
  nome: 'Nome do produto',
  titulo: 'Título',
  link: 'Link do afiliado',
  preco: 'Valor do produto',
  tipo: 'Tipo oferta',
  imagem: 'Imagem',
  de: 'Preço anterior',
  descricao: 'Descrição site',
};

function doGet(e) {
  const params = (e && e.parameter) || {};
  if (params.so === 'ativos') return json_({ ativos: contarAtivos_() });

  const sheet = SpreadsheetApp.getActive().getSheetByName(ABA_OFERTAS);
  const valores = sheet.getDataRange().getValues();
  const cabecalho = valores.shift().map(String);
  const idx = {};
  Object.keys(CAMPOS_PUBLICOS).forEach(function (k) { idx[k] = cabecalho.indexOf(CAMPOS_PUBLICOS[k]); });

  const produtos = valores
    .filter(function (r) { return r[idx.nome] && r[idx.link] && Number(r[idx.preco]) > 0; })
    .map(function (r) {
      return {
        nome: String(r[idx.nome]),
        titulo: idx.titulo >= 0 ? String(r[idx.titulo]) : '',
        link: String(r[idx.link]),
        preco: Number(r[idx.preco]),
        de: idx.de >= 0 ? Number(r[idx.de]) || 0 : 0,
        tipo: idx.tipo >= 0 ? String(r[idx.tipo]) : '',
        imagem: idx.imagem >= 0 ? String(r[idx.imagem]) : '',
        descricao: idx.descricao >= 0 ? String(r[idx.descricao]) : '',
      };
    });

  return json_({ produtos: produtos, ativos: contarAtivos_(), atualizado: new Date().toISOString() });
}

function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false }); }
  const evento = limpar_(d.evento, 20);
  if (EVENTOS_PERMITIDOS.indexOf(evento) < 0) return json_({ ok: false });

  const agora = new Date();
  const registro = {
    visitante: limpar_(d.visitante, 24),
    sessao: limpar_(d.sessao, 24),
    produto: limpar_(d.produto, 120),
    link: limpar_(d.link, 120),
    detalhe: limpar_(d.detalhe, 120),
    secao: limpar_(d.secao, 40),
    dispositivo: limpar_(d.dispositivo, 20),
    origem: limpar_(d.origem, 80),
  };
  if (!registro.sessao) return json_({ ok: false });

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return json_({ ok: false, ocupado: true });
  try {
    const ss = SpreadsheetApp.getActive();
    if (evento !== 'ping') {
      const abaLog = ss.getSheetByName(ABA_LOG) || ss.insertSheet(ABA_LOG);
      if (abaLog.getLastRow() === 0) {
        abaLog.getRange(1, 1, 1, 10).setValues([[
          'Data', 'Hora', 'Sessão', 'Evento', 'Navegador', 'Dispositivo',
          'Produto', 'Link', 'Detalhe', 'Origem'
        ]]);
      }
      const fuso = ss.getSpreadsheetTimeZone() || Session.getScriptTimeZone();
      abaLog.appendRow([
        Utilities.formatDate(agora, fuso, 'dd/MM/yyyy'),
        Utilities.formatDate(agora, fuso, 'HH:mm:ss'),
        registro.sessao,
        evento,
        limpar_(d.navegador, 40),
        registro.dispositivo,
        registro.produto,
        registro.link,
        registro.detalhe,
        registro.origem,
      ]);
    }
    atualizarAoVivo_(ss.getSheetByName(ABA_AO_VIVO), registro, evento, agora);
  } finally {
    lock.releaseLock();
  }
  return json_({ ok: true });
}

/** Atualiza (ou cria) a linha da sessão na aba "Ao vivo". A coluna E (Status) é uma fórmula e não é tocada. */
function atualizarAoVivo_(sheet, r, evento, agora) {
  const ultima = sheet.getLastRow();
  let linha = -1;
  if (ultima >= LINHA_INICIAL_AO_VIVO) {
    const ids = sheet.getRange(LINHA_INICIAL_AO_VIVO, 1, ultima - LINHA_INICIAL_AO_VIVO + 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) { if (ids[i][0] === r.sessao) { linha = LINHA_INICIAL_AO_VIVO + i; break; } }
  }
  // Ao sair, a sessão fica marcada como vista 2 minutos atrás, para o status virar "Saiu" na hora.
  const vistoEm = evento === 'saida' ? new Date(agora.getTime() - 120000) : agora;
  const secao = evento === 'saida' ? 'saiu do site' : (r.secao || '');
  if (linha < 0) {
    linha = Math.max(ultima + 1, LINHA_INICIAL_AO_VIVO);
    sheet.getRange(linha, 1, 1, 4).setValues([[r.sessao, r.visitante, agora, vistoEm]]);
    sheet.getRange(linha, 6, 1, 3).setValues([[secao, r.dispositivo, r.origem]]);
  } else {
    sheet.getRange(linha, 4).setValue(vistoEm);
    if (secao) sheet.getRange(linha, 6).setValue(secao);
  }
}

/** Conta sessões com sinal nos últimos SEGUNDOS_ATIVO segundos. */
function contarAtivos_() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(ABA_AO_VIVO);
  const ultima = sheet.getLastRow();
  if (ultima < LINHA_INICIAL_AO_VIVO) return 0;
  const limite = Date.now() - SEGUNDOS_ATIVO * 1000;
  return sheet.getRange(LINHA_INICIAL_AO_VIVO, 4, ultima - LINHA_INICIAL_AO_VIVO + 1, 1).getValues()
    .filter(function (v) { return v[0] instanceof Date && v[0].getTime() >= limite; }).length;
}

/** Opcional: apaga da aba "Ao vivo" as sessões com mais de 2 dias. Pode ser agendado em Acionadores, 1 vez por dia. */
function limparSessoesAntigas() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(ABA_AO_VIVO);
  const ultima = sheet.getLastRow();
  if (ultima < LINHA_INICIAL_AO_VIVO) return;
  const limite = Date.now() - 2 * 24 * 3600 * 1000;
  const vistos = sheet.getRange(LINHA_INICIAL_AO_VIVO, 4, ultima - LINHA_INICIAL_AO_VIVO + 1, 1).getValues();
  for (let i = vistos.length - 1; i >= 0; i--) {
    if (vistos[i][0] instanceof Date && vistos[i][0].getTime() < limite) {
      const l = LINHA_INICIAL_AO_VIVO + i;
      sheet.getRange(l, 1, 1, 4).clearContent();
      sheet.getRange(l, 6, 1, 3).clearContent();
    }
  }
}

function limpar_(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').replace(/^[=+\-@]+/, '').slice(0, max);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
