import os
import sys
import logging
from ruamel.yaml import YAML

# Add current directory to path to allow relative imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.fetcher import NewsFetcher
from core.processor import NewsProcessor
from core.summarizer import NewsSummarizer
from storage.writer import NewsWriter

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def main():
    # 1. Load Config
    yaml = YAML()
    config_path = os.path.join(os.path.dirname(__file__), 'config', 'settings.yaml')
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
    with open(config_path, 'r', encoding='utf-8') as f:
        config = yaml.load(f)

    logging.info("Starting InvestCool NewsEngine...")

    # 2. Initialization
    fetcher = NewsFetcher(config)
    processor = NewsProcessor(config)
    summarizer = NewsSummarizer(config)
    writer = NewsWriter(config, project_root)

    # 3. Pipeline Execution
    raw_news = fetcher.fetch_all()
    logging.info(f"Fetched {len(raw_news)} raw news items.")

    processed_news = processor.process(raw_news)
    logging.info(f"Filtered to {len(processed_news)} relevant items.")

    # In a real automated cron, you would call an AI API here.
    # For now, we generate the structured template.
    report_content = summarizer.summarize(processed_news)

    # 4. Save Output
    saved_path = writer.save(report_content)
    
    if saved_path:
        print(f"✅ Success! Today's report generated at: {saved_path}")
    else:
        print("❌ Failed to generate report.")

if __name__ == "__main__":
    main()
