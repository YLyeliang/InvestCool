import logging

class NewsProcessor:
    def __init__(self, config):
        self.config = config
        self.monitoring = config.get('monitoring', {})
        self.companies = self.monitoring.get('companies', [])
        self.keywords = self.monitoring.get('keywords', [])

    def process(self, raw_news):
        processed = []
        seen_titles = set()

        for item in raw_news:
            title = item['title']
            if title in seen_titles:
                continue
            
            # Match companies or keywords
            matched_companies = [c for c in self.companies if c.lower() in title.lower()]
            matched_keywords = [k for c in [self.keywords] for k in c if k.lower() in title.lower()]
            
            relevance_score = len(matched_companies) * 2 + len(matched_keywords)
            
            if relevance_score > 0:
                item['matched_companies'] = matched_companies
                item['matched_keywords'] = matched_keywords
                item['relevance_score'] = relevance_score
                processed.append(item)
                seen_titles.add(title)

        # Sort by relevance
        processed.sort(key=lambda x: x['relevance_score'], reverse=True)
        return processed[:15] # Keep top 15 relevant items
