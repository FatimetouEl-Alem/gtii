import { $, $$ } from "./dom";
import { api, type ApiResult } from "./api";
import { CONFIG } from "../config";
import { checkIdentifier, checkPassword, checkRequired, normalizePhone, type IdentifierMode } from "./validation";

type StatusKind = "info" | "error" | "success";

const ID_COPY: Record<"email" | "phone", { label: string; placeholder: string; type: string; autocomplete: string }> = {
  email: { label: "Adresse e-mail", placeholder: "nom@entreprise.ga", type: "email", autocomplete: "username" },
  phone: { label: "Numéro de téléphone", placeholder: "+241 0X XX XX XX", type: "tel", autocomplete: "tel" },
};

const DEMO_MESSAGE = "Mode démonstration : renseignez apiBaseUrl dans src/config.ts pour activer ce formulaire.";

/* ---------- Champs ---------- */

function fieldOf(form: HTMLFormElement, name: string): HTMLElement | null {
  return $(`[data-field="${name}"]`, form);
}

function setFieldError(form: HTMLFormElement, name: string, message: string | null): void {
  const field = fieldOf(form, name);
  if (!field) return;
  const error = $<HTMLElement>(".field__error", field);
  const input = $<HTMLInputElement>("input", field);
  field.classList.toggle("has-error", Boolean(message));
  input?.setAttribute("aria-invalid", message ? "true" : "false");
  if (error) {
    error.textContent = message ?? "";
    error.hidden = !message;
  }
}

function valueOf(form: HTMLFormElement, name: string): string {
  const input = form.elements.namedItem(name);
  return input instanceof HTMLInputElement ? input.value : "";
}

/** Valide une liste de champs, affiche les erreurs et place le focus sur la première. */
function validate(form: HTMLFormElement, rules: Array<[string, () => string | null]>): boolean {
  let first: HTMLInputElement | null = null;
  for (const [name, rule] of rules) {
    const message = rule();
    setFieldError(form, name, message);
    if (message && !first) first = $<HTMLInputElement>(`[data-field="${name}"] input`, form);
  }
  first?.focus();
  return !first;
}

/** Efface l’erreur d’un champ dès que l’utilisateur le corrige. */
function clearErrorsOnInput(form: HTMLFormElement): void {
  form.addEventListener("input", (event) => {
    const field = (event.target as HTMLElement).closest<HTMLElement>("[data-field]");
    if (field?.classList.contains("has-error")) setFieldError(form, field.dataset.field ?? "", null);
  });
}

/* ---------- Statut et chargement ---------- */

function setStatus(form: HTMLFormElement, kind: StatusKind | null, message = ""): void {
  const status = $<HTMLElement>("[data-status]", form);
  if (!status) return;
  status.className = kind ? `form-status form-status--${kind}` : "form-status";
  status.textContent = message;
  status.hidden = !kind;
}

function setBusy(form: HTMLFormElement, busy: boolean, busyLabel: string): void {
  const button = $<HTMLButtonElement>('button[type="submit"]', form);
  const label = $<HTMLElement>("[data-submit-label]", form);
  if (!button || !label) return;
  if (busy) {
    label.dataset.idleLabel = label.textContent ?? "";
    label.textContent = busyLabel;
  } else if (label.dataset.idleLabel) {
    label.textContent = label.dataset.idleLabel;
  }
  button.disabled = busy;
  button.setAttribute("aria-busy", String(busy));
}

function handleResult(form: HTMLFormElement, result: ApiResult, onSuccess: () => void): void {
  if (result.ok) onSuccess();
  else if (result.demo) setStatus(form, "info", DEMO_MESSAGE);
  else setStatus(form, "error", result.message);
}

/* ---------- Composants ---------- */

export function initPasswordToggles(root: ParentNode = document): void {
  $$<HTMLButtonElement>("[data-toggle-password]", root).forEach((button) => {
    const input = document.getElementById(button.getAttribute("aria-controls") ?? "") as HTMLInputElement | null;
    if (!input) return;
    button.addEventListener("click", () => {
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      button.setAttribute("aria-label", show ? "Masquer le mot de passe" : "Afficher le mot de passe");
      button.setAttribute("aria-pressed", String(show));
    });
  });
}

/** Bascule E-mail / Téléphone. Retourne une fonction qui lit le mode courant. */
function initIdSwitch(form: HTMLFormElement): () => IdentifierMode {
  const group = $<HTMLElement>("[data-id-switch]", form);
  if (!group) return () => "any";
  let mode: "email" | "phone" = "email";
  const label = $<HTMLElement>("[data-id-label]", form);
  const input = $<HTMLInputElement>('[data-field="identifier"] input', form);

  $$<HTMLButtonElement>("[data-mode]", group).forEach((button) => {
    button.addEventListener("click", () => {
      mode = button.dataset.mode === "phone" ? "phone" : "email";
      $$<HTMLButtonElement>("[data-mode]", group).forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
      const copy = ID_COPY[mode];
      if (label) label.textContent = copy.label;
      if (input) {
        input.type = copy.type;
        input.placeholder = copy.placeholder;
        input.autocomplete = copy.autocomplete as AutoFill;
        input.value = "";
        input.focus();
      }
      setFieldError(form, "identifier", null);
    });
  });
  return () => mode;
}

const cleanIdentifier = (value: string) => (value.includes("@") ? value.trim().toLowerCase() : normalizePhone(value));

/* ---------- Formulaires ---------- */

function initLoginForm(form: HTMLFormElement): void {
  const getMode = initIdSwitch(form);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus(form, null);
    const ok = validate(form, [
      ["identifier", () => checkIdentifier(valueOf(form, "identifier"), getMode())],
      ["password", () => checkPassword(valueOf(form, "password"))],
    ]);
    if (!ok) return;
    setBusy(form, true, "Connexion…");
    const result = await api.login(cleanIdentifier(valueOf(form, "identifier")), valueOf(form, "password"));
    setBusy(form, false, "");
    handleResult(form, result, () => {
      setStatus(form, "success", "Connexion réussie. Ouverture de votre espace…");
      window.location.assign(CONFIG.dashboardUrl);
    });
  });
}

/* ---------- Force du mot de passe ---------- */

const STRENGTH_LABELS = ["", "Faible", "Moyen", "Bon", "Excellent"];

export function passwordScore(value: string): number {
  if (!value) return 0;
  let score = value.length >= 8 ? 1 : 0;
  if (value.length >= 12) score++;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
  if (/\d/.test(value) && /[^A-Za-z0-9]/.test(value)) score++;
  return Math.max(1, Math.min(4, score));
}

function initPasswordMeter(form: HTMLFormElement): void {
  const meter = $<HTMLElement>("[data-pw-meter]", form);
  const label = $<HTMLElement>("[data-pw-label]", form);
  const input = form.elements.namedItem("password");
  if (!meter || !(input instanceof HTMLInputElement)) return;
  input.addEventListener("input", () => {
    const score = passwordScore(input.value);
    meter.dataset.score = String(score);
    if (label) label.textContent = STRENGTH_LABELS[score];
  });
}

/* ---------- Inscription en 2 étapes ---------- */

function initRegisterForm(form: HTMLFormElement): void {
  initPasswordMeter(form);
  const steps = $$<HTMLFieldSetElement>("[data-wizard-step]", form);
  const dots = $$<HTMLElement>("[data-wizard-dot]", form);
  const terms = form.elements.namedItem("terms") as HTMLInputElement | null;

  const stepOneRules: Array<[string, () => string | null]> = [
    ["firstName", () => checkRequired(valueOf(form, "firstName"), "votre prénom")],
    ["lastName", () => checkRequired(valueOf(form, "lastName"), "votre nom")],
    ["identifier", () => checkIdentifier(valueOf(form, "identifier"), "any")],
    ["password", () => checkPassword(valueOf(form, "password"), 8)],
  ];
  const stepTwoRules: Array<[string, () => string | null]> = [
    ["company", () => checkRequired(valueOf(form, "company"), "la raison sociale")],
    ["nif", () => checkRequired(valueOf(form, "nif"), "le NIF")],
    ["rccm", () => checkRequired(valueOf(form, "rccm"), "le numéro RCCM")],
    ["terms", () => (terms?.checked ? null : "Acceptez les conditions pour continuer.")],
  ];

  const goTo = (step: number) => {
    steps.forEach((fs) => { fs.hidden = fs.dataset.wizardStep !== String(step); });
    dots.forEach((dot) => {
      const n = Number(dot.dataset.wizardDot);
      dot.classList.toggle("is-active", n === step);
      dot.classList.toggle("is-done", n < step);
    });
    setStatus(form, null);
    $<HTMLInputElement>(`[data-wizard-step="${step}"] input`, form)?.focus();
  };

  $("[data-wizard-next]", form)?.addEventListener("click", () => { if (validate(form, stepOneRules)) goTo(2); });
  $("[data-wizard-back]", form)?.addEventListener("click", () => goTo(1));
  // Entrée dans un champ de l’étape 1 = « Continuer ».
  steps[0]?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.target as HTMLElement).tagName === "INPUT") {
      event.preventDefault();
      if (validate(form, stepOneRules)) goTo(2);
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus(form, null);
    if (!validate(form, stepOneRules)) { goTo(1); validate(form, stepOneRules); return; }
    if (!validate(form, stepTwoRules)) return;
    setBusy(form, true, "Création…");
    const result = await api.register({
      firstName: valueOf(form, "firstName").trim(),
      lastName: valueOf(form, "lastName").trim(),
      identifier: cleanIdentifier(valueOf(form, "identifier")),
      password: valueOf(form, "password"),
      company: valueOf(form, "company").trim(),
      nif: valueOf(form, "nif").trim(),
      rccm: valueOf(form, "rccm").trim(),
    });
    setBusy(form, false, "");
    handleResult(form, result, () => {
      setStatus(form, "success", "Compte créé. Ouverture de votre espace…");
      window.location.assign(CONFIG.dashboardUrl);
    });
  });
}

/* ---------- Mot de passe oublié ---------- */

function showResetDone(form: HTMLFormElement, done: boolean): void {
  $$<HTMLElement>("[data-reset-form]", form).forEach((el) => { el.hidden = done; });
  const panel = $<HTMLElement>("[data-reset-done]", form);
  if (panel) {
    panel.hidden = !done;
    if (done) panel.focus();
  }
}

/** Remet un formulaire dans son état initial (appelé quand la vue s’affiche). */
export function resetFormView(form: HTMLFormElement): void {
  setStatus(form, null);
  if (form.dataset.auth === "reset") showResetDone(form, false);
}

function initResetForm(form: HTMLFormElement): void {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus(form, null);
    const ok = validate(form, [["identifier", () => checkIdentifier(valueOf(form, "identifier"), "any")]]);
    if (!ok) return;
    setBusy(form, true, "Envoi…");
    const result = await api.resetPassword(cleanIdentifier(valueOf(form, "identifier")));
    setBusy(form, false, "");
    handleResult(form, result, () => {
      form.reset();
      showResetDone(form, true);
    });
  });
}

/** Active tous les formulaires `form[data-auth]` de la page. */
export function initAuthForms(root: ParentNode = document): void {
  initPasswordToggles(root);
  $$<HTMLFormElement>("form[data-auth]", root).forEach((form) => {
    clearErrorsOnInput(form);
    const kind = form.dataset.auth;
    if (kind === "login") initLoginForm(form);
    else if (kind === "register") initRegisterForm(form);
    else if (kind === "reset") initResetForm(form);
  });
}
