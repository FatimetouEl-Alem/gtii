import { CONFIG } from "../config";

export type ApiResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; demo: true }
  | { ok: false; demo: false; message: string };

const DEMO_DELAY = 700;
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Envoie une requête JSON à l’API. Sans `apiBaseUrl`, simule une réponse (mode démonstration). */
export async function post<T = unknown>(path: string, body: Record<string, unknown>): Promise<ApiResult<T>> {
  if (!CONFIG.apiBaseUrl) {
    await wait(DEMO_DELAY);
    return { ok: false, demo: true };
  }
  try {
    const response = await fetch(CONFIG.apiBaseUrl + path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = typeof payload?.message === "string" ? payload.message : defaultError(response.status);
      return { ok: false, demo: false, message };
    }
    return { ok: true, data: payload as T };
  } catch {
    return { ok: false, demo: false, message: "Connexion au serveur impossible. Vérifiez votre réseau et réessayez." };
  }
}

function defaultError(status: number): string {
  if (status === 401) return "Identifiant ou mot de passe incorrect.";
  if (status === 409) return "Un compte existe déjà avec cet identifiant.";
  if (status === 429) return "Trop de tentatives. Réessayez dans quelques minutes.";
  return "Une erreur est survenue. Réessayez.";
}

export const api = {
  login: (identifier: string, password: string) =>
    post(CONFIG.endpoints.login, { identifier, password }),
  register: (data: Record<string, unknown>) =>
    post(CONFIG.endpoints.register, data),
  resetPassword: (identifier: string) =>
    post(CONFIG.endpoints.resetPassword, { identifier }),
};
