"""
collect_real_data.py
--------------------
Gerçek GitHub profillerinden veri çeker.
Kategori ataması:
  - Belirli profiller için MANUEL override (DevOps, Frontend, Backend, DS)
  - Geri kalanlar rule-based classifier ile belirlenir.
Çıktı: ml/real_data.json

Yeni features (v2):
  devops_ratio    — Shell+Dockerfile+HCL+YAML+Makefile+PowerShell toplam oranı
  avg_repo_size   — ortalama repo boyutu (KB), normalize: /10000
  fork_ratio      — fork olan repoların oranı (0-1)
"""

import os
import sys
import time
import json
import requests
from pathlib import Path
from collections import Counter

# Windows terminal UTF-8 fix
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

# ─────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────

SCRIPT_DIR = Path(__file__).parent    # ml/
ROOT_DIR   = SCRIPT_DIR.parent        # proje kökü

def load_token() -> str:
    env_path = ROOT_DIR / ".env.local"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith("GITHUB_TOKEN="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return ""

GITHUB_TOKEN = load_token()
HEADERS = {"Authorization": f"token {GITHUB_TOKEN}"} if GITHUB_TOKEN else {}
RATE_LIMIT_SLEEP   = 0.3
MAX_REPOS_TO_SAMPLE = 200

# ─────────────────────────────────────────────
# Manuel kategori override'ları
# ─────────────────────────────────────────────

MANUAL_CATEGORY: dict[str, str] = {
    # DevOps
    "jessfraz":        "DevOps",
    "kelseyhightower": "DevOps",
    "brandur":         "DevOps",
    "bketelsen":       "DevOps",
    "bibryam":         "DevOps",
    "tianon":          "DevOps",
    "crosbymichael":   "DevOps",
    "jpetazzo":        "DevOps",
    "thockin":         "DevOps",
    # Frontend
    "gaearon":         "Frontend",
    "antfu":           "Frontend",
    "sindresorhus":    "Frontend",
    "yyx990803":       "Frontend",
    "kentcdodds":      "Frontend",
    "ryanflorence":    "Frontend",
    "timneutkens":     "Frontend",
    "mxstbr":          "Frontend",
    "cassidoo":        "Frontend",
    "sarah_edo":       "Frontend",
    "una":             "Frontend",
    "argyleink":       "Frontend",
    "getify":          "Frontend",
    "wesbos":          "Frontend",
    "developit":       "Frontend",
    "Rich-Harris":     "Frontend",
    "jamiebuilds":     "Frontend",
    "bradtraversy":    "Frontend",
    "mgechev":         "Frontend",
    "brianc":          "Frontend",
    "addyosmani":      "Frontend",
    "tannerlinsley":   "Frontend",
    # Backend
    "torvalds":        "Backend",
    "antirez":         "Backend",
    "bmizerany":       "Backend",
    "peterbourgon":    "Backend",
    "mitchellh":       "Backend",
    "caarlos0":        "Backend",
    "jeremyevans":     "Backend",
    "egonelbre":       "Backend",
    "benbjohnson":     "Backend",
    "tpope":           "Backend",
    # Data Science
    "jakevdp":         "Data Science",
    "fchollet":        "Data Science",
    "karpathy":        "Data Science",
    "gwern":           "Data Science",
    "rasbt":           "Data Science",
    # Full-Stack
    "tj":              "Full-Stack",
    "jesseduffield":   "Full-Stack",
    "nicolo-ribaudo":  "Full-Stack",
    "patak-dev":       "Full-Stack",
    "egoist":          "Full-Stack",
    "feross":          "Full-Stack",
    "dominictarr":     "Full-Stack",
    "balderdashy":     "Full-Stack",
    "mafintosh":       "Full-Stack",
    "yoshuawuyts":     "Full-Stack",
    "maxogden":        "Full-Stack",
    "juliangruber":    "Full-Stack",
    "rvagg":           "Full-Stack",
    "mmalecki":        "Full-Stack",
}

# ─────────────────────────────────────────────
# Hedef profiller (beklenen kategori → kullanıcı adları)
# ─────────────────────────────────────────────

PROFILES: dict[str, list[str]] = {
    "Frontend": [
        "gaearon", "antfu", "sindresorhus", "yyx990803",
        "kentcdodds", "ryanflorence",
        "timneutkens", "mxstbr", "cassidoo",
        "sarah_edo", "una", "argyleink",
        "getify", "wesbos", "developit", "Rich-Harris",
        "jamiebuilds", "bradtraversy", "mgechev", "brianc",
        "addyosmani", "tannerlinsley",
    ],
    "Backend": [
        "torvalds", "antirez", "bmizerany", "peterbourgon", "mitchellh",
        "spf13", "dvyukov",
        "caarlos0", "jeremyevans", "egonelbre", "benbjohnson", "tpope",
    ],
    "Data Science": [
        "jakevdp", "fchollet", "karpathy", "gwern", "rasbt",
        "josephmisiti",
    ],
    "DevOps": [
        "jessfraz", "kelseyhightower", "brandur", "bketelsen", "bibryam",
        "tianon", "crosbymichael", "jpetazzo", "thockin",
    ],
    "Full-Stack": [
        "tj", "jesseduffield", "nicolo-ribaudo", "patak-dev", "egoist",
        "feross", "dominictarr", "balderdashy", "substack", "mafintosh",
        "yoshuawuyts", "maxogden", "juliangruber", "rvagg", "mmalecki",
    ],
}

# DevOps dil seti
DEVOPS_LANGS = {"shell", "dockerfile", "hcl", "yaml", "makefile", "powershell"}

# ─────────────────────────────────────────────
# GitHub API helpers
# ─────────────────────────────────────────────

def gh_get(url: str):
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        if resp.status_code == 200:
            return resp.json()
        elif resp.status_code == 404:
            print(f"    [404] {url}")
        elif resp.status_code == 403:
            reset = resp.headers.get("X-RateLimit-Reset", "?")
            print(f"    [403 Rate Limit] Reset: {reset}. 61s bekleniyor...")
            time.sleep(61)
            return gh_get(url)
        else:
            print(f"    [{resp.status_code}] {url}")
    except Exception as e:
        print(f"    [ERROR] {url}: {e}")
    return None


def fetch_user(username: str):
    return gh_get(f"https://api.github.com/users/{username}")


def fetch_repos(username: str) -> list[dict]:
    """
    Sayfalı repo listesi çeker. Her repo için ayrı /languages çağrısı yapmaz.
    Büyük profillerde MAX_REPOS_TO_SAMPLE kadar örnekler.
    Hem fork edilmiş hem de kendi repoları döner (fork bilgisi için).
    """
    repos = []
    page = 1
    while True:
        data = gh_get(
            f"https://api.github.com/users/{username}/repos"
            f"?sort=pushed&per_page=100&page={page}"
        )
        if not data:
            break
        repos.extend(data)
        if len(data) < 100:
            break
        if len(repos) >= MAX_REPOS_TO_SAMPLE:
            repos = repos[:MAX_REPOS_TO_SAMPLE]
            break
        page += 1
        time.sleep(RATE_LIMIT_SLEEP)
    return repos

# ─────────────────────────────────────────────
# Rule-based classifier (classifier.ts mirror)
# ─────────────────────────────────────────────

def classify_by_rules(lang_pct: dict[str, float]) -> str:
    jsts    = lang_pct.get("javascript", 0) + lang_pct.get("typescript", 0)
    python  = lang_pct.get("python", 0) + lang_pct.get("r", 0) + lang_pct.get("julia", 0)
    backend = sum(lang_pct.get(l, 0) for l in
                  ["go", "rust", "java", "c#", "php", "kotlin", "ruby", "scala", "c", "c++"])
    devops  = sum(lang_pct.get(l, 0) for l in DEVOPS_LANGS)

    if python > 40:
        return "Data Science"
    if jsts > 60 and python < 10:
        return "Frontend"
    if backend > 40:
        return "Backend"
    if devops > 25:
        return "DevOps"
    return "Full-Stack"

# ─────────────────────────────────────────────
# Feature extraction
# ─────────────────────────────────────────────

def account_age_days(created_at: str) -> int:
    from datetime import datetime, timezone
    created = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
    return (datetime.now(timezone.utc) - created).days


def build_profile(username: str) -> dict | None:
    print(f"  > {username}", end="", flush=True)

    user = fetch_user(username)
    if not user or isinstance(user, list):
        print(" [SKIP - kullanici bulunamadi]")
        return None
    time.sleep(RATE_LIMIT_SLEEP)

    repos = fetch_repos(username)
    time.sleep(RATE_LIMIT_SLEEP)

    total_repos = len(repos)

    # Fork ve own repo ayrımı
    fork_repos = [r for r in repos if r.get("fork", False)]
    own_repos  = [r for r in repos if not r.get("fork", False)]

    # fork_ratio: kaç repo fork edilmiş / toplam
    fork_ratio = round(len(fork_repos) / total_repos, 4) if total_repos > 0 else 0.0

    # avg_repo_size: tüm repoların size ortalaması (KB), normalize /10000
    sizes = [r.get("size", 0) or 0 for r in repos]
    raw_avg_size = sum(sizes) / len(sizes) if sizes else 0
    avg_repo_size = round(raw_avg_size / 10000.0, 4)

    # Primary language sayımı (own repos'tan)
    lang_counter: Counter = Counter()
    for r in own_repos:
        lang = r.get("language")
        if lang:
            lang_counter[lang.lower()] += 1

    total_lang   = sum(lang_counter.values())
    lang_pct: dict[str, float] = {}
    if total_lang > 0:
        for lang, cnt in lang_counter.items():
            pct_val = round((cnt / total_lang) * 100, 2)
            if pct_val > 0.5:
                lang_pct[lang] = pct_val

    # Feature değerleri
    jsts_ratio    = round((lang_pct.get("javascript", 0) + lang_pct.get("typescript", 0)) / 100, 4)
    python_ratio  = round(sum(
        lang_pct.get(l, 0) for l in
        ["python", "r", "julia", "matlab", "scala"]
    ) / 100, 4)
    backend_ratio = round(sum(
        lang_pct.get(l, 0) for l in
        ["go", "rust", "java", "c#", "php", "kotlin", "ruby", "scala", "c", "c++"]
    ) / 100, 4)
    devops_ratio  = round(sum(
        lang_pct.get(l, 0) for l in DEVOPS_LANGS
    ) / 100, 4)

    # balance_score: hiçbir dilin baskın olmadığını ölçer
    # Full-Stack profillerde bu değer yüksek olur
    max_lang = max(jsts_ratio, python_ratio,
                   backend_ratio, devops_ratio)
    balance_score = round(1.0 - max_lang, 4)

    # language_count_norm: kaç farklı dil kullanıldığını normalize et
    # Full-Stack: genelde 4-6 dil, Frontend: genelde 2-3 dil
    language_count = len([l for l in lang_pct if lang_pct[l] > 1.0])
    language_count_norm = round(min(language_count, 10) / 10.0, 4)

    # language_diversity: ham dil çeşitliliği (tüm diller, filtre yok)
    language_diversity = round(len(lang_counter) / 10.0, 4)

    # En baskın tek dilin oranı (uzmanlaşma ölçüsü)
    max_lang_ratio = round(
        max(lang_pct.values()) / 100.0 if lang_pct else 0.0, 4
    )

    total_stars = sum(r.get("stargazers_count", 0) or 0 for r in repos)
    repo_count  = user.get("public_repos", len(repos))
    age_days    = account_age_days(user["created_at"])

    # Kategori: önce manuel override, yoksa rule-based
    if username.lower() in {k.lower() for k in MANUAL_CATEGORY}:
        category = MANUAL_CATEGORY[username]
        cat_src  = "MANUEL"
    else:
        category = classify_by_rules(lang_pct)
        cat_src  = "rule"

    print(f" [{cat_src}] > {category}  "
          f"(devops={devops_ratio:.2f}, avg_size={avg_repo_size:.3f}, fork={fork_ratio:.2f})")

    return {
        "username":         username,
        "category":         category,
        "js_ts_ratio":      jsts_ratio,
        "python_ratio":     python_ratio,
        "backend_ratio":    backend_ratio,
        "devops_ratio":     devops_ratio,
        "repo_count":       repo_count,
        "total_stars":      total_stars,
        "account_age_days": age_days,
        "avg_repo_size":    avg_repo_size,
        "fork_ratio":       fork_ratio,
        "balance_score":    balance_score,
        "language_count_norm": language_count_norm,
        "language_diversity":  language_diversity,
        "max_lang_ratio":   max_lang_ratio,
    }

# ─────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────

def main():
    if not GITHUB_TOKEN:
        print("[UYARI] GITHUB_TOKEN bulunamadi -- rate limit 60 req/h!")
    else:
        print(f"[OK] Token: {GITHUB_TOKEN[:10]}...")

    results: list[dict] = []
    seen: set[str] = set()

    for expected_cat, usernames in PROFILES.items():
        print(f"\n{'='*52}")
        print(f"  {expected_cat}")
        print(f"{'='*52}")
        for username in usernames:
            if username in seen:
                continue
            seen.add(username)
            try:
                profile = build_profile(username)
                if profile:
                    results.append(profile)
            except Exception as e:
                print(f"    [ERROR] {username}: {e}")

    # Kaydet
    output_path = SCRIPT_DIR / "real_data.json"
    output_path.write_text(
        json.dumps(results, indent=2, ensure_ascii=False),
        encoding="utf-8"
    )

    print(f"\n{'='*52}")
    print(f"Toplam {len(results)} profil toplandi.")
    print(f"Kaydedildi: {output_path}")

    dist = Counter(p["category"] for p in results)
    print("\nKategori dagilimi:")
    for cat in ["Frontend", "Backend", "Data Science", "DevOps", "Full-Stack"]:
        print(f"  {cat:<16}: {dist.get(cat, 0)}")


if __name__ == "__main__":
    main()
