#!/usr/bin/env python3
# Writes the SEO head tags, sitemap.xml and robots.txt for docs/. Run from the repo root: python3 scripts/apply-seo.py
# Safe to re-run. Change DEFAULT_BASE, or add docs/CNAME, to move the site to another domain.
import re,sys,html
import os
# Single place for the site's base URL. A docs/CNAME file (custom domain) overrides the github.io default.
DEFAULT_BASE="https://maxgerashenko.github.io/LLMeter/"
BASE=("https://"+open("docs/CNAME").read().strip()+"/") if os.path.exists("docs/CNAME") else DEFAULT_BASE
pages={"index.html":"","cloud.html":"cloud.html","cloud-rack.html":"cloud-rack.html","rack.html":"rack.html","runs.html":"runs.html","intelligence.html":"intelligence.html","finance.html":"finance.html","sources.html":"sources.html"}
h1={"index.html":"Best local LLM per tier for long coding tasks","cloud.html":"Cloud models ranked by Intelligence Index","cloud-rack.html":"Cloud racks: memory, bandwidth, agents served and price","rack.html":"Speed of local models on Mac and DGX Spark racks","runs.html":"Local model runs on the LLMeter coding suite","finance.html":"Finance of the frontier AI labs"}
titles={"index.html":"LLMeter: best local LLM per tier for long coding tasks"}
for f,path in pages.items():
    p="docs/"+f; s=open(p).read()
    s=re.sub(r"  <!-- seo:start -->.*?<!-- seo:end -->\n(  <script src=\"assets/analytics.js\" defer></script>\n)?","",s,flags=re.S)
    if f in titles: s=re.sub(r"<title>.*?</title>","<title>%s</title>"%titles[f],s,count=1)
    title=html.unescape(re.search(r"<title>(.*?)</title>",s).group(1))
    desc=re.search(r'<meta name="description" content="(.*?)">',s).group(1)
    url=BASE+path
    tags=f'''  <link rel="canonical" href="{url}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta name="theme-color" content="#4f46e5">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="LLMeter">
  <meta property="og:title" content="{html.escape(title)}">
  <meta property="og:description" content="{desc}">
  <meta property="og:url" content="{url}">
  <meta property="og:image" content="{BASE}assets/og.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="LLMeter: measuring LLM progress on long coding tasks">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{html.escape(title)}">
  <meta name="twitter:description" content="{desc}">
  <meta name="twitter:image" content="{BASE}assets/og.png">
'''
    if f=="index.html":
        ld='''  <script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebSite","@id":"%s#site","name":"LLMeter","url":"%s","description":"Measuring LLM progress on long coding tasks, from public sources."},{"@type":"Dataset","name":"LLMeter long-coding tiers","description":"Open-weights and cloud LLMs scored on long coding tasks (average of Terminal-Bench and FrontierCode) as a share of Claude Sonnet 5.5, grouped into tiers.","url":"%s","isAccessibleForFree":true,"creator":{"@type":"Person","name":"Max Gerashenko","url":"https://github.com/maxgerashenko"},"isBasedOn":"https://artificialanalysis.ai/","includedInDataCatalog":{"@type":"DataCatalog","name":"LLMeter","url":"%s"}}]}</script>
'''%(BASE,BASE,BASE,BASE)
        tags+=ld
    else:
        tags+='''  <script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage","name":%s,"description":%s,"url":"%s","isPartOf":{"@type":"WebSite","name":"LLMeter","url":"%s"}}</script>
'''%(__import__("json").dumps(title),__import__("json").dumps(html.unescape(desc)),url,BASE)
    s=s.replace('  <script src="assets/theme.js"></script>','  <!-- seo:start -->\n'+tags+'  <!-- seo:end -->\n  <script src="assets/analytics.js" defer></script>\n  <script src="assets/theme.js"></script>',1)
    #'  <script src="assets/theme.js"></script>\n  <script src="assets/analytics.js" defer></script>',1)
    assert "analytics.js" in s,f
    if f in h1 and "<h1" not in s:
        s=s.replace('<main class="wrap">','<main class="wrap">\n    <h1 class="sr-only">%s</h1>'%h1[f],1)
        assert "sr-only" in s,f
    open(p,"w").write(s)
# anthropic redirect
p="docs/anthropic.html"; s=open(p).read()
if True:
    s=re.sub(r'<link rel="canonical" href="[^"]*">',"",s); s=s.replace('  <meta name="robots" content="noindex">\n',"").replace("\n  \n","\n")
    s=s.replace('<meta http-equiv="refresh" content="0; url=finance.html#anthropic-s1">','<meta http-equiv="refresh" content="0; url=finance.html#anthropic-s1">\n  <meta name="robots" content="noindex">\n  <link rel="canonical" href="%sfinance.html">'%BASE)
    open(p,"w").write(s)

# sitemap + robots
urls="".join(f"  <url><loc>{BASE}{p}</loc><lastmod>2026-11-19</lastmod></url>\n" for p in pages.values())
open("docs/sitemap.xml","w").write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+urls+'</urlset>\n')
open("docs/robots.txt","w").write(f"User-agent: *\nAllow: /\n\nSitemap: {BASE}sitemap.xml\n")
