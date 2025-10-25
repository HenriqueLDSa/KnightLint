import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";

interface Repository {
    id: number;
    name: string;
    description: string;
    language: string;
    updated_at: string;
}

export default function RepoSelect() {
    const navigate = useNavigate();
    const [repos, setRepos] = useState<Repository[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token") || "";
    const username = params.get("username") || "";

    useEffect(() => {
        if (!token || !username) {
            setError("Authentication required. Please log in again.");
            setLoading(false);
            return;
        }

        const fetchRepos = async () => {
            try {
                const res = await fetch(
                    `http://localhost:8000/user-repos?token=${token}&username=${username}`
                );
                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    setError(errorData.error || "Failed to load repositories");
                    setLoading(false);
                    return;
                }
                const data = await res.json();
                console.log("Fetched repos:", data);
                setRepos(data.repositories || []);
                setLoading(false);
            } catch (err) {
                console.error("Failed to fetch repositories:", err);
                setError("An error occurred while loading repositories.");
                setLoading(false);
            }
        };

        fetchRepos();
    }, [token, username]);

    const handleRepoClick = (repoName: string) => {
        navigate(`/repo/${repoName}?token=${token}&username=${username}`);
    };

    if (loading) {
        return (
            <div
                style={{
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#0D0827",
                    color: "white",
                }}
            >
                <p>Loading your repositories...</p>
            </div>
        );
    }

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#0D0827",
                color: "white",
                textAlign: "center",
                padding: "2rem",
            }}
        >
            <h1 className="landing-title">
                Select a Repository
            </h1>

            {error && (
                <p style={{ color: "#ff6b6b", marginBottom: "2rem" }}>
                    {error}
                </p>
            )}

            {!error && repos.length === 0 && (
                <p style={{ color: "#888" }}>No repositories found.</p>
            )}

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                    gap: "1rem",
                    width: "100%",
                    maxWidth: "1200px",
                    marginTop: "2rem",
                }}
            >
                {repos.map((repo) => (
                    <div
                        key={repo.id}
                        onClick={() => handleRepoClick(repo.name)}
                        style={{
                            backgroundColor: "transparent",
                            border: "1px solid #3C3C5C",
                            borderRadius: "10px",
                            padding: "1.5rem",
                            cursor: "pointer",
                            transition: "all 0.3s ease",
                            fontFamily: "Jersey 20, sans-serif",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#1a1a2e";
                            e.currentTarget.style.borderColor = "#646cff";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "transparent";
                            e.currentTarget.style.borderColor = "#3C3C5C";
                        }}
                    >
                        <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.5rem" }}>
                            {repo.name}
                        </h3>
                        {repo.description && (
                            <p style={{ color: "#888", fontSize: "0.9rem", margin: "0.5rem 0" }}>
                                {repo.description}
                            </p>
                        )}
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem", fontSize: "0.85rem", color: "#888" }}>
                            {repo.language && <span>🔹 {repo.language}</span>}
                            <span>Updated: {new Date(repo.updated_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}