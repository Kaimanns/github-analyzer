import { NextResponse } from "next/server";
import { getRepoDetails } from "@/services/githubService";
import { analyzeWithGemini } from "@/lib/geminiAnalyzer";
import type { GitHubProfile } from "@/services/githubService";

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const {
      username,
      profile,
      category,
    }: { username: string; profile: GitHubProfile; category: string } =
      await request.json();

    // Top 5 repo detayları paralel çek (3'ten 5'e yükseltildi)
    const repoDetails = await Promise.all(
      profile.topRepos
        .slice(0, 5)
        .map((r: { name: string }) => getRepoDetails(username, r.name))
    );

    // JS/TS bağımlılıkları
    const readmes = repoDetails.map((r) => r.readme);
    const commits = repoDetails.flatMap((r) => r.commits);
    const deps = [...new Set(repoDetails.flatMap((r) => r.deps))];

    // Python bağımlılıkları
    const pythonDeps = [...new Set(repoDetails.flatMap((r) => r.pythonDeps))];

    // Go bağımlılıkları
    const goDeps = [...new Set(repoDetails.flatMap((r) => r.goDeps))];

    // Toplam commit aktivitesi
    const totalCommitCount = repoDetails.reduce(
      (sum, r) => sum + (r.commitCount ?? 0),
      0
    );

    // Repo bazlı bağlam (proje analizi için)
    const repoContexts = profile.topRepos.slice(0, 3).map((repo, i) => ({
      name: repo.name,
      description: repo.description ?? "",
      stars: repo.stars,
      forks: repo.forks,
      language: repo.language ?? "Bilinmiyor",
      readme: repoDetails[i]?.readme ?? "",
      commits: repoDetails[i]?.commits?.slice(0, 5) ?? [],
      deps: repoDetails[i]?.deps ?? [],
      pythonDeps: repoDetails[i]?.pythonDeps ?? [],
    }));

    const insight = await analyzeWithGemini(
      profile,
      category,
      readmes,
      commits,
      deps,
      pythonDeps,
      goDeps,
      totalCommitCount,
      repoContexts
    );

    return NextResponse.json({ insight });
  } catch (error) {
    console.error("Gemini analyze error:", error);
    return NextResponse.json({ insight: null });
  }
}
