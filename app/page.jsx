"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, CircleDollarSign, Clock3, Database, RefreshCw, Trophy, Wallet } from "lucide-react";

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function label(market, pick) {
  if (pick === "home") return market.home_team;
  if (pick === "away") return market.away_team;
  return "Draw";
}

function oddsFor(market, pick) {
  if (pick === "home") return market.best_home_odds;
  if (pick === "draw") return market.best_draw_odds;
  return market.best_away_odds;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers || {}) },
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(payload.error || "Request failed");
  return payload;
}

export default function Home() {
  const [profile, setProfile] = useState(null);
  const [markets, setMarkets] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [balance, setBalance] = useState(100);
  const [checks, setChecks] = useState([]);
  const [stake, setStake] = useState(1);
  const [tab, setTab] = useState("markets");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const openPredictions = useMemo(
    () => predictions.filter((prediction) => prediction.status === "locked"),
    [predictions]
  );

  async function load(existingProfile = profile) {
    setLoading(true);
    const [health, marketPayload, predictionPayload] = await Promise.all([
      api("/api/health"),
      api("/api/markets"),
      existingProfile ? api(`/api/predictions?profileId=${existingProfile.id}`) : Promise.resolve({ predictions: [], balance: 100 }),
    ]);
    setChecks(health.checks || []);
    setMarkets(marketPayload.markets || []);
    setPredictions(predictionPayload.predictions || []);
    setBalance(predictionPayload.balance ?? 100);
    setMessage(health.warning || marketPayload.warning || "");
    setLoading(false);
  }

  async function join(event) {
    event.preventDefault();
    const payload = await api("/api/profiles", {
      method: "POST",
      body: JSON.stringify({ displayName: name || "Guest" }),
    });
    localStorage.setItem("puntlite.profile", JSON.stringify(payload.profile));
    setProfile(payload.profile);
    await load(payload.profile);
  }

  async function lock(market, pick) {
    if (!profile) {
      setMessage("Enter a name first.");
      return;
    }
    const payload = await api("/api/predictions/lock", {
      method: "POST",
      body: JSON.stringify({ profileId: profile.id, marketId: market.id, pick, stake }),
    });
    setBalance(payload.balance);
    setMessage(`${label(market, pick)} locked at ${Number(payload.prediction.locked_odds).toFixed(2)}.`);
    await load(profile);
  }

  useEffect(() => {
    const saved = localStorage.getItem("puntlite.profile");
    if (saved) {
      const parsed = JSON.parse(saved);
      setProfile(parsed);
      load(parsed).catch((error) => {
        setMessage(error.message);
        setLoading(false);
      });
    } else {
      load(null).catch((error) => {
        setMessage(error.message);
        setLoading(false);
      });
    }
  }, []);

  return (
    <main className="shell">
      <section className="hero">
        <header className="top">
          <div className="brand">
            <span className="mark">26</span>
            <span>PuntLite</span>
          </div>
          <button className="iconButton" onClick={() => load()} aria-label="Refresh markets">
            <RefreshCw size={19} />
          </button>
        </header>
        <h1>World Cup prediction markets</h1>
        <p>Invite friends, lock picks at live bookmaker odds, and settle automatically from official fixture results.</p>
        <div className="statusPill">
          <Activity size={15} />
          {loading ? "Checking live APIs" : "Live API surface ready"}
        </div>
      </section>

      <section className="summary">
        <div className="statCard accent">
          <Wallet size={21} />
          <div><span>Balance</span><strong>{money(balance)}</strong></div>
        </div>
        <div className="statCard">
          <CircleDollarSign size={20} />
          <div><span>Stake</span><strong>{money(stake)}</strong></div>
        </div>
        <div className="statCard">
          <Trophy size={20} />
          <div><span>Locked</span><strong>{openPredictions.length}</strong></div>
        </div>
      </section>

      {!profile && (
        <form className="joinPanel" onSubmit={join}>
          <strong>Join the pool</strong>
          <div>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" />
            <button type="submit">Enter</button>
          </div>
        </form>
      )}

      <section className="opsPanel">
        <div>
          <strong>Provider checks</strong>
          <span>{checks[0]?.message || "Waiting for first sync job."}</span>
        </div>
        <Database size={20} />
      </section>

      {message && <div className="toast">{message}</div>}

      <nav className="tabs">
        <button className={tab === "markets" ? "active" : ""} onClick={() => setTab("markets")}>Markets</button>
        <button className={tab === "bets" ? "active" : ""} onClick={() => setTab("bets")}>Bets</button>
        <button className={tab === "ops" ? "active" : ""} onClick={() => setTab("ops")}>API</button>
      </nav>

      {tab === "markets" && (
        <section className="list">
          <label className="stakeControl">
            Stake unit
            <input type="number" min="1" max="25" value={stake} onChange={(event) => setStake(Math.min(Math.max(Number(event.target.value) || 1, 1), 25))} />
          </label>
          {markets.length === 0 && <p className="empty">No markets yet. Run the fixture and odds sync jobs after deployment.</p>}
          {markets.map((market) => (
            <article className="marketCard" key={market.id}>
              <div className="meta">
                <span><Clock3 size={14} /> {new Date(market.kickoff).toLocaleString()}</span>
                <span>{market.bookmaker_count} books</span>
              </div>
              <div className="fixture">
                <div><strong>{market.home_team}</strong><span>Home</span></div>
                <b>v</b>
                <div><strong>{market.away_team}</strong><span>Away</span></div>
              </div>
              <div className="oddsGrid">
                {["home", "draw", "away"].map((pick) => (
                  <button key={pick} disabled={market.status !== "open" || !oddsFor(market, pick)} onClick={() => lock(market, pick)}>
                    <span>{label(market, pick)}</span>
                    <strong>{Number(oddsFor(market, pick) || 0).toFixed(2)}</strong>
                  </button>
                ))}
              </div>
            </article>
          ))}
        </section>
      )}

      {tab === "bets" && (
        <section className="list">
          {predictions.length === 0 && <p className="empty">No predictions yet.</p>}
          {predictions.map((prediction) => (
            <article className="ledger" key={prediction.id}>
              <div>
                <strong>{prediction.markets?.home_team} v {prediction.markets?.away_team}</strong>
                <span>{prediction.pick} @ {Number(prediction.locked_odds).toFixed(2)}</span>
              </div>
              <div className="ledgerRight">
                <span>{money(prediction.stake)}</span>
                <strong className={prediction.status}>{prediction.status}</strong>
              </div>
            </article>
          ))}
        </section>
      )}

      {tab === "ops" && (
        <section className="list">
          {checks.length === 0 && <p className="empty">No provider checks recorded.</p>}
          {checks.map((check) => (
            <article className="check" key={check.id}>
              <strong>{check.provider} / {check.endpoint}</strong>
              <span>{check.ok ? "OK" : "Failed"} - {check.message}</span>
              <small>{new Date(check.checked_at).toLocaleString()}</small>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
