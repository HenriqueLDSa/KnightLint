import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import "../App.css";
import "../PREditor.css";

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
            <div className="loading-container">
                <p>Loading PR details...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="loading-container">
                <p className="error-text">{error}</p>
            </div>
        );
    }

    if (!prDetails) {
        return (
            <div className="loading-container">
                <p>No PR details found.</p>
            </div>
        );
    }

    return (
        <div className="pr-editor-container">
            {/* Compact Header */}
            <div className="pr-editor-header">
                <button
                    className="back-button"
                    onClick={() => navigate(`/repo/${repoName}?token=${token}&username=${username}`)}
                >
                    ← Back to PRs
                </button>
                <h1 className="landing-title pr-title">
                    <img src="/favicon.ico" alt="PR" className="pr-icon" />
                    {prDetails.title}
                </h1>
                <p className="pr-meta">
                    by {prDetails.user} • {prDetails.state}
                </p>
            </div>

            <div className="main-content">
                {/* Left: Text Editor + Files Below */}
                <div className="left-panel">
                    {/* Text Editor - BIGGER */}
                    <div className="editor-container">
                        {selectedFile ? (
                            <>
                                <div className="editor-label">
                                    Editing: {selectedFile.filename}
                                </div>
                                <div className="editor-wrapper">
                                    <Editor
                                        height="100%"
                                        language={selectedFile.filename.endsWith('.py') ? 'python' : 
                                                 selectedFile.filename.endsWith('.js') ? 'javascript' :
                                                 selectedFile.filename.endsWith('.ts') ? 'typescript' :
                                                 selectedFile.filename.endsWith('.tsx') ? 'typescript' :
                                                 selectedFile.filename.endsWith('.jsx') ? 'javascript' :
                                                 selectedFile.filename.endsWith('.json') ? 'json' :
                                                 selectedFile.filename.endsWith('.html') ? 'html' :
                                                 selectedFile.filename.endsWith('.css') ? 'css' :
                                                 selectedFile.filename.endsWith('.java') ? 'java' :
                                                 selectedFile.filename.endsWith('.cpp') || selectedFile.filename.endsWith('.c') ? 'cpp' :
                                                 selectedFile.filename.endsWith('.go') ? 'go' :
                                                 selectedFile.filename.endsWith('.rs') ? 'rust' :
                                                 selectedFile.filename.endsWith('.md') ? 'markdown' :
                                                 'plaintext'}
                                        theme="vs-dark"
                                        value={fileContent}
                                        onChange={(value) => setFileContent(value || "")}
                                        options={{
                                            minimap: { enabled: false },
                                            fontSize: 14,
                                            lineNumbers: "on",
                                            scrollBeyondLastLine: false,
                                            automaticLayout: true,
                                            wordWrap: "on",
                                            tabSize: 4,
                                            insertSpaces: true,
                                        }}
                                    />
                                </div>
                                {/* Bottom right buttons */}
                                <div className="editor-buttons">
                                    <button
                                        className="editor-button"
                                        onClick={recheckPR}
                                        disabled={analyzing}
                                    >
                                        {analyzing ? "Rechecking..." : "🔄 Recheck"}
                                    </button>
                                    <button
                                        className="editor-button"
                                        onClick={commitChanges}
                                        disabled={committing}
                                    >
                                        {committing ? "Committing..." : "💾 Commit Changes"}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="empty-editor">
                                <p>Select a file to view and edit</p>
                            </div>
                        )}
                    </div>

                    {/* Files Changed - Below Editor */}
                    <div className="files-section">
                        <h3 className="files-title">
                            Files Changed ({prDetails.files.length})
                        </h3>
                        <div className="files-list">
                            {prDetails.files.map((file) => (
                                <div
                                    key={file.filename}
                                    className={`file-item ${selectedFile?.filename === file.filename ? 'selected' : ''}`}
                                    onClick={() => loadFileContent(file)}
                                >
                                    {file.filename}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: AI Analysis */}
                <div className="right-panel">
                    {/* Tab Buttons */}
                    <div className="tab-buttons">
                        <button
                            className={`tab-button ${activeTab === "security" ? 'active' : ''}`}
                            onClick={() => {
                                setActiveTab("security");
                                if (!analysis && !analyzing) analyzePR();
                            }}
                        >
                            Security
                        </button>
                        <button
                            className={`tab-button ${activeTab === "code_quality" ? 'active' : ''}`}
                            onClick={() => {
                                setActiveTab("code_quality");
                                if (!analysis && !analyzing) analyzePR();
                            }}
                        >
                            Code Quality
                        </button>
                        <button
                            className={`tab-button ${activeTab === "performance" ? 'active' : ''}`}
                            onClick={() => {
                                setActiveTab("performance");
                                if (!analysis && !analyzing) analyzePR();
                            }}
                        >
                            Performance
                        </button>
                    </div>

                    {/* Issues Display with Colored Boxes */}
                    <div className="issues-container">
                        {analyzing ? (
                            <div className="loading-state">
                                <p>Analyzing with AI...</p>
                            </div>
                        ) : !analysis ? (
                            <div className="empty-state">
                                <p>Click a tab to analyze with AI</p>
                            </div>
                        ) : (
                            <>
                                {activeTab === "security" && analysis.security_issues.map((issue, idx) => {
                                    const severityColor = issue.severity === "high" ? "#ff6b6b" : issue.severity === "medium" ? "#ffa500" : "#ffff00";
                                    return (
                                        <div key={idx} className="issue-box" style={{ border: `2px solid ${severityColor}` }}>
                                            <div className="issue-header">
                                                <span className="issue-file">{issue.file}</span>
                                                <span className="issue-severity" style={{ color: severityColor }}>
                                                    {issue.severity.toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="issue-description">{issue.description}</div>
                                            <div className="issue-suggestion">💡 {issue.suggestion}</div>
                                        </div>
                                    );
                                })}
                                {activeTab === "code_quality" && analysis.code_quality_issues.map((issue, idx) => {
                                    const severityColor = issue.severity === "high" ? "#ff6b6b" : issue.severity === "medium" ? "#ffa500" : "#ffff00";
                                    return (
                                        <div key={idx} className="issue-box" style={{ border: `2px solid ${severityColor}` }}>
                                            <div className="issue-header">
                                                <span className="issue-file">{issue.file}</span>
                                                <span className="issue-severity" style={{ color: severityColor }}>
                                                    {issue.severity.toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="issue-description">{issue.description}</div>
                                            <div className="issue-suggestion">💡 {issue.suggestion}</div>
                                        </div>
                                    );
                                })}
                                {activeTab === "performance" && analysis.performance_issues.map((issue, idx) => {
                                    const severityColor = issue.severity === "high" ? "#ff6b6b" : issue.severity === "medium" ? "#ffa500" : "#ffff00";
                                    return (
                                        <div key={idx} className="issue-box" style={{ border: `2px solid ${severityColor}` }}>
                                            <div className="issue-header">
                                                <span className="issue-file">{issue.file}</span>
                                                <span className="issue-severity" style={{ color: severityColor }}>
                                                    {issue.severity.toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="issue-description">{issue.description}</div>
                                            <div className="issue-suggestion">💡 {issue.suggestion}</div>
                                        </div>
                                    );
                                })}
                                {activeTab === "security" && analysis.security_issues.length === 0 && (
                                    <div className="empty-state">
                                        <p>No security issues found ✓</p>
                                    </div>
                                )}
                                {activeTab === "code_quality" && analysis.code_quality_issues.length === 0 && (
                                    <div className="empty-state">
                                        <p>No code quality issues found ✓</p>
                                    </div>
                                )}
                                {activeTab === "performance" && analysis.performance_issues.length === 0 && (
                                    <div className="empty-state">
                                        <p>No performance issues found ✓</p>
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
