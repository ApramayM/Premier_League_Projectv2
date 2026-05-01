import { useState, useEffect } from 'react';
import {
  Settings, Wallet, Trophy, TrendingUp, TrendingDown,
  Check, X, RefreshCw, SlidersHorizontal, ChevronDown, ChevronUp,
} from 'lucide-react';

// ─── Palette ───────────────────────────────────────────────────────────────
const P = {
  bg:      '#38003C',
  surface: '#4a1050',
  card:    'rgba(255,255,255,0.07)',
  border:  'rgba(255,255,255,0.12)',
  accent:  '#00FF85',
  text:    '#F4F6F8',
  muted:   'rgba(244,246,248,0.55)',
  loss:    '#FF4757',
};

// ─── Teams & Ratings (recalibrated from 2025/26 standings, MW32) ───────────
const TEAMS = [
  'Arsenal','Aston Villa','Bournemouth','Brentford','Brighton','Chelsea',
  'Crystal Palace','Everton','Fulham','Ipswich Town','Leicester City','Liverpool',
  'Man City','Man Utd','Newcastle','Nottm Forest','Southampton','Tottenham',
  'West Ham','Wolves',
];

const TEAM_RATINGS = {
  'Man City':       92,  // 5W streak, beat Chelsea 3-0, Carabao Cup winners
  'Arsenal':        88,  // Table leaders (70 pts) but form dipping: 3L in 4
  'Man Utd':        80,  // 3rd place, own 5W streak
  'Aston Villa':    78,  // 4th, solid
  'Liverpool':      75,  // 5th but slumping (3 straight defeats)
  'Bournemouth':    74,  // Upset Arsenal 2-1 at home, LWWWW
  'West Ham':       73,  // 5W streak, 4-0 Wolves demolition
  'Chelsea':        70,  // 6th but free fall: 4L in 5, injury crisis
  'Brentford':      70,  // 7th, consistent
  'Brighton':       69,  // Beat Burnley 2-0, solid
  'Everton':        68,  // 8th, level pts with Brentford
  'Fulham':         67,  // 9th, solid mid-table
  'Newcastle':      65,  // 12th, inconsistent
  'Leicester City': 63,  // Promoted proxy
  'Crystal Palace': 63,  // 14th
  'Nottm Forest':   62,  // 16th, declining
  'Ipswich Town':   58,  // Promoted proxy
  'Wolves':         59,  // Conceded 4 vs West Ham
  'Southampton':    57,  // Promoted proxy
  'Tottenham':      55,  // Relegation crisis, 18th (30 pts)
};

// ─── Odds Engine (inverse probability + 5% bookmaker margin) ───────────────
function computeOdds(homeRating, awayRating) {
  const HA = 1.12;
  const base = homeRating * HA + awayRating + 30;
  const pH = (homeRating * HA) / base;
  const pA = awayRating / base;
  const pD = 1 - pH - pA;
  const K = 1.053;
  return {
    home: +(1 / (pH / K)).toFixed(2),
    draw: +(1 / (pD / K)).toFixed(2),
    away: +(1 / (pA / K)).toFixed(2),
  };
}

// ─── Match Engine (Poisson simulation) ─────────────────────────────────────
function samplePoisson(lambda) {
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

function simulateMatch(homeRating, awayRating) {
  const hGoals = samplePoisson(1.5 * homeRating / 80);
  const aGoals = samplePoisson(1.1 * awayRating / 80);
  const result = hGoals > aGoals ? 'H' : hGoals < aGoals ? 'A' : 'D';
  return { hGoals, aGoals, result };
}

// ─── Round-Robin Fixture Generator (deterministic by matchweek seed) ────────
function generateFixtures(matchweek) {
  const teams = [...TEAMS];
  // Seed a deterministic shuffle using matchweek number
  function seededRand(seed) {
    let s = seed;
    return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
  }
  const rand = seededRand(matchweek * 7919);
  for (let i = teams.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [teams[i], teams[j]] = [teams[j], teams[i]];
  }
  const fixtures = [];
  for (let i = 0; i < teams.length; i += 2) {
    const home = teams[i], away = teams[i + 1];
    const odds = computeOdds(TEAM_RATINGS[home], TEAM_RATINGS[away]);
    fixtures.push({ home, away, odds, result: null });
  }
  return fixtures;
}

// ─── Matchweek 32 fixtures (April 10-13 2026, real + spec-team mapped) ─────
function buildMW32() {
  const pairs = [
    ['West Ham',      'Wolves'],           // Real: West Ham 4-0 Wolves
    ['Arsenal',       'Bournemouth'],      // Real: Arsenal 1-2 Bournemouth
    ['Brentford',     'Everton'],          // Real: 2-2
    ['Liverpool',     'Fulham'],           // Real: Liverpool 2-0 Fulham
    ['Crystal Palace','Newcastle'],        // Real: Palace 2-1 Newcastle
    ['Chelsea',       'Man City'],         // Real: Chelsea 0-3 Man City
    ['Nottm Forest',  'Aston Villa'],      // Real fixture
    ['Southampton',   'Brighton'],         // Mapped: Burnley→Southampton
    ['Ipswich Town',  'Tottenham'],        // Mapped: Sunderland→Ipswich
    ['Man Utd',       'Leicester City'],   // Mapped: Leeds→Leicester
  ];
  return pairs.map(([home, away]) => ({
    home, away,
    odds: computeOdds(TEAM_RATINGS[home], TEAM_RATINGS[away]),
    result: null,
  }));
}

const MW32_FIXTURES = buildMW32();

// ─── localStorage hook ──────────────────────────────────────────────────────
function useLocalStorage(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : defaultValue;
    } catch { return defaultValue; }
  });
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue];
}

// ─── Global style injection ─────────────────────────────────────────────────
function useGlobalStyles() {
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      *, *::before, *::after { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; background: ${P.bg}; font-family: system-ui, -apple-system, sans-serif; }
      ::-webkit-scrollbar { display: none; }
      * { scrollbar-width: none; -ms-overflow-style: none; }
      button { cursor: pointer; border: none; outline: none; }
      input[type=range] { accent-color: ${P.accent}; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function Header({ balance, view, setView, onAdmin }) {
  return (
    <div style={{
      background: P.bg,
      borderBottom: `1px solid ${P.border}`,
      position: 'sticky', top: 0, zIndex: 10,
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Trophy size={22} color={P.accent} />
          <span style={{ color: P.text, fontWeight: 700, fontSize: 18, letterSpacing: '-0.5px' }}>PuntLite</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: P.card, border: `1px solid ${P.border}`,
            borderRadius: 20, padding: '5px 12px',
          }}>
            <Wallet size={14} color={P.accent} />
            <span style={{ color: P.text, fontWeight: 700, fontSize: 15 }}>${balance.toFixed(2)}</span>
          </div>
          <button
            onClick={onAdmin}
            style={{ background: 'transparent', padding: 4, display: 'flex', color: P.muted }}
          >
            <Settings size={20} />
          </button>
        </div>
      </div>
      {/* Nav tabs */}
      <div style={{ display: 'flex', borderTop: `1px solid ${P.border}` }}>
        {['matches', 'history'].map(tab => (
          <button
            key={tab}
            onClick={() => setView(tab)}
            style={{
              flex: 1, padding: '10px 0', background: 'transparent',
              color: view === tab ? P.accent : P.muted,
              fontWeight: view === tab ? 700 : 500,
              fontSize: 13, textTransform: 'capitalize', letterSpacing: '0.5px',
              borderBottom: view === tab ? `2px solid ${P.accent}` : '2px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            {tab === 'matches' ? 'Matchweek' : 'History'}
          </button>
        ))}
      </div>
    </div>
  );
}

function MatchCard({ fixture, fixtureIndex, matchweek, openBets, balance, betUnit, onBet }) {
  const { home, away, odds, result } = fixture;
  const settled = result !== null;

  const activeBet = openBets.find(b => b.fixtureIndex === fixtureIndex && b.matchweek === matchweek);

  const LABELS = { H: home, D: 'Draw', A: away };
  const KEYS = ['H', 'D', 'A'];
  const oddsValues = [odds.home, odds.draw, odds.away];

  const resultLabel = result
    ? result === 'H' ? `${fixture.hGoals}–${fixture.aGoals}` : result === 'A' ? `${fixture.hGoals}–${fixture.aGoals}` : `${fixture.hGoals}–${fixture.aGoals}`
    : null;

  return (
    <div style={{
      background: P.card, border: `1px solid ${P.border}`,
      borderRadius: 12, padding: '14px 14px 12px', margin: '8px 12px',
    }}>
      {/* Teams row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ color: P.text, fontWeight: 600, fontSize: 14, flex: 1 }}>{home}</span>
        {settled ? (
          <span style={{
            color: P.accent, fontWeight: 700, fontSize: 15,
            background: 'rgba(0,255,133,0.12)', borderRadius: 8, padding: '2px 10px',
          }}>
            {fixture.hGoals}–{fixture.aGoals}
          </span>
        ) : (
          <span style={{ color: P.muted, fontSize: 12, fontWeight: 500 }}>vs</span>
        )}
        <span style={{ color: P.text, fontWeight: 600, fontSize: 14, flex: 1, textAlign: 'right' }}>{away}</span>
      </div>

      {/* Odds buttons */}
      <div style={{ display: 'flex', gap: 6 }}>
        {KEYS.map((key, i) => {
          const isActive = activeBet?.selection === key;
          const isWinner = settled && result === key;
          const isLoser = settled && activeBet?.selection === key && result !== key;
          return (
            <button
              key={key}
              onClick={() => !settled && onBet(fixtureIndex, key, oddsValues[i])}
              disabled={settled || (balance < betUnit && !isActive)}
              style={{
                flex: 1, padding: '8px 4px', borderRadius: 8, fontSize: 11,
                fontWeight: 700, display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 2, transition: 'all 0.15s',
                background: isActive
                  ? `rgba(0,255,133,0.18)`
                  : isWinner ? `rgba(0,255,133,0.12)` : `rgba(255,255,255,0.06)`,
                border: `1px solid ${isActive ? P.accent : isWinner ? P.accent : P.border}`,
                color: isActive ? P.accent : isWinner ? P.accent : isLoser ? P.loss : P.text,
                opacity: (settled && !isActive && !isWinner) ? 0.5 : 1,
                cursor: settled ? 'default' : (balance < betUnit && !isActive) ? 'not-allowed' : 'pointer',
              }}
            >
              <span style={{ fontSize: 9, color: isActive || isWinner ? P.accent : P.muted }}>{LABELS[key]}</span>
              <span>{oddsValues[i]}</span>
            </button>
          );
        })}
      </div>

      {/* Active bet badge */}
      {activeBet && (
        <div style={{
          marginTop: 8, display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(0,255,133,0.08)', borderRadius: 6, padding: '5px 8px',
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: P.accent }} />
          <span style={{ color: P.accent, fontSize: 11, fontWeight: 600 }}>
            ${betUnit.toFixed(2)} on {LABELS[activeBet.selection]} @ {activeBet.odds}
          </span>
          <span style={{ color: P.muted, fontSize: 11, marginLeft: 'auto' }}>
            → ${(betUnit * activeBet.odds).toFixed(2)}
          </span>
        </div>
      )}
    </div>
  );
}

function MatchweekView({ matchweek, fixtures, openBets, balance, betUnit, onBet }) {
  return (
    <div style={{ paddingBottom: openBets.length > 0 ? 90 : 20 }}>
      <div style={{
        padding: '10px 16px 4px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ color: P.muted, fontSize: 12, fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
          Matchweek {matchweek}
        </span>
        <span style={{ color: P.muted, fontSize: 11 }}>
          Tap odds to bet ${betUnit.toFixed(2)}
        </span>
      </div>
      {fixtures.map((f, i) => (
        <MatchCard
          key={i}
          fixture={f}
          fixtureIndex={i}
          matchweek={matchweek}
          openBets={openBets}
          balance={balance}
          betUnit={betUnit}
          onBet={onBet}
        />
      ))}
    </div>
  );
}

function BetSlip({ openBets, betUnit, onSettle }) {
  if (openBets.length === 0) return null;
  const totalStaked = +(openBets.length * betUnit).toFixed(2);
  const totalReturn = +(openBets.reduce((s, b) => s + b.stake * b.odds, 0)).toFixed(2);
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 430,
      background: P.surface, borderTop: `2px solid ${P.accent}`,
      padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
      zIndex: 20,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ color: P.text, fontWeight: 700, fontSize: 14 }}>
          {openBets.length} open {openBets.length === 1 ? 'bet' : 'bets'}
        </div>
        <div style={{ color: P.muted, fontSize: 11, marginTop: 2 }}>
          ${totalStaked} staked · max return ${totalReturn}
        </div>
      </div>
    </div>
  );
}

function HistoryView({ settledBets }) {
  if (settledBets.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', paddingTop: 80, gap: 12,
      }}>
        <TrendingUp size={40} color={P.border} />
        <span style={{ color: P.muted, fontSize: 14 }}>No settled bets yet</span>
        <span style={{ color: P.muted, fontSize: 12 }}>Place bets then settle via the admin panel</span>
      </div>
    );
  }

  const byWeek = settledBets.reduce((acc, bet) => {
    const key = `MW ${bet.matchweek}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(bet);
    return acc;
  }, {});

  return (
    <div style={{ paddingBottom: 20 }}>
      {Object.entries(byWeek).map(([week, bets]) => {
        const weekPnl = bets.reduce((s, b) => s + b.pnl, 0);
        return (
          <div key={week}>
            <div style={{
              padding: '10px 16px 4px', display: 'flex',
              alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ color: P.muted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                {week}
              </span>
              <span style={{
                fontSize: 12, fontWeight: 700,
                color: weekPnl >= 0 ? P.accent : P.loss,
              }}>
                {weekPnl >= 0 ? '+' : ''}{weekPnl.toFixed(2)}
              </span>
            </div>
            {bets.map((bet, i) => (
              <div key={i} style={{
                background: P.card, border: `1px solid ${bet.status === 'won' ? 'rgba(0,255,133,0.25)' : 'rgba(255,71,87,0.25)'}`,
                borderRadius: 10, margin: '6px 12px', padding: '10px 12px',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: bet.status === 'won' ? 'rgba(0,255,133,0.15)' : 'rgba(255,71,87,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {bet.status === 'won'
                    ? <Check size={14} color={P.accent} />
                    : <X size={14} color={P.loss} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: P.text, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {bet.home} vs {bet.away}
                  </div>
                  <div style={{ color: P.muted, fontSize: 11, marginTop: 2 }}>
                    {bet.selectionLabel} @ {bet.odds} · ${bet.stake}
                    {' · '}{bet.hGoals}–{bet.aGoals}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ color: bet.pnl >= 0 ? P.accent : P.loss, fontWeight: 700, fontSize: 14 }}>
                    {bet.pnl >= 0 ? '+' : ''}{bet.pnl.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function AdminPanel({ open, onClose, betUnit, setBetUnit, matchweek, onGenerate, onSettle, openBets, onReset }) {
  if (!open) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 30 }}
      />
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 430,
        background: P.surface, borderTop: `2px solid ${P.border}`,
        borderRadius: '16px 16px 0 0',
        padding: '20px 20px 36px',
        zIndex: 40,
      }}>
        {/* Handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: P.border, margin: '0 auto 20px' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <SlidersHorizontal size={18} color={P.accent} />
          <span style={{ color: P.text, fontWeight: 700, fontSize: 16 }}>Admin Panel</span>
          <span style={{ color: P.muted, fontSize: 12, marginLeft: 4 }}>MW {matchweek}</span>
        </div>

        {/* Bet Unit Slider */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: P.muted, fontSize: 13 }}>Bet Unit</span>
            <span style={{ color: P.accent, fontWeight: 700, fontSize: 14 }}>${betUnit.toFixed(2)}</span>
          </div>
          <input
            type="range" min="0.5" max="20" step="0.5"
            value={betUnit}
            onChange={e => setBetUnit(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ color: P.muted, fontSize: 10 }}>$0.50</span>
            <span style={{ color: P.muted, fontSize: 10 }}>$20</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Settle Results */}
          <button
            onClick={() => { onSettle(); onClose(); }}
            disabled={openBets.length === 0}
            style={{
              background: openBets.length > 0 ? P.accent : 'rgba(255,255,255,0.08)',
              color: openBets.length > 0 ? P.bg : P.muted,
              padding: '14px 16px', borderRadius: 10, fontWeight: 700, fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: openBets.length === 0 ? 0.5 : 1,
            }}
          >
            <Check size={16} />
            Settle Results {openBets.length > 0 ? `(${openBets.length} bets)` : ''}
          </button>

          {/* Generate Next Matchweek */}
          <button
            onClick={() => { onGenerate(); onClose(); }}
            style={{
              background: 'rgba(255,255,255,0.06)', border: `1px solid ${P.border}`,
              color: P.text, padding: '14px 16px', borderRadius: 10,
              fontWeight: 600, fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <RefreshCw size={16} />
            Generate Matchweek {matchweek + 1}
          </button>

          {/* Reset */}
          <button
            onClick={() => { onReset(); onClose(); }}
            style={{
              background: 'transparent', color: P.loss,
              padding: '12px 16px', borderRadius: 10,
              fontWeight: 600, fontSize: 13,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            Reset All Data
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Root Component ─────────────────────────────────────────────────────────
export default function PuntLite() {
  useGlobalStyles();

  const [balance, setBalance]         = useLocalStorage('pl_balance', 100);
  const [openBets, setOpenBets]       = useLocalStorage('pl_openBets', []);
  const [settledBets, setSettledBets] = useLocalStorage('pl_settledBets', []);
  const [betUnit, setBetUnit]         = useLocalStorage('pl_betUnit', 1);
  const [matchweek, setMatchweek]     = useLocalStorage('pl_matchweek', 32);
  const [fixtures, setFixtures]       = useLocalStorage('pl_fixtures', MW32_FIXTURES);
  const [view, setView]               = useState('matches');
  const [adminOpen, setAdminOpen]     = useState(false);

  function placeBet(fixtureIndex, selection, odds) {
    const existing = openBets.find(b => b.fixtureIndex === fixtureIndex && b.matchweek === matchweek);
    if (existing) {
      // Cancel bet — refund stake
      setBalance(b => +(b + existing.stake).toFixed(2));
      setOpenBets(prev => prev.filter(b => !(b.fixtureIndex === fixtureIndex && b.matchweek === matchweek)));
      return;
    }
    if (balance < betUnit) return;
    const fixture = fixtures[fixtureIndex];
    const selectionLabel = selection === 'H' ? fixture.home : selection === 'A' ? fixture.away : 'Draw';
    const bet = {
      id: `${matchweek}-${fixtureIndex}-${Date.now()}`,
      matchweek, fixtureIndex,
      home: fixture.home, away: fixture.away,
      selection, selectionLabel, odds, stake: betUnit,
    };
    setBalance(b => +(b - betUnit).toFixed(2));
    setOpenBets(prev => [...prev, bet]);
  }

  function settleResults() {
    const results = fixtures.map(f =>
      simulateMatch(TEAM_RATINGS[f.home], TEAM_RATINGS[f.away])
    );

    // Update fixture display with scores
    setFixtures(prev => prev.map((f, i) => ({
      ...f,
      result: results[i].result,
      hGoals: results[i].hGoals,
      aGoals: results[i].aGoals,
    })));

    // Resolve bets
    let balanceDelta = 0;
    const resolved = openBets.map(bet => {
      const r = results[bet.fixtureIndex];
      const won = r.result === bet.selection;
      const pnl = won ? +(bet.stake * (bet.odds - 1)).toFixed(2) : -bet.stake;
      if (won) balanceDelta += +(bet.stake * bet.odds).toFixed(2);
      return {
        ...bet, status: won ? 'won' : 'lost',
        result: r.result, hGoals: r.hGoals, aGoals: r.aGoals, pnl,
      };
    });

    setBalance(b => +(b + balanceDelta).toFixed(2));
    setSettledBets(prev => [...resolved, ...prev]);
    setOpenBets([]);
  }

  function generateNextMatchweek() {
    const next = matchweek + 1;
    setMatchweek(next);
    setFixtures(generateFixtures(next));
  }

  function resetAll() {
    setBalance(100);
    setOpenBets([]);
    setSettledBets([]);
    setBetUnit(1);
    setMatchweek(32);
    setFixtures(MW32_FIXTURES);
  }

  return (
    <div style={{
      maxWidth: 430, margin: '0 auto', minHeight: '100dvh',
      background: P.bg, color: P.text, position: 'relative',
    }}>
      <Header
        balance={balance}
        view={view}
        setView={setView}
        onAdmin={() => setAdminOpen(true)}
      />

      <div style={{ overflowY: 'auto' }}>
        {view === 'matches' ? (
          <MatchweekView
            matchweek={matchweek}
            fixtures={fixtures}
            openBets={openBets}
            balance={balance}
            betUnit={betUnit}
            onBet={placeBet}
          />
        ) : (
          <HistoryView settledBets={settledBets} />
        )}
      </div>

      <BetSlip openBets={openBets} betUnit={betUnit} onSettle={settleResults} />

      <AdminPanel
        open={adminOpen}
        onClose={() => setAdminOpen(false)}
        betUnit={betUnit}
        setBetUnit={setBetUnit}
        matchweek={matchweek}
        onGenerate={generateNextMatchweek}
        onSettle={settleResults}
        openBets={openBets}
        onReset={resetAll}
      />
    </div>
  );
}
