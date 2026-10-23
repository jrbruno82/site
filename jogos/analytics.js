"use strict";

(() => {
  const CONSENT_KEY = "jogosOnline.analyticsConsent.v1";
  const SESSION_KEY = "jogosOnline.analyticsSession.v1";
  const endpoint = String(window.JOGOS_ANALYTICS_ENDPOINT || "").trim();
  const configured = /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(endpoint);
  const banner = document.querySelector("#analytics-consent");
  const message = document.querySelector("#consent-message");
  const allowButton = document.querySelector("#consent-accept");
  const pageStartedAt = Date.now();
  let consent = localStorage.getItem(CONSENT_KEY);
  let activeGame = null;
  let pageExitSent = false;

  function newSessionId() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return Array.from(crypto.getRandomValues(new Uint8Array(16)), (value) => value.toString(16).padStart(2, "0")).join("");
  }

  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = newSessionId();
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }

  function deviceType() {
    if (/iPad|Tablet/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "tablet";
    if (/Mobi|Android|iPhone|iPod/i.test(navigator.userAgent)) return "mobile";
    return "desktop";
  }

  function browserName() {
    const ua = navigator.userAgent;
    if (/Edg\//.test(ua)) return "Edge";
    if (/OPR\//.test(ua)) return "Opera";
    if (/Firefox\//.test(ua)) return "Firefox";
    if (/CriOS|Chrome\//.test(ua)) return "Chrome";
    if (/Safari\//.test(ua)) return "Safari";
    return "Outro";
  }

  function operatingSystem() {
    const ua = navigator.userAgent;
    if (/Android/i.test(ua)) return "Android";
    if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
    if (/Windows/i.test(ua)) return "Windows";
    if (/Mac OS X|Macintosh/i.test(ua)) return "macOS";
    if (/Linux/i.test(ua)) return "Linux";
    return "Outro";
  }

  function brasiliaTime(timestamp) {
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).format(new Date(timestamp));
  }

  function send(eventName, game, durationSeconds = 0, happenedAt = Date.now()) {
    if (consent !== "granted") return;
    if (!configured) {
      console.warn("Analytics consentido, mas o endpoint da planilha não está configurado em analytics-config.js.");
      return;
    }
    const payload = {
      sessionId,
      event: eventName,
      gameId: game?.id || "",
      gameName: game?.name || "",
      difficulty: game?.difficulty || "",
      variant: game?.variant || "",
      device: deviceType(),
      browser: browserName(),
      os: operatingSystem(),
      screen: `${screen.width}x${screen.height} (${window.innerWidth}x${window.innerHeight})`,
      locale: navigator.language || "pt-BR",
      timestamp: new Date(happenedAt).toISOString(),
      brasiliaTime: brasiliaTime(happenedAt),
      durationSeconds: Math.round(Math.max(0, durationSeconds))
    };
    const body = new Blob([JSON.stringify(payload)], { type: "text/plain;charset=UTF-8" });
    if (!navigator.sendBeacon(endpoint, body)) {
      fetch(endpoint, { method: "POST", mode: "no-cors", keepalive: true, body })
        .catch((error) => console.warn("Não foi possível enviar o evento de uso:", error));
    }
  }

  function sendPageEntry() {
    if (consent !== "granted") return;
    send("page_entry", null, 0, pageStartedAt);
  }

  function startGame(game, difficulty, variant) {
    finishGame();
    activeGame = { game, startedAt: Date.now(), difficulty, variant };
    send("game_selected", {
      id: game.id,
      name: game.name,
      difficulty,
      variant
    }, 0, activeGame.startedAt);
  }

  function finishGame() {
    if (!activeGame) return;
    const finishedAt = Date.now();
    send("game_finished", {
      id: activeGame.game.id,
      name: activeGame.game.name,
      difficulty: activeGame.difficulty,
      variant: activeGame.variant
    }, (finishedAt - activeGame.startedAt) / 1000, finishedAt);
    activeGame = null;
  }

  function updateGame(game, difficulty, variant) {
    if (!activeGame || activeGame.game.id !== game.id) return;
    activeGame.difficulty = difficulty;
    activeGame.variant = variant;
  }

  function showBanner() {
    banner.hidden = false;
    allowButton.disabled = !configured;
    message.textContent = configured
      ? "Com sua autorização, registramos visitas, jogos selecionados, tipo de dispositivo e duração. Não coletamos localização geográfica. Os dados são enviados à planilha usoJogosOnline."
      : "O registro está desligado até conectar a planilha. Sem GPS e sem sua autorização, nenhum dado é enviado. Configure primeiro analytics-config.js com a URL do Apps Script.";
  }

  function hideBanner() {
    banner.hidden = true;
  }

  function chooseConsent(value) {
    consent = value;
    localStorage.setItem(CONSENT_KEY, value);
    hideBanner();
    if (value === "granted") sendPageEntry();
    else finishGame();
  }

  document.querySelector("#consent-accept").addEventListener("click", () => chooseConsent("granted"));
  document.querySelector("#consent-decline").addEventListener("click", () => chooseConsent("declined"));
  document.querySelector("#privacy-settings").addEventListener("click", showBanner);

  if (consent === "granted" && configured) sendPageEntry();
  else if (consent !== "declined" || (consent === "granted" && !configured)) showBanner();

  window.addEventListener("pagehide", () => {
    if (pageExitSent) return;
    pageExitSent = true;
    finishGame();
    send("page_exit", null, (Date.now() - pageStartedAt) / 1000);
  });

  window.jogosAnalytics = { startGame, updateGame, finishGame };
})();
