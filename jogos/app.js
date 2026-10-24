"use strict";

const games = [
  { id: "sudoku", name: "Sudoku", description: "Um desafio para a mente", icon: "🔢", tint: "#173f45", accent: "#59e1d0" },
  { id: "tetris", name: "Tetris", description: "Encaixe, limpe, repita", icon: "🧱", tint: "#392751", accent: "#c69aff" },
  { id: "memory", name: "Jogo da Memória", description: "Encontre todos os pares", icon: "🧠", tint: "#503025", accent: "#ffad78" },
  { id: "crossword", name: "Palavras Cruzadas", description: "Descubra pelas dicas", icon: "✏️", tint: "#51421e", accent: "#ffd66e" },
  { id: "bingo", name: "Bingo", description: "Sua sorte está lançada", icon: "🔵", tint: "#512b42", accent: "#ff83b3" },
  { id: "checkers", name: "Damas", description: "Pense alguns lances à frente", icon: "♟️", tint: "#523829", accent: "#ffb779" },
  { id: "wordsearch", name: "Caça-Palavras", description: "Ache todas as palavras", icon: "🔎", tint: "#1f3e59", accent: "#79c1ff" },
  { id: "stack", name: "Torre de Blocos", description: "Alinhe e construa", icon: "🏗️", tint: "#4c461c", accent: "#e3ed68" },
  { id: "mahjong", name: "Mahjong", description: "Combine as peças iguais", icon: "🀄", tint: "#174a40", accent: "#6dd5a7" },
  { id: "ludo", name: "Ludo", description: "Jogue os dados e avance", icon: "🎲", tint: "#49345b", accent: "#c69aff" }
];
const gameVariants = {
  sudoku: ["Desafio dos números", "Tabuleiro surpresa", "Sequência relâmpago", "Números em festa"],
  tetris: ["Chuva de blocos", "Peças surpresa", "Ritmo arcade", "Desafio neon"],
  memory: ["Cartas surpresa", "Coleção colorida", "Memória em jogo", "Pares embaralhados"],
  crossword: ["Enigma do dia", "Palavras surpresa", "Desafio de vocabulário", "Pistas embaralhadas", "Tabuleiro girado"],
  bingo: ["Bingo da sorte", "Cartela surpresa", "Rodada premiada", "Sorteio relâmpago"],
  checkers: ["Duelo no tabuleiro", "Desafio estratégico", "Peças em ação", "Partida surpresa"],
  wordsearch: ["Caça temática", "Grade surpresa", "Letras embaralhadas", "Desafio de palavras"],
  stack: ["Torre colorida", "Blocos surpresa", "Desafio de equilíbrio", "Construção arcade"],
  mahjong: ["Jardim de bambu", "Peças da sorte", "Mesa tranquila", "Desafio oriental"],
  ludo: ["Corrida dos peões", "Partida da sorte", "Desafio colorido", "Rota da vitória"]
};
const gameAccents = {
  sudoku: ["#39a995", "#4b8fc4", "#7884cb"],
  tetris: ["#8759c6", "#496ed0", "#d26eab"],
  memory: ["#d58155", "#ca6d8b", "#a875c4"],
  crossword: ["#b68a37", "#bb7144", "#7c9d4b"],
  bingo: ["#d35c8f", "#8668c6", "#e57b70"],
  checkers: ["#b46e48", "#b65362", "#8d6fba"],
  wordsearch: ["#3986b8", "#4b9a9a", "#8b74bb"],
  stack: ["#9c9e3c", "#d28b48", "#5e9f76"],
  mahjong: ["#398866", "#b58c48", "#5b9b8e"],
  ludo: ["#8658b4", "#4b89bd", "#c2626e"]
};
const levelIcons = ["🌱", "⚡", "🔥", "💎"];
const levels = [
  { name: "Fácil", given: 42, tetris: 850, memory: 12, bingoCards: 1, bingoSpeed: 2600, ai: 1, wordSize: 8, stackSpeed: 1.7, stackTolerance: 14 },
  { name: "Médio", given: 36, tetris: 620, memory: 16, bingoCards: 2, bingoSpeed: 1900, ai: 2, wordSize: 9, stackSpeed: 2.5, stackTolerance: 9 },
  { name: "Difícil", given: 30, tetris: 440, memory: 24, bingoCards: 3, bingoSpeed: 1300, ai: 3, wordSize: 10, stackSpeed: 3.4, stackTolerance: 4 },
  { name: "Muito Difícil", given: 25, tetris: 300, memory: 36, bingoCards: 4, bingoSpeed: 850, ai: 4, wordSize: 12, stackSpeed: 4.5, stackTolerance: 0 }
];
const grid = document.querySelector("#game-grid");
const modal = document.querySelector("#game-modal");
const content = document.querySelector("#modal-content");
let activeGame = null;
let currentLevel = null;
let selectedLevel = -1;
let cleanupGame = () => {};
let closeTimer = null;
let roundVariant = "";
const previousVariants = new Map();
const previousAccents = new Map();
const FONT_SCALE_KEY = "classicos.textScale.v1";

function setupTextSizeControls() {
  const buttons = [...document.querySelectorAll("[data-text-scale]")];
  const currentLabels = [...document.querySelectorAll(".text-size-current")];
  const labels = new Map([["1", "Normal"], ["1.25", "Grande"], ["1.5", "Muito grande"]]);
  const savedScale = localStorage.getItem(FONT_SCALE_KEY);
  const initialScale = labels.has(savedScale) ? savedScale : "1";
  const menu = document.querySelector("#modal-text-size-menu");
  const menuToggle = document.querySelector("#modal-text-size-toggle");
  const menuPanel = document.querySelector("#modal-text-size-panel");

  function selectScale(scale) {
    document.documentElement.style.setProperty("--text-scale", scale);
    currentLabels.forEach((label) => { label.textContent = labels.get(scale); });
    buttons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.textScale === scale));
    });
    localStorage.setItem(FONT_SCALE_KEY, scale);
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => selectScale(button.dataset.textScale));
  });
  menuToggle.addEventListener("click", () => {
    const expanded = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!expanded));
    menuPanel.hidden = expanded;
  });
  document.addEventListener("click", (event) => {
    if (!menu.contains(event.target)) {
      menuToggle.setAttribute("aria-expanded", "false");
      menuPanel.hidden = true;
    }
  });
  selectScale(initialScale);
}

setupTextSizeControls();

function randomChoice(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function nextRandomValue(values, previous, key) {
  const options = values.length > 1 ? values.filter((value) => value !== previous.get(key)) : values;
  const value = randomChoice(options);
  previous.set(key, value);
  return value;
}

function machineTaunt(kind, result = "play") {
  const lines = {
    checkers: {
      play: ["Boa! Até minhas peças ficaram impressionadas.", "Você pensa rápido. Minha CPU pediu café.", "Movimento ousado. Vamos ver se o tabuleiro concorda."],
      win: ["Você venceu! Vou treinar no modo humildade.", "Dama para você! Minha estratégia pediu demissão.", "Boa partida! Hoje você mandou no tabuleiro."],
      lose: ["Ponto para a máquina. Acontece até com gente boa.", "Ganhei essa, mas não se acostume!", "Xeque... ops, jogo errado. Mesmo assim, ganhei!"]
    }
  };
  return randomChoice(lines[kind][result]);
}

games.forEach((game) => {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "game-card";
  card.style.setProperty("--card-tint", game.tint);
  card.style.setProperty("--card-accent", game.accent);
  card.setAttribute("aria-label", `${game.name}: ${game.description}`);
  card.innerHTML = `<span class="card-top"><span class="game-emoji" aria-hidden="true">${game.icon}</span><span class="card-arrow" aria-hidden="true">↗</span></span><span><span class="card-title">${game.name}</span><span class="card-description">${game.description}</span></span>`;
  card.addEventListener("click", () => openGame(game));
  grid.append(card);
});

function openGame(game) {
  stopCurrentGame();
  activeGame = game;
  currentLevel = null;
  selectedLevel = 0;
  roundVariant = nextRandomValue(gameVariants[game.id] || ["Partida clássica"], previousVariants, game.id);
  const accent = nextRandomValue(gameAccents[game.id] || [game.accent], previousAccents, game.id);
  document.querySelector("#modal-icon").textContent = game.icon;
  document.querySelector("#modal-title").textContent = game.name;
  modal.style.setProperty("--game-accent", accent);
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  showSetup();
  content.scrollTop = 0;
  document.querySelector("#close-game").focus();
}

function closeGame() {
  stopCurrentGame();
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  window.scrollTo(0, 0);
  activeGame = null;
}

function stopCurrentGame() {
  cleanupGame();
  cleanupGame = () => {};
  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }
}

document.querySelector("#close-game").addEventListener("click", closeGame);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal.classList.contains("is-open")) closeGame();
});

function showSetup() {
  content.innerHTML = `<div class="setup-panel"><p class="eyebrow">UMA NOVA PARTIDA · ${roundVariant}</p><h3>Como quer jogar?</h3><p class="setup-copy">A aventura muda a cada entrada. Escolha a dificuldade para começar.</p><div class="difficulty-grid" role="group" aria-label="Nível de dificuldade">${levels.map((level, i) => `<button type="button" class="difficulty-button${i === 0 ? " selected" : ""}" data-level="${i}" aria-pressed="${i === 0}"><span class="level-icon" aria-hidden="true">${levelIcons[i]}</span><span>${level.name}</span></button>`).join("")}</div><button type="button" class="primary-button" id="start-game">Começar · ${levels[0].name}</button></div>`;
  content.querySelectorAll(".difficulty-button").forEach((button) => {
    button.addEventListener("click", () => {
      selectedLevel = Number(button.dataset.level);
      content.querySelectorAll(".difficulty-button").forEach((item) => {
        const active = item === button;
        item.classList.toggle("selected", active);
        item.setAttribute("aria-pressed", String(active));
      });
      const start = content.querySelector("#start-game");
      start.disabled = false;
      start.textContent = `Começar · ${levels[selectedLevel].name}`;
    });
  });
  content.querySelector("#start-game").addEventListener("click", () => {
    currentLevel = levels[selectedLevel];
    launchGame(activeGame.id);
  });
}

function gameFrame(label, setup) {
  content.innerHTML = `<div class="game-panel"><div class="game-intro"><span><strong>${label}</strong> · ${currentLevel.name}<small class="round-variant">${roundVariant}</small></span><span class="status-pill" id="game-status">Boa partida!</span></div><div class="game-action-row"><button type="button" class="restart-button" id="restart-game">⟳ <span>Nova partida</span></button></div><div class="game-board" id="game-board"></div><div class="control-row" id="game-controls"></div><p class="instructions" id="game-instructions"></p></div>`;
  content.scrollTop = 0;
  content.querySelector("#restart-game").addEventListener("click", () => startNewRound(activeGame.id));
  setup(content.querySelector("#game-board"), content.querySelector("#game-controls"), content.querySelector("#game-status"), content.querySelector("#game-instructions"));
}

function startNewRound(id) {
  roundVariant = nextRandomValue(gameVariants[id] || ["Partida clássica"], previousVariants, id);
  modal.style.setProperty("--game-accent", nextRandomValue(gameAccents[id] || [activeGame.accent], previousAccents, id));
  launchGame(id);
}

function launchGame(id) {
  stopCurrentGame();
  const runners = {
    sudoku: sudokuGame,
    tetris: tetrisGame,
    memory: memoryGame,
    crossword: crosswordGame,
    bingo: bingoGame,
    checkers: checkersGame,
    wordsearch: wordSearchGame,
    stack: stackGame,
    mahjong: mahjongGame,
    ludo: ludoGame
  };
  runners[id]();
}

function button(label, action, className = "control-button") {
  const element = document.createElement("button");
  element.type = "button";
  element.className = className;
  element.textContent = label;
  element.addEventListener("click", action);
  return element;
}

function shuffle(items) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function sudokuGame() {
  gameFrame("Preencha os espaços", (board, controls, status, instructions) => {
    const solution = [
      "534678912", "672195348", "198342567", "859761423", "426853791",
      "713924856", "961537284", "287419635", "345286179"
    ].map((row) => row.split("").map(Number));
    const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const digitMap = new Map(digits.map((digit, index) => [index + 1, digit]));
    const rowBands = shuffle([0, 1, 2]);
    const colBands = shuffle([0, 1, 2]);
    const rowOrder = rowBands.flatMap((band) => shuffle([0, 1, 2]).map((row) => band * 3 + row));
    const colOrder = colBands.flatMap((band) => shuffle([0, 1, 2]).map((col) => band * 3 + col));
    const puzzle = rowOrder.map((row) => colOrder.map((col) => digitMap.get(solution[row][col])));
    const cells = Array.from({ length: 81 }, (_, i) => i);
    shuffle(cells);
    const given = new Set(cells.slice(0, currentLevel.given));
    const values = puzzle.map((row) => [...row]);
    let selected = null;
    board.innerHTML = `<div class="sudoku-grid" role="grid" aria-label="Tabuleiro de Sudoku"></div>`;
    const sudokuGrid = board.firstElementChild;
    const cellNodes = [];
    for (let index = 0; index < 81; index++) {
      const row = Math.floor(index / 9);
      const col = index % 9;
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = `sudoku-cell${given.has(index) ? " fixed" : ""}`;
      cell.textContent = given.has(index) ? String(puzzle[row][col]) : "";
      cell.setAttribute("aria-label", `Linha ${row + 1}, coluna ${col + 1}${given.has(index) ? `, ${puzzle[row][col]}` : ", vazia"}`);
      cell.addEventListener("click", () => {
        if (given.has(index)) return;
        selected = index;
        cellNodes.forEach((node) => node.classList.toggle("selected", Number(node.dataset.index) === selected));
      });
      cell.dataset.index = String(index);
      cellNodes.push(cell);
      sudokuGrid.append(cell);
      if (!given.has(index)) values[row][col] = 0;
    }
    const pad = document.createElement("div");
    pad.className = "number-pad";
    pad.setAttribute("aria-label", "Teclado numérico");
    for (let n = 1; n <= 9; n++) {
      pad.append(button(String(n), () => {
        if (selected === null) {
          status.textContent = "Toque em uma casa vazia";
          return;
        }
        const row = Math.floor(selected / 9);
        const col = selected % 9;
        values[row][col] = n;
        cellNodes[selected].textContent = String(n);
        const errors = values.flatMap((line, r) => line.map((value, c) => value && value !== puzzle[r][c] ? r * 9 + c : -1)).filter((value) => value >= 0);
        cellNodes.forEach((cell, i) => cell.classList.toggle("error", errors.includes(i)));
        status.textContent = values.every((line) => line.every((value) => value !== 0))
          ? (values.every((line, r) => line.every((value, c) => value === puzzle[r][c])) ? "Sudoku completo! 🎉" : "Confira as casas em vermelho")
          : `${81 - values.flat().filter(Boolean).length} casas vazias`;
      }));
    }
    pad.append(button("⌫", () => {
      if (selected !== null) {
        values[Math.floor(selected / 9)][selected % 9] = 0;
        cellNodes[selected].textContent = "";
        cellNodes[selected].classList.remove("error");
        status.textContent = "Número apagado";
      }
    }));
    board.append(pad);
    instructions.textContent = "Toque em uma casa vazia e escolha um número. As respostas são conferidas em tempo real.";
    status.textContent = `${currentLevel.given} números iniciais`;
  });
}

function tetrisGame() {
  gameFrame("Encaixe as peças", (board, controls, status, instructions) => {
    const canvas = document.createElement("canvas");
    canvas.width = 300;
    canvas.height = 600;
    canvas.className = "game-canvas tetris-canvas";
    canvas.setAttribute("aria-label", "Tabuleiro de Tetris");
    board.append(canvas);
    const ctx = canvas.getContext("2d");
    const shapes = [
      [[1, 1, 1, 1]], [[1, 1], [1, 1]], [[0, 1, 0], [1, 1, 1]],
      [[1, 0, 0], [1, 1, 1]], [[0, 0, 1], [1, 1, 1]],
      [[0, 1, 1], [1, 1, 0]], [[1, 1, 0], [0, 1, 1]]
    ];
    const colors = ["#53d6d1", "#f8d765", "#b88af5", "#ff9e72", "#82aaff", "#92d879", "#fb8298"];
    const cells = Array.from({ length: 20 }, () => Array(10).fill(0));
    let piece = null;
    let score = 0;
    let lines = 0;
    let gameOver = false;
    function spawn() {
      const i = Math.floor(Math.random() * shapes.length);
      piece = { shape: shapes[i].map((row) => [...row]), color: colors[i], x: 3, y: 0 };
      if (collides(piece.shape, piece.x, piece.y)) {
        gameOver = true;
        status.textContent = "Fim de jogo · Feche para sair";
        status.classList.add("game-over");
      }
    }
    function collides(shape, x, y) {
      return shape.some((row, r) => row.some((value, c) => value && (x + c < 0 || x + c >= 10 || y + r >= 20 || (y + r >= 0 && cells[y + r][x + c]))));
    }
    function rotate(shape) {
      return shape[0].map((_, col) => shape.map((row) => row[col]).reverse());
    }
    function draw() {
      const background = ctx.createLinearGradient(0, 0, 300, 600);
      background.addColorStop(0, "#151c2a");
      background.addColorStop(1, "#090e16");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, 300, 600);
      ctx.strokeStyle = "#ffffff0c";
      ctx.lineWidth = 1;
      for (let x = 0; x <= 10; x++) {
        ctx.beginPath();
        ctx.moveTo(x * 30, 0);
        ctx.lineTo(x * 30, 600);
        ctx.stroke();
      }
      for (let y = 0; y <= 20; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * 30);
        ctx.lineTo(300, y * 30);
        ctx.stroke();
      }
      function drawBlock(x, y, color) {
        const gradient = ctx.createLinearGradient(x * 30, y * 30, x * 30 + 30, y * 30 + 30);
        gradient.addColorStop(0, "#ffffff");
        gradient.addColorStop(.12, color);
        gradient.addColorStop(1, color);
        ctx.fillStyle = gradient;
        ctx.fillRect(x * 30 + 2, y * 30 + 2, 26, 26);
        ctx.strokeStyle = "#ffffff55";
        ctx.strokeRect(x * 30 + 2.5, y * 30 + 2.5, 25, 25);
      }
      for (let y = 0; y < 20; y++) for (let x = 0; x < 10; x++) {
        const color = cells[y][x];
        if (color) drawBlock(x, y, color);
      }
      if (piece) piece.shape.forEach((row, r) => row.forEach((value, c) => {
        if (value) drawBlock(piece.x + c, piece.y + r, piece.color);
      }));
    }
    function lock() {
      piece.shape.forEach((row, r) => row.forEach((value, c) => {
        if (value && piece.y + r >= 0) cells[piece.y + r][piece.x + c] = piece.color;
      }));
      let cleared = 0;
      for (let row = cells.length - 1; row >= 0; row--) {
        if (cells[row].every(Boolean)) {
          cells.splice(row, 1);
          cells.unshift(Array(10).fill(0));
          cleared++;
          row++;
        }
      }
      lines += cleared;
      score += [0, 100, 300, 500, 800][cleared] || 0;
      status.textContent = `${score} pontos · ${lines} linhas`;
      spawn();
    }
    function move(dx, dy) {
      if (gameOver) return;
      if (!collides(piece.shape, piece.x + dx, piece.y + dy)) {
        piece.x += dx;
        piece.y += dy;
      } else if (dy > 0) lock();
      draw();
    }
    function turn() {
      if (gameOver) return;
      const next = rotate(piece.shape);
      if (!collides(next, piece.x, piece.y)) piece.shape = next;
      draw();
    }
    function drop() {
      if (gameOver) return;
      while (!collides(piece.shape, piece.x, piece.y + 1)) piece.y++;
      lock();
      draw();
    }
    let tick = null;
    function scheduleTick() {
      tick = setTimeout(() => {
        move(0, 1);
        if (!gameOver) scheduleTick();
      }, Math.max(120, currentLevel.tetris - lines * 25));
    }
    scheduleTick();
    cleanupGame = () => clearTimeout(tick);
    controls.append(button("←", () => move(-1, 0)), button("↻ Girar", turn), button("→", () => move(1, 0)), button("↓ Queda", drop));
    instructions.textContent = "Use os controles na tela para mover, girar e derrubar as peças.";
    spawn();
    draw();
  });
}

function memoryGame() {
  gameFrame("Encontre os pares", (board, controls, status, instructions) => {
    const emojis = shuffle(["🍓", "🌙", "🐳", "🌵", "🍄", "🦋", "🍋", "🐸", "🌈", "🦊", "🍉", "⭐", "🐙", "🌻", "🎈", "🍇", "🐢", "☀️"]);
    const pairCount = currentLevel.memory / 2;
    const cards = shuffle(emojis.slice(0, pairCount).flatMap((emoji, id) => [{ emoji, id }, { emoji, id }]));
    let open = [];
    let matched = new Set();
    let moves = 0;
    let locked = false;
    board.innerHTML = `<div class="memory-grid" style="grid-template-columns:repeat(${pairCount === 6 ? 3 : pairCount === 8 ? 4 : pairCount === 12 ? 4 : 6},1fr)"></div>`;
    const memoryGrid = board.firstElementChild;
    function render() {
      memoryGrid.innerHTML = "";
      cards.forEach((card, i) => {
        const buttonNode = document.createElement("button");
        const revealed = open.includes(i) || matched.has(card.id);
        buttonNode.type = "button";
        buttonNode.className = `memory-card${revealed ? "" : " hidden"}${matched.has(card.id) ? " matched" : ""}`;
        buttonNode.setAttribute("aria-label", revealed ? `Carta ${card.emoji}` : "Carta fechada");
        buttonNode.style.setProperty("--memory-color", ["#ff9d76", "#ffcf68", "#72d8ec", "#82df9c", "#bd9aff", "#ff8fbc"][card.id % 6]);
        buttonNode.innerHTML = `<span>${card.emoji}</span><span class="memory-card-back" aria-hidden="true">✳</span>`;
        buttonNode.addEventListener("click", () => {
          if (locked || revealed || matched.has(card.id)) return;
          open.push(i);
          render();
          if (open.length === 2) {
            moves++;
            if (cards[open[0]].id === cards[open[1]].id) {
              matched.add(card.id);
              open = [];
              status.textContent = `${matched.size} / ${pairCount} pares · ${moves} jogadas`;
              if (matched.size === pairCount) status.textContent = `Você venceu em ${moves} jogadas! 🎉`;
              render();
            } else {
              locked = true;
              const timer = setTimeout(() => {
                open = [];
                locked = false;
                render();
              }, selectedLevel > 1 ? 900 : 700);
              cleanupGame = () => clearTimeout(timer);
              status.textContent = `${moves} jogadas`;
            }
          }
        });
        memoryGrid.append(buttonNode);
      });
    }
    status.textContent = `0 / ${pairCount} pares · 0 jogadas`;
    instructions.textContent = `Encontre ${pairCount} pares. Toque em duas cartas para revelar os emojis.`;
    render();
  });
}

function crosswordGame() {
  gameFrame("Resolva pelas dicas", (board, controls, status, instructions) => {
    const size = 7;
    const allEntries = [
      { number: 1, direction: "across", row: 1, col: 1, answer: "SOL", clue: "Astro que ilumina o dia" },
      { number: 2, direction: "down", row: 1, col: 1, answer: "SAL", clue: "Tempero branco de cozinha" },
      { number: 3, direction: "across", row: 3, col: 1, answer: "LAR", clue: "Casa, morada" },
      { number: 4, direction: "across", row: 2, col: 1, answer: "ALA", clue: "Parte lateral de um edifício" },
      { number: 5, direction: "down", row: 1, col: 3, answer: "LAR", clue: "Lugar onde se vive" },
      { number: 6, direction: "down", row: 1, col: 2, answer: "OLA", clue: "Cumprimento usado ao chegar" }
    ];
    const entryCount = [3, 4, 5, 6][selectedLevel];
    const entries = allEntries.slice(0, entryCount);
    const transpose = Math.random() < .5;
    const puzzleEntries = entries.map((entry) => transpose
      ? { ...entry, row: entry.col, col: entry.row, direction: entry.direction === "across" ? "down" : "across" }
      : entry);
    const solution = Array.from({ length: size }, () => Array(size).fill(null));
    puzzleEntries.forEach((entry) => [...entry.answer].forEach((letter, i) => {
      solution[entry.row + (entry.direction === "down" ? i : 0)][entry.col + (entry.direction === "across" ? i : 0)] = letter;
    }));
    const keys = new Map();
    const layout = document.createElement("div");
    layout.className = "crossword-layout";
    const crosswordGrid = document.createElement("div");
    crosswordGrid.className = "crossword-grid";
    const inputs = [];
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
      const cell = document.createElement("div");
      const letter = solution[r][c];
      cell.className = `cross-cell${letter === null ? " block" : ""}`;
      if (letter !== null) {
        const input = document.createElement("input");
        input.maxLength = 1;
        input.autocomplete = "off";
        input.setAttribute("aria-label", `Linha ${r + 1}, coluna ${c + 1}`);
        input.dataset.row = String(r);
        input.dataset.col = String(c);
        input.addEventListener("input", () => {
          input.value = input.value.toLocaleUpperCase("pt-BR").replace(/[^A-ZÁÉÍÓÚÂÊÔÃÕÇ]/g, "").slice(-1);
          const next = inputs.findIndex((item) => item === input) + 1;
          if (input.value && inputs[next]) inputs[next].focus();
          const complete = puzzleEntries.every((entry) => [...entry.answer].every((char, i) => {
            const rr = entry.row + (entry.direction === "down" ? i : 0);
            const cc = entry.col + (entry.direction === "across" ? i : 0);
            return keys.get(`${rr},${cc}`)?.value.toUpperCase() === char;
          }));
          status.textContent = complete ? "Palavras cruzadas completas! 🎉" : "Preencha as letras";
        });
        input.addEventListener("keydown", (event) => {
          if (event.key === "Backspace" && !input.value) {
            const previous = inputs[inputs.indexOf(input) - 1];
            previous?.focus();
          }
        });
        cell.append(input);
        inputs.push(input);
        keys.set(`${r},${c}`, input);
      }
      crosswordGrid.append(cell);
    }
    const clues = document.createElement("div");
    clues.className = "cross-clues";
    const displayedClues = shuffle([...puzzleEntries]);
    displayedClues.forEach((entry) => {
      const clue = button(`${entry.number} ${entry.direction === "across" ? "→" : "↓"} · ${entry.clue}`, () => {
        clues.querySelectorAll(".clue").forEach((node) => node.classList.remove("active"));
        clue.classList.add("active");
        const first = keys.get(`${entry.row},${entry.col}`);
        first?.focus();
        [...entry.answer].forEach((_, i) => {
          const r = entry.row + (entry.direction === "down" ? i : 0);
          const c = entry.col + (entry.direction === "across" ? i : 0);
          keys.get(`${r},${c}`)?.parentElement.classList.add("active");
        });
      }, "clue");
      clues.append(clue);
    });
    layout.append(crosswordGrid, clues);
    board.append(layout);
    instructions.textContent = "Toque em uma dica para começar. As letras avançam automaticamente.";
    status.textContent = `${puzzleEntries.length} dicas · ${new Set(puzzleEntries.flatMap((entry) => [...entry.answer])).size} letras diferentes`;
  });
}

function bingoGame() {
  gameFrame("Marque sua cartela", (board, controls, status, instructions) => {
    const count = currentLevel.bingoCards;
    const cards = [];
    for (let i = 0; i < count; i++) {
      const columns = [1, 16, 31, 46, 61].map((min, col) => shuffle(Array.from({ length: 15 }, (_, n) => min + n)).slice(0, 5));
      const numbers = Array.from({ length: 25 }, (_, index) => columns[index % 5][Math.floor(index / 5)]);
      numbers[12] = 0;
      cards.push(numbers);
    }
    const called = new Set();
    const selected = new Set();
    const lastNumbers = [];
    let timer = null;
    let auto = false;
    board.innerHTML = `<div class="drawn-number" id="drawn-number">—</div><p style="color:var(--muted);text-align:center;margin:0">Últimos: <span id="last-numbers">—</span></p><div class="bingo-cards" id="bingo-cards"></div>`;
    function renderCards() {
      const root = board.querySelector("#bingo-cards");
      root.innerHTML = "";
      cards.forEach((numbers, cardIndex) => {
        const card = document.createElement("div");
        card.className = "bingo-card";
        card.innerHTML = `<div class="bingo-head">${["B", "I", "N", "G", "O"].map((char) => `<span>${char}</span>`).join("")}</div><div class="bingo-grid"></div>`;
        const cells = card.querySelector(".bingo-grid");
        numbers.forEach((number, i) => {
          const item = document.createElement("button");
          item.type = "button";
          item.className = `bingo-cell${i === 12 ? " free marked" : ""}${called.has(number) && number ? " called" : ""}${selected.has(`${cardIndex}:${i}`) ? " marked" : ""}`;
          item.textContent = number ? String(number) : "LIVRE";
          item.addEventListener("click", () => {
            if (i === 12) return;
            const key = `${cardIndex}:${i}`;
            selected.has(key) ? selected.delete(key) : selected.add(key);
            renderCards();
          });
          cells.append(item);
        });
        root.append(card);
      });
    }
    function drawNumber() {
      if (called.size >= 75) {
        status.textContent = "Todos os números foram sorteados";
        stopAuto();
        return;
      }
      let number;
      do { number = 1 + Math.floor(Math.random() * 75); } while (called.has(number));
      called.add(number);
      lastNumbers.unshift(number);
      lastNumbers.length = Math.min(lastNumbers.length, 5);
      board.querySelector("#drawn-number").textContent = String(number);
      board.querySelector("#last-numbers").textContent = lastNumbers.join(" · ");
      status.textContent = randomChoice([
        `${called.size} / 75 sorteados · Boa sorte, cartelas!`,
        `${called.size} / 75 sorteados · Esse número veio com estilo.`,
        `${called.size} / 75 sorteados · Olho vivo, já pode marcar!`
      ]);
      renderCards();
    }
    function stopAuto() {
      if (timer) clearInterval(timer);
      timer = null;
      auto = false;
      autoButton.textContent = "▶ Automático";
    }
    controls.append(button("🎱 Sortear", drawNumber));
    const autoButton = button("▶ Automático", () => {
      if (auto) stopAuto();
      else {
        auto = true;
        autoButton.textContent = "⏸ Pausar";
        timer = setInterval(drawNumber, currentLevel.bingoSpeed);
      }
    });
    controls.append(autoButton);
    cleanupGame = stopAuto;
    instructions.textContent = `${count} cartela${count === 1 ? "" : "s"} · Toque nos números chamados para marcá-los. Sorteio automático ajustado à dificuldade.`;
    status.textContent = "0 / 75 sorteados";
    renderCards();
  });
}

function mahjongGame() {
  gameFrame("Encontre peças iguais", (board, controls, status, instructions) => {
    const pairTotal = [12, 16, 20, 24][selectedLevel];
    const upperCount = selectedLevel >= 3 ? 8 : selectedLevel >= 2 ? 4 : 0;
    const baseCount = pairTotal * 2 - upperCount;
    const symbols = shuffle(["●", "▲", "■", "★", "♥", "♦", "♣", "☀", "☾", "♠", "✿", "✚", "◆", "♧", "◉", "☘"]);
    const tiles = [];
    let nextSymbolIndex = 0;

    function nextPairSymbol() {
      if (nextSymbolIndex >= symbols.length) {
        shuffle(symbols);
        nextSymbolIndex = 0;
      }
      return symbols[nextSymbolIndex++];
    }

    const baseRows = Math.ceil(baseCount / 8);
    for (let row = 0; row < baseRows; row++) {
      const count = Math.min(8, baseCount - row * 8);
      const rowTiles = Array.from({ length: count }, (_, col) => ({ row, col, layer: 0 }));
      for (let pair = 0; pair < Math.floor(count / 2); pair++) {
        const symbol = nextPairSymbol();
        rowTiles[pair].symbol = symbol;
        rowTiles[count - pair - 1].symbol = symbol;
      }
      tiles.push(...rowTiles);
    }

    if (upperCount) {
      const upperPositions = upperCount === 8
        ? Array.from({ length: 8 }, (_, index) => ({ row: 1 + Math.floor(index / 4), col: 2 + index % 4 }))
        : Array.from({ length: 4 }, (_, index) => ({ row: 1, col: 2 + index }));
      for (let pair = 0; pair < upperPositions.length / 2; pair++) {
        const symbol = nextPairSymbol();
        const left = upperPositions[pair];
        const right = upperPositions[upperPositions.length - pair - 1];
        tiles.push({ ...left, layer: 1, symbol }, { ...right, layer: 1, symbol });
      }
    }
    tiles.forEach((tile, id) => { tile.id = id; tile.removed = false; });

    let selected = null;
    board.innerHTML = `<div class="mahjong-board" role="group" aria-label="Tabuleiro de Mahjong"></div>`;
    const mahjongBoard = board.firstElementChild;

    function isCovered(tile) {
      return tiles.some((other) => !other.removed && other.layer > tile.layer && other.row === tile.row && other.col === tile.col);
    }

    function isFree(tile) {
      if (tile.removed || isCovered(tile)) return false;
      const sameLayer = (col) => tiles.some((other) => !other.removed && other.layer === tile.layer && other.row === tile.row && other.col === col);
      return !sameLayer(tile.col - 1) || !sameLayer(tile.col + 1);
    }

    function render() {
      mahjongBoard.innerHTML = "";
      tiles.forEach((tile) => {
        if (tile.removed) return;
        const covered = isCovered(tile);
        const free = isFree(tile);
        const tileButton = document.createElement("button");
        tileButton.type = "button";
        tileButton.className = `mahjong-tile${selected === tile.id ? " selected" : ""}${covered ? " covered" : ""}`;
        tileButton.style.gridRow = String(tile.row + 1);
        tileButton.style.gridColumn = String(tile.col + 1);
        tileButton.style.zIndex = String(tile.layer + 1);
        tileButton.textContent = tile.symbol;
        tileButton.disabled = covered || !free;
        tileButton.setAttribute("aria-label", `${tile.symbol}${covered ? ", coberta" : free ? ", livre" : ", bloqueada"}`);
        tileButton.addEventListener("click", () => {
          if (!isFree(tile)) return;
          if (selected === null) {
            selected = tile.id;
          } else if (selected === tile.id) {
            selected = null;
          } else {
            const first = tiles.find((item) => item.id === selected);
            if (first && first.symbol === tile.symbol && isFree(first)) {
              first.removed = true;
              tile.removed = true;
              selected = null;
              const remainingPairs = tiles.filter((item) => !item.removed).length / 2;
              status.textContent = remainingPairs
                ? `${remainingPairs} pares restantes. Boa combinação!`
                : "Tabuleiro limpo! Você dominou o Mahjong! 🎉";
              render();
              return;
            }
            selected = tile.id;
            status.textContent = "As peças precisam ser iguais e estar livres. Tente outra dupla.";
          }
          render();
        });
        mahjongBoard.append(tileButton);
      });
    }

    status.textContent = `${pairTotal} pares no tabuleiro`;
    instructions.textContent = "Toque em duas peças iguais que estejam livres nas laterais e sem peça por cima.";
    render();
  });
}

function ludoGame() {
  gameFrame("Jogue os dados e avance", (board, controls, status, instructions) => {
    const players = [
      { id: "you", name: "Você", color: "#d84f58", start: 0, tokens: Array.from({ length: 4 }, (_, id) => ({ id, progress: -1 })) },
      { id: "machine", name: "Máquina", color: "#4f85c6", start: 20, tokens: Array.from({ length: 4 }, (_, id) => ({ id, progress: -1 })) }
    ];
    const path = [];
    for (let col = 1; col <= 11; col++) path.push({ row: 1, col });
    for (let row = 2; row <= 11; row++) path.push({ row, col: 11 });
    for (let col = 10; col >= 1; col--) path.push({ row: 11, col });
    for (let row = 10; row >= 2; row--) path.push({ row, col: 1 });
    const safeSquares = new Set([0, 10, 20, 30]);
    let turn = "you";
    let diceValue = null;
    let legalTokenIds = [];
    let gameOver = false;
    const rollButton = button("🎲 Lançar o dado", rollDice);
    controls.append(rollButton);
    board.innerHTML = `<div class="ludo-board" role="group" aria-label="Tabuleiro de Ludo"></div><div class="ludo-homes"></div>`;
    const ludoBoard = board.querySelector(".ludo-board");
    const homes = board.querySelector(".ludo-homes");

    function tokenPosition(player, token) {
      return (player.start + token.progress) % path.length;
    }

    function canMove(token, roll) {
      if (token.progress < 0) return roll === 6;
      return token.progress + roll <= 40;
    }

    function render() {
      ludoBoard.innerHTML = "";
      path.forEach((position, index) => {
        const square = document.createElement("div");
        square.className = `ludo-square${index === 0 ? " start-red" : index === 20 ? " start-blue" : safeSquares.has(index) ? " safe" : ""}`;
        square.style.gridRow = String(position.row);
        square.style.gridColumn = String(position.col);
        if (safeSquares.has(index)) square.textContent = "★";
        players.forEach((player) => player.tokens.forEach((token) => {
          if (token.progress < 0 || token.progress >= 40 || tokenPosition(player, token) !== index) return;
          const tokenButton = document.createElement("button");
          tokenButton.type = "button";
          tokenButton.className = "ludo-token";
          tokenButton.style.setProperty("--token-color", player.color);
          tokenButton.textContent = String(token.id + 1);
          tokenButton.setAttribute("aria-label", `${player.name}, peão ${token.id + 1}`);
          tokenButton.disabled = player.id !== "you" || !legalTokenIds.includes(token.id);
          if (player.id === "you" && !tokenButton.disabled) {
            tokenButton.addEventListener("click", () => moveToken(token));
          }
          square.append(tokenButton);
        }));
        ludoBoard.append(square);
      });

      homes.innerHTML = "";
      players.forEach((player) => {
        const home = document.createElement("section");
        home.className = "ludo-home";
        home.style.setProperty("--home-color", player.color);
        const title = document.createElement("strong");
        title.textContent = `${player.name} · ${player.tokens.filter((token) => token.progress >= 40).length}/4 na chegada`;
        const tokenList = document.createElement("div");
        tokenList.className = "ludo-home-tokens";
        player.tokens.filter((token) => token.progress < 0).forEach((token) => {
          const tokenButton = document.createElement("button");
          tokenButton.type = "button";
          tokenButton.className = "ludo-token";
          tokenButton.style.setProperty("--token-color", player.color);
          tokenButton.textContent = String(token.id + 1);
          tokenButton.setAttribute("aria-label", `${player.name}, peão ${token.id + 1} ainda na base`);
          tokenButton.disabled = player.id !== "you" || !legalTokenIds.includes(token.id);
          if (player.id === "you" && !tokenButton.disabled) {
            tokenButton.addEventListener("click", () => moveToken(token));
          }
          tokenList.append(tokenButton);
        });
        home.append(title, tokenList);
        homes.append(home);
      });
      rollButton.disabled = gameOver || turn !== "you" || legalTokenIds.length > 0;
      rollButton.textContent = diceValue === null ? "🎲 Lançar o dado" : `🎲 Dado: ${diceValue}`;
    }

    function finishTurn(extraTurn) {
      legalTokenIds = [];
      if (!extraTurn) turn = turn === "you" ? "machine" : "you";
      if (turn === "machine" && !gameOver) {
        status.textContent = "A máquina está pensando... não vale soprar o dado!";
        render();
        closeTimer = setTimeout(machineTurn, 600);
      } else {
        diceValue = null;
        status.textContent = turn === "you"
          ? "Sua vez! Vamos ver se o dado está de bom humor."
          : status.textContent;
        render();
      }
    }

    function moveToken(token) {
      if (gameOver || turn !== "you" || diceValue === null || !legalTokenIds.includes(token.id)) return;
      token.progress = token.progress < 0 ? 0 : token.progress + diceValue;
      const landing = tokenPosition(players[0], token);
      if (!safeSquares.has(landing)) {
        players[1].tokens.forEach((rival) => {
          if (rival.progress >= 0 && rival.progress < 40 && tokenPosition(players[1], rival) === landing) rival.progress = -1;
        });
      }
      const extraTurn = diceValue === 6;
      diceValue = null;
      if (players[0].tokens.every((piece) => piece.progress >= 40)) {
        gameOver = true;
        status.textContent = "Você venceu o Ludo! A máquina vai treinar os dados. 🎉";
        render();
        return;
      }
      status.textContent = extraTurn ? "Seis! Mais uma jogada para você." : "Peão avançou. Boa jogada!";
      finishTurn(extraTurn);
    }

    function takeMachineMove(roll) {
      const computer = players[1];
      const choices = computer.tokens.filter((token) => canMove(token, roll));
      if (!choices.length) {
        status.textContent = roll === 6 ? "A máquina tirou seis, mas não tem peões na base." : "A máquina não conseguiu mover. Sua vez!";
        diceValue = null;
        finishTurn(false);
        return;
      }
      let token = choices[Math.floor(Math.random() * choices.length)];
      if (currentLevel.ai > 1) {
        token = choices.map((piece) => {
          const nextProgress = piece.progress < 0 ? 0 : piece.progress + roll;
          const destination = (computer.start + nextProgress) % path.length;
          const captures = players[0].tokens.filter((rival) =>
            rival.progress >= 0 && rival.progress < 40 && tokenPosition(players[0], rival) === destination
          ).length;
          const score = (piece.progress < 0 ? 8 : piece.progress)
            + (nextProgress === 40 ? 100 : 0)
            + captures * (currentLevel.ai === 4 ? 40 : currentLevel.ai === 3 ? 25 : 10)
            + (safeSquares.has(destination) ? 3 : 0);
          return { piece, score };
        }).sort((a, b) => b.score - a.score)[0].piece;
      }
      token.progress = token.progress < 0 ? 0 : token.progress + roll;
      const landing = tokenPosition(computer, token);
      if (!safeSquares.has(landing)) {
        players[0].tokens.forEach((rival) => {
          if (rival.progress >= 0 && rival.progress < 40 && tokenPosition(players[0], rival) === landing) rival.progress = -1;
        });
      }
      if (computer.tokens.every((piece) => piece.progress >= 40)) {
        gameOver = true;
        status.textContent = "A máquina ganhou esta! Os dados já estão pedindo revanche.";
        render();
        return;
      }
      const extraTurn = roll === 6;
      diceValue = null;
      status.textContent = extraTurn ? "A máquina tirou seis e joga de novo. Que sorte!" : "Sua vez! O dado está com você.";
      finishTurn(extraTurn);
    }

    function machineTurn() {
      closeTimer = null;
      if (gameOver || turn !== "machine") return;
      const roll = Math.floor(Math.random() * 6) + 1;
      status.textContent = `A máquina tirou ${roll}. Agora vamos ver...`;
      takeMachineMove(roll);
    }

    function rollDice() {
      if (gameOver || turn !== "you" || legalTokenIds.length) return;
      diceValue = Math.floor(Math.random() * 6) + 1;
      legalTokenIds = players[0].tokens.filter((token) => canMove(token, diceValue)).map((token) => token.id);
      if (!legalTokenIds.length) {
        status.textContent = `Saiu ${diceValue}. Nenhum peão pode avançar; a máquina joga agora.`;
        finishTurn(false);
        return;
      }
      status.textContent = `Saiu ${diceValue}! Toque em um dos seus peões para jogar.`;
      render();
    }

    instructions.textContent = "Tire 6 para sair da base. Toque em um peão destacado para avançar; quem levar os quatro peões à chegada vence.";
    status.textContent = "Sua vez! Lance o dado para começar.";
    cleanupGame = () => {
      if (closeTimer) clearTimeout(closeTimer);
      closeTimer = null;
    };
    render();
  });
}

function checkersGame() {
  gameFrame("Capture as peças", (board, controls, status, instructions) => {
    const state = Array.from({ length: 8 }, (_, r) => Array.from({ length: 8 }, (_, c) => (r + c) % 2 ? (r < 3 ? "b" : r > 4 ? "w" : null) : null));
    const flipped = Math.random() < .5;
    const boardPalette = randomChoice([
      ["#f5e8d2", "#75533c"],
      ["#e5eff4", "#466d7d"],
      ["#ece4f4", "#67577d"]
    ]);
    let selected = null;
    let legalMoves = [];
    let turn = "w";
    let gameOver = false;
    function movesFor(color, onlyCaptures = false) {
      const moves = [];
      state.forEach((row, r) => row.forEach((piece, c) => {
        if (piece !== color && piece !== color.toUpperCase()) return;
        const crowned = piece === piece.toUpperCase();
        const dirs = crowned ? [-1, 1] : [color === "w" ? -1 : 1];
        dirs.forEach((dr) => [-1, 1].forEach((dc) => {
          const nr = r + dr;
          const nc = c + dc;
          if (nr < 0 || nr > 7 || nc < 0 || nc > 7) return;
          if (!state[nr][nc] && !onlyCaptures) moves.push({ from: [r, c], to: [nr, nc] });
          else if (state[nr][nc] && state[nr][nc].toLowerCase() !== color) {
            const jr = nr + dr;
            const jc = nc + dc;
            if (jr >= 0 && jr < 8 && jc >= 0 && jc < 8 && !state[jr][jc]) moves.push({ from: [r, c], to: [jr, jc], capture: [nr, nc] });
          }
        }));
      }));
      return moves;
    }
    function render() {
      board.innerHTML = `<div class="checkers-grid" role="grid"></div>`;
      const checkerGrid = board.firstElementChild;
      checkerGrid.style.setProperty("--check-light", boardPalette[0]);
      checkerGrid.style.setProperty("--check-dark", boardPalette[1]);
      for (let viewRow = 0; viewRow < 8; viewRow++) for (let viewCol = 0; viewCol < 8; viewCol++) {
        const r = flipped ? 7 - viewRow : viewRow;
        const c = flipped ? 7 - viewCol : viewCol;
        const piece = state[r][c];
        const square = document.createElement("button");
        square.type = "button";
        square.className = `check-square ${(viewRow + viewCol) % 2 ? "dark" : "light"}${selected?.[0] === r && selected?.[1] === c ? " selected" : ""}${legalMoves.some((move) => move.to[0] === r && move.to[1] === c) ? " valid" : ""}`;
        square.textContent = piece ? (piece === "w" ? "⚪" : piece === "W" ? "👑" : piece === "b" ? "⚫" : "👑") : "";
        square.setAttribute("aria-label", `Linha ${viewRow + 1}, coluna ${viewCol + 1}${piece ? `, ${piece === "w" || piece === "W" ? "sua peça" : "oponente"}` : ""}`);
        square.addEventListener("click", () => clickSquare(r, c));
        checkerGrid.append(square);
      }
    }
    function clickSquare(r, c) {
      if (turn !== "w" || gameOver) return;
      const move = legalMoves.find((item) => item.to[0] === r && item.to[1] === c);
      if (move) {
        applyMove(move);
        turn = "b";
        selected = null;
        legalMoves = [];
        render();
        const timer = setTimeout(computerMove, 450);
        cleanupGame = () => clearTimeout(timer);
        return;
      }
      if (state[r][c]?.toLowerCase() === "w") {
        selected = [r, c];
        const all = movesFor("w");
        const captures = all.filter((item) => item.capture);
        legalMoves = (captures.length ? captures : all).filter((item) => item.from[0] === r && item.from[1] === c);
        status.textContent = captures.length ? "Captura obrigatória" : "Escolha uma casa destacada";
      }
      render();
    }
    function applyMove(move) {
      const [r, c] = move.from;
      const [nr, nc] = move.to;
      state[nr][nc] = state[r][c];
      state[r][c] = null;
      if (move.capture) state[move.capture[0]][move.capture[1]] = null;
      if ((nr === 0 && state[nr][nc] === "w") || (nr === 7 && state[nr][nc] === "b")) state[nr][nc] = state[nr][nc].toUpperCase();
    }
    function computerMove() {
      const all = movesFor("b");
      if (!all.length) {
        gameOver = true;
        status.textContent = `Você venceu! ${machineTaunt("checkers", "win")}`;
        return;
      }
      const captures = all.filter((move) => move.capture);
      const options = captures.length ? captures : all;
      let choice = options[Math.floor(Math.random() * options.length)];
      if (currentLevel.ai === 2) {
        const preferred = options.filter((move) => move.to[0] === 7 || state[move.from[0]][move.from[1]] === "B");
        if (preferred.length) choice = preferred[Math.floor(Math.random() * preferred.length)];
      } else if (currentLevel.ai >= 3) {
        choice = options.map((move) => {
          const nextState = state.map((row) => [...row]);
          applyMove(move);
          const replies = movesFor("w");
          const exposed = replies.filter((reply) => reply.capture).length;
          state.forEach((row, r) => row.forEach((_, c) => { state[r][c] = nextState[r][c]; }));
          const fromPiece = nextState[move.from[0]][move.from[1]];
          const score = (move.capture ? 20 : 0) + (move.to[0] === 7 ? 8 : 0) + (fromPiece === "B" ? 2 : 0) - exposed * (currentLevel.ai === 4 ? 6 : 2);
          return { move, score };
        }).sort((a, b) => b.score - a.score)[0].move;
      }
      applyMove(choice);
      turn = "w";
      const whites = state.flat().filter((piece) => piece?.toLowerCase() === "w").length;
      const blacks = state.flat().filter((piece) => piece?.toLowerCase() === "b").length;
      if (!whites || !movesFor("w").length) {
        gameOver = true;
        status.textContent = machineTaunt("checkers", "lose");
      } else status.textContent = `${machineTaunt("checkers", "play")} · ${whites} suas / ${blacks} do oponente`;
      render();
    }
    instructions.textContent = "Toque em uma peça e depois em uma casa destacada. Capturas são obrigatórias.";
    status.textContent = `Sua vez · ${machineTaunt("checkers", "play")}`;
    render();
  });
}

function wordSearchGame() {
  gameFrame("Encontre as palavras", (board, controls, status, instructions) => {
    const size = currentLevel.wordSize;
    const words = selectedLevel === 0 ? ["SOL", "MAR", "LUA", "FLOR"] : selectedLevel === 1 ? ["SOL", "MAR", "LUA", "FLOR", "CASA"] : ["SOL", "MAR", "LUA", "FLOR", "CASA", "NOITE", "PRAIA"];
    const diagonal = selectedLevel >= 2;
    const reverse = selectedLevel >= 3;
    const cells = Array.from({ length: size }, () => Array(size).fill(""));
    const directions = diagonal
      ? [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]]
      : [[0, 1], [1, 0]];
    function placeWord(word) {
      for (let attempt = 0; attempt < 150; attempt++) {
        const useReverse = reverse && Math.random() < .5;
        const chars = useReverse ? [...word].reverse() : [...word];
        const [dr, dc] = directions[Math.floor(Math.random() * directions.length)];
        const row = Math.floor(Math.random() * size);
        const col = Math.floor(Math.random() * size);
        const endRow = row + (chars.length - 1) * dr;
        const endCol = col + (chars.length - 1) * dc;
        if (endRow < 0 || endRow >= size || endCol < 0 || endCol >= size) continue;
        let fits = true;
        chars.forEach((char, i) => {
          const current = cells[row + i * dr][col + i * dc];
          if (current && current !== char) fits = false;
        });
        if (!fits) continue;
        chars.forEach((char, i) => { cells[row + i * dr][col + i * dc] = char; });
        return true;
      }
      return false;
    }
    const placed = words.filter(placeWord);
    const alphabet = "ABCDEFGHIJKLMNOPRSTUV";
    cells.forEach((row) => row.forEach((char, col) => {
      if (!char) row[col] = alphabet[Math.floor(Math.random() * alphabet.length)];
    }));
    board.innerHTML = `<div class="word-grid" style="--word-size:${size}" aria-label="Grade de caça-palavras"></div><p style="color:var(--muted);text-align:center;margin:12px 0 0">Palavras: <strong style="color:var(--text)">${placed.join(" · ")}</strong></p>`;
    const wordGrid = board.querySelector(".word-grid");
    const letters = [];
    let first = null;
    const found = new Set();
    function cellAt(event) {
      const item = event.target.closest("[data-pos]");
      return item ? Number(item.dataset.pos) : null;
    }
    function rangeIndices(start, end) {
      const sr = Math.floor(start / size);
      const sc = start % size;
      const er = Math.floor(end / size);
      const ec = end % size;
      const dr = Math.sign(er - sr);
      const dc = Math.sign(ec - sc);
      if (sr !== er && sc !== ec && Math.abs(er - sr) !== Math.abs(ec - sc)) return [];
      const indices = [];
      let r = sr;
      let c = sc;
      while ((dr === 0 || (dr > 0 ? r <= er : r >= er)) && (dc === 0 || (dc > 0 ? c <= ec : c >= ec))) {
        indices.push(r * size + c);
        if (r === er && c === ec) break;
        r += dr;
        c += dc;
      }
      return indices;
    }
    function selectRange(start, end) {
      const selected = rangeIndices(start, end);
      if (!selected.length) {
        status.textContent = "Escolha letras na mesma linha, coluna ou diagonal";
        return;
      }
      const word = selected.map((i) => cells[Math.floor(i / size)][i % size]).join("");
      const reversed = [...word].reverse().join("");
      const foundWord = placed.find((candidate) => !found.has(candidate) && (candidate === word || candidate === reversed));
      if (foundWord) {
        found.add(foundWord);
        selected.forEach((i) => letters[i].classList.add("found"));
        board.querySelector(`[data-word="${foundWord}"]`)?.classList.add("found");
        status.textContent = found.size === placed.length ? "Você encontrou todas! 🎉" : `${found.size} / ${placed.length} encontradas`;
      } else {
        letters.forEach((item) => item.classList.remove("selected"));
        selected.forEach((i) => letters[i].classList.add("selected"));
        status.textContent = "Quase! A palavra não bateu — tente outra direção.";
      }
      first = null;
    }
    function tapCell(index) {
      if (first === null) {
        first = index;
        letters.forEach((letter) => letter.classList.remove("selected", "preview"));
        letters[index].classList.add("selected");
        status.textContent = "Agora toque na última letra da palavra";
      } else selectRange(first, index);
    }
    cells.forEach((row, r) => row.forEach((char, c) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "word-letter";
      item.textContent = char;
      item.dataset.pos = String(r * size + c);
      item.addEventListener("click", () => {
        if (Date.now() < suppressClickUntil) return;
        tapCell(Number(item.dataset.pos));
      });
      letters.push(item);
      wordGrid.append(item);
    }));
    let pointerStart = null;
    let pointerEnd = null;
    let suppressClickUntil = 0;
    function clearPreview() {
      letters.forEach((letter) => letter.classList.remove("preview"));
    }
    function handlePointerMove(event) {
      if (pointerStart === null) return;
      const cell = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-pos]");
      if (!cell) return;
      const end = Number(cell.dataset.pos);
      if (end === pointerEnd) return;
      pointerEnd = end;
      clearPreview();
      rangeIndices(pointerStart, end).forEach((index) => letters[index].classList.add("preview"));
    }
    function handlePointerUp(event) {
      if (pointerStart === null) return;
      const cell = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-pos]");
      const end = cell ? Number(cell.dataset.pos) : pointerStart;
      if (end === pointerStart) tapCell(pointerStart);
      else selectRange(pointerStart, end);
      suppressClickUntil = Date.now() + 350;
      clearPreview();
      pointerStart = null;
      pointerEnd = null;
    }
    wordGrid.addEventListener("pointerdown", (event) => {
      const index = cellAt(event);
      if (index === null) return;
      pointerStart = index;
      pointerEnd = index;
      event.preventDefault();
    });
    document.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.addEventListener("pointerup", handlePointerUp);
    document.addEventListener("pointercancel", handlePointerUp);
    cleanupGame = () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
      document.removeEventListener("pointercancel", handlePointerUp);
    };
    board.querySelector("strong").innerHTML = placed.map((word) => `<span class="word-chip" data-word="${word}">${word}</span>`).join("");
    instructions.textContent = `Toque na primeira e na última letra ou deslize entre elas.${diagonal ? " Há diagonais." : " Só horizontal e vertical."}${reverse ? " Algumas estão invertidas." : ""}`;
    status.textContent = `0 / ${placed.length} encontradas`;
  });
}

function stackGame() {
  gameFrame("Construa sua torre", (board, controls, status, instructions) => {
    const canvas = document.createElement("canvas");
    canvas.width = 360;
    canvas.height = 420;
    canvas.className = "game-canvas stack-canvas";
    canvas.setAttribute("aria-label", "Toque para soltar o bloco em movimento");
    board.append(canvas);
    const ctx = canvas.getContext("2d");
    const blockHeight = 22;
    const initialWidth = 210;
    const colors = shuffle(["#78cf9a", "#79bdf2", "#f6a8cf", "#ffbd75", "#a99bff", "#76ded0"]);
    let stack = [{ x: 75, y: 385, width: initialWidth, color: colors[0] }];
    let moving = { x: 0, y: 363, width: initialWidth, direction: 1, color: colors[1] };
    let score = 0;
    let gameOver = false;
    let frame = 0;
    function paint() {
      const background = ctx.createLinearGradient(0, 0, 360, 420);
      background.addColorStop(0, "#172332");
      background.addColorStop(1, "#0b1118");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#18212c";
      ctx.fillRect(0, 385, canvas.width, 35);
      stack.forEach((block) => {
        const gradient = ctx.createLinearGradient(block.x, block.y, block.x, block.y + blockHeight);
        gradient.addColorStop(0, "#ffffff");
        gradient.addColorStop(.16, block.color);
        gradient.addColorStop(1, block.color);
        ctx.fillStyle = gradient;
        ctx.fillRect(block.x, block.y, block.width, blockHeight - 2);
        ctx.fillStyle = "#ffffff55";
        ctx.fillRect(block.x, block.y, block.width, 2);
      });
      if (!gameOver) {
        const gradient = ctx.createLinearGradient(moving.x, moving.y, moving.x, moving.y + blockHeight);
        gradient.addColorStop(0, "#ffffff");
        gradient.addColorStop(.16, moving.color);
        gradient.addColorStop(1, moving.color);
        ctx.fillStyle = gradient;
        ctx.fillRect(moving.x, moving.y, moving.width, blockHeight - 2);
        ctx.fillStyle = "#ffffff66";
        ctx.fillRect(moving.x, moving.y, moving.width, 2);
      } else {
        ctx.fillStyle = "#f5f7fa";
        ctx.textAlign = "center";
        ctx.font = "bold 24px sans-serif";
        ctx.fillText("Fim da torre", canvas.width / 2, 180);
        ctx.font = "16px sans-serif";
        ctx.fillText(`Pontuação: ${score}`, canvas.width / 2, 212);
      }
    }
    function animate() {
      if (gameOver || !modal.classList.contains("is-open")) return;
      moving.x += moving.direction * currentLevel.stackSpeed;
      if (moving.x + moving.width >= canvas.width) {
        moving.x = canvas.width - moving.width;
        moving.direction = -1;
      }
      if (moving.x <= 0) {
        moving.x = 0;
        moving.direction = 1;
      }
      if (frame++ % 2 === 0) paint();
      frameId = requestAnimationFrame(animate);
    }
    let frameId = requestAnimationFrame(animate);
    function drop() {
      if (gameOver) return;
      const base = stack[stack.length - 1];
      let left = Math.max(base.x, moving.x);
      const right = Math.min(base.x + base.width, moving.x + moving.width);
      let overlap = right - left;
      if (overlap <= 0 && -overlap <= currentLevel.stackTolerance) {
        left = base.x;
        overlap = base.width;
      }
      if (overlap <= 0) {
        gameOver = true;
        status.textContent = `Fim de jogo · ${score} blocos`;
        status.classList.add("game-over");
        paint();
        return;
      }
      stack.push({ x: left, y: base.y - blockHeight, width: overlap, color: moving.color });
      score++;
      status.textContent = `${score} ${score === 1 ? "bloco" : "blocos"} na torre`;
      if (stack.length > 15) {
        stack.forEach((block) => { block.y += blockHeight; });
      }
      moving = { x: moving.direction > 0 ? 0 : canvas.width - overlap, y: stack.at(-1).y - blockHeight, width: overlap, direction: moving.direction, color: colors[(score + 1) % colors.length] };
      if (moving.y < 45) {
        stack.forEach((block) => { block.y += 45 - moving.y; });
        moving.y = 45;
      }
      paint();
    }
    canvas.addEventListener("pointerdown", drop);
    controls.append(button("Soltar bloco", drop));
    cleanupGame = () => cancelAnimationFrame(frameId);
    instructions.textContent = "Toque na tela para soltar. Alinhe os blocos para manter a torre de pé.";
    status.textContent = "0 blocos na torre";
    paint();
  });
}
