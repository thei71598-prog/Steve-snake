const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const SIZE = 20;
const COLS = 18;
const ROWS = 22;

let snake = [];
let previousSnake = [];
let food = {};
let obstacles = [];

let direction = {x: 1, y: 0};
let directionQueue = [];

let score = 0;
let level = 1;
let best = Number(localStorage.getItem("steveBest")) || 0;

let running = false;
let paused = false;

let moveDuration = 150;
let accumulator = 0;
let lastFrame = 0;

const MAX_QUEUED_TURNS = 3;

document.getElementById("best").textContent = best;

// OUTILS
function samePosition(a, b) {
  return a.x === b.x && a.y === b.y;
}

function randomPosition() {
  return {
    x: Math.floor(Math.random() * COLS),
    y: Math.floor(Math.random() * ROWS)
  };
}

function occupied(x, y) {
  return snake.some(p => p.x === x && p.y === y) ||
    obstacles.some(p => p.x === x && p.y === y);
}

// POMME
function newFood() {
  let p;
  let attempts = 0;

  do {
    p = randomPosition();
    attempts++;
  } while (occupied(p.x, p.y) && attempts < 1000);

  food = p;
}

// OBSTACLES
function createLevel() {
  obstacles = [];

  const count = (level - 1) * 2;

  for (let i = 0; i < count; i++) {
    let p;
    let attempts = 0;

    do {
      p = randomPosition();
      attempts++;
    } while (
      (
        occupied(p.x, p.y) ||
        Math.abs(p.x - 8) < 3 ||
        Math.abs(p.y - 11) < 3
      ) && attempts < 1000
    );

    if (attempts < 1000) {
      obstacles.push(p);
    }
  }
}

// STATISTIQUES
function updateStats() {
  document.getElementById("score").textContent = score;
  document.getElementById("level").textContent = level + "/20";
  document.getElementById("best").textContent = best;
}

// DÉMARRER
function startGame() {
  snake = [
    {x: 8, y: 11},
    {x: 7, y: 11},
    {x: 6, y: 11}
  ];

  previousSnake = snake.map(p => ({...p}));

  direction = {x: 1, y: 0};
  directionQueue = [];

  score = 0;
  level = 1;
  running = true;
  paused = false;

  accumulator = 0;
  lastFrame = 0;
  moveDuration = getSpeed();

  document.getElementById("pauseBtn").textContent = "⏸ PAUSE";
  document.getElementById("overlay").style.display = "none";
  document.getElementById("message").textContent = "Bonne chance !";

  createLevel();
  newFood();
  updateStats();
  draw(1);
}

// VITESSE
function getSpeed() {
  return Math.max(75, 150 - (level - 1) * 4);
}

// COMMANDES
function turn(name) {
  const directions = {
    up: {x: 0, y: -1},
    down: {x: 0, y: 1},
    left: {x: -1, y: 0},
    right: {x: 1, y: 0}
  };

  const next = directions[name];

  if (!next || !running || paused) return;

  const lastDirection = directionQueue.length
    ? directionQueue[directionQueue.length - 1]
    : direction;

  if (
    next.x === -lastDirection.x &&
    next.y === -lastDirection.y
  ) return;

  if (
    next.x === lastDirection.x &&
    next.y === lastDirection.y
  ) return;

  if (directionQueue.length < MAX_QUEUED_TURNS) {
    directionQueue.push(next);
  }
}

// UN PAS DU SERPENT
function step() {
  if (!running || paused) return;

  previousSnake = snake.map(p => ({...p}));

  if (directionQueue.length) {
    direction = directionQueue.shift();
  }

  const head = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y
  };

  const eating = samePosition(head, food);

  const bodyToCheck = eating
    ? snake
    : snake.slice(0, -1);

  // COLLISIONS
  if (
    head.x < 0 || head.x >= COLS ||
    head.y < 0 || head.y >= ROWS ||
    obstacles.some(p => samePosition(p, head)) ||
    bodyToCheck.some(p => samePosition(p, head))
  ) {
    gameOver();
    return;
  }

  snake.unshift(head);

  if (eating) {
    score += 10;

    if (score > best) {
      best = score;
      localStorage.setItem("steveBest", best);
    }

    if (score >= level * 50 && level < 20) {
      level++;
      createLevel();

      document.getElementById("message").textContent =
        "🔥 NIVEAU " + level + " DÉBLOQUÉ !";
    }

    if (level === 20 && score >= 1000) {
      updateStats();
      winGame();
      return;
    }

    newFood();
    updateStats();

  } else {
    snake.pop();
  }

  moveDuration = getSpeed();
}

// ANIMATION CONTINUE
function animate(timestamp) {
  requestAnimationFrame(animate);

  if (!running || paused) {
    lastFrame = timestamp;
    return;
  }

  if (!lastFrame) lastFrame = timestamp;

  let delta = timestamp - lastFrame;
  lastFrame = timestamp;

  delta = Math.min(delta, 40);
  accumulator += delta;

  while (accumulator >= moveDuration && running && !paused) {
    accumulator -= moveDuration;
    step();
  }

  const progress = Math.min(1, accumulator / moveDuration);
  draw(progress);
}

// DESSIN DU JEU
function draw(progress) {
  ctx.clearRect(0, 0, 360, 440);

  ctx.fillStyle = "#17221e";
  ctx.fillRect(0, 0, 360, 440);

  // GRILLE
  ctx.strokeStyle = "#22342a";
  ctx.lineWidth = 0.5;

  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * SIZE, 0);
    ctx.lineTo(x * SIZE, 440);
    ctx.stroke();
  }

  for (let y = 0; y <= ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * SIZE);
    ctx.lineTo(360, y * SIZE);
    ctx.stroke();
  }

  // OBSTACLES
  obstacles.forEach(p => {
    ctx.fillStyle = "#d94a42";
    ctx.fillRect(p.x * SIZE + 2, p.y * SIZE + 2, 16, 16);
  });

  // POMME
  ctx.save();
  ctx.translate(food.x * SIZE + 10, food.y * SIZE + 10);

  ctx.shadowColor = "#ff2525";
  ctx.shadowBlur = 10;

  const apple = ctx.createRadialGradient(-4, -5, 1, 0, 0, 13);
  apple.addColorStop(0, "#ff7777");
  apple.addColorStop(0.5, "#ff2525");
  apple.addColorStop(1, "#a80012");

  ctx.fillStyle = apple;

  ctx.beginPath();
  ctx.moveTo(0, -4);
  ctx.bezierCurveTo(-3, -9, -9, -9, -10, -2);
  ctx.bezierCurveTo(-13, 7, -7, 12, 0, 11);
  ctx.bezierCurveTo(7, 12, 13, 7, 10, -2);
  ctx.bezierCurveTo(9, -9, 3, -9, 0, -4);
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 0;

  ctx.strokeStyle = "#704321";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -5);
  ctx.lineTo(1, -10);
  ctx.stroke();

  ctx.fillStyle = "#52e66b";
  ctx.beginPath();
  ctx.moveTo(1, -8);
  ctx.bezierCurveTo(7, -13, 11, -9, 2, -5);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.globalAlpha = 0.65;
  ctx.beginPath();
  ctx.arc(-5, -2, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // SERPENT ANIMÉ
  const time = performance.now() / 250;

  snake.forEach((p, i) => {
    const old = previousSnake[i] || p;

    const x = (old.x + (p.x - old.x) * progress) * SIZE + 10;
    const y = (old.y + (p.y - old.y) * progress) * SIZE + 10;

    const wave = Math.sin(time - i * 0.45) * 1.1;

    let offsetX = 0;
    let offsetY = 0;

    if (i > 0) {
      offsetX = direction.x === 0 ? wave : 0;
      offsetY = direction.y === 0 ? wave : 0;
    }

    const pulse = Math.sin(time - i * 0.4) * 0.06;

    ctx.save();
    ctx.translate(x + offsetX, y + offsetY);

    ctx.shadowColor = "#65ff85";
    ctx.shadowBlur = i === 0 ? 13 : 6;

    ctx.fillStyle = i === 0 ? "#aaff76" : "#36c878";

    const scale = i === 0 ? 1 : 0.94 + pulse;
    ctx.scale(scale, scale);

    ctx.beginPath();
    ctx.roundRect(-9, -9, 18, 18, i === 0 ? 8 : 6);
    ctx.fill();

    ctx.shadowBlur = 0;

    if (i > 0) {
      ctx.fillStyle = "#b4ffb9";
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // YEUX
    if (i === 0) {
      let eyes;

      if (direction.x === 1) {
        eyes = [[-2, -5], [-2, 5]];
      } else if (direction.x === -1) {
        eyes = [[2, -5], [2, 5]];
      } else if (direction.y === -1) {
        eyes = [[-5, -2], [5, -2]];
      } else {
        eyes = [[-5, 2], [5, 2]];
      }

      eyes.forEach(eye => {
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(eye[0], eye[1], 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#14251a";
        ctx.beginPath();
        ctx.arc(eye[0], eye[1], 1.5, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    ctx.restore();
  });
}

// GAME OVER
function gameOver() {
  running = false;

  showOverlay(
    "GAME OVER 💀",
    "Ton score : " + score +
    "<br>Essaie encore pour battre ton record !",
    "REJOUER ↻"
  );
}

// VICTOIRE
function winGame() {
  running = false;

  showOverlay(
    "VICTOIRE 🏆",
    "Félicitations ! Tu as terminé les 20 niveaux !",
    "REJOUER"
  );
}

// MENU
function showOverlay(title, description, button) {
  document.getElementById("title").textContent = title;
  document.getElementById("description").innerHTML = description;
  document.getElementById("startBtn").textContent = button;
  document.getElementById("overlay").style.display = "flex";
}

// PAUSE
function togglePause() {
  if (!running) return;

  paused = !paused;
  accumulator = 0;
  lastFrame = 0;

  document.getElementById("pauseBtn").textContent =
    paused ? "▶ REPRENDRE" : "⏸ PAUSE";

  document.getElementById("message").textContent =
    paused ? "JEU EN PAUSE" : "C'est reparti !";
}

// BOUTONS
document.getElementById("startBtn").addEventListener("click", startGame);
document.getElementById("pauseBtn").addEventListener("click", togglePause);

// CLAVIER
document.addEventListener("keydown", e => {
  const keys = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right"
  };

  if (keys[e.key]) {
    e.preventDefault();
    turn(keys[e.key]);
  }
});

// COMMANDES TACTILES
let startX = 0;
let startY = 0;

canvas.addEventListener("touchstart", e => {
  e.preventDefault();

  startX = e.changedTouches[0].clientX;
  startY = e.changedTouches[0].clientY;
}, {passive: false});

canvas.addEventListener("touchend", e => {
  e.preventDefault();

  const dx = e.changedTouches[0].clientX - startX;
  const dy = e.changedTouches[0].clientY - startY;

  if (Math.max(Math.abs(dx), Math.abs(dy)) < 8) return;

  if (Math.abs(dx) > Math.abs(dy)) {
    turn(dx > 0 ? "right" : "left");
  } else {
    turn(dy > 0 ? "down" : "up");
  }
}, {passive: false});

// LANCEMENT
requestAnimationFrame(animate);