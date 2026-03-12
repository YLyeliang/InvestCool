from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, desc
from app.core.db import get_session
from app.models.post import Post, PostCategory

router = APIRouter()

@router.get("/", response_model=List[Post])
def list_posts(
    category: Optional[PostCategory] = None,
    offset: int = 0,
    limit: int = Query(default=20, lte=100),
    session: Session = Depends(get_session)
):
    statement = select(Post).order_by(desc(Post.created_at)).offset(offset).limit(limit)
    if category:
        statement = statement.where(Post.category == category)
    posts = session.exec(statement).all()
    return posts

@router.post("/", response_model=Post)
def create_post(post: Post, session: Session = Depends(get_session)):
    session.add(post)
    session.commit()
    session.refresh(post)
    return post

@router.get("/{post_id}", response_model=Post)
def get_post(post_id: int, session: Session = Depends(get_session)):
    post = session.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post
