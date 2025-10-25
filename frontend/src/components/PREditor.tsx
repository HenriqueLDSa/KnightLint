import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import "../App.css";

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

interface Issue {
    severity: string;
    description: string;
    file: string;
    suggestion: string;
}

interface Analysis {
    security_issues: Issue[];
    code_quality_issues: Issue[];
    performance_issues: Issue[];
    summary: string;
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
    const [analysis, setAnalysis] = useState<Analysis | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [committing, setCommitting] = useState(false);

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

    const analyzePR = async () => {
        setAnalyzing(true);
        try {
            const response = await fetch(
                `http://localhost:8000/analyze-pr?token=${token}&username=${username}&repo_name=${repoName}&pr_number=${prNumber}`,
                { method: "POST" }
            );
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                alert(errorData.error || "Failed to analyze PR");
                return;
            }
            const data = await response.json();
            setAnalysis(data.analysis);
        } catch (err) {
            console.error("Failed to analyze PR:", err);
            alert("An error occurred while analyzing the PR.");
        } finally {
            setAnalyzing(false);
        }
    };

    const commitChanges = async () => {
        if (!selectedFile) {
            alert("Please select a file first");
            return;
        }

        const commitMessage = prompt("Enter commit message:", `Update ${selectedFile.filename}`);
        if (!commitMessage) return;

        setCommitting(true);
        try {
            const response = await fetch(
                `http://localhost:8000/commit-changes?token=${token}&username=${username}&repo_name=${repoName}&pr_number=${prNumber}&file_path=${encodeURIComponent(selectedFile.filename)}&content=${encodeURIComponent(fileContent)}&commit_message=${encodeURIComponent(commitMessage)}`,
                { method: "POST" }
            );
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                alert(errorData.error || "Failed to commit changes");
                return;
            }
            alert("Changes committed successfully!");
        } catch (err) {
            console.error("Failed to commit changes:", err);
            alert("An error occurred while committing changes.");
        } finally {
            setCommitting(false);
        }
    };

    const recheckPR = async () => {
        setAnalyzing(true);
        try {
            const response = await fetch(
                `http://localhost:8000/recheck-pr?token=${token}&username=${username}&repo_name=${repoName}&pr_number=${prNumber}`,
                { method: "POST" }
            );
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                alert(errorData.error || "Failed to recheck PR");
                return;
            }
            const data = await response.json();
            setAnalysis(data.analysis);
            alert("PR rechecked successfully!");
        } catch (err) {
            console.error("Failed to recheck PR:", err);
            alert("An error occurred while rechecking the PR.");
        } finally {
            setAnalyzing(false);
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
        <div style={{ minHeight: "100vh", backgroundColor: "#0D0827", color: "white", display: "flex", flexDirection: "column" }}>
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

            <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
                {/* Left sidebar: AI Analysis */}
                <div style={{ width: "350px", borderRight: "1px solid #3C3C5C", overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column" }}>
                    <div style={{ marginBottom: "1rem" }}>
                        <button
                            onClick={analyzePR}
                            disabled={analyzing}
                            style={{
                                width: "100%",
                                backgroundColor: analyzing ? "#555" : "#646cff",
                                border: "none",
                                color: "white",
                                padding: "0.75rem",
                                borderRadius: "8px",
                                cursor: analyzing ? "not-allowed" : "pointer",
                                fontFamily: "Jersey 20, sans-serif",
                                fontSize: "1rem",
                                marginBottom: "0.5rem"
                            }}
                        >
                            {analyzing ? "Analyzing..." : "🔍 Analyze with AI"}
                        </button>
                        <button
                            onClick={recheckPR}
                            disabled={analyzing}
                            style={{
                                width: "100%",
                                backgroundColor: analyzing ? "#555" : "transparent",
                                border: "1px solid #3C3C5C",
                                color: "white",
                                padding: "0.75rem",
                                borderRadius: "8px",
                                cursor: analyzing ? "not-allowed" : "pointer",
                                fontFamily: "Jersey 20, sans-serif",
                                fontSize: "1rem"
                            }}
                        >
                            {analyzing ? "Rechecking..." : "🔄 Recheck PR"}
                        </button>
                    </div>

                    {analysis && (
                        <div style={{ flex: 1, overflowY: "auto" }}>
                            <h3 style={{ fontFamily: "Jersey 20, sans-serif", marginBottom: "1rem", fontSize: "1.3rem" }}>
                                AI Analysis
                            </h3>

                            {/* Summary */}
                            {analysis.summary && (
                                <div style={{ marginBottom: "1.5rem", padding: "1rem", backgroundColor: "#1a1a2e", borderRadius: "8px" }}>
                                    <h4 style={{ fontSize: "1rem", marginBottom: "0.5rem", color: "#646cff" }}>Summary</h4>
                                    <p style={{ fontSize: "0.85rem", color: "#ccc" }}>{analysis.summary}</p>
                                </div>
                            )}

                            {/* Security Issues */}
                            <div style={{ marginBottom: "1.5rem" }}>
                                <h4 style={{ fontSize: "1rem", marginBottom: "0.5rem", color: "#ff6b6b" }}>
                                    🔒 Security Issues ({analysis.security_issues.length})
                                </h4>
                                {analysis.security_issues.length === 0 ? (
                                    <p style={{ fontSize: "0.85rem", color: "#888" }}>No issues found</p>
                                ) : (
                                    analysis.security_issues.map((issue, idx) => (
                                        <div key={idx} style={{ marginBottom: "0.75rem", padding: "0.75rem", backgroundColor: "#1a1a2e", borderRadius: "8px", borderLeft: `3px solid ${issue.severity === "high" ? "#ff6b6b" : issue.severity === "medium" ? "#ffa500" : "#ffff00"}` }}>
                                            <div style={{ fontSize: "0.75rem", color: "#888", marginBottom: "0.25rem" }}>
                                                {issue.file} • {issue.severity.toUpperCase()}
                                            </div>
                                            <div style={{ fontSize: "0.85rem", marginBottom: "0.5rem" }}>{issue.description}</div>
                                            <div style={{ fontSize: "0.8rem", color: "#4ade80" }}>💡 {issue.suggestion}</div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Code Quality Issues */}
                            <div style={{ marginBottom: "1.5rem" }}>
                                <h4 style={{ fontSize: "1rem", marginBottom: "0.5rem", color: "#ffa500" }}>
                                    ✨ Code Quality ({analysis.code_quality_issues.length})
                                </h4>
                                {analysis.code_quality_issues.length === 0 ? (
                                    <p style={{ fontSize: "0.85rem", color: "#888" }}>No issues found</p>
                                ) : (
                                    analysis.code_quality_issues.map((issue, idx) => (
                                        <div key={idx} style={{ marginBottom: "0.75rem", padding: "0.75rem", backgroundColor: "#1a1a2e", borderRadius: "8px", borderLeft: `3px solid ${issue.severity === "high" ? "#ff6b6b" : issue.severity === "medium" ? "#ffa500" : "#ffff00"}` }}>
                                            <div style={{ fontSize: "0.75rem", color: "#888", marginBottom: "0.25rem" }}>
                                                {issue.file} • {issue.severity.toUpperCase()}
                                            </div>
                                            <div style={{ fontSize: "0.85rem", marginBottom: "0.5rem" }}>{issue.description}</div>
                                            <div style={{ fontSize: "0.8rem", color: "#4ade80" }}>💡 {issue.suggestion}</div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Performance Issues */}
                            <div style={{ marginBottom: "1.5rem" }}>
                                <h4 style={{ fontSize: "1rem", marginBottom: "0.5rem", color: "#4ade80" }}>
                                    ⚡ Performance ({analysis.performance_issues.length})
                                </h4>
                                {analysis.performance_issues.length === 0 ? (
                                    <p style={{ fontSize: "0.85rem", color: "#888" }}>No issues found</p>
                                ) : (
                                    analysis.performance_issues.map((issue, idx) => (
                                        <div key={idx} style={{ marginBottom: "0.75rem", padding: "0.75rem", backgroundColor: "#1a1a2e", borderRadius: "8px", borderLeft: `3px solid ${issue.severity === "high" ? "#ff6b6b" : issue.severity === "medium" ? "#ffa500" : "#ffff00"}` }}>
                                            <div style={{ fontSize: "0.75rem", color: "#888", marginBottom: "0.25rem" }}>
                                                {issue.file} • {issue.severity.toUpperCase()}
                                            </div>
                                            <div style={{ fontSize: "0.85rem", marginBottom: "0.5rem" }}>{issue.description}</div>
                                            <div style={{ fontSize: "0.8rem", color: "#4ade80" }}>💡 {issue.suggestion}</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {!analysis && !analyzing && (
                        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#888" }}>
                            <p style={{ textAlign: "center" }}>Click "Analyze with AI" to get AI-powered code review</p>
                        </div>
                    )}
                </div>

                {/* Middle: File list */}
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

                {/* Right: Editor */}
                <div style={{ flex: 1, padding: "1rem", display: "flex", flexDirection: "column" }}>
                    {selectedFile ? (
                        <>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem", fontFamily: "Jersey 20, sans-serif" }}>
                                <div>Editing: {selectedFile.filename}</div>
                                <button
                                    onClick={commitChanges}
                                    disabled={committing}
                                    style={{
                                        backgroundColor: committing ? "#555" : "#4ade80",
                                        border: "none",
                                        color: "#0D0827",
                                        padding: "0.5rem 1rem",
                                        borderRadius: "8px",
                                        cursor: committing ? "not-allowed" : "pointer",
                                        fontFamily: "Jersey 20, sans-serif",
                                        fontSize: "0.9rem",
                                        fontWeight: "bold"
                                    }}
                                >
                                    {committing ? "Committing..." : "💾 Commit Changes"}
                                </button>
                            </div>
                            <div style={{ flex: 1, border: "1px solid #3C3C5C", borderRadius: "8px", overflow: "hidden" }}>
                                <Editor
                                    height="100%"
                                    defaultLanguage={selectedFile.filename.split('.').pop() || "plaintext"}
                                    theme="vs-dark"
                                    value={fileContent}
                                    onChange={(value) => setFileContent(value || "")}
                                    options={{
                                        minimap: { enabled: false },
                                        fontSize: 14,
                                        lineNumbers: "on",
                                        scrollBeyondLastLine: false,
                                        automaticLayout: true,
                                    }}
                                />
                            </div>
                        </>
                    ) : (
                        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <p>Select a file to view and edit</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
