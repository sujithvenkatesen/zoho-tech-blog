import { useEffect, useMemo, useRef, useState } from 'react'; import { useParams, Link } from 'react-router-dom'; import axios from 'axios'; import hljs from 'highlight.js'; import 'highlight.js/styles/github-dark.css';
import { Helmet } from 'react-helmet-async'; import PostCard, { fmt } from '../components/PostCard'; import Reveal from '../components/Reveal';
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export default function Article() {
  const { slug: s } = useParams(); const [d, setD] = useState(null); const [err, setErr] = useState(false); const body = useRef();
  useEffect(() => { setD(null); setErr(false); axios.get(`/api/posts/${s}`).then(r => setD(r.data)).catch(() => setErr(true)); }, [s]);
  const { html, toc } = useMemo(() => {
    if (!d) return {}; const toc = [];
    const html = d.post.content.replace(/<(h[23])>(.*?)<\/\1>/g, (_, t, inner) => { const txt = inner.replace(/<[^>]+>/g, ''); const id = slug(txt); toc.push({ id, txt, t }); return `<${t} id="${id}">${inner}</${t}>`; });
    return { html, toc };
  }, [d]);
  useEffect(() => { body.current?.querySelectorAll('pre code').forEach(b => hljs.highlightElement(b)); }, [html]);
  if (err) return <main className="pt-40 text-center"><h1 className="text-3xl font-bold">Article not found</h1><Link to="/articles" className="pill mt-6">BROWSE ARTICLES</Link></main>;
  if (!d) return <main className="pt-40 text-center label">Loading…</main>;
  const { post: p, prev, next, related } = d; const url = window.location.href;
  const ld = { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: p.title, image: p.image, author: { '@type': 'Person', name: p.author }, datePublished: p.publishAt, dateModified: p.updatedAt, description: p.seoDesc || p.excerpt };
  return (<main className="max-w-7xl mx-auto px-6 pt-32 pb-10">
    <Helmet><title>{p.seoTitle || p.title}</title><meta name="description" content={p.seoDesc || p.excerpt} /><meta property="og:title" content={p.seoTitle || p.title} /><meta property="og:description" content={p.seoDesc || p.excerpt} /><meta property="og:image" content={p.image} /><meta property="og:type" content="article" /><script type="application/ld+json">{JSON.stringify(ld)}</script></Helmet>
    <Reveal><span className="label text-lime">{p.category?.name}</span><h1 className="text-4xl md:text-6xl font-extrabold mt-3 max-w-4xl">{p.title}</h1>
      <p className="label mt-4">{p.author} · {fmt(p.publishAt)} · {p.readTime} min read</p>
      {p.image && <img src={p.image} alt="" className="w-full aspect-video object-cover rounded-xl mt-8" />}</Reveal>
    <div className="grid lg:grid-cols-[1fr_260px] gap-12 mt-10"><article ref={body} className="prose-body" dangerouslySetInnerHTML={{ __html: html }} />
      <aside className="lg:sticky lg:top-24 self-start space-y-8">
        {toc.length > 2 && <div><p className="label mb-3">On this page</p>{toc.map(i => <a key={i.id} href={`#${i.id}`} className={`block text-sm text-zinc hover:text-lime py-1 ${i.t === 'h3' ? 'pl-4' : ''}`}>{i.txt}</a>)}</div>}
        <div><p className="label mb-3">Share</p><div className="flex gap-2 flex-wrap">
          {[['X', `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(p.title)}`], ['LinkedIn', `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`], ['Facebook', `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`]].map(([n, h]) => <a key={n} href={h} target="_blank" rel="noreferrer" className="chip">{n}</a>)}</div></div></aside></div>
    <nav className="grid md:grid-cols-2 gap-4 mt-16 border-t border-white/10 pt-8">
      {prev ? <Link to={`/articles/${prev.slug}`} className="hover:text-lime"><span className="label block">← Previous</span>{prev.title}</Link> : <span />}
      {next && <Link to={`/articles/${next.slug}`} className="md:text-right hover:text-lime"><span className="label block">Next →</span>{next.title}</Link>}</nav>
    {!!related.length && <section className="mt-16"><p className="label mb-6">Related articles</p><div className="grid md:grid-cols-3 gap-8">{related.map((r, i) => <PostCard key={r._id} p={r} delay={[100, 150, 250][i]} />)}</div></section>}
  </main>);
}
