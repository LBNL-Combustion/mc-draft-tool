from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from models.simulation import api_handler
import json

app = FastAPI(title="Wood Heater Tool API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Welcome to Wood Heater Tool API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.post("/simulate")
async def simulate(payload: dict):
    response_str = api_handler(payload)
    response = json.loads(response_str)
    # Unwrap {ok, data} so the frontend sees the six contract keys at top level.
    if response.get("ok") and isinstance(response.get("data"), dict):
        return response["data"]
    return response