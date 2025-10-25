import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import "../css/App.css";

interface PullRequest {
    id: number;
    number: number;
    title: string;
    user: string;
    created_at: string;
    url: string;
}

export default function RepoDashboard() {
    const { repoName } = useParams<{ repoName: string }>();
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token") || "";
    const username = searchParams.get("username") || "";

    const [prs, setPrs] = useState<PullRequest[]>([]);
    const [error, setError] = useState("");

    useEffect(() => {
        // Check if token and username are present
        if (!token || !username) {
            setError("Authentication required. Please log in with GitHub again.");
            return;
        }

        const fetchPRs = async () => {
            try {
                const res = await fetch(
                    `http://localhost:8000/repo-pull-requests?token=${token}&username=${username}&repo_name=${repoName}`
                );
                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    console.error("Failed to fetch pull requests. Status:", res.status, "Error:", errorData);
                    setError(errorData.error || `Failed to load pull requests (Status: ${res.status})`);
                    return;
                }
                const data = await res.json();
                console.log("Fetched PRs:", data.pull_requests);
                setPrs(data.pull_requests || []);
                setError(""); // Clear any previous errors
            } catch (err) {
                console.error("Failed to fetch pull requests:", err);
                console.log("Repo:", repoName, "Token exists:", !!token, "Username:", username);
                setError("An error occurred while loading pull requests. Check console for details.");
            }
        };

        fetchPRs();
    }, [repoName, token, username]);

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
            <h1 className="dashboard-title">
                {repoName}
            </h1>

            {error && <p style={{ color: "#ff6b6b" }}>{error}</p>}

            {prs.map((pr) => (
                <div
                    key={pr.id}
                    onClick={() =>
                        window.open(pr.url, "_blank")
                    }
                    style={{
                        width: "300px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        background: "transparent",
                        border: "1px solid #3C3C5C",
                        borderRadius: "10px",
                        padding: "0.75rem 1rem",
                        marginBottom: "0.75rem",
                        cursor: "pointer",
                    }}
                >
                    <span>PR #{pr.number} — {pr.title}</span>
                    <span>[XP]</span>
                </div>
            ))}

            {!error && prs.length === 0 && (
                <p>No pull requests found for this repository.</p>
            )}
        </div>
    );
}