from fastapi import APIRouter, Request, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
import httpx
import os
from dotenv import load_dotenv
from app.database import get_db
from app import crud

# Load env variables here
load_dotenv()

router = APIRouter()

GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")
GITHUB_REDIRECT_URI = os.getenv("GITHUB_REDIRECT_URI")

@router.get("/login")
async def github_login():
    url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={GITHUB_CLIENT_ID}&redirect_uri={GITHUB_REDIRECT_URI}&scope=read:user"
    )
    return RedirectResponse(url)


@router.get("/login/callback")
async def github_callback(code: str, db: Session = Depends(get_db)):
    # Exchange code for access token
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": GITHUB_CLIENT_ID,
                "client_secret": GITHUB_CLIENT_SECRET,
                "code": code,
                "redirect_uri": GITHUB_REDIRECT_URI,
            },
            headers={"Accept": "application/json"},
        )
        token_json = token_resp.json()
        access_token = token_json.get("access_token")

        if not access_token:
            return {"error": "Failed to get access token"}

        # Fetch user info
        user_resp = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        user = user_resp.json()
    
    # Get or create user in database
    github_username = user.get("login")
    db_user = crud.get_user_by_username(db, github_username)
    
    if not db_user:
        # Create new user
        db_user = crud.create_user(db, github_username, access_token)
    else:
        # Update access token for existing user
        db_user = crud.update_user_token(db, db_user.id, access_token)

    return {
        "user": user, 
        "token": access_token,
        "db_user_id": db_user.id
    }

