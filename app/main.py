from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import market, posts
from app.core.db import init_db
from app.core.config import settings

app = FastAPI(title=settings.PROJECT_NAME)

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

# Include routers
app.include_router(market.router, prefix=f"{settings.API_V1_STR}/market", tags=["market"])
app.include_router(posts.router, prefix=f"{settings.API_V1_STR}/posts", tags=["posts"])

@app.get("/")
def read_root():
    return {"message": "Welcome to InvestCool API"}
