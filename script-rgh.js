// Hamburger menu for mobile nav
document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.querySelector('.nav-links');
  const navBar = document.getElementById('navbar');
  const links = document.querySelectorAll('.nav-links a');

  hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('show');
  });

  // Sticky header effect (already sticky in CSS, but can add shadow on scroll)
  window.addEventListener('scroll', () => {
    if (window.scrollY > 30) {
      navBar.classList.add('scrolled');
    } else {
      navBar.classList.remove('scrolled');
    }
  });

  // Smooth scroll for nav links (for older browsers)
  links.forEach(link => {
    link.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href.startsWith('#')) {
        e.preventDefault();
        document.querySelector(href).scrollIntoView({ behavior: 'smooth' });
        navLinks.classList.remove('show'); // Close mobile menu
        links.forEach(l => l.classList.remove('active'));
        this.classList.add('active');
      }
    });
  });

  // Newsletter form feedback
  const newsletterForm = document.querySelector('.newsletter-form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', function(e) {
      e.preventDefault();
      alert('Thank you for subscribing to our newsletter!');
      this.reset();
    });
  }

  // Contact form AJAX submission
  const contactForm = document.querySelector('.contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
      e.preventDefault();
      const formData = new FormData(this);
      const resultDiv = document.getElementById('contact-result');
      fetch(this.action, {
        method: "POST",
        body: formData
      })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            resultDiv.style.color = "green";
            resultDiv.textContent = data.message;
            contactForm.reset();
          } else {
            resultDiv.style.color = "red";
            resultDiv.textContent = data.message;
          }
        })
        .catch(() => {
          resultDiv.style.color = "red";
          resultDiv.textContent = "Sorry, there was a problem sending your message.";
        });
    });
  }
});