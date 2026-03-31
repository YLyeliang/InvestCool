import os
import logging
from datetime import datetime

class NewsWriter:
    def __init__(self, config, project_root):
        self.config = config
        self.output_dir = os.path.join(project_root, config['output']['content_dir'])

    def save(self, content):
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)
            logging.info(f"Created directory {self.output_dir}")

        filename = f"{datetime.now().strftime('%Y-%m-%d')}.md"
        file_path = os.path.join(self.output_dir, filename)

        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            logging.info(f"Successfully saved news report to {file_path}")
            return file_path
        except Exception as e:
            logging.error(f"Error saving file: {e}")
            return None
