# Client for Authentification

## Installation and setup

1. Use Node.js 24 LTS (the version in `.nvmrc`) and install the locked packages
   from the `client` directory:

   ```bash
   nvm install
   nvm use
   npm ci
   ```

2. When building the Docker image, pass the public API URL as a build argument.
   Run this command from the repository root:

   ```bash
   docker build \
     --build-arg VITE_API_URL="https://api.example.ru" \
     -t your_name/your_docker_image:latest \
     ./client
   ```

## Running the client

For local development, run from the `client` directory and supply the API URL
in the command environment (replace it with your actual backend address):

```bash
VITE_API_URL="https://api.example.ru" npm run dev
```

The client runs at `http://localhost:3000`. The API URL must remain configured
for local Vite too; a Docker build argument does not configure `npm run dev`.

## Checks

```bash
npm run typecheck
npm test
VITE_API_URL="https://api.example.ru" npm run build
npm audit
```

`build` includes TypeScript checking. Unit tests use mocked HTTP adapters and
do not contact a real backend. Docker uses Node.js 24 in both build and runtime
stages; Node.js 20 is no longer supported by this project.
