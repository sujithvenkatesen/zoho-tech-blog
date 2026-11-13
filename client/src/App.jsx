import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Navbar, Footer } from './components/Chrome';
import Home from './pages/Home'; import Articles from './pages/Articles'; import Article from './pages/Article'; import Admin from './pages/Admin';
export default function App() {
  const { pathname } = useLocation(); useEffect(() => window.scrollTo(0, 0), [pathname]);
  const admin = pathname.startsWith('/admin');
  return (<>
    {!admin && <Navbar />}
    <Routes>
      <Route path="/" element={<Home />} /><Route path="/articles" element={<Articles />} />
      <Route path="/categories" element={<Articles />} /><Route path="/articles/:slug" element={<Article />} />
      <Route path="/about" element={<main className="max-w-3xl mx-auto px-6 pt-36 pb-24"><h1 className="text-4xl font-extrabold">About</h1><p className="mt-4 text-zinc">Weekly insights on software, AI, cloud and security.</p></main>} />
      <Route path="/admin/*" element={<Admin />} />
    </Routes>
    {!admin && <Footer />}
  </>);
}
