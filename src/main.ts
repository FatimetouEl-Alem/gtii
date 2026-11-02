import { $, $$, setYear, prefersReducedMotion } from "./lib/dom";
import { initAuthForms } from "./lib/auth-forms";

/* ---------- Menu : lien actif selon la section visible ---------- */
function initScrollSpy(): void {
  const links = $$<HTMLAnchorElement>(".main-nav .nav-link");
  const setActive = (id: string) => {
    links.forEach((link) => {
      const active = link.getAttribute("href") === `#${id}`;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  };
  links.forEach((link) => link.addEventListener("click", () => setActive(link.hash.slice(1))));

  const sections = $$<HTMLElement>("[data-spy]");
  if (!("IntersectionObserver" in window) || !sections.length) return;
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActive(visible.target.id);
    },
    { rootMargin: "-35% 0px -55% 0px", threshold: [0, 0.25, 0.5, 1] },
  );
  sections.forEach((section) => observer.observe(section));
}

/* ---------- Carrousel des services ---------- */
function initServicesCarousel(): void {
  const grid = $("#service-grid");
  const prev = $<HTMLButtonElement>("[data-carousel-prev]");
  const next = $<HTMLButtonElement>("[data-carousel-next]");
  const dotsBox = $("[data-carousel-dots]");
  if (!grid || !prev || !next || !dotsBox) return;

  const cards = $$<HTMLElement>(".service-card", grid);
  // 3 cartes par vue sur ordinateur et tablette, 1 sur téléphone.
  const phone = window.matchMedia("(max-width: 640px)");
  let perPage = phone.matches ? 1 : 3;
  let offset = 0;
  let dots: HTMLElement[] = [];
  const maxOffset = () => Math.max(0, cards.length - perPage);

  const buildDots = () => {
    dotsBox.innerHTML = "";
    dots = Array.from({ length: maxOffset() + 1 }, () => dotsBox.appendChild(document.createElement("span")));
  };

  const render = (animate: boolean) => {
    cards.forEach((card, i) => {
      const visible = i >= offset && i < offset + perPage;
      card.hidden = !visible;
      card.classList.remove("is-entering");
      if (visible && animate && !prefersReducedMotion()) {
        void card.offsetWidth; // relance l’animation
        card.classList.add("is-entering");
      }
    });
    dots.forEach((dot, i) => dot.classList.toggle("is-active", i === offset));
    prev.disabled = offset === 0;
    next.disabled = offset >= maxOffset();
  };

  prev.addEventListener("click", () => { offset = Math.max(0, offset - 1); render(true); });
  next.addEventListener("click", () => { offset = Math.min(maxOffset(), offset + 1); render(true); });

  // Balayage tactile sur téléphone.
  let startX = 0;
  grid.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; }, { passive: true });
  grid.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) < 40) return;
    offset = dx < 0 ? Math.min(maxOffset(), offset + 1) : Math.max(0, offset - 1);
    render(true);
  });

  phone.addEventListener("change", () => {
    perPage = phone.matches ? 1 : 3;
    offset = Math.min(offset, maxOffset());
    buildDots();
    render(false);
  });

  buildDots();
  render(false);
}

/* ---------- Comment ça marche : étapes ---------- */
function initSteps(): void {
  const buttons = $$<HTMLButtonElement>(".step[data-step]");
  const panels = $$<HTMLElement>("[data-step-panel]");
  const num = $("[data-step-num]");
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const step = button.dataset.step ?? "1";
      buttons.forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
      panels.forEach((panel) => { panel.hidden = panel.dataset.stepPanel !== step; });
      if (num) num.textContent = step.padStart(2, "0");
    });
  });
}

/* ---------- Annuaire : choix du secteur ---------- */
function initSectors(): void {
  const cards = $$<HTMLButtonElement>(".sector-card[data-sector]");
  cards.forEach((card) => {
    card.addEventListener("click", () => {
      cards.forEach((c) => c.setAttribute("aria-pressed", String(c === card)));
    });
  });
  // La recherche sera reliée à l’annuaire complet : on évite pour l’instant le rechargement.
  $<HTMLFormElement>("[data-directory-search]")?.addEventListener("submit", (event) => event.preventDefault());
}

document.addEventListener("DOMContentLoaded", () => {
  setYear();
  initScrollSpy();
  initServicesCarousel();
  initSteps();
  initSectors();
  initAuthForms();
});
