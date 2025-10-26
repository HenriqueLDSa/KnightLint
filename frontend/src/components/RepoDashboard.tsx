import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import "../App.css";
import "./css/RepoDashboard.css";

interface PullRequest {
    id: number;
    number: number;
    title: string;
    user: string;
    created_at: string;
    url: string;
    body?: string;
    head?: {
        ref: string;
    };
    base?: {
        ref: string;
    };
    changed_files?: number;
}

export default function RepoDashboard() {
    const { repoName } = useParams<{ repoName: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get("token") || "";
    const username = searchParams.get("username") || "";

    const [prs, setPrs] = useState<PullRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const backendBaseUrl = "https://backend-production-9cc8.up.railway.app";

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
    };

    useEffect(() => {
        // Check if token and username are present
        if (!token || !username) {
            setError("Authentication required. Please log in with GitHub again.");
            setLoading(false);
            return;
        }

        const fetchPRs = async () => {
            try {
                const res = await fetch(
                    `${backendBaseUrl}/repo-pull-requests?token=${token}&username=${username}&repo_name=${repoName}`
                );
                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    console.error("Failed to fetch pull requests. Status:", res.status, "Error:", errorData);
                    setError(errorData.error || `Failed to load pull requests (Status: ${res.status})`);
                    setLoading(false);
                    return;
                }
                const data = await res.json();
                console.log("Fetched PRs:", data.pull_requests);
                setPrs(data.pull_requests || []);
                setError(""); // Clear any previous errors
                setLoading(false);
            } catch (err) {
                console.error("Failed to fetch pull requests:", err);
                console.log("Repo:", repoName, "Token exists:", !!token, "Username:", username);
                setError("An error occurred while loading pull requests. Check console for details.");
                setLoading(false);
            }
        };

        fetchPRs();
    }, [repoName, token, username]);

    if (loading) {
        return (
            <div className="repo-dashboard-loading">
                <p>Loading pull requests...</p>
            </div>
        );
    }

    return (
        <div className="repo-dashboard-container">
            <div className="repo-dashboard-header">
                <button
                    className="rd-back-button"
                    onClick={() => navigate(`/?token=${token}&username=${username}`)}
                    aria-label="Back to repositories"
                >
                    ← Back to repositories
                </button>
                <h1 className="repo-dashboard-title">
                    <span className="bouncing-text">{repoName}</span>
                </h1>
            </div>

            {error && (
                <p className="repo-dashboard-error">
                    {error}
                </p>
            )}

            {!error && prs.length === 0 && (
                <p className="repo-dashboard-no-prs">No pull requests found for this repository.</p>
            )}

            <div className="repo-dashboard-grid">
                {prs.map((pr) => (
                    <div
                        key={pr.id}
                        onClick={() =>
                            navigate(`/repo/${repoName}/pr/${pr.number}?token=${token}&username=${username}`)
                        }
                        className="pr-card"
                    >
                        <div className="pr-card-header">
                            <h3>{pr.title}</h3>
                            <div className="pr-card-stats">
                                {pr.changed_files !== undefined && (
                                    <span>Files Changed: {pr.changed_files}</span>
                                )}
                                <span>Created: {formatDate(pr.created_at)}</span>
                            </div>
                        </div>

                        <p className="pr-card-description">
                            {pr.body || "No description provided"}
                        </p>

                        <div className="pr-card-footer">
                            {(pr.head?.ref || pr.base?.ref) && (
                                <div className="pr-branch-info">
                                    {pr.head?.ref && <span className="branch-badge">{pr.head.ref}</span>}
                                    {pr.head?.ref && pr.base?.ref && <span>→</span>}
                                    {pr.base?.ref && <span className="branch-badge">{pr.base.ref}</span>}
                                </div>
                            )}
                            <span className="pr-author">Author: {pr.user}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}