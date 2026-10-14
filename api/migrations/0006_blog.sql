INSERT OR IGNORE INTO roles(name,description) VALUES('User','Write own stories'),('Moderator','Moderate public stories and replies'),('Admin','Moderate and manage the local instance');
CREATE TABLE blog_profiles(user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, bio TEXT NOT NULL DEFAULT '', avatar_url TEXT NOT NULL DEFAULT '');
CREATE TABLE blog_posts(id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, title TEXT NOT NULL, content TEXT NOT NULL, tag TEXT NOT NULL DEFAULT 'General', status TEXT NOT NULL CHECK(status IN ('draft','published')), revision INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
CREATE INDEX blog_posts_feed ON blog_posts(status,id DESC);
CREATE INDEX blog_posts_author ON blog_posts(user_id,id DESC);
CREATE INDEX blog_posts_tag ON blog_posts(tag,status,id DESC);
CREATE TABLE blog_comments(id INTEGER PRIMARY KEY AUTOINCREMENT, post_id INTEGER NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, content TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')));
CREATE INDEX blog_comments_post ON blog_comments(post_id,id);
CREATE TABLE blog_likes(post_id INTEGER NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,PRIMARY KEY(post_id,user_id));
