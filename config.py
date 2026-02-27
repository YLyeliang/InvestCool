import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "invest-cool-dev-key")
    CONTENT_DIR = os.path.join(BASE_DIR, "content")
    SITE_NAME = "InvestCool"
    SITE_DESCRIPTION = "AI 驱动的纳斯达克投资洞察"
    POSTS_PER_PAGE = 10
