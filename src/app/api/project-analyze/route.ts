import { NextResponse } from "next/server";
import { getRepoDetails } from "@/services/githubService";

export const maxDuration = 60;

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "openai/gpt-oss-120b:free";

export interface ProjectInsight {
  overview: string;           // Projenin ne yaptığı — 2-3 cümle
  complexity: "Basit" | "Orta" | "Gelişmiş" | "İleri";
  techStack: string[];        // Tespit edilen teknolojiler
  strengths: string[];        // Güçlü yönler (3-4 madde)
  improvements: string[];     // İyileştirme önerileri (3-4 madde)
  codeQuality: string;        // Kod kalitesi değerlendirmesi
  targetAudience: string;     // Hedef kitle
  nextSteps: string[];        // Projeyi büyütmek için somut sonraki adımlar (3 madde)
  impressionScore: number;    // 1-10 etki puanı
  impressionReason: string;   // Puanın gerekçesi
}

export async function POST(request: Request) {
  try {
    const { username, repoName, repoMeta }: {
      username: string;
      repoName: string;
      repoMeta: {
        stars: number;
        forks: number;
        language: string | null;
        description: string | null;
      };
    } = await request.json();

    if (!username || !repoName) {
      return NextResponse.json({ error: "username ve repoName zorunludur." }, { status: 400 });
    }

    // Repo detaylarını çek
    const details = await getRepoDetails(username, repoName);

    const allDeps = [
      ...details.deps.slice(0, 20),
      ...details.pythonDeps.slice(0, 10),
      ...details.goDeps.slice(0, 10),
    ].join(", ");

    const prompt = `
Sen deneyimli bir senior yazılım mühendisisin ve kod inceleme uzmanısın.
Aşağıdaki GitHub reposunu KAPSAMLI biçimde Türkçe analiz et.
YALNIZCA geçerli JSON döndür, başka metin yazma.

═══════════════ REPO BİLGİLERİ ═══════════════
Kullanıcı   : ${username}
Repo Adı    : ${repoName}
Açıklama    : ${repoMeta.description ?? "(yok)"}
Ana Dil     : ${repoMeta.language ?? "Bilinmiyor"}
Yıldız      : ${repoMeta.stars}
Fork        : ${repoMeta.forks}

Tespit Edilen Bağımlılıklar:
${allDeps || "(bulunamadı)"}

README (ilk 700 karakter):
${details.readme.slice(0, 700) || "(yok)"}

Son Commit Mesajları:
${details.commits.slice(0, 10).map((m, i) => `  ${i + 1}. ${m}`).join("\n") || "(yok)"}

Commit Sayısı (son çekim): ${details.commitCount}
═══════════════════════════════════════════════

Şu JSON şemasında yanıt ver (tüm alanları doldur, Türkçe yaz):
{
  "overview": "Bu projenin ne yaptığını, amacını ve hedef kitlesini açıklayan 3-4 Türkçe cümle.",
  "complexity": "Basit | Orta | Gelişmiş | İleri (bağımlılık sayısı, commit sayısı, README kalitesi ve dil derinliğine göre seç)",
  "techStack": ["Teknoloji 1", "Teknoloji 2", "..."],
  "strengths": [
    "Güçlü yön 1 — somut kanıtla (ör. bağımlılık, commit mesajı, README)",
    "Güçlü yön 2",
    "Güçlü yön 3"
  ],
  "improvements": [
    "İyileştirme önerisi 1 — neden ve nasıl",
    "İyileştirme önerisi 2",
    "İyileştirme önerisi 3"
  ],
  "codeQuality": "Commit mesajları ve proje yapısına bakarak kod kalitesini değerlendiren 2 Türkçe cümle.",
  "targetAudience": "Bu projeyi kimlerin kullanacağını veya kimler için faydalı olduğunu açıklayan 1-2 cümle.",
  "nextSteps": [
    "Projeyi büyütmek için somut ilk adım",
    "Somut ikinci adım",
    "Somut üçüncü adım"
  ],
  "impressionScore": 7,
  "impressionReason": "Bu puana neden layık olduğunu açıklayan 1 cümle."
}

Kurallar:
- techStack: README ve bağımlılıklardan çıkarım yap, maksimum 8 teknoloji
- complexity: 5'ten az dep/commit = Basit, 5-15 = Orta, 15-30 = Gelişmiş, 30+ = İleri
- impressionScore: 1-10 arası integer, yıldız sayısını da dikkate al
- Tüm metinler TÜRKÇE
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
            "X-Title": "GitHub Analyzer - Project Analysis",
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
          const parsed = JSON.parse(clean) as ProjectInsight;
          return NextResponse.json({ insight: parsed });
        }

        if (response.status === 429 && attempt < MAX_RETRIES) {
          const retryAfter = Number(response.headers.get("Retry-After") ?? "5");
          await new Promise((r) => setTimeout(r, (retryAfter + 1) * 1000));
          continue;
        }
      } catch (e) {
        console.warn(`[project-analyze] Deneme ${attempt} başarısız:`, e);
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }
      }
    }

    // Fallback
    const fallback: ProjectInsight = {
      overview: `${repoName}, ${repoMeta.language ?? "çoklu dil"} ile geliştirilmiş ${repoMeta.stars > 100 ? "popüler" : "gelişmekte olan"} bir proje. ${repoMeta.description ?? "Proje amacı README'den incelenebilir."}`,
      complexity: details.deps.length > 20 ? "Gelişmiş" : details.deps.length > 8 ? "Orta" : "Basit",
      techStack: [repoMeta.language ?? "JavaScript", ...details.deps.slice(0, 5)].filter(Boolean),
      strengths: [
        `${repoMeta.stars} yıldız ile topluluk ilgisi çekiyor`,
        "Aktif commit geçmişi mevcut",
        `${repoMeta.language ?? "Seçilen dil"} ekosistemiyle uyumlu yapı`,
      ],
      improvements: [
        "Kapsamlı birim testleri ve CI/CD pipeline eklenmeli",
        "README'ye kurulum ve katkı rehberi detaylandırılmalı",
        "Kod içi yorum ve dokümantasyon zenginleştirilmeli",
      ],
      codeQuality: "Commit mesajları ve proje yapısı genel olarak düzenli görünüyor. Detaylı inceleme için kaynak koduna bakılmalı.",
      targetAudience: "Yazılım geliştiriciler ve bu alanda çalışan profesyoneller için tasarlanmış bir proje.",
      nextSteps: [
        "GitHub Actions ile otomatik test ve deploy pipeline'ı kur",
        "Issues ve Discussions bölümünü aktif kullanarak topluluk oluştur",
        "Semantic versioning ve CHANGELOG dosyası ekle",
      ],
      impressionScore: Math.min(10, Math.max(3, Math.round(5 + repoMeta.stars / 100))),
      impressionReason: `${repoMeta.stars} yıldız ve ${repoMeta.forks} fork ile dikkat çeken bir proje.`,
    };

    return NextResponse.json({ insight: fallback });
  } catch (error) {
    console.error("[project-analyze] Hata:", error);
    return NextResponse.json({ insight: null }, { status: 500 });
  }
}
