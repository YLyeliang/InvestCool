import os

class NewsConfig:
    # 搜索策略配置
    SEARCH_STRATEGY = {
        "depth": "deep", # deep (深入抓取正文), quick (仅标题)
        "time_range": "24h",
        "region": "global"
    }
    
    # 监控目标
    MONITORING = {
        "companies": ["NVIDIA", "Apple", "Microsoft", "Tesla", "Google", "Meta", "TSMC"],
        "indices": ["Nasdaq 100", "NDX", "SOX"],
        "keywords": ["加息", "降息", "AI 芯片", "大模型", "财报", "半导体", "宏观经济"]
    }
    
    # 路径配置
    PATHS = {
        "content_root": os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../frontend/content/daily")),
        "log_root": os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../backend.log"))
    }

    @classmethod
    def get_search_query(cls):
        """生成用于新闻研究流水线的动态指令"""
        targets = cls.MONITORING["companies"] + cls.MONITORING["indices"]
        return f"Latest high-impact tech and finance news about {', '.join(targets[:5])} and {cls.MONITORING['keywords'][0]} for today."
