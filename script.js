// ========== UI Elements ==========
const mainMenu = document.getElementById('mainMenu');
const playBtn = document.getElementById('playBtn');
const customizeBtn = document.getElementById('customizeBtn');
const customizeMenu = document.getElementById('customizeMenu');
const customizeBackBtn = document.getElementById('customizeBackBtn');
const colorBtns = document.querySelectorAll('.color-btn');
const colorPicker = document.getElementById('colorPicker');
const headColorPicker = document.getElementById('headColorPicker');
const scaleColorPicker = document.getElementById('scaleColorPicker');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDiv = document.getElementById('score');
const restartBtn = document.getElementById('restartBtn');
const backBtn = document.getElementById('backBtn');
const mobileControls = document.getElementById('mobile-controls');
const btnUp = document.getElementById('btnUp');
const btnDown = document.getElementById('btnDown');
const btnLeft = document.getElementById('btnLeft');
const btnRight = document.getElementById('btnRight');
const nameModal = document.getElementById('nameModal');
const playerNameInput = document.getElementById('playerName');
const nameDoneBtn = document.getElementById('nameDoneBtn');
const nameError = document.getElementById('nameError');
const scoreboardTableBody = document.getElementById('scoreboardTableBody');

// === Audio Elements ===
const bgMusic = document.getElementById('bg-music');
const eatSound = document.getElementById('eat-sound');
if(bgMusic) { bgMusic.volume = 0.08; }

let currentPlayerName = "";

// ========== Mobile Device Detection ==========
function isMobileDevice() {
  return /android|iphone|ipad|ipod|opera mini|iemobile|wpdesktop/i.test(navigator.userAgent);
}

// ========== Game Variables ==========
const gridSize = 20;
const tileCount = canvas.width / gridSize;
let snake, direction, nextDirection, score, gameLoop, isGameOver;
let snakeColor = localStorage.getItem('snakeColor') || '#3ca6a6';
let headColor = localStorage.getItem('headColor') || '#f6d55c';
let scaleColor = localStorage.getItem('scaleColor') || '#aaffee';

// === Fruit Variables ===
const FRUIT_EMOJIS = ["🍎", "🍏"];
const CHERRY_EMOJI = "🍒";
const CHERRY_BONUS = 5; // Points for cherry
let appleFruit = { x: 0, y: 0, type: FRUIT_EMOJIS[0] };
let cherryFruit = { x: 0, y: 0, type: CHERRY_EMOJI, visible: false };
let nextAppleColor = 0; // 0 = red, 1 = green

// === Cherry Timers ===
let cherryTimer = null;
let cherryTimeout = null;
const CHERRY_PRESENT_TIME = 5000; // ms the cherry stays visible
const CHERRY_RESPAWN_MIN = 10000; // min ms until next cherry
const CHERRY_RESPAWN_MAX = 20000; // max ms until next cherry

// === Pulsing Animation Variables ===
let pulseStartTime = Date.now();

// ========== Scoreboard Storage ==========
const USE_API = false; // set to true to use a REST API, false for browser localStorage
const API_URL = "https://api.jsonbin.io/v3/b/665cda3eacd3cb34a847c4f3";
const API_KEY = "";

async function getScoreboardAPI() {
  try {
    const res = await fetch(API_URL, API_KEY ? {headers: {'X-Access-Key': API_KEY}} : undefined);
    const data = await res.json();
    return data.record || [];
  } catch {
    return [];
  }
}
async function saveScoreAPI(newEntry) {
  let scores = await getScoreboardAPI();
  scores.push(newEntry);
  scores = scores.filter(
    s => s && typeof s.name === "string" && typeof s.score === "number"
  );
  scores = scores.sort((a, b) => b.score - a.score).slice(0, 10);
  await fetch(API_URL, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(API_KEY ? {'X-Access-Key': API_KEY} : {})
    },
    body: JSON.stringify(scores)
  });
}
function getScoreboardLocal() {
  let arr = [];
  try {
    arr = JSON.parse(localStorage.getItem('snakeScores') || '[]');
  } catch {
    arr = [];
  }
  arr = arr.filter(
    s => s && typeof s.name === "string" && typeof s.score === "number"
  );
  return arr;
}
function saveScoreLocal(newEntry) {
  let scores = getScoreboardLocal();
  scores.push(newEntry);
  scores = scores.filter(
    s => s && typeof s.name === "string" && typeof s.score === "number"
  );
  scores = scores.sort((a, b) => b.score - a.score).slice(0, 10);
  localStorage.setItem('snakeScores', JSON.stringify(scores));
}
async function getScoreboard() {
  if (USE_API) return await getScoreboardAPI();
  return getScoreboardLocal();
}
async function saveScore(newEntry) {
  if (USE_API) return await saveScoreAPI(newEntry);
  return saveScoreLocal(newEntry);
}

// ========== Highscore Table Rendering ==========
async function renderScoreboardTable() {
  let scores = await getScoreboard();
  scores = (scores || []).filter(
    s => s && typeof s.name === "string" && typeof s.score === "number"
  );
  scores = scores.sort((a, b) => b.score - a.score);
  scoreboardTableBody.innerHTML = '';
  for (let i = 0; i < 10; i++) {
    const s = scores[i];
    let name = "---";
    let score = "---";
    if (s) {
      name = escapeHTML(s.name) || "---";
      score = s.score !== undefined ? s.score : "---";
    }
    const tr = document.createElement('tr');
    if (i === 0) tr.classList.add("top1");
    else if (i === 1) tr.classList.add("top2");
    else if (i === 2) tr.classList.add("top3");
    tr.innerHTML = `<td>${i+1}</td><td>${name}</td><td>${score}</td>`;
    scoreboardTableBody.appendChild(tr);
  }
}
function escapeHTML(str) {
  return (str||"").replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[m]);
}

// ========== Game Functions ==========
function initGame() {
  snake = [
    { x: Math.floor(tileCount / 2), y: Math.floor(tileCount / 2) },
    { x: Math.floor(tileCount / 2) - 1, y: Math.floor(tileCount / 2) },
    { x: Math.floor(tileCount / 2) - 2, y: Math.floor(tileCount / 2) }
  ];
  direction = 'right';
  nextDirection = 'right';
  score = 0;
  isGameOver = false;
  nextAppleColor = 0;
  placeApple();
  removeCherry();
  scoreDiv.textContent = "Score: 0";
  clearInterval(gameLoop);
  clearTimeout(cherryTimer);
  clearTimeout(cherryTimeout);
  scheduleCherry();
  pulseStartTime = Date.now();
  requestAnimationFrame(drawAnimated);
}

function scheduleCherry() {
  clearTimeout(cherryTimeout);
  cherryTimeout = setTimeout(() => {
    placeCherry();
    cherryFruit.visible = true;
    cherryTimer = setTimeout(() => {
      removeCherry();
      scheduleCherry();
    }, CHERRY_PRESENT_TIME);
  }, Math.random() * (CHERRY_RESPAWN_MAX - CHERRY_RESPAWN_MIN) + CHERRY_RESPAWN_MIN);
}

function placeApple() {
  const pos = randomFruitPosition(cherryFruit.visible ? [cherryFruit] : []);
  appleFruit.x = pos.x;
  appleFruit.y = pos.y;
  appleFruit.type = FRUIT_EMOJIS[nextAppleColor];
  nextAppleColor = 1 - nextAppleColor;
}

function placeCherry() {
  const pos = randomFruitPosition([appleFruit]);
  cherryFruit.x = pos.x;
  cherryFruit.y = pos.y;
  cherryFruit.type = CHERRY_EMOJI;
  cherryFruit.visible = true;
}

function removeCherry() {
  cherryFruit.visible = false;
}

function randomFruitPosition(exclude = []) {
  let valid = false, pos = {x: 0, y: 0};
  while (!valid) {
    pos = {
      x: Math.floor(Math.random() * tileCount),
      y: Math.floor(Math.random() * tileCount)
    };
    valid = !snake.some(segment => segment.x === pos.x && segment.y === pos.y)
      && !exclude.some(e => e.x === pos.x && e.y === pos.y && e.visible !== false);
  }
  return pos;
}

function gameTick() {
  if (isGameOver) return;
  direction = nextDirection;
  const head = { ...snake[0] };
  switch (direction) {
    case 'left': head.x -= 1; break;
    case 'up': head.y -= 1; break;
    case 'right': head.x += 1; break;
    case 'down': head.y += 1; break;
  }
  head.x = (head.x + tileCount) % tileCount;
  head.y = (head.y + tileCount) % tileCount;
  if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
    endGame();
    return;
  }
  snake.unshift(head);

  let ate = false;
  if (head.x === appleFruit.x && head.y === appleFruit.y) {
    score += 1;
    scoreDiv.textContent = `Score: ${score}`;
    placeApple();
    ate = true;
    if (eatSound) { eatSound.currentTime = 0; eatSound.play(); }
  }
  if (cherryFruit.visible && head.x === cherryFruit.x && head.y === cherryFruit.y) {
    score += CHERRY_BONUS;
    scoreDiv.textContent = `Score: ${score}`;
    removeCherry();
    clearTimeout(cherryTimer);
    scheduleCherry();
    ate = true;
    if (eatSound) { eatSound.currentTime = 0; eatSound.play(); }
  }
  if (!ate) {
    snake.pop();
  }
}

function drawAnimated() {
  draw();
  if (!isGameOver) {
    requestAnimationFrame(drawAnimated);
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let t = (Date.now() - pulseStartTime) / 400;
  let pulseApple = 1 + Math.sin(t) * 0.13;

  drawFruitEmoji(
    appleFruit.type,
    appleFruit.x * gridSize + (gridSize - gridSize * pulseApple) / 2,
    appleFruit.y * gridSize + (gridSize - gridSize * pulseApple) / 2,
    gridSize * pulseApple
  );

  if (cherryFruit.visible) {
    let pulseCherry = 1 + Math.sin(t + Math.PI/2) * 0.13;
    drawFruitEmoji(
      cherryFruit.type,
      cherryFruit.x * gridSize + (gridSize - gridSize * pulseCherry) / 2,
      cherryFruit.y * gridSize + (gridSize - gridSize * pulseCherry) / 2,
      gridSize * pulseCherry
    );
  }

  for (let i = snake.length - 1; i > 0; i--) {
    drawSnakeSegmentSquare(snake[i].x * gridSize, snake[i].y * gridSize, snakeColor, false);
  }
  drawSnakeSegmentSquare(
    snake[0].x * gridSize + gridSize * -0.025,
    snake[0].y * gridSize + gridSize * -0.025,
    headColor, true
  );

  if (isGameOver) {
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.font = "32px 'Press Start 2P', monospace";
    ctx.textAlign = "center";
    ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2 - 10);
    ctx.font = "20px 'Press Start 2P', monospace";
    ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 25);
  }
}

function drawFruitEmoji(emoji, x, y, size) {
  ctx.save();
  ctx.font = `${size}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = (emoji === CHERRY_EMOJI) ? "#f72585" : "#3ca6a6";
  ctx.shadowBlur = 16;
  ctx.fillText(emoji, x + size/2, y + size/2);
  ctx.restore();
}

function drawSnakeSegmentSquare(x, y, color, isHead = false) {
  ctx.save();
  let size = gridSize;
  if (isHead) size = gridSize * 1.05;

  ctx.fillStyle = color;
  ctx.fillRect(x, y, size, size);

  for (let s = 0; s < 4; s++) {
    const scaleSize = size * 0.18;
    const offsetX = x + size / 2 + Math.cos((Math.PI * 2 / 4) * s) * size * 0.27 - scaleSize / 2;
    const offsetY = y + size / 2 + Math.sin((Math.PI * 2 / 4) * s) * size * 0.27 - scaleSize / 2;
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = scaleColor;
    ctx.beginPath();
    ctx.arc(offsetX + scaleSize / 2, offsetY + scaleSize / 2, scaleSize / 2, 0, 2 * Math.PI);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (isHead) {
    ctx.save();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(x + size * 0.33, y + size * 0.35, size * 0.11, 0, 2 * Math.PI);
    ctx.arc(x + size * 0.67, y + size * 0.35, size * 0.11, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = "#222";
    ctx.beginPath();
    ctx.arc(x + size * 0.33, y + size * 0.35, size * 0.05, 0, 2 * Math.PI);
    ctx.arc(x + size * 0.67, y + size * 0.35, size * 0.05, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

// ========== Input Handling ==========
document.addEventListener('keydown', e => {
  if (mainMenu.style.display !== 'none' || nameModal.style.display === '') return;
  if (isGameOver) return;
  switch (e.key) {
    case 'ArrowLeft':
    case 'a':
    case 'A':
      if (direction !== 'right') nextDirection = 'left';
      break;
    case 'ArrowUp':
    case 'w':
    case 'W':
      if (direction !== 'down') nextDirection = 'up';
      break;
    case 'ArrowRight':
    case 'd':
    case 'D':
      if (direction !== 'left') nextDirection = 'right';
      break;
    case 'ArrowDown':
    case 's':
    case 'S':
      if (direction !== 'up') nextDirection = 'down';
      break;
  }
});

function handleDirection(dir) {
  if (isGameOver) return;
  switch (dir) {
    case 'left':
      if (direction !== 'right') nextDirection = 'left';
      break;
    case 'up':
      if (direction !== 'down') nextDirection = 'up';
      break;
    case 'right':
      if (direction !== 'left') nextDirection = 'right';
      break;
    case 'down':
      if (direction !== 'up') nextDirection = 'down';
      break;
  }
}

btnUp.addEventListener('touchstart', e => { e.preventDefault(); handleDirection('up'); });
btnDown.addEventListener('touchstart', e => { e.preventDefault(); handleDirection('down'); });
btnLeft.addEventListener('touchstart', e => { e.preventDefault(); handleDirection('left'); });
btnRight.addEventListener('touchstart', e => { e.preventDefault(); handleDirection('right'); });
btnUp.addEventListener('mousedown', e => { e.preventDefault(); handleDirection('up'); });
btnDown.addEventListener('mousedown', e => { e.preventDefault(); handleDirection('down'); });
btnLeft.addEventListener('mousedown', e => { e.preventDefault(); handleDirection('left'); });
btnRight.addEventListener('mousedown', e => { e.preventDefault(); handleDirection('right'); });

restartBtn.addEventListener('click', () => {
  showGame();
  initGame();
});

// ========== Menu Navigation ==========
playBtn.addEventListener('click', () => {
  showGame();
  showNameModal();
});
customizeBtn.addEventListener('click', () => {
  showCustomize();
});
customizeBackBtn.addEventListener('click', showMainMenu);
backBtn.addEventListener('click', () => {
  showMainMenu();
  clearInterval(gameLoop);
});
nameDoneBtn.addEventListener('click', () => {
  const name = (playerNameInput.value || "").trim();
  if (!name) {
    nameError.textContent = "Please enter your name!";
    return;
  }
  if (name.length < 2) {
    nameError.textContent = "Name too short.";
    return;
  }
  nameError.textContent = "";
  currentPlayerName = name;
  hideNameModal();
  initGame();
});
playerNameInput.addEventListener('input', () => {
  nameError.textContent = "";
});
playerNameInput.addEventListener('keydown', (e) => {
  if (e.key === "Enter") {
    nameDoneBtn.click();
  }
});

// ========== Menu Show/Hide ==========
function showMainMenu() {
  mainMenu.style.display = '';
  customizeMenu.style.display = 'none';
  canvas.style.display = 'none';
  scoreDiv.style.display = 'none';
  restartBtn.style.display = 'none';
  backBtn.style.display = 'none';
  mobileControls.style.display = 'none';
  renderScoreboardTable();
}
function showCustomize() {
  mainMenu.style.display = 'none';
  customizeMenu.style.display = '';
  canvas.style.display = 'none';
  scoreDiv.style.display = 'none';
  restartBtn.style.display = 'none';
  backBtn.style.display = 'none';
  mobileControls.style.display = 'none';
  colorBtns.forEach(btn => {
    if (btn.dataset.color.toLowerCase() === snakeColor.toLowerCase()) {
      btn.classList.add('selected');
    } else {
      btn.classList.remove('selected');
    }
  });
  colorPicker.value = snakeColor;
  headColorPicker.value = headColor;
  scaleColorPicker.value = scaleColor;
}
function showGame() {
  mainMenu.style.display = 'none';
  customizeMenu.style.display = 'none';
  canvas.style.display = '';
  scoreDiv.style.display = '';
  restartBtn.style.display = '';
  backBtn.style.display = '';
  if (isMobileDevice()) {
    mobileControls.style.display = 'flex';
  } else {
    mobileControls.style.display = 'none';
  }
}

function showNameModal() {
  nameModal.style.display = '';
  playerNameInput.value = '';
  nameError.textContent = '';
  setTimeout(() => playerNameInput.focus(), 100);
}
function hideNameModal() {
  nameModal.style.display = 'none';
}

// ========== Color Changing ==========
colorBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    snakeColor = btn.dataset.color;
    colorBtns.forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    colorPicker.value = snakeColor;
    localStorage.setItem('snakeColor', snakeColor);
  });
});
colorPicker.addEventListener('input', () => {
  snakeColor = colorPicker.value;
  colorBtns.forEach(b => b.classList.remove('selected'));
  localStorage.setItem('snakeColor', snakeColor);
});
headColorPicker.addEventListener('input', () => {
  headColor = headColorPicker.value;
  localStorage.setItem('headColor', headColor);
});
scaleColorPicker.addEventListener('input', () => {
  scaleColor = scaleColorPicker.value;
  localStorage.setItem('scaleColor', scaleColor);
});

// ========== End Game & Save Score ==========
function endGame() {
  isGameOver = true;
  clearInterval(gameLoop);
  clearTimeout(cherryTimer);
  clearTimeout(cherryTimeout);
  draw();
  if (currentPlayerName && currentPlayerName.length > 1 && score > 0) {
    saveScore({ name: currentPlayerName, score }).then(renderScoreboardTable);
  }
  setTimeout(() => {
    showMainMenu();
    renderScoreboardTable();
  }, 2000);
}

// ========== On Load ==========
showMainMenu();
