import os
import sys
import logging

# Ensure the app directory is in the path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(current_dir, 'backend/app'))

from backend.app.services.news_intelligence.config import NewsConfig
from backend.app.services.news_intelligence.service import NewsIntelligenceService

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def run():
    print("Initializing InvestCool News Intelligence Service...")
    
    # 1. Setup Service
    service = NewsIntelligenceService(NewsConfig)
    
    # 2. Get Workflow Task (This defines what the Agent should do)
    task = service.run_daily_workflow()
    
    print(f"Task Definition: {task['instruction']}")
    print("\n--- AGENT EXECUTION START ---")
    
    # Note: In this interactive session, the operator can fulfill the
    # instruction provided by the task definition. In production this remains
    # a lightweight task descriptor, not a model-specific runtime dependency.
    
    return task

if __name__ == "__main__":
    run()
