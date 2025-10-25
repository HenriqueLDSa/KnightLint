from fastapi import APIRouter, Request, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
import httpx
import os
from dotenv import load_dotenv
from app.database import get_db
from app import crud
import logging
from fastapi import Query
from fastapi.responses import JSONResponse

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

        # Fetch user repositories
        repos_resp = await client.get(
            "https://api.github.com/user/repos",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        repos = repos_resp.json()
        repo_names = [repo["name"] for repo in repos]

    frontend_url = f"http://localhost:5173/select-repo?token={access_token}&username={user['login']}"
    return RedirectResponse(url=frontend_url)

# Endpoint to verify a repo and return its info if exists
from fastapi import Query
from fastapi.responses import JSONResponse

@router.get("/verify-repo")
async def verify_repo(request: Request, repo_name: str = Query(...)):
    access_token = request.query_params.get("token")
    username = request.query_params.get("username")

    logging.debug(f"verify_repo called with repo_name={repo_name}, username={username}, token_missing={not access_token}")

    if not access_token or not username:
        return JSONResponse({"error": "Missing token or username"}, status_code=400)

    async with httpx.AsyncClient() as client:
        repos_resp = await client.get(
            "https://api.github.com/user/repos",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        repos = repos_resp.json()
        repo_names_list = [repo.get("name", "") for repo in repos]
        logging.debug(f"Retrieved repos: {repo_names_list}")

        repo_name_lower = repo_name.lower()
        matched_repo = None
        for repo in repos:
            if repo.get("name", "").lower() == repo_name_lower:
                matched_repo = repo.get("name")
                break

        if not matched_repo:
            return JSONResponse(
                {"error": "Woops! We couldn't find that repo name on your profile. Double check the name is correct and try again."},
                status_code=404
            )

        repo_info_resp = await client.get(
            f"https://api.github.com/repos/{username}/{matched_repo}",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        repo_info = repo_info_resp.json()
        return repo_info

@router.get("/repo-pull-requests")
async def get_repo_pull_requests(token: str = Query(...), username: str = Query(...), repo_name: str = Query(...)):
    # Validate token and username are not empty
    if not token or not username:
        return JSONResponse(
            {"error": "Missing authentication. Please log in again."},
            status_code=401
        )
    
    async with httpx.AsyncClient() as client:
        pr_resp = await client.get(
            f"https://api.github.com/repos/{username}/{repo_name}/pulls",
            headers={"Authorization": f"Bearer {token}"}
        )

        if pr_resp.status_code != 200:
            return JSONResponse(
                {"error": "Failed to fetch pull requests."},
                status_code=pr_resp.status_code
            )

        prs = pr_resp.json()

        # return only relevant fields for frontend
        formatted_prs = [
            {
                "id": pr["id"],
                "number": pr["number"],
                "title": pr["title"],
                "user": pr["user"]["login"],
                "created_at": pr["created_at"],
                "url": pr["html_url"]
            }
            for pr in prs
        ]

        return {"pull_requests": formatted_prs}