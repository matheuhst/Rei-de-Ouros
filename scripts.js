const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

let state = null;

const BOT_NAMES = [
  "Arisu",
  "Chishiya",
  "Usagi",
  "Kuina",
  "Niragi",
  "Ann",
  "Tatta",
  "Mira",
  "Aguni",
  "Hikari",
  "Ryo",
  "Kaito",
  "Ren",
  "Sora",
  "Yuna",
  "Akira",
  "Hana",
  "Kenji",
  "Mika",
  "Riku"
];

document.addEventListener("DOMContentLoaded", () => {
  const gameMode = $("#gameMode");
  const startBtn = $("#startBtn");
  const guessForm = $("#guessForm");
  const resetBtn = $("#resetBtn");
  const playAgainBtn = $("#playAgainBtn");

  if (gameMode) {
    gameMode.addEventListener("change", updateModeView);
  }

  if (startBtn) {
    startBtn.addEventListener("click", startGame);
  }

  if (guessForm) {
    guessForm.addEventListener("submit", submitChoice);
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", resetGame);
  }

  if (playAgainBtn) {
    playAgainBtn.addEventListener("click", resetGame);
  }

  updateModeView();
});

function updateModeView() {
  const mode = $("#gameMode").value;
  const localPlayersBox = $("#localPlayersBox");

  if (mode === "local") {
    localPlayersBox.classList.remove("hidden");
  } else {
    localPlayersBox.classList.add("hidden");
  }
}

function startGame() {
  const mode = $("#gameMode").value;
  const difficulty = $("#difficulty").value;

  state = {
    mode,
    difficulty,
    round: 1,
    players: createPlayers(mode),
    choices: {},
    history: [],
    locked: false,
    status: "playing"
  };

  $("#setup").classList.add("hidden");
  $("#game").classList.remove("hidden");
  $("#endModal").classList.add("hidden");
  $("#resultBox").classList.add("hidden");
  $("#calculationBox").classList.add("hidden");

  startRound();
}

function createPlayers(mode) {
  if (mode === "solo") {
    const mainName = sanitizeName($("#mainPlayerName").value) || "Jogador";
    const botNames = getRandomBotNames(4);

    return [
      {
        id: "player-1",
        name: mainName,
        type: "human",
        main: true,
        points: 0,
        eliminated: false
      },
      ...botNames.map((name, index) => ({
        id: `bot-${index + 1}`,
        name,
        type: "bot",
        main: false,
        points: 0,
        eliminated: false,
        strategy: getBotStrategy(index)
      }))
    ];
  }

  const localInputs = $$(".local-name");

  return Array.from({ length: 5 }).map((_, index) => {
    const typedName = sanitizeName(localInputs[index]?.value);
    const fallback = `Jogador ${index + 1}`;

    return {
      id: `player-${index + 1}`,
      name: typedName || fallback,
      type: "human",
      main: index === 0,
      points: 0,
      eliminated: false
    };
  });
}

function getRandomBotNames(quantity) {
  const shuffled = [...BOT_NAMES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, quantity);
}

function getBotStrategy(index) {
  const strategies = ["adaptive", "hunter", "low", "random"];
  return strategies[index % strategies.length];
}

function sanitizeName(value) {
  return String(value || "")
    .replace(/mestre/gi, "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, 18);
}

function getFullName(player) {
  return `Mestre ${player.name}`;
}

function startRound() {
  if (!state || state.status !== "playing") return;

  state.choices = {};
  state.locked = false;

  $("#resultBox").classList.add("hidden");
  $("#calculationBox").classList.add("hidden");
  $("#playerNumber").disabled = false;
  $("#submitChoiceBtn").disabled = false;
  $("#playerNumber").value = "";

  const nextHuman = getNextHumanPlayer();

  if (nextHuman) {
    showPlayerTurn(nextHuman);
  } else {
    finishRound();
  }

  updateInterface();
}

function getNextHumanPlayer() {
  return state.players.find((player) => {
    const isHuman = player.type === "human";
    const isAlive = !player.eliminated;
    const hasNotChosen = state.choices[player.id] === undefined;

    return isHuman && isAlive && hasNotChosen;
  });
}

function showPlayerTurn(player) {
  $("#currentPlayerName").textContent = getFullName(player);

  if (state.mode === "solo") {
    $("#turnDescription").textContent =
      "Sua vez. Escolha um número de 0 a 100. Depois, os outros Mestres farão suas escolhas.";
  } else {
    $("#turnDescription").textContent =
      "Passe o computador para este jogador. Ele deve escolher um número de 0 a 100 sem mostrar aos outros.";
  }

  $("#playerNumber").value = "";
  $("#message").textContent = "Aguardando escolha...";
  $("#playerNumber").focus();

  updateInterface();
}

async function submitChoice(event) {
  event.preventDefault();

  if (!state || state.status !== "playing" || state.locked) return;

  const currentPlayer = getNextHumanPlayer();

  if (!currentPlayer) return;

  const number = Number($("#playerNumber").value);

  if (!Number.isFinite(number) || number < 0 || number > 100) {
    $("#message").textContent = "Digite um número válido entre 0 e 100.";
    return;
  }

  state.choices[currentPlayer.id] = Math.round(number);

  $("#message").textContent = `Escolha de ${getFullName(currentPlayer)} registrada.`;

  const nextHuman = getNextHumanPlayer();

  if (nextHuman) {
    $("#playerNumber").disabled = true;
    $("#submitChoiceBtn").disabled = true;

    await sleep(600);

    $("#playerNumber").disabled = false;
    $("#submitChoiceBtn").disabled = false;

    showPlayerTurn(nextHuman);
    return;
  }

  finishRound();
}

async function finishRound() {
  if (!state || state.locked) return;

  state.locked = true;

  $("#playerNumber").disabled = true;
  $("#submitChoiceBtn").disabled = true;
  $("#message").textContent = "Todos escolheram. O sistema vai calcular lentamente.";

  generateBotChoices();

  const result = calculateResult();

  await animateCalculation(result);

  applyPenalties(result);

  state.history.push(result);

  showRoundResult(result);
  updateInterface();

  const ended = checkEndGame();

  if (!ended) {
    state.round++;

    await sleep(2300);

    if (state && state.status === "playing") {
      startRound();
    }
  }
}

function generateBotChoices() {
  const activeBots = state.players.filter((player) => {
    return player.type === "bot" && !player.eliminated;
  });

  activeBots.forEach((bot) => {
    state.choices[bot.id] = chooseBotNumber(bot);
  });
}

function chooseBotNumber(bot) {
  const lastRound = state.history[state.history.length - 1];

  const difficultyNoise = {
    easy: 24,
    normal: 14,
    hard: 7
  };

  const noise = difficultyNoise[state.difficulty] || 14;

  let number;

  if (!lastRound) {
    number = 40 + randomBetween(-15, 15);
  } else {
    const previousRequired = lastRound.requiredNumber;
    const mainPlayerPreviousChoice =
      lastRound.choices["player-1"] !== undefined
        ? lastRound.choices["player-1"]
        : previousRequired;

    switch (bot.strategy) {
      case "adaptive":
        number = previousRequired + randomBetween(-noise, noise);
        break;

      case "hunter":
        number = previousRequired * 0.9 + randomBetween(-noise / 2, noise / 2);
        break;

      case "low":
        number = previousRequired * 0.72 + randomBetween(-noise, noise);
        break;

      case "random":
        number = randomBetween(0, 100);
        break;

      default:
        number = previousRequired + randomBetween(-noise, noise);
        break;
    }

    if (state.difficulty === "hard") {
      number = number * 0.82 + mainPlayerPreviousChoice * 0.18;
    }
  }

  return clamp(Math.round(number), 0, 100);
}

function calculateResult() {
  const activePlayers = getActivePlayers();

  const numbers = activePlayers.map((player) => state.choices[player.id]);

  const average =
    numbers.reduce((total, current) => total + current, 0) / numbers.length;

  const requiredNumber = average * 0.8;

  const distances = {};

  activePlayers.forEach((player) => {
    distances[player.id] = Math.abs(state.choices[player.id] - requiredNumber);
  });

  const smallestDistance = Math.min(
    ...activePlayers.map((player) => distances[player.id])
  );

  const winners = activePlayers.filter((player) => {
    return Math.abs(distances[player.id] - smallestDistance) < 0.0001;
  });

  const winnerIds = new Set(winners.map((player) => player.id));

  const penalties = activePlayers.map((player) => ({
    playerId: player.id,
    pointsLost: winnerIds.has(player.id) ? 0 : 1
  }));

  return {
    round: state.round,
    choices: { ...state.choices },
    average,
    requiredNumber,
    distances,
    winners,
    winnerIds,
    penalties
  };
}

async function animateCalculation(result) {
  const calculationBox = $("#calculationBox");
  const calcFront = $("#calcFront");
  const calcBack = $("#calcBack");

  calculationBox.classList.remove("hidden");
  calcFront.classList.remove("hidden");
  calcBack.classList.add("hidden");

  $("#calculationTitle").textContent = "Iniciando cálculo";
  $("#calcLine").textContent = "Todas as escolhas foram registradas";
  $("#calcNumber").textContent = "--";

  await sleep(900);

  const playersInRound = getPlayersFromResult(result);

  for (const player of playersInRound) {
    $("#calculationTitle").textContent = "Revelando escolhas";
    $("#calcLine").textContent = getFullName(player);
    $("#calcNumber").textContent = result.choices[player.id];

    await sleep(700);
  }

  $("#calculationTitle").textContent = "Calculando";
  $("#calcLine").textContent = "Média dos números escolhidos";

  await animateNumber("#calcNumber", result.average, 1500);

  await sleep(800);

  $("#calculationTitle").textContent = "Aplicando regra dos 80%";
  $("#calcLine").textContent = "Convertendo a média no número final";

  await animateNumber("#calcNumber", result.requiredNumber, 1600);

  await sleep(650);

  calcFront.classList.add("hidden");
  calcBack.classList.remove("hidden");

  $("#requiredNumber").textContent = result.requiredNumber.toFixed(2);

  await sleep(1400);
}

async function animateNumber(selector, finalValue, duration) {
  const element = $(selector);
  const steps = 45;
  const interval = duration / steps;

  for (let step = 1; step <= steps; step++) {
    const progress = step / steps;
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = finalValue * eased;

    element.textContent = value.toFixed(2);

    await sleep(interval);
  }

  element.textContent = finalValue.toFixed(2);
}

function applyPenalties(result) {
  result.penalties.forEach((penalty) => {
    const player = state.players.find((item) => item.id === penalty.playerId);

    if (!player) return;

    player.points -= penalty.pointsLost;

    if (player.points <= -10) {
      player.points = -10;
      player.eliminated = true;
    }
  });
}

function showRoundResult(result) {
  $("#resultBox").classList.remove("hidden");

  const winnerNames = result.winners.map(getFullName).join(", ");

  $("#roundWinner").textContent = `Vencedor: ${winnerNames}`;
  $("#finalRequiredNumber").textContent = result.requiredNumber.toFixed(2);

  const tbody = $("#roundDetails");
  tbody.innerHTML = "";

  const playersInRound = getPlayersFromResult(result);

  playersInRound.forEach((player) => {
    const choice = result.choices[player.id];
    const distance = result.distances[player.id];
    const won = result.winnerIds.has(player.id);

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td class="${player.main ? "main-name" : ""}">
        ${escapeHtml(getFullName(player))}
      </td>
      <td>${choice}</td>
      <td>${distance.toFixed(2)}</td>
      <td>
        ${
          won
            ? `<span class="badge win">Venceu</span>`
            : `<span class="badge lose">Perdeu 1 ponto</span>`
        }
      </td>
    `;

    tbody.appendChild(tr);
  });

  $("#message").textContent =
    `Número que precisava alcançar: ${result.requiredNumber.toFixed(2)}.`;
}

function updateInterface() {
  if (!state) return;

  $("#roundNumber").textContent = state.round;
  $("#activePlayers").textContent = getActivePlayers().length;

  renderPlayers();
  renderHistory();
}

function renderPlayers() {
  const container = $("#playersStrip");
  container.innerHTML = "";

  const currentPlayer = getNextHumanPlayer();

  state.players.forEach((player) => {
    const card = document.createElement("div");

    card.className = "player-card";

    if (player.main) {
      card.classList.add("main-player");
    }

    if (player.eliminated) {
      card.classList.add("eliminated");
    }

    if (currentPlayer && currentPlayer.id === player.id) {
      card.classList.add("current");
    }

    const playerType = player.type === "bot" ? "Bot" : "Jogador real";
    const pointsClass = player.points <= -7 ? "danger" : "";
    const statusText = player.eliminated ? "Eliminado" : "Ativo";
    const statusClass = player.eliminated ? "dead" : "";

    card.innerHTML = `
      <div class="player-name">${escapeHtml(getFullName(player))}</div>
      <div class="player-type">${playerType}</div>
      <div class="points ${pointsClass}">${player.points}</div>
      <div class="status-pill ${statusClass}">${statusText}</div>
    `;

    container.appendChild(card);
  });
}

function renderHistory() {
  const historyList = $("#historyList");
  historyList.innerHTML = "";

  if (!state.history.length) {
    historyList.innerHTML = `<p class="empty">Nenhuma rodada jogada ainda.</p>`;
    return;
  }

  [...state.history].reverse().forEach((round) => {
    const winners = round.winners.map(getFullName).join(", ");

    const item = document.createElement("div");
    item.className = "history-item";

    item.innerHTML = `
      <strong>Rodada ${round.round}</strong>
      <p>
        Número necessário: ${round.requiredNumber.toFixed(2)}
        | Vencedor: ${escapeHtml(winners)}
      </p>
    `;

    historyList.appendChild(item);
  });
}

function checkEndGame() {
  const activePlayers = getActivePlayers();
  const mainPlayer = state.players.find((player) => player.main);

  if (state.mode === "solo" && mainPlayer.eliminated) {
    endGame(
      "Você foi eliminado",
      `${getFullName(mainPlayer)} chegou a -10 pontos.`
    );

    return true;
  }

  if (activePlayers.length === 1) {
    const winner = activePlayers[0];

    endGame(
      `${getFullName(winner)} venceu`,
      "Todos os outros jogadores chegaram a -10 pontos."
    );

    return true;
  }

  if (activePlayers.length === 0) {
    endGame(
      "Todos foram eliminados",
      "Nenhum jogador continuou ativo na partida."
    );

    return true;
  }

  return false;
}

function endGame(title, text) {
  state.status = "ended";

  $("#endTitle").textContent = title;
  $("#endText").textContent = text;
  $("#endModal").classList.remove("hidden");
}

function resetGame() {
  state = null;

  $("#setup").classList.remove("hidden");
  $("#game").classList.add("hidden");
  $("#endModal").classList.add("hidden");
  $("#resultBox").classList.add("hidden");
  $("#calculationBox").classList.add("hidden");

  $("#playerNumber").value = "";
  $("#message").textContent = "";
}

function getPlayersFromResult(result) {
  return state.players.filter((player) => {
    return result.choices[player.id] !== undefined;
  });
}

function getActivePlayers() {
  return state.players.filter((player) => !player.eliminated);
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}