import sqlite3
import os
from datetime import datetime

# 配置路径
DB_PATH = 'backend/app/investcool.db'
EXPORT_DIR = 'frontend/content/analysis_export'

def export_to_markdown():
    if not os.path.exists(EXPORT_DIR):
        os.makedirs(EXPORT_DIR)
        print(f"创建目录: {EXPORT_DIR}")

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 查询所有未粉碎的文章
        cursor.execute("SELECT id, title, summary, content, category, cover, content_type, is_deleted, created_at FROM analysis")
        rows = cursor.fetchall()

        for row in rows:
            aid, title, summary, content, category, cover, c_type, is_deleted, created_at = row
            
            # 处理文件名：清理特殊字符，增加前缀
            clean_title = "".join([c for c in title if c.isalnum() or c.isspace()]).strip().replace(" ", "_")
            status_prefix = "[DELETED]_" if is_deleted else ""
            filename = f"{aid}_{status_prefix}{clean_title}.md"
            filepath = os.path.join(EXPORT_DIR, filename)

            # 构建 Markdown 内容（包含 YAML Frontmatter）
            md_content = f"""---
title: '{title}'
description: '{summary}'
category: '{category}'
cover: '{cover}'
content_type: '{c_type}'
created_at: '{created_at}'
is_deleted: {bool(is_deleted)}
db_id: {aid}
---

{content}
"""
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(md_content)
            
            print(f"成功导出: {filename}")

        conn.close()
        print(f"\n✨ 导出完成！共计 {len(rows)} 篇文章。")
        print(f"文件位置: {os.path.abspath(EXPORT_DIR)}")

    except Exception as e:
        print(f"导出出错: {e}")

if __name__ == "__main__":
    export_to_markdown()
