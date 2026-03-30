/* ReliaDB — Main JS */

// --- Nav scroll effect ---
const navbar = document.getElementById('navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  });
}

// --- Mobile nav toggle ---
const toggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
if (toggle && navLinks) {
  toggle.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
  });
  // Close on link click
  navLinks.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => navLinks.classList.remove('open'));
  });
}

// --- Services dropdown toggle (mobile + keyboard) ---
document.querySelectorAll('.nav-dropdown > .dropdown-toggle').forEach(toggleLink => {
  toggleLink.addEventListener('click', (e) => {
    const li = toggleLink.closest('.nav-dropdown');
    if (!li) return;

    const isMobileMenu = navLinks?.classList.contains('open') || window.matchMedia('(max-width: 880px)').matches;
    if (!isMobileMenu) return; // desktop uses hover/focus

    e.preventDefault();
    li.classList.toggle('open');
  });
});

// --- Active nav link (supports Services submenu hashes) ---
const currentPage = location.pathname.split('/').filter(Boolean).pop() || 'index.html';
const currentHash = location.hash || '';

const navAnchors = Array.from(document.querySelectorAll('.nav-links a'));
navAnchors.forEach(a => a.classList.remove('active'));

navAnchors.forEach(a => {
  const href = a.getAttribute('href');
  if (!href) return;
  if (href.startsWith('mailto:') || href.startsWith('http')) return;

  let linkPage = '';
  let linkHash = '';

  try {
    const url = new URL(href, window.location.href);
    linkPage = url.pathname.split('/').filter(Boolean).pop() || 'index.html';
    linkHash = url.hash || '';
  } catch {
    const parts = href.split('#');
    linkPage = (parts[0] || '').split('/').filter(Boolean).pop() || 'index.html';
    linkHash = parts[1] ? `#${parts[1]}` : '';
  }

  if (linkPage !== currentPage) return;

  // If link targets a section hash, only mark active when hash matches
  if (linkHash) {
    if (linkHash === currentHash) a.classList.add('active');
    return;
  }

  // No hash: mark active for the page-level nav item.
  // For Services page with a hash, keep the main Services link highlighted
  // while the submenu highlights the specific section.
  if (currentHash && (href.endsWith('services.html') || href.endsWith('/services.html'))) {
    a.classList.add('active');
    return;
  }

  if (!currentHash) a.classList.add('active');
});

// --- Scroll reveal (down + up) ---
const revealTargets = document.querySelectorAll(
  '.section, .service-full, .case-study-section, .about-section, .what-happens, .results-metrics, .contact-main, .blog-main, .addons-section, .guarantee-section, .cta-bottom, .cta-about, .cta-section'
);

if (revealTargets.length) {
  revealTargets.forEach(el => el.classList.add('scroll-reveal'));

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
      } else {
        entry.target.classList.remove('is-visible');
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -8% 0px'
  });

  revealTargets.forEach(el => revealObserver.observe(el));
}

// --- Form handling ---
const form = document.getElementById('contactForm');
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('[type="submit"]');
    const orig = btn.textContent;
    btn.textContent = 'Sending…';
    btn.disabled = true;
    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      });
      if (res.ok) {
        form.innerHTML = `<div style="text-align:center;padding:40px 0">
          <div style="font-size:3rem;margin-bottom:16px">✅</div>
          <h3 style="color:var(--primary)">Message sent!</h3>
          <p style="color:var(--text-lt);margin-top:8px">I'll be in touch within 4 hours during business hours.</p>
        </div>`;
      } else {
        throw new Error('Failed');
      }
    } catch {
      btn.textContent = orig;
      btn.disabled = false;
      alert('Something went wrong. Please email mughees@reliadb.com directly.');
    }
  });
}

// --- Smooth scroll for anchor links ---
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
