import { useEffect, useState } from 'react'; import { Link } from 'react-router-dom'; import axios from 'axios';
import Reveal from '../components/Reveal'; import PostCard from '../components/PostCard';
export default function Home() {
  const [feat, setFeat] = useState([]); const [posts, setPosts] = useState([]); const [pop, setPop] = useState([]); const [cats, setCats] = useState([]); const [cat, setCat] = useState('');
  useEffect(() => { axios.get('/api/posts?featured=1&limit=4').then(r => setFeat(r.data.posts)); axios.get('/api/posts?sort=popular&limit=5').then(r => setPop(r.data.posts)); axios.get('/api/categories').then(r => setCats(r.data)); }, []);
  useEffect(() => { axios.get(`/api/posts?limit=6&category=${cat}`).then(r => setPosts(r.data.posts)); }, [cat]);
  return (<main>
    <section className="relative pt-40 pb-24 overflow-hidden"><div className="absolute right-0 top-20 w-[600px] h-[600px] rounded-full bg-cobalt/30 blur-[140px] pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-14 items-center">
        <Reveal><h1 className="text-5xl md:text-7xl font-extrabold leading-[1.05]"><span className="font-serif italic text-lime font-semibold">Explore</span><br />Every Tech <span className="text-cobalt">Breakthrough</span></h1>
          <div className="flex gap-6 mt-8 label"><span>7+ Categories</span><span>Weekly Insights</span><span>Tech &amp; AI</span></div>
          <Link to="/articles" className="pill mt-10">EXPLORE ARTICLES →</Link></Reveal>
        {feat[0] && <Reveal delay={150}><PostCard p={feat[0]} big /></Reveal>}
      </div></section>
    <section className="max-w-7xl mx-auto px-6 py-16"><Reveal><p className="label"><span className="font-display text-5xl text-lime align-middle mr-3">01</span>/ Featured</p></Reveal>
      <div className="grid md:grid-cols-3 gap-8 mt-8">{feat.slice(1, 4).map((p, i) => <PostCard key={p._id} p={p} delay={[100, 250, 350][i]} />)}</div></section>
    <section className="max-w-7xl mx-auto px-6 py-16 grid lg:grid-cols-[1fr_300px] gap-12"><div>
      <Reveal><p className="label"><span className="font-display text-5xl text-lime align-middle mr-3">02</span>/ Latest articles</p>
        <div className="flex flex-wrap gap-2 mt-6"><button onClick={() => setCat('')} className={`chip ${!cat && 'on'}`}>All</button>{cats.map(c => <button key={c._id} onClick={() => setCat(c.slug)} className={`chip ${cat === c.slug && 'on'}`}>{c.name}</button>)}</div></Reveal>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8 mt-8">{posts.map((p, i) => <PostCard key={p._id} p={p} delay={[100, 150, 250][i % 3]} />)}</div></div>
      <aside><Reveal delay={150}><p className="label mb-4"><span className="font-display text-3xl text-lime mr-2">03</span>/ Trending</p>
        {pop.map((p, i) => <Link key={p._id} to={`/articles/${p.slug}`} className="flex gap-4 py-3 border-b border-white/10 group"><span className="font-display text-3xl text-cobalt">{i + 1}</span><span className="text-sm font-semibold group-hover:text-lime">{p.title}</span></Link>)}
        <p className="label mt-8 mb-3">Core stacks</p><div className="flex flex-wrap gap-2">{['MERN', 'Kubernetes', 'PyTorch', 'Zero Trust', 'Flutter'].map(t => <span key={t} className="chip">{t}</span>)}</div></Reveal></aside>
    </section></main>);
}
