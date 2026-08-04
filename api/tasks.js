import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
});

let schemaReady;
function ensureSchema() {
  if (!schemaReady) {
    schemaReady = pool.query(`
      CREATE TABLE IF NOT EXISTS todo_tasks (
        id BIGSERIAL PRIMARY KEY,
        title TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
        done BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `).catch((error) => { schemaReady = null; throw error; });
  }
  return schemaReady;
}

function sendError(res, error) {
  console.error(error);
  return res.status(500).json({ error: '데이터베이스와 통신하지 못했어요.' });
}

export default async function handler(req, res) {
  if (!process.env.DATABASE_URL) return res.status(500).json({ error: 'DATABASE_URL이 설정되지 않았어요.' });
  try {
    await ensureSchema();
    if (req.method === 'GET') {
      const { rows } = await pool.query('SELECT id, title, done, created_at AS created FROM todo_tasks ORDER BY done ASC, created_at DESC');
      return res.status(200).json(rows);
    }
    if (req.method === 'POST') {
      const title = String(req.body?.title || '').trim();
      if (!title) return res.status(400).json({ error: '할 일을 입력해주세요.' });
      const { rows } = await pool.query('INSERT INTO todo_tasks (title) VALUES ($1) RETURNING id, title, done, created_at AS created', [title]);
      return res.status(201).json(rows[0]);
    }
    if (req.method === 'PATCH') {
      const id = Number(req.body?.id);
      if (!Number.isInteger(id)) return res.status(400).json({ error: '잘못된 할 일입니다.' });
      const fields = [];
      const values = [];
      if (typeof req.body.title === 'string' && req.body.title.trim()) { values.push(req.body.title.trim()); fields.push(`title = $${values.length}`); }
      if (typeof req.body.done === 'boolean') { values.push(req.body.done); fields.push(`done = $${values.length}`); }
      if (!fields.length) return res.status(400).json({ error: '변경할 내용이 없습니다.' });
      values.push(id);
      const { rows } = await pool.query(`UPDATE todo_tasks SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING id, title, done, created_at AS created`, values);
      return rows[0] ? res.status(200).json(rows[0]) : res.status(404).json({ error: '할 일을 찾을 수 없습니다.' });
    }
    if (req.method === 'DELETE') {
      if (req.query.clear === 'done') await pool.query('DELETE FROM todo_tasks WHERE done = TRUE');
      else {
        const id = Number(req.query.id);
        if (!Number.isInteger(id)) return res.status(400).json({ error: '잘못된 할 일입니다.' });
        await pool.query('DELETE FROM todo_tasks WHERE id = $1', [id]);
      }
      return res.status(204).end();
    }
    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return res.status(405).json({ error: '지원하지 않는 요청입니다.' });
  } catch (error) {
    return sendError(res, error);
  }
}
