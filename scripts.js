const $ = (selector) => document.querySelector(selector);

let state = null;

const botNames = [
  "Jogador 01",
  "Jogador 02",
  "Jogador 03",
  "Jogador 04",
  "Jogador 05"
];

const botStrategies = [
  "adaptive",
  "conservative",
  "chaotic",
  "mirror",
  "hunter"
];

document.addEventListener("DOMContentLoaded", () => {
  $("#startBtn").addEventListener("click", startGame);
  $("#guessForm").addEventListener("submit", handleRoundSubmit);
  $("#resetBtn").addEventListener("click", resetGame);
  $("#playAgainBtn").addEventListener("click", resetGame);
});

function startGame() {
  const playerName = $("#playerName").value.trim() || "Você";
  const botCount = Number($("#botCount").value);
  const difficulty = $("#difficulty").value;

  state = {
    round: 1,
    factor: 0.8,
    maxLives: 5,
    maxRounds: 25,
    difficulty,
    status: "playing",
    players: [
      {
        id: "human",
        name: playerName,
        isHuman: true,
        lives: 5,
        wins: 0,
        eliminated: false
      },
      ...createBots(botCount)
    ],
    history: []
  };

  $("#setup").classList.add("hidden");
  $("#game").classList.remove("hidden");
  $("#endModal").classList.add("hidden");

  setMessage("Digite um número entre 0 e 100 para começar.");
  updateUI();
  $("#playerNumber").focus();
}

function createBots(count) {
  const bots = [];

  for (let i = 0; i < count; i++) {
    bots.push({
      id: `bot-${i + 1}`,
      name: botNames[i],
      isHuman: false,
      lives: 5,
      wins: 0,
      eliminated: false,
      strategy: botStrategies[i]
    });
  }

  return bots;
}

function handleRoundSubmit(event) {
  event.preventDefault();

  if (!state || state.status !== "playing") return;

  const numberInput = $("#playerNumber");
  const humanNumber = Number(numberInput.value);

  if (!Number.isFinite(humanNumber) || humanNumber < 0 || humanNumber > 100) {
    setMessage("Escolha um número válido entre 0 e 100.");
    return;
  }

  const result = playRound(Math.round(humanNumber));

  renderRoundResult(result);
  checkGameEnd();

  if (state.status === "playing") {
    state.round++;
    numberInput.value = "";
    numberInput.focus();
  }

  updateUI();
}

function playRound(humanNumber) {
  const activePlayers = getActivePlayers();
  const choices = {};
  const usedByBots = new Set();

  choices.human = humanNumber;

  activePlayers.forEach((player) => {
    if (!player.isHuman) {
      const choice = getBotChoice(player, usedByBots);
      choices[player.id] = choice;
      usedByBots.add(choice);
    }
  });

  const numbers = activePlayers.map((player) => choices[player.id]);
  const average = numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
  const target = average * state.factor;

  const duplicateRuleActive = state.round >= 4;
  const duplicateNumbers = duplicateRuleActive ? getDuplicateNumbers(activePlayers, choices) : [];
  const invalidPlayerIds = new Set();

  if (duplicateRuleActive) {
    activePlayers.forEach((player) => {
      if (duplicateNumbers.includes(choices[player.id])) {
        invalidPlayerIds.add(player.id);
      }
    });
  }

  let validPlayers = activePlayers.filter((player) => !invalidPlayerIds.has(player.id));

  if (validPlayers.length === 0) {
    validPlayers = [...activePlayers];
    invalidPlayerIds.clear();
  }

  const distances = {};

  activePlayers.forEach((player) => {
    distances[player.id] = Math.abs(choices[player.id] - target);
  });

  const bestDistance = Math.min(
    ...validPlayers.map((player) => distances[player.id])
  );

  const winners = validPlayers.filter(
    (player) => Math.abs(distances[player.id] - bestDistance) < 0.0001
  );

  const winnerIds = new Set(winners.map((player) => player.id));
  const penalties = [];

  activePlayers.forEach((player) => {
    let lostLives = 0;

    if (!winnerIds.has(player.id)) {
      player.lives -= 1;
      lostLives += 1;
    }

    if (invalidPlayerIds.has(player.id)) {
      player.lives -= 1;
      lostLives += 1;
    }

    if (winnerIds.has(player.id)) {
      player.wins += 1;
    }

    if (player.lives <= 0) {
      player.lives = 0;
      player.eliminated = true;
    }

    penalties.push({
      playerId: player.id,
      lostLives
    });
  });

  const result = {
    round: state.round,
    average,
    target,
    choices,
    distances,
    winners,
    winnerIds,
    duplicateRuleActive,
    duplicateNumbers,
    invalidPlayerIds,
    penalties
  };

  state.history.push(result);

  return result;
}

function getBotChoice(bot, usedByBots) {
  const lastRound = state.history[state.history.length - 1];
  const difficultyNoise = {
    easy: 22,
    normal: 13,
    hard: 7
  };

  const noise = difficultyNoise[state.difficulty] || 13;
  let base;

  if (!lastRound) {
    base = 40 + randomBetween(-10, 10);
  } else {
    const lastTarget = lastRound.target;
    const lastAverage = lastRound.average;
    const humanLastChoice = lastRound.choices.human ?? 50;

    switch (bot.strategy) {
      case "adaptive":
        base = lastTarget + randomBetween(-noise, noise);
        break;

      case "conservative":
        base = lastAverage * 0.72 + randomBetween(-noise, noise);
        break;

      case "chaotic":
        base = randomBetween(0, 100);
        break;

      case "mirror":
        base = humanLastChoice * 0.8 + randomBetween(-noise, noise);
        break;

      case "hunter":
        base = lastTarget * 0.88 + randomBetween(-noise / 2, noise / 2);
        break;

      default:
        base = 40 + randomBetween(-noise, noise);
    }
  }

  let choice = clamp(Math.round(base), 0, 100);

  if (state.difficulty === "hard" && state.round >= 4) {
    let attempts = 0;

    while (usedByBots.has(choice) && attempts < 20) {
      choice = clamp(choice + randomSign() * randomBetween(1, 5), 0, 100);
      choice = Math.round(choice);
      attempts++;
    }
  }

  return choice;
}

function getDuplicateNumbers(players, choices) {
  const count = {};

  players.forEach((player) => {
    const value = choices[player.id];
    count[value] = (count[value] || 0) + 1;
  });

  return Object.keys(count)
    .filter((number) => count[number] > 1)
    .map(Number);
}

function checkGameEnd() {
  const human = state.players.find((player) => player.id === "human");
  const activePlayers = getActivePlayers();

  if (human.eliminated) {
    endGame(
      "Você foi eliminado",
      "Suas vidas chegaram a zero. O jogo terminou para você."
    );
    return;
  }

  if (activePlayers.length === 1) {
    const champion = activePlayers[0];

    if (champion.id === "human") {
      endGame(
        "Você venceu",
        "Todos os outros jogadores foram eliminados. Você sobreviveu ao Concurso de Beleza."
      );
    } else {
      endGame(
        `${champion.name} venceu`,
        "Restou apenas um jogador ativo na partida."
      );
    }

    return;
  }

  if (state.round >= state.maxRounds) {
    const ranking = [...state.players].sort((a, b) => {
      if (b.lives !== a.lives) return b.lives - a.lives;
      return b.wins - a.wins;
    });

    const champion = ranking[0];

    if (champion.id === "human") {
      endGame(
        "Você venceu por pontuação",
        "O limite de rodadas foi atingido e você terminou no topo do placar."
      );
    } else {
      endGame(
        `${champion.name} venceu por pontuação`,
        "O limite de rodadas foi atingido. O vencedor foi definido por vidas e vitórias."
      );
    }
  }
}

function endGame(title, text) {
  state.status = "ended";

  $("#endTitle").textContent = title;
  $("#endText").textContent = text;
  $("#endModal").classList.remove("hidden");
}

function updateUI() {
  if (!state) return;

  $("#roundNumber").textContent = state.round;
  $("#activePlayers").textContent = getActivePlayers().length;

  renderScoreboard();
  renderHistory();
}

function renderScoreboard() {
  const tbody = $("#scoreboard");
  tbody.innerHTML = "";

  state.players.forEach((player) => {
    const tr = document.createElement("tr");

    const statusBadge = player.eliminated
      ? `<span class="badge ng">Eliminado</span>`
      : player.isHuman
        ? `<span class="badge ok">Você</span>`
        : `<span class="badge info">Ativo</span>`;

    tr.innerHTML = `
      <td>${escapeHtml(player.name)}</td>
      <td>${"●".repeat(player.lives)}${"○".repeat(state.maxLives - player.lives)}</td>
      <td>${player.wins}</td>
      <td>${statusBadge}</td>
    `;

    tbody.appendChild(tr);
  });
}

function renderRoundResult(result) {
  $("#resultCard").classList.remove("hidden");

  $("#averageValue").textContent = result.average.toFixed(2);
  $("#targetValue").textContent = result.target.toFixed(2);
  $("#winnerValue").textContent = result.winners
    .map((player) => player.name)
    .join(", ");

  const tbody = $("#roundDetails");
  tbody.innerHTML = "";

  const activePlayersInRound = state.players.filter((player) => {
    return Object.prototype.hasOwnProperty.call(result.choices, player.id);
  });

  activePlayersInRound.forEach((player) => {
    const choice = result.choices[player.id];
    const distance = result.distances[player.id];
    const isWinner = result.winnerIds.has(player.id);
    const wasInvalid = result.invalidPlayerIds.has(player.id);
    const penalty = result.penalties.find((item) => item.playerId === player.id);
    const lostLives = penalty ? penalty.lostLives : 0;

    let badge;

    if (isWinner) {
      badge = `<span class="badge ok">Venceu</span>`;
    } else if (wasInvalid) {
      badge = `<span class="badge warn">Número repetido | -${lostLives}</span>`;
    } else {
      badge = `<span class="badge ng">Perdeu | -${lostLives}</span>`;
    }

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${escapeHtml(player.name)}</td>
      <td>${choice}</td>
      <td>${distance.toFixed(2)}</td>
      <td>${badge}</td>
    `;

    tbody.appendChild(tr);
  });

  if (result.duplicateRuleActive && result.duplicateNumbers.length > 0) {
    setMessage(
      `Regra especial ativa: números repetidos anulados: ${result.duplicateNumbers.join(", ")}.`
    );
  } else if (result.duplicateRuleActive) {
    setMessage("Regra especial ativa: nenhum número repetido nesta rodada.");
  } else {
    setMessage("Rodada concluída.");
  }
}

function renderHistory() {
  const historyList = $("#historyList");
  historyList.innerHTML = "";

  if (state.history.length === 0) {
    historyList.innerHTML = `<p class="empty">Nenhuma rodada jogada ainda.</p>`;
    return;
  }

  [...state.history].reverse().forEach((item) => {
    const div = document.createElement("div");
    div.className = "history-item";

    const winners = item.winners.map((player) => player.name).join(", ");

    div.innerHTML = `
      <strong>Rodada ${item.round}</strong>
      <p>
        Média: ${item.average.toFixed(2)} |
        Alvo: ${item.target.toFixed(2)} |
        Vencedor: ${escapeHtml(winners)}
      </p>
    `;

    historyList.appendChild(div);
  });
}

function resetGame() {
  state = null;

  $("#setup").classList.remove("hidden");
  $("#game").classList.add("hidden");
  $("#endModal").classList.add("hidden");
  $("#resultCard").classList.add("hidden");
  $("#playerNumber").value = "";
  $("#message").textContent = "";
}

function getActivePlayers() {
  return state.players.filter((player) => !player.eliminated);
}

function setMessage(text) {
  $("#message").textContent = text;
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function randomSign() {
  return Math.random() >= 0.5 ? 1 : -1;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}