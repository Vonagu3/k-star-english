import { useEffect, useState } from 'react';
import { HashRouter, NavLink, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { useGame } from './game/store';
import { supabase } from './lib/supabase';
import { setMuted } from './lib/sfx';
import { configureVoice } from './lib/tts';
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
import NotebookBook from './pages/NotebookBook';
import Daily from './pages/Daily';
import TranslateTooltip from './components/TranslateTooltip';
import TimeKeeper from './components/TimeKeeper';

function LessonRoute() {
  const { id } = useParams();
  return <Lesson key={id} />;
}

function Nav() {
  const loc = useLocation();
  if (loc.pathname.startsWith('/lesson') || loc.pathname.startsWith('/daily') || loc.pathname.startsWith('/warmup') || loc.pathname.startsWith('/parent')) return null;
  const items = [['/', '🏠', 'Home'], ['/map', '🗺️', 'Map'], ['/studio', '👗', 'Studio'], ['/dorm', '🛏️', 'Dorm'], ['/cards', '🃏', 'Cards'], ['/parent', '🔐', 'Parent']] as const;
  return (
    <nav className="bottom-nav">
      {items.map(([to, ico, label]) => (
        <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}><span className="ico">{ico}</span>{label}</NavLink>
      ))}
    </nav>
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
  useEffect(() => { configureVoice({ name: profile?.settings.voiceName ?? null, rate: profile?.settings.voiceRate ?? 0.9 }); }, [profile?.settings.voiceName, profile?.settings.voiceRate]);

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
        <Route path="/notebook" element={<NotebookBook />} />
        <Route path="/daily" element={<Daily />} />
        <Route path="*" element={<Home />} />
      </Routes>
      <Nav />
      <TimeKeeper />
      <TranslateTooltip enabled={(profile.settings.hoverTranslate ?? 'practice') !== 'off'} all={profile.settings.hoverTranslate === 'all'} />
    </HashRouter>
  );
}
