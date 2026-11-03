import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!supabase) return;
    setBusy(true); setMsg('');
    const { error } = mode === 'in'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) setMsg(error.message);
    else if (mode === 'up') setMsg('Аккаунт создан. Если включено подтверждение почты — откройте письмо, затем войдите.');
  };
  return (
    <div className="page col" style={{ maxWidth: 420, alignItems: 'center', textAlign: 'center' }}>
      <div style={{ fontSize: 72 }}>🌟</div>
      <h1 className="title-xl">K-Star English</h1>
      <div className="muted">Вход для родителя — один раз на каждом устройстве. Прогресс синхронизируется между устройствами.</div>
      <input className="field" type="email" placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      <input className="field" type="password" placeholder="пароль (минимум 6 символов)" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} />
      {msg && <div className="card tint-sun small">{msg}</div>}
      <button className="btn violet block" disabled={busy || !email || password.length < 6} onClick={() => void submit()}>{mode === 'in' ? 'Войти' : 'Создать семейный аккаунт'}</button>
      <button className="btn ghost small" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>{mode === 'in' ? 'Первый раз? Создать аккаунт' : 'Уже есть аккаунт? Войти'}</button>
    </div>
  );
}
