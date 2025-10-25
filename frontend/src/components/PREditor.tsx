import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import "../css/App.css";

interface PRFile {
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
    raw_url: string;
}

interface PRDetails {
    number: number;
    title: string;
    body: string;
    user: string;
    state: string;
    created_at: string;
    updated_at: string;
    html_url: string;
    files: PRFile[];
}

export default function PREditor() {
    const { repoName, prNumber } = useParams<{ repoName: string; prNumber: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get("token") || "";
    const username = searchParams.get("username") || "";

    const [prDetails, setPrDetails] = useState<PRDetails | null>(null);
    const [selectedFile, setSelectedFile] = useState<PRFile | null>(null);
    const [fileContent, setFileContent] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!token || !username) {
            setError("Authentication required. Please log in with GitHub again.");
            setLoading(false);
            return;
        }

        const fetchPRDetails = async () => {
            try {
                console.log("Fetching PR details for:", { repoName, prNumber, username, tokenExists: !!token });
                const res = await fetch(
                    `http://localhost:8000/pr-details?token=${token}&username=${username}&repo_name=${repoName}&pr_number=${prNumber}`
                );
                console.log("PR details response status:", res.status);
                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    console.error("Failed to fetch PR details:", errorData);
                    setError(errorData.error || "Failed to load PR details");
                    setLoading(false);
                    return;
                }
                const data = await res.json();
                console.log("PR details data:", data);
                setPrDetails(data);
                
                // Auto-select first file if available
                if (data.files && data.files.length > 0) {
                    await loadFileContent(data.files[0]);
                }
                setLoading(false);
            } catch (err) {
                console.error("Failed to fetch PR details:", err);
                setError("An error occurred while loading PR details.");
                setLoading(false);
            }
        };

        fetchPRDetails();
    }, [repoName, prNumber, token, username]);

    const loadFileContent = async (file: PRFile) => {
        setSelectedFile(file);
        try {
            // Fetch file content through our backend to avoid CORS issues
            const response = await fetch(
                `http://localhost:8000/file-content?token=${token}&raw_url=${encodeURIComponent(file.raw_url)}`
            );
            if (!response.ok) {
                console.error("Failed to load file content");
                setFileContent("// Failed to load file content");
                return;
            }
            const data = await response.json();
            setFileContent(data.content);
        } catch (err) {
            console.error("Failed to load file content:", err);
            setFileContent("// Failed to load file content");
        }
    };

    if (loading) {
        return (
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#0D0827", color: "white" }}>
                <p>Loading PR details...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#0D0827", color: "white" }}>
                <p style={{ color: "#ff6b6b" }}>{error}</p>
            </div>
        );
    }

    if (!prDetails) {
        return (
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#0D0827", color: "white" }}>
                <p>No PR details found.</p>
            </div>
        );
    }

    return (
        <div style={{ minHeight: "100vh", backgroundColor: "#0D0827", color: "white" }}>
            {/* Header */}
            <div style={{ padding: "1rem 2rem", borderBottom: "1px solid #3C3C5C", position: "relative" }}>
                <button
                    onClick={() => navigate(`/repo/${repoName}?token=${token}&username=${username}`)}
                    style={{
                        position: "absolute",
                        left: "1rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        backgroundColor: "transparent",
                        border: "1px solid #3C3C5C",
                        color: "white",
                        padding: "0.5rem 1rem",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontFamily: "Jersey 20, sans-serif",
                        fontSize: "0.9rem",
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
                    ← Back to PRs
                </button>
                <h1 className="landing-title" style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
                    PR #{prDetails.number}: {prDetails.title}
                </h1>
                <p style={{ color: "#888", fontSize: "0.9rem" }}>
                    by {prDetails.user} • {prDetails.state}
                </p>
            </div>

            <div style={{ display: "flex", height: "calc(100vh - 120px)" }}>
                {/* Sidebar with file list */}
                <div style={{ width: "300px", borderRight: "1px solid #3C3C5C", overflowY: "auto", padding: "1rem" }}>
                    <h3 style={{ fontFamily: "Jersey 20, sans-serif", marginBottom: "1rem" }}>
                        Files Changed ({prDetails.files.length})
                    </h3>
                    {prDetails.files.map((file) => (
                        <div
                            key={file.filename}
                            onClick={() => loadFileContent(file)}
                            style={{
                                padding: "0.75rem",
                                marginBottom: "0.5rem",
                                backgroundColor: selectedFile?.filename === file.filename ? "#1a1a2e" : "transparent",
                                border: "1px solid #3C3C5C",
                                borderRadius: "8px",
                                cursor: "pointer",
                                fontFamily: "Jersey 20, sans-serif",
                            }}
                        >
                            <div style={{ fontSize: "0.9rem", marginBottom: "0.25rem" }}>{file.filename}</div>
                            <div style={{ fontSize: "0.75rem", color: "#888" }}>
                                <span style={{ color: "#4ade80" }}>+{file.additions}</span>
                                {" "}
                                <span style={{ color: "#ff6b6b" }}>-{file.deletions}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Editor */}
                <div style={{ flex: 1, padding: "1rem" }}>
                    {selectedFile ? (
                        <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                            <div style={{ marginBottom: "0.5rem", fontFamily: "Jersey 20, sans-serif" }}>
                                Editing: {selectedFile.filename}
                            </div>
                            <textarea
                                value={fileContent}
                                onChange={(e) => setFileContent(e.target.value)}
                                style={{
                                    flex: 1,
                                    width: "100%",
                                    backgroundColor: "#1e1e1e",
                                    color: "#d4d4d4",
                                    border: "1px solid #3C3C5C",
                                    borderRadius: "8px",
                                    padding: "1rem",
                                    fontFamily: "monospace",
                                    fontSize: "14px",
                                    lineHeight: "1.5",
                                    resize: "none",
                                    outline: "none",
                                }}
                                spellCheck={false}
                            />
                        </div>
                    ) : (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                            <p>Select a file to view and edit</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
