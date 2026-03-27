"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

// ─── Types (mirror what the API returns) ───────────────────────────────────

interface LanguageStat {
  name: string;
  bytes: number;
  percentage: number;
}

interface TopRepo {
  name: string;
  stars: number;
  forks: number;
  language: string | null;
  url: string;
  description: string | null;
}

interface GitHubProfile {
  username: string;
  name: string | null;
  bio: string | null;
  avatarUrl: string;
  location: string | null;
  publicUrl: string;
  followers: number;
  following: number;
  publicRepos: number;
  totalStars: number;
  totalForks: number;
  createdAt: string;
  accountAgeDays: number;
  languageStats: LanguageStat[];
  topRepos: TopRepo[];
}

interface DeveloperProfile {
  category: string;
  classificationReason: string;
  scores: {
    activityScore: number;
    popularityScore: number;
    diversityScore: number;
    overallScore: number;
  };
}

// ─── Language color palette ─────────────────────────────────────────────────

const LANG_COLORS: Record<string, string> = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Python: "#3572A5",
  Go: "#00ADD8",
  Rust: "#dea584",
  Java: "#b07219",
  CSS: "#563d7c",
  HTML: "#e34c26",
  Shell: "#89e051",
  "C#": "#178600",
  Ruby: "#701516",
  PHP: "#4F5D95",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  "C++": "#f34b7d",
  C: "#555555",
  Dart: "#00B4AB",
  Scala: "#c22d40",
  Vue: "#41b883",
  Svelte: "#ff3e00",
};

function getLangColor(lang: string): string {
  return LANG_COLORS[lang] ?? "#8b949e";
}

// ─── Category config ─────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { color: string; emoji: string }> = {
  Frontend: { color: "#58a6ff", emoji: "🎨" },
  Backend: { color: "#3fb950", emoji: "⚙️" },
  "Full-Stack": { color: "#bc8cff", emoji: "🔮" },
  DevOps: { color: "#d29922", emoji: "🚀" },
  "Data Science": { color: "#f78166", emoji: "📊" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
}

function memberSince(createdAt: string): string {
  const years = Math.floor(
    (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24 * 365)
  );
  if (years === 0) return "Member for less than a year";
  return `Member for ${years} year${years > 1 ? "s" : ""}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SkeletonPulse() {
  return (
    <div className="gh-page">
      {/* Loading hint */}
      <div className="flex flex-col items-center justify-center mb-10 gap-4 mt-8">
        <div className="flex items-center gap-3 text-[#8b949e]">
          <svg className="animate-spin h-5 w-5 text-[#8b949e]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm font-medium">Profil taranıyor</span>
        </div>
        {/* Progress bar */}
        <div className="w-64 h-1.5 bg-[#21262d] rounded-full overflow-hidden">
          <div className="h-full bg-[#3fb950] w-[40%] rounded-full animate-scanning" />
        </div>
      </div>

      <div className="gh-layout animate-pulse">
        {/* ── Left sidebar skeleton ── */}
        <div className="flex flex-col gap-3">
          {/* Avatar */}
          <div className="w-full aspect-square max-w-[260px] rounded-full bg-gray-700" />
          {/* Name */}
          <div className="h-6 w-4/5 rounded bg-gray-700 mt-2" />
          {/* Username */}
          <div className="h-4 w-3/5 rounded bg-gray-700" />
          {/* Badge */}
          <div className="h-6 w-2/5 rounded-full bg-gray-700 mt-2" />
          {/* Divider */}
          <div className="h-px w-full bg-gray-700 my-2" />
          {/* Meta lines */}
          <div className="h-3 w-3/4 rounded bg-gray-700" />
          <div className="h-3 w-1/2 rounded bg-gray-700" />
          <div className="h-3 w-2/3 rounded bg-gray-700" />
        </div>

        {/* ── Right main skeleton ── */}
        <div className="flex flex-col gap-6">
          {/* Score cards × 3 */}
          <div className="gh-score-grid">
            <div className="h-24 rounded-md bg-gray-700" />
            <div className="h-24 rounded-md bg-gray-700" />
            <div className="h-24 rounded-md bg-gray-700" />
          </div>

          {/* Language bar section */}
          <div className="rounded-md bg-gray-700 p-4 flex flex-col gap-3">
            <div className="h-3 w-1/4 rounded bg-gray-600" />
            <div className="h-2 w-full rounded-full bg-gray-600" />
            <div className="flex gap-4 flex-wrap mt-1">
              {[1,2,3,4].map(i => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-600" />
                  <div className="h-2 w-16 rounded bg-gray-600" />
                </div>
              ))}
            </div>
          </div>

          {/* Repo cards × 3 */}
          {[1,2,3].map(i => (
            <div key={i} className="rounded-md bg-gray-700 p-4 flex flex-col gap-3">
              <div className="h-4 w-2/5 rounded bg-gray-600" />
              <div className="h-3 w-4/5 rounded bg-gray-600" />
              <div className="flex gap-4 mt-1">
                <div className="h-3 w-16 rounded bg-gray-600" />
                <div className="h-3 w-10 rounded bg-gray-600" />
                <div className="h-3 w-10 rounded bg-gray-600" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NotFound({ username }: { username: string }) {
  return (
    <div className="gh-notfound">
      <div className="gh-notfound-inner">
        <div className="gh-notfound-num">404</div>
        <h1 className="gh-notfound-title">This is not the profile you&apos;re looking for.</h1>
        <p className="gh-notfound-sub">
          <code className="gh-code">/{username}</code> doesn&apos;t exist on GitHub.
        </p>
        <a href="/" className="gh-btn-primary">
          ← Back to home
        </a>
      </div>
    </div>
  );
}

function ScoreCard({
  label,
  score,
  color,
}: {
  label: string;
  score: number;
  color: string;
}) {
  return (
    <div className="gh-score-card">
      <div className="gh-score-label">{label}</div>
      <div className="gh-score-num" style={{ color }}>
        {score}
        <span className="gh-score-max">/100</span>
      </div>
      <div className="gh-progress-track">
        <div
          className="gh-progress-fill"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function LanguageBar({ stats }: { stats: LanguageStat[] }) {
  return (
    <div className="gh-section">
      <h2 className="gh-section-title">Language Distribution</h2>

      {/* Segmented bar */}
      <div className="gh-lang-bar">
        {stats.map((l) => (
          <div
            key={l.name}
            style={{
              width: `${l.percentage}%`,
              backgroundColor: getLangColor(l.name),
            }}
            title={`${l.name} ${l.percentage}%`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="gh-lang-legend">
        {stats.map((l) => (
          <div key={l.name} className="gh-lang-item">
            <span
              className="gh-lang-dot"
              style={{ backgroundColor: getLangColor(l.name) }}
            />
            <span className="gh-lang-name">{l.name}</span>
            <span className="gh-lang-pct">{l.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RepoCard({ repo }: { repo: TopRepo }) {
  return (
    <a
      href={repo.url}
      target="_blank"
      rel="noreferrer"
      className="gh-repo-card"
    >
      <div className="gh-repo-name">{repo.name}</div>
      {repo.description && (
        <div className="gh-repo-desc">{repo.description}</div>
      )}
      <div className="gh-repo-meta">
        {repo.language && (
          <span className="gh-repo-lang">
            <span
              className="gh-lang-dot"
              style={{ backgroundColor: getLangColor(repo.language) }}
            />
            {repo.language}
          </span>
        )}
        <span className="gh-repo-stat">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
            <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
          </svg>
          {formatCount(repo.stars)}
        </span>
        <span className="gh-repo-stat">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
            <path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z" />
          </svg>
          {formatCount(repo.forks)}
        </span>
      </div>
    </a>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AnalyzePage() {
  const params = useParams();
  const username = decodeURIComponent(
    Array.isArray(params.username) ? params.username[0] : params.username ?? ""
  );

  const [profile, setProfile] = useState<GitHubProfile | null>(null);
  const [devProfile, setDevProfile] = useState<DeveloperProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!username) return;

    setLoading(true);
    setError(null);
    setNotFound(false);

    fetch(`/analyze?username=${encodeURIComponent(username)}`)
      .then(async (res) => {
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.hata ?? "Analiz başarısız");
        }
        const data = await res.json();
        setProfile(data.profile);
        setDevProfile(data.devProfile);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Beklenmeyen hata");
      })
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) return <SkeletonPulse />;
  if (notFound) return <NotFound username={username} />;
  if (error)
    return (
      <div className="gh-error-wrap">
        <div className="gh-error-box">
          <div className="gh-error-icon">⚠️</div>
          <h2 className="gh-error-title">Something went wrong</h2>
          <p className="gh-error-msg">{error}</p>
          <a href="/" className="gh-btn-primary">
            ← Back to home
          </a>
        </div>
      </div>
    );
  if (!profile || !devProfile) return null;

  const catConf = CATEGORY_CONFIG[devProfile.category] ?? {
    color: "#8b949e",
    emoji: "💻",
  };

  return (
    <div className="gh-page">
      <div className="gh-layout">
        {/* ── LEFT SIDEBAR ── */}
        <aside className="gh-sidebar">
          <img
            src={profile.avatarUrl}
            alt={`${profile.username}'s avatar`}
            className="gh-avatar"
          />

          {profile.name && <div className="gh-real-name">{profile.name}</div>}
          <div className="gh-username">@{profile.username}</div>

          {profile.bio && <p className="gh-bio">{profile.bio}</p>}

          {/* Category badge */}
          <div
            className="gh-category-badge"
            style={{ borderColor: catConf.color, color: catConf.color }}
          >
            {catConf.emoji} {devProfile.category}
          </div>

          {/* Overall score */}
          <div className="gh-overall-wrap">
            <div className="gh-overall-label">Overall Score</div>
            <div className="gh-overall-ring">
              <svg viewBox="0 0 36 36" className="gh-donut">
                <circle
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  stroke="#21262d"
                  strokeWidth="3"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  stroke="#3fb950"
                  strokeWidth="3"
                  strokeDasharray={`${devProfile.scores.overallScore} ${100 - devProfile.scores.overallScore}`}
                  strokeDashoffset="25"
                  strokeLinecap="round"
                />
              </svg>
              <div className="gh-overall-num">{devProfile.scores.overallScore}</div>
            </div>
          </div>

          <hr className="gh-divider" />

          {/* Stats row */}
          <div className="gh-follow-row">
            <span>
              <strong className="gh-follow-num">{formatCount(profile.followers)}</strong>{" "}
              <span className="gh-follow-label">followers</span>
            </span>
            <span className="gh-follow-sep">·</span>
            <span>
              <strong className="gh-follow-num">{formatCount(profile.following)}</strong>{" "}
              <span className="gh-follow-label">following</span>
            </span>
          </div>

          {/* Meta */}
          <ul className="gh-meta-list">
            {profile.location && (
              <li className="gh-meta-item">
                <span className="gh-meta-icon">📍</span>
                {profile.location}
              </li>
            )}
            <li className="gh-meta-item">
              <span className="gh-meta-icon">📅</span>
              {memberSince(profile.createdAt)}
            </li>
            <li className="gh-meta-item">
              <span className="gh-meta-icon">📦</span>
              {profile.publicRepos} public repos
            </li>
            <li className="gh-meta-item">
              <span className="gh-meta-icon">⭐</span>
              {formatCount(profile.totalStars)} total stars
            </li>
          </ul>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <main className="gh-main">
          {/* Score cards */}
          <div className="gh-score-grid">
            <ScoreCard
              label="Activity Score"
              score={devProfile.scores.activityScore}
              color="#3fb950"
            />
            <ScoreCard
              label="Popularity Score"
              score={devProfile.scores.popularityScore}
              color="#58a6ff"
            />
            <ScoreCard
              label="Diversity Score"
              score={devProfile.scores.diversityScore}
              color="#bc8cff"
            />
          </div>

          {/* Language distribution */}
          {profile.languageStats.length > 0 && (
            <LanguageBar stats={profile.languageStats} />
          )}

          {/* Top repos */}
          {profile.topRepos.length > 0 && (
            <div className="gh-section">
              <h2 className="gh-section-title">Top Repositories</h2>
              <div className="gh-repo-list">
                {profile.topRepos.map((r) => (
                  <RepoCard key={r.name} repo={r} />
                ))}
              </div>
            </div>
          )}

          {/* Classification reason */}
          <div className="gh-reason-box">
            <span className="gh-reason-label">Classification basis: </span>
            <span className="gh-reason-text">{devProfile.classificationReason}</span>
          </div>
        </main>
      </div>
    </div>
  );
}
