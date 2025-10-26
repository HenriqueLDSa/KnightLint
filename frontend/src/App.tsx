import "./App.css";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import RepoSelect from "./components/RepoSelect";
import RepoDashboard from "./components/RepoDashboard";
import PREditor from "./components/PREditor";
import HowItWorks from "./components/HowItWorks";
import { useState, useEffect } from "react";

function LandingPage() {
  const [knightImage, setKnightImage] = useState("/knight2.png");

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
    window.location.href = "http://localhost:8000/login";
  };

  return (
    <div className="landing-container">
      <img src={knightImage} alt="Knight" className="knight-mascot" />
      <h1 className="landing-title-first">KnightLint</h1>

      <button onClick={handleGitHubLogin} className="github-button">
        <img src="/github-white-icon.webp" alt="GitHub" className="github-button-icon" />
        <span className="github-button-text">Sign in with Github</span>
      </button>

      <Link to="/how-it-works" className="how-it-works-link">
        How does KnightLint work?
      </Link>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        {/* 👇 Landing page */}
        <Route path="/" element={<LandingPage />} />

        {/* 👇 How it works page */}
        <Route path="/how-it-works" element={<HowItWorks />} />

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