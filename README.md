# entreprender.ga — site public

Page d’accueil et espace de connexion (connexion, inscription, mot de passe oublié).
Site 100 % statique : HTML + CSS + TypeScript compilé en JavaScript.

## Structure

```
index.html            Page d’accueil
connexion.html        Connexion · #inscription · #mot-de-passe-oublie
css/styles.css        Tous les styles (jetons de couleur en haut du fichier)
src/                  Code source TypeScript
  config.ts           ← adresse de l’API et page après connexion
  main.ts             Accueil : menu actif, carrousel, étapes, secteurs
  connexion.ts        Page connexion : bascule entre les 3 formulaires
  lib/auth-forms.ts   Validation, envoi et messages des formulaires
  lib/api.ts          Appels à l’API (fetch JSON)
  lib/validation.ts   Règles e-mail / téléphone gabonais / mot de passe
  lib/dom.ts          Utilitaires
js/                   JavaScript compilé (c’est lui que les pages chargent)
assets/img/           Logos, filigranes « e », favicon
assets/fonts/         Plus Jakarta Sans et Inter (licence SIL OFL)
```

## Déployer

Les fichiers sont prêts : `js/` est déjà compilé. Envoyez **tout le dossier**
(sauf `node_modules/`, `src/`, `package.json` et `tsconfig.json`, facultatifs en production)
sur n’importe quel hébergement statique : Netlify, Vercel, GitHub Pages,
OVH, Apache ou Nginx.

- **Netlify / Vercel** : glissez-déposez le dossier, sans commande de build
  (ou commande `npm run build`, dossier de publication `.`).
- **Apache / Nginx** : copiez le dossier dans la racine web.

Tester en local : `npx serve .` puis ouvrez http://localhost:3000.

## Modifier le TypeScript

```
npm install
npm run build      # vérifie les types puis compile src/ → js/
npm run watch      # recompile à chaque modification
```

## Brancher l’API

Dans `src/config.ts`, renseignez `apiBaseUrl` (ex. `https://api.entreprender.ga`),
puis `npm run build`. Tant qu’elle est vide, les formulaires valident les champs
et affichent un message « Mode démonstration ».

Requêtes envoyées (POST, JSON, cookies inclus) :

| Formulaire          | Route                  | Corps                                                              |
|---------------------|------------------------|--------------------------------------------------------------------|
| Connexion           | `/auth/login`          | `identifier`, `password`                                           |
| Inscription         | `/auth/register`       | `firstName`, `lastName`, `identifier`, `password`, `company`, `nif`, `rccm` |
| Mot de passe oublié | `/auth/password-reset` | `identifier`                                                       |

Réponse 2xx = succès (redirection vers `dashboardUrl`). En cas d’erreur, un champ
`message` dans la réponse JSON est affiché ; sinon un message par défaut selon le
code (401, 409, 429…). L’API doit autoriser l’origine du site (CORS).

## À compléter

- Coordonnées du pied de page : `[Téléphone]`, `[E-mail]`, `[Adresse]` dans `index.html`.
- Liens « Mentions légales », « Confidentialité », « Voir tout l’annuaire »
  et la recherche de l’annuaire (pages à créer).
