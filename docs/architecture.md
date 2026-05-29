# Architecture Overview

This repository is a small monorepo with two primary application components and a deployment helper.

## Frontend

- Built with React and Node.js.
- Lives in the `frontend/` folder.
- Uses a standard frontend toolchain (`pnpm` or `npm`) for dependency management and local development.
- In production, the frontend is built and served by an Nginx container.
- The frontend exposes a web user interface and sends API requests to the backend via the reverse proxy.

## Backend

- Built with Python and FastAPI.
- Lives in the `backend/` folder.
- Uses `uv` as the recommended runtime wrapper for Python tooling and server startup.
- The backend exposes a REST API on port `8000`, with automatic reload available during development.
- FastAPI provides OpenAPI/Swagger documentation at `/docs` and JSON schema at `/openapi.json`.

## Reverse Proxy / Deployment

- The `deploy/` folder contains Compose configuration and deployment helpers.
- `deploy/compose.yaml` defines three services:
  - `frontend` — builds the React app from `../frontend` and exposes port `3000`.
  - `backend` — builds the FastAPI service from `../backend` and exposes port `8000`.
  - `nginx` — proxy server that routes web traffic to the frontend and API traffic to the backend.
- `deploy/menu.sh` is an interactive helper for building and starting the services.

## Networking

- All services share a Docker bridge network called `app-network`.
- Nginx routes:
  - `/` → `frontend:80`
  - `/api/` → `backend:8000/`
  - `/docs` → `backend:8000/docs`
  - `/openapi.json` → `backend:8000/openapi.json`

## Development workflow

- Non-developer users should use `bash deploy/menu.sh` from the repo root to build and run services.
- Frontend developers can work in `frontend/` with:
  ```sh
  cd frontend
  pnpm install
  pnpm dev
  ```
- Backend developers can work in `backend/app/` with:
  ```sh
  cd backend/app
  uv run --no-project uvicorn main:app --host 0.0.0.0 --port 8000 --reload
  ```

## Key design choices

- Separate frontend and backend codepaths in a monorepo for easier coordination.
- Use FastAPI for a modern Python API with built-in docs and strong typing.
- Use Nginx as a reverse proxy to keep the frontend and backend URLs consistent for users.
- Keep deployment configuration in `deploy/` so application folders remain focused on code.

## Notes

- The current architecture assumes the frontend is served as a static app behind Nginx, while the backend remains a standalone API service.
- This structure is adaptable: you can swap the frontend build or backend framework with minimal changes to `deploy/compose.yaml`.
