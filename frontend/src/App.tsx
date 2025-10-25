import { FaGithub } from "react-icons/fa";
import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import RepoSelect from "./components/RepoSelect";
import RepoDashboard from "./components/RepoDashboard";
import PREditor from "./components/PREditor";

function LandingPage() {
  const handleGitHubLogin = () => {
    window.location.href = "http://localhost:8000/login";
  };

  return (
    <div className="landing-container">
      <h1 className="landing-title">Welcome to KnightLint</h1>

      <button onClick={handleGitHubLogin} className="github-button">
        <div className="github-button-icon">
          <FaGithub size={60} color="#0D0827" />
        </div>
        <span className="github-button-text">Sign In With Github</span>
      </button>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        {/* 👇 Landing page */}
        <Route path="/" element={<LandingPage />} />

        {/* 👇 After login */}
        <Route path="/select-repo" element={<RepoSelect />} />

        {/* 👇 Repo dashboard page */}
        <Route path="/repo/:repoName" element={<RepoDashboard />} />

        {/* 👇 PR Editor page */}
        <Route path="/repo/:repoName/pr/:prNumber" element={<PREditor />} />
      </Routes>
    </Router>
  );
}

export default App;