const SPREADSHEET_ID = "1wiwEMUWtvR0ApPzEGevLdXE5jaVqSB-5gaS9kthwMaQ";
const SHEET_NAME = "eventos";
const TIME_ZONE = "America/Sao_Paulo";
const HEADERS = [
  "sessao_id",
  "evento",
  "jogo_id",
  "jogo",
  "dificuldade",
  "variacao",
  "dispositivo",
  "navegador",
  "sistema_operacional",
  "resolucao_tela",
  "idioma",
  "data_hora_brasilia",
  "data_hora_utc",
  "duracao_segundos"
];

function setup() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  spreadsheet.setSpreadsheetTimeZone(TIME_ZONE);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.getSheets().find((candidate) => candidate.getLastRow() === 0);
    if (sheet) sheet.setName(SHEET_NAME);
    else sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() > 0) {
    const existingHeaders = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
    if (HEADERS.some((header, index) => existingHeaders[index] !== header)) {
      throw new Error('A aba "eventos" já contém dados com cabeçalhos diferentes. Renomeie-a ou ajuste os cabeçalhos antes de executar setup().');
    }
  } else {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }

  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, HEADERS.length)
    .setBackground("#e8f3ec")
    .setFontColor("#234535")
    .setFontWeight("bold");
  sheet.setColumnWidths(1, HEADERS.length, 160);
  sheet.setColumnWidth(1, 260);
  sheet.setColumnWidth(12, 205);
  sheet.setColumnWidth(13, 205);
  console.log("Planilha configurada: " + spreadsheet.getUrl());
  return spreadsheet.getUrl();
}

function doPost(event) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return jsonResponse({ ok: false, error: "busy" });
  try {
    const payload = JSON.parse(event.postData.contents);
    if (!isValidPayload(payload)) return jsonResponse({ ok: false, error: "invalid_payload" });

    const cache = CacheService.getScriptCache();
    const rateKey = "session_" + payload.sessionId;
    const currentCount = Number(cache.get(rateKey) || 0);
    if (currentCount >= 60) return jsonResponse({ ok: false, error: "rate_limit" });
    cache.put(rateKey, String(currentCount + 1), 3600);

    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    if (!sheet) return jsonResponse({ ok: false, error: "run_setup_first" });

    const now = new Date(payload.timestamp);
    sheet.appendRow([
      safeCell(payload.sessionId),
      safeCell(payload.event),
      safeCell(payload.gameId),
      safeCell(payload.gameName),
      safeCell(payload.difficulty),
      safeCell(payload.variant),
      safeCell(payload.device),
      safeCell(payload.browser),
      safeCell(payload.os),
      safeCell(payload.screen),
      safeCell(payload.locale),
      Utilities.formatDate(now, TIME_ZONE, "yyyy-MM-dd HH:mm:ss"),
      now.toISOString(),
      Math.min(86400, Math.max(0, Number(payload.durationSeconds) || 0))
    ]);
    return jsonResponse({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

function isValidPayload(payload) {
  return payload
    && typeof payload.sessionId === "string"
    && /^[a-zA-Z0-9-]{16,80}$/.test(payload.sessionId)
    && ["page_entry", "game_selected", "game_finished", "page_exit"].indexOf(payload.event) >= 0
    && typeof payload.timestamp === "string"
    && payload.timestamp.length <= 40
    && Number.isFinite(Number(payload.durationSeconds))
    && Number(payload.durationSeconds) >= 0;
}

function safeCell(value) {
  const text = String(value == null ? "" : value).slice(0, 180);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function jsonResponse(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
