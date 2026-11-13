import { useEffect, useState } from 'react'; import { useSearchParams } from 'react-router-dom'; import axios from 'axios';
import PostCard from '../components/PostCard'; import { Helmet } from 'react-helmet-async';
export default function Articles() {
  const [sp, setSp] = useSearchParams(); const [cats, setCats] = useState([]); const [posts, setPosts] = useState([]); const [pages, setPages] = useState(1); const [page, setPage] = useState(1);
  const q = sp.get('q') || ''; const cat = sp.get('category') || '';
  useEffect(() => { axios.get('/api/categories').then(r => setCats(r.data)); }, []);
  useEffect(() => { setPage(1); }, [q, cat]);
  useEffect(() => { const t = setTimeout(() => axios.get('/api/posts', { params: { q, category: cat, page, limit: 9 } }).then(r => { setPosts(p => page === 1 ? r.data.posts : [...p, ...r.data.posts]); setPages(r.data.pages); }), 250); return () => clearTimeout(t); }, [q, cat, page]);
  const set = (k, v) => { const n = new URLSearchParams(sp); v ? n.set(k, v) : n.delete(k); setSp(n); };
  return (<main className="max-w-7xl mx-auto px-6 pt-36 pb-10"><Helmet><title>Articles | Zoho Tech Blog</title></Helmet>
    <h1 className="text-5xl font-extrabold">All <span className="font-serif italic text-lime">Articles</span></h1>
    <input value={q} onChange={e => set('q', e.target.value)} placeholder="Search by keyword" className="input mt-8 max-w-md" />
    <div className="flex flex-wrap gap-2 mt-5"><button onClick={() => set('category', '')} className={`chip ${!cat && 'on'}`}>All</button>{cats.map(c => <button key={c._id} onClick={() => set('category', c.slug)} className={`chip ${cat === c.slug && 'on'}`}>{c.name}</button>)}</div>
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-10">{posts.map((p, i) => <PostCard key={p._id} p={p} delay={[100, 150, 250][i % 3]} />)}</div>
    {!posts.length && <p className="text-zinc mt-10">No articles match. Try a different keyword or category.</p>}
    {page < pages && <div className="text-center mt-12"><button className="pill" onClick={() => setPage(page + 1)}>LOAD MORE →</button></div>}
  </main>);
}
