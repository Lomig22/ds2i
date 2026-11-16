/* ==========================================================================
   DS2I — Scripts du site (JavaScript vanilla, sans dépendance)
   ========================================================================== */

/* --------------------------------------------------------------------------
   CONFIGURATION
   -------------------------------------------------------------------------- */

/**
 * Adresse d'envoi des données du formulaire « Guide gratuit ».
 * - Formspree : 'https://formspree.io/f/XXXXXXXX'
 * - Webhook Make : 'https://hook.eu2.make.com/XXXXXXXX'
 * Laisser vide ('') pour déclencher uniquement le téléchargement du PDF.
 */
const FORM_ENDPOINT = '';

/** Lien Calendly de l'audit offert. */
const CALENDLY_URL = 'https://calendly.com/s-kittler/30min';

/** Chemin du guide PDF. */
const GUIDE_PDF = '/assets/DS2I_Guide_10_questions_cyberattaque.pdf';

/** Scripts officiels du widget Calendly. */
const CALENDLY_JS = 'https://assets.calendly.com/assets/external/widget.js';
const CALENDLY_CSS = 'https://assets.calendly.com/assets/external/widget.css';

/** Délai max (ms) d'attente du script Calendly avant repli sur le lien direct. */
const CALENDLY_TIMEOUT = 2500;

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* --------------------------------------------------------------------------
   1. CALENDLY : popup officiel, chargé à la demande
   Le script n'est chargé qu'au survol/focus/clic d'un bouton (aucun appel
   à Calendly avant une intention de l'utilisateur : performance + RGPD).
   Si le script ne charge pas, on ouvre le lien Calendly directement.
   -------------------------------------------------------------------------- */
let calendlyPromise = null;

function loadCalendly() {
  if (window.Calendly) return Promise.resolve();
  if (calendlyPromise) return calendlyPromise;

  calendlyPromise = new Promise((resolve, reject) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = CALENDLY_CSS;
    document.head.appendChild(css);

    const script = document.createElement('script');
    script.src = CALENDLY_JS;
    script.async = true;
    script.onload = () => (window.Calendly ? resolve() : reject());
    script.onerror = () => {
      calendlyPromise = null; // permet une nouvelle tentative plus tard
      reject();
    };
    document.head.appendChild(script);
  });
  return calendlyPromise;
}

function openCalendlyPopup(url) {
  window.Calendly.initPopupWidget({ url });
}

function initCalendly() {
  const buttons = document.querySelectorAll('.js-calendly');

  buttons.forEach((btn) => {
    // Préchargement discret dès que l'utilisateur montre une intention
    const preload = () => loadCalendly().catch(() => {});
    btn.addEventListener('pointerenter', preload, { once: true });
    btn.addEventListener('focus', preload, { once: true });
    btn.addEventListener('touchstart', preload, { once: true, passive: true });

    btn.addEventListener('click', (event) => {
      // Ctrl/Cmd + clic : on laisse le navigateur ouvrir un nouvel onglet
      if (event.metaKey || event.ctrlKey || event.shiftKey) return;

      const url = btn.getAttribute('href') || CALENDLY_URL;
      event.preventDefault();
      closeMenu();

      if (window.Calendly) {
        openCalendlyPopup(url);
        return;
      }

      // Repli : si Calendly ne répond pas à temps, on ouvre le lien direct
      let done = false;
      const fallback = setTimeout(() => {
        done = true;
        window.location.href = url;
      }, CALENDLY_TIMEOUT);

      loadCalendly()
        .then(() => {
          if (done) return;
          clearTimeout(fallback);
          openCalendlyPopup(url);
        })
        .catch(() => {
          if (done) return;
          clearTimeout(fallback);
          window.location.href = url;
        });
    });
  });
}

/* --------------------------------------------------------------------------
   2. EN-TÊTE : ombre au défilement + menu burger mobile
   -------------------------------------------------------------------------- */
const header = document.querySelector('.site-header');
const navToggle = document.querySelector('.nav-toggle');
const nav = document.getElementById('menu-principal');

function closeMenu() {
  if (!nav || !nav.classList.contains('is-open')) return;
  nav.classList.remove('is-open');
  navToggle.setAttribute('aria-expanded', 'false');
  navToggle.querySelector('.visually-hidden').textContent = 'Ouvrir le menu';
  document.body.classList.remove('nav-open');
}

function openMenu() {
  nav.classList.add('is-open');
  navToggle.setAttribute('aria-expanded', 'true');
  navToggle.querySelector('.visually-hidden').textContent = 'Fermer le menu';
  document.body.classList.add('nav-open');
  const firstLink = nav.querySelector('a');
  if (firstLink) firstLink.focus();
}

function initNav() {
  if (!navToggle || !nav) return;

  navToggle.addEventListener('click', () => {
    nav.classList.contains('is-open') ? closeMenu() : openMenu();
  });

  // Fermeture au clic sur un lien d'ancre
  nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));

  // Fermeture avec Échap, retour du focus sur le bouton
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav.classList.contains('is-open')) {
      closeMenu();
      navToggle.focus();
    }
  });

  // Si on repasse en affichage ordinateur, on réinitialise le menu
  window.matchMedia('(min-width: 1100px)').addEventListener('change', closeMenu);
}

function initHeaderScroll() {
  if (!header) return;
  const update = () => header.classList.toggle('is-scrolled', window.scrollY > 10);
  update();
  window.addEventListener('scroll', update, { passive: true });
}

/* --------------------------------------------------------------------------
   3. APPARITIONS AU DÉFILEMENT + compteurs des chiffres clés
   -------------------------------------------------------------------------- */
function animateCount(el) {
  const target = parseInt(el.dataset.count, 10);
  if (!target || prefersReducedMotion) return;

  const format = new Intl.NumberFormat('fr-FR');
  const duration = 1400;
  const start = performance.now();

  const step = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = format.format(Math.round(target * eased)).replace(/ /g, ' ');
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function initReveal() {
  const items = document.querySelectorAll('.reveal');
  const counters = document.querySelectorAll('.js-count');

  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      entry.target.querySelectorAll('.js-count').forEach(animateCount);
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

  items.forEach((el) => observer.observe(el));

  // Compteurs hors bloc « reveal » (sécurité)
  counters.forEach((el) => {
    if (!el.closest('.reveal')) animateCount(el);
  });
}

/* --------------------------------------------------------------------------
   4. BOUTON COLLANT MOBILE : visible après l'en-tête de page, masqué près du CTA final
   -------------------------------------------------------------------------- */
function initStickyCta() {
  const sticky = document.querySelector('.sticky-cta');
  const hero = document.querySelector('.hero, .page-hero, .legal');
  const hideZones = document.querySelectorAll('#guide, #audit, .site-footer');
  if (!sticky || !hero || !('IntersectionObserver' in window)) return;

  let pastHero = false;
  const zonesInView = new Set();
  const update = () => sticky.classList.toggle('is-visible', pastHero && zonesInView.size === 0);

  new IntersectionObserver(([entry]) => {
    pastHero = !entry.isIntersecting;
    update();
  }).observe(hero);

  const zoneObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      entry.isIntersecting ? zonesInView.add(entry.target) : zonesInView.delete(entry.target);
    });
    update();
  });
  hideZones.forEach((zone) => zoneObserver.observe(zone));
}

/* --------------------------------------------------------------------------
   5. FORMULAIRE « GUIDE GRATUIT »
   Validation accessible, envoi optionnel vers FORM_ENDPOINT,
   puis téléchargement du PDF et message de remerciement.
   -------------------------------------------------------------------------- */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function setError(input, message) {
  const error = document.getElementById(`${input.id}-erreur`);
  if (message) {
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', error.id);
  } else {
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');
  }
  if (error) error.textContent = message;
}

function validateField(input) {
  const value = input.type === 'checkbox' ? input.checked : input.value.trim();
  let message = '';

  if (input.id === 'prenom' && !value) message = 'Merci d’indiquer votre prénom.';
  if (input.id === 'entreprise' && !value) message = 'Merci d’indiquer le nom de votre entreprise.';
  if (input.id === 'email') {
    if (!value) message = 'Merci d’indiquer votre email professionnel.';
    else if (!EMAIL_REGEX.test(value)) message = 'Cette adresse email ne semble pas valide.';
  }
  if (input.id === 'consentement' && !value) message = 'Merci de cocher cette case pour recevoir le guide.';

  setError(input, message);
  return !message;
}

function downloadGuide() {
  const link = document.createElement('a');
  link.href = GUIDE_PDF;
  link.download = GUIDE_PDF.split('/').pop();
  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function sendLead(data) {
  if (!FORM_ENDPOINT) return;
  try {
    await fetch(FORM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(data),
    });
  } catch (error) {
    // L'échec de l'envoi ne doit jamais bloquer le téléchargement du guide
    console.warn('Envoi du formulaire impossible :', error);
  }
}

function initLeadForm() {
  const form = document.getElementById('lead-form');
  const success = document.getElementById('lead-success');
  if (!form) return;

  const fields = form.querySelectorAll('#prenom, #email, #entreprise, #consentement');

  // Revalidation en direct une fois qu'une erreur est affichée
  fields.forEach((input) => {
    const evt = input.type === 'checkbox' ? 'change' : 'input';
    input.addEventListener(evt, () => {
      if (input.getAttribute('aria-invalid') === 'true') validateField(input);
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    let firstInvalid = null;
    fields.forEach((input) => {
      if (!validateField(input) && !firstInvalid) firstInvalid = input;
    });
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    // Pot de miel : un robot a rempli le champ caché, on ignore silencieusement
    if (form.site_web.value) return;

    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'Préparation du guide…';

    await sendLead({
      prenom: form.prenom.value.trim(),
      email: form.email.value.trim(),
      entreprise: form.entreprise.value.trim(),
      consentement: true,
      source: 'Site DS2I — Guide 10 questions cyberattaque',
      date: new Date().toISOString(),
      page: window.location.href,
    });

    downloadGuide();
    form.hidden = true;
    success.hidden = false;
    success.focus();
  });
}

/* --------------------------------------------------------------------------
   6. DIVERS : année dynamique du copyright
   -------------------------------------------------------------------------- */
function initYear() {
  const year = String(new Date().getFullYear());
  document.querySelectorAll('.js-year').forEach((el) => { el.textContent = year; });
}

/* --------------------------------------------------------------------------
   Lancement
   -------------------------------------------------------------------------- */
initYear();
initNav();
initHeaderScroll();
initCalendly();
initReveal();
initStickyCta();
initLeadForm();
