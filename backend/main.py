from fastapi import FastAPI
from dotenv import load_dotenv
from app.auth import router as auth_router
import os

# Load environment variables from .env
load_dotenv()

# Now you can safely access the variables
GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")
GITHUB_REDIRECT_URI = os.getenv("GITHUB_REDIRECT_URI")

app = FastAPI()
app.include_router(auth_router)
