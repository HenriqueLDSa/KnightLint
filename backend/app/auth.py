from typing import Dict
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

# In-memory cache (use Redis/DB for production)
# Changed to store both analysis and commit SHA
pr_analysis_cache: Dict[str, dict] = {}
pr_issue_tracker: Dict[str, list] = {}


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

@router.get("/pr-details")
async def get_pr_details(token: str = Query(...), username: str = Query(...), repo_name: str = Query(...), pr_number: int = Query(...)):
    # Validate token and username are not empty
    if not token or not username:
        return JSONResponse(
            {"error": "Missing authentication. Please log in again."},
            status_code=401
        )
    
    async with httpx.AsyncClient() as client:
        # Fetch PR details
        pr_resp = await client.get(
            f"https://api.github.com/repos/{username}/{repo_name}/pulls/{pr_number}",
            headers={"Authorization": f"Bearer {token}"}
        )

        if pr_resp.status_code != 200:
            return JSONResponse(
                {"error": "Failed to fetch PR details."},
                status_code=pr_resp.status_code
            )

        pr_data = pr_resp.json()

        # Fetch PR files
        files_resp = await client.get(
            f"https://api.github.com/repos/{username}/{repo_name}/pulls/{pr_number}/files",
            headers={"Authorization": f"Bearer {token}"}
        )

        if files_resp.status_code != 200:
            return JSONResponse(
                {"error": "Failed to fetch PR files."},
                status_code=files_resp.status_code
            )

        files = files_resp.json()

        # Format response
        return {
            "number": pr_data["number"],
            "title": pr_data["title"],
            "body": pr_data.get("body", ""),
            "user": pr_data["user"]["login"],
            "state": pr_data["state"],
            "created_at": pr_data["created_at"],
            "updated_at": pr_data["updated_at"],
            "html_url": pr_data["html_url"],
            "files": [
                {
                    "filename": file["filename"],
                    "status": file["status"],
                    "additions": file["additions"],
                    "deletions": file["deletions"],
                    "changes": file["changes"],
                    "patch": file.get("patch", ""),
                    "raw_url": file["raw_url"]
                }
                for file in files
            ]
        }

@router.get("/file-content")
async def get_file_content(token: str = Query(...), raw_url: str = Query(...)):
    # Validate token is not empty
    if not token:
        return JSONResponse(
            {"error": "Missing authentication. Please log in again."},
            status_code=401
        )
    
    async with httpx.AsyncClient() as client:
        # Fetch the raw file content from GitHub
        file_resp = await client.get(
            raw_url,
            headers={"Authorization": f"Bearer {token}"},
            follow_redirects=True
        )

        if file_resp.status_code != 200:
            return JSONResponse(
                {"error": "Failed to fetch file content."},
                status_code=file_resp.status_code
            )

        return {"content": file_resp.text}
    
def generate_issue_id(issue: dict) -> str:
    """Generate a stable ID for an issue based on file, description"""
    import hashlib
    key = f"{issue['file']}:{issue['description'][:100]}"
    return hashlib.md5(key.encode()).hexdigest()[:12]

def merge_issues_with_history(new_issues: list, category: str, cache_key: str) -> list:
    """Merge new issues with historical severity ratings"""
    if cache_key not in pr_issue_tracker:
        pr_issue_tracker[cache_key] = {}
    
    tracker = pr_issue_tracker[cache_key]
    merged_issues = []
    
    for issue in new_issues:
        issue_id = generate_issue_id(issue)
        
        # If we've seen this issue before, use the original severity
        if issue_id in tracker:
            issue['severity'] = tracker[issue_id]['severity']
            issue['first_seen'] = tracker[issue_id]['first_seen']
        else:
            # New issue - track it
            tracker[issue_id] = {
                'severity': issue['severity'],
                'first_seen': issue.get('first_seen', 'current'),
                'category': category
            }
            issue['first_seen'] = 'current'
        
        merged_issues.append(issue)
    
    return merged_issues

@router.post("/analyze-pr")
async def analyze_pr(token: str = Query(...), username: str = Query(...), repo_name: str = Query(...), pr_number: int = Query(...)):
    """
    Analyze a PR using Gemini API.
    Fetches PR diff and files, sends to Gemini for structured analysis.
    """
    if not token or not username:
        return JSONResponse(
            {"error": "Missing authentication. Please log in again."},
            status_code=401
        )
    
    import json
    import asyncio
    
    # Configure Gemini API
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if not gemini_api_key:
        return JSONResponse(
            {"error": "Gemini API key not configured on server."},
            status_code=500
        )
    
    async with httpx.AsyncClient() as client:
        # Fetch PR details
        pr_resp = await client.get(
            f"https://api.github.com/repos/{username}/{repo_name}/pulls/{pr_number}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if pr_resp.status_code != 200:
            return JSONResponse(
                {"error": "Failed to fetch PR details."},
                status_code=pr_resp.status_code
            )
        
        pr_data = pr_resp.json()
        
        # Get the latest commit SHA to use as cache key
        head_sha = pr_data['head']['sha']
        cache_key = f"{username}:{repo_name}:{pr_number}:{head_sha}"
        
        # Check cache first
        if cache_key in pr_analysis_cache:
            logging.info(f"Returning cached analysis for {cache_key}")
            return {
                "pr_number": pr_number,
                "pr_title": pr_data['title'],
                "analysis": pr_analysis_cache[cache_key]['analysis'],
                "head_sha": head_sha,
                "cached": True
            }
        
        logging.info(f"Generating new analysis for {cache_key}")

        # Right after getting the cache_key
        logging.info(f"Current cache keys: {list(pr_analysis_cache.keys())}")
        logging.info(f"Looking for key: {cache_key}")
        
        # Fetch PR files and diffs
        files_resp = await client.get(
            f"https://api.github.com/repos/{username}/{repo_name}/pulls/{pr_number}/files",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if files_resp.status_code != 200:
            return JSONResponse(
                {"error": "Failed to fetch PR files."},
                status_code=files_resp.status_code
            )
        
        files = files_resp.json()
        
        # Build prompt for Gemini
        files_info = ""
        for file in files:
            files_info += f"\n\n## File: {file['filename']}\n"
            files_info += f"Status: {file['status']}\n"
            files_info += f"Changes: +{file['additions']} -{file['deletions']}\n"
            if file.get('patch'):
                files_info += f"Diff:\n```\n{file['patch']}\n```\n"
        
        prompt = f"""
You are a senior code reviewer. Analyze the following Pull Request and provide a structured review.

PR Title: {pr_data['title']}
PR Description: {pr_data.get('body', 'No description provided')}

Files Changed:
{files_info}

IMPORTANT INSTRUCTIONS:
- Assign severity levels (high/medium/low) consistently - the same type of issue should always receive the same severity
- Include ALL types of issues: code problems, documentation issues, PR description problems, etc.
- If the PR description is vague or missing, include it as a code_quality_issue
- If documentation is missing or inadequate, include it as a code_quality_issue
- Always return valid JSON even if there are no issues (use empty arrays)

Please provide your analysis in the following JSON format:
{{
  "security_issues": [
    {{"severity": "high|medium|low", "description": "issue description", "file": "filename or 'PR metadata'", "suggestion": "how to fix"}}
  ],
  "code_quality_issues": [
    {{"severity": "high|medium|low", "description": "issue description", "file": "filename or 'PR metadata'", "suggestion": "how to fix"}}
  ],
  "performance_issues": [
    {{"severity": "high|medium|low", "description": "issue description", "file": "filename or 'PR metadata'", "suggestion": "how to fix"}}
  ],
  "summary": "A brief overall summary of the PR quality"
}}

If no issues are found in a category, return an empty array for that category.
You MUST return valid JSON in this exact format.
"""
        
        try:
            # Use Gemini REST API directly matching the curl example
            gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
    
            headers = {
                'Content-Type': 'application/json',
                'X-goog-api-key': gemini_api_key
            }
    
            gemini_payload = {
                "contents": [{
                    "parts": [{
                        "text": prompt
                    }]
                }],
                "generationConfig": {
                    "temperature": 0.0,
                    "topK": 1,
                    "topP": 1.0,
                    "candidateCount": 1,
                }
            }
    
            gemini_response = await client.post(gemini_url, json=gemini_payload, headers=headers, timeout=60.0)
            
            if gemini_response.status_code != 200:
                logging.error(f"Gemini API error: {gemini_response.status_code} {gemini_response.text}")
                return JSONResponse(
                    {"error": f"Gemini API error: {gemini_response.status_code} {gemini_response.text}"},
                    status_code=500
                )
            
            gemini_data = gemini_response.json()
            
            # Extract response_text FIRST
            response_text = gemini_data.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '').strip()
            
            # ADD LOGGING HERE
            logging.info(f"Raw Gemini response: {response_text[:500]}")  # Log first 500 chars
            
            if not response_text:
                logging.error("Empty response from Gemini API")
                return JSONResponse(
                    {"error": "Gemini returned an empty response"},
                    status_code=500
                )
            
            # Try to extract JSON from the response
            # Sometimes Gemini wraps JSON in markdown code blocks
            if response_text.startswith("```json"):
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif response_text.startswith("```"):
                response_text = response_text.split("```")[1].split("```")[0].strip()
            
            # ADD MORE LOGGING
            logging.info(f"Cleaned response text: {response_text[:500]}")
    
            analysis = json.loads(response_text)

             # Validate the structure
            if not isinstance(analysis, dict):
                raise ValueError("Analysis is not a dictionary")
            
            # Ensure all required keys exist with default empty arrays
            analysis.setdefault('security_issues', [])
            analysis.setdefault('code_quality_issues', [])
            analysis.setdefault('performance_issues', [])
            analysis.setdefault('summary', 'No summary provided')
            
            # Merge with historical issue tracking
            base_cache_key = f"{username}:{repo_name}:{pr_number}"
            analysis['security_issues'] = merge_issues_with_history(
                analysis.get('security_issues', []), 'security', base_cache_key
            )
            analysis['code_quality_issues'] = merge_issues_with_history(
                analysis.get('code_quality_issues', []), 'code_quality', base_cache_key
            )
            analysis['performance_issues'] = merge_issues_with_history(
                analysis.get('performance_issues', []), 'performance', base_cache_key
            )

            # Cache the result with commit SHA
            pr_analysis_cache[cache_key] = {
                'analysis': analysis,
                'head_sha': head_sha
            }
            
            total_issues = (
                len(analysis['security_issues']) +
                len(analysis['code_quality_issues']) +
                len(analysis['performance_issues'])
            )
            
            return {
                "pr_number": pr_number,
                "pr_title": pr_data['title'],
                "analysis": analysis,
                "head_sha": head_sha,
                "cached": False,
                "total_issues": total_issues
            }
            
        except json.JSONDecodeError as e:
            logging.error(f"JSON decode error: {str(e)}")
            logging.error(f"Response text was: {response_text[:1000]}")
            
            # Return a default structure instead of erroring
            return {
                "pr_number": pr_number,
                "pr_title": pr_data['title'],
                "analysis": {
                    "security_issues": [],
                    "code_quality_issues": [{
                        "severity": "medium",
                        "description": "AI analysis failed to complete. Please try again.",
                        "file": "system",
                        "suggestion": "Click 'Recheck PR' to retry the analysis."
                    }],
                    "performance_issues": [],
                    "summary": "Analysis could not be completed due to a technical error."
                },
                "head_sha": head_sha,
                "cached": False,
                "error": "Analysis parsing failed"
            }
        
        except Exception as e:
            logging.error(f"Unexpected error during PR analysis: {str(e)}")
            
            # Return a default structure instead of erroring
            return {
                "pr_number": pr_number,
                "pr_title": pr_data['title'],
                "analysis": {
                    "security_issues": [],
                    "code_quality_issues": [{
                        "severity": "medium",
                        "description": f"AI analysis encountered an error: {str(e)}",
                        "file": "system",
                        "suggestion": "Please try again or contact support if the issue persists."
                    }],
                    "performance_issues": [],
                    "summary": "Analysis could not be completed."
                },
                "head_sha": head_sha,
                "cached": False,
                "error": str(e)
            }
            


    
@router.post("/mark-issue-resolved")
async def mark_issue_resolved(
    token: str = Query(...),
    username: str = Query(...),
    repo_name: str = Query(...),
    pr_number: int = Query(...),
    issue_id: str = Query(...)
):
    """Remove an issue from tracking when it's actually resolved"""
    base_cache_key = f"{username}:{repo_name}:{pr_number}"
    
    if base_cache_key in pr_issue_tracker:
        if issue_id in pr_issue_tracker[base_cache_key]:
            del pr_issue_tracker[base_cache_key][issue_id]
            return {"success": True, "message": "Issue marked as resolved"}
    
    return {"success": False, "message": "Issue not found"}
    
@router.post("/commit-changes")
async def commit_changes(
    token: str = Query(...), 
    username: str = Query(...), 
    repo_name: str = Query(...), 
    pr_number: int = Query(...),
    file_path: str = Query(...),
    content: str = Query(...),
    commit_message: str = Query(...)
):
    """
    Commit changes to a file in a PR.
    """
    if not token or not username:
        return JSONResponse(
            {"error": "Missing authentication. Please log in again."},
            status_code=401
        )
    
    async with httpx.AsyncClient() as client:
        # Get PR details to find the branch
        pr_resp = await client.get(
            f"https://api.github.com/repos/{username}/{repo_name}/pulls/{pr_number}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if pr_resp.status_code != 200:
            return JSONResponse(
                {"error": "Failed to fetch PR details."},
                status_code=pr_resp.status_code
            )
        
        pr_data = pr_resp.json()
        branch_name = pr_data['head']['ref']
        
        # Get current file SHA
        file_resp = await client.get(
            f"https://api.github.com/repos/{username}/{repo_name}/contents/{file_path}",
            headers={"Authorization": f"Bearer {token}"},
            params={"ref": branch_name}
        )
        
        if file_resp.status_code != 200:
            return JSONResponse(
                {"error": "Failed to fetch file details."},
                status_code=file_resp.status_code
            )
        
        file_data = file_resp.json()
        file_sha = file_data['sha']
        
        # Encode content to base64
        import base64
        content_base64 = base64.b64encode(content.encode()).decode()
        
        # Update file
        update_resp = await client.put(
            f"https://api.github.com/repos/{username}/{repo_name}/contents/{file_path}",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "message": commit_message,
                "content": content_base64,
                "sha": file_sha,
                "branch": branch_name
            }
        )
        
        if update_resp.status_code not in [200, 201]:
            return JSONResponse(
                {"error": "Failed to commit changes."},
                status_code=update_resp.status_code
            )
        
        return {"success": True, "commit": update_resp.json()}

@router.post("/recheck-pr")
async def recheck_pr(token: str = Query(...), username: str = Query(...), repo_name: str = Query(...), pr_number: int = Query(...)):
    """
    Re-analyze PR. Checks if code has changed before re-analyzing.
    """
    if not token or not username:
        return JSONResponse(
            {"error": "Missing authentication. Please log in again."},
            status_code=401
        )
    
    async with httpx.AsyncClient() as client:
        # Fetch current PR details to get the latest commit SHA
        pr_resp = await client.get(
            f"https://api.github.com/repos/{username}/{repo_name}/pulls/{pr_number}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if pr_resp.status_code != 200:
            return JSONResponse(
                {"error": "Failed to fetch PR details."},
                status_code=pr_resp.status_code
            )
        
        pr_data = pr_resp.json()
        current_head_sha = pr_data['head']['sha']
        cache_key = f"{username}:{repo_name}:{pr_number}:{current_head_sha}"
        
        # Check if we have a cached analysis for this exact commit
        if cache_key in pr_analysis_cache:
            logging.info(f"No changes detected for PR #{pr_number} (SHA: {current_head_sha})")
            return JSONResponse(
                {
                    "no_changes": True,
                    "message": "No changes detected in the PR since the last analysis. Please make changes to the code and try again.",
                    "head_sha": current_head_sha
                },
                status_code=200
            )
        
        # If we reach here, the PR has changed, so analyze it
        logging.info(f"Changes detected for PR #{pr_number}, proceeding with analysis")
        return await analyze_pr(token=token, username=username, repo_name=repo_name, pr_number=pr_number)