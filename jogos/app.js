"use strict";

const games = [
  { id: "sudoku", name: "Sudoku", description: "Um desafio para a mente", icon: "🔢", tint: "#173f45", accent: "#59e1d0" },
  { id: "solitaire", name: "Paciência", description: "O clássico de cartas", icon: "🃏", tint: "#194733", accent: "#64e69b" },
  { id: "tetris", name: "Tetris", description: "Encaixe, limpe, repita", icon: "🧱", tint: "#392751", accent: "#c69aff" },
  { id: "memory", name: "Jogo da Memória", description: "Encontre todos os pares", icon: "🧠", tint: "#503025", accent: "#ffad78" },
  { id: "crossword", name: "Palavras Cruzadas", description: "Descubra pelas dicas", icon: "✏️", tint: "#51421e", accent: "#ffd66e" },
  { id: "bingo", name: "Bingo", description: "Sua sorte está lançada", icon: "🔵", tint: "#512b42", accent: "#ff83b3" },
  { id: "domino", name: "Dominó", description: "Você contra a máquina", icon: "⚄", tint: "#19473e", accent: "#72e3c8" },
  { id: "checkers", name: "Damas", description: "Pense alguns lances à frente", icon: "♟️", tint: "#523829", accent: "#ffb779" },
  { id: "wordsearch", name: "Caça-Palavras", description: "Ache todas as palavras", icon: "🔎", tint: "#1f3e59", accent: "#79c1ff" },
  { id: "stack", name: "Torre de Blocos", description: "Alinhe e construa", icon: "🏗️", tint: "#4c461c", accent: "#e3ed68" },
  { id: "racing", name: "Corrida Interlagos", description: "Acelere, desvie e vença", icon: "🏎️", tint: "#522d35", accent: "#ff7a72" }
];
const gameVariants = {
  sudoku: ["Desafio dos números", "Tabuleiro surpresa", "Sequência relâmpago", "Números em festa"],
  solitaire: ["Mesa embaralhada", "Novo desafio de cartas", "Sorte no monte", "Paciência surpresa"],
  tetris: ["Chuva de blocos", "Peças surpresa", "Ritmo arcade", "Desafio neon"],
  memory: ["Cartas surpresa", "Coleção colorida", "Memória em jogo", "Pares embaralhados"],
  crossword: ["Enigma do dia", "Palavras surpresa", "Desafio de vocabulário", "Pistas embaralhadas", "Tabuleiro girado"],
  bingo: ["Bingo da sorte", "Cartela surpresa", "Rodada premiada", "Sorteio relâmpago"],
  domino: ["Mesa surpresa", "Desafio das peças", "Duelo de estratégia", "Pedras embaralhadas"],
  checkers: ["Duelo no tabuleiro", "Desafio estratégico", "Peças em ação", "Partida surpresa"],
  wordsearch: ["Caça temática", "Grade surpresa", "Letras embaralhadas", "Desafio de palavras"],
  stack: ["Torre colorida", "Blocos surpresa", "Desafio de equilíbrio", "Construção arcade"],
  racing: ["Grande Prêmio de Interlagos", "Desafio da Curva do Sol", "Sprint no S do Senna", "Corrida paulista"]
};
const gameAccents = {
  sudoku: ["#39a995", "#4b8fc4", "#7884cb"],
  solitaire: ["#329969", "#4a9e87", "#718c55"],
  tetris: ["#8759c6", "#496ed0", "#d26eab"],
  memory: ["#d58155", "#ca6d8b", "#a875c4"],
  crossword: ["#b68a37", "#bb7144", "#7c9d4b"],
  bingo: ["#d35c8f", "#8668c6", "#e57b70"],
  domino: ["#368c83", "#4c9c6a", "#4980b7"],
  checkers: ["#b46e48", "#b65362", "#8d6fba"],
  wordsearch: ["#3986b8", "#4b9a9a", "#8b74bb"],
  stack: ["#9c9e3c", "#d28b48", "#5e9f76"],
  racing: ["#e76860", "#4a86ce", "#db9a43"]
};
const levelIcons = ["🌱", "⚡", "🔥", "💎"];
const levels = [
  { name: "Fácil", given: 42, draw: 1, redeals: 5, tetris: 850, memory: 12, bingoCards: 1, bingoSpeed: 2600, ai: 1, wordSize: 8, stackSpeed: 1.7, stackTolerance: 14 },
  { name: "Médio", given: 36, draw: 1, redeals: 3, tetris: 620, memory: 16, bingoCards: 2, bingoSpeed: 1900, ai: 2, wordSize: 9, stackSpeed: 2.5, stackTolerance: 9 },
  { name: "Difícil", given: 30, draw: 3, redeals: 2, tetris: 440, memory: 24, bingoCards: 3, bingoSpeed: 1300, ai: 3, wordSize: 10, stackSpeed: 3.4, stackTolerance: 4 },
  { name: "Muito Difícil", given: 25, draw: 3, redeals: 1, tetris: 300, memory: 36, bingoCards: 4, bingoSpeed: 850, ai: 4, wordSize: 12, stackSpeed: 4.5, stackTolerance: 0 }
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
    domino: {
      play: ["Boa peça! Minha máquina de calcular ficou ofendida.", "Jogada interessante... quase estratégica.", "A mesa está esquentando. Não era só força de expressão."],
      win: ["Você ganhou! Vou fingir que deixei.", "Vitória sua. Já revisei meu algoritmo e culpei o azar.", "Mandou bem! Hoje as pedras caíram do seu lado."],
      lose: ["Ponto para mim! Pode reclamar com o embaralhador.", "Ganhei essa. Minha modéstia segue intacta.", "Essa mesa foi minha. A revanche está logo ali."]
    },
    checkers: {
      play: ["Boa! Até minhas peças ficaram impressionadas.", "Você pensa rápido. Minha CPU pediu café.", "Movimento ousado. Vamos ver se o tabuleiro concorda."],
      win: ["Você venceu! Vou treinar no modo humildade.", "Dama para você! Minha estratégia pediu demissão.", "Boa partida! Hoje você mandou no tabuleiro."],
      lose: ["Ponto para a máquina. Acontece até com gente boa.", "Ganhei essa, mas não se acostume!", "Xeque... ops, jogo errado. Mesmo assim, ganhei!"]
    },
    racing: {
      play: ["A curva do Sol não perdoa distração!", "Seu rival está no retrovisor. Por enquanto.", "Interlagos sentiu essa ultrapassagem!"],
      win: ["Pódio seu! A bandeirada não mente.", "Você voou no S do Senna. Que corrida!", "Vitória em Interlagos! O troféu já está brilhando."],
      lose: ["A máquina chegou na frente. Culpa do vento, claro.", "Quase no pódio! A revanche está a uma curva.", "Essa corrida foi do rival. Seu capacete continua estiloso."]
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
  window.jogosAnalytics?.startGame(game, levels[selectedLevel].name, roundVariant);
  showSetup();
  content.scrollTop = 0;
  document.querySelector("#close-game").focus();
}

function closeGame() {
  stopCurrentGame();
  window.jogosAnalytics?.finishGame();
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
    window.jogosAnalytics?.updateGame(activeGame, currentLevel.name, roundVariant);
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
  window.jogosAnalytics?.startGame(activeGame, currentLevel.name, roundVariant);
  launchGame(id);
}

function launchGame(id) {
  stopCurrentGame();
  const runners = {
    sudoku: sudokuGame,
    solitaire: solitaireGame,
    tetris: tetrisGame,
    memory: memoryGame,
    crossword: crosswordGame,
    bingo: bingoGame,
    domino: dominoGame,
    checkers: checkersGame,
    wordsearch: wordSearchGame,
    stack: stackGame,
    racing: racingGame
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

function solitaireGame() {
  gameFrame("Organize as cartas", (board, controls, status, instructions) => {
    const suits = ["♠", "♥", "♦", "♣"];
    const deck = shuffle(suits.flatMap((suit) => Array.from({ length: 13 }, (_, i) => ({ rank: i + 1, suit, red: suit === "♥" || suit === "♦", faceUp: false }))));
    const columns = Array.from({ length: 7 }, (_, i) => deck.splice(0, i + 1));
    columns.forEach((column) => column[column.length - 1].faceUp = true);
    const stock = deck;
    const waste = [];
    const foundations = suits.map(() => []);
    let selected = null;
    let redeals = 0;
    let moves = 0;
    const drawCount = currentLevel.draw;
    function cardName(card) {
      return `${card.rank === 1 ? "A" : card.rank === 11 ? "J" : card.rank === 12 ? "Q" : card.rank === 13 ? "K" : card.rank}${card.suit}`;
    }
    function render() {
      board.innerHTML = `<div class="solitaire-status" style="display:flex;justify-content:space-between;color:var(--muted);margin-bottom:10px"><span>↺ ${redeals} / ${currentLevel.redeals} re-compras</span><span>${moves} jogadas</span></div><div class="solitaire-top" style="display:flex;gap:7px;justify-content:space-between;margin-bottom:16px"><button class="domino-tile stock-pile" aria-label="Comprar do monte">${stock.length ? `🂠 ${stock.length}` : "↺"}</button><div class="domino-tile waste-pile">${waste.length ? cardName(waste[waste.length - 1]) : "—"}</div><div class="solitaire-foundations" style="display:flex;gap:4px">${foundations.map((pile, i) => `<button class="domino-tile foundation" data-foundation="${i}" aria-label="Base ${suits[i]}">${pile.length ? cardName(pile[pile.length - 1]) : suits[i]}</button>`).join("")}</div></div><div class="solitaire-columns" style="display:grid;grid-template-columns:repeat(7,minmax(52px,1fr));gap:4px;overflow-x:auto;min-width:100%">${columns.map((column, i) => `<div data-column="${i}" style="display:flex;min-width:52px;flex-direction:column;align-items:center">${column.map((card, j) => `<button class="solitaire-card ${card.faceUp ? "face-up" : "face-down"}" data-card="${j}" style="width:48px;min-width:48px;height:70px;margin-bottom:-22px;position:relative;z-index:${j};border:1px solid ${card.faceUp ? "#aeb8c5" : "#6581a2"};border-radius:7px;background:${card.faceUp ? "#f0f2f5" : "#40536b"};color:${card.red ? "#c23845" : "#1b2531"};font-weight:900;font-size:14px">${card.faceUp ? cardName(card) : "◆"}</button>`).join("")}</div>`).join("")}</div>`;
      board.querySelector(".stock-pile").addEventListener("click", draw);
      board.querySelector(".waste-pile").addEventListener("click", () => {
        if (waste.length) selectSource({ type: "waste" });
      });
      board.querySelectorAll(".foundation").forEach((node) => node.addEventListener("click", () => moveToFoundation(Number(node.dataset.foundation))));
      board.querySelectorAll("[data-column]").forEach((columnNode) => {
        const columnIndex = Number(columnNode.dataset.column);
        columnNode.querySelectorAll(".solitaire-card.face-up").forEach((node) => node.addEventListener("click", () => {
          const cardIndex = Number(node.dataset.card);
          if (selected) {
            if (selected.type !== "column" || selected.column !== columnIndex) {
              if (moveToColumn(columnIndex)) return;
            } else if (selected.index !== cardIndex && cardIndex > selected.index) {
              if (moveToColumn(columnIndex)) return;
            } else if (selected.index === cardIndex) {
              selectSource(null);
              return;
            }
          }
          selectSource({ type: "column", column: columnIndex, index: cardIndex });
        }));
        columnNode.addEventListener("click", (event) => {
          if (event.target === columnNode && selected) moveToColumn(columnIndex);
        });
      });
      markSelection();
    }
    function markSelection() {
      if (!selected) return;
      if (selected.type === "waste") board.querySelector(".waste-pile")?.classList.add("selected");
      if (selected.type === "column") board.querySelector(`[data-column="${selected.column}"] [data-card="${selected.index}"]`)?.classList.add("selected");
    }
    function selectSource(source) {
      selected = source;
      render();
    }
    function sourceCards() {
      if (!selected) return null;
      if (selected.type === "waste") return [waste[waste.length - 1]];
      return columns[selected.column].slice(selected.index);
    }
    function moveToColumn(targetIndex) {
      const moving = sourceCards();
      if (!moving?.length) return false;
      const target = columns[targetIndex];
      const card = moving[0];
      const top = target[target.length - 1];
      if (target === (selected.type === "column" ? columns[selected.column] : null)) return false;
      if (top && (!top.faceUp || top.red === card.red || top.rank !== card.rank + 1)) return false;
      if (!top && card.rank !== 13) return false;
      if (selected.type === "waste") waste.pop();
      else {
        columns[selected.column].splice(selected.index);
        const oldTop = columns[selected.column].at(-1);
        if (oldTop && !oldTop.faceUp) oldTop.faceUp = true;
      }
      target.push(...moving);
      selected = null;
      moves++;
      render();
      return true;
    }
    function moveToFoundation(index) {
      const moving = sourceCards();
      if (!moving || moving.length !== 1) return;
      const card = moving[0];
      const pile = foundations[index];
      if (card.suit !== suits[index] || card.rank !== pile.length + 1) return;
      if (selected.type === "waste") waste.pop();
      else {
        columns[selected.column].pop();
        const oldTop = columns[selected.column].at(-1);
        if (oldTop && !oldTop.faceUp) oldTop.faceUp = true;
      }
      pile.push(card);
      selected = null;
      moves++;
      if (foundations.every((foundation) => foundation.length === 13)) status.textContent = "Você venceu! 🎉";
      render();
    }
    function draw() {
      selected = null;
      if (stock.length) {
        for (let i = 0; i < drawCount && stock.length; i++) {
          const card = stock.pop();
          card.faceUp = true;
          waste.push(card);
        }
      } else if (waste.length && redeals < currentLevel.redeals) {
        while (waste.length) {
          const card = waste.pop();
          card.faceUp = false;
          stock.push(card);
        }
        redeals++;
      } else status.textContent = "Limite de re-compras atingido";
      render();
    }
    function autoMove() {
      if (!selected) {
        status.textContent = "Toque primeiro em uma carta para selecioná-la";
        return;
      }
      const card = sourceCards()?.[0];
      if (!card) return;
      const foundationIndex = suits.indexOf(card.suit);
      if (card.rank === foundations[foundationIndex].length + 1) {
        moveToFoundation(foundationIndex);
        return;
      }
      const targetIndex = columns.findIndex((column, index) => {
        if (selected.type === "column" && selected.column === index) return false;
        const top = column.at(-1);
        return top ? top.faceUp && top.red !== card.red && top.rank === card.rank + 1 : card.rank === 13;
      });
      if (targetIndex >= 0 && moveToColumn(targetIndex)) return;
      status.textContent = "Essa carta ainda não tem destino. Tente outra ou compre do monte.";
    }
    controls.append(button("✨ Mover por mim", autoMove));
    instructions.textContent = `Compre ${drawCount === 1 ? "uma" : "três"} carta${drawCount === 1 ? "" : "s"}. Toque numa carta e depois em outra pilha. Use “Mover por mim” para uma sugestão rápida.`;
    render();
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

function dominoGame() {
  gameFrame("Sua vez de jogar", (board, controls, status, instructions) => {
    const allTiles = shuffle(Array.from({ length: 7 }, (_, a) => Array.from({ length: 7 - a }, (_, i) => ({ a, b: a + i }))).flat());
    const player = allTiles.splice(0, 7);
    const computer = allTiles.splice(0, 7);
    const boneyard = allTiles;
    const chain = [];
    let turn = "player";
    let selectedSide = "right";
    let passes = 0;
    let finished = false;
    function render() {
      board.innerHTML = `<p style="text-align:center;color:var(--muted)">🤖 Oponente: ${computer.length} peças · Monte: ${boneyard.length}</p><div class="domino-table" id="domino-table">${chain.map((tile) => `<span class="domino-tile">${tile.a} : ${tile.b}</span>`).join("") || "As peças jogadas aparecem aqui"}</div><div style="text-align:center;color:var(--muted);margin:14px 0 6px">Sua mão</div><div class="domino-hand">${player.map((tile, i) => `<button class="domino-tile" data-index="${i}" ${turn !== "player" || finished ? "disabled" : ""}>${tile.a} : ${tile.b}</button>`).join("")}</div>`;
      board.querySelectorAll("[data-index]").forEach((node) => node.addEventListener("click", () => playPlayer(Number(node.dataset.index))));
      controls.innerHTML = "";
      controls.append(button("← Esquerda", () => { selectedSide = "left"; status.textContent = "Lado esquerdo selecionado"; }));
      controls.append(button("Direita →", () => { selectedSide = "right"; status.textContent = "Lado direito selecionado"; }));
      controls.append(button("Comprar", drawTile));
    }
    function canPlay(tile) {
      if (!chain.length) return true;
      return tile.a === chain[0].a || tile.b === chain[0].a || tile.a === chain.at(-1).b || tile.b === chain.at(-1).b;
    }
    function place(tile, side) {
      if (!chain.length) chain.push({ ...tile });
      else if (side === "left") {
        if (tile.b === chain[0].a) chain.unshift({ ...tile });
        else if (tile.a === chain[0].a) chain.unshift({ a: tile.b, b: tile.a });
        else return false;
      } else {
        if (tile.a === chain.at(-1).b) chain.push({ ...tile });
        else if (tile.b === chain.at(-1).b) chain.push({ a: tile.b, b: tile.a });
        else return false;
      }
      return true;
    }
    function playPlayer(index) {
      if (turn !== "player" || finished) return;
      const tile = player[index];
      const side = !chain.length ? "right" : selectedSide;
      if (!canPlay(tile) || !place(tile, side)) {
        status.textContent = "Essa peça não combina. Tente outro lado.";
        return;
      }
      player.splice(index, 1);
      passes = 0;
      if (!player.length) {
        finished = true;
        status.textContent = machineTaunt("domino", "win");
        render();
        return;
      }
      turn = "computer";
      status.textContent = machineTaunt("domino", "play");
      render();
      closeTimer = setTimeout(computerTurn, 650);
    }
    function drawTile() {
      if (turn !== "player" || finished) return;
      while (boneyard.length) {
        const tile = boneyard.pop();
        player.push(tile);
        if (canPlay(tile)) {
          status.textContent = "Peça comprada. Sua vez!";
          render();
          return;
        }
      }
      status.textContent = "Sem jogada possível. Passou a vez.";
      passes++;
      if (passes >= 2) endBlocked();
      else {
        turn = "computer";
        render();
        closeTimer = setTimeout(computerTurn, 650);
      }
    }
    function computerTurn() {
      if (finished) return;
      const choices = computer.map((tile, index) => ({ tile, index })).filter(({ tile }) => canPlay(tile));
      if (!choices.length) {
        if (boneyard.length) computer.push(boneyard.pop());
        else {
          passes++;
          if (passes >= 2) {
            endBlocked();
            return;
          }
        }
        turn = "player";
        status.textContent = `Oponente passou. ${machineTaunt("domino", "play")}`;
        render();
        return;
      }
      const candidates = choices.flatMap((choice) => {
        const sides = !chain.length ? ["right"] : ["left", "right"];
        return sides.filter((side) => {
          if (!chain.length) return true;
          const end = side === "left" ? chain[0].a : chain.at(-1).b;
          return choice.tile.a === end || choice.tile.b === end;
        }).map((side) => {
          let leftEnd = choice.tile.a;
          let rightEnd = choice.tile.b;
          if (chain.length && side === "left") {
            leftEnd = choice.tile.a === chain[0].a ? choice.tile.b : choice.tile.a;
            rightEnd = chain.at(-1).b;
          } else if (chain.length) {
            leftEnd = chain[0].a;
            rightEnd = choice.tile.a === chain.at(-1).b ? choice.tile.b : choice.tile.a;
          }
          const available = player.filter((tile) =>
            tile.a === leftEnd || tile.b === leftEnd || tile.a === rightEnd || tile.b === rightEnd
          ).length;
          const pips = choice.tile.a + choice.tile.b;
          return { ...choice, side, score: selectedLevel === 1 ? pips : selectedLevel === 2 ? pips - available : pips - available * 6 };
        });
      });
      const choice = selectedLevel === 0
        ? candidates[Math.floor(Math.random() * candidates.length)]
        : candidates.sort((x, y) => y.score - x.score)[0];
      place(choice.tile, choice.side);
      computer.splice(choice.index, 1);
      passes = 0;
      if (!computer.length) {
        finished = true;
        status.textContent = machineTaunt("domino", "lose");
      } else {
        turn = "player";
        status.textContent = machineTaunt("domino", "play");
      }
      render();
    }
    function endBlocked() {
      finished = true;
      const myPips = player.reduce((sum, tile) => sum + tile.a + tile.b, 0);
      const theirPips = computer.reduce((sum, tile) => sum + tile.a + tile.b, 0);
      status.textContent = myPips <= theirPips ? `Jogo bloqueado: ${machineTaunt("domino", "win")}` : `Jogo bloqueado: ${machineTaunt("domino", "lose")}`;
      render();
    }
    instructions.textContent = "Toque em uma peça para jogar. Escolha esquerda ou direita quando precisar.";
    status.textContent = "Sua vez!";
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

function racingGame() {
  gameFrame("Grande Prêmio de Interlagos", (board, controls, status, instructions) => {
    content.querySelector(".game-panel").classList.add("race-game");
    const canvas = document.createElement("canvas");
    canvas.width = 360;
    canvas.height = 600;
    canvas.className = "game-canvas race-canvas";
    canvas.setAttribute("aria-label", "Corrida arcade na pista de Interlagos");
    board.append(canvas);
    const ctx = canvas.getContext("2d");
    const laneOffsets = [-1, 0, 1];
    const obstacleColors = { cone: "#ff944d", gate: "#b171e8", rival: "#48b7d1" };
    const hazards = [];
    const items = [];
    const keys = new Set();
    let lane = 1;
    let distance = 0;
    let rivalDistance = 0;
    let score = 0;
    let lastFrame = 0;
    let lastSpawn = 0;
    let jumpUntil = 0;
    let duckUntil = 0;
    let speedPenalty = 0;
    let tiltCooldown = 0;
    let ended = false;
    let frameId = 0;
    const lapLength = 1200;
    const totalDistance = lapLength * 3;
    const worldSpeed = 205 + selectedLevel * 22;
    const playerY = 458;

    function roadCenter(y, world = distance) {
      return 180 + Math.sin((world + y * 1.9) * .0022) * 44 + Math.sin((world + y * 1.25) * .0011) * 24;
    }

    function drawCar(x, y, color, isPlayer = false, jumping = false) {
      ctx.save();
      if (jumping) {
        ctx.shadowColor = "#ffffff";
        ctx.shadowBlur = 20;
        y -= 14;
      }
      const gradient = ctx.createLinearGradient(x - 17, y - 28, x + 17, y + 28);
      gradient.addColorStop(0, "#ffffff");
      gradient.addColorStop(.18, color);
      gradient.addColorStop(1, color);
      ctx.fillStyle = "#26303a";
      ctx.fillRect(x - 18, y - 23, 6, 15);
      ctx.fillRect(x + 12, y - 23, 6, 15);
      ctx.fillRect(x - 18, y + 9, 6, 15);
      ctx.fillRect(x + 12, y + 9, 6, 15);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(x - 12, y - 28);
      ctx.quadraticCurveTo(x, y - 34, x + 12, y - 28);
      ctx.lineTo(x + 16, y + 21);
      ctx.quadraticCurveTo(x, y + 29, x - 16, y + 21);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = isPlayer ? "#d7f6ff" : "#d8e6ed";
      ctx.beginPath();
      ctx.moveTo(x - 9, y - 12);
      ctx.lineTo(x + 9, y - 12);
      ctx.lineTo(x + 11, y + 2);
      ctx.lineTo(x - 11, y + 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = isPlayer ? "#fff1a8" : "#ffcf86";
      ctx.fillRect(x - 12, y + 18, 6, 3);
      ctx.fillRect(x + 6, y + 18, 6, 3);
      if (isPlayer) {
        ctx.fillStyle = "#203444";
        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("VOCÊ", x, y + 12);
      }
      ctx.restore();
    }

    function drawTrack() {
      const sky = ctx.createLinearGradient(0, 0, 0, 600);
      sky.addColorStop(0, "#a9d2dc");
      sky.addColorStop(.4, "#dcebe5");
      sky.addColorStop(1, "#7dbb91");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, 360, 600);
      ctx.fillStyle = "#8ac68d";
      ctx.fillRect(0, 115, 360, 485);
      for (let y = 115; y < 600; y += 45) {
        const center = roadCenter(y);
        const width = 235 + (y / 600) * 15;
        const left = center - width / 2;
        const right = center + width / 2;
        const stripe = Math.floor((y + distance * .55) / 22) % 2 === 0;
        ctx.fillStyle = stripe ? "#f7f2df" : "#dd6565";
        ctx.fillRect(left - 8, y, 8, 24);
        ctx.fillRect(right, y, 8, 24);
      }
      ctx.beginPath();
      for (let y = 115; y <= 600; y += 8) {
        const x = roadCenter(y) - 118 - (y / 600) * 8;
        if (y === 115) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      for (let y = 600; y >= 115; y -= 8) ctx.lineTo(roadCenter(y) + 118 + (y / 600) * 8, y);
      ctx.closePath();
      ctx.fillStyle = "#515c65";
      ctx.fill();
      ctx.beginPath();
      for (let y = 115; y <= 600; y += 8) {
        const x = roadCenter(y) - 103 - (y / 600) * 8;
        if (y === 115) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      for (let y = 600; y >= 115; y -= 8) ctx.lineTo(roadCenter(y) + 103 + (y / 600) * 8, y);
      ctx.closePath();
      const asphalt = ctx.createLinearGradient(0, 115, 360, 600);
      asphalt.addColorStop(0, "#606b73");
      asphalt.addColorStop(1, "#3c4851");
      ctx.fillStyle = asphalt;
      ctx.fill();
      ctx.strokeStyle = "#ffffff75";
      ctx.lineWidth = 3;
      ctx.setLineDash([18, 16]);
      ctx.lineDashOffset = -distance * .35;
      for (const offset of [-34, 34]) {
        ctx.beginPath();
        for (let y = 115; y <= 600; y += 8) {
          const x = roadCenter(y) + offset;
          if (y === 115) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 104, 360, 11);
      ctx.fillStyle = "#e45757";
      for (let x = 0; x < 360; x += 22) ctx.fillRect(x, 104, 11, 11);
      ctx.fillStyle = "#234238";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("INTERLAGOS · SÃO PAULO", 180, 28);
      const lap = Math.min(3, Math.floor(distance / lapLength) + 1);
      const curveNames = ["RETA PRINCIPAL", "CURVA DO SOL", "S DO SENNA", "RETA OPOSTA"];
      ctx.font = "bold 9px sans-serif";
      ctx.fillStyle = "#183e32";
      ctx.fillText(curveNames[Math.floor(distance / 235) % curveNames.length], 180, 45);
      ctx.textAlign = "left";
      ctx.fillStyle = "#ffffffd9";
      ctx.fillRect(10, 10, 79, 43);
      ctx.fillStyle = "#243d34";
      ctx.font = "bold 10px sans-serif";
      ctx.fillText(`VOLTA ${lap}/3`, 18, 27);
      ctx.fillText(`${score} PTS`, 18, 43);
    }

    function drawObjects() {
      hazards.forEach((hazard) => {
        const x = roadCenter(hazard.y) + laneOffsets[hazard.lane] * 51;
        if (hazard.type === "cone") {
          ctx.fillStyle = obstacleColors.cone;
          ctx.beginPath();
          ctx.moveTo(x, hazard.y - 17);
          ctx.lineTo(x - 15, hazard.y + 14);
          ctx.lineTo(x + 15, hazard.y + 14);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "#fff1da";
          ctx.fillRect(x - 9, hazard.y + 3, 18, 4);
        } else {
          ctx.fillStyle = obstacleColors.gate;
          ctx.fillRect(x - 18, hazard.y - 5, 36, 18);
          ctx.fillStyle = "#f5e7ff";
          ctx.fillRect(x - 14, hazard.y - 2, 28, 4);
        }
      });
      items.forEach((item) => {
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(roadCenter(item.y) + laneOffsets[item.lane] * 51, item.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#f5b94c";
        ctx.beginPath();
        ctx.arc(roadCenter(item.y) + laneOffsets[item.lane] * 51, item.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    function render(now) {
      if (ended) return;
      const elapsed = Math.min(.04, Math.max(0, (now - lastFrame) / 1000));
      lastFrame = now || performance.now();
      const progressSpeed = worldSpeed * (1 - speedPenalty);
      distance += progressSpeed * elapsed;
      rivalDistance += (worldSpeed * (.91 + selectedLevel * .025)) * elapsed;
      speedPenalty = Math.max(0, speedPenalty - elapsed * .22);
      if (now - lastSpawn > Math.max(650, 1250 - selectedLevel * 120)) {
        hazards.push({ lane: Math.floor(Math.random() * 3), y: 105, type: Math.random() < .65 ? "cone" : "gate" });
        lastSpawn = now;
      }
      hazards.forEach((hazard) => { hazard.y += progressSpeed * elapsed * .72; });
      for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        item.y -= 420 * elapsed;
        const hitIndex = hazards.findIndex((hazard) => hazard.lane === item.lane && Math.abs(hazard.y - item.y) < 24);
        if (hitIndex >= 0) {
          hazards.splice(hitIndex, 1);
          items.splice(i, 1);
          score += 50;
          status.textContent = "Alvo atingido! O rival vai precisar de outro plano 😎";
        } else if (item.y < 90) items.splice(i, 1);
      }
      for (let i = hazards.length - 1; i >= 0; i--) {
        const hazard = hazards[i];
        if (hazard.y > 620) {
          score += 5;
          hazards.splice(i, 1);
          continue;
        }
        if (hazard.lane === lane && hazard.y > playerY - 24 && hazard.y < playerY + 25) {
          const avoided = hazard.type === "cone" ? now < jumpUntil : now < duckUntil;
          hazards.splice(i, 1);
          if (!avoided) {
            speedPenalty = .52;
            status.textContent = "Ops! Cone na curva. A pista não aceita desculpas 😄";
          } else {
            score += 25;
            status.textContent = "Desvio perfeito! Até o rival anotou a manobra.";
          }
        }
      }
      if (distance >= totalDistance || rivalDistance >= totalDistance) {
        ended = true;
        status.textContent = distance >= rivalDistance ? machineTaunt("racing", "win") : machineTaunt("racing", "lose");
        status.classList.add(distance >= rivalDistance ? "race-win" : "game-over");
      }
      drawTrack();
      drawObjects();
      drawCar(roadCenter(284) + laneOffsets[(lane + 1) % 3] * 51, 282, "#f3a04e");
      drawCar(roadCenter(playerY) + laneOffsets[lane] * 51, playerY, "#e65d5d", true, now < jumpUntil);
      const ratio = Math.min(1, distance / totalDistance);
      ctx.fillStyle = "#ffffffc9";
      ctx.fillRect(10, 566, 340, 8);
      ctx.fillStyle = "#f0b65e";
      ctx.fillRect(10, 566, 340 * ratio, 8);
      if (!ended) frameId = requestAnimationFrame(render);
    }

    function steer(direction) {
      lane = Math.max(0, Math.min(2, lane + direction));
    }
    function jump() {
      jumpUntil = performance.now() + 850;
      status.textContent = "Salto ativado! Agora é que são elas.";
    }
    function duck() {
      duckUntil = performance.now() + 850;
      status.textContent = "Abaixou na hora! Que reflexo de piloto.";
    }
    function throwItem() {
      items.push({ lane, y: playerY - 40 });
      status.textContent = randomChoice(["Item lançado! O rival que se cuide.", "Vai com tudo! Item na pista.", "Presente enviado para o adversário 🎁"]);
    }
    function handleKeyDown(event) {
      if (activeGame?.id !== "racing" || !modal.classList.contains("is-open")) return;
      const key = event.key.toLowerCase();
      if (["arrowleft", "arrowright", "arrowup", "arrowdown", " ", "x", "a", "d", "w", "s"].includes(key)) event.preventDefault();
      if (event.repeat) return;
      keys.add(key);
      if (key === "arrowleft" || key === "a") steer(-1);
      if (key === "arrowright" || key === "d") steer(1);
      if (key === "arrowup" || key === "w") jump();
      if (key === "arrowdown" || key === "s") duck();
      if (key === " " || key === "x") throwItem();
    }
    function handleKeyUp(event) {
      keys.delete(event.key.toLowerCase());
    }
    function handleOrientation(event) {
      if (!Number.isFinite(event.gamma) || Math.abs(event.gamma) < 12) return;
      const now = performance.now();
      if (now < tiltCooldown) return;
      steer(event.gamma > 0 ? 1 : -1);
      tiltCooldown = now + 420;
      status.textContent = event.gamma > 0 ? "Inclinação detectada: direita!" : "Inclinação detectada: esquerda!";
    }
    async function enableTilt() {
      const orientation = window.DeviceOrientationEvent;
      if (!orientation) {
        status.textContent = "Este aparelho não oferece sensor de inclinação. Use ◀ e ▶.";
        return;
      }
      if (typeof orientation.requestPermission === "function") {
        const permission = await orientation.requestPermission();
        if (permission !== "granted") {
          status.textContent = "Sensor não autorizado. Os botões continuam funcionando.";
          return;
        }
      }
      window.addEventListener("deviceorientation", handleOrientation);
      status.textContent = "Inclinação ativada! Vire o celular para pilotar.";
    }

    const leftButton = button("◀", () => steer(-1));
    leftButton.setAttribute("aria-label", "Virar à esquerda");
    leftButton.title = "Esquerda";
    const rightButton = button("▶", () => steer(1));
    rightButton.setAttribute("aria-label", "Virar à direita");
    rightButton.title = "Direita";
    controls.append(leftButton, rightButton, button("⬆ Pular", jump), button("⬇ Abaixar", duck));
    const itemButton = button("🎯", throwItem);
    itemButton.setAttribute("aria-label", "Lançar item");
    itemButton.title = "Lançar item";
    controls.append(itemButton);
    const tiltButton = button("📱 Inclinar", () => {
      enableTilt().catch((error) => {
        status.textContent = `Não foi possível ativar o sensor: ${error.message}`;
      });
    });
    controls.append(tiltButton);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    cleanupGame = () => {
      cancelAnimationFrame(frameId);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("deviceorientation", handleOrientation);
      keys.clear();
    };
    tiltButton.setAttribute("aria-label", "Ativar controle por inclinação do celular");
    instructions.textContent = "PC: ←/→ vira · ↑ pula · ↓ abaixa · Espaço lança item. Celular: inclinação + botões.";
    status.textContent = randomChoice(["Luzes acesas! Mostre seu talento no S do Senna.", "Acelera, piloto! O rival já está de olho.", "Interlagos está pronta. Só falta você!"]);
    frameId = requestAnimationFrame(render);
  });
}
