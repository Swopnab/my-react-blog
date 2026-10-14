import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync, mkdirSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';

// Adapt Node SQLite to the prepared-statement interface used in the original JWT repo.
export class BlogDatabase {
    constructor(filename = ':memory:') {
        if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true });
        this.sqlite = new DatabaseSync(filename);
        if (filename !== ':memory:' && process.platform !== 'win32') chmodSync(filename, 0o600);
        this.sqlite.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
        this.sqlite.exec('CREATE TABLE IF NOT EXISTS schema_migrations(name TEXT PRIMARY KEY)');
        for (const name of readdirSync(new URL('./migrations/', import.meta.url)).filter(n=>n.endsWith('.sql')).sort()) {
            if (this.sqlite.prepare('SELECT name FROM schema_migrations WHERE name=?').get(name)) continue;
            this.sqlite.exec('BEGIN IMMEDIATE');
            try {
                this.sqlite.exec(readFileSync(new URL('./migrations/'+name, import.meta.url),'utf8'));
                this.sqlite.prepare('INSERT INTO schema_migrations(name) VALUES(?)').run(name);
                this.sqlite.exec('COMMIT');
            } catch(error) { this.sqlite.exec('ROLLBACK'); throw error; }
        }
    }
    prepare(sql) {
        const statement=this.sqlite.prepare(sql);let values=[];
        const query={
            bind(...args){values=args;return query;},
            async first(){return statement.get(...values)||null;},
            async all(){return {results:statement.all(...values)};},
            async run(){const r=statement.run(...values);return {success:true,meta:{changes:Number(r.changes),last_row_id:Number(r.lastInsertRowid)}};}
        };return query;
    }
    close(){this.sqlite.close();}
}
