// Modular Tetris Script (Snake-style structure)

let canvas, ctx, nextCanvas, nextCtx;
let score = 0, lines = 0, gameOver = false;
let current, next, board, pos;
let running = false, dropInterval = 600, lastDrop = 0;
let currentPlayerName = "";

const COLS = 10, ROWS = 20, BLOCK = 28;
const TETROMINOES = [
  { shape: [[0,1],[1,1],[2,1],[3,1]], color: "#00eaff" },
  { shape: [[0,0],[0,1],[1,1],[2,1]], color: "#294cfc" },
  { shape: [[2,0],[0,1],[1,1],[2,1]], color: "#ffb500" },
  { shape: [[1,0],[2,0],[1,1],[2,1]], color: "#ffe800" },
  { shape: [[1,0],[2,0],[0,1],[1,1]], color: "#39ff14" },
  { shape: [[1,0],[0,1],[1,1],[2,1]], color: "#ff2fd3" },
  { shape: [[0,0],[1,0],[1,1],[2,1]], color: "#ff5555" },
];

function showGame() {
  document.getElementById("mainMenu").classList.remove("active");
  document.querySelector(".gameplay-ui").classList.add("active");
}
function showMainMenu() {
  document.getElementById("mainMenu").classList.add("active");
  document.querySelector(".gameplay-ui").classList.remove("active");
  renderScoreboard();
}

function showNameModal() {
  document.getElementById("nameError").textContent = "";
  document.getElementById("playerName").value = "";
  document.getElementById("nameModal").classList.add("active");
  setTimeout(() => document.getElementById("playerName").focus(), 100);
}
function hideNameModal() {
  document.getElementById("nameModal").classList.remove("active");
}

function initGame() {
  score = 0; lines = 0;
  gameOver = false; running = true;
  board = Array.from({length: ROWS}, () => Array(COLS).fill(null));
  pos = {x: 3, y: 0};
  current = next || randomTetromino();
  next = randomTetromino();
  updateScoreUI();
  drawNext();
  draw();
  lastDrop = Date.now();
  requestAnimationFrame(tick);
}

function tick() {
  if (!running) return;
  let now = Date.now();
  if (now - lastDrop > dropInterval) {
    if (!tryMove(0, 1)) {
      merge();
      clearLines();
      resetCurrent();
    }
    lastDrop = now;
  }
  draw();
  requestAnimationFrame(tick);
}

function updateScoreUI() {
  document.getElementById("score").textContent = score;
  document.getElementById("lines").textContent = lines;
  document.getElementById("widthValue").textContent = COLS;
}

function resetCurrent() {
  current = next;
  next = randomTetromino();
  pos = {x: 3, y: 0};
  drawNext();
  if (collide(pos.x, pos.y, current.shape)) {
    endGame();
  }
}

function endGame() {
  gameOver = true;
  running = false;
  if (currentPlayerName && score > 0) {
    saveScore(currentPlayerName, score);
  }
  setTimeout(() => showMainMenu(), 1000);
}

// Draw grid and border for the glass (playfield)
function drawGridAndGlass() {
  // Draw background grid
  ctx.save();
  // Draw the glass border ("glass" is the playfield)
  ctx.strokeStyle = "#7cffb1";
  ctx.lineWidth = 3;
  ctx.shadowColor = "#00f2ea";
  ctx.shadowBlur = 12;
  ctx.strokeRect(0.5, 0.5, COLS * BLOCK - 1, ROWS * BLOCK - 1);
  ctx.shadowBlur = 0;

  // Draw grid lines
  ctx.strokeStyle = "#3ca6a655";
  ctx.lineWidth = 1;
  for (let x = 1; x < COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * BLOCK + 0.5, 0);
    ctx.lineTo(x * BLOCK + 0.5, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let y = 1; y < ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * BLOCK + 0.5);
    ctx.lineTo(COLS * BLOCK, y * BLOCK + 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw glass/grid first
  drawGridAndGlass();

  // Then draw the placed blocks
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++)
      if (board[y][x]) drawBlock(ctx, x, y, board[y][x]);
  // Draw the falling Tetromino
  for (const [dx, dy] of current.shape) {
    const x = pos.x + dx, y = pos.y + dy;
    if (y >= 0) drawBlock(ctx, x, y, current.color, true);
  }
}

function drawBlock(context, x, y, color, active=false) {
  context.save();
  context.shadowColor = color;
  context.shadowBlur = active ? 18 : 10;
  context.fillStyle = color;
  context.fillRect(x * BLOCK + 1, y * BLOCK + 1, BLOCK - 2, BLOCK - 2);
  context.strokeStyle = "#fff7";
  context.lineWidth = 2;
  context.strokeRect(x * BLOCK + 2, y * BLOCK + 2, BLOCK - 4, BLOCK - 4);
  context.restore();
}

function drawNext() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const color = next.color;

  // Compute bounding box for the shape
  let minX = Math.min(...shape.map(([x]) => x)), maxX = Math.max(...shape.map(([x]) => x));
  let minY = Math.min(...shape.map(([, y]) => y)), maxY = Math.max(...shape.map(([, y]) => y));
  let shapeW = maxX - minX + 1, shapeH = maxY - minY + 1;

  // Scale block size to fit preview (use up to 22px, fallback to 24 if small)
  const previewSize = Math.min(nextCanvas.width, nextCanvas.height);
  const margin = 12;
  const cell = Math.floor((previewSize - margin * 2) / Math.max(shapeW, shapeH));
  // Center the piece
  const offsetX = Math.floor((previewSize - cell * shapeW) / 2) - minX * cell;
  const offsetY = Math.floor((previewSize - cell * shapeH) / 2) - minY * cell;

  for (const [dx, dy] of shape) {
    const px = dx * cell + offsetX;
    const py = dy * cell + offsetY;
    nextCtx.save();
    nextCtx.shadowColor = color;
    nextCtx.shadowBlur = 14;
    nextCtx.fillStyle = color;
    nextCtx.fillRect(px + 1, py + 1, cell - 2, cell - 2);
    nextCtx.strokeStyle = "#fff7";
    nextCtx.lineWidth = 2;
    nextCtx.strokeRect(px + 2, py + 2, cell - 4, cell - 4);
    nextCtx.restore();
  }
}

function randomTetromino() {
  const t = TETROMINOES[Math.floor(Math.random() * TETROMINOES.length)];
  return { shape: t.shape.map(([x, y]) => [x, y]), color: t.color };
}

function collide(px, py, shape) {
  for (const [dx, dy] of shape) {
    const x = px + dx, y = py + dy;
    if (x < 0 || x >= COLS || y >= ROWS || (y >= 0 && board[y][x])) return true;
  }
  return false;
}

function tryMove(dx, dy, newShape = null) {
  const testX = pos.x + dx;
  const testY = pos.y + dy;
  const shape = newShape || current.shape;
  if (!collide(testX, testY, shape)) {
    pos.x = testX;
    pos.y = testY;
    if (newShape) current.shape = shape;
    return true;
  }
  return false;
}

function merge() {
  for (const [dx, dy] of current.shape) {
    const x = pos.x + dx, y = pos.y + dy;
    if (y >= 0) board[y][x] = current.color;
  }
}

function clearLines() {
  let cleared = 0;
  for (let y = ROWS - 1; y >= 0; y--) {
    if (board[y].every(cell => cell)) {
      board.splice(y, 1);
      board.unshift(Array(COLS).fill(null));
      cleared++;
      y++;
    }
  }
  if (cleared) {
    score += cleared * 100;
    lines += cleared;
    updateScoreUI();
  }
}

function saveScore(name, score) {
  let arr = JSON.parse(localStorage.getItem("tetris_scores") || "[]");
  arr.push({ name, score });
  arr = arr.sort((a,b) => b.score - a.score).slice(0, 10);
  localStorage.setItem("tetris_scores", JSON.stringify(arr));
}

function renderScoreboard() {
  let arr = JSON.parse(localStorage.getItem("tetris_scores") || "[]");
  arr = arr.sort((a, b) => b.score - a.score).slice(0, 10); // Top 10, highest first
  const tbody = document.getElementById("scoreboardTableBody");
  tbody.innerHTML = "";
  for (let i = 0; i < 10; i++) {
    let entry = arr[i];
    const tr = document.createElement("tr");
    if (i === 0) tr.classList.add("top1");
    else if (i === 1) tr.classList.add("top2");
    else if (i === 2) tr.classList.add("top3");
    tr.innerHTML = `<td>${i + 1}</td><td>${entry ? entry.name || "—" : "—"}</td><td>${entry ? entry.score || "—" : "—"}</td>`;
    tbody.appendChild(tr);
  }
}

// --- UI Handlers ---
document.getElementById("playBtn").onclick = () => {
  showNameModal();
};

document.getElementById("nameDoneBtn").onclick = () => {
  const name = document.getElementById("playerName").value.trim();
  if (name.length < 2) {
    document.getElementById("nameError").textContent = "Name too short.";
    return;
  }
  document.getElementById("nameError").textContent = "";
  currentPlayerName = name;
  hideNameModal();
  showGame();
  initGame();
};

document.getElementById("restartBtn").onclick = () => {
  initGame();
};

document.getElementById("backBtn").onclick = () => {
  running = false;
  showMainMenu();
};

document.addEventListener("keydown", e => {
  if (!running) return;
  switch (e.key) {
    case "ArrowLeft": tryMove(-1, 0); break;
    case "ArrowRight": tryMove(1, 0); break;
    case "ArrowDown": tryMove(0, 1); break;
    case "ArrowUp": {
      const rotated = rotate(current.shape);
      if (!tryMove(0, 0, rotated)) {
        tryMove(-1, 0, rotated) || tryMove(1, 0, rotated);
      }
      break;
    }
    case " ": {
      while (tryMove(0, 1)) {}
      merge();
      clearLines();
      resetCurrent();
      draw();
      break;
    }
  }
});

function rotate(shape) {
  return shape.map(([x, y]) => [y, -x]);
}

window.onload = () => {
  canvas = document.getElementById("game-canvas");
  ctx = canvas.getContext("2d");
  nextCanvas = document.getElementById("next-canvas");
  nextCtx = nextCanvas.getContext("2d");
  renderScoreboard();
  showMainMenu();
  // Display initial width value
  if (document.getElementById("widthValue")) {
    document.getElementById("widthValue").textContent = COLS;
  }
};