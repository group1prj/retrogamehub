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

// ========== Level Display ==========
let levelDiv = document.getElementById('levelDisplay');
if (!levelDiv) {
  levelDiv = document.createElement('div');
  levelDiv.id = 'levelDisplay';
  levelDiv.style.fontFamily = "'Press Start 2P', monospace";
  levelDiv.style.color = "#f6d55c";
  levelDiv.style.textAlign = "center";
  levelDiv.style.fontSize = "1.1rem";
  levelDiv.style.textShadow = "0 0 10px #00f2ea, 0 0 15px #3ca6a6";
  levelDiv.style.marginBottom = "8px";
  levelDiv.style.letterSpacing = "1.5px";
  levelDiv.style.background = "rgba(18,18,28,0.74)";
  levelDiv.style.borderRadius = "8px";
  levelDiv.style.padding = "6px 18px";
  levelDiv.style.display = "none";
  // Insert after scoreDiv or before if mobile
  scoreDiv.parentNode.insertBefore(levelDiv, scoreDiv.nextSibling);
}

let currentPlayerName = "";

// ========== Mobile Device Detection ==========
function isMobileDevice() {
  return /android|iphone|ipad|ipod|opera mini|iemobile|wpdesktop/i.test(navigator.userAgent);
}

// ========== Game Variables ==========
const gridSize = 20;
const tileCount = canvas.width / gridSize;
let snake, direction, nextDirection, food, score, gameLoop, isGameOver;
let snakeColor = localStorage.getItem('snakeColor') || '#3ca6a6';
let headColor = localStorage.getItem('headColor') || '#f6d55c';
let scaleColor = localStorage.getItem('scaleColor') || '#aaffee';
// Levels & Obstacles
let level = 1;
let pointsToNextLevel = 20;
let obstacles = [];
const OBSTACLE_COLOR = "#e94f37";

// ========== Scoreboard Storage ==========
const USE_API = false;
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

// ========== Level Functions ==========
function resetSnake() {
  snake = [
    { x: Math.floor(tileCount / 2), y: Math.floor(tileCount / 2) },
    { x: Math.floor(tileCount / 2) - 1, y: Math.floor(tileCount / 2) },
    { x: Math.floor(tileCount / 2) - 2, y: Math.floor(tileCount / 2) }
  ];
  direction = 'right';
  nextDirection = 'right';
}

function generateObstacles(count) {
  obstacles = [];
  while (obstacles.length < count) {
    let pos = {
      x: Math.floor(Math.random() * tileCount),
      y: Math.floor(Math.random() * tileCount)
    };
    // Avoid snake, food, and duplicate obstacles
    if (
      !snake.some(seg => seg.x === pos.x && seg.y === pos.y) &&
      !(food && food.x === pos.x && food.y === pos.y) &&
      !obstacles.some(o => o.x === pos.x && o.y === pos.y)
    ) {
      obstacles.push(pos);
    }
  }
}

function updateLevelDisplay(show = true) {
  levelDiv.textContent = `Level: ${level}`;
  levelDiv.style.display = show ? "" : "none";
}

// ========== Game Functions ==========
function initGame() {
  level = 1;
  pointsToNextLevel = 20;
  obstacles = [];
  resetSnake();
  score = 0;
  isGameOver = false;
  placeFood();
  scoreDiv.textContent = "Score: 0";
  updateLevelDisplay(true);
  clearInterval(gameLoop);
  gameLoop = setInterval(gameTick, 100);
  draw();
}

function placeFood() {
  let valid = false;
  while (!valid) {
    food = {
      x: Math.floor(Math.random() * tileCount),
      y: Math.floor(Math.random() * tileCount)
    };
    valid =
      !snake.some(segment => segment.x === food.x && segment.y === food.y) &&
      !obstacles.some(o => o.x === food.x && o.y === food.y);
  }
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

  // Check for obstacle collision
  if (obstacles.some(o => o.x === head.x && o.y === head.y)) {
    endGame();
    return;
  }

  // Check for self collision
  if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
    endGame();
    return;
  }

  snake.unshift(head);
  if (head.x === food.x && head.y === food.y) {
    score += 1;
    scoreDiv.textContent = `Score: ${score}`;
    // Level up if needed
    if (score >= pointsToNextLevel) {
      level++;
      pointsToNextLevel += 20;
      resetSnake();
      // Add easy random obstacles, not too many
      generateObstacles(2 + level); // For example, Level 2: 4, Level 3: 5...
      updateLevelDisplay();
      placeFood();
    } else {
      placeFood();
    }
  } else {
    snake.pop();
  }
  draw();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw obstacles
  ctx.fillStyle = OBSTACLE_COLOR;
  obstacles.forEach(o => {
    ctx.fillRect(o.x * gridSize, o.y * gridSize, gridSize, gridSize);
    // Optional: add border for visibility
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.strokeRect(o.x * gridSize, o.y * gridSize, gridSize, gridSize);
  });

  drawApple(food.x * gridSize, food.y * gridSize, gridSize);

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

function drawApple(x, y, size) {
  ctx.save();
  ctx.translate(x + size / 2, y + size / 2);
  ctx.beginPath();
  ctx.ellipse(0, 0, size * 0.38, size * 0.44, 0, 0, 2 * Math.PI);
  const grad = ctx.createRadialGradient(0, 0, size * 0.13, 0, 0, size * 0.44);
  grad.addColorStop(0, "#fff");
  grad.addColorStop(0.2, "#ff6e6e");
  grad.addColorStop(1, "#c20000");
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(-size * 0.11, -size * 0.12, size * 0.08, size * 0.17, 0, 0, 2 * Math.PI);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fill();
  ctx.save();
  ctx.rotate(-0.5);
  ctx.beginPath();
  ctx.ellipse(size * 0.13, -size * 0.25, size * 0.11, size * 0.04, Math.PI / 6, 0, 2 * Math.PI);
  ctx.fillStyle = "#2ecc40";
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.28);
  ctx.lineTo(0, -size * 0.39);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#815c35";
  ctx.stroke();
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
  updateLevelDisplay(false);
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
  updateLevelDisplay(false);
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
  updateLevelDisplay(true);
  if (isMobileDevice()) {
    mobileControls.style.display = '';
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
