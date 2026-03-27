import { octokit } from "@/lib/octokit";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { data } = await octokit.request("GET /user");
    return NextResponse.json({
      mesaj: "Sıfırdan kurulum ve bağlantı başarılı!",
      kullanici: data.login,
      repo_sayisi: data.public_repos,
    });
  } catch (error) {
    return NextResponse.json(
      { hata: "Bağlantı kurulamadı, token'ı kontrol et." },
      { status: 500 },
    );
  }
}
