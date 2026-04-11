/* ReliaDB — Main JS */

// --- Nav scroll effect ---
const navbar = document.getElementById('navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
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

// --- Header search (magnifier → inline field; GET /search/?q= for Pagefind) ---
// Bind on trigger + panel only; input is queried lazily so a missing id cannot block the whole feature.
const navSearchTrigger = document.getElementById('navSearchTrigger');
const navSearchExpand = document.getElementById('navSearchExpand');
const navSearchExit = document.getElementById('navSearchExit');
function getNavSearchInput() {
  return (
    document.getElementById('navSearchQuery') ||
    (navSearchExpand && navSearchExpand.querySelector('input[name="q"]'))
  );
}
if (navbar && navSearchTrigger && navSearchExpand) {
  function openNavSearch() {
    navbar.classList.add('nav-search-open');
    navSearchTrigger.setAttribute('aria-expanded', 'true');
    navSearchExpand.removeAttribute('hidden');
    navSearchExpand.style.display = 'flex';
    if (navLinks) navLinks.classList.remove('open');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
    const input = getNavSearchInput();
    if (input) {
      requestAnimationFrame(() => {
        try {
          input.focus();
        } catch (_) {
          /* focus can fail if still not visible in some browsers */
        }
      });
    }
  }
  function closeNavSearch() {
    navbar.classList.remove('nav-search-open');
    navSearchTrigger.setAttribute('aria-expanded', 'false');
    navSearchExpand.setAttribute('hidden', '');
    navSearchExpand.style.display = '';
    const input = getNavSearchInput();
    if (input) input.value = '';
  }
  navSearchTrigger.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!navbar.classList.contains('nav-search-open')) openNavSearch();
  });
  if (navSearchExit) navSearchExit.addEventListener('click', closeNavSearch);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navbar.classList.contains('nav-search-open')) closeNavSearch();
  });
  const inputForKeys = getNavSearchInput();
  if (inputForKeys) {
    inputForKeys.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeNavSearch();
      }
    });
  }
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
// Use full pathname (not only the last segment) so /search/index.html ≠ /index.html.
function normalizePathname(pathname) {
  if (!pathname || pathname === '/') return '/index.html';
  const p = pathname.replace(/\/$/, '');
  if (!p.endsWith('.html')) return `${p}/index.html`;
  return p;
}
const currentPath = normalizePathname(location.pathname);
const currentHash = location.hash || '';

const navAnchors = Array.from(document.querySelectorAll('.nav-links a'));
navAnchors.forEach(a => a.classList.remove('active'));

navAnchors.forEach(a => {
  const href = a.getAttribute('href');
  if (!href) return;
  if (href.startsWith('mailto:') || href.startsWith('http')) return;

  let linkPath = '';
  let linkHash = '';

  try {
    const url = new URL(href, window.location.href);
    linkPath = normalizePathname(url.pathname);
    linkHash = url.hash || '';
  } catch {
    const parts = href.split('#');
    linkHash = parts[1] ? `#${parts[1]}` : '';
    try {
      linkPath = normalizePathname(new URL(parts[0] || '.', window.location.href).pathname);
    } catch {
      linkPath = '';
    }
  }

  if (linkPath !== currentPath) return;

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
  '.section, .service-full, .case-study-section, .about-section, .what-happens, .results-metrics, .contact-main, .search-page-main, .addons-section, .guarantee-section, .cta-bottom, .cta-about, .cta-section'
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
      alert('Something went wrong. Please email support@reliadb.com directly.');
    }
  });
}

// --- Smooth scroll for anchor links ---
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const href = a.getAttribute('href');
    if (!href || href.length < 2) return;
    let target;
    try {
      target = document.querySelector(href);
    } catch {
      return;
    }
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
