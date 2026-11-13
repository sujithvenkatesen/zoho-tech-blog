import { useEffect, useRef } from 'react';
export default function Reveal({ children, delay = 0, className = '', as: T = 'div' }) {
  const ref = useRef();
  useEffect(() => {
    const el = ref.current; const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add('is-live'); io.disconnect(); } }, { threshold: 0.15 });
    io.observe(el); return () => io.disconnect();
  }, []);
  return <T ref={ref} className={`wf-reveal ${className}`} data-delay={delay}><div className="wf-content" style={{ transitionDelay: `${delay}ms` }}>{children}</div></T>;
}
