import requests
from bs4 import BeautifulSoup
import logging

class NewsFetcher:
    def __init__(self, config):
        self.config = config
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }

    def fetch_all(self):
        all_news = []
        for category, sources in self.config.get('sources', {}).items():
            for source in sources:
                logging.info(f"Fetching {category} news from {source['name']}")
                news_items = self._fetch_source(source, category)
                all_news.extend(news_items)
        return all_news

    def _fetch_source(self, source, category):
        try:
            response = requests.get(source['url'], headers=self.headers, timeout=15)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Simple generic extraction logic - can be specialized per source name
            items = []
            if "36Kr" in source['name']:
                links = soup.select('a.article-item-title')[:10]
                for link in links:
                    items.append({
                        'title': link.get_text(strip=True),
                        'url': "https://36kr.com" + link.get('href'),
                        'source': source['name'],
                        'category': category
                    })
            elif "IT Home" in source['name']:
                links = soup.select('.newslist a')[:10]
                for link in links:
                    title = link.get('title') or link.get_text(strip=True)
                    if title:
                        items.append({
                            'title': title,
                            'url': link.get('href'),
                            'source': source['name'],
                            'category': category
                        })
            else:
                # Generic fallback: look for h2/h3 links
                for tag in soup.find_all(['h2', 'h3'])[:5]:
                    link = tag.find('a')
                    if link and link.get('href'):
                        items.append({
                            'title': tag.get_text(strip=True),
                            'url': link.get('href'),
                            'source': source['name'],
                            'category': category
                        })
            
            return items
        except Exception as e:
            logging.error(f"Error fetching {source['name']}: {e}")
            return []
