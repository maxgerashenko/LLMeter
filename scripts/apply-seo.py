#!/usr/bin/env python3
# Writes the SEO head tags, sitemap.xml and robots.txt for docs/. Run from the repo root: python3 scripts/apply-seo.py
# Safe to re-run. Change DEFAULT_BASE, or add docs/CNAME, to move the site to another domain.
import re,sys,html
import os
# Single place for the site's base URL. A docs/CNAME file (custom domain) overrides the github.io default.
DEFAULT_BASE="https://maxgerashenko.github.io/LLMeter/"
BASE=("https://"+open("docs/CNAME").read().strip()+"/") if os.path.exists("docs/CNAME") else DEFAULT_BASE
pages={"index.html":"","cloud.html":"cloud.html","cloud-rack.html":"cloud-rack.html","rack.html":"rack.html","runs.html":"runs.html","research.html":"research.html","techniques.html":"techniques.html","horizon.html":"horizon.html","jobs.html":"jobs.html","finance.html":"finance.html","economy.html":"economy.html","sources.html":"sources.html"}
h1={"index.html":"Best local AI model per tier for long coding tasks","cloud.html":"AI models ranked by Intelligence Index","cloud-rack.html":"AI scaling: cloud racks, agents served and price","rack.html":"Local AI speed on Mac and DGX Spark racks","runs.html":"Local model runs on the LLMeter coding suite","research.html":"Local AI build choices ranked by measured effect","techniques.html":"LLM techniques ranked by measured effect on speed and quality","jobs.html":"Trillion-dollar companies ranked by jobs per dollar of market value","finance.html":"AI finance: Anthropic S-1 compute spend and commitments","economy.html":"AI economy: impact on GDP and software"}
titles={
 "index.html":"LLMeter: best local AI model per tier for long coding tasks",
 "rack.html":"LLMeter: local AI speed in tokens per second on Mac and DGX Spark",
 "runs.html":"LLMeter: local LLM benchmark results on a MacBook Pro M5 Pro 64 GB",
 "research.html":"LLMeter: quantization, thinking and runtime, local LLM build choices ranked",
 "techniques.html":"LLMeter: LLM techniques ranked by effect on speed and quality",
 "jobs.html":"LLMeter: trillion-dollar companies, jobs per dollar of value and margins",
 "cloud.html":"LLMeter: AI model ranking by Intelligence Index, cloud and local",
 "cloud-rack.html":"LLMeter: AI scaling in datacenter racks, agents served and price",
 "horizon.html":"LLMeter Horizon: AI growth in expert work time, METR time horizons",
 "finance.html":"LLMeter: AI finance, Anthropic S-1 compute spend and commitments",
 "economy.html":"LLMeter: AI economy, impact on GDP and software"}
descs={
 "index.html":"Local AI for coding: open-weights models grouped into intelligence tiers on long coding tasks, measured against Claude Sonnet 5.5, with the best local model in each tier and its size on disk.",
 "rack.html":"Local AI speed: generation in tokens per second of each tier's best local model on Mac Studio M5 Ultra, M5 Max, MacBook Pro M5 Pro, Mac Studio M1 Ultra and NVIDIA DGX Spark, against Claude Sonnet 5.5 in the cloud.",
 "research.html":"Local AI build choices ranked by measured effect: bits (4-bit or 8-bit quantization), QAT, dense or mixture of experts, model size, thinking, speculative decoding, prompt caching, harness and runtime, each with its source.",
 "techniques.html":"What makes LLMs faster and better, ranked by measured effect: speculative decoding, quantization, text diffusion, attention and caching for speed; reasoning training, agent harness, chain of thought and distillation for quality, each with its source.",
 "jobs.html":"The US companies worth over $1 trillion ranked by employees per $1 billion of market value, with revenue, profit margin and profit per employee, including Anthropic after its IPO, against Ford, GM and JPMorgan, and an estimate of what paying profit out as wages would change.",
 "cloud-rack.html":"AI scaling in the datacenter: racks and 8-GPU servers compared by memory, bandwidth, how many coding agents they can serve, tokens per second and price.",
 "horizon.html":"AI growth in expert work time: how long frontier models can work on their own, and how their success rate falls from 50% to 100% reliability as tasks get longer. METR time horizons.",
 "finance.html":"AI finance from public filings: Anthropic's S-1 of 2026-10-26 (revenue growth, compute spending and commitments).",
 "economy.html":"AI economy: what AI replacing office work would mean for US GDP, and the cost of running coding agents on GB300 racks."}
for k,v in descs.items(): pass
for f,path in pages.items():
    p="docs/"+f; s=open(p).read()
    s=re.sub(r"  <!-- seo:start -->.*?<!-- seo:end -->\n(  <script src=\"assets/analytics.js\" defer></script>\n)?","",s,flags=re.S)
    if f in titles: s=re.sub(r"<title>.*?</title>","<title>%s</title>"%titles[f],s,count=1)
    title=html.unescape(re.search(r"<title>(.*?)</title>",s).group(1))
    if f in descs: s=re.sub(r'<meta name="description" content=".*?">','<meta name="description" content="%s">'%html.escape(descs[f]),s,count=1)
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
