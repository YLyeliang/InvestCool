from datetime import datetime

class NewsSummarizer:
    def __init__(self, config):
        self.config = config

    def summarize(self, processed_news, ai_callback=None):
        """
        Generates a markdown summary.
        If ai_callback is provided, it uses it to generate deeper insights.
        """
        date_str = datetime.now().strftime('%Y-%m-%d')
        
        # Header
        md = f"---\ntitle: '每日科技与财经简报 - {date_str}'\ndescription: '自动捕获全球最新科技动态与财经热点，为您提炼投资核心价值。'\ncategory: '每日信息'\ndate: '{date_str}'\n---\n\n"
        md += f"# InvestCool 每日简报 ({date_str})\n\n"
        md += "> 本简报由 InvestCool NewsEngine 自动采集并经研究规则提炼，聚焦纳斯达克及 AI 产业动态。\n\n"

        if not processed_news:
            md += "今日暂无高匹配度的重大新闻。"
            return md

        # Grouping and listing
        md += "## 🚀 核心动态\n\n"
        for item in processed_news:
            companies_tag = f"[{', '.join(item['matched_companies'])}]" if item['matched_companies'] else ""
            md += f"- **{item['title']}** {companies_tag}\n"
            md += f"  - 来源: {item['source']} | [原文链接]({item['url']})\n"

        # Research insights placeholder
        md += "\n## 产业深度洞察\n\n"
        if ai_callback:
            md += ai_callback(processed_news)
        else:
            md += "*(研究模块正在计算中，请稍后查阅完整版报告...)*\n"
            md += "\n### 市场情绪预判\n"
            md += "- 关注纳斯达克 100 相关科技龙头的盘前动向。\n"
            md += "- 当前关键词热度：**" + ", ".join(set([k for item in processed_news for k in item['matched_keywords']])) + "**\n"

        return md
