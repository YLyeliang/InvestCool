import os
from datetime import datetime, date as date_type

import frontmatter
import markdown
from flask import current_app


def _parse_post(filepath):
    """Parse a single markdown file into a post dict."""
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


def get_all_posts():
    """Load all markdown posts from the content directory, sorted by date desc."""
    content_dir = current_app.config["CONTENT_DIR"]
    posts = []
    if not os.path.isdir(content_dir):
        return posts
    for filename in os.listdir(content_dir):
        if filename.endswith(".md"):
            filepath = os.path.join(content_dir, filename)
            try:
                posts.append(_parse_post(filepath))
            except Exception as e:
                current_app.logger.warning(f"Failed to parse {filename}: {e}")
    posts.sort(key=lambda p: p["date"], reverse=True)
    return posts


def get_post_by_slug(slug):
    """Load a single post by its slug (filename without .md)."""
    content_dir = current_app.config["CONTENT_DIR"]
    filepath = os.path.join(content_dir, f"{slug}.md")
    if not os.path.isfile(filepath):
        return None
    return _parse_post(filepath)
