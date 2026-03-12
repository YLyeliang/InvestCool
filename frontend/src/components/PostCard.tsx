import React from "react";
import ReactMarkdown from "react-markdown";
import { formatDistanceToNow } from "date-fns";
import type { Post } from "../types";
import MarketChart from "./MarketChart";

interface PostCardProps {
  post: Post;
}

const PostCard: React.FC<PostCardProps> = ({ post }) => {
  return (
    <article className="post-card">
      <div className="post-meta">
        <span className="post-category">{post.category.replace("_", " ").toUpperCase()}</span>
        <span className="post-date">
          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
        </span>
      </div>
      <h2 className="post-title">{post.title}</h2>
      <div className="post-content">
        <ReactMarkdown>{post.content}</ReactMarkdown>
      </div>
      {post.symbol && (
        <div className="chart-container">
          <div style={{ marginBottom: '10px', fontSize: '0.9rem', color: '#8b949e' }}>
            Live Ticker: {post.symbol}
          </div>
          <MarketChart symbol={post.symbol} height={300} />
        </div>
      )}
    </article>
  );
};

export default PostCard;
