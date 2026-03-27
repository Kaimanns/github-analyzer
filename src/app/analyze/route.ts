import { getFullProfile } from "@/services/githubService";
import { classifyDeveloper } from "@/lib/classifier";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export const maxDuration = 30;

/**
 * GET /analyze?username=<github_username>
 *
 * 1. GitHub'dan tam profil verisi çek
 * 2. Geliştirici kategorisi + skorlarını hesapla
 * 3. Sonucu Analysis tablosuna upsert et
 * 4. Birleşik sonucu döndür
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");

  if (!username) {
    return NextResponse.json(
      { hata: "username parametresi zorunludur." },
      { status: 400 }
    );
  }

  try {
    // 1. GitHub verisi
    const profile = await getFullProfile(username);

    // 2. Sınıflandırma
    const devProfile = classifyDeveloper(profile);

    // 3. Oturum — kim analiz yapıyor?
    const session = await auth();
    const userId = session?.user
      ? await resolveUserId(session.user.email ?? null)
      : null;

    // 4. DB Kayıt — fire-and-forget (DB hatası kullanıcıya yansımasın)
    const languageDataJson = JSON.parse(JSON.stringify(profile.languageStats));
    const topReposJson = JSON.parse(JSON.stringify(profile.topRepos));

    const dataPayload = {
      username: profile.username,
      avatarUrl: profile.avatarUrl,
      bio: profile.bio,
      location: profile.location,
      publicRepos: profile.publicRepos,
      followers: profile.followers,
      following: profile.following,
      totalStars: profile.totalStars,
      totalForks: profile.totalForks,
      accountAgeDays: profile.accountAgeDays,
      languageData: languageDataJson,
      topRepos: topReposJson,
      category: devProfile.category,
      classificationReason: devProfile.classificationReason,
      activityScore: devProfile.scores.activityScore,
      popularityScore: devProfile.scores.popularityScore,
      diversityScore: devProfile.scores.diversityScore,
      overallScore: devProfile.scores.overallScore,
      analyzedAt: new Date(),
      ...(userId ? { userId } : {}),
    };

    // DB yazma — başarısız olsa bile API yanıtı etkilenmesin
    prisma.analysis.findFirst({ where: { username } })
      .then((existing) => {
        if (existing) {
          return prisma.analysis.update({ where: { id: existing.id }, data: dataPayload });
        }
        return prisma.analysis.create({ data: dataPayload });
      })
      .catch((e: unknown) => console.warn("[analyze] DB kayıt başarısız (devam):", e));

    // 5. Birleşik yanıt — DB beklenmeden hemen dön
    return NextResponse.json({ profile, devProfile });
  } catch (error) {
    console.error("[analyze] Hata:", error);
    const message =
      error instanceof Error ? error.message : String(error);

    if (message.includes("Not Found") || message.includes("404")) {
      return NextResponse.json(
        { hata: `'${username}' adında bir GitHub kullanıcısı bulunamadı.` },
        { status: 404 }
      );
    }

    if (message.includes("rate limit") || message.includes("403")) {
      return NextResponse.json(
        { hata: "GitHub API rate limit aşıldı. GITHUB_TOKEN ekleyin veya birkaç dakika bekleyin.", detay: message },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { hata: "Analiz başarısız", detay: message },
      { status: 500 }
    );
  }
}

/** Email ile User ID'yi Prisma'dan çeker */
async function resolveUserId(email: string | null): Promise<string | null> {
  if (!email) return null;
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    return user?.id ?? null;
  } catch {
    return null;
  }
}
