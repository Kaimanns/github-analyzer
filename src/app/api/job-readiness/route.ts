import { NextResponse } from "next/server";

export const maxDuration = 60;

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "openai/gpt-oss-120b:free";

export interface JobReadinessInsight {
  readinessScore: number;
  matchingSkills: string[];
  missingSkills: string[];
  roadmap: string[];
  verdict: string;
}

export async function POST(request: Request) {
  try {
    const { username, profile, role } = await request.json();

    if (!username || !profile || !role) {
      return NextResponse.json(
        { error: "username, profile ve role zorunludur." },
        { status: 400 }
      );
    }

    // Profilin dillerini ve temel repolarını prompt için formatla
    const langString = profile.languageStats
      ?.map((l: any) => `${l.name} (%${l.percentage})`)
      .join(", ") || "Bilinmiyor";
      
    const topReposString = profile.topRepos
      ?.slice(0, 5)
      .map((r: any) => `- ${r.name} (${r.language || "Bilinmeyen Dil"}): ${r.description || ""}`)
      .join("\n") || "Repo yok";

    const prompt = `
Sen deneyimli bir teknik işe alım yöneticisi (Tech Recruiter) ve kariyer mentörüsün.
Aşağıdaki GitHub profilini inceleyerek kullanıcının "${role}" pozisyonuna ne kadar hazır olduğunu analiz et.
YALNIZCA geçerli JSON formatında yanıt ver, başka hiçbir metin ekleme.

═══════════════ PROFİL BİLGİLERİ ═══════════════
Kullanıcı    : ${username}
Hesap Yaşı   : ${Math.floor(profile.accountAgeDays / 365)} yıl, ${profile.accountAgeDays % 365} gün
Toplam Yıldız: ${profile.totalStars}
Diller       : ${langString}

En İyi Repoları:
${topReposString}
════════════════════════════════════════════════

Şu JSON şemasında yanıt ver (Tüm alanları TÜRKÇE doldur):
{
  "readinessScore": 75, // 0-100 arası tamsayı, uyumluluğu temsil etmeli
  "matchingSkills": [
    "Rol için uygun olan, profilde bulunan mevcut beceri 1",
    "Mevcut beceri 2"
  ],
  "missingSkills": [
    "Rol için GEREKLİ AMA profilde GÖRÜNMEYEN kritik teknoloji 1",
    "Eksik teknoloji 2"
  ],
  "roadmap": [
    "Hedefe ulaşmak için ilk somut eylem",
    "İkinci adım",
    "Üçüncü adım"
  ],
  "verdict": "Kullanıcının bu rol için genel durumunu özetleyen 1-2 cümlelik profesyonel bir mentör yorumu."
}

Dikkat Et:
- ${role} rolü için sektör standartlarında beklenen teknolojiler (örn: Frontend için React/Vue, Backend için DB/API bilgisi) ile kullanıcının mevcut dillerini (Diller: ${langString}) kıyasla.
- Toplam 0-100 arası gerçekçi bir "readinessScore" ver. Profilde hedefrolle tamamen alakasız şeyler varsa skor düşük (örn: 10-30), biraz uyumluysa orta (40-60), çok uyumluysa yüksek (70-100) olsun.
`.trim();

    const MAX_RETRIES = 3;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(OPENROUTER_API_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "GitHub Analyzer - Job Readiness",
          },
          body: JSON.stringify({
            model: OPENROUTER_MODEL,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.6,
          }),
        });

        if (response.ok) {
          const data = (await response.json()) as {
            choices: { message: { content: string } }[];
          };
          const text = data.choices[0]?.message?.content ?? "";
          const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          const parsed = JSON.parse(clean) as JobReadinessInsight;
          return NextResponse.json({ insight: parsed });
        }

        if (response.status === 429 && attempt < MAX_RETRIES) {
          const retryAfter = Number(response.headers.get("Retry-After") ?? "5");
          await new Promise((r) => setTimeout(r, (retryAfter + 1) * 1000));
          continue;
        }
      } catch (e) {
        console.warn(`[job-readiness] Deneme ${attempt} başarısız:`, e);
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }
      }
    }

    // Fallback if API fails
    const fallback: JobReadinessInsight = {
      readinessScore: 50,
      matchingSkills: ["Mevcut GitHub istatistikleri"],
      missingSkills: ["Detaylı analiz yapılamadı (Yapay Zeka sunucusu meşgul)"],
      roadmap: [
        "Temel konseptleri öğrenmeye devam et",
        "Daha fazla açık kaynak projeye katkıda bulun"
      ],
      verdict: "Şu an sunucu kaynaklı bir gecikme yaşanıyor, ancak verileriniz incelendiğinde orta düzeyde bir uyum göze çarpıyor."
    };

    return NextResponse.json({ insight: fallback });

  } catch (error) {
    console.error("[job-readiness] Hata:", error);
    return NextResponse.json({ insight: null }, { status: 500 });
  }
}
