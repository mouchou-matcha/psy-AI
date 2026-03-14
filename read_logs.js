import Database from 'better-sqlite3';
const db = new Database('psychologist.db');
const logs = db.prepare('SELECT * FROM client_logs ORDER BY id DESC LIMIT 5').all();
console.log(JSON.stringify(logs, null, 2));
