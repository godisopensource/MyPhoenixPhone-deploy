# MyPhoenixPhone

Projet migré de GitLab/Windows vers macOS + Codeberg.

## Prérequis (macOS)
- Node.js 20+ (recommandé via nvm)
- npm 10+ (Corepack activé par défaut sur Node 20)
- Xcode Command Line Tools pour builder des paquets natifs (sharp)

## Installation
1. Cloner le dépôt depuis Codeberg.
2. À la racine du monorepo `myphoenixphone/` :

```sh
corepack enable
npm ci
```

## Développement
- Lancer tout en parallèle (Turborepo):

```sh
npm run dev -w myphoenixphone
```

- Démarrer un app spécifique:
```sh
npm run dev -w myphoenixphone/apps/backend
npm run dev -w myphoenixphone/apps/web
npm run dev -w myphoenixphone/apps/frontend
```

## Lint/Build/Test
```sh
npm run lint -w myphoenixphone
npm run build -w myphoenixphone
npm run test -w myphoenixphone/apps/backend
```

## Intégration Continue (Codeberg)
Un pipeline Woodpecker est fourni via `.woodpecker.yml` dans `myphoenixphone/`.
Il installe, lint, build et teste le backend et les apps Next.js avec Node 20 Alpine.

## Notes de migration
- Suppression des références GitLab et du fichier `.gitlab-ci.yml`.
- Nettoyage des dépendances Windows-only (turbo-windows-64, lightningcss-win32-…).
- Ajout d'un `.npmrc` pour forcer le registre public npm et éviter les proxys d'entreprise.
