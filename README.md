# KnightLint

> **Your Code's Trusted Guardian** - AI-powered PR reviews that catch bugs before production.

KnightLint is an intelligent code review assistant that analyzes your GitHub pull requests using AI to identify security vulnerabilities, code quality issues, and performance bottlenecks—before manual review. Connect your repo, get actionable insights, and edit code directly in-browser.

## ✨ Features

- 🔐 **GitHub OAuth Integration** - Seamless authentication with your GitHub account
- 🤖 **AI-Powered Analysis** - Uses Google's Gemini API to analyze pull requests
- 🛡️ **Security Scanning** - Identifies potential security vulnerabilities in your code
- 📊 **Code Quality Checks** - Detects code smells, best practice violations, and maintainability issues
- ⚡ **Performance Analysis** - Highlights performance bottlenecks and optimization opportunities
- ✏️ **In-Browser Code Editing** - Edit files directly with Monaco Editor integration
- 💾 **Smart Caching** - Cached analysis results for faster subsequent reviews
- 📝 **Direct Commits** - Commit fixes directly to your PR branch

## 🏗️ Architecture

### Frontend
- **React 19** with TypeScript
- **Vite** for blazing-fast development
- **React Router** for navigation
- **Monaco Editor** for in-browser code editing
- Deployed on Railway

### Backend
- **FastAPI** for high-performance async API
- **GitHub OAuth** for authentication
- **Google Gemini 2.0 Flash** for AI-powered code analysis
- **httpx** for async HTTP requests
- Deployed on Railway

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Python 3.8+
- GitHub OAuth App credentials
- Google Gemini API key

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`

### Backend Setup

```bash
cd backend
pip install -r requirements.txt

# Create .env file with:
# GITHUB_CLIENT_ID=your_github_client_id
# GITHUB_CLIENT_SECRET=your_github_client_secret
# GITHUB_REDIRECT_URI=your_redirect_uri
# GEMINI_API_KEY=your_gemini_api_key

uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`

## 📖 How It Works

1. **Sign in with GitHub** - Authenticate using GitHub OAuth
2. **Select a Repository** - Choose from your GitHub repositories
3. **View Pull Requests** - Browse all PRs in the selected repo
4. **Analyze PR** - Click analyze to run AI-powered code review
5. **Review Issues** - See categorized issues (Security, Code Quality, Performance)
6. **Edit & Commit** - Make changes directly in the browser and commit to the PR

## 🛠️ Tech Stack

**Frontend:**
- React 19.1
- TypeScript 5.9
- Vite 7.1
- React Router 7.9
- Monaco Editor 4.7

**Backend:**
- FastAPI
- Python 3.8+
- Google Gemini API
- httpx (async HTTP)
- python-dotenv

## 📝 API Endpoints

- `GET /login` - Initiate GitHub OAuth flow
- `GET /login/callback` - Handle GitHub OAuth callback
- `GET /user-repos` - Fetch user's repositories
- `GET /repo-pull-requests` - Get PRs for a repository
- `GET /pr-details` - Get detailed PR information
- `POST /analyze-pr` - Analyze PR with AI
- `POST /commit-changes` - Commit changes to PR
- `POST /recheck-pr` - Reanalyze PR after changes

## 🎯 Why KnightLint?

- ⚡ **Save Time** - Catch bugs before manual review
- 🔒 **Enhanced Security** - AI identifies flaws manual reviews might miss
- 📋 **Improve Quality** - Learn best practices with every review
- 🚀 **Ship Faster** - Accelerate development with automated reviews

## 📄 License

MIT License - feel free to use this project for your own purposes.

---

Built with ❤️ by the KnightLint team