// Local operator command. No web endpoint can promote a reader to moderator/admin.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { BlogDatabase } from './database.js';
const [email,role]=process.argv.slice(2);
if(!email||!['User','Moderator','Admin'].includes(role)){console.error('Usage: npm run role -- email@example.com User|Moderator|Admin');process.exit(1);}
const file=process.env.BLOG_DATABASE_PATH||fileURLToPath(new URL('../.data/swopblog.sqlite',import.meta.url));
if(!existsSync(file)){console.error('Start the app and create an account first.');process.exit(1);}
const db=new BlogDatabase(file);
try{const user=db.sqlite.prepare('SELECT id FROM users WHERE email=?').get(email.trim().toLowerCase());if(!user)throw new Error('Account not found');db.sqlite.exec('BEGIN IMMEDIATE');db.sqlite.prepare('DELETE FROM user_roles WHERE user_id=?').run(user.id);db.sqlite.prepare('INSERT INTO user_roles(user_id,role_id) SELECT ?,id FROM roles WHERE name=?').run(user.id,role);db.sqlite.exec('COMMIT');console.log('Role updated. Current permissions are checked on every protected request.');}finally{db.close();}
