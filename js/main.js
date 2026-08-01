/* ================================================
   MANU MYTHIL MURALEE — PORTFOLIO JS
   Smooth GSAP-like animations via IntersectionObserver
   ================================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ---------- LOADING SCREEN ----------
  const loader = document.querySelector('.loader');
  if (loader) {
    const loaderText = loader.querySelector('.loader__text');
    if (loaderText) {
      const text = loaderText.textContent;
      loaderText.innerHTML = '';
      [...text].forEach((char, i) => {
        const span = document.createElement('span');
        span.textContent = char === ' ' ? '\u00A0' : char;
        span.style.animationDelay = `${0.3 + i * 0.04}s`;
        loaderText.appendChild(span);
      });
    }

    setTimeout(() => {
      loader.classList.add('hidden');
      document.body.style.overflow = '';
      initAnimations();
    }, 1800);
  } else {
    initAnimations();
  }

  // ---------- HEADER SCROLL ----------
  const header = document.querySelector('.header');
  if (header) {
    let lastScroll = 0;
    window.addEventListener('scroll', () => {
      const currentScroll = window.scrollY;
      if (currentScroll > 60) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
      lastScroll = currentScroll;
    }, { passive: true });
  }

  // ---------- HAMBURGER TOGGLE ----------
  const hamburger = document.querySelector('.hamburger');
  const mobileNav = document.querySelector('.mobile-nav');
  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => {
      const isOpen = hamburger.classList.toggle('open');
      mobileNav.classList.toggle('open');
      hamburger.setAttribute('aria-expanded', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    // Close on link click
    mobileNav.querySelectorAll('.mobile-nav__link').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        mobileNav.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileNav.classList.contains('open')) {
        hamburger.classList.remove('open');
        mobileNav.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });
  }

  // ---------- ACTIVE NAV LINK ----------
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav__link, .mobile-nav__link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  // ---------- CUSTOM CURSOR ----------
  const cursorDot = document.querySelector('.cursor-dot');
  const cursorRing = document.querySelector('.cursor-ring');

  if (cursorDot && cursorRing && window.matchMedia('(pointer: fine)').matches) {
    cursorDot.style.display = 'block';
    cursorRing.style.display = 'block';

    let mouseX = 0, mouseY = 0;
    let ringX = 0, ringY = 0;

    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      cursorDot.style.left = `${mouseX - 4}px`;
      cursorDot.style.top = `${mouseY - 4}px`;
    });

    function animateRing() {
      ringX += (mouseX - ringX) * 0.12;
      ringY += (mouseY - ringY) * 0.12;
      cursorRing.style.left = `${ringX - 16}px`;
      cursorRing.style.top = `${ringY - 16}px`;
      requestAnimationFrame(animateRing);
    }
    animateRing();

    // Expand on hover over links and buttons
    document.querySelectorAll('a, button, .card, .btn, .tool-card, .framework-step, .journey-stop, .writing-card').forEach(el => {
      el.addEventListener('mouseenter', () => {
        cursorRing.style.width = '48px';
        cursorRing.style.height = '48px';
        cursorRing.style.left = `${ringX - 24}px`;
        cursorRing.style.top = `${ringY - 24}px`;
      });
      el.addEventListener('mouseleave', () => {
        cursorRing.style.width = '32px';
        cursorRing.style.height = '32px';
      });
    });
  }

  // ---------- SMOOTH SCROLL FOR ANCHOR LINKS ----------
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // ---------- COUNTER ANIMATION ----------
  function animateCounters() {
    document.querySelectorAll('[data-count]').forEach(el => {
      if (el.dataset.animated) return; // Don't re-animate
      el.dataset.animated = 'true';

      const target = parseFloat(el.dataset.count);
      const prefix = el.dataset.prefix || '';
      const suffix = el.dataset.suffix || '';
      const decimals = el.dataset.decimals ? parseInt(el.dataset.decimals) : 0;
      const duration = 2000;
      const start = performance.now();

      function update(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 4); // ease-out quart
        const current = (target * eased).toFixed(decimals);
        el.textContent = `${prefix}${current}${suffix}`;
        if (progress < 1) requestAnimationFrame(update);
      }

      requestAnimationFrame(update);
    });
  }

  // ---------- SCROLL REVEAL ANIMATIONS ----------
  function initAnimations() {
    const reveals = document.querySelectorAll('.reveal, .stagger-children');

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');

            // Trigger counter animation if stats become visible
            if (entry.target.querySelector('[data-count]')) {
              animateCounters();
            }

            observer.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      });

      reveals.forEach(el => observer.observe(el));
    } else {
      // Fallback: show everything
      reveals.forEach(el => el.classList.add('visible'));
    }

    // Immediately reveal hero elements
    document.querySelectorAll('.hero .reveal').forEach((el, i) => {
      setTimeout(() => el.classList.add('visible'), 200 + i * 150);
    });
  }

  // ---------- TEXT SPLIT ANIMATION (for hero) ----------
  document.querySelectorAll('.text-split').forEach(el => {
    const text = el.textContent;
    el.innerHTML = '';
    const words = text.split(' ');
    words.forEach((word, wi) => {
      const wordSpan = document.createElement('span');
      wordSpan.style.display = 'inline-block';
      wordSpan.style.overflow = 'hidden';

      const inner = document.createElement('span');
      inner.textContent = word;
      inner.style.display = 'inline-block';
      inner.style.transform = 'translateY(110%)';
      inner.style.transition = `transform 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${0.1 + wi * 0.05}s`;

      wordSpan.appendChild(inner);
      el.appendChild(wordSpan);

      if (wi < words.length - 1) {
        const space = document.createTextNode('\u00A0');
        el.appendChild(space);
      }
    });

    setTimeout(() => {
      el.querySelectorAll('span > span').forEach(inner => {
        inner.style.transform = 'translateY(0)';
      });
    }, 1900);
  });

  // ---------- PARALLAX EFFECT ----------
  const parallaxElements = document.querySelectorAll('[data-parallax]');
  if (parallaxElements.length > 0) {
    window.addEventListener('scroll', () => {
      parallaxElements.forEach(el => {
        const speed = parseFloat(el.dataset.parallax) || 0.5;
        const scrolled = window.scrollY;
        const yPos = -(scrolled * speed);
        el.style.transform = `translateY(${yPos}px)`;
      });
    }, { passive: true });
  }

  // ---------- WRITING FILTER ----------
  const filterBtns = document.querySelectorAll('.filter-btn');
  const writingCards = document.querySelectorAll('.writing-card');

  if (filterBtns.length > 0 && writingCards.length > 0) {
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        // Update active state
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const filter = btn.dataset.filter;

        writingCards.forEach(card => {
          const categories = card.dataset.category || '';
          if (filter === 'all' || categories.includes(filter)) {
            card.style.display = '';
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
              });
            });
          } else {
            card.style.opacity = '0';
            card.style.transform = 'translateY(10px)';
            setTimeout(() => {
              card.style.display = 'none';
            }, 300);
          }
        });
      });
    });
  }

  // ---------- CONTACT FORM ----------
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();

      // Get form data
      const formData = new FormData(contactForm);
      const name = formData.get('name');

      // Simulate form submission
      const submitBtn = contactForm.querySelector('[type="submit"]');
      const originalText = submitBtn.innerHTML;
      submitBtn.innerHTML = 'Sending... <span class="btn__arrow">⟳</span>';
      submitBtn.disabled = true;

      setTimeout(() => {
        // Replace form with success message
        contactForm.innerHTML = `
          <div class="form-success visible">
            <span class="form-success__icon">✓</span>
            <h3 class="t-h3" style="margin-bottom: 0.5rem;">Message sent!</h3>
            <p class="t-body">Thanks ${name}, I'll get back to you shortly.</p>
          </div>
        `;
      }, 1500);
    });
  }

  // ---------- SMOOTH PAGE TRANSITIONS ----------
  // Add a subtle fade-in on page load
  document.body.style.opacity = '0';
  document.body.style.transition = 'opacity 0.4s ease';
  requestAnimationFrame(() => {
    document.body.style.opacity = '1';
  });

});
