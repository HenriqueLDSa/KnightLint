import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";
import "./RepoSelect.css";

interface Repository {
    id: number;
    name: string;
    description: string;
    language: string;
    languages_url: string;
    updated_at: string;
    open_issues_count?: number;
}

interface PRStats {
    total: number;
    open: number;
    closed: number;
}

interface LanguagesMap {
    [key: string]: string[];
}

export default function RepoSelect() {
    const navigate = useNavigate();
    const [repos, setRepos] = useState<Repository[]>([]);
    const [prStats, setPrStats] = useState<Map<string, PRStats>>(new Map());
    const [languages, setLanguages] = useState<LanguagesMap>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token") || "";
    const username = params.get("username") || "";

    const backendBaseUrl = "https://backend-production-9cc8.up.railway.app";

    useEffect(() => {
        if (!token || !username) {
            setError("Authentication required. Please log in again.");
            setLoading(false);
            return;
        }

        const fetchRepos = async () => {
            try {
                const res = await fetch(
                    `${backendBaseUrl}/user-repos?token=${token}&username=${username}`
                );
                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    setError(errorData.error || "Failed to load repositories");
                    setLoading(false);
                    return;
                }
                const data = await res.json();
                console.log("Fetched repos:", data);
                const repositories = data.repositories || [];
                console.log("First repo languages_url:", repositories[0]?.languages_url);
                setRepos(repositories);

                // Fetch PR stats and languages for each repository
                const statsMap = new Map<string, PRStats>();
                const langMap: LanguagesMap = {};

                await Promise.all(
                    repositories.map(async (repo: Repository) => {
                        try {
                            // Fetch PR stats
                            const prRes = await fetch(
                                `${backendBaseUrl}/repo-pull-requests?token=${token}&username=${username}&repo_name=${repo.name}`
                            );
                            if (prRes.ok) {
                                const prData = await prRes.json();
                                const pulls = prData.pull_requests || [];
                                const stats: PRStats = {
                                    total: pulls.length,
                                    open: pulls.filter((pr: any) => pr.state === 'open').length,
                                    closed: pulls.filter((pr: any) => pr.state === 'closed').length,
                                };
                                statsMap.set(repo.name, stats);
                            }

                            // Fetch languages
                            if (repo.languages_url) {
                                console.log(`Fetching languages for ${repo.name} from:`, repo.languages_url);
                                const langRes = await fetch(repo.languages_url, {
                                    headers: {
                                        'Authorization': `Bearer ${token}`,
                                        'Accept': 'application/vnd.github.v3+json'
                                    }
                                });
                                if (langRes.ok) {
                                    const langData = await langRes.json();
                                    console.log(`Languages for ${repo.name}:`, langData);
                                    langMap[repo.name] = Object.keys(langData);
                                } else {
                                    console.error(`Failed to fetch languages for ${repo.name}:`, langRes.status);
                                }
                            } else {
                                console.log(`No languages_url for ${repo.name}`);
                            }
                        } catch (err) {
                            console.error(`Failed to fetch data for ${repo.name}:`, err);
                        }
                    })
                );

                setPrStats(statsMap);
                setLanguages(langMap);
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

    const getLanguageIcon = (language: string): string => {
        const icons: { [key: string]: string } = {
            'JavaScript': '🟨',
            'TypeScript': '🔷',
            'Python': '🐍',
            'Java': '☕',
            'C': '🔵',
            'C++': '🔵',
            'C#': '💜',
            'Ruby': '💎',
            'Go': '🐹',
            'Rust': '🦀',
            'PHP': '🐘',
            'Swift': '🍎',
            'Kotlin': '🟣',
            'Dart': '🎯',
            'HTML': '🌐',
            'CSS': '🎨',
            'Shell': '🐚',
            'R': '📊',
            'Scala': '🔴',
            'Lua': '🌙',
            'Perl': '🐪',
            'Haskell': '🎓',
            'Elixir': '💧',
            'Clojure': '🔵',
            'Vue': '💚',
            'React': '⚛️',
            'Objective-C': '🍏',
            'Assembly': '⚙️',
            'MATLAB': '📐',
            'Groovy': '⚡',
            'Julia': '🔬',
        };
        return icons[language] || '📄';
    };

    const isActualProgrammingLanguage = (language: string): boolean => {
        // List of non-programming languages and markup/config files to exclude
        const excludeList = [
            'Rich Text Format',
            'Makefile',
            'Dockerfile',
            'CMake',
            'YAML',
            'JSON',
            'XML',
            'Markdown',
            'Text',
            'INI',
            'TOML',
            'CSV',
            'Batchfile',
            'PowerShell',
            'Vim Script',
            'Emacs Lisp',
            'TeX',
            'Vim Snippet',
        ];
        return !excludeList.includes(language);
    };

    if (loading) {
        return (
            <div className="repo-select-loading">
                <p>Loading your repositories...</p>
            </div>
        );
    }

    return (
        <div className="repo-select-container">
            <h1 className="repo-select-title">
                <span className="bouncing-text">Select a Repository</span>
            </h1>

            {error && (
                <p className="repo-select-error">
                    {error}
                </p>
            )}

            {!error && repos.length === 0 && (
                <p className="repo-select-no-repos">No repositories found.</p>
            )}

            <div className="repo-select-grid">
                {repos.map((repo) => {
                    const stats = prStats.get(repo.name);
                    const repoLanguages = (languages[repo.name] || []).filter(isActualProgrammingLanguage);
                    return (
                        <div
                            key={repo.id}
                            onClick={() => handleRepoClick(repo.name)}
                            className="repo-card"
                        >
                            <div className="repo-card-header">
                                <h3>{repo.name}</h3>
                                {stats && (
                                    <div className="repo-card-stats">
                                        <span>Pull Requests: {stats.total}</span>
                                        <span>Last Updated: {new Date(repo.updated_at).toLocaleDateString()}</span>
                                    </div>
                                )}
                            </div>

                            <p className="repo-card-description">
                                {repo.description || "No description available"}
                            </p>

                            <div className="repo-card-footer">
                                {repoLanguages.length > 0 ? (
                                    <div className="repo-language">
                                        {repoLanguages.map((lang, idx) => (
                                            <span key={lang}>
                                                {getLanguageIcon(lang)} {lang}
                                                {idx < repoLanguages.length - 1 ? ', ' : ''}
                                            </span>
                                        ))}
                                    </div>
                                ) : repo.language && isActualProgrammingLanguage(repo.language) ? (
                                    <div className="repo-language">
                                        {getLanguageIcon(repo.language)} {repo.language}
                                    </div>
                                ) : (
                                    <div className="repo-language">
                                        📄 No language data
                                    </div>
                                )}
                                {!stats && (
                                    <span className="repo-updated">
                                        Updated: {new Date(repo.updated_at).toLocaleDateString()}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}