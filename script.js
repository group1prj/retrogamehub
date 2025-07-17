
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const timerElement = document.getElementById('timer');
const restartBtn = document.getElementById('restartBtn');
const themeSelect = document.getElementById('themeSelect');

// Game settings
const gridSize = 20;
const tileCount = canvas.width / gridSize;
const winScore = 200; // Win condition

let snake = [
  {x: 10, y: 10}
];
let food = {};
let dx = 1;
let dy = 0;
let score = 0;
let gameTime = 0;
let gameInterval;
let timerInterval;
let gameRunning = false;
let currentTheme = 'classic';

// Themes
const themes = {
  classic: {
    background: 'black',
    snake: 'lime',
    food: 'red',
    border: 'white'
  },
  neon: {
    background: '#0a0a0a',
    snake: '#00ffff',
    food: '#ff00ff',
    border: '#00ffff'
  },
  forest: {
    background: '#1a4a1a',
    snake: '#90EE90',
    food: '#ff4444',
    border: '#228B22'
  },
  ocean: {
    background: '#001f3f',
    snake: '#7FDBFF',
    food: '#FF851B',
    border: '#0074D9'
  }
};

// Sound effects
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playSound(frequency, duration, type = 'sine') {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = frequency;
  oscillator.type = type;
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
}

// Generate random food position
function randomFood() {
  food = {
    x: Math.floor(Math.random() * tileCount),
    y: Math.floor(Math.random() * tileCount)
  };
  
  // Make sure food doesn't spawn on snake
  for (let part of snake) {
    if (part.x === food.x && part.y === food.y) {
      randomFood();
      break;
    }
  }
}

// Draw game elements
function drawGame() {
  const theme = themes[currentTheme];
  
  // Clear canvas
  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw snake with glow effect
  ctx.shadowColor = theme.snake;
  ctx.shadowBlur = 10;
  ctx.fillStyle = theme.snake;
  for (let i = 0; i < snake.length; i++) {
    const part = snake[i];
    const alpha = i === 0 ? 1 : Math.max(0.3, 1 - (i * 0.1));
    ctx.globalAlpha = alpha;
    ctx.fillRect(part.x * gridSize + 1, part.y * gridSize + 1, gridSize - 2, gridSize - 2);
  }
  
  // Draw food with pulsing effect
  ctx.globalAlpha = 0.7 + 0.3 * Math.sin(Date.now() * 0.01);
  ctx.fillStyle = theme.food;
  ctx.fillRect(food.x * gridSize + 1, food.y * gridSize + 1, gridSize - 2, gridSize - 2);
  
  // Reset shadow and alpha
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  
  // Update canvas border color
  canvas.style.borderColor = theme.border;
}

// Move snake
function moveSnake() {
  const head = {x: snake[0].x + dx, y: snake[0].y + dy};
  
  snake.unshift(head);
  
  // Check if food eaten
  if (head.x === food.x && head.y === food.y) {
    score += 10;
    scoreElement.textContent = 'Score: ' + score;
    playSound(880, 0.1); // Eat sound
    randomFood();
    
    // Check win condition
    if (score >= winScore) {
      winGame();
      return;
    }
  } else {
    snake.pop();
  }
}

// Check collisions
function checkCollision() {
  const head = snake[0];
  
  // Wall collision
  if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
    return true;
  }
  
  // Self collision
  for (let i = 1; i < snake.length; i++) {
    if (head.x === snake[i].x && head.y === snake[i].y) {
      return true;
    }
  }
  
  return false;
}

// Game loop
function gameLoop() {
  if (checkCollision()) {
    gameOver();
    return;
  }
  
  moveSnake();
  drawGame();
}

// Game over
function gameOver() {
  gameRunning = false;
  clearInterval(gameInterval);
  clearInterval(timerInterval);
  playSound(220, 0.5, 'sawtooth'); // Game over sound
  
  setTimeout(() => {
    alert(`Game Over! Score: ${score}\nTime: ${formatTime(gameTime)}`);
    showRestartButton();
  }, 100);
}

// Win game
function winGame() {
  gameRunning = false;
  clearInterval(gameInterval);
  clearInterval(timerInterval);
  playSound(660, 0.3); // Win sound 1
  setTimeout(() => playSound(880, 0.3), 150); // Win sound 2
  setTimeout(() => playSound(1100, 0.5), 300); // Win sound 3
  
  setTimeout(() => {
    alert(`🎉 Congratulations! You Won! 🎉\nScore: ${score}\nTime: ${formatTime(gameTime)}`);
    showRestartButton();
  }, 100);
}

// Start game
function startGame() {
  snake = [{x: 10, y: 10}];
  dx = 1;
  dy = 0;
  score = 0;
  gameTime = 0;
  gameRunning = true;
  
  scoreElement.textContent = 'Score: 0';
  timerElement.textContent = 'Time: 00:00';
  
  randomFood();
  drawGame();
  
  gameInterval = setInterval(gameLoop, 180);
  timerInterval = setInterval(updateTimer, 1000);
  
  hideRestartButton();
}

// Update timer
function updateTimer() {
  if (gameRunning) {
    gameTime++;
    timerElement.textContent = 'Time: ' + formatTime(gameTime);
  }
}

// Format time
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Show/hide restart button
function showRestartButton() {
  restartBtn.style.display = 'block';
  restartBtn.classList.add('show');
}

function hideRestartButton() {
  restartBtn.style.display = 'none';
  restartBtn.classList.remove('show');
}

// Change theme
function changeTheme(theme) {
  currentTheme = theme;
  document.body.className = `theme-${theme}`;
  if (gameRunning || snake.length > 1) {
    drawGame();
  }
}

// Handle keyboard input
document.addEventListener('keydown', (e) => {
  if (!gameRunning) return;
  
  // Prevent reverse direction
  if (e.key === 'ArrowUp' && dy !== 1) {
    dx = 0;
    dy = -1;
    playSound(440, 0.05); // Direction change sound
  } else if (e.key === 'ArrowDown' && dy !== -1) {
    dx = 0;
    dy = 1;
    playSound(440, 0.05);
  } else if (e.key === 'ArrowLeft' && dx !== 1) {
    dx = -1;
    dy = 0;
    playSound(440, 0.05);
  } else if (e.key === 'ArrowRight' && dx !== -1) {
    dx = 1;
    dy = 0;
    playSound(440, 0.05);
  }
  
  e.preventDefault();
});

// Event listeners
restartBtn.addEventListener('click', startGame);
themeSelect.addEventListener('change', (e) => changeTheme(e.target.value));

// Initialize game
changeTheme('classic');
startGame();
