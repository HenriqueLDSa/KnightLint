import { useState } from "react";
import "../css/App.css";

export default function RepoSelect() {
    const [repoName, setRepoName] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token") || "";
    const username = params.get("username") || "";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!repoName) {
            setError("Please enter a repository name.");
            setSuccess("");
            return;
        }

        try {
            const res = await fetch(
                `http://localhost:8000/verify-repo?token=${token}&username=${username}&repo_name=${repoName}`
            );
            if (res.ok) {
                const repoInfo = await res.json();
                console.log("✅ Repo verified:", repoInfo);
                setSuccess("✅ Repo verified successfully!");
                setError("");
                // Redirect to next page with token and username
                window.location.href = `/repo/${repoName}?token=${token}&username=${username}`;
            } else {
                const err = await res.json();
                setError(err.error);
                setSuccess("");
            }
        } catch (error) {
            console.error("Error verifying repo:", error);
            setError("An error occurred while verifying the repository. Please try again.");
            setSuccess("");
        }
    };

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
            }}
        >
            <h1 className="landing-title">
                Enter Repo Name
            </h1>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <input
                    type="text"
                    placeholder="e.g. KnightLint"
                    value={repoName}
                    onChange={(e) => setRepoName(e.target.value)}
                    style={{
                        padding: "0.75rem 1rem",
                        borderRadius: "25px",
                        border: "1px solid #3C3C5C",
                        background: "transparent",
                        color: "white",
                        width: "300px",
                        fontSize: "1rem",
                        outline: "none",
                        marginBottom: "1rem",
                    }}
                />
                <button
                    type="submit"
                    className="github-button-text"
                >
                    Start Game
                </button>
            </form>
            {error && (
                <p style={{ color: "#ff6b6b", marginTop: "1rem" }}>
                    {error}
                </p>
            )}
            {success && (
                <p style={{ color: "#4ade80", marginTop: "1rem" }}>
                    {success}
                </p>
            )}
        </div>
    );
}