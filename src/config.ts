/**
 * Configuration de la plateforme.
 * Renseignez `apiBaseUrl` avec l’adresse de votre API pour activer
 * la connexion, l’inscription et la réinitialisation du mot de passe.
 * Tant qu’elle est vide, les formulaires fonctionnent en mode démonstration.
 */
export const CONFIG = {
  /** Exemple : "https://api.entreprender.ga" (sans barre finale). */
  apiBaseUrl: "",
  /** Page ouverte après une connexion ou une inscription réussie. */
  dashboardUrl: "/tableau-de-bord/",
  endpoints: {
    login: "/auth/login",
    register: "/auth/register",
    resetPassword: "/auth/password-reset",
  },
} as const;
