import { Link, NavLink, useNavigate } from 'react-router-dom'; import { useState } from 'react';
export const ZohoLogo = ({ h = 22 }) => (
  // Placeholder wordmark: replace with the official Zoho SVG from Zoho's brand assets.
  <svg height={h} viewBox="0 0 120 30" aria-label="Zoho"><g fill="none" strokeWidth="3.2" strokeLinejoin="round"><rect x="2" y="6" width="18" height="18" rx="3" stroke="#D4FF24"/><circle cx="42" cy="15" r="9" stroke="#1558C9"/><path d="M63 6v18M83 6v18M63 15h20" stroke="#fff"/><circle cx="105" cy="15" r="9" stroke="#D4FF24"/></g></svg>);
export function Navbar() {
  const [q, setQ] = useState(''); const [open, setOpen] = useState(false); const nav = useNavigate();
  const link = ({ isActive }) => `text-sm ${isActive ? 'text-lime' : 'text-zinc hover:text-white'}`;
  return (<header className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-ink/60 border-b border-white/10">
    <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
      <Link to="/" className="flex items-center gap-3"><ZohoLogo /><span className="label hidden sm:inline">Tech Blog</span></Link>
      <nav className="hidden md:flex gap-8">{[['/', 'Home'], ['/articles', 'Articles'], ['/categories', 'Categories'], ['/about', 'About']].map(([to, t]) => <NavLink key={t} to={to} end={to === '/'} className={link}>{t}</NavLink>)}</nav>
      <div className="flex items-center gap-3">
        {open && <form onSubmit={e => { e.preventDefault(); nav(`/articles?q=${encodeURIComponent(q)}`); setOpen(false); }}><input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search articles" className="input !w-40 sm:!w-56" /></form>}
        <button aria-label="Search" onClick={() => setOpen(!open)} className="text-zinc hover:text-white">⌕</button>
        <a href="#subscribe" className="pill !py-2 !px-4">SUBSCRIBE →</a>
      </div></div></header>);
}
export function Footer() {
  const [done, setDone] = useState(false);
  return (<footer id="subscribe" className="border-t border-white/10 mt-24 bg-ink/80"><div className="max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-4 gap-10">
    <div><ZohoLogo h={26} /><p className="text-zinc text-sm mt-4">Zoho Corporation. Weekly insights across software, AI, cloud and security.</p></div>
    <div><p className="label mb-3">Explore</p>{[['/articles', 'All articles'], ['/categories', 'Categories'], ['/about', 'About']].map(([to, t]) => <Link key={t} to={to} className="block text-sm text-zinc hover:text-lime py-1">{t}</Link>)}</div>
    <div><p className="label mb-3">Follow</p>{['X', 'LinkedIn', 'YouTube', 'GitHub'].map(s => <a key={s} href="#" className="block text-sm text-zinc hover:text-lime py-1">{s}</a>)}</div>
    <div><p className="label mb-3">Newsletter</p>{done ? <p className="text-lime text-sm">Subscribed. Check your inbox.</p> : <form onSubmit={e => { e.preventDefault(); setDone(true); }} className="flex gap-2"><input required type="email" placeholder="you@company.com" className="input" /><button className="pill !px-4">GO →</button></form>}</div>
  </div><p className="label text-center pb-8">© {new Date().getFullYear()} Zoho Tech Blog</p></footer>);
}
