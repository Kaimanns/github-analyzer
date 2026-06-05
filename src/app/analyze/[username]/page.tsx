"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

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
  isFork?: boolean;
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
  allRepos: TopRepo[];
}

interface ProjectInsight {
  overview: string;
  complexity: string;
  techStack: string[];
  strengths: string[];
  improvements: string[];
  codeQuality: string;
  targetAudience: string;
  nextSteps: string[];
  impressionScore: number;
  impressionReason: string;
}

interface JobReadinessInsight {
  readinessScore: number;
  matchingSkills: string[];
  missingSkills: string[];
  roadmap: string[];
  verdict: string;
}

interface Recommendation {
  technology: string;
  reason: string;           // Kısa gerekçe (header'da görünür)
  why: string;              // Detaylı neden
  priority: "high" | "medium" | "low";
  icon: string;
  timeEstimate: string;     // Öğrenme süresi tahmini
  steps: string[];          // Adım adım öğrenme yolu
  resourceUrl: string;      // Kaynak URL
  resourceLabel: string;    // Link metni
  tags: string[];           // İlgili etiketler
}

interface DeveloperProfile {
  category: string;
  classificationReason: string;
  usedML?: boolean;
  scores: {
    activityScore: number;
    popularityScore: number;
    diversityScore: number;
    overallScore: number;
  };
}

interface TechRecommendation {
  technology: string;
  reason: string;
  howToStart: string;
  resourceUrl: string;
  priority: "high" | "medium" | "low";
}

interface ProjectAnalysis {
  repoName: string;
  highlight: string;
  techAssessment: string;
  improvementTip: string;
  impressionScore: number;
}

interface GeminiInsight {
  summary: string;
  careerLevel: "Junior" | "Mid-Level" | "Senior" | "Expert";
  codingStyle: string;
  collaborationStyle: string;
  strengths: string[];
  weakAreas: string[];
  techStack: string[];
  techRecommendations: TechRecommendation[];
  projectAnalyses: ProjectAnalysis[];
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

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const [expanded, setExpanded] = useState(false);

  const priorityConf = {
    high:   { color: "#f85149", label: "Yüksek", bg: "#f8514915" },
    medium: { color: "#e3b341", label: "Orta",    bg: "#e3b34115" },
    low:    { color: "#8b949e", label: "Düşük",   bg: "#8b949e15" },
  }[rec.priority];

  return (
    <div
      style={{
        backgroundColor: "#161b22",
        border: `1px solid ${expanded ? priorityConf.color + "50" : "#30363d"}`,
        borderRadius: "8px",
        overflow: "hidden",
        transition: "border-color 0.2s",
      }}
    >
      {/* ── Header (her zaman görünür) ── */}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: "100%",
          textAlign: "left",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: "14px 16px",
          display: "flex",
          alignItems: "flex-start",
          gap: "12px",
        }}
      >
        {/* İkon */}
        <span style={{ fontSize: "22px", lineHeight: 1, flexShrink: 0, marginTop: "2px" }}>{rec.icon}</span>

        {/* Başlık + kısa açıklama */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: "15px", color: "#58a6ff" }}>{rec.technology}</span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {/* Süre badge */}
              {rec.timeEstimate && (
                <span style={{ fontSize: "11px", color: "#8b949e", background: "#21262d", border: "1px solid #30363d", borderRadius: "2em", padding: "2px 8px", whiteSpace: "nowrap" }}>
                  ⏱ {rec.timeEstimate}
                </span>
              )}
              {/* Öncelik badge */}
              <span style={{ fontSize: "11px", fontWeight: 700, color: priorityConf.color, background: priorityConf.bg, border: `1px solid ${priorityConf.color}`, borderRadius: "2em", padding: "2px 8px", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
                {priorityConf.label}
              </span>
              {/* Chevron */}
              <span style={{ color: "#8b949e", fontSize: "12px", transition: "transform 0.2s", display: "inline-block", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
            </div>
          </div>
          <div style={{ fontSize: "13px", color: "#8b949e", marginTop: "4px", lineHeight: 1.55 }}>{rec.reason}</div>
          {/* Etiketler */}
          {rec.tags?.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "8px" }}>
              {rec.tags.map((tag) => (
                <span key={tag} style={{ fontSize: "10px", color: "#8b949e", background: "#21262d", border: "1px solid #30363d", borderRadius: "2em", padding: "1px 7px" }}>#{tag}</span>
              ))}
            </div>
          )}
        </div>
      </button>

      {/* ── Expanded detay panel ── */}
      {expanded && (
        <div style={{ borderTop: "1px solid #30363d", padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Neden öğrenmeli */}
          {rec.why && (
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#8b949e", marginBottom: "6px" }}>Neden Öğrenmeli?</div>
              <div style={{ fontSize: "13px", color: "#c9d1d9", lineHeight: 1.7, background: "#0d1117", border: "1px solid #30363d", borderRadius: "6px", padding: "10px 14px" }}>
                {rec.why}
              </div>
            </div>
          )}

          {/* Öğrenme adımları */}
          {rec.steps?.length > 0 && (
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#8b949e", marginBottom: "8px" }}>Adım Adım Öğrenme Yolu</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                {rec.steps.map((step, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                    <span style={{ flexShrink: 0, width: "22px", height: "22px", borderRadius: "50%", background: `${priorityConf.color}20`, border: `1px solid ${priorityConf.color}50`, color: priorityConf.color, fontSize: "11px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {i + 1}
                    </span>
                    <span style={{ fontSize: "13px", color: "#c9d1d9", lineHeight: 1.6, paddingTop: "1px" }}>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Kaynak linki */}
          {rec.resourceUrl && (
            <a
              href={rec.resourceUrl}
              target="_blank"
              rel="noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 600, color: "#58a6ff", textDecoration: "none", padding: "7px 14px", border: "1px solid #58a6ff", borderRadius: "6px", width: "fit-content", transition: "background 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(88,166,255,0.1)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              📖 {rec.resourceLabel || "Kaynağa Git"} →
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

// ─── AI Insight — Kariyer Seviyesi Göstergesi ─────────────────────────────────

const CAREER_LEVELS = ["Junior", "Mid-Level", "Senior", "Expert"] as const;

function CareerLevelIndicator({ level }: { level: string }) {
  const activeIdx = CAREER_LEVELS.indexOf(level as typeof CAREER_LEVELS[number]);
  return (
    <div>
      <div className="ai-sub-label">Kariyer Seviyesi</div>
      <div className="career-steps">
        {CAREER_LEVELS.map((lvl, i) => {
          const cls =
            i < activeIdx ? "career-step passed" :
            i === activeIdx ? "career-step active" :
            "career-step";
          return (
            <div key={lvl} className={cls}>
              <div className="career-step-dot" />
              <div className="career-step-label">{lvl}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Priority renkleri ─────────────────────────────────────────────────────────

const PRIORITY_COLORS = {
  high:   { color: "#f85149", label: "Yüksek" },
  medium: { color: "#e3b341", label: "Orta" },
  low:    { color: "#8b949e", label: "Düşük" },
};

// ─── Gemini AI Section (Sekmeli) ──────────────────────────────────────────────

const AI_TABS = [
  { id: "genel",   label: "📊 Genel" },
  { id: "guclu",   label: "💪 Güçlü & Zayıf" },
  { id: "tech",    label: "🛠️ TechStack" },
  { id: "kariyer", label: "🚀 Kariyer Önerileri" },
  { id: "proje",   label: "🌟 Proje Spotlight" },
] as const;

type TabId = typeof AI_TABS[number]["id"];

function GeminiInsightSection({
  insight,
  loading,
}: {
  insight: GeminiInsight | null;
  loading: boolean;
}) {
  const [activeTab, setActiveTab] = useState<TabId>("genel");

  return (
    <div
      className="gh-section mt-6"
      style={{ backgroundColor: "#161b22", border: "1px solid #30363d", borderRadius: "8px", padding: "20px" }}
    >
      <h2 className="gh-section-title" style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
        🤖 Yapay Zeka Profil Değerlendirmesi
      </h2>

      {/* Loading state */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", padding: "32px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#3fb950" }}>
            <svg style={{ width: "20px", height: "20px", animation: "spin 1s linear infinite" }}
              xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path style={{ opacity: 0.75 }} fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span style={{ fontWeight: 600, fontSize: "14px" }}>Yapay Zeka Derinlemesine Analiz Ediyor...</span>
          </div>
          <div style={{ width: "200px", height: "4px", backgroundColor: "#21262d", borderRadius: "999px", overflow: "hidden" }}>
            <div className="animate-scanning" style={{ height: "100%", backgroundColor: "#3fb950", width: "40%", borderRadius: "999px" }} />
          </div>
          <span style={{ fontSize: "12px", color: "#8b949e" }}>Top 5 repo analiz ediliyor, biraz bekleyin…</span>
        </div>
      )}

      {/* Content */}
      {!loading && insight && (
        <>
          {/* Tab navigation */}
          <div className="ai-tabs">
            {AI_TABS.map((tab) => (
              <button
                key={tab.id}
                className={`ai-tab-btn${activeTab === tab.id ? " active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Tab: Genel ── */}
          {activeTab === "genel" && (
            <div className="ai-tab-panel">
              <div className="ai-summary-box">{insight.summary}</div>
              {insight.careerLevel && <CareerLevelIndicator level={insight.careerLevel} />}
              {insight.codingStyle && (
                <div>
                  <div className="ai-sub-label">Kodlama Stili</div>
                  <div className="ai-quote">{insight.codingStyle}</div>
                </div>
              )}
              {insight.collaborationStyle && (
                <div>
                  <div className="ai-sub-label">İşbirliği & Açık Kaynak</div>
                  <div className="ai-collab-box">🤝 {insight.collaborationStyle}</div>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Güçlü & Zayıf ── */}
          {activeTab === "guclu" && (
            <div className="ai-tab-panel">
              {insight.strengths?.length > 0 && (
                <div>
                  <div className="ai-sub-label">✅ Güçlü Yönler</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                    {insight.strengths.map((s, i) => (
                      <div key={i} className="ai-strength-item">
                        <span style={{ color: "#3fb950", fontWeight: 700, flexShrink: 0 }}>✓</span>
                        <span>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {insight.weakAreas?.length > 0 && (
                <div style={{ marginTop: "8px" }}>
                  <div className="ai-sub-label">⚠️ Geliştirilmesi Gereken Alanlar</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                    {insight.weakAreas.map((w, i) => (
                      <div key={i} className="ai-weak-item">
                        <span style={{ color: "#d29922", fontWeight: 700, flexShrink: 0 }}>!</span>
                        <span>{w}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: TechStack ── */}
          {activeTab === "tech" && (
            <div className="ai-tab-panel">
              <div>
                <div className="ai-sub-label">Tespit Edilen Teknoloji Yığını</div>
                <div className="tech-badge-cloud">
                  {(insight.techStack ?? []).map((tech) => (
                    <span key={tech} className="tech-badge">
                      <span style={{ fontSize: "10px" }}>◆</span>
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
              {insight.codingStyle && (
                <div style={{ marginTop: "8px" }}>
                  <div className="ai-sub-label">Genel Yazılım Yaklaşımı</div>
                  <div className="ai-quote">{insight.codingStyle}</div>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Kariyer Önerileri ── */}
          {activeTab === "kariyer" && (
            <div className="ai-tab-panel">
              {(insight.techRecommendations ?? []).length === 0 && (
                <p style={{ color: "#8b949e", fontSize: "14px" }}>Kariyer önerisi bulunamadı.</p>
              )}
              {(insight.techRecommendations ?? []).map((rec, i) => {
                const pc = PRIORITY_COLORS[rec.priority];
                return (
                  <div key={i} className="ai-rec-card">
                    <div className="ai-rec-header">
                      <span className="ai-rec-tech">🔧 {rec.technology}</span>
                      <span
                        className="ai-priority-badge"
                        style={{ color: pc.color, borderColor: pc.color, backgroundColor: `${pc.color}18` }}
                      >
                        {pc.label}
                      </span>
                    </div>
                    <div className="ai-rec-reason">{rec.reason}</div>
                    <div className="ai-rec-how">
                      <strong>💡 Nasıl Başlamalı:</strong> {rec.howToStart}
                    </div>
                    {rec.resourceUrl && (
                      <a
                        href={rec.resourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="ai-rec-link"
                      >
                        📖 Kaynağa Git →
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Tab: Proje Spotlight ── */}
          {activeTab === "proje" && (
            <div className="ai-tab-panel">
              {(insight.projectAnalyses ?? []).length === 0 && (
                <p style={{ color: "#8b949e", fontSize: "14px" }}>Proje analizi bulunamadı.</p>
              )}
              {(insight.projectAnalyses ?? []).map((proj, i) => (
                <div key={i} className="ai-project-card">
                  <div className="ai-project-header">
                    <span className="ai-project-name">📁 {proj.repoName}</span>
                    <span className="ai-impression-badge">⭐ {proj.impressionScore}/10</span>
                  </div>
                  <div className="ai-project-row">
                    <div className="ai-project-row-label">Öne Çıkan Özellik</div>
                    <div className="ai-project-row-text">{proj.highlight}</div>
                  </div>
                  <div className="ai-project-row">
                    <div className="ai-project-row-label">Teknoloji Değerlendirmesi</div>
                    <div className="ai-project-row-text">{proj.techAssessment}</div>
                  </div>
                  <div className="ai-project-tip">💡 <strong>İyileştirme Önerisi:</strong> {proj.improvementTip}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!loading && !insight && (
        <p style={{ color: "#8b949e", fontSize: "14px", marginTop: "12px" }}>
          Yapay zeka analizi şu an kullanılamıyor.
        </p>
      )}
    </div>
  );
}

// ─── Panel Section yardımcı bileşeni ─────────────────────────────────────────

function PanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#8b949e", marginBottom: "8px" }}>{title}</div>
      {children}
    </div>
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
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [usedML, setUsedML] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [geminiInsight, setGeminiInsight] = useState<GeminiInsight | null>(null);
  const [geminiLoading, setGeminiLoading] = useState(false);
  // Proje Gezgini
  const [selectedRepo, setSelectedRepo] = useState<TopRepo | null>(null);
  const [projectInsight, setProjectInsight] = useState<ProjectInsight | null>(null);
  const [projectLoading, setProjectLoading] = useState(false);
  const [repoSearch, setRepoSearch] = useState("");
  const [repoLangFilter, setRepoLangFilter] = useState("all");
  const [repoSort, setRepoSort] = useState<"stars" | "forks" | "name">("stars");
  const [repoPage, setRepoPage] = useState(1);
  const REPOS_PER_PAGE = 12;

  // Job Readiness
  const [targetRole, setTargetRole] = useState<string>("Frontend Developer");
  const [readinessInsight, setReadinessInsight] = useState<JobReadinessInsight | null>(null);
  const [readinessLoading, setReadinessLoading] = useState(false);

  // Kariyer analizi tetikleyici
  const checkJobReadiness = () => {
    if (!profile) return;
    setReadinessInsight(null);
    setReadinessLoading(true);

    fetch("/api/job-readiness", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        profile,
        role: targetRole,
      }),
    })
      .then(async (r) => {
        const j = await r.json();
        setReadinessInsight(j.insight ?? null);
      })
      .catch((e) => {
        console.error("Job readiness error:", e);
        setReadinessInsight(null);
      })
      .finally(() => setReadinessLoading(false));
  };

  // Proje analizi tetikleyici
  const analyzeProject = (repo: TopRepo) => {
    if (selectedRepo?.name === repo.name && projectInsight) return; // Zaten analiz edildi
    setSelectedRepo(repo);
    setProjectInsight(null);
    setProjectLoading(true);
    fetch("/api/project-analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        repoName: repo.name,
        repoMeta: {
          stars: repo.stars,
          forks: repo.forks,
          language: repo.language,
          description: repo.description,
        },
      }),
    })
      .then(async (r) => { const j = await r.json(); setProjectInsight(j.insight ?? null); })
      .catch(() => setProjectInsight(null))
      .finally(() => setProjectLoading(false));
  };

  useEffect(() => {
    if (!username) return;

    setLoading(true);
    setError(null);
    setNotFound(false);
    setGeminiInsight(null);

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
        setUsedML(data.usedML ?? false);
        setRecommendations(data.recommendations ?? []);

        // Gemini analizini arka planda başlat
        const profileData: GitHubProfile = data.profile;
        const categoryData: string = data.devProfile.category;
        setGeminiLoading(true);
        fetch("/api/gemini-analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            profile: profileData,
            category: categoryData,
          }),
        })
          .then(async (r) => {
            const json = await r.json();
            setGeminiInsight(json.insight ?? null);
          })
          .catch(() => setGeminiInsight(null))
          .finally(() => setGeminiLoading(false));
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
          {usedML && (
            <span
              className="ml-badge"
              title="K-Means ML modeli ile sınıflandırıldı"
            >
              🤖 ML
            </span>
          )}

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

          <div style={{ marginTop: "16px" }}>
            <a href={`/cv/${profile.username}`} target="_blank" rel="noopener noreferrer" style={{ display: "block", textAlign: "center", padding: "10px", background: "#f0f6fc", color: "#24292e", borderRadius: "6px", fontSize: "13px", fontWeight: 600, textDecoration: "none", border: "1px solid rgba(27,31,36,0.15)", transition: "background 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#e1e4e8"} onMouseLeave={(e) => e.currentTarget.style.background = "#f0f6fc"}>
              📄 CV / Portfolyo Oluştur
            </a>
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
          {/* Recharts Data Visualizations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            
            {/* Yetenek Radarı (Radar Chart) */}
            <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-6 shadow-lg hover:border-[#8b949e] transition-colors">
              <h2 className="text-lg font-bold text-[#e6edf3] mb-4">Yetkinlik Radarı</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={[
                    { subject: 'Activity', A: devProfile.scores.activityScore, fullMark: 100 },
                    { subject: 'Popularity', A: devProfile.scores.popularityScore, fullMark: 100 },
                    { subject: 'Diversity', A: devProfile.scores.diversityScore, fullMark: 100 },
                  ]}>
                    <PolarGrid stroke="#30363d" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#8b949e', fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="Skor" dataKey="A" stroke="#58a6ff" fill="#58a6ff" fillOpacity={0.4} />
                    <Tooltip contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d', color: '#c9d1d9', borderRadius: '8px' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Dil Dağılımı (Donut Chart) */}
            {profile.languageStats.length > 0 && (
              <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-6 shadow-lg hover:border-[#8b949e] transition-colors">
                <h2 className="text-lg font-bold text-[#e6edf3] mb-4">Dil Dağılımı</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={profile.languageStats}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="bytes"
                        nameKey="name"
                        stroke="none"
                      >
                        {profile.languageStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getLangColor(entry.name)} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any, name: any, props: any) => [`%${props.payload.percentage.toFixed(1)}`, name]}
                        contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d', color: '#c9d1d9', borderRadius: '8px' }} 
                      />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', color: '#8b949e' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Gelişim Önerileri */}
          {recommendations.length > 0 && (
            <div className="gh-section mt-6">
              <h2 className="gh-section-title">📈 Gelişim Önerileri</h2>
              <p style={{ fontSize: "13px", color: "#8b949e", marginTop: "4px" }}>
                Kategorine ve dil profiline göre kişiselleştirilmiş öğrenme yolu — her kartı genişletebilirsin.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px" }}>
                {recommendations.map((rec) => (
                  <RecommendationCard key={rec.technology} rec={rec} />
                ))}
              </div>
            </div>
          )}

          {/* ── KARİYER HEDEFİNE UYGUNLUK (JOB READINESS) ── */}
          <div className="gh-section mt-6">
            <h2 className="gh-section-title">🎯 Kariyer Hedefine Uygunluk</h2>
            <p style={{ fontSize: "13px", color: "#8b949e", marginTop: "4px", marginBottom: "12px" }}>
              Mevcut yeteneklerini hedeflediğin role göre analiz et ve ne kadar hazır olduğunu gör.
            </p>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                style={{ padding: "8px 12px", background: "#0d1117", border: "1px solid #30363d", borderRadius: "6px", color: "#e6edf3", fontSize: "13px", outline: "none", flex: 1, minWidth: "200px" }}
              >
                <option value="Frontend Developer">🎨 Frontend Developer</option>
                <option value="Backend Developer">⚙️ Backend Developer</option>
                <option value="Full-Stack Developer">🌐 Full-Stack Developer</option>
                <option value="DevOps Engineer">🚀 DevOps Engineer</option>
                <option value="Data Scientist">📊 Data Scientist</option>
                <option value="Mobile Developer">📱 Mobile Developer</option>
                <option value="Web3 / Blockchain Developer">⛓️ Web3 / Blockchain Developer</option>
                <option value="Game Developer">🎮 Game Developer</option>
              </select>
              <button
                onClick={checkJobReadiness}
                disabled={readinessLoading}
                style={{
                  padding: "8px 16px", fontSize: "13px", fontWeight: 600, color: "#fff",
                  background: readinessLoading ? "#23863680" : "#238636", border: "1px solid rgba(240,246,252,0.1)",
                  borderRadius: "6px", cursor: readinessLoading ? "not-allowed" : "pointer",
                  transition: "0.2s"
                }}
              >
                {readinessLoading ? "Analiz Ediliyor..." : "Uygunluğu Analiz Et"}
              </button>
            </div>

            {/* Sonuç Alanı */}
            {readinessInsight && !readinessLoading && (
              <div style={{ background: "#0d1117", border: "1px solid #30363d", borderRadius: "8px", padding: "20px", animation: "fadeIn 0.3s ease" }}>
                
                {/* Skor & Verdict */}
                <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "20px", flexWrap: "wrap" }}>
                  <div style={{ flexShrink: 0, textAlign: "center" }}>
                    <div style={{ position: "relative", width: "80px", height: "80px" }}>
                      <svg viewBox="0 0 36 36" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#21262d" strokeWidth="4" />
                        <circle cx="18" cy="18" r="15.9" fill="none" 
                          stroke={readinessInsight.readinessScore > 70 ? "#3fb950" : readinessInsight.readinessScore > 40 ? "#d29922" : "#f85149"} 
                          strokeWidth="4" 
                          strokeDasharray={`${readinessInsight.readinessScore} ${100 - readinessInsight.readinessScore}`} 
                          strokeDashoffset="0" strokeLinecap="round" 
                        />
                      </svg>
                      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", fontWeight: 700, color: "#e6edf3" }}>
                        %{readinessInsight.readinessScore}
                      </div>
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#58a6ff", marginBottom: "4px" }}>Genel Değerlendirme</div>
                    <div style={{ fontSize: "13px", color: "#8b949e", lineHeight: 1.6 }}>{readinessInsight.verdict}</div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginBottom: "20px" }}>
                  {/* Matching Skills */}
                  <div style={{ background: "rgba(63,185,80,0.05)", border: "1px solid rgba(63,185,80,0.2)", borderRadius: "6px", padding: "12px" }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#3fb950", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>✅ Mevcut Yetenekler</div>
                    <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "13px", color: "#c9d1d9", lineHeight: 1.6 }}>
                      {readinessInsight.matchingSkills.map((s, i) => <li key={i} style={{ marginBottom: "4px" }}>{s}</li>)}
                    </ul>
                  </div>

                  {/* Missing Skills */}
                  <div style={{ background: "rgba(248,81,73,0.05)", border: "1px solid rgba(248,81,73,0.2)", borderRadius: "6px", padding: "12px" }}>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#f85149", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>❌ Eksik / Geliştirilmesi Gerekenler</div>
                    <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "13px", color: "#c9d1d9", lineHeight: 1.6 }}>
                      {readinessInsight.missingSkills.map((s, i) => <li key={i} style={{ marginBottom: "4px" }}>{s}</li>)}
                    </ul>
                  </div>
                </div>

                {/* Roadmap */}
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#58a6ff", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>🚀 Hedefe Giden Yol Haritası</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {readinessInsight.roadmap.map((step, i) => (
                      <div key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start", background: "#161b22", border: "1px solid #30363d", padding: "10px 14px", borderRadius: "6px" }}>
                        <span style={{ width: "24px", height: "24px", borderRadius: "50%", background: "#21262d", color: "#c9d1d9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                        <div style={{ fontSize: "13px", color: "#c9d1d9", lineHeight: 1.6, paddingTop: "2px" }}>{step}</div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>


          {/* Top repos (Bar Chart + List) */}
          {profile.topRepos.length > 0 && (
            <div className="gh-section mt-6">
              <h2 className="gh-section-title">⭐ En Popüler Repolar</h2>
              
              <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-6 shadow-lg hover:border-[#8b949e] transition-colors mb-6">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={profile.topRepos.slice(0, 5)} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: '#8b949e', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#8b949e', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d', color: '#c9d1d9', borderRadius: '8px' }} 
                        cursor={{ fill: '#21262d' }}
                      />
                      <Bar dataKey="stars" fill="#e3b341" radius={[4, 4, 0, 0]} name="Yıldız Sayısı" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="gh-repo-list">
                {profile.topRepos.map((r) => (
                  <RepoCard key={r.name} repo={r} />
                ))}
              </div>
            </div>
          )}

          {/* ── PROJE GEZGİNİ ── */}
          {(profile.allRepos ?? []).length > 0 && (
            <div className="gh-section">
              <h2 className="gh-section-title">📂 Proje Gezgini</h2>
              <p style={{ fontSize: "13px", color: "#8b949e", marginTop: "2px" }}>
                {(profile.allRepos ?? []).length} repo listelendi — Bir projeye tıklayarak AI analizi yap.
              </p>

              {/* Arama + Filtre + Sıralama */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "12px" }}>
                <input
                  type="text"
                  placeholder="Repo ara..."
                  value={repoSearch}
                  onChange={(e) => { setRepoSearch(e.target.value); setRepoPage(1); }}
                  style={{ flex: 1, minWidth: "160px", padding: "6px 12px", background: "#0d1117", border: "1px solid #30363d", borderRadius: "6px", color: "#e6edf3", fontSize: "13px", outline: "none" }}
                />
                <select
                  value={repoLangFilter}
                  onChange={(e) => { setRepoLangFilter(e.target.value); setRepoPage(1); }}
                  style={{ padding: "6px 10px", background: "#0d1117", border: "1px solid #30363d", borderRadius: "6px", color: "#e6edf3", fontSize: "13px" }}
                >
                  <option value="all">Tüm Diller</option>
                  {Array.from(new Set((profile.allRepos ?? []).map((r) => r.language).filter(Boolean))).map((l) => (
                    <option key={l!} value={l!}>{l}</option>
                  ))}
                </select>
                <select
                  value={repoSort}
                  onChange={(e) => { setRepoSort(e.target.value as "stars" | "forks" | "name"); setRepoPage(1); }}
                  style={{ padding: "6px 10px", background: "#0d1117", border: "1px solid #30363d", borderRadius: "6px", color: "#e6edf3", fontSize: "13px" }}
                >
                  <option value="stars">⭐ Yıldıza Göre</option>
                  <option value="forks">🍴 Fork'a Göre</option>
                  <option value="name">🔤 İsme Göre</option>
                </select>
              </div>

              {/* Repo Grid (sayfalı) */}
              {(() => {
                const filtered = (profile.allRepos ?? [])
                  .filter((r) => r.name.toLowerCase().includes(repoSearch.toLowerCase()) || (r.description ?? "").toLowerCase().includes(repoSearch.toLowerCase()))
                  .filter((r) => repoLangFilter === "all" || r.language === repoLangFilter)
                  .sort((a, b) =>
                    repoSort === "stars" ? b.stars - a.stars :
                    repoSort === "forks" ? b.forks - a.forks :
                    a.name.localeCompare(b.name)
                  );

                const totalPages = Math.ceil(filtered.length / REPOS_PER_PAGE);
                const page = Math.min(repoPage, totalPages || 1);
                const paged = filtered.slice((page - 1) * REPOS_PER_PAGE, page * REPOS_PER_PAGE);

                return filtered.length === 0
                  ? <p style={{ color: "#8b949e", fontSize: "13px", marginTop: "12px" }}>Sonuç bulunamadı.</p>
                  : (
                    <>
                      {/* Grid */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "10px", marginTop: "12px" }}>
                        {paged.map((repo) => {
                          const isSelected = selectedRepo?.name === repo.name;
                          return (
                            <div
                              key={repo.name}
                              onClick={() => analyzeProject(repo)}
                              style={{
                                background: isSelected ? "rgba(88,166,255,0.07)" : "#0d1117",
                                border: `1px solid ${isSelected ? "#58a6ff" : "#30363d"}`,
                                borderRadius: "8px", padding: "12px 14px", cursor: "pointer",
                                transition: "border-color 0.15s, background 0.15s",
                                display: "flex", flexDirection: "column", gap: "6px",
                              }}
                              onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.borderColor = "#8b949e"; }}
                              onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.borderColor = "#30363d"; }}
                            >
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
                                <span style={{ fontWeight: 700, fontSize: "14px", color: "#58a6ff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{repo.name}</span>
                                {repo.isFork && <span style={{ fontSize: "10px", color: "#8b949e", border: "1px solid #30363d", borderRadius: "2em", padding: "1px 6px", flexShrink: 0 }}>fork</span>}
                              </div>
                              {repo.description && <div style={{ fontSize: "12px", color: "#8b949e", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{repo.description}</div>}
                              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px" }}>
                                {repo.language && (
                                  <span style={{ fontSize: "12px", color: "#8b949e", display: "flex", alignItems: "center", gap: "4px" }}>
                                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: getLangColor(repo.language), display: "inline-block" }} />
                                    {repo.language}
                                  </span>
                                )}
                                <span style={{ fontSize: "12px", color: "#8b949e" }}>⭐ {formatCount(repo.stars)}</span>
                                <span style={{ fontSize: "12px", color: "#8b949e" }}>🍴 {formatCount(repo.forks)}</span>
                              </div>
                              <button
                                style={{ marginTop: "4px", padding: "5px 10px", fontSize: "12px", fontWeight: 600, color: isSelected ? "#0d1117" : "#58a6ff", background: isSelected ? "#58a6ff" : "transparent", border: "1px solid #58a6ff", borderRadius: "6px", cursor: "pointer", transition: "all 0.15s" }}
                                onClick={(e) => { e.stopPropagation(); analyzeProject(repo); }}
                              >
                                {isSelected ? "✓ Seçildi" : "🔍 Analiz Et"}
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      {/* Sayfalama */}
                      {totalPages > 1 && (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginTop: "16px" }}>
                          <button
                            disabled={page <= 1}
                            onClick={() => setRepoPage((p) => p - 1)}
                            style={{ padding: "5px 14px", fontSize: "13px", fontWeight: 600, color: page <= 1 ? "#444c56" : "#e6edf3", background: "#0d1117", border: "1px solid #30363d", borderRadius: "6px", cursor: page <= 1 ? "not-allowed" : "pointer" }}
                          >
                            ← Önceki
                          </button>

                          {/* Sayfa numaraları */}
                          <div style={{ display: "flex", gap: "4px" }}>
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                              .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                              .reduce<(number | "...")[]>((acc, n, idx, arr) => {
                                if (idx > 0 && (arr[idx - 1] as number) + 1 < n) acc.push("...");
                                acc.push(n);
                                return acc;
                              }, [])
                              .map((item, idx) =>
                                item === "..." ? (
                                  <span key={`dots-${idx}`} style={{ padding: "5px 8px", fontSize: "13px", color: "#8b949e" }}>…</span>
                                ) : (
                                  <button
                                    key={item}
                                    onClick={() => setRepoPage(item as number)}
                                    style={{
                                      padding: "5px 10px", fontSize: "13px", fontWeight: 600,
                                      color: page === item ? "#0d1117" : "#e6edf3",
                                      background: page === item ? "#58a6ff" : "#0d1117",
                                      border: `1px solid ${page === item ? "#58a6ff" : "#30363d"}`,
                                      borderRadius: "6px", cursor: "pointer",
                                    }}
                                  >
                                    {item}
                                  </button>
                                )
                              )
                            }
                          </div>

                          <button
                            disabled={page >= totalPages}
                            onClick={() => setRepoPage((p) => p + 1)}
                            style={{ padding: "5px 14px", fontSize: "13px", fontWeight: 600, color: page >= totalPages ? "#444c56" : "#e6edf3", background: "#0d1117", border: "1px solid #30363d", borderRadius: "6px", cursor: page >= totalPages ? "not-allowed" : "pointer" }}
                          >
                            Sonraki →
                          </button>

                          <span style={{ fontSize: "12px", color: "#8b949e", marginLeft: "4px" }}>
                            {(page - 1) * REPOS_PER_PAGE + 1}–{Math.min(page * REPOS_PER_PAGE, filtered.length)} / {filtered.length}
                          </span>
                        </div>
                      )}
                    </>
                  );
              })()}
            </div>
          )}

          {/* ── PROJE ANALİZ PANEL (Slide-in) ── */}
          {selectedRepo && (
            <div
              style={{
                position: "fixed", top: 0, right: 0, bottom: 0, width: "min(520px, 100vw)",
                background: "#161b22", borderLeft: "1px solid #30363d", zIndex: 1000,
                overflowY: "auto", boxShadow: "-8px 0 32px rgba(0,0,0,0.4)",
                animation: "slideInRight 0.25s ease",
              }}
            >
              {/* Panel header */}
              <div style={{ position: "sticky", top: 0, background: "#161b22", borderBottom: "1px solid #30363d", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", zIndex: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "11px", color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.06em" }}>Proje Analizi</div>
                  <div style={{ fontSize: "16px", fontWeight: 700, color: "#58a6ff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📁 {selectedRepo.name}</div>
                </div>
                <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                  <a href={selectedRepo.url} target="_blank" rel="noreferrer" style={{ fontSize: "12px", color: "#58a6ff", border: "1px solid #58a6ff", borderRadius: "6px", padding: "4px 10px", textDecoration: "none" }}>GitHub ↗</a>
                  <button onClick={() => { setSelectedRepo(null); setProjectInsight(null); }} style={{ background: "transparent", border: "1px solid #30363d", borderRadius: "6px", color: "#8b949e", cursor: "pointer", padding: "4px 10px", fontSize: "18px" }}>✕</button>
                </div>
              </div>

              <div style={{ padding: "20px" }}>
                {/* Repo meta */}
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
                  {selectedRepo.language && <span style={{ fontSize: "12px", color: "#8b949e", background: "#21262d", border: "1px solid #30363d", borderRadius: "2em", padding: "3px 10px" }}>🔵 {selectedRepo.language}</span>}
                  <span style={{ fontSize: "12px", color: "#8b949e", background: "#21262d", border: "1px solid #30363d", borderRadius: "2em", padding: "3px 10px" }}>⭐ {formatCount(selectedRepo.stars)}</span>
                  <span style={{ fontSize: "12px", color: "#8b949e", background: "#21262d", border: "1px solid #30363d", borderRadius: "2em", padding: "3px 10px" }}>🍴 {formatCount(selectedRepo.forks)}</span>
                </div>
                {selectedRepo.description && <p style={{ fontSize: "13px", color: "#8b949e", marginBottom: "16px", lineHeight: 1.6 }}>{selectedRepo.description}</p>}

                {/* Loading */}
                {projectLoading && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", padding: "40px 0", color: "#3fb950" }}>
                    <svg style={{ width: "24px", height: "24px", animation: "spin 1s linear infinite" }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span style={{ fontSize: "14px", fontWeight: 600 }}>Proje Analiz Ediliyor...</span>
                    <span style={{ fontSize: "12px", color: "#8b949e" }}>README, commit ve bağımlılıklar inceleniyor</span>
                  </div>
                )}

                {/* Insight */}
                {!projectLoading && projectInsight && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>

                    {/* Skor + Karmaşıklık */}
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      <div style={{ flex: 1, background: "#0d1117", border: "1px solid #30363d", borderRadius: "8px", padding: "12px 14px", textAlign: "center", minWidth: "100px" }}>
                        <div style={{ fontSize: "28px", fontWeight: 800, color: "#d29922" }}>{projectInsight.impressionScore}<span style={{ fontSize: "14px", color: "#8b949e" }}>/10</span></div>
                        <div style={{ fontSize: "11px", color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "2px" }}>Etki Puanı</div>
                      </div>
                      <div style={{ flex: 1, background: "#0d1117", border: "1px solid #30363d", borderRadius: "8px", padding: "12px 14px", textAlign: "center", minWidth: "100px" }}>
                        <div style={{ fontSize: "20px", fontWeight: 700, color: "#bc8cff", marginTop: "4px" }}>{projectInsight.complexity}</div>
                        <div style={{ fontSize: "11px", color: "#8b949e", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: "2px" }}>Karmaşıklık</div>
                      </div>
                    </div>

                    {/* Genel Bakış */}
                    <PanelSection title="📋 Genel Bakış">
                      <p style={{ fontSize: "13px", color: "#c9d1d9", lineHeight: 1.7 }}>{projectInsight.overview}</p>
                    </PanelSection>

                    {/* TechStack */}
                    {projectInsight.techStack?.length > 0 && (
                      <PanelSection title="🛠️ Teknoloji Yığını">
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {projectInsight.techStack.map((t) => (
                            <span key={t} style={{ fontSize: "12px", fontWeight: 600, color: "#e6edf3", background: "#21262d", border: "1px solid #30363d", borderRadius: "2em", padding: "3px 10px" }}>◆ {t}</span>
                          ))}
                        </div>
                      </PanelSection>
                    )}

                    {/* Güçlü Yönler */}
                    {projectInsight.strengths?.length > 0 && (
                      <PanelSection title="✅ Güçlü Yönler">
                        {projectInsight.strengths.map((s, i) => (
                          <div key={i} style={{ display: "flex", gap: "8px", fontSize: "13px", color: "#c9d1d9", padding: "6px 10px", background: "rgba(63,185,80,0.06)", border: "1px solid rgba(63,185,80,0.15)", borderRadius: "6px", marginBottom: "6px" }}>
                            <span style={{ color: "#3fb950", fontWeight: 700, flexShrink: 0 }}>✓</span><span>{s}</span>
                          </div>
                        ))}
                      </PanelSection>
                    )}

                    {/* İyileştirme */}
                    {projectInsight.improvements?.length > 0 && (
                      <PanelSection title="⚠️ İyileştirme Önerileri">
                        {projectInsight.improvements.map((imp, i) => (
                          <div key={i} style={{ display: "flex", gap: "8px", fontSize: "13px", color: "#c9d1d9", padding: "6px 10px", background: "rgba(210,153,34,0.06)", border: "1px solid rgba(210,153,34,0.2)", borderRadius: "6px", marginBottom: "6px" }}>
                            <span style={{ color: "#d29922", fontWeight: 700, flexShrink: 0 }}>!</span><span>{imp}</span>
                          </div>
                        ))}
                      </PanelSection>
                    )}

                    {/* Sonraki Adımlar */}
                    {projectInsight.nextSteps?.length > 0 && (
                      <PanelSection title="🚀 Sonraki Adımlar">
                        {projectInsight.nextSteps.map((step, i) => (
                          <div key={i} style={{ display: "flex", gap: "10px", fontSize: "13px", color: "#c9d1d9", marginBottom: "8px" }}>
                            <span style={{ flexShrink: 0, width: "20px", height: "20px", borderRadius: "50%", background: "rgba(88,166,255,0.15)", border: "1px solid rgba(88,166,255,0.3)", color: "#58a6ff", fontSize: "11px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
                            <span style={{ lineHeight: 1.6, paddingTop: "1px" }}>{step}</span>
                          </div>
                        ))}
                      </PanelSection>
                    )}

                    {/* Kod Kalitesi + Hedef Kitle */}
                    <PanelSection title="💡 Notlar">
                      {projectInsight.codeQuality && <p style={{ fontSize: "13px", color: "#8b949e", lineHeight: 1.6, marginBottom: "8px" }}><strong style={{ color: "#c9d1d9" }}>Kod Kalitesi:</strong> {projectInsight.codeQuality}</p>}
                      {projectInsight.targetAudience && <p style={{ fontSize: "13px", color: "#8b949e", lineHeight: 1.6 }}><strong style={{ color: "#c9d1d9" }}>Hedef Kitle:</strong> {projectInsight.targetAudience}</p>}
                      {projectInsight.impressionReason && <p style={{ fontSize: "13px", color: "#d29922", lineHeight: 1.6, marginTop: "8px", borderLeft: "3px solid #d29922", paddingLeft: "10px" }}>{projectInsight.impressionReason}</p>}
                    </PanelSection>

                  </div>
                )}

                {!projectLoading && !projectInsight && (
                  <p style={{ color: "#8b949e", fontSize: "13px", textAlign: "center", paddingTop: "32px" }}>Analiz yüklenemedi. Tekrar deneyin.</p>
                )}
              </div>
            </div>
          )}
          {/* Overlay */}
          {selectedRepo && <div onClick={() => { setSelectedRepo(null); setProjectInsight(null); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 999 }} />}

          {/* Gemini AI Analiz */}
          <GeminiInsightSection insight={geminiInsight} loading={geminiLoading} />

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
