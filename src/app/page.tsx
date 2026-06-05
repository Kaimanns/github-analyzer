"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";

// ── Octocat SVG ───────────────────────────────────────────────────────────────
function OctocatIcon({ size = 24 }: { size?: number }) {
  return (
    <svg height={size} viewBox="0 0 16 16" width={size} aria-hidden="true" fill="currentColor">
      <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
    </svg>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar() {
  const { data: session } = useSession();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const username = (session?.user as any)?.username as string | undefined;

  return (
    <nav className="lp-nav">
      <a href="/" className="lp-logo">
        <OctocatIcon size={28} />
        <span className="lp-logo-text">GitHub Analyzer</span>
      </a>

      <div className="lp-nav-right">
        {session?.user ? (
          <>
            {session.user.image && (
              <a href={username ? `/analyze/${username}` : "/"} title="Kendi profilini gör">
                <img src={session.user.image} alt="avatar" className="lp-nav-avatar" />
              </a>
            )}
            <span className="lp-nav-username">
              {username ?? session.user.name ?? session.user.email}
            </span>
            <button onClick={() => signOut({ callbackUrl: "/" })} className="lp-nav-signout">
              Çıkış
            </button>
          </>
        ) : (
          <button
            onClick={() => signIn("github")}
            className="lp-signin-btn"
          >
            <OctocatIcon size={16} />
            GitHub ile Giriş Yap
          </button>
        )}
      </div>
    </nav>
  );
}

// ── Feature card ──────────────────────────────────────────────────────────────
function FeatureCard({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return (
    <div className="lp-feature-card">
      <div className="lp-feature-emoji">{emoji}</div>
      <h3 className="lp-feature-title">{title}</h3>
      <p className="lp-feature-desc">{desc}</p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const { data: session } = useSession();
  const [username, setUsername] = useState("");
  const router = useRouter();

  const handleAnalyze = () => {
    const trimmed = username.trim();
    if (trimmed) router.push(`/analyze/${trimmed}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleAnalyze();
  };

  return (
    <div className="lp-page">
      <Navbar />

      {/* ── Hero ── */}
      <section className="lp-hero">
        <div className="lp-hero-inner">
          <div className="lp-octocat-badge">
            <OctocatIcon size={64} />
          </div>

          <h1 className="lp-h1">
            GitHub Profilini{" "}
            <span className="lp-h1-accent">Analiz Et</span>
          </h1>
          <p className="lp-subtitle">
            Kodlama alışkanlıklarını keşfet, kategorini öğren, gelişim yolunu gör.
          </p>

          {/* Search row */}
          <div className="lp-cta-stack">
            <div className="lp-search-form">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="github kullanıcı adı yaz..."
                className="lp-search-input"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                onClick={handleAnalyze}
                className="lp-search-btn"
                disabled={!username.trim()}
              >
                Analiz Et →
              </button>
            </div>

            {/* Session yoksa Giriş butonunu göster */}
            {!session?.user && (
              <>
                {/* Divider */}
                <div className="lp-divider">
                  <span className="lp-divider-text">── veya ──</span>
                  <div className="lp-divider-line" />
                </div>

                {/* GitHub sign-in — full width */}
                <button onClick={() => signIn("github")} className="lp-signin-full">
                  <OctocatIcon size={20} />
                  GitHub ile Giriş Yap
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── Feature cards ── */}
      <section className="lp-features">
        <FeatureCard
          emoji="🔍"
          title="Profil Analizi"
          desc="Tüm public repoların taranır, dil dağılımı ve aktivite istatistiklerin çıkarılır."
        />
        <FeatureCard
          emoji="📊"
          title="Kategori Tespiti"
          desc="Frontend, Backend, Full-Stack, DevOps veya Data Science — kodun seni ele verir."
        />
        <FeatureCard
          emoji="🚀"
          title="Gelişim Önerileri"
          desc="Activity, Popularity ve Diversity skorlarınla güçlü ve zayıf yanlarını keşfet."
        />
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer" style={{ padding: "40px", color: "#8b949e", fontSize: "12px", display: "flex", justifyContent: "center", gap: "20px", opacity: 0.8 }}>
        <span>Powered by OpenRouter AI</span>
        <span>•</span>
        <span>Next.js 16</span>
        <span>•</span>
        <span>Python ML Backend</span>
      </footer>
    </div>
  );
}
