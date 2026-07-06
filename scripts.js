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
  const playAgainBtn = $("#playAgainBtn");
  const playerNumberInput = $("#playerNumber");
  const numberGrid = $("#numberGrid");
  const nextRoundBtn = $("#nextRoundBtn");
  const themeToggleBtn = $("#themeToggleBtn");
  const rulesBtn = $("#rulesBtn");
  const closeRulesBtn = $("#closeRulesBtn");
  const rulesModal = $("#rulesModal");

  if (gameMode) gameMode.addEventListener("change", updateModeView);
  if (startBtn) startBtn.addEventListener("click", startGame);
  if (playAgainBtn) playAgainBtn.addEventListener("click", resetGame);
  if (nextRoundBtn) nextRoundBtn.addEventListener("click", goToNextRound);
  if (numberGrid) numberGrid.addEventListener("click", handleNumberGridClick);
  if (themeToggleBtn) themeToggleBtn.addEventListener("click", toggleTheme);
  if (rulesBtn) rulesBtn.addEventListener("click", openRulesModal);
  if (closeRulesBtn) closeRulesBtn.addEventListener("click", closeRulesModal);
  if (rulesModal) {
    rulesModal.addEventListener("click", (event) => {
      if (event.target.matches("[data-close-rules]")) {
        closeRulesModal();
      }
    });

function openRulesModal() {
  const modal = $("#rulesModal");

  if (!modal) return;

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");

  const closeButton = $("#closeRulesBtn");
  if (closeButton) closeButton.focus();
}

function closeRulesModal() {
  const modal = $("#rulesModal");

  if (!modal || modal.classList.contains("hidden")) return;

  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}


  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeRulesModal();
    }
  });

  applySavedTheme();
  buildNumberGrid();
  updateModeView();
});

function applySavedTheme() {
  const savedTheme = localStorage.getItem("concursoBelezaTheme") || "light";
  const isDark = savedTheme === "dark";

  document.body.classList.toggle("theme-dark", isDark);
  updateThemeButton(isDark);
}

function toggleTheme() {
  const isDark = !document.body.classList.contains("theme-dark");

  document.body.classList.toggle("theme-dark", isDark);
  localStorage.setItem("concursoBelezaTheme", isDark ? "dark" : "light");
  updateThemeButton(isDark);
}

function updateThemeButton(isDark) {
  const button = $("#themeToggleBtn");

  if (!button) return;

  button.textContent = isDark ? "Modo claro" : "Modo dark";
  button.setAttribute("aria-pressed", String(isDark));
}



function buildNumberGrid() {
  const grid = $("#numberGrid");
  if (!grid) return;

  grid.innerHTML = "";

  for (let number = 0; number <= 100; number++) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "number-cell";
    button.dataset.number = String(number);
    button.textContent = String(number);

    if (number === 100) button.classList.add("number-cell-100");

    grid.appendChild(button);
  }
}

function handleNumberGridClick(event) {
  const button = event.target.closest(".number-cell");
  if (!button || button.disabled) return;

  submitNumberChoice(Number(button.dataset.number));
}

function setNumberGridDisabled(disabled) {
  $$(".number-cell").forEach((button) => {
    button.disabled = disabled;
  });
}


function sanitizeNumberInput(event) {
  const value = event.target.value;

  if (value === "") return;

  if (!/^\d+$/.test(value)) {
    event.target.value = "";
  }
}

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
  state = {
    mode,
    round: 1,
    players: createPlayers(mode),
    choices: {},
    history: [],
    locked: false,
    pendingNextRound: false,
    rulesShown: {
      duplicate: false,
      exact: false,
      finalDuel: false
    },
    status: "playing"
  };

  $("#setup").classList.add("hidden");
  $("#game").classList.remove("hidden");
  $("#endModal").classList.add("hidden");
  $("#nextRoundBtn").classList.add("hidden");
  updateActiveRulesPanel();

  startRound();
}

function createPlayers(mode) {
  if (mode === "solo") {
    const mainName = sanitizeName($("#mainPlayerName").value) || "Jogador";
    const botNames = getRandomBotNames(4);

    return [
      createPlayer("player-1", mainName, "human", true),
      ...botNames.map((name, index) => ({
        ...createPlayer(`bot-${index + 1}`, name, "bot", false),
        strategy: getRandomBotStrategy(index)
      }))
    ];
  }

  const localInputs = $$(".local-name");

  return Array.from({ length: 5 }).map((_, index) => {
    const typedName = sanitizeName(localInputs[index]?.value);
    return createPlayer(`player-${index + 1}`, typedName || `Jogador ${index + 1}`, "human", index === 0);
  });
}

function createPlayer(id, name, type, main) {
  return {
    id,
    name,
    type,
    main,
    points: 0,
    eliminated: false
  };
}

function getRandomBotNames(quantity) {
  const shuffled = [...BOT_NAMES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, quantity);
}

function getRandomBotStrategy(index) {
  const strategies = [
    {
      id: "chaotic",
      min: 0,
      max: 100
    },
    {
      id: "balanced",
      min: 35,
      max: 45
    },
    {
      id: "low",
      min: 20,
      max: 30
    },
    {
      id: "precise",
      min: 10,
      max: 20
    }
  ];

  return strategies[Math.floor(Math.random() * strategies.length)];
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

  $("#arenaBoard").classList.add("hidden");
  $("#choicePanel").classList.remove("hidden");
  $("#nextRoundBtn").classList.add("hidden");
  state.pendingNextRound = false;
  updateActiveRulesPanel();
  setMathLine("", "", true);

  const input = $("#playerNumber");

  input.value = "";
  setNumberGridDisabled(false);

  const nextHuman = getNextHumanPlayer();

  if (nextHuman) {
    showPlayerTurn(nextHuman);
    return;
  }

  finishRound();
}

function getNextHumanPlayer() {
  return state.players.find((player) => {
    return player.type === "human" && !player.eliminated && state.choices[player.id] === undefined;
  });
}

function showPlayerTurn(player) {
  $("#roundMeta").textContent = `Rodada ${state.round}`;
  $("#currentPlayerName").textContent = getFullName(player);

  if (state.mode === "solo") {
    $("#turnDescription").textContent = "Digite um número de 0 a 100.";
  } else {
    $("#turnDescription").textContent = "Digite um número sem mostrar aos outros jogadores.";
  }

  $("#message").textContent = "";
  $("#playerNumber").focus();
}

async function submitNumberChoice(number) {
  if (!state || state.status !== "playing" || state.locked) return;

  const currentPlayer = getNextHumanPlayer();
  if (!currentPlayer) return;

  if (!Number.isInteger(number) || number < 0 || number > 100) {
    $("#message").textContent = "Escolha um número inteiro entre 0 e 100.";
    return;
  }

  state.choices[currentPlayer.id] = number;
  $("#playerNumber").value = String(number);
  $("#message").textContent = `${getFullName(currentPlayer)} escolheu ${number}.`;
  setNumberGridDisabled(true);

  const nextHuman = getNextHumanPlayer();

  if (nextHuman) {
    await sleep(850);
    setNumberGridDisabled(false);
    showPlayerTurn(nextHuman);
    return;
  }

  await sleep(850);
  finishRound();
}

async function finishRound() {
  if (!state || state.locked) return;

  state.locked = true;

  setNumberGridDisabled(true);
  $("#message").textContent = "";

  generateBotChoices();

  const result = calculateResult();
  await runRoundAnimation(result);

  state.history.push(result);

  const ended = checkEndGame();

  if (!ended) {
    state.pendingNextRound = true;
    $("#nextRoundBtn").classList.remove("hidden");
  }
}

function generateBotChoices() {
  const activeBots = state.players.filter((player) => player.type === "bot" && !player.eliminated);

  activeBots.forEach((bot) => {
    state.choices[bot.id] = chooseBotNumber(bot);
  });
}

function chooseBotNumber(bot) {
  const activeCount = getActivePlayers().length;

  if (activeCount <= 2) {
    const finalDuelChoices = [
      () => 0,
      () => 100,
      () => 1
    ];

    return finalDuelChoices[Math.floor(Math.random() * finalDuelChoices.length)]();
  }

  const strategy = bot.strategy || getRandomBotStrategy();

  return randomInteger(strategy.min, strategy.max);
}


function randomInteger(min, max) {
  const roundedMin = Math.ceil(min);
  const roundedMax = Math.floor(max);

  return Math.floor(Math.random() * (roundedMax - roundedMin + 1)) + roundedMin;
}

function calculateResult() {
  const activePlayers = getActivePlayers();
  const rules = getActiveRules(activePlayers.length);
  const choices = { ...state.choices };
  const numbers = activePlayers.map((player) => choices[player.id]);
  const total = numbers.reduce((sum, number) => sum + number, 0);
  const average = total / numbers.length;
  const requiredNumber = average * 0.8;

  const distances = {};

  activePlayers.forEach((player) => {
    distances[player.id] = Math.abs(choices[player.id] - requiredNumber);
  });

  const duplicateNumbers = getDuplicateNumbers(activePlayers, choices);
  const invalidDuplicateIds = new Set();

  if (rules.duplicate) {
    activePlayers.forEach((player) => {
      if (duplicateNumbers.has(choices[player.id])) {
        invalidDuplicateIds.add(player.id);
      }
    });
  }

  const specialDuel = getFinalDuelResult(activePlayers, choices, rules);
  let winners = [];
  let exactWinnerIds = new Set();
  let exactRuleTriggered = false;
  let finalDuelTriggered = false;

  if (specialDuel.triggered) {
    winners = specialDuel.winners;
    finalDuelTriggered = true;
    invalidDuplicateIds.clear();
  } else {
    const validPlayers = activePlayers.filter((player) => !invalidDuplicateIds.has(player.id));

    if (rules.exact) {
      const exactPlayers = validPlayers.filter((player) => {
        return Math.abs(choices[player.id] - requiredNumber) < 0.0001;
      });

      if (exactPlayers.length > 0) {
        winners = exactPlayers;
        exactWinnerIds = new Set(exactPlayers.map((player) => player.id));
        exactRuleTriggered = true;
      }
    }

    if (!winners.length && validPlayers.length) {
      const smallestDistance = Math.min(...validPlayers.map((player) => distances[player.id]));

      winners = validPlayers.filter((player) => {
        return Math.abs(distances[player.id] - smallestDistance) < 0.0001;
      });
    }
  }

  const winnerIds = new Set(winners.map((player) => player.id));
  const multiplier = exactRuleTriggered ? 2 : 1;

  const penalties = activePlayers.map((player) => {
    let pointsLost = 0;
    let reason = "";

    if (!winnerIds.has(player.id)) {
      if (invalidDuplicateIds.has(player.id)) {
        pointsLost = 2 * multiplier;
        reason = exactRuleTriggered ? "Número repetido inválido com penalidade dobrada" : "Número repetido inválido";
      } else {
        pointsLost = 1 * multiplier;
        reason = exactRuleTriggered ? "Penalidade dobrada por acerto exato" : "Perdeu a rodada";
      }
    }

    return {
      playerId: player.id,
      pointsLost,
      reason
    };
  });

  return {
    round: state.round,
    choices,
    total,
    average,
    requiredNumber,
    distances,
    winners,
    winnerIds,
    penalties,
    rules,
    duplicateNumbers,
    invalidDuplicateIds,
    exactWinnerIds,
    exactRuleTriggered,
    finalDuelTriggered,
    finalDuelReason: specialDuel.reason || ""
  };
}

function getActiveRules(activePlayerCount) {
  return {
    duplicate: activePlayerCount <= 4,
    exact: activePlayerCount <= 3,
    finalDuel: activePlayerCount === 2
  };
}

function getDuplicateNumbers(players, choices) {
  const countByNumber = new Map();

  players.forEach((player) => {
    const choice = choices[player.id];
    countByNumber.set(choice, (countByNumber.get(choice) || 0) + 1);
  });

  const duplicateNumbers = new Set();

  countByNumber.forEach((count, number) => {
    if (count >= 2) duplicateNumbers.add(number);
  });

  return duplicateNumbers;
}

function getFinalDuelResult(players, choices, rules) {
  if (!rules.finalDuel || players.length !== 2) {
    return { triggered: false, winners: [], reason: "" };
  }

  const zeroPlayers = players.filter((player) => choices[player.id] === 0);
  const hundredPlayers = players.filter((player) => choices[player.id] === 100);

  if (zeroPlayers.length > 0 && hundredPlayers.length > 0) {
    return {
      triggered: true,
      winners: hundredPlayers,
      reason: "0 contra 100: quem escolheu 100 vence."
    };
  }

  if (zeroPlayers.length === 1) {
    return {
      triggered: true,
      winners: zeroPlayers,
      reason: "0 contra qualquer número diferente de 100: quem escolheu 0 vence."
    };
  }

  return { triggered: false, winners: [], reason: "" };
}

function getNewRuleMessages(rules) {
  const messages = [];

  if (rules.duplicate && !state.rulesShown.duplicate) {
    messages.push({
      key: "duplicate",
      title: "Números repetidos são inválidos",
      description: "Se duas ou mais pessoas escolherem o mesmo número, esse número não conta. Cada jogador repetido perde 2 pontos."
    });
  }

  if (rules.exact && !state.rulesShown.exact) {
    messages.push({
      key: "exact",
      title: "Acerto exato dobra a penalidade",
      description: "Se alguém acertar exatamente o alvo, todos os outros têm a penalidade dobrada. Repetidos passam de -2 para -4."
    });
  }

  if (rules.finalDuel && !state.rulesShown.finalDuel) {
    messages.push({
      key: "finalDuel",
      title: "Duelo final",
      description: "Com 2 jogadores, o 0 decide: 0 perde para 100, mas vence qualquer outro número. O bot final escolhe entre 0, 1 ou 100."
    });
  }

  return messages;
}


async function runRoundAnimation(result) {
  const players = getPlayersFromResult(result);
  const numbers = players.map((player) => result.choices[player.id]);

  $("#choicePanel").classList.add("hidden");
  $("#arenaBoard").classList.remove("hidden");
  $("#nextRoundBtn").classList.add("hidden");
  updateActiveRulesPanel();

  const newRules = getNewRuleMessages(result.rules);

  setPhase("♦ Sistema", `Rodada ${result.round}`, "Os números serão revelados um por um.");
  renderPlayersBoard(result, { showChoices: false, markWinners: false });
  await sleep(650);

  for (const rule of newRules) {
    setPhase("Nova regra", rule.title, rule.description);
    state.rulesShown[rule.key] = true;
    updateActiveRulesPanel();
    setMathLine("Regra adicionada", "!", false);
    await sleep(2600);
    setMathLine("", "", true);
  }

  for (const player of players) {
    revealChoice(player, result.choices[player.id]);
    setPhase("♦ Escolhas", `${getFullName(player)} escolheu ${result.choices[player.id]}`, "");
    await sleep(850);
  }

  if (result.finalDuelTriggered) {
    setPhase("Duelo final", "Regra decisiva", result.finalDuelReason || "A regra final decidiu a rodada.");
    setMathLine("Regra do duelo final", result.winners.some((player) => result.choices[player.id] === 100) ? "100 vence" : "0 vence", false);
    await sleep(1600);

    renderPlayersBoard(result, { showChoices: true, markWinners: true, showInvalid: true });
    const winnersText = result.winners.map(getFullName).join(", ");
    setPhase("♦ Resultado", `${winnersText} venceu`, result.finalDuelReason || "A regra final decidiu a rodada.");
    await sleep(900);

    await animatePenalties(result);

    const activeAfter = getActivePlayers().length;
    updateActiveRulesPanel();
    setPhase("Pontuação", "Rodada concluída", `Analise os números antes de avançar. ${activeAfter} jogador${activeAfter === 1 ? "" : "es"} ainda ativo${activeAfter === 1 ? "" : "s"}.`);
    return;
  }

  setPhase("♦ Cálculo", "Somando as escolhas", "Cada número revelado entra na soma da rodada.");
  setMathLine("", "", false);

  let runningTotal = 0;
  const expressionParts = [];

  for (const player of players) {
    const number = result.choices[player.id];
    runningTotal += number;
    expressionParts.push(number);
    highlightCard(player.id, "summing");
    setMathLine(expressionParts.join(" + "), String(runningTotal), false);
    await sleep(650);
  }

  clearCardClass("summing");
  await sleep(450);

  await moveMathResultIntoNextFormula(`${result.total} ÷ ${numbers.length}`);

  setPhase("Média", "Dividindo pelo número de jogadores", "A soma vira a base da média.");
  setMathLine(`${result.total} ÷ ${numbers.length}`, "0.00", false);
  await animateNumber("#mathResult", result.average, 1200);
  await sleep(650);

  setPhase("Regra", "Aplicando 80% da média", "Os números somem por um instante. Agora vale apenas a média.");
  renderPlayersBoard(result, { showChoices: false, markWinners: false });

  await moveMathResultIntoNextFormula(`${result.average.toFixed(2)} × 0,8`);

  setMathLine(`${result.average.toFixed(2)} × 0,8`, "0.00", false);
  await animateNumber("#mathResult", result.requiredNumber, 1300);
  await sleep(700);

  if (result.invalidDuplicateIds.size > 0) {
    const repeatedText = [...result.duplicateNumbers].join(", ");
    setPhase("Regra ativa", "Número repetido inválido", `Número${result.duplicateNumbers.size === 1 ? "" : "s"} repetido${result.duplicateNumbers.size === 1 ? "" : "s"}: ${repeatedText}. Esses jogadores não podem vencer esta rodada.`);
    renderPlayersBoard(result, { showChoices: true, markWinners: false, showInvalid: true });
    setMathLine("Número inválido", repeatedText, false);
    await sleep(2200);
  }

  if (result.exactRuleTriggered) {
    const exactText = result.winners.map(getFullName).join(", ");
    setPhase("Regra ativa", "Alvo exato atingido", `${exactText} acertou exatamente. A penalidade dos outros jogadores será dobrada.`);
    setMathLine("Acerto exato", result.requiredNumber.toFixed(2), false);
    await sleep(2200);
  }

  setPhase("Comparação", `Alvo: ${result.requiredNumber.toFixed(2)}`, "Os números voltam para você analisar quem ficou mais perto.");
  renderPlayersBoard(result, { showChoices: true, markWinners: false, showInvalid: true });
  setMathLine("Alvo da rodada", result.requiredNumber.toFixed(2), false);
  await sleep(900);

  for (const player of players) {
    highlightCard(player.id, "comparing");
    const invalid = result.invalidDuplicateIds.has(player.id);
    const description = invalid
      ? `${getFullName(player)} escolheu ${result.choices[player.id]}, mas esse número ficou inválido.`
      : `${getFullName(player)} escolheu ${result.choices[player.id]}.`;

    setPhase("Comparação", `Alvo: ${result.requiredNumber.toFixed(2)}`, description);
    await sleep(620);
  }

  clearCardClass("comparing");
  renderPlayersBoard(result, { showChoices: true, markWinners: true, showInvalid: true });

  const winnersText = result.winners.length ? result.winners.map(getFullName).join(", ") : "Ninguém";
  const resultText = result.winners.length ? `${winnersText} venceu` : "Nenhum número válido venceu";
  const penaltyText = result.exactRuleTriggered
    ? "A penalidade foi dobrada pela regra do acerto exato."
    : "Os outros jogadores perdem pontos conforme as regras ativas.";

  setPhase("♦ Resultado", resultText, penaltyText);
  setMathLine("Alvo final", result.requiredNumber.toFixed(2), false);
  await sleep(850);

  await animatePenalties(result);

  const activeAfter = getActivePlayers().length;
  updateActiveRulesPanel();
  setPhase("Pontuação", "Rodada concluída", `Analise os números antes de avançar. ${activeAfter} jogador${activeAfter === 1 ? "" : "es"} ainda ativo${activeAfter === 1 ? "" : "s"}.`);
}


function renderPlayersBoard(result, options = {}) {
  const {
    showChoices = false,
    markWinners = false,
    showInvalid = false
  } = options;

  const board = $("#playersBoard");
  const players = getPlayersFromResult(result);

  board.innerHTML = "";

  players.forEach((player) => {
    const choice = result.choices[player.id];
    const won = result.winnerIds.has(player.id);
    const invalid = showInvalid && result.invalidDuplicateIds && result.invalidDuplicateIds.has(player.id);
    const penalty = result.penalties.find((item) => item.playerId === player.id);

    const card = document.createElement("article");
    card.className = "player-card";
    card.dataset.playerId = player.id;

    if (player.main) card.classList.add("main-player");
    if (player.eliminated) card.classList.add("eliminated");
    if (invalid) card.classList.add("invalid-choice");

    if (markWinners) {
      card.classList.add(won ? "winner" : "loser");
    }

    let statusText = player.eliminated ? "Eliminado" : "Ativo";
    let statusClass = player.eliminated ? "dead" : "";

    if (markWinners) {
      if (won) {
        statusText = "Venceu";
        statusClass = "win";
      } else if (invalid) {
        statusText = penalty?.pointsLost ? `Inválido -${penalty.pointsLost}` : "Inválido";
        statusClass = "invalid";
      } else if (penalty?.pointsLost) {
        statusText = `Perdeu -${penalty.pointsLost}`;
        statusClass = "lose";
      }
    } else if (invalid) {
      statusText = "Inválido";
      statusClass = "invalid";
    }

    card.innerHTML = `
      <div class="player-card-name">${escapeHtml(getFullName(player))}</div>
      <span class="player-kind">${player.type === "bot" ? "Bot" : "Jogador"}</span>

      <div class="choice-row">
        <span>Número</span>
        <strong class="choice-value ${showChoices ? "big-choice" : ""}">${showChoices ? choice : "—"}</strong>
      </div>

      <div class="score-row">
        <span>Pontos</span>
        <strong class="score-value">${player.points}</strong>
      </div>

      <div class="status-pill ${statusClass}">${statusText}</div>
    `;

    board.appendChild(card);
  });
}


function revealChoice(player, number) {
  const card = getPlayerCard(player.id);
  if (!card) return;

  const value = card.querySelector(".choice-value");
  if (value) {
    value.textContent = number;
    value.classList.add("big-choice");
  }

  card.classList.add("revealed");
  card.style.animation = "pop .34s ease both";

  window.setTimeout(() => {
    card.style.animation = "";
  }, 360);
}

async function animatePenalties(result) {
  for (const penalty of result.penalties) {
    const player = state.players.find((item) => item.id === penalty.playerId);
    if (!player || penalty.pointsLost <= 0) continue;

    const card = getPlayerCard(player.id);
    if (!card) continue;

    const fly = document.createElement("div");
    fly.className = "penalty-fly";
    fly.textContent = `-${penalty.pointsLost}`;
    card.appendChild(fly);

    await sleep(420);

    player.points -= penalty.pointsLost;

    if (player.points <= -10) {
      player.points = -10;
      player.eliminated = true;
    }

    const score = card.querySelector(".score-value");
    if (score) {
      score.textContent = player.points;
      score.classList.remove("score-hit");
      void score.offsetWidth;
      score.classList.add("score-hit");
    }

    const pill = card.querySelector(".status-pill");
    if (pill && player.eliminated) {
      pill.textContent = "Eliminado";
      pill.className = "status-pill dead";
      card.classList.add("eliminated");
    }

    await sleep(520);
  }
}

async function moveMathResultIntoNextFormula(nextExpression) {
  const resultElement = $("#mathResult");
  const expressionElement = $("#mathExpression");
  const mathLine = $("#mathLine");

  if (!resultElement || !expressionElement || !mathLine || mathLine.classList.contains("hidden")) return;

  const value = resultElement.textContent.trim();
  if (!value) return;

  mathLine.classList.add("math-converting");

  resultElement.classList.remove("math-result-convert");
  void resultElement.offsetWidth;
  resultElement.classList.add("math-result-convert");

  await sleep(360);

  resultElement.textContent = "";
  expressionElement.textContent = nextExpression;

  expressionElement.classList.remove("formula-enter");
  void expressionElement.offsetWidth;
  expressionElement.classList.add("formula-enter");

  await sleep(420);

  resultElement.classList.remove("math-result-convert");
  expressionElement.classList.remove("formula-enter");
  mathLine.classList.remove("math-converting");

  mathLine.classList.remove("math-line-pulse");
  void mathLine.offsetWidth;
  mathLine.classList.add("math-line-pulse");

  await sleep(180);
}


function updateActiveRulesPanel() {
  const panel = $("#activeRulesPanel");
  const list = $("#activeRulesList");

  if (!panel || !list || !state) {
    if (panel) panel.classList.add("hidden");
    return;
  }

  const rules = getActiveRules(getActivePlayers().length);
  const activeRules = [];

  if (rules.duplicate) {
    activeRules.push({
      title: "Números repetidos são inválidos",
      text: "Se duas ou mais pessoas escolherem o mesmo número, esse número não conta e cada uma perde 2 pontos."
    });
  }

  if (rules.exact) {
    activeRules.push({
      title: "Acerto exato dobra a penalidade",
      text: "Se alguém acertar exatamente o alvo, todos os outros têm a penalidade dobrada. Repetidos vão de -2 para -4."
    });
  }

  if (rules.finalDuel) {
    activeRules.push({
      title: "Duelo final",
      text: "Com 2 jogadores, o 0 decide: 0 perde para 100, mas vence qualquer outro número. O bot final escolhe entre 0, 1 ou 100."
    });
  }

  if (!activeRules.length) {
    panel.classList.add("hidden");
    list.innerHTML = "";
    return;
  }

  panel.classList.remove("hidden");
  list.innerHTML = activeRules.map((rule) => `
    <article class="active-rule-card">
      <strong>${escapeHtml(rule.title)}</strong>
      <span>${escapeHtml(rule.text)}</span>
    </article>
  `).join("");
}


function setPhase(label, title, description) {
  $("#phaseLabel").textContent = label;
  $("#phaseTitle").textContent = title;
  $("#phaseDescription").textContent = description;
}

function setMathLine(expression, result, hide) {
  const mathLine = $("#mathLine");

  if (hide) {
    mathLine.classList.add("hidden");
  } else {
    mathLine.classList.remove("hidden");
  }

  $("#mathExpression").textContent = expression;
  $("#mathResult").textContent = result;
}

function highlightCard(playerId, className) {
  clearCardClass(className);
  const card = getPlayerCard(playerId);
  if (card) card.classList.add(className);
}

function clearCardClass(className) {
  $$(".player-card").forEach((card) => card.classList.remove(className));
}

function getPlayerCard(playerId) {
  return $(`.player-card[data-player-id="${playerId}"]`);
}

async function animateNumber(selector, finalValue, duration) {
  const element = $(selector);
  const steps = 42;
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

function goToNextRound() {
  if (!state || state.status !== "playing" || !state.pendingNextRound) return;

  state.round += 1;
  state.pendingNextRound = false;
  $("#nextRoundBtn").classList.add("hidden");
  startRound();
}

function checkEndGame() {
  const activePlayers = getActivePlayers();

  if (activePlayers.length === 1) {
    const winner = activePlayers[0];
    endGame(`${getFullName(winner)} venceu`, "Todos os outros jogadores chegaram a -10 pontos.");
    return true;
  }

  if (activePlayers.length === 0) {
    endGame("Todos foram eliminados", "Nenhum jogador continuou ativo na partida.");
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
  $("#arenaBoard").classList.add("hidden");
  $("#choicePanel").classList.remove("hidden");
  $("#nextRoundBtn").classList.add("hidden");
  $("#playerNumber").value = "";
  $("#message").textContent = "";
  setNumberGridDisabled(false);
  updateActiveRulesPanel();
  setMathLine("", "", true);
}

function getPlayersFromResult(result) {
  return state.players.filter((player) => result.choices[player.id] !== undefined);
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


/* Ajuste v19: abertura robusta da janela de regras */
function forceOpenRulesModal() {
  const modal = document.querySelector("#rulesModal");

  if (!modal) return;

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function forceCloseRulesModal() {
  const modal = document.querySelector("#rulesModal");

  if (!modal) return;

  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

document.addEventListener("DOMContentLoaded", () => {
  const rulesButton = document.querySelector("#rulesBtn");
  const closeButton = document.querySelector("#closeRulesBtn");
  const rulesModal = document.querySelector("#rulesModal");

  if (rulesButton) {
    rulesButton.onclick = forceOpenRulesModal;
  }

  if (closeButton) {
    closeButton.onclick = forceCloseRulesModal;
  }

  if (rulesModal) {
    rulesModal.addEventListener("click", (event) => {
      if (event.target.matches("[data-close-rules]")) {
        forceCloseRulesModal();
      }
    });
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    forceCloseRulesModal();
  }
});
