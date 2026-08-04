import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Check, Circle, MoreHorizontal, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react';
import './styles.css';

function Header() {
  const today = new Date();
  return <>
    <nav className="top-nav">
      <div className="brand"><span className="brand-mark"><Check size={18} strokeWidth={3.2} /></span><span>할 일</span></div>
      <button className="more-button" aria-label="더 보기"><MoreHorizontal size={22} /></button>
    </nav>
    <header className="hero">
      <div>
        <p className="date-label">{today.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}</p>
        <h1>오늘도 차근차근,<br /><em>하나씩.</em></h1>
      </div>
      <div className="hero-badge"><span>{today.toLocaleDateString('ko-KR', { weekday: 'short' })}</span><strong>{today.getDate()}</strong></div>
    </header>
  </>;
}

function AddTask({ onAdd }) {
  const [value, setValue] = useState('');
  const submit = (e) => {
    e.preventDefault();
    if (!value.trim()) return;
    onAdd(value.trim());
    setValue('');
  };
  return <form className="composer" onSubmit={submit}>
    <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="할 일을 추가해보세요" aria-label="새로운 할 일" />
    <button className="add-button" type="submit" aria-label="할 일 추가"><Plus size={22} strokeWidth={2.7} /></button>
  </form>;
}

function TaskRow({ task, onToggle, onEdit, onDelete }) {
  return <article className={`task-row ${task.done ? 'done' : ''}`}>
    <button className="check-button" onClick={() => onToggle(task.id)} aria-label={task.done ? '완료 취소' : '완료 처리'}>
      {task.done ? <Check size={17} strokeWidth={3} /> : <Circle size={24} strokeWidth={1.7} />}
    </button>
    <div className="task-copy"><span className="task-title">{task.title}</span><span className="task-time">오늘 추가됨</span></div>
    <div className="actions">
      <button onClick={() => onEdit(task)} aria-label="수정"><Pencil size={15} /></button>
      <button className="delete" onClick={() => onDelete(task.id)} aria-label="삭제"><Trash2 size={15} /></button>
    </div>
  </article>;
}

function App() {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const request = async (url, options) => {
    const response = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
    if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || '잠시 후 다시 시도해주세요.');
    return response.status === 204 ? null : response.json();
  };
  useEffect(() => {
    request('/api/tasks').then(setTasks).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, []);
  const shown = useMemo(() => tasks.filter((task) => filter === 'all' || (filter === 'done' ? task.done : !task.done)), [tasks, filter]);
  const done = tasks.filter((task) => task.done).length;
  const active = tasks.length - done;
  const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const addTask = async (title) => { try { const task = await request('/api/tasks', { method: 'POST', body: JSON.stringify({ title }) }); setTasks((prev) => [task, ...prev]); } catch (err) { setError(err.message); } };
  const toggleTask = async (id) => { const task = tasks.find((item) => item.id === id); try { const updated = await request('/api/tasks', { method: 'PATCH', body: JSON.stringify({ id, done: !task.done }) }); setTasks((prev) => prev.map((item) => item.id === id ? updated : item)); } catch (err) { setError(err.message); } };
  const editTask = async (task) => { const next = window.prompt('할 일 수정하기', task.title); if (!next?.trim()) return; try { const updated = await request('/api/tasks', { method: 'PATCH', body: JSON.stringify({ id: task.id, title: next.trim() }) }); setTasks((prev) => prev.map((item) => item.id === task.id ? updated : item)); } catch (err) { setError(err.message); } };
  const deleteTask = async (id) => { try { await request(`/api/tasks?id=${id}`, { method: 'DELETE' }); setTasks((prev) => prev.filter((item) => item.id !== id)); } catch (err) { setError(err.message); } };
  const clearDone = async () => { try { await request('/api/tasks?clear=done', { method: 'DELETE' }); setTasks((prev) => prev.filter((item) => !item.done)); } catch (err) { setError(err.message); } };
  return <main className="app-shell">
    <Header />
    <section className="progress-card">
      <div className="progress-copy"><span className="progress-icon"><Sparkles size={17} fill="currentColor" /></span><div><p>오늘의 진행률</p><strong>{progress}%</strong></div></div>
      <div className="progress-track"><i style={{ width: `${progress}%` }} /></div>
      <span className="progress-caption">{active ? `남은 할 일 ${active}개` : '모든 일을 완료했어요'}</span>
    </section>
    <section className="todo-card">
      <div className="card-heading"><div><h2>할 일 목록</h2><p>해야 할 일을 하나씩 정리해보세요.</p></div><span className="count-pill">{tasks.length}개</span></div>
      <AddTask onAdd={addTask} />
      <div className="toolbar">
        <div className="filters" role="group" aria-label="할 일 필터">
          {[['all', '전체'], ['active', '진행 중'], ['done', '완료']].map(([key, label]) => <button key={key} className={filter === key ? 'active' : ''} onClick={() => setFilter(key)}>{label}</button>)}
        </div>
        <button className="clear-button" onClick={clearDone}>완료 삭제</button>
      </div>
      <div className="task-list">
        {loading ? <div className="empty"><div className="empty-icon loading-dot"><Circle size={20} /></div><p>할 일을 불러오고 있어요.</p></div> : error ? <div className="empty"><div className="empty-icon"><Sparkles size={22} /></div><p>{error}</p></div> : shown.length ? shown.map((task) => <TaskRow key={task.id} task={task} onToggle={toggleTask} onEdit={editTask} onDelete={deleteTask} />) : <div className="empty"><div className="empty-icon"><Check size={25} /></div><p>{filter === 'done' ? '아직 완료한 일이 없어요.' : filter === 'active' ? '모든 일이 끝났어요. 잘했어요!' : '첫 번째 할 일을 추가해보세요.'}</p></div>}
      </div>
    </section>
    <p className="tip">작은 성공이 모여 큰 변화를 만들어요.</p>
  </main>;
}

createRoot(document.getElementById('root')).render(<App />);
