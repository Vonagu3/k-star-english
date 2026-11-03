import { useEffect, useState } from 'react';
import { HashRouter, NavLink, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { useGame } from './game/store';
import { supabase } from './lib/supabase';
import { setMuted } from './lib/sfx';
import { dayKey } from './game/rules';
import Home from './pages/Home';
import MapPage from './pages/Map';
import Lesson from './pages/Lesson';
import Warmup from './pages/Warmup';
import Studio from './pages/Studio';
import Dorm from './pages/Dorm';
import Cards from './pages/Cards';
import Parent from './pages/Parent';
import Onboarding from './pages/Onboarding';
import Login from './pages/Login';

function LessonRoute() {
  const { id } = useParams();
  return <Lesson key={id} />;
}

function Nav() {
  const loc = useLocation();
  if (loc.pathname.startsWith('/lesson') || loc.pathname.startsWith('/warmup') || loc.pathname.startsWith('/parent')) return null;
  const items = [['/', '🏠', 'Home'], ['/map', '🗺️', 'Map'], ['/studio', '👗', 'Studio'], ['/dorm', '🛏️', 'Dorm'], ['/cards', '🃏', 'Cards'], ['/parent', '🔐', 'Parent']] as const;
  return (
    <nav className="bottom-nav">
      {items.map(([to, ico, label]) => (
        <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}><span className="ico">{ico}</span>{label}</NavLink>
      ))}
    </nav>
  );
}

/** Counts active minutes (tab visible) and shows a gentle break screen over the daily limit. */
function TimeKeeper() {
  const addMinute = useGame((g) => g.addMinute);
  const limit = useGame((g) => g.s.profile?.settings.dailyLimitMin ?? null);
  const today = useGame((g) => g.s.minutes[dayKey(Date.now())] ?? 0);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === 'visible') addMinute(); }, 60000);
    return () => clearInterval(id);
  }, [addMinute]);
  const loc = useLocation();
  if (!limit || today < limit || loc.pathname.startsWith('/parent') || (dismissedAt !== null && today < dismissedAt + 5)) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(43,33,64,0.6)', display: 'grid', placeItems: 'center', padding: 16 }}>
      <div className="card center col" style={{ maxWidth: 420, alignItems: 'center' }}>
        <div style={{ fontSize: 64 }}>🌙</div>
        <h2 className="title-l">Time for a break, star!</h2>
        <div className="muted">Ты сегодня отлично позанималась ({today} мин). Отдохни — завтра продолжим! 💖</div>
        <button className="btn ghost small" onClick={() => setDismissedAt(today)}>5 more minutes</button>
      </div>
    </div>
  );
}

export default function App() {
  const ready = useGame((g) => g.ready);
  const load = useGame((g) => g.load);
  const profile = useGame((g) => g.s.profile);
  const [auth, setAuth] = useState<'checking' | 'in' | 'out'>(supabase ? 'checking' : 'in');

  useEffect(() => {
    if (!supabase) { void load(null); return; }
    void supabase.auth.getSession().then(({ data }) => {
      setAuth(data.session ? 'in' : 'out');
      if (data.session) void load(data.session.user.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((evt, session) => {
      if (evt === 'SIGNED_IN' && session) { setAuth('in'); void load(session.user.id); }
      if (evt === 'SIGNED_OUT') setAuth('out');
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  useEffect(() => { setMuted(profile?.settings.muted ?? false); }, [profile?.settings.muted]);

  if (auth === 'out') return <Login />;
  if (!ready || auth === 'checking') return <div className="page center" style={{ paddingTop: 120 }}><div style={{ fontSize: 64 }}>🌟</div><h2>Loading…</h2></div>;
  if (!profile) return <Onboarding />;
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/lesson/:id" element={<LessonRoute />} />
        <Route path="/warmup" element={<Warmup />} />
        <Route path="/studio" element={<Studio />} />
        <Route path="/dorm" element={<Dorm />} />
        <Route path="/cards" element={<Cards />} />
        <Route path="/parent" element={<Parent />} />
        <Route path="*" element={<Home />} />
      </Routes>
      <Nav />
      <TimeKeeper />
    </HashRouter>
  );
}
