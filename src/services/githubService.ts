import { octokit } from "@/lib/octokit";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface LanguageStat {
  name: string;
  bytes: number;
  percentage: number;
}

export interface TopRepo {
  name: string;
  stars: number;
  forks: number;
  language: string | null;
  url: string;
  description: string | null;
  updatedAt?: string;
  isFork?: boolean;
}

export interface GitHubProfile {
  // Temel kullanıcı bilgileri
  username: string;
  name: string | null;
  bio: string | null;
  avatarUrl: string;
  location: string | null;
  publicUrl: string;

  // İstatistikler
  followers: number;
  following: number;
  publicRepos: number;
  totalStars: number;
  totalForks: number;

  // Hesap yaşı
  createdAt: string; // ISO string
  accountAgeDays: number;

  // Dil analizi (yüzdelik, büyükten küçüğe)
  languageStats: LanguageStat[];

  // En popüler 5 repo (yıldıza göre) — AI analizi için
  topRepos: TopRepo[];

  // Tüm repolar (max 50, yıldıza göre) — Proje Gezgini için
  allRepos: TopRepo[];
}

// ─────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────

/** Tüm sayfaları dönerek tüm repoları çeker (100'den fazla repo için) */
async function fetchAllRepos(username: string) {
  type Repo = {
    name: string;
    fork: boolean;
    stargazers_count?: number;
    forks_count?: number;
    language?: string | null;
    html_url: string;
    description?: string | null;
  };

  const repos: Repo[] = [];

  let page = 1;
  while (true) {
    const { data } = await octokit.request("GET /users/{username}/repos", {
      username,
      sort: "updated",
      per_page: 100,
      page,
    });
    repos.push(...data);
    if (data.length < 100) break;
    page++;
  }

  return repos;
}

/** Byte haritasını yüzdelik LanguageStat dizisine çevirir */
function normalizeLanguages(
  rawStats: Record<string, number>
): LanguageStat[] {
  const totalBytes = Object.values(rawStats).reduce((a, b) => a + b, 0);
  if (totalBytes === 0) return [];

  return Object.entries(rawStats)
    .map(([name, bytes]) => ({
      name,
      bytes,
      percentage: Number(((bytes / totalBytes) * 100).toFixed(2)),
    }))
    .filter((l) => l.percentage > 0.5)
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 10);
}

/** Hesap yaşını gün cinsinden hesaplar */
function calcAccountAgeDays(createdAt: string): number {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  return Math.floor((now - created) / (1000 * 60 * 60 * 24));
}

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

/**
 * Verilen GitHub kullanıcısı için tam profil verisini toplar ve döner.
 * Dil istatistikleri için tüm repoları tarar; rate limit'e dikkat et.
 */
export async function getFullProfile(username: string): Promise<GitHubProfile> {
  // 1. Kullanıcı profili
  const { data: user } = await octokit.request("GET /users/{username}", {
    username,
  });

  // 2. Tüm repolar
  const repos = await fetchAllRepos(username);

  // 3. Dil istatistikleri: her repo için dil byte'larını topla
  const rawLangStats: Record<string, number> = {};

  if (repos.length > 0) {
    await Promise.all(
      repos.map(async (repo) => {
        if (repo.fork) return; // fork'ları dahil etme — kendi kodu değil
        try {
          const { data: langs } = await octokit.request(
            "GET /repos/{owner}/{repo}/languages",
            { owner: username, repo: repo.name }
          );
          for (const [lang, bytes] of Object.entries(langs)) {
            rawLangStats[lang] = (rawLangStats[lang] ?? 0) + (bytes as number);
          }
        } catch {
          // Erişim hatası olan repoyu atla
        }
      })
    );
  }

  // 4. Toplam star & fork
  const totalStars = repos.reduce((acc, r) => acc + (r.stargazers_count ?? 0), 0);
  const totalForks = repos.reduce((acc, r) => acc + (r.forks_count ?? 0), 0);

  // 5. En popüler 5 repo (AI bağlamı için)
  const topRepos: TopRepo[] = [...repos]
    .sort((a, b) => (b.stargazers_count ?? 0) - (a.stargazers_count ?? 0))
    .slice(0, 5)
    .map((r) => ({
      name: r.name,
      stars: r.stargazers_count ?? 0,
      forks: r.forks_count ?? 0,
      language: r.language ?? null,
      url: r.html_url,
      description: r.description ?? null,
      isFork: r.fork,
    }));

  // 6. Tüm repolar (max 50, Proje Gezgini için)
  const allRepos: TopRepo[] = [...repos]
    .sort((a, b) => (b.stargazers_count ?? 0) - (a.stargazers_count ?? 0))
    .slice(0, 50)
    .map((r) => ({
      name: r.name,
      stars: r.stargazers_count ?? 0,
      forks: r.forks_count ?? 0,
      language: r.language ?? null,
      url: r.html_url,
      description: r.description ?? null,
      isFork: r.fork,
    }));

  return {
    username: user.login,
    name: user.name ?? null,
    bio: user.bio ?? null,
    avatarUrl: user.avatar_url,
    location: user.location ?? null,
    publicUrl: user.html_url,

    followers: user.followers,
    following: user.following,
    publicRepos: user.public_repos,
    totalStars,
    totalForks,

    createdAt: user.created_at,
    accountAgeDays: calcAccountAgeDays(user.created_at),

    languageStats: normalizeLanguages(rawLangStats),
    topRepos,
    allRepos,
  };
}

/**
 * Verilen repo için README, son commit mesajları ve bağımlılık dosyalarını çeker.
 * package.json (JS/TS), requirements.txt (Python) ve go.mod (Go) desteklenir.
 */
export async function getRepoDetails(username: string, repoName: string) {
  // README çek (800 karakter — daha iyi bağlam için artırıldı)
  let readme = "";
  try {
    const { data } = await octokit.request(
      "GET /repos/{owner}/{repo}/readme",
      { owner: username, repo: repoName }
    );
    readme = Buffer.from(data.content, "base64")
      .toString("utf-8")
      .slice(0, 800);
  } catch {
    // Erişim hatası veya README yok
  }

  // Son 15 commit mesajı + toplam sayım
  let commits: string[] = [];
  let commitCount = 0;
  try {
    const { data } = await octokit.request(
      "GET /repos/{owner}/{repo}/commits",
      { owner: username, repo: repoName, per_page: 15 }
    );
    commits = data.map((c) => c.commit.message.split("\n")[0]);
    commitCount = data.length;
  } catch {
    // Commit erişim hatası
  }

  // package.json bağımlılıkları (JS/TS projeleri)
  let deps: string[] = [];
  try {
    const { data } = await octokit.request(
      "GET /repos/{owner}/{repo}/contents/{path}",
      { owner: username, repo: repoName, path: "package.json" }
    );
    if ("content" in data && typeof data.content === "string") {
      const pkg = JSON.parse(
        Buffer.from(data.content, "base64").toString()
      ) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      deps = [
        ...Object.keys(pkg.dependencies ?? {}),
        ...Object.keys(pkg.devDependencies ?? {}),
      ];
    }
  } catch {
    // package.json yok veya erişim hatası
  }

  // requirements.txt (Python projeleri)
  let pythonDeps: string[] = [];
  try {
    const { data } = await octokit.request(
      "GET /repos/{owner}/{repo}/contents/{path}",
      { owner: username, repo: repoName, path: "requirements.txt" }
    );
    if ("content" in data && typeof data.content === "string") {
      const raw = Buffer.from(data.content, "base64").toString("utf-8");
      pythonDeps = raw
        .split("\n")
        .map((l) => l.split("==")[0].split(">=")[0].trim())
        .filter((l) => l && !l.startsWith("#"))
        .slice(0, 20);
    }
  } catch {
    // requirements.txt yok — pyproject.toml dene
    try {
      const { data } = await octokit.request(
        "GET /repos/{owner}/{repo}/contents/{path}",
        { owner: username, repo: repoName, path: "pyproject.toml" }
      );
      if ("content" in data && typeof data.content === "string") {
        const raw = Buffer.from(data.content, "base64").toString("utf-8");
        // Basit regex: dependencies = [...] bloğundan paketleri çek
        const match = raw.match(/dependencies\s*=\s*\[([\s\S]+?)\]/);
        if (match) {
          pythonDeps = match[1]
            .split(",")
            .map((l) => l.replace(/["'\s]/g, "").split(">=")[0].split("==")[0])
            .filter(Boolean)
            .slice(0, 20);
        }
      }
    } catch {
      // pyproject.toml da yok
    }
  }

  // go.mod (Go projeleri)
  let goDeps: string[] = [];
  try {
    const { data } = await octokit.request(
      "GET /repos/{owner}/{repo}/contents/{path}",
      { owner: username, repo: repoName, path: "go.mod" }
    );
    if ("content" in data && typeof data.content === "string") {
      const raw = Buffer.from(data.content, "base64").toString("utf-8");
      goDeps = raw
        .split("\n")
        .filter((l) => l.startsWith("\t") && !l.includes("//"))
        .map((l) => l.trim().split(" ")[0])
        .filter(Boolean)
        .slice(0, 20);
    }
  } catch {
    // go.mod yok
  }

  return { readme, commits, commitCount, deps, pythonDeps, goDeps };
}
