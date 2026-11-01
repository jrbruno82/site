// Pesquisa de estratégias de entrada long-only em spot, candles de 1h.
// Escolha de parâmetros só na parte inicial (IS, 60%); avaliação na parte final (OOS, 40%).
import fs from 'node:fs';
const FEE = 0.001, SLIP = 0.0005;
const EXCLUDE = new Set(['XAUTUSDT', 'PAXGUSDT', 'UUSDT', 'RWUSDUSDT']);
const raw = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const MODE = process.argv[3] || 'grid';

// ── indicadores ──
const ema = (x, n) => { const o = new Array(x.length); const a = 2 / (n + 1); o[0] = x[0]; for (let i = 1; i < x.length; i++) o[i] = a * x[i] + (1 - a) * o[i - 1]; return o; };
const sma = (x, n) => { const o = new Array(x.length).fill(NaN); let s = 0; for (let i = 0; i < x.length; i++) { s += x[i]; if (i >= n) s -= x[i - n]; if (i >= n - 1) o[i] = s / n; } return o; };
function rsi(c, n) {
  const o = new Array(c.length).fill(NaN); let g = 0, l = 0;
  for (let i = 1; i <= n; i++) { const d = c[i] - c[i - 1]; d > 0 ? g += d : l -= d; }
  g /= n; l /= n; o[n] = l === 0 ? 100 : 100 - 100 / (1 + g / l);
  for (let i = n + 1; i < c.length; i++) { const d = c[i] - c[i - 1]; g = (g * (n - 1) + Math.max(d, 0)) / n; l = (l * (n - 1) + Math.max(-d, 0)) / n; o[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l); }
  return o;
}
function atr(h, l, c, n = 14) {
  const o = new Array(c.length).fill(NaN); let a = 0;
  for (let i = 1; i < c.length; i++) { const tr = Math.max(h[i] - l[i], Math.abs(h[i] - c[i - 1]), Math.abs(l[i] - c[i - 1])); if (i <= n) { a += tr; if (i === n) { a /= n; o[i] = a; } } else { a = (a * (n - 1) + tr) / n; o[i] = a; } }
  return o;
}
const rollMax = (x, n) => { const o = new Array(x.length).fill(NaN); for (let i = n; i < x.length; i++) { let m = -Infinity; for (let j = i - n; j < i; j++) if (x[j] > m) m = x[j]; o[i] = m; } return o; };

const A = {};
for (const [s, rows] of Object.entries(raw)) {
  if (EXCLUDE.has(s)) continue;
  const lastT = Math.max(...Object.values(raw).map(r => r.at(-1)[0]));
  if (rows.at(-1)[0] < lastT - 2 * 86400e3) { console.log('fora (parou de negociar):', s, new Date(rows.at(-1)[0]).toISOString().slice(0, 10)); continue; }
  const t = rows.map(r => r[0]), o = rows.map(r => r[1]), h = rows.map(r => r[2]), l = rows.map(r => r[3]), c = rows.map(r => r[4]), v = rows.map(r => r[5]), qv = rows.map(r => r[6]);
  const vw = new Array(c.length).fill(NaN); let sq = 0, sv = 0;
  for (let i = 0; i < c.length; i++) { sq += qv[i]; sv += v[i]; if (i >= 24) { sq -= qv[i - 24]; sv -= v[i - 24]; } if (i >= 23 && sv > 0) vw[i] = sq / sv; }
  A[s] = { s, t, o, h, l, c, v, e20: ema(c, 20), e50: ema(c, 50), e200: ema(c, 200), s5: sma(c, 5), atr: atr(h, l, c), r14: rsi(c, 14), r2: rsi(c, 2), vavg: sma(v, 24), vw, dc: {} };
}
const syms = Object.keys(A);
const tMin = Math.max(...syms.map(s => A[s].t[0])), tMax = Math.min(...syms.map(s => A[s].t.at(-1)));
const SPLIT = tMin + 0.6 * (tMax - tMin);
const dc = (a, n) => a.dc[n] || (a.dc[n] = rollMax(a.h, n));

// ── motor: uma posição por ativo; entra na abertura do candle seguinte ao sinal ──
function run(a, sig) {
  const trades = [];
  for (let i = 210; i < a.c.length - 2; i++) {
    const s = sig(a, i); if (!s) continue;
    const e = i + 1, entry = a.o[e] * (1 + SLIP);
    let stop = entry - s.stopDist, target = s.tgtDist ? entry + s.tgtDist : Infinity, exit = null, j;
    for (j = e; j < a.c.length; j++) {
      if (a.l[j] <= stop) { exit = Math.min(a.o[j], stop); break; }          // stop primeiro (conservador), com gap
      if (a.h[j] >= target) { exit = Math.max(a.o[j], target); break; }
      if (s.trail) stop = Math.max(stop, a.c[j] - s.trail * a.atr[j]);
      if (s.exitIf && s.exitIf(a, j)) { exit = a.c[j]; break; }
      if (j - e + 1 >= s.hold) { exit = a.c[j]; break; }
    }
    if (exit === null) break;
    const r = exit * (1 - SLIP) * (1 - FEE) / (entry * (1 + FEE)) - 1;
    trades.push({ s: a.s, t: a.t[e], r, bars: j - e + 1, i });
    i = j;
  }
  return trades;
}
function stats(tr) {
  const n = tr.length; if (!n) return { n: 0 };
  const w = tr.filter(x => x.r > 0), gw = w.reduce((s, x) => s + x.r, 0), gl = -tr.filter(x => x.r <= 0).reduce((s, x) => s + x.r, 0);
  const mean = (gw - gl) / n, byS = {}, byM = {};
  for (const x of tr) { byS[x.s] = (byS[x.s] || 0) + x.r; const m = new Date(x.t).toISOString().slice(0, 7); byM[m] = (byM[m] || 0) + x.r; }
  const sv = Object.values(byS), mv = Object.values(byM);
  return { n, win: +(w.length / n * 100).toFixed(1), mean: +(mean * 100).toFixed(3), pf: +(gl ? gw / gl : 99).toFixed(2),
    ativosPos: `${sv.filter(x => x > 0).length}/${sv.length}`, mesesPos: `${mv.filter(x => x > 0).length}/${mv.length}`,
    horas: +(tr.reduce((s, x) => s + x.bars, 0) / n).toFixed(1) };
}
function evalAll(sig) {
  let all = []; for (const s of syms) all = all.concat(run(A[s], sig));
  return { is: stats(all.filter(x => x.t < SPLIT)), oos: stats(all.filter(x => x.t >= SPLIT)), trades: all };
}
const grid = o => Object.entries(o).reduce((acc, [k, vs]) => acc.flatMap(a => vs.map(v => ({ ...a, [k]: v }))), [{}]);

// ── famílias de estratégia ──
const F = {
  'A. Reversão ao VWAP 24h (atual)': {
    g: { mn: [0.02, 0.03], T: [0.6, 1], S: [0.4, 0.6], H: [4, 12] },
    f: p => (a, i) => { const vw = a.vw[i], c = a.c[i]; if (!(vw > 0)) return null; const d = (c - vw) / vw;
      if (-d < p.mn || -d > 0.08 || !(c > a.o[i])) return null; const gap = vw - c; return { stopDist: p.S * gap, tgtDist: p.T * gap, hold: p.H }; } },
  'B. Rompimento de máxima (Donchian) + tendência': {
    g: { N: [24, 48, 96], k: [2, 3], vol: [0, 1.5], H: [72, 240] },
    f: p => (a, i) => { const hi = dc(a, p.N)[i]; if (!(a.c[i] > hi) || !(a.c[i] > a.e200[i])) return null;
      if (p.vol && !(a.v[i] > p.vol * a.vavg[i])) return null; return { stopDist: p.k * a.atr[i], trail: p.k, hold: p.H }; } },
  'C. Recuo em tendência de alta (pullback)': {
    g: { L: [35, 40, 45], R: [1.5, 2, 3], tr: [0, 3], H: [48, 120] },
    f: p => (a, i) => { if (!(a.e50[i] > a.e200[i] && a.c[i] > a.e200[i])) return null;
      if (!(a.r14[i - 1] < p.L && a.c[i] > a.h[i - 1])) return null; const sd = 2 * a.atr[i];
      return { stopDist: sd, tgtDist: p.tr ? 0 : p.R * sd, trail: p.tr || 0, hold: p.H }; } },
  'D. RSI(2) sobrevendido em tendência': {
    g: { L: [5, 10, 15], H: [24, 72], k: [2, 3] },
    f: p => (a, i) => { if (!(a.c[i] > a.e200[i] && a.r2[i] < p.L)) return null;
      return { stopDist: p.k * a.atr[i], hold: p.H, exitIf: (a, j) => a.c[j] > a.s5[j] }; } },
  'E. Momento (alta acumulada + tendência)': {
    g: { L: [72, 168], th: [0.05, 0.1, 0.2], H: [24, 72], k: [2, 3] },
    f: p => (a, i) => { if (new Date(a.t[i]).getUTCHours() !== 23) return null;
      const ret = a.c[i] / a.c[i - p.L] - 1; if (!(ret > p.th && a.c[i] > a.e200[i])) return null;
      return { stopDist: p.k * a.atr[i], trail: p.k, hold: p.H }; } },
};

// ── contexto de mercado: comprar e segurar ──
function bh(from, to) {
  const rs = syms.map(s => { const a = A[s]; const i0 = a.t.findIndex(t => t >= from), i1 = a.t.findLastIndex(t => t <= to); return a.c[i1] / a.c[i0] - 1; });
  const btc = A.BTCUSDT; const b0 = btc.t.findIndex(t => t >= from), b1 = btc.t.findLastIndex(t => t <= to);
  return { btc: +((btc.c[b1] / btc.c[b0] - 1) * 100).toFixed(1), mediaAtivos: +(rs.reduce((x, y) => x + y, 0) / rs.length * 100).toFixed(1), ativosEmAlta: `${rs.filter(x => x > 0).length}/${rs.length}` };
}
const d = t => new Date(t).toISOString().slice(0, 10);
console.log(`ativos: ${syms.length} · período ${d(tMin)} → ${d(tMax)} · IS até ${d(SPLIT)} · OOS depois`);
console.log('mercado (comprar e segurar, %): IS', JSON.stringify(bh(tMin, SPLIT)), '| OOS', JSON.stringify(bh(SPLIT, tMax)));

if (MODE === 'robust') {
  const BIG = new Set(['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT', 'ADAUSDT', 'LINKUSDT', 'AVAXUSDT', 'LTCUSDT', 'BCHUSDT', 'TRXUSDT', 'XLMUSDT', 'HBARUSDT', 'SUIUSDT', 'NEARUSDT', 'UNIUSDT', 'AAVEUSDT', 'DOTUSDT', 'APTUSDT']);
  // gerador pseudoaleatório determinístico para o controle
  let seed = 1; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const picks = {
    'B rompimento {N:96,k:3,vol:1.5,H:72}': [F['B. Rompimento de máxima (Donchian) + tendência'].f, { N: 96, k: 3, vol: 1.5, H: 72 }, p => ({ stopDist: 0, trail: p.k, hold: p.H })],
    'E momento {L:72,th:0.05,H:72,k:3}': [F['E. Momento (alta acumulada + tendência)'].f, { L: 72, th: 0.05, H: 72, k: 3 }, p => ({ trail: p.k, hold: p.H })],
  };
  for (const [name, [fam, p, exitOf]] of Object.entries(picks)) {
    const sig = fam(p); const r = evalAll(sig); const tr = r.trades;
    console.log(`\n══ ${name}`);
    const byM = {}; for (const x of tr) { const m = new Date(x.t).toISOString().slice(0, 7); (byM[m] ||= []).push(x); }
    console.log('  por mês:', Object.entries(byM).map(([m, xs]) => `${m} n=${xs.length} média ${(xs.reduce((s, x) => s + x.r, 0) / xs.length * 100).toFixed(2)}%`).join(' | '));
    const sorted = tr.map(x => x.r).sort((a, b) => b - a), cut = Math.ceil(sorted.length * 0.05);
    const rest = sorted.slice(cut);
    console.log(`  mediana por operação ${(sorted[Math.floor(sorted.length / 2)] * 100).toFixed(2)}% · média sem os 5% melhores trades ${(rest.reduce((s, x) => s + x, 0) / rest.length * 100).toFixed(3)}%`);
    const big = tr.filter(x => BIG.has(x.s));
    console.log('  só grandes (independem da escolha por volume atual):', JSON.stringify(stats(big)), '| OOS', JSON.stringify(stats(big.filter(x => x.t >= SPLIT))));
    // controle: entradas aleatórias com a mesma saída, só exigindo preço acima da EMA200 — mede se o sinal vale algo além de "estar comprado em alta"
    const nPer = tr.length / syms.length, means = [];
    for (let k = 0; k < 20; k++) {
      let all = [];
      for (const s of syms) {
        const a = A[s]; const eligible = a.c.length - 210; const prob = nPer / eligible * 3;
        all = all.concat(run(a, (a, i) => (a.c[i] > a.e200[i] && rnd() < prob) ? { stopDist: 3 * a.atr[i], trail: 3, hold: p.H } : null));
      }
      means.push(all.reduce((s, x) => s + x.r, 0) / all.length * 100);
    }
    means.sort((a, b) => a - b);
    console.log(`  controle aleatório (mesma saída, 20 sorteios): média ${(means.reduce((s, x) => s + x, 0) / 20).toFixed(3)}%/op · faixa ${means[0].toFixed(3)} a ${means[19].toFixed(3)} · estratégia: ${(tr.reduce((s, x) => s + x.r, 0) / tr.length * 100).toFixed(3)}%`);
  }
  // sensibilidade de B a parâmetros vizinhos
  const fB = F['B. Rompimento de máxima (Donchian) + tendência'].f, nb = [];
  for (const p of grid({ N: [72, 96, 120, 144], k: [2.5, 3, 3.5], vol: [1.2, 1.5, 2], H: [48, 72, 120] })) { const r = evalAll(fB(p)); nb.push({ p, is: r.is.mean, oos: r.oos.mean, n: r.oos.n }); }
  console.log(`\nB vizinhança: ${nb.length} combinações · IS positivas ${nb.filter(x => x.is > 0).length} · OOS positivas ${nb.filter(x => x.oos > 0).length} · pior OOS ${Math.min(...nb.map(x => x.oos))}% · melhor OOS ${Math.max(...nb.map(x => x.oos))}%`);
  const fE = F['E. Momento (alta acumulada + tendência)'].f, ne = [];
  for (const p of grid({ L: [48, 72, 120, 168], th: [0.03, 0.05, 0.08], H: [48, 72, 120], k: [2.5, 3, 3.5] })) { const r = evalAll(fE(p)); ne.push({ is: r.is.mean, oos: r.oos.mean }); }
  console.log(`E vizinhança: ${ne.length} combinações · IS positivas ${ne.filter(x => x.is > 0).length} · OOS positivas ${ne.filter(x => x.oos > 0).length} · pior OOS ${Math.min(...ne.map(x => x.oos))}% · melhor OOS ${Math.max(...ne.map(x => x.oos))}%`);
}

if (MODE === 'regime') {
  // amplitude: fração dos ativos acima da própria EMA200, por hora
  const breadth = new Map();
  for (const s of syms) { const a = A[s]; for (let i = 200; i < a.c.length; i++) { const b = breadth.get(a.t[i]) || [0, 0]; b[0] += a.c[i] > a.e200[i]; b[1]++; breadth.set(a.t[i], b); } }
  const br = t => { const b = breadth.get(t); return b ? b[0] / b[1] : 0; };
  const fE = F['E. Momento (alta acumulada + tendência)'].f, pE = { L: 72, th: 0.05, H: 72, k: 3 };
  const btc = A.BTCUSDT, btcUp = new Map(btc.t.map((t, i) => [t, btc.c[i] > btc.e200[i]]));
  const variants = {
    'E sem filtro': fE(pE),
    'E + amplitude > 50%': (a, i) => br(a.t[i]) > 0.5 ? fE(pE)(a, i) : null,
    'E + amplitude > 60%': (a, i) => br(a.t[i]) > 0.6 ? fE(pE)(a, i) : null,
    'E + BTC acima da EMA200': (a, i) => btcUp.get(a.t[i]) ? fE(pE)(a, i) : null,
  };
  for (const [name, sig] of Object.entries(variants)) {
    const r = evalAll(sig), byM = {};
    for (const x of r.trades) { const m = new Date(x.t).toISOString().slice(0, 7); (byM[m] ||= []).push(x.r); }
    console.log(`\n${name}\n  IS ${JSON.stringify(r.is)}\n  OOS ${JSON.stringify(r.oos)}\n  meses: ${Object.entries(byM).sort().map(([m, xs]) => `${m.slice(5)}:${(xs.reduce((s, x) => s + x, 0) / xs.length * 100).toFixed(1)}%(${xs.length})`).join(' ')}`);
  }
}

if (MODE === 'estats') {
  const fE = F['E. Momento (alta acumulada + tendência)'].f, pE = { L: 72, th: 0.05, H: 72, k: 3 };
  const tr = evalAll(fE(pE)).trades;
  const desc = xs => { const w = xs.filter(x => x.r > 0), l = xs.filter(x => x.r <= 0), aw = w.reduce((s, x) => s + x.r, 0) / w.length, al = -l.reduce((s, x) => s + x.r, 0) / l.length;
    return { n: xs.length, p: +(w.length / xs.length).toFixed(4), ganhoMedio: +aw.toFixed(5), perdaMedia: +al.toFixed(5), b: +(aw / al).toFixed(3), mean: +(xs.reduce((s, x) => s + x.r, 0) / xs.length * 100).toFixed(3) }; };
  console.log('E completo:', JSON.stringify(desc(tr)));
  // filtro pelo histórico recente do próprio ativo: pula o sinal se, nas últimas 1000h, o ativo teve ≥ G sinais E e média negativa
  for (const G of [3, 5]) {
    const kept = [], cut = [];
    for (const x of tr) {
      const prev = tr.filter(y => y.s === x.s && y.t + y.bars * 3600e3 <= x.t && y.t >= x.t - 1000 * 3600e3);
      const bad = prev.length >= G && prev.reduce((s, y) => s + y.r, 0) / prev.length < 0;
      (bad ? cut : kept).push(x);
    }
    const sp = xs => ({ is: stats(xs.filter(x => x.t < SPLIT)), oos: stats(xs.filter(x => x.t >= SPLIT)) });
    console.log(`\nfiltro por ativo (mín. ${G} sinais anteriores com média < 0):`);
    console.log('  mantidos:', JSON.stringify(sp(kept)));
    console.log('  cortados:', JSON.stringify(sp(cut)));
  }
}

if (MODE === 'buckets') {
  // Efeito de cada característica da entrada no resultado da estratégia E (antes/depois da data de corte)
  const fE = F['E. Momento (alta acumulada + tendência)'].f, pE = { L: 72, th: 0.05, H: 72, k: 3 };
  const tr = evalAll(fE(pE)).trades, btc = A.BTCUSDT, btcIdx = new Map(btc.t.map((t, i) => [t, i]));
  for (const x of tr) {
    const a = A[x.s], i = x.i, bi = btcIdx.get(a.t[i]);
    x.f = { mom: a.c[i] / a.c[i - 72] - 1, atrPct: a.atr[i] / a.c[i], vsEma: a.c[i] / a.e200[i] - 1, btc72: bi >= 72 ? btc.c[bi] / btc.c[bi - 72] - 1 : 0 };
  }
  const D = { mom: [0.05, 0.10, 0.20, 0.40, 9], atrPct: [0, 0.015, 0.03, 0.05, 9], vsEma: [0, 0.03, 0.08, 0.15, 9], btc72: [-9, -0.03, 0, 0.03, 9] };
  const m = xs => xs.length ? +(xs.reduce((s, x) => s + x.r, 0) / xs.length * 100).toFixed(2) : null;
  console.log('geral: n', tr.length, 'média', m(tr), '% | IS', m(tr.filter(x => x.t < SPLIT)), '| OOS', m(tr.filter(x => x.t >= SPLIT)));
  const prior = {};
  for (const [d, e] of Object.entries(D)) {
    prior[d] = [];
    for (let b = 0; b < e.length - 1; b++) {
      const xs = tr.filter(x => x.f[d] >= e[b] && x.f[d] < e[b + 1]);
      const is = xs.filter(x => x.t < SPLIT), oos = xs.filter(x => x.t >= SPLIT);
      console.log(`${d.padEnd(6)} [${e[b]}, ${e[b + 1]})  n ${String(xs.length).padStart(4)}  média ${m(xs)}%  IS ${m(is)}% (${is.length})  OOS ${m(oos)}% (${oos.length})`);
      prior[d].push({ lo: e[b], hi: e[b + 1], n: xs.length, mean: xs.length ? +(xs.reduce((s, x) => s + x.r, 0) / xs.length).toFixed(5) : 0,
        is: is.length ? +(is.reduce((s, x) => s + x.r, 0) / is.length).toFixed(5) : null, oos: oos.length ? +(oos.reduce((s, x) => s + x.r, 0) / oos.length).toFixed(5) : null });
    }
  }
  console.log('PRIOR_JSON ' + JSON.stringify(prior));

  // Validação do aprendizado: aprende SÓ com a parte inicial (IS) e aplica na parte final (OOS)
  const isT = tr.filter(x => x.t < SPLIT), oosT = tr.filter(x => x.t >= SPLIT);
  const mu0 = isT.reduce((s, x) => s + x.r, 0) / isT.length, W = 60, LAMBDA = 0.5;
  const bucketOf = (d, v) => D[d].findIndex((lo, b) => b < D[d].length - 1 && v >= lo && v < D[d][b + 1]);
  const learned = {};
  for (const d of Object.keys(D)) learned[d] = D[d].slice(0, -1).map((_, b) => {
    const xs = isT.filter(x => bucketOf(d, x.f[d]) === b), n = xs.length, s = xs.reduce((a, x) => a + x.r, 0);
    return { n, mean: (s + 20 * mu0) / (n + 20) };   // encolhido para a média geral (peso de 20 operações)
  });
  const ev = x => mu0 + LAMBDA * Object.keys(D).reduce((s, d) => s + (learned[d][bucketOf(d, x.f[d])].mean - mu0), 0);
  const conv = x => Math.max(0.25, Math.min(1.75, ev(x) / mu0));
  const ok = oosT.filter(x => ev(x) > 0), blk = oosT.filter(x => ev(x) <= 0);
  const wmean = xs => xs.reduce((s, x) => s + x.r * conv(x), 0) / xs.reduce((s, x) => s + conv(x), 0) * 100;
  console.log(`\nAPRENDIZADO (aprende no IS, testa no OOS): OOS sem aprendizado ${m(oosT)}%/op (n ${oosT.length})`);
  console.log(`  liberadas ${m(ok)}%/op (n ${ok.length}) · bloqueadas ${m(blk)}%/op (n ${blk.length}) · tamanho pela convicção: ${wmean(ok).toFixed(2)}%/op`);
  console.log(`  soma total OOS: sem aprendizado ${(oosT.reduce((s, x) => s + x.r, 0) * 100).toFixed(1)}% · com bloqueio ${(ok.reduce((s, x) => s + x.r, 0) * 100).toFixed(1)}% · com bloqueio+convicção ${(ok.reduce((s, x) => s + x.r * conv(x), 0) * 100).toFixed(1)}%`);
  // por mês, para ver se não é um mês só
  const byM = {}; for (const x of oosT) { const k = new Date(x.t).toISOString().slice(0, 7); (byM[k] ||= { a: [], b: [] }); (ev(x) > 0 ? byM[k].a : byM[k].b).push(x); }
  for (const [k, v] of Object.entries(byM).sort()) console.log(`  ${k}: liberadas ${m(v.a)}% (${v.a.length}) · bloqueadas ${m(v.b)}% (${v.b.length})`);

  // Vagas limitadas: a cada dia entram no máximo K sinais. Quem escolher? (OOS, aprendizado vindo só do IS)
  const byDay = {}; for (const x of oosT) (byDay[new Date(x.t).toISOString().slice(0, 10)] ||= []).push(x);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (const K of [1, 3, 5]) {
    const pick = sorter => { const out = []; for (const xs of Object.values(byDay)) out.push(...xs.slice().sort(sorter).slice(0, K)); return out; };
    const byEv = pick((a, b) => ev(b) - ev(a)), byMom = pick((a, b) => b.f.mom - a.f.mom);
    const rs = []; for (let k = 0; k < 50; k++) { const r = pick(() => rnd() - 0.5); rs.push(r.reduce((s, x) => s + x.r, 0) / r.length * 100); }
    rs.sort((a, b) => a - b);
    console.log(`  K=${K}/dia: pelo aprendizado ${m(byEv)}%/op · pela maior alta (atual) ${m(byMom)}%/op · sorteio ${(rs.reduce((s, x) => s + x, 0) / 50).toFixed(2)}% (faixa ${rs[0].toFixed(2)} a ${rs[49].toFixed(2)})`);
  }
}

if (MODE === 'sim') {
  // Carteira completa com as regras do dashboard, por capital e apetite a risco: vagas, ½/¼/cheio Kelly, teto de risco,
  // tamanho por vaga, fila pela memória de aprendizado (ponto de partida da pesquisa), taxas, derrapagem e US$ 0,01/h de custo.
  const LV = { baixo: { kelly: .25, cap: .02, slot: .6, needEv: true }, medio: { kelly: .5, cap: .04, slot: 1, needEv: true },
    alto: { kelly: .5, cap: .06, slot: 1.5, needEv: false }, gigante: { kelly: 1, cap: .06, slot: 2, needEv: false } };
  const MU0 = 0.0072, EDGES = { mom: [0.05, 0.10, 0.20, 0.40, 9], atrPct: [0, 0.015, 0.03, 0.05, 9], vsEma: [0, 0.03, 0.08, 0.15, 9], btc72: [-9, -0.03, 0, 0.03, 9] };
  const PRIOR = { mom: [[585, 0.00819], [317, 0.01189], [103, -0.01745], [35, -0.08182]], atrPct: [[404, 0.0092], [489, 0.0043], [97, -0.00607], [50, -0.10277]],
    vsEma: [[182, -0.00399], [461, 0.01356], [254, 0.01315], [143, -0.01779]], btc72: [[52, -0.00083], [231, -0.02348], [359, -0.01446], [398, 0.02553]] };
  const bk = (d, v) => { const e = EDGES[d]; for (let b = 0; b < e.length - 1; b++) if (v >= e[b] && v < e[b + 1]) return b; return v < e[0] ? 0 : e.length - 2; };
  const post = (d, b) => { const [pn, pm] = PRIOR[d][b]; return (pn * pm + 20 * MU0) / (pn + 20); };
  const ev = f => MU0 + 0.5 * Object.keys(EDGES).reduce((s, d) => s + post(d, bk(d, f[d])) - MU0, 0);
  const KELLY = 0.348 - 0.652 / 2.753, COST_H = +(process.argv[4] ?? 0.01);   // custo operacional por hora
  const btc = A.BTCUSDT, T = btc.t, idx = {}; for (const s of syms) idx[s] = new Map(A[s].t.map((t, i) => [t, i]));
  function sim(capital, lv) {
    const maxPos = 3 + Math.round((capital - 50) / 50) * 2, k0 = 250;
    let cash = capital, pos = [], peak = capital, dd = 0, tr = [], eqSplit = null, eq = capital, dead = false;
    for (let k = k0; k < T.length; k++) {
      const t = T[k];
      for (const p of [...pos]) {
        const a = A[p.s], i = idx[p.s].get(t); if (i == null || i < p.e) continue;
        let exit = null;
        if (a.l[i] <= p.stop) exit = Math.min(a.o[i], p.stop);
        else { p.stop = Math.max(p.stop, a.c[i] - 3 * a.atr[i]); if (i - p.e + 1 >= 72) exit = a.c[i]; }
        p.last = a.c[i];
        if (exit !== null) { const pr = p.qty * exit * (1 - SLIP), fee = pr * FEE; cash += pr - fee; tr.push((pr - fee) / (p.cost + p.fee) - 1); pos = pos.filter(x => x !== p); }
      }
      cash -= COST_H;
      eq = cash + pos.reduce((s, p) => s + p.qty * p.last, 0);
      if (eqSplit === null && t >= SPLIT) eqSplit = eq;
      peak = Math.max(peak, eq); dd = Math.min(dd, eq / peak - 1);
      if (eq < 5) { dead = true; break; }
      if (new Date(t).getUTCHours() !== 23 || k < 72) continue;
      const cands = [];
      for (const s of syms) {
        const a = A[s], i = idx[s].get(t); if (i == null || i < 210 || i + 1 >= a.c.length) continue;
        const mom = a.c[i] / a.c[i - 72] - 1; if (!(mom > 0.05 && a.c[i] > a.e200[i])) continue;
        const f = { mom, atrPct: a.atr[i] / a.c[i], vsEma: a.c[i] / a.e200[i] - 1, btc72: btc.c[k] / btc.c[k - 72] - 1 };
        cands.push({ s, i, ev: ev(f) });
      }
      cands.sort((x, y) => y.ev - x.ev);
      for (const c of cands) {
        if (pos.length >= maxPos) break;
        if (pos.some(p => p.s === c.s) || (lv.needEv && c.ev <= 0)) continue;
        const a = A[c.s], e = c.i + 1, fill = a.o[e] * (1 + SLIP), stop = fill - 3 * a.atr[c.i]; if (!(stop > 0)) continue;
        const openRisk = pos.reduce((s, p) => s + Math.max(0, p.qty * (p.last - p.stop)) + p.qty * p.stop * FEE, 0);
        const budget = lv.cap * eq - openRisk; if (budget <= 0.01) break;
        const rpu = fill - stop + fill * FEE * 2;
        let qty = Math.min(KELLY * lv.kelly * eq, budget) / rpu, notional = qty * fill;
        const capN = Math.min((cash - 0.05 * eq) / (1 + FEE), eq * 0.95 / maxPos * lv.slot);
        if (notional > capN) { notional = capN; qty = notional / fill; }
        if (notional < 5) continue;
        const fee = notional * FEE; cash -= notional + fee;
        pos.push({ s: c.s, e, qty, cost: notional, fee, stop, last: fill });
      }
    }
    const months = (T[T.length - 1] - T[k0]) / (30.44 * 86400e3), total = eq / capital - 1;
    const mOos = (T[T.length - 1] - SPLIT) / (30.44 * 86400e3);
    return { mes: +((Math.pow(Math.max(eq, 0) / capital, 1 / months) - 1) * 100).toFixed(1), total: +(total * 100).toFixed(1), dd: +(dd * 100).toFixed(1),
      mesOos: eqSplit ? +((Math.pow(eq / eqSplit, 1 / mOos) - 1) * 100).toFixed(1) : null, n: tr.length, acerto: tr.length ? +(tr.filter(r => r > 0).length / tr.length * 100).toFixed(0) : 0, morreu: dead };
  }
  const out = {};
  for (const cap of [50, 100, 150, 200, 250, 300]) { out[cap] = {}; for (const [k, lv] of Object.entries(LV)) out[cap][k] = sim(cap, lv); }
  for (const [cap, r] of Object.entries(out)) console.log(`US$ ${cap}: ` + Object.entries(r).map(([k, v]) => `${k} ${v.mes}%/mês (total ${v.total}%, queda máx ${v.dd}%, OOS ${v.mesOos}%/mês, ${v.n} op, ${v.acerto}% acerto${v.morreu ? ', MORREU' : ''})`).join(' | '));
  console.log('SIM_JSON ' + JSON.stringify(out));
}

if (MODE === 'compare') {
  // Compara estratégias candidatas a substituir a atual (E). Parâmetros escolhidos só no IS; portfólio simulado sem custo operacional.
  const COST_H = +(process.argv[4] ?? 0);
  const btc = A.BTCUSDT, T = btc.t, idx = {}; for (const s of syms) idx[s] = new Map(A[s].t.map((t, i) => [t, i]));
  const btcI = new Map(T.map((t, i) => [t, i]));
  const h23 = (a, i) => new Date(a.t[i]).getUTCHours() === 23;
  const mom = (a, i, L) => i >= L ? a.c[i] / a.c[i - L] - 1 : -1;
  const RK = new Map();   // ranking cross-sectional de retorno em L horas, por horário
  const rankAt = (t, L) => { const key = t + '|' + L; if (RK.has(key)) return RK.get(key);
    const rs = []; for (const s of syms) { const a = A[s], i = idx[s].get(t); if (i != null && i >= Math.max(L, 210)) rs.push([s, a.c[i] / a.c[i - L] - 1]); }
    rs.sort((x, y) => y[1] - x[1]); const m = new Map(rs.map(([s], r) => [s, r])); RK.set(key, m); return m; };
  const exitOf = (a, i, p) => ({ stopDist: 3 * a.atr[i], trail: 3, hold: p.H });
  const S8 = {
    E:  { nome: 'Momento + tendência (atual)', g: { L: [72, 168], th: [0.05, 0.1], H: [72, 168] },
          f: p => (a, i) => h23(a, i) && mom(a, i, p.L) > p.th && a.c[i] > a.e200[i] ? exitOf(a, i, p) : null },
    XS: { nome: 'Força relativa (líderes do dia)', g: { L: [72, 168], N: [3, 5, 8], H: [72, 168] },
          f: p => (a, i) => h23(a, i) && a.c[i] > a.e200[i] && mom(a, i, p.L) > 0 && rankAt(a.t[i], p.L).get(a.s) < p.N ? exitOf(a, i, p) : null },
    B:  { nome: 'Rompimento de máxima (Donchian)', g: { N: [48, 96], vol: [0, 1.5], H: [72, 168] },
          f: p => (a, i) => a.c[i] > dc(a, p.N)[i] && a.c[i] > a.e200[i] && (!p.vol || a.v[i] > p.vol * a.vavg[i]) ? exitOf(a, i, p) : null },
    // variações da atual, com parâmetros fixos (testadas na carteira, separando os dois períodos)
    E7: { nome: 'Momento de 7 dias + tendência', g: { L: [168], th: [0.05], H: [72] },
          f: p => (a, i) => h23(a, i) && mom(a, i, p.L) > p.th && a.c[i] > a.e200[i] ? exitOf(a, i, p) : null },
    EL: { nome: 'Momento + tendência, prazo de 7 dias', g: { L: [72], th: [0.05], H: [168] },
          f: p => (a, i) => h23(a, i) && mom(a, i, p.L) > p.th && a.c[i] > a.e200[i] ? exitOf(a, i, p) : null },
    E10: { nome: 'Momento forte (alta > 10%) + tendência', g: { L: [72], th: [0.10], H: [72] },
          f: p => (a, i) => h23(a, i) && mom(a, i, p.L) > p.th && a.c[i] > a.e200[i] ? exitOf(a, i, p) : null },
    BE: { nome: 'Momento + rompimento (híbrida)', g: { N: [48, 96, 168], th: [0.05, 0.1], H: [72, 168] },
          f: p => (a, i) => h23(a, i) && a.c[i] > dc(a, p.N)[i] && mom(a, i, 72) > p.th && a.c[i] > a.e200[i] ? exitOf(a, i, p) : null },
  };
  // características da entrada e faixas da memória de aprendizado (iguais às do dashboard)
  const EDGES = { mom: [0.05, 0.10, 0.20, 0.40, 9], atrPct: [0, 0.015, 0.03, 0.05, 9], vsEma: [0, 0.03, 0.08, 0.15, 9], btc72: [-9, -0.03, 0, 0.03, 9] };
  EDGES.mom[0] = -9;   // estratégias que não exigem alta mínima de 72h também caem na primeira faixa
  const feat = (a, i) => { const bi = btcI.get(a.t[i]); return { mom: mom(a, i, 72), atrPct: a.atr[i] / a.c[i], vsEma: a.c[i] / a.e200[i] - 1, btc72: bi >= 72 ? btc.c[bi] / btc.c[bi - 72] - 1 : 0 }; };
  const bk = (d, v) => { const e = EDGES[d]; for (let b = 0; b < e.length - 1; b++) if (v >= e[b] && v < e[b + 1]) return b; return v < e[0] ? 0 : e.length - 2; };
  const mean = xs => xs.length ? xs.reduce((s, x) => s + x.r, 0) / xs.length : null;
  // ponto de partida conservador: em cada faixa, o PIOR dos dois períodos
  function priorsOf(tr) {
    const isT = tr.filter(x => x.t < SPLIT), oosT = tr.filter(x => x.t >= SPLIT), pess = (a, b) => a == null ? b : b == null ? a : Math.min(a, b);
    const mu0 = pess(mean(isT), mean(oosT)), pr = {};
    for (const d of Object.keys(EDGES)) pr[d] = EDGES[d].slice(0, -1).map((_, b) => {
      const f = x => bk(d, x.f[d]) === b, xs = tr.filter(f); return [xs.length, +(pess(mean(isT.filter(f)), mean(oosT.filter(f))) ?? mu0).toFixed(5)];
    });
    const w = tr.filter(x => x.r > 0), l = tr.filter(x => x.r <= 0);
    return { mu0: +mu0.toFixed(5), prior: pr, p: +(w.length / tr.length).toFixed(4), aw: +mean(w).toFixed(5), al: +(-mean(l)).toFixed(5) };
  }
  const evOf = (P, f) => P.mu0 + 0.5 * Object.keys(EDGES).reduce((s, d) => { const [n, m] = P.prior[d][bk(d, f[d])]; return s + (n * m + 20 * P.mu0) / (n + 20) - P.mu0; }, 0);
  const LV = { baixo: { kelly: .25, cap: .02, slot: .6, needEv: true }, medio: { kelly: .5, cap: .04, slot: 1, needEv: true },
    alto: { kelly: .5, cap: .06, slot: 1.5, needEv: false }, gigante: { kelly: 1, cap: .06, slot: 2, needEv: false } };
  function sim(sig, P, capital, lv) {
    const maxPos = 3 + Math.round((capital - 50) / 50) * 2, k0 = 250, KELLY = P.p - (1 - P.p) / (P.aw / P.al);
    let cash = capital, pos = [], peak = capital, dd = 0, tr = [], eq = capital, dead = false, eqSplit = null;
    for (let k = k0; k < T.length; k++) {
      const t = T[k];
      if (eqSplit === null && t >= SPLIT) eqSplit = eq;
      for (const p of [...pos]) {
        const a = A[p.s], i = idx[p.s].get(t); if (i == null || i < p.e) continue;
        let exit = null;
        if (a.l[i] <= p.stop) exit = Math.min(a.o[i], p.stop);
        else { p.stop = Math.max(p.stop, a.c[i] - p.trail * a.atr[i]); if (i - p.e + 1 >= p.hold) exit = a.c[i]; }
        p.last = a.c[i];
        if (exit !== null) { const pr = p.qty * exit * (1 - SLIP), fee = pr * FEE; cash += pr - fee; tr.push((pr - fee) / (p.cost + p.fee) - 1); pos = pos.filter(x => x !== p); }
      }
      cash -= COST_H;
      eq = cash + pos.reduce((s, p) => s + p.qty * p.last, 0);
      peak = Math.max(peak, eq); dd = Math.min(dd, eq / peak - 1);
      if (eq < 5) { dead = true; break; }
      if (pos.length >= maxPos) continue;
      const cands = [];
      for (const s of syms) { const a = A[s], i = idx[s].get(t); if (i == null || i < 210 || i + 1 >= a.c.length || pos.some(p => p.s === s)) continue;
        const x = sig(a, i); if (x) cands.push({ s, i, x, ev: evOf(P, feat(a, i)) }); }
      cands.sort((x, y) => y.ev - x.ev);
      for (const c of cands) {
        if (pos.length >= maxPos) break;
        if (lv.needEv && c.ev <= 0) continue;
        const a = A[c.s], e = c.i + 1, fill = a.o[e] * (1 + SLIP), stop = fill - c.x.stopDist; if (!(stop > 0)) continue;
        const openRisk = pos.reduce((s, p) => s + Math.max(0, p.qty * (p.last - p.stop)) + p.qty * p.stop * FEE, 0);
        const budget = lv.cap * eq - openRisk; if (budget <= 0.01) break;
        const rpu = fill - stop + fill * FEE * 2;
        let qty = Math.min(KELLY * lv.kelly * eq, budget) / rpu, notional = qty * fill;
        const capN = Math.min((cash - 0.05 * eq) / (1 + FEE), eq * 0.95 / maxPos * lv.slot);
        if (notional > capN) { notional = capN; qty = notional / fill; }
        if (notional < 5) continue;
        const fee = notional * FEE; cash -= notional + fee;
        pos.push({ s: c.s, e, qty, cost: notional, fee, stop, trail: c.x.trail, hold: c.x.hold, last: fill });
      }
    }
    const MO = 30.44 * 86400e3, months = (T[T.length - 1] - T[k0]) / MO, mIs = (SPLIT - T[k0]) / MO, mOos = (T[T.length - 1] - SPLIT) / MO;
    const g = (a, b, m) => a > 0 && b > 0 ? +((Math.pow(b / a, 1 / m) - 1) * 100).toFixed(1) : -100;
    return { mes: +((Math.pow(Math.max(eq, 0.01) / capital, 1 / months) - 1) * 100).toFixed(1), total: +((eq / capital - 1) * 100).toFixed(1), dd: +(dd * 100).toFixed(1),
      mesIs: eqSplit ? g(capital, eqSplit, mIs) : -100, mesOos: eqSplit ? g(eqSplit, eq, mOos) : -100,
      n: tr.length, acerto: tr.length ? +(tr.filter(r => r > 0).length / tr.length * 100).toFixed(0) : 0, morreu: dead };
  }
  const OUT = {};
  for (const [key, st] of Object.entries(S8)) {
    const all = grid(st.g).map(p => ({ p, ...evalAll(st.f(p)) })), rows = all.filter(r => r.is.n >= 60);
    if (!rows.length) { console.log(`\n${key} · ${st.nome}: sinais insuficientes (máx. ${Math.max(...all.map(r => r.is.n || 0))} no IS) — descartada`); continue; }
    const best = rows.sort((x, y) => y.is.mean - x.is.mean)[0];
    const robust = rows.filter(r => r.oos.n >= 50 && r.oos.mean > 0).length;
    for (const x of best.trades) x.f = feat(A[x.s], x.i);
    const P = priorsOf(best.trades), sig = st.f(best.p);
    const simr = {}; for (const cap of [50, 100, 150, 200, 250, 300]) { simr[cap] = {}; for (const [lk, lv] of Object.entries(LV)) simr[cap][lk] = sim(sig, P, cap, lv); }
    OUT[key] = { nome: st.nome, params: best.p, is: best.is, oos: best.oos, robustez: `${robust}/${rows.length}`, ...P, sim: simr };
    console.log(`\n${key} · ${st.nome}  params ${JSON.stringify(best.p)}  (${robust}/${rows.length} combinações positivas fora da amostra)`);
    console.log('  IS ', JSON.stringify(best.is)); console.log('  OOS', JSON.stringify(best.oos));
    for (const lk of ['medio', 'alto', 'gigante']) console.log(`  carteira (${lk}), %/mês antes | depois de 26/ago: ` + Object.entries(simr).map(([c, r]) => `US$${c} ${r[lk].mesIs}|${r[lk].mesOos}`).join(' · '));
  }
  fs.writeFileSync(process.argv[5] || 'compare.json', JSON.stringify(OUT));
}

if (MODE === 'grid') {
  for (const [name, fam] of Object.entries(F)) {
    const rows = grid(fam.g).map(p => ({ p, ...evalAll(fam.f(p)) }));
    const ok = rows.filter(r => r.is.n >= 150);
    const best = ok.sort((x, y) => y.is.mean - x.is.mean)[0];
    const oosPos = rows.filter(r => r.oos.n >= 50 && r.oos.mean > 0).length;
    const med = rows.map(r => r.oos.mean ?? 0).sort((x, y) => x - y)[Math.floor(rows.length / 2)];
    console.log(`\n${name}  (${rows.length} combinações · ${oosPos} positivas fora da amostra · mediana OOS ${med}%/operação)`);
    if (best) console.log('  melhor na escolha (IS):', JSON.stringify(best.p), '\n    IS ', JSON.stringify(best.is), '\n    OOS', JSON.stringify(best.oos));
  }
}
