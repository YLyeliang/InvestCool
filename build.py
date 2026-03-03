#!/usr/bin/env python3
"""Static site generator for InvestCool.

Reads Markdown posts from content/, renders them through Jinja2 templates,
and outputs a fully static site into docs/ for GitHub Pages deployment.
"""

import os
import shutil
from datetime import datetime
from math import ceil

import frontmatter
import markdown
from jinja2 import Environment, FileSystemLoader
from datetime import date as date_type
from utils.stock_predict import fetch_market_data, analyze_market

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
CONTENT_DIR = os.path.join(BASE_DIR, "content")
TEMPLATE_DIR = os.path.join(BASE_DIR, "templates")
STATIC_DIR = os.path.join(BASE_DIR, "static")
OUTPUT_DIR = os.path.join(BASE_DIR, "docs")

SITE_CONFIG = {
    "SITE_NAME": "InvestCool",
    "SITE_DESCRIPTION": "AI 驱动的纳斯达克投资洞察",
    "POSTS_PER_PAGE": 10,
}


def parse_post(filepath):
    post = frontmatter.load(filepath)
    md = markdown.Markdown(extensions=["fenced_code", "codehilite", "tables", "toc"])
    html_content = md.convert(post.content)

    slug = os.path.splitext(os.path.basename(filepath))[0]
    date_raw = post.metadata.get("date", "2025-01-01")
    if isinstance(date_raw, datetime):
        date = date_raw
    elif isinstance(date_raw, date_type):
        date = datetime(date_raw.year, date_raw.month, date_raw.day)
    elif isinstance(date_raw, str):
        date = datetime.strptime(date_raw, "%Y-%m-%d")
    else:
        date = datetime(2025, 1, 1)

    return {
        "slug": slug,
        "title": post.metadata.get("title", slug),
        "date": date,
        "date_str": date.strftime("%Y-%m-%d"),
        "summary": post.metadata.get("summary", ""),
        "tags": post.metadata.get("tags", []),
        "content": html_content,
    }


def load_all_posts():
    posts = []
    if not os.path.isdir(CONTENT_DIR):
        return posts
    for filename in os.listdir(CONTENT_DIR):
        if filename.endswith(".md"):
            filepath = os.path.join(CONTENT_DIR, filename)
            try:
                posts.append(parse_post(filepath))
            except Exception as e:
                print(f"Warning: Failed to parse {filename}: {e}")
    posts.sort(key=lambda p: p["date"], reverse=True)
    return posts


def build():
    if os.path.exists(OUTPUT_DIR):
        shutil.rmtree(OUTPUT_DIR)
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    if os.path.isdir(STATIC_DIR):
        shutil.copytree(STATIC_DIR, os.path.join(OUTPUT_DIR, "static"))

    env = Environment(loader=FileSystemLoader(TEMPLATE_DIR), autoescape=True)
    env.globals["config"] = SITE_CONFIG

    # 运行盘前危机监控分析
    print("Fetching market analysis...")
    market_data = fetch_market_data()
    market_analysis = analyze_market(market_data)
    if market_analysis:
        print(f"Market status: {market_analysis['status_text']}")
    else:
        print("Warning: Market analysis failed.")

    posts = load_all_posts()
    per_page = SITE_CONFIG["POSTS_PER_PAGE"]
    total_pages = max(1, ceil(len(posts) / per_page))

    for page_num in range(1, total_pages + 1):
        start = (page_num - 1) * per_page
        end = start + per_page
        paginated = posts[start:end]

        tpl = env.get_template("index.html")
        html = tpl.render(
            posts=paginated,
            page=page_num,
            has_prev=page_num > 1,
            has_next=end < len(posts),
            market_analysis=market_analysis
        )

        if page_num == 1:
            with open(os.path.join(OUTPUT_DIR, "index.html"), "w", encoding="utf-8") as f:
                f.write(html)
        page_dir = os.path.join(OUTPUT_DIR, "page", str(page_num))
        os.makedirs(page_dir, exist_ok=True)
        with open(os.path.join(page_dir, "index.html"), "w", encoding="utf-8") as f:
            f.write(html)

    post_base = os.path.join(OUTPUT_DIR, "post")
    os.makedirs(post_base, exist_ok=True)
    tpl = env.get_template("post.html")
    for post in posts:
        post_dir = os.path.join(post_base, post["slug"])
        os.makedirs(post_dir, exist_ok=True)
        html = tpl.render(post=post)
        with open(os.path.join(post_dir, "index.html"), "w", encoding="utf-8") as f:
            f.write(html)

    tpl = env.get_template("about.html")
    about_dir = os.path.join(OUTPUT_DIR, "about")
    os.makedirs(about_dir, exist_ok=True)
    with open(os.path.join(about_dir, "index.html"), "w", encoding="utf-8") as f:
        f.write(tpl.render())

    tpl = env.get_template("404.html")
    with open(os.path.join(OUTPUT_DIR, "404.html"), "w", encoding="utf-8") as f:
        f.write(tpl.render())

    cname_path = os.path.join(BASE_DIR, "CNAME")
    if os.path.isfile(cname_path):
        shutil.copy2(cname_path, os.path.join(OUTPUT_DIR, "CNAME"))

    print(f"Built {len(posts)} posts, {total_pages} index pages -> {OUTPUT_DIR}")


if __name__ == "__main__":
    build()
