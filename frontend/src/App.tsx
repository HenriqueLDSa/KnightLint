import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import RepoSelect from "./components/RepoSelect";
import RepoDashboard from "./components/RepoDashboard";
import PREditor from "./components/PREditor";
import { useState, useEffect } from "react";

function LandingPage() {
  const [knightImage, setKnightImage] = useState("/knight2.png");
  const backendBaseUrl = "https://backend-production-9cc8.up.railway.app";

  useEffect(() => {
    const blinkSequence = () => {
      // Blink once (switch to closed eyes briefly)
      setTimeout(() => setKnightImage("/knight1.png"), 0);
      setTimeout(() => setKnightImage("/knight2.png"), 300);

      // Wait a few seconds, then blink again
      setTimeout(() => setKnightImage("/knight1.png"), 3500);
      setTimeout(() => setKnightImage("/knight2.png"), 3800);
    };

    // Start the blink sequence
    blinkSequence();

    // Repeat every 7 seconds
    const interval = setInterval(blinkSequence, 7000);

    return () => clearInterval(interval);
  }, []);

  const handleGitHubLogin = () => {
    window.location.href = `${backendBaseUrl}/login`;
  };

  return (
    <div className="landing-container">
      <img src={knightImage} alt="Knight" className="knight-mascot" />
      <h1 className="landing-title-first">KnightLint</h1>

      <button onClick={handleGitHubLogin} className="github-button">
        <img src="/github-white-icon.webp" alt="GitHub" className="github-button-icon" />
        <span className="github-button-text">Sign in with Github</span>
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