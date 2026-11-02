'use client';
import { useEffect, useState } from 'react';
import { sb } from '../lib/supabase';

const isChip = (t) => t === 'one' || t === 'multi';

function Shell({ ctr, n, done, children }) {
  return (
    <div id="app">
      <header><div className="logo"><img src="/logo.png" alt="AWS x Student Builder Group" /></div><div className="mono">{ctr}</div></header>
      <main>{children}</main>
      <footer>{Array.from({ length: n.t }, (_, k) => <i key={k} className={'blk' + (k < n.i || done ? ' d' : '')} />)}</footer>
    </div>
  );
}

export default function Form() {
  const [Q, setQ] = useState(null), [loadErr, setLoadErr] = useState('');
  const [team, setTeam] = useState(null), [i, setI] = useState(0);
  const [A, setA] = useState({}), [R, setR] = useState({}), [err, setErr] = useState('');
  const [st, setSt] = useState('form'), [sErr, setSErr] = useState('');

  useEffect(() => {
    sb().from('questions').select('*').eq('active', true).order('position')
      .then(({ data, error }) => (error ? setLoadErr(error.message) : setQ(data)));
  }, []);
  useEffect(() => { document.body.className = team || ''; }, [team]);

  const S = Q && team ? Q.filter((x) => x.team === 'all' || x.team === team) : [];
  const q = S[i];
  const N = { t: S.length, i };
  const draft = (k, v) => setR((r) => ({ ...r, [k]: v }));

  function next(dr = R) {
    const d = dr[q.key]; let v; const T = q.type;
    if (T === 'links') {
      v = {}; (q.options || []).forEach((n) => (v[n] = (d?.[n] || '').trim()));
      if (Object.values(v).some((x) => !x)) return setErr('Fill in all of them, please.');
    } else if (isChip(T)) {
      const sel = d?.sel || [], ot = (d?.o || '').trim();
      if (!sel.length) return setErr('Pick at least one.');
      if (sel.includes('Other') && !ot) return setErr('Tell us what “Other” is.');
      const out = sel.map((x) => (x === 'Other' ? 'Other: ' + ot : x));
      v = T === 'one' ? out[0] : out;
    } else {
      v = (d || '').trim();
      if (!v && q.required) return setErr('Hold up, this one’s needed.');
      if (T === 'email' && v && !/^\S+@\S+\.\S+$/.test(v)) return setErr('That email doesn’t look right.');
      if (T === 'tel' && v && v.replace(/\D/g, '').length < 10) return setErr('Need at least 10 digits.');
    }
    const na = { ...A, [q.key]: v }; setA(na); setErr('');
    i < S.length - 1 ? setI(i + 1) : submit(na);
  }

  async function submit(a) {
    setSt('sending');
    const { error } = await sb().from('applications').insert({ team, name: a.name || null, email: a.email || null, answers: a });
    if (error) { setSErr(error.code === '23505' ? 'dup' : error.message); setSt('fail'); } else setSt('done');
  }

  if (loadErr) return <Shell ctr="error" n={N}><h1>Couldn’t load the form.</h1><p className="hint">{loadErr}</p></Shell>;
  if (!Q) return <Shell ctr="loading" n={N}><div className="mono">loading…</div></Shell>;

  if (!team) return (
    <Shell ctr="Member intake" n={N}>
      <div className="q"><span className="mono tag">// pick your lane</span><h1>Which team are you joining?</h1>
        <div className="teams">
          <button className="team p" onClick={() => { setTeam('pr'); setI(0); }}><span className="mono">team 01</span><div><b>PR</b><br /><span>Stories, design, outreach, the club’s voice.</span></div></button>
          <button className="team t" onClick={() => { setTeam('tech'); setI(0); }}><span className="mono">team 02</span><div><b>TECH</b><br /><span>Code, cloud, builds, the club’s engine.</span></div></button>
        </div></div>
    </Shell>
  );

  if (st === 'fail') return (
    <Shell ctr="hmm" n={N}><div className="q"><span className="mono tag">// hmm</span>
      <h1>{sErr === 'dup' ? 'You’ve already applied.' : 'Couldn’t submit.'}</h1>
      <p className="hint">{sErr === 'dup' ? 'That email is already in our list.' : sErr}</p>
      {sErr !== 'dup' && <div className="row"><button className="btn" onClick={() => submit(A)}>Try again</button></div>}</div></Shell>
  );

  if (st === 'done') {
    const row = (a, k) => A[k] ? <><dt>{a}</dt><dd>{A[k]}</dd></> : null;
    return (
      <Shell ctr="Done" n={N} done><div className="q"><span className="mono tag">// you’re in</span>
        <h1>Welcome aboard, {String(A.name || '').split(' ')[0]}.</h1><p className="hint">Your details are with the AWS SBG team.</p>
        <div className="badge"><div className="top"><span className="mono">AWS SBG · MVJCE</span><span className="mono">member</span></div>
          <h2>{A.name}</h2><span className="pill">{team === 'pr' ? 'PR TEAM' : 'TECH TEAM'}</span>
          <dl>{row('USN', 'usn')}{row('Year', 'year')}{row('Branch', 'branch')}{row('Email', 'email')}{row('Phone', 'phone')}</dl><div className="bar" /></div></div></Shell>
    );
  }

  const d = R[q.key], T = q.type, opts = (q.options || []).concat(q.allow_other && isChip(T) ? ['Other'] : []);
  const sel = d?.sel || [];
  const key = (e) => { if (e.key === 'Enter' && !(T === 'long' && !e.ctrlKey && !e.metaKey)) { e.preventDefault(); next(); } };
  const pickChip = (v) => {
    if (T === 'one') {
      const nr = { ...R, [q.key]: { sel: [v], o: d?.o || '' } }; setR(nr); setErr('');
      if (v !== 'Other') setTimeout(() => next(nr), 260);
    } else draft(q.key, { sel: sel.includes(v) ? sel.filter((x) => x !== v) : [...sel, v], o: d?.o || '' });
  };
  return (
    <Shell ctr={`${String(i + 1).padStart(2, '0')} / ${String(S.length).padStart(2, '0')} · ${team.toUpperCase()}`} n={N}>
      <div className="ghost">{String(i + 1).padStart(2, '0')}</div>
      <div className="q" key={q.id}>
        <span className="mono tag">// {q.key}</span><h1>{q.label}</h1><p className="hint">{q.hint}</p>
        {T === 'long' && <textarea autoFocus placeholder="Type here…" value={d || ''} onKeyDown={key} onChange={(e) => draft(q.key, e.target.value)} />}
        {T === 'links' && <div className="lk">{(q.options || []).map((n) => (
          <div key={n} style={{ display: 'contents' }}><span className="mono">{n}</span>
            <input placeholder={`${n} link or username`} value={d?.[n] || ''} onKeyDown={key} onChange={(e) => draft(q.key, { ...d, [n]: e.target.value })} /></div>))}</div>}
        {isChip(T) && <><div className="chips">{opts.map((v) => <button key={v} className={'chip' + (sel.includes(v) ? ' on' : '')} onClick={() => pickChip(v)}>{v}</button>)}</div>
          {sel.includes('Other') && <input autoFocus placeholder="Please specify" style={{ marginTop: 20 }} value={d?.o || ''} onKeyDown={key} onChange={(e) => draft(q.key, { sel, o: e.target.value })} />}</>}
        {!isChip(T) && T !== 'long' && T !== 'links' && <input autoFocus type={T} placeholder={q.placeholder} value={d || ''} onKeyDown={key} onChange={(e) => draft(q.key, e.target.value)} />}
        <div className="err">{err}</div>
        <div className="row"><button className="btn" onClick={() => next()}>{i === S.length - 1 ? 'Submit' : 'Next'} →</button>
          {i > 0 ? <button className="btn g" onClick={() => { setErr(''); setI(i - 1); }}>← Back</button> : <button className="btn g" onClick={() => { setTeam(null); setR({}); setA({}); }}>← Teams</button>}</div>
      </div>
    </Shell>
  );
}
