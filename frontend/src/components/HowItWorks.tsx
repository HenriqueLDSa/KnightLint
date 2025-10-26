import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import "../css/HowItWorks.css";

function HowItWorks() {
  const navigate = useNavigate();
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
    <div className="how-it-works-page">
      <button className="back-button-how" onClick={() => navigate("/")}>
        ← Back
      </button>

      {/* First Section - How Does KnightLint Work */}
      <div className="how-section">
        <h1 className="how-main-title">How Does KnightLint Work?</h1>
        
        <div className="how-content-grid">
          <div className="how-left">
            <div className="intro-box">
              <p className="intro-text">
                KnightLint is an intelligent code review assistant that analyzes your pull 
                requests using advanced AI to catch issues before they reach production.
              </p>
            </div>
            <img src={knightImage} alt="Knight" className="knight-illustration" />
          </div>

          <div className="how-right">
            <div className="step-box">
              <div className="step-circle">1</div>
              <div className="step-text-box">
                <h3 className="step-box-title">Connect Your Repository.</h3>
                <p className="step-box-text">
                  Sign in with GitHub and select the repository you want to protect.
                </p>
              </div>
            </div>

            <div className="step-box">
              <div className="step-circle">2</div>
              <div className="step-text-box">
                <h3 className="step-box-title">AI Analysis in Action</h3>
                <p className="step-box-text">
                  Our AI knight scans your code for security vulnerabilities, code quality issues, 
                  and performance bottlenecks.
                </p>
              </div>
            </div>

            <div className="step-box">
              <div className="step-circle">3</div>
              <div className="step-text-box">
                <h3 className="step-box-title">Get Actionable Insights</h3>
                <p className="step-box-text">
                  Receive detailed analysis with specific recommendations and edit your code directly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Second Section - Why KnightLint */}
      <div className="why-section">
        <h1 className="why-title">Why KnightLint?</h1>

        <ul className="why-list">
          <li className="why-item">
            <span className="why-bullet">⚡</span>
            <span className="why-text">
              <strong>Save Time —</strong> Catch bugs and vulnerabilities before manual review, 
              reducing back-and-forth iterations.
            </span>
          </li>

          <li className="why-item">
            <span className="why-bullet">🔒</span>
            <span className="why-text">
              <strong>Enhanced Security —</strong> AI-powered analysis identifies security flaws 
              that manual reviews might miss.
            </span>
          </li>

          <li className="why-item">
            <span className="why-bullet">📋</span>
            <span className="why-text">
              <strong>Improve Code Quality —</strong> Learn best practices and improve your coding 
              skills with every review.
            </span>
          </li>

          <li className="why-item">
            <span className="why-bullet">🚀</span>
            <span className="why-text">
              <strong>Ship Faster —</strong> Accelerate your development cycle with automated, 
              intelligent code reviews.
            </span>
          </li>
        </ul>

        <button onClick={handleGitHubLogin} className="github-button-how">
          <img src="/github-white-icon.webp" alt="GitHub" className="github-icon-how" />
          <span className="github-text-how">Sign in with Github</span>
        </button>
      </div>
    </div>
  );
}

export default HowItWorks;
