# MC Chimney Draft Tool

## Overview

The MC Chimney Draft Tool is an open-source, Python-based software package with an intuitive web-based interface that predicts chimney draft for wood heaters. It evaluates chimney performance using detailed inputs for chimney design, appliance operating conditions, and indoor/outdoor environmental factors.

Developed by Lawrence Berkeley National Laboratory in collaboration with HPBA, the tool supports a comprehensive range of parameters—including chimney size, orientation, material, wind effects at the chimney top, chimney caps, and heater output across transient (cold-start) and operating conditions.

## Who It Helps

- **Manufacturers** can understand draft ranges their heaters may experience across different climates and use the results to improve heater designs and performance under extreme conditions.
- **Chimney installers** can optimize flue layout and installation practices for better draft behavior and reduced performance issues.
- **Knowledgeable homeowners** can identify solutions for problematic chimney designs and make better-informed decisions for wood heater installations.

## Why This Tool Matters

Unlike legacy programs such as WOODSIM, FLUESIM, and VENT-II, the MC Chimney Draft Tool:

- runs on modern systems,
- is designed specifically for wood-burning appliances,
- accounts for a wider variety of chimney types,
- includes critical environmental factors such as wind effects and elevation,
- is freely accessible through a public-facing website.

## Repository Architecture

This repository is organized as a monorepo with separate frontend and backend applications plus deployment helpers.

- `frontend/` — React web UI built with Node.js.
- `backend/` — Python FastAPI service.
- `deploy/` — Compose configuration and the interactive `deploy/menu.sh` helper.
- `docs/` — documentation, including setup and architecture guides.

The frontend is served through an Nginx reverse proxy, while the backend exposes a FastAPI REST API on port `8000`.

## Quick Start

From the repository root:

```sh
git pull
bash deploy/menu.sh
```

The interactive deploy helper builds and starts the frontend, backend, and reverse proxy services using Docker Compose.

## Local Development

### Frontend

```sh
cd frontend
pnpm install
pnpm start
```

> Note: frontend local development uses `pnpm`, while the Docker frontend build is intentionally defined using `npm` in `frontend/Dockerfile`.

### Backend

```sh
cd backend/app
uv run --no-project uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

`pnpm` and `uv` are recommended tools, and both work cross-platform on Linux, macOS, and Windows.

## Notes

- Developers should use a dedicated branch for each area of work.
- Non-developer users should generally use `bash deploy/menu.sh` from the repo root instead of running services manually.

## License & Notices

****************************

### Copyright Notice

MC Chimney Draft Tool (Draft Tool) Copyright (c) 2026, The Regents of the University of California, through Lawrence Berkeley National Laboratory (subject to receipt of any required approvals from the U.S. Dept. of Energy). All rights reserved.

If you have questions about your rights to use or distribute this software, please contact Berkeley Lab's Intellectual Property Office at IPO@lbl.gov.

NOTICE. This Software was developed under funding from the U.S. Department of Energy and the U.S. Government consequently retains certain rights. As such, the U.S. Government has been granted for itself and others acting on its behalf a paid-up, nonexclusive, irrevocable, worldwide license in the Software to reproduce, distribute copies to the public, prepare derivative works, and perform publicly and display publicly, and to permit others to do so.

****************************

For the full license terms, see LICENSE.
