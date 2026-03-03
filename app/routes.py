from flask import Blueprint, render_template, abort, request, current_app
from app.posts import get_all_posts, get_post_by_slug
from utils.stock_predict import fetch_market_data, analyze_market

main_bp = Blueprint("main", __name__)


@main_bp.route("/")
def index():
    posts = get_all_posts()
    page = request.args.get("page", 1, type=int)
    per_page = current_app.config["POSTS_PER_PAGE"]
    total = len(posts)
    start = (page - 1) * per_page
    end = start + per_page
    paginated = posts[start:end]
    has_prev = page > 1
    has_next = end < total

    # 运行盘前危机监控分析
    market_data = fetch_market_data()
    market_analysis = analyze_market(market_data)

    return render_template(
        "index.html",
        posts=paginated,
        page=page,
        has_prev=has_prev,
        has_next=has_next,
        market_analysis=market_analysis
    )


@main_bp.route("/post/<slug>")
def post_detail(slug):
    post = get_post_by_slug(slug)
    if post is None:
        abort(404)
    return render_template("post.html", post=post)


@main_bp.route("/about")
def about():
    return render_template("about.html")


@main_bp.errorhandler(404)
def page_not_found(e):
    return render_template("404.html"), 404
