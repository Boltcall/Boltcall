"""
SEO/AEO Page Scorer — Fixed evaluation harness (DO NOT MODIFY).

Scores any page on boltcall.org across 10 dimensions (0-100 total).
This is the ground truth metric for the autoresearch loop.

Usage:
    from measure import score_page
    result = score_page("https://boltcall.org/blog/ai-vs-human-receptionist")
    print(result)  # {"total": 72, "breakdown": {...}, "issues": [...]}
"""

import re
import json
import urllib.request
import urllib.error
import ssl

# Skip SSL verification for simplicity
ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

PAGESPEED_KEY = "AIzaSyAuIUxZbicuP80YynrGhRnPMs5XcUlX65Q"


DIST_DIR = None  # Set to e.g. "./dist" to score local build instead of live site


def fetch_html(url: str) -> str:
    """Fetch raw HTML from a URL or local dist directory."""
    import os
    if DIST_DIR:
        # Score local prerendered files
        path = url.replace("https://boltcall.org", "").rstrip("/")
        if not path:
            path = "/"
        local_path = os.path.join(DIST_DIR, path.lstrip("/"), "index.html")
        if not os.path.exists(local_path):
            local_path = os.path.join(DIST_DIR, "index.html")
        with open(local_path, "r", encoding="utf-8") as f:
            return f.read()
    # Live site — ensure trailing slash (Netlify redirects)
    if not url.endswith("/") and "." not in url.split("/")[-1]:
        url = url + "/"
    req = urllib.request.Request(url, headers={"User-Agent": "SEO-Autoresearch/1.0"})
    with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
        return resp.read().decode("utf-8", errors="replace")


def score_page(url: str) -> dict:
    """Score a page across 10 SEO/AEO dimensions. Returns 0-100 total."""
    html = fetch_html(url)
    issues = []
    breakdown = {}

    # 1. TITLE TAG (0-10)
    title_match = re.search(r"<title[^>]*>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
    title = title_match.group(1).strip() if title_match else ""
    title_score = 0
    if title:
        title_score += 3  # exists
        if 20 <= len(title) <= 60:
            title_score += 3  # good length
        elif len(title) > 60:
            issues.append(f"Title too long ({len(title)} chars, max 60)")
            title_score += 1
        if "boltcall" in title.lower():
            title_score += 2  # brand present
        if any(kw in title.lower() for kw in ["ai", "receptionist", "business", "local", "phone"]):
            title_score += 2  # keyword present
    else:
        issues.append("Missing title tag")
    breakdown["title"] = title_score

    # 2. META DESCRIPTION (0-10)
    meta_match = re.search(r'<meta\s+name=["\']description["\']\s+content=["\']([^"\']*)', html, re.IGNORECASE)
    meta = meta_match.group(1).strip() if meta_match else ""
    meta_score = 0
    if meta:
        meta_score += 3
        if 80 <= len(meta) <= 155:
            meta_score += 3
        elif len(meta) > 155:
            issues.append(f"Meta description too long ({len(meta)} chars)")
            meta_score += 1
        if "boltcall" in meta.lower():
            meta_score += 2
        if any(word in meta.lower() for word in ["free", "start", "try", "get", "learn"]):
            meta_score += 2  # CTA word present
    else:
        issues.append("Missing meta description")
    breakdown["meta_description"] = meta_score

    # 3. H1 TAG (0-10)
    h1_matches = re.findall(r"<h1[^>]*>(.*?)</h1>", html, re.IGNORECASE | re.DOTALL)
    h1_score = 0
    if len(h1_matches) == 1:
        h1_score += 5  # exactly one H1
        h1_text = re.sub(r"<[^>]+>", "", h1_matches[0]).strip()
        if len(h1_text) > 10:
            h1_score += 3
        if any(kw in h1_text.lower() for kw in ["ai", "receptionist", "business", "local", "phone", "boltcall"]):
            h1_score += 2
    elif len(h1_matches) > 1:
        h1_score += 2
        issues.append(f"Multiple H1 tags ({len(h1_matches)})")
    else:
        issues.append("Missing H1 tag")
    breakdown["h1"] = h1_score

    # 4. HEADING STRUCTURE (0-10)
    h2_count = len(re.findall(r"<h2[^>]*>", html, re.IGNORECASE))
    h3_count = len(re.findall(r"<h3[^>]*>", html, re.IGNORECASE))
    heading_score = 0
    if h2_count >= 3:
        heading_score += 4
    elif h2_count >= 1:
        heading_score += 2
    else:
        issues.append("No H2 headings")
    if h3_count >= 2:
        heading_score += 3
    elif h3_count >= 1:
        heading_score += 1
    # Question-based headings (AEO signal)
    question_headings = len(re.findall(r"<h[23][^>]*>[^<]*\?", html, re.IGNORECASE))
    if question_headings >= 2:
        heading_score += 3
    elif question_headings >= 1:
        heading_score += 1
    else:
        issues.append("No question-based headings (weak AEO signal)")
    breakdown["headings"] = min(heading_score, 10)

    # 5. AEO DIRECT ANSWER BLOCK (0-10)
    # Look for a short paragraph (40-80 words) near the top of content
    # Usually in a blue/highlighted box or right after first H2
    paragraphs = re.findall(r"<p[^>]*>(.*?)</p>", html, re.IGNORECASE | re.DOTALL)
    aeo_score = 0
    has_answer_block = False
    for i, p in enumerate(paragraphs[:10]):  # check first 10 paragraphs
        text = re.sub(r"<[^>]+>", "", p).strip()
        word_count = len(text.split())
        if 30 <= word_count <= 80:
            # Could be an answer block
            if any(kw in text.lower() for kw in ["is a", "is an", "are ", "means", "refers to"]):
                has_answer_block = True
                aeo_score += 6
                if i < 5:
                    aeo_score += 2  # near top
                if "boltcall" in text.lower():
                    aeo_score += 2  # brand in answer block
                break
    if not has_answer_block:
        issues.append("No AEO direct answer block (40-60 word definition paragraph)")
        # Check if there's any short definitive paragraph
        for p in paragraphs[:5]:
            text = re.sub(r"<[^>]+>", "", p).strip()
            if 20 <= len(text.split()) <= 100:
                aeo_score += 2
                break
    breakdown["aeo_answer_block"] = min(aeo_score, 10)

    # 6. FAQ SECTION (0-10)
    faq_score = 0
    # Check for FAQPage schema
    if '"FAQPage"' in html or "'FAQPage'" in html:
        faq_score += 5
    else:
        issues.append("Missing FAQPage JSON-LD schema")
    # Check for FAQ-like H3 questions
    faq_headings = re.findall(r"<h3[^>]*>[^<]*\?</h3>", html, re.IGNORECASE)
    if len(faq_headings) >= 3:
        faq_score += 5
    elif len(faq_headings) >= 1:
        faq_score += 2
    else:
        issues.append("No FAQ section with question headings")
    breakdown["faq"] = min(faq_score, 10)

    # 7. SCHEMA MARKUP (0-10)
    schema_score = 0
    schemas_found = []
    if '"Article"' in html or '"BlogPosting"' in html:
        schema_score += 3
        schemas_found.append("Article")
    if '"Organization"' in html:
        schema_score += 2
        schemas_found.append("Organization")
    if '"BreadcrumbList"' in html:
        schema_score += 2
        schemas_found.append("BreadcrumbList")
    if '"FAQPage"' in html:
        schema_score += 2
        schemas_found.append("FAQPage")
    if '"datePublished"' in html:
        schema_score += 1
    if not schemas_found:
        issues.append("No structured data (JSON-LD) found")
    breakdown["schema"] = min(schema_score, 10)

    # 8. INTERNAL LINKS (0-10)
    internal_links = re.findall(r'href=["\']/((?!assets|images|favicon|sw\.js)[^"\']*)["\']', html)
    link_score = 0
    unique_links = set(l.split("#")[0].split("?")[0] for l in internal_links if l)
    if len(unique_links) >= 5:
        link_score += 5
    elif len(unique_links) >= 2:
        link_score += 3
    elif len(unique_links) >= 1:
        link_score += 1
    else:
        issues.append("No internal links")
    # Links to key pages
    key_pages = ["pricing", "signup", "blog", "features"]
    key_hits = sum(1 for kp in key_pages if any(kp in l for l in unique_links))
    link_score += min(key_hits * 2, 5)
    breakdown["internal_links"] = min(link_score, 10)

    # 9. CONTENT LENGTH & QUALITY (0-10)
    # Strip all HTML, count words
    text_only = re.sub(r"<script[^>]*>.*?</script>", "", html, flags=re.DOTALL | re.IGNORECASE)
    text_only = re.sub(r"<style[^>]*>.*?</style>", "", text_only, flags=re.DOTALL | re.IGNORECASE)
    text_only = re.sub(r"<[^>]+>", " ", text_only)
    text_only = re.sub(r"\s+", " ", text_only).strip()
    word_count = len(text_only.split())
    content_score = 0
    if word_count >= 1500:
        content_score += 5
    elif word_count >= 800:
        content_score += 3
    elif word_count >= 300:
        content_score += 1
    else:
        issues.append(f"Very thin content ({word_count} words)")
    # Brand mentions
    brand_mentions = text_only.lower().count("boltcall")
    if brand_mentions >= 3:
        content_score += 3
    elif brand_mentions >= 1:
        content_score += 1
    else:
        issues.append("Brand 'Boltcall' not mentioned in content")
    # Stats/numbers (AEO signal)
    stats = re.findall(r"\d+%|\$\d+|\d+x|\d+\.\d+", text_only)
    if len(stats) >= 5:
        content_score += 2
    elif len(stats) >= 2:
        content_score += 1
    breakdown["content"] = min(content_score, 10)

    # 10. CTA PRESENCE (0-10)
    cta_score = 0
    cta_patterns = [r"try.*free", r"start.*free", r"get.*started", r"sign.*up", r"book.*demo", r"schedule.*call"]
    cta_found = any(re.search(p, html, re.IGNORECASE) for p in cta_patterns)
    if cta_found:
        cta_score += 5
    else:
        issues.append("No clear CTA found")
    # Link to signup/pricing
    if re.search(r'href=["\']/(signup|pricing)', html, re.IGNORECASE):
        cta_score += 5
    elif re.search(r'href=["\'].*signup|pricing', html, re.IGNORECASE):
        cta_score += 3
    breakdown["cta"] = min(cta_score, 10)

    # TOTAL
    total = sum(breakdown.values())

    return {
        "url": url,
        "total": total,
        "grade": "A" if total >= 85 else "B" if total >= 70 else "C" if total >= 55 else "D" if total >= 40 else "F",
        "word_count": word_count,
        "breakdown": breakdown,
        "issues": issues,
    }


def score_all_pages() -> list:
    """Score all public pages on boltcall.org. Returns sorted list (worst first)."""
    pages = [
        "/", "/pricing", "/about", "/blog",
        "/features/ai-receptionist", "/features/ai-follow-up-system",
        "/features/automated-reminders", "/features/instant-form-reply",
        "/seo-audit", "/ai-revenue-audit",
        "/compare/boltcall-vs-podium", "/compare/boltcall-vs-gohighlevel",
        "/compare/boltcall-vs-birdeye", "/compare/boltcall-vs-emitrr",
        "/compare/boltcall-vs-calomation",
        "/blog/ai-vs-human-receptionist", "/blog/is-ai-receptionist-worth-it",
        "/blog/how-ai-receptionist-works",
        "/blog/speed-to-lead-local-business", "/blog/best-ai-receptionist-tools",
        "/blog/complete-guide-to-seo", "/blog/complete-guide-to-ai-for-local-businesses",
        "/blog/ai-phone-answering-dentists", "/blog/ai-phone-answering-plumbers",
        "/blog/google-reviews-automation-local-business",
        "/blog/best-after-hours-answering-service",
        "/blog/best-ai-receptionist-small-business",
    ]
    results = []
    for page in pages:
        url = f"https://boltcall.org{page}"
        try:
            result = score_page(url)
            results.append(result)
            print(f"  [{result['total']:3d}/100 {result['grade']}] {page}")
        except Exception as e:
            print(f"  [ERROR] {page}: {e}")
            results.append({"url": url, "total": 0, "grade": "F", "issues": [str(e)]})
    results.sort(key=lambda x: x["total"])
    return results


if __name__ == "__main__":
    import sys
    if "--local" in sys.argv:
        DIST_DIR = "./dist"
        print("SEO/AEO Page Scorer — Scoring LOCAL dist files...\n")
    else:
        print("SEO/AEO Page Scorer — Scoring LIVE site...\n")
        print("(Use --local to score ./dist instead)\n")
    results = score_all_pages()
    print(f"\n{'='*50}")
    print(f"Average score: {sum(r['total'] for r in results) / len(results):.1f}/100")
    print(f"Lowest: {results[0]['url']} ({results[0]['total']}/100)")
    print(f"Highest: {results[-1]['url']} ({results[-1]['total']}/100)")
    print(f"\nTop issues across all pages:")
    all_issues = {}
    for r in results:
        for issue in r.get("issues", []):
            all_issues[issue] = all_issues.get(issue, 0) + 1
    for issue, count in sorted(all_issues.items(), key=lambda x: -x[1])[:10]:
        print(f"  [{count:2d}x] {issue}")
