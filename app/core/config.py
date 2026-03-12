from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "InvestCool"
    DATABASE_URL: str = "sqlite:///./investcool.db"
    API_V1_STR: str = "/api/v1"
    
    # Cache duration in seconds (5 minutes)
    MARKET_DATA_CACHE_SECONDS: int = 300

    class Config:
        case_sensitive = True

settings = Settings()
