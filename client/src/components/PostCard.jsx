import { Link } from 'react-router-dom'; import Reveal from './Reveal';
export const fmt = d => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
export default function PostCard({ p, delay = 0, big }) {
  return (<Reveal delay={delay} className="h-full"><Link to={`/articles/${p.slug}`} className="group block h-full">
    <div className="overflow-hidden rounded-lg aspect-video bg-cobalt/20"><img loading="lazy" src={p.image || 'data:image/gif;base64,R0lGODlhAQABAAAAACw='} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" /></div>
    <div className="pt-4"><span className="label text-lime">{p.category?.name}</span>{p.featured && <span className="label ml-3">Featured</span>}
      <h3 className={`font-extrabold mt-2 group-hover:text-lime transition-colors ${big ? 'text-3xl' : 'text-xl'}`}>{p.title}</h3>
      <p className="text-zinc text-sm mt-2 line-clamp-2">{p.excerpt}</p>
      <p className="label mt-3">{p.author} · {fmt(p.publishAt)} · {p.readTime} min read</p></div></Link></Reveal>);
}
