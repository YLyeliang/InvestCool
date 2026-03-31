import os
from datetime import datetime

class Publisher:
    def __init__(self, config):
        self.config = config

    def publish_to_content(self, title, description, content, cover=None):
        date_str = datetime.now().strftime('%Y-%m-%d')
        filename = f"{date_str}.md"
        target_path = os.path.join(self.config.PATHS["content_root"], filename)
        
        # 构建标准 Frontmatter
        frontmatter = [
            "---",
            f"title: '{title}'",
            f"description: '{description}'",
            "category: '每日信息'",
            f"date: '{date_str}'",
            f"cover: '{cover or 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=1000'}'",
            "---",
            ""
        ]
        
        full_content = "\n".join(frontmatter) + content
        
        with open(target_path, 'w', encoding='utf-8') as f:
            f.write(full_content)
        
        return target_path

class NewsIntelligenceService:
    """高层服务入口，协调各层工作"""
    def __init__(self, config):
        self.config = config
        from .core.agent_bridge import NewsFetcher, NewsProcessor, AgentBridge
        self.fetcher = NewsFetcher(config)
        self.processor = NewsProcessor(config)
        self.agent = AgentBridge(self.fetcher, self.processor)
        self.publisher = Publisher(config)

    def run_daily_workflow(self):
        # 1. 准备搜集指令
        task = self.agent.execute_intelligence_task()
        return task # 返回给 Agent 执行
