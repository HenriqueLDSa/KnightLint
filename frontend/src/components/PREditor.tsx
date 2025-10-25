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
    const [activeTab, setActiveTab] = useState<"security" | "code_quality" | "performance">("security");

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
        <div style={{ height: "100vh", width: "100vw", backgroundColor: "#0D0827", color: "white", display: "flex", flexDirection: "column", overflow: "hidden", position: "fixed", top: 0, left: 0 }}>
            {/* Compact Header */}
            <div style={{ padding: "0.5rem 1rem", borderBottom: "1px solid #3C3C5C", display: "flex", alignItems: "center", gap: "1rem", flexShrink: 0 }}>
                <button
                    onClick={() => navigate(`/repo/${repoName}?token=${token}&username=${username}`)}
                    style={{
                        backgroundColor: "transparent",
                        border: "1px solid #3C3C5C",
                        color: "white",
                        padding: "0.4rem 0.8rem",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontFamily: "Jersey 20, sans-serif",
                        fontSize: "0.85rem",
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
                <h1 className="landing-title" style={{ fontSize: "1.2rem", margin: 0, animation: "none", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <img src="/favicon.ico" alt="PR" style={{ width: "24px", height: "24px" }} />
                    {prDetails.title}
                </h1>
                <p style={{ color: "#888", fontSize: "0.8rem", margin: 0, marginLeft: "auto" }}>
                    by {prDetails.user} • {prDetails.state}
                </p>
            </div>

            <div style={{ display: "flex", flex: 1, overflow: "hidden", gap: "1rem", padding: "1rem", minHeight: 0 }}>
                {/* Left: Text Editor + Files Below */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.75rem", minWidth: 0 }}>
                    {/* Text Editor - BIGGER */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", border: "1px solid #3C3C5C", borderRadius: "8px", padding: "0.75rem", minHeight: 0 }}>
                        {selectedFile ? (
                            <>
                                <div style={{ marginBottom: "0.5rem", fontFamily: "Jersey 20, sans-serif", fontSize: "0.9rem" }}>
                                    Editing: {selectedFile.filename}
                                </div>
                                <div style={{ flex: 1, border: "1px solid #3C3C5C", borderRadius: "8px", overflow: "hidden", marginBottom: "0.5rem", minHeight: 0 }}>
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
                                {/* Bottom right buttons */}
                                <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                                    <button
                                        onClick={recheckPR}
                                        disabled={analyzing}
                                        style={{
                                            backgroundColor: "transparent",
                                            border: "1px solid #3C3C5C",
                                            color: "white",
                                            padding: "0.5rem 1rem",
                                            borderRadius: "8px",
                                            cursor: analyzing ? "not-allowed" : "pointer",
                                            fontFamily: "Jersey 20, sans-serif",
                                            fontSize: "0.9rem",
                                        }}
                                    >
                                        {analyzing ? "Rechecking..." : "🔄 Recheck"}
                                    </button>
                                    <button
                                        onClick={commitChanges}
                                        disabled={committing}
                                        style={{
                                            backgroundColor: "transparent",
                                            border: "1px solid #3C3C5C",
                                            color: "white",
                                            padding: "0.5rem 1rem",
                                            borderRadius: "8px",
                                            cursor: committing ? "not-allowed" : "pointer",
                                            fontFamily: "Jersey 20, sans-serif",
                                            fontSize: "0.9rem",
                                        }}
                                    >
                                        {committing ? "Committing..." : "💾 Commit Changes"}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <p>Select a file to view and edit</p>
                            </div>
                        )}
                    </div>

                    {/* Files Changed - Below Editor */}
                    <div style={{ height: "100px", border: "1px solid #3C3C5C", borderRadius: "8px", padding: "0.75rem", overflowY: "auto", flexShrink: 0 }}>
                        <h3 style={{ fontFamily: "Jersey 20, sans-serif", marginBottom: "0.5rem", fontSize: "0.95rem", marginTop: 0 }}>
                            Files Changed ({prDetails.files.length})
                        </h3>
                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                            {prDetails.files.map((file) => (
                                <div
                                    key={file.filename}
                                    onClick={() => loadFileContent(file)}
                                    style={{
                                        padding: "0.5rem 1rem",
                                        backgroundColor: "transparent",
                                        border: selectedFile?.filename === file.filename ? "2px solid #646cff" : "1px solid #3C3C5C",
                                        borderRadius: "8px",
                                        cursor: "pointer",
                                        fontFamily: "Jersey 20, sans-serif",
                                        fontSize: "0.85rem",
                                    }}
                                >
                                    {file.filename}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: AI Analysis */}
                <div style={{ width: "450px", border: "1px solid #3C3C5C", borderRadius: "8px", padding: "1rem", display: "flex", flexDirection: "column", minHeight: 0, flexShrink: 0 }}>
                    {/* Tab Buttons */}
                    <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
                        <button
                            onClick={() => {
                                setActiveTab("security");
                                if (!analysis && !analyzing) analyzePR();
                            }}
                            style={{
                                flex: 1,
                                backgroundColor: "transparent",
                                border: activeTab === "security" ? "2px solid #646cff" : "1px solid #3C3C5C",
                                color: "white",
                                padding: "0.75rem",
                                borderRadius: "8px",
                                cursor: "pointer",
                                fontFamily: "Jersey 20, sans-serif",
                                fontSize: "0.9rem",
                            }}
                        >
                            Security
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab("code_quality");
                                if (!analysis && !analyzing) analyzePR();
                            }}
                            style={{
                                flex: 1,
                                backgroundColor: "transparent",
                                border: activeTab === "code_quality" ? "2px solid #646cff" : "1px solid #3C3C5C",
                                color: "white",
                                padding: "0.75rem",
                                borderRadius: "8px",
                                cursor: "pointer",
                                fontFamily: "Jersey 20, sans-serif",
                                fontSize: "0.9rem",
                            }}
                        >
                            Code Quality
                        </button>
                        <button
                            onClick={() => {
                                setActiveTab("performance");
                                if (!analysis && !analyzing) analyzePR();
                            }}
                            style={{
                                flex: 1,
                                backgroundColor: "transparent",
                                border: activeTab === "performance" ? "2px solid #646cff" : "1px solid #3C3C5C",
                                color: "white",
                                padding: "0.75rem",
                                borderRadius: "8px",
                                cursor: "pointer",
                                fontFamily: "Jersey 20, sans-serif",
                                fontSize: "0.9rem",
                            }}
                        >
                            Performance
                        </button>
                    </div>

                    {/* Issues Display with Colored Boxes */}
                    <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem" }}>
                        {analyzing ? (
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                                <p>Analyzing with AI...</p>
                            </div>
                        ) : !analysis ? (
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                                <p style={{ textAlign: "center", color: "#888" }}>Click a tab to analyze with AI</p>
                            </div>
                        ) : (
                            <>
                                {activeTab === "security" && analysis.security_issues.map((issue, idx) => {
                                    const severityColor = issue.severity === "high" ? "#ff6b6b" : issue.severity === "medium" ? "#ffa500" : "#ffff00";
                                    return (
                                        <div key={idx} style={{ 
                                            padding: "1rem", 
                                            backgroundColor: "transparent", 
                                            border: `2px solid ${severityColor}`,
                                            borderRadius: "8px",
                                            color: "white"
                                        }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                                                <span style={{ fontSize: "0.75rem", color: "#888" }}>{issue.file}</span>
                                                <span style={{ fontSize: "0.75rem", fontWeight: "bold", color: severityColor }}>
                                                    {issue.severity.toUpperCase()}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>{issue.description}</div>
                                            <div style={{ fontSize: "0.85rem", color: "#888" }}>💡 {issue.suggestion}</div>
                                        </div>
                                    );
                                })}
                                {activeTab === "code_quality" && analysis.code_quality_issues.map((issue, idx) => {
                                    const severityColor = issue.severity === "high" ? "#ff6b6b" : issue.severity === "medium" ? "#ffa500" : "#ffff00";
                                    return (
                                        <div key={idx} style={{ 
                                            padding: "1rem", 
                                            backgroundColor: "transparent", 
                                            border: `2px solid ${severityColor}`,
                                            borderRadius: "8px",
                                            color: "white"
                                        }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                                                <span style={{ fontSize: "0.75rem", color: "#888" }}>{issue.file}</span>
                                                <span style={{ fontSize: "0.75rem", fontWeight: "bold", color: severityColor }}>
                                                    {issue.severity.toUpperCase()}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>{issue.description}</div>
                                            <div style={{ fontSize: "0.85rem", color: "#888" }}>💡 {issue.suggestion}</div>
                                        </div>
                                    );
                                })}
                                {activeTab === "performance" && analysis.performance_issues.map((issue, idx) => {
                                    const severityColor = issue.severity === "high" ? "#ff6b6b" : issue.severity === "medium" ? "#ffa500" : "#ffff00";
                                    return (
                                        <div key={idx} style={{ 
                                            padding: "1rem", 
                                            backgroundColor: "transparent", 
                                            border: `2px solid ${severityColor}`,
                                            borderRadius: "8px",
                                            color: "white"
                                        }}>
                                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                                                <span style={{ fontSize: "0.75rem", color: "#888" }}>{issue.file}</span>
                                                <span style={{ fontSize: "0.75rem", fontWeight: "bold", color: severityColor }}>
                                                    {issue.severity.toUpperCase()}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>{issue.description}</div>
                                            <div style={{ fontSize: "0.85rem", color: "#888" }}>💡 {issue.suggestion}</div>
                                        </div>
                                    );
                                })}
                                {activeTab === "security" && analysis.security_issues.length === 0 && (
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                                        <p style={{ color: "#888" }}>No security issues found ✓</p>
                                    </div>
                                )}
                                {activeTab === "code_quality" && analysis.code_quality_issues.length === 0 && (
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                                        <p style={{ color: "#888" }}>No code quality issues found ✓</p>
                                    </div>
                                )}
                                {activeTab === "performance" && analysis.performance_issues.length === 0 && (
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                                        <p style={{ color: "#888" }}>No performance issues found ✓</p>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
