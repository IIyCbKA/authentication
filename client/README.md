# Client for Authentification

## Installation and setup

Use Node.js 24 LTS (the version in `.nvmrc`) and install the locked packages
from the `client` directory:

```bash
  nvm install
  nvm use
  npm ci
```

## Running the client

For local development, run from the `client` directory and supply the API URL
in the environment:

```bash
  npm run dev
```

The client runs at `http://localhost:3000`.

## Checks

```bash
  npm run typecheck
  npm run build
  npm audit
```
