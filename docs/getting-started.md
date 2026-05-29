# Getting Started

## For non-developer users

1. Open a terminal and go to the root of the repository:
   ```sh
   cd mc-draft-tool
   ```
2. Fetch the latest changes:
   ```sh
   git pull
   ```
3. Run the deployment helper:
   ```sh
   bash deploy/menu.sh
   ```
4. Use the interactive CLI to deploy the tool.

   Example menu output:
   ```sh
   ========================================
      MONOREPO DEPLOYMENT UTILITY
   ========================================
   1. (re)deploy frontend
   2. (re)deploy backend
   3. (re)deploy reverse proxy server
   4. deploy frontend + backend + reverse proxy server
   0. Exit

   Select an option:
   ```

## For developer users

1. Create a new branch before making changes. For example:
   ```sh
   git checkout -b feature/frontend-update
   ```
2. Work on the component you want to change:
   - `frontend`
   - `backend`

### Frontend

#### Requirements

- [pnpm](https://pnpm.io/installation) (recommended) or npm

#### Setup

1. Change into the frontend folder:
   ```sh
   cd frontend
   ```
2. Install dependencies:
   ```sh
   pnpm install
   ```
3. Run the frontend app locally:
   ```sh
   pnpm start
   ```

> Note: local frontend development uses `pnpm`. The Docker build in `frontend/Dockerfile` still uses `npm`.

### Backend

#### Requirements

- Python 3.12+
- [uv](https://github.com/astral-sh/uv) (recommended) or pip

#### Setup

1. Change into the backend folder and install dependencies:
   ```sh
   cd backend
   uv pip install -r requirements.txt
   ```
2. Run the backend server locally from the `app/` directory:
   ```sh
   cd backend/app
   uv run --no-project uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

## Notes

- Use a dedicated branch for each area of work so your changes stay isolated.
- Non-developer users should generally use `bash deploy/menu.sh` from the repo root instead of running individual services directly.
- The examples in this guide assume a POSIX-style terminal environment (Linux/macOS). `pnpm` and `uv` are cross-platform and should work on Windows as well.
