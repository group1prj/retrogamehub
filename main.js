// Initialize AOS animations
AOS.init({ duration: 800, once: true });

// Optional: Add fun retro sound effect on button click
document.querySelectorAll('.pixel-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    // Play retro click sound if desired (requires a small .mp3 in assets)
    // let audio = new Audio('assets/sounds/click.mp3');
    // audio.play();
  });
});