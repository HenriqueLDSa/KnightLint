from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.auth import router as auth_router
import os

# Load environment variables from .env
load_dotenv()

app = FastAPI()

origins = [
    "http://localhost:5173",
    "https://frontend-production-ee09.up.railway.app"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)

@app.get("/")
async def root():
    return {"status": "ok", "message": "KnightLint API is running"}
