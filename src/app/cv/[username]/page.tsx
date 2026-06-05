"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";

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

export default function CVPage() {
  const params = useParams();
  const username = decodeURIComponent(
    Array.isArray(params.username) ? params.username[0] : params.username ?? ""
  );

  const [profile, setProfile] = useState<GitHubProfile | null>(null);
  const [devProfile, setDevProfile] = useState<DeveloperProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username) return;

    fetch(`/analyze?username=${encodeURIComponent(username)}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Profil yüklenemedi.");
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

  useEffect(() => {
    // Profil yüklendiğinde yazdırma ipucu gösterebiliriz veya direkt print edebiliriz.
    // Ancak kullanıcı sayfanın son halini görüp kendi karar versin.
  }, [profile]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#f0f2f5", color: "#333", fontFamily: "sans-serif" }}>
        <h2>Portfolyo Raporu Hazırlanıyor...</h2>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#f0f2f5", color: "#d73a49", fontFamily: "sans-serif" }}>
        <h2>{error || "Profil bulunamadı."}</h2>
      </div>
    );
  }

  return (
    <div className="cv-container">
      {/* Yazdırma Butonu (Yazdırılırken gizlenecek) */}
      <div className="cv-print-actions">
        <button className="cv-btn-print" onClick={() => window.print()}>
          🖨️ PDF Olarak Kaydet / Yazdır
        </button>
        <button className="cv-btn-back" onClick={() => window.history.back()}>
          ← Analize Dön
        </button>
      </div>

      <div className="cv-document">
        {/* Header */}
        <header className="cv-header">
          <div className="cv-header-left">
            <h1 className="cv-name">{profile.name || profile.username}</h1>
            <h2 className="cv-title">{devProfile?.category || "Software Developer"}</h2>
            <div className="cv-contact">
              {profile.location && <span>📍 {profile.location}</span>}
              <span>🔗 github.com/{profile.username}</span>
              <span>📦 {profile.publicRepos} Proje</span>
            </div>
          </div>
          <div className="cv-header-right">
            <img src={profile.avatarUrl} alt="Avatar" className="cv-avatar" />
          </div>
        </header>

        {/* Bio / Summary */}
        {profile.bio && (
          <section className="cv-section">
            <h3 className="cv-section-title">Hakkımda</h3>
            <p className="cv-bio">{profile.bio}</p>
          </section>
        )}

        <div className="cv-columns">
          {/* Sol Kolon: Yetenekler & İstatistikler */}
          <aside className="cv-sidebar">
            <section className="cv-section">
              <h3 className="cv-section-title">Teknik Yetenekler</h3>
              <div className="cv-skills">
                {profile.languageStats.map((lang) => (
                  <div key={lang.name} className="cv-skill-item">
                    <span className="cv-skill-name">{lang.name}</span>
                    <span className="cv-skill-pct">%{(lang.percentage).toFixed(1)}</span>
                    <div className="cv-skill-bar">
                      <div className="cv-skill-fill" style={{ width: `${lang.percentage}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="cv-section">
              <h3 className="cv-section-title">GitHub İstatistikleri</h3>
              <ul className="cv-stats-list">
                <li><strong>{profile.totalStars}</strong> Toplam Yıldız</li>
                <li><strong>{profile.followers}</strong> Takipçi</li>
                <li><strong>{Math.floor(profile.accountAgeDays / 365)}</strong> Yıllık Deneyim (GitHub)</li>
              </ul>
            </section>

            {devProfile && (
              <section className="cv-section">
                <h3 className="cv-section-title">Performans Skorları</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div className="cv-skill-item" style={{ marginBottom: 0 }}>
                    <span className="cv-skill-name">Aktivite Skoru</span>
                    <span className="cv-skill-pct">%{(devProfile.scores.activityScore)}</span>
                    <div className="cv-skill-bar">
                      <div className="cv-skill-fill" style={{ width: `${devProfile.scores.activityScore}%`, background: "#3fb950" }}></div>
                    </div>
                  </div>
                  <div className="cv-skill-item" style={{ marginBottom: 0 }}>
                    <span className="cv-skill-name">Popülerlik Skoru</span>
                    <span className="cv-skill-pct">%{(devProfile.scores.popularityScore)}</span>
                    <div className="cv-skill-bar">
                      <div className="cv-skill-fill" style={{ width: `${devProfile.scores.popularityScore}%`, background: "#58a6ff" }}></div>
                    </div>
                  </div>
                  <div className="cv-skill-item" style={{ marginBottom: 0 }}>
                    <span className="cv-skill-name">Çeşitlilik Skoru</span>
                    <span className="cv-skill-pct">%{(devProfile.scores.diversityScore)}</span>
                    <div className="cv-skill-bar">
                      <div className="cv-skill-fill" style={{ width: `${devProfile.scores.diversityScore}%`, background: "#bc8cff" }}></div>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </aside>

          {/* Sağ Kolon: Projeler */}
          <main className="cv-main">
            <section className="cv-section">
              <h3 className="cv-section-title">Öne Çıkan Projeler</h3>
              <div className="cv-projects">
                {profile.topRepos.map((repo) => (
                  <div key={repo.name} className="cv-project-card">
                    <div className="cv-project-header">
                      <h4 className="cv-project-name">{repo.name}</h4>
                      <div className="cv-project-meta">
                        {repo.language && <span className="cv-project-lang">{repo.language}</span>}
                        <span className="cv-project-star">⭐ {repo.stars}</span>
                        <span className="cv-project-fork">🍴 {repo.forks}</span>
                      </div>
                    </div>
                    {repo.description && <p className="cv-project-desc">{repo.description}</p>}
                    <a href={repo.url} className="cv-project-link">{repo.url}</a>
                  </div>
                ))}
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
