'use client';
import { useCallback, useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { sb } from '../../lib/supabase';

const TY = ['text', 'email', 'tel', 'one', 'multi', 'long', 'links'];
const blank = { team: 'all', position: 100, key: '', label: '', hint: '', placeholder: '', type: 'text', options: [], allow_other: false, required: true, active: true };

function flat(r, lab) {
  const o = { Submitted: new Date(r.created_at).toLocaleString(), Team: r.team.toUpperCase() };
  for (const [k, v] of Object.entries(r.answers || {})) {
    const L = lab[k] || k;
    if (Array.isArray(v)) o[L] = v.join('; ');
    else if (v && typeof v === 'object') for (const [a, b] of Object.entries(v)) o[L + ' – ' + a] = b;
    else o[L] = v;
  }
  return o;
}

function QCard({ q, onDone }) {
  const [d, setD] = useState({ ...q, options: (q.options || []).join('\n') });
  const [m, setM] = useState('');
  const set = (k) => (e) => setD({ ...d, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  async function save() {
    const r = {
      team: d.team, type: d.type, label: d.label.trim(), hint: d.hint || '', placeholder: d.placeholder || '',
      key: d.key.trim().replace(/\W+/g, '_').toLowerCase(), position: +d.position || 100,
      allow_other: !!d.allow_other, required: !!d.required, active: !!d.active,
      options: d.options.split('\n').map((x) => x.trim()).filter(Boolean),
    };
    if (!r.key || !r.label) return setM('Key and question are required');
    const { error } = q.id ? await sb().from('questions').update(r).eq('id', q.id) : await sb().from('questions').insert(r);
    if (error) return setM(error.message);
    setM('Saved'); onDone();
  }
  async function del() {
    if (!confirm('Delete this question?')) return;
    await sb().from('questions').delete().eq('id', q.id); onDone();
  }
  return (
    <div className="qc">
      <div className="g">
        <label>Team<select value={d.team} onChange={set('team')}>{['all', 'pr', 'tech'].map((x) => <option key={x}>{x}</option>)}</select></label>
        <label>Order<input type="number" value={d.position} onChange={set('position')} /></label>
        <label>Type<select value={d.type} onChange={set('type')}>{TY.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label>Key<input value={d.key} onChange={set('key')} placeholder="e.g. github" /></label>
      </div>
      <label>Question<input value={d.label} onChange={set('label')} /></label>
      <label>Hint<input value={d.hint || ''} onChange={set('hint')} /></label>
      <label>Placeholder<input value={d.placeholder || ''} onChange={set('placeholder')} /></label>
      <label>Options / field names (one per line, for choice and links types)<textarea value={d.options} onChange={set('options')} /></label>
      <div className="g">
        <label><input type="checkbox" checked={d.allow_other} onChange={set('allow_other')} />“Other” option</label>
        <label><input type="checkbox" checked={d.required} onChange={set('required')} />Required</label>
        <label><input type="checkbox" checked={d.active} onChange={set('active')} />Shown on form</label>
      </div>
      <div className="bar2"><button className="bt" onClick={save}>{q.id ? 'Save' : 'Add question'}</button>
        {q.id && <button className="bt r" onClick={del}>Delete</button>}<span className="mono">{m}</span></div>
    </div>
  );
}

export default function Admin() {
  const [ses, setSes] = useState(undefined), [em, setEm] = useState(''), [pw, setPw] = useState(''), [msg, setMsg] = useState('');
  const [apps, setApps] = useState([]), [qs, setQs] = useState([]), [tab, setTab] = useState('apps');
  const [ft, setFt] = useState(''), [sr, setSr] = useState(''), [lerr, setLerr] = useState(''), [adding, setAdding] = useState(false);

  useEffect(() => {
    document.body.classList.add('adm');
    sb().auth.getSession().then(({ data }) => setSes(data.session));
    const { data: l } = sb().auth.onAuthStateChange((_, s) => setSes(s));
    return () => l.subscription.unsubscribe();
  }, []);
  const load = useCallback(async () => {
    const a = await sb().from('applications').select('*').order('created_at', { ascending: false });
    const q = await sb().from('questions').select('*').order('position');
    const e = a.error || q.error;
    setLerr(e ? e.message + ' (is this user listed in the admins table?)' : '');
    if (!e) { setApps(a.data); setQs(q.data); setAdding(false); }
  }, []);
  useEffect(() => { if (ses) load(); }, [ses, load]);

  async function login() {
    const { error } = await sb().auth.signInWithPassword({ email: em.trim(), password: pw });
    setMsg(error ? error.message : '');
  }
  const head = (who) => <header><div className="logo"><img src="/logo.png" alt="AWS SBG" /></div><div className="mono">{who}</div></header>;

  if (ses === undefined) return <div id="app">{head('')}</div>;
  if (!ses) return (
    <div id="app">{head('')}
      <div className="login"><h1>Admin</h1>
        <input type="email" placeholder="email" value={em} onChange={(e) => setEm(e.target.value)} />
        <input type="password" placeholder="password" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && login()} />
        <div className="err">{msg}</div><button className="bt" onClick={login}>Sign in</button></div></div>
  );

  const lab = {}; qs.forEach((q) => (lab[q.key] = lab[q.key] || q.label));
  const list = apps.filter((r) => (!ft || r.team === ft) && (!sr || JSON.stringify(r).toLowerCase().includes(sr.toLowerCase())));
  const rows = list.map((r) => flat(r, lab)), ks = [...new Set(rows.flatMap(Object.keys))];
  const csv = () => {
    const q = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
    const c = '\ufeff' + [ks.map(q).join(','), ...rows.map((r) => ks.map((k) => q(r[k])).join(','))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([c], { type: 'text/csv' })); a.download = 'aws-sbg-applications.csv'; a.click();
  };
  const xlsx = () => {
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Applications'); XLSX.writeFile(wb, 'aws-sbg-applications.xlsx');
  };
  async function del(id) { if (confirm('Delete this application?')) { await sb().from('applications').delete().eq('id', id); load(); } }

  return (
    <div id="app">{head(ses.user.email)}
      <div className="tabs">
        <button className={'chip' + (tab === 'apps' ? ' on' : '')} onClick={() => setTab('apps')}>Applications</button>
        <button className={'chip' + (tab === 'qs' ? ' on' : '')} onClick={() => setTab('qs')}>Questions</button>
        <button className="chip" onClick={() => sb().auth.signOut()}>Sign out</button>
      </div>
      {lerr && <div className="err">{lerr}</div>}
      {tab === 'apps' ? <>
        <div className="bar2">
          <select value={ft} onChange={(e) => setFt(e.target.value)}><option value="">All teams</option><option value="pr">PR</option><option value="tech">Tech</option></select>
          <input placeholder="Search…" value={sr} onChange={(e) => setSr(e.target.value)} />
          <span className="mono">{list.length} applications</span>
          <button className="bt o" onClick={csv}>Download CSV</button><button className="bt" onClick={xlsx}>Download Excel</button>
        </div>
        <div className="tw"><table><thead><tr>{ks.map((k) => <th key={k}>{k}</th>)}<th /></tr></thead>
          <tbody>{rows.map((r, n) => <tr key={list[n].id}>{ks.map((k) => <td key={k} title={String(r[k] ?? '')}>{String(r[k] ?? '')}</td>)}
            <td><button className="bt r" onClick={() => del(list[n].id)}>✕</button></td></tr>)}</tbody></table></div>
      </> : <>
        <div className="bar2"><button className="bt" onClick={() => setAdding(true)}>+ New question</button></div>
        {adding && <QCard q={blank} onDone={load} />}
        {qs.map((q) => <QCard key={q.id + JSON.stringify(q)} q={q} onDone={load} />)}
      </>}
    </div>
  );
}
