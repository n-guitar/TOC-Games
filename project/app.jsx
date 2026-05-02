// Main app — TOC Executive Challenge style
const { TOPOLOGIES, RESOURCE_CARDS, EVENTS, DIFFICULTY_CONFIG, PALETTE } = window.GameData;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "factory",
  "difficulty": "normal",
  "animSpeed": 1.0,
  "eventFrequency": 0.4,
  "showOnboarding": true
}/*EDITMODE-END*/;

window.TWEAK_DEFAULTS = TWEAK_DEFAULTS;

function rollDice() { return 1 + Math.floor(Math.random() * 6); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function App({ tweaks, setTweak }) {
  const topology = TOPOLOGIES[tweaks.theme];
  const difficulty = DIFFICULTY_CONFIG[tweaks.difficulty];
  const dayBudget = 1000; // ¥ per round to inject materials

  const [round, setRound] = React.useState(1);
  const [phase, setPhase] = React.useState("normal");
  const [stationPoints, setStationPoints] = React.useState({}); // stationId -> number
  const [productMix, setProductMix] = React.useState(() =>
    Object.fromEntries(topology.products.map(p => [p.id, 2]))
  );
  const [queues, setQueues] = React.useState({}); // stationId -> [{productId, color}]
  const [capacity, setCapacity] = React.useState({});
  const [throughput, setThroughput] = React.useState({}); // productId -> count
  const [revenue, setRevenue] = React.useState(0);
  const [costs, setCosts] = React.useState(0);
  const [particles, setParticles] = React.useState([]);
  const [event, setEvent] = React.useState(null);
  const [utilization, setUtilization] = React.useState({});
  const [history, setHistory] = React.useState([]);
  const [running, setRunning] = React.useState(false);
  const [lastRound, setLastRound] = React.useState({ revGained: 0, completed: 0, injectionCost: 0, wipCount: 0, holdCost: 0, upgradeCost: 0 });
  const [showOnboarding, setShowOnboarding] = React.useState(tweaks.showOnboarding !== false);
  const [showResults, setShowResults] = React.useState(false);

  const POINT_COST_PER_ROUND = 150; // ¥ per allocated point per round
  const pointsUsed = Object.values(stationPoints).reduce((s, v) => s + v, 0);
  const pointsRemaining = difficulty.pointPool - pointsUsed;

  // Re-init on theme/difficulty change
  React.useEffect(() => {
    setProductMix(Object.fromEntries(topology.products.map(p => [p.id, 2])));
    setStationPoints({});
    setQueues(Object.fromEntries(topology.stations.map(s => [s.id, []])));
    setCapacity({});
    setThroughput({});
    setRevenue(0);
    setCosts(0);
    setRound(1);
    setPhase("normal");
    setHistory([]);
    setUtilization({});
    setEvent(null);
    setShowResults(false);
  }, [tweaks.theme, tweaks.difficulty]);

  const profit = revenue - costs;
  const totalUnits = Object.values(throughput).reduce((s, v) => s + v, 0);

  // Mock teams
  const teams = [
    { id: "team-a", name: "Alpha", profit: profit, units: totalUnits },
    { id: "team-b", name: "Bravo", profit: Math.max(0, profit - 800 + Math.floor(Math.random() * 300)), units: Math.max(0, totalUnits - 3) },
    { id: "team-c", name: "Charlie", profit: Math.max(0, profit + 200 + Math.floor(Math.random() * 200)), units: totalUnits + 1 },
    { id: "team-d", name: "Delta", profit: Math.max(0, profit - 1500), units: Math.max(0, totalUnits - 5) },
  ];

  function addPoint(stationId) {
    if (pointsRemaining <= 0) return;
    setStationPoints(prev => ({ ...prev, [stationId]: (prev[stationId] || 0) + 1 }));
  }
  function removePoint(stationId) {
    setStationPoints(prev => {
      const cur = prev[stationId] || 0;
      if (cur <= 0) return prev;
      const next = { ...prev };
      if (cur - 1 === 0) delete next[stationId];
      else next[stationId] = cur - 1;
      return next;
    });
  }

  async function runRound() {
    if (running) return;
    setRunning(true);

    // 1) Roll capacity for each station
    const cap = {};
    topology.stations.forEach(s => {
      let c = rollDice();
      c += (stationPoints[s.id] || 0);
      cap[s.id] = c;
    });

    // 2) Roll event
    let evt = null;
    if (phase === "sale" && Math.random() < tweaks.eventFrequency) {
      const pool = EVENTS[tweaks.theme];
      evt = pool[Math.floor(Math.random() * pool.length)];
      if (evt.target) {
        if (evt.id === "slow_q" || evt.id === "ml_lag") cap[evt.target] = Math.floor(cap[evt.target] / 2);
        else cap[evt.target] = 0;
      }
    }
    setEvent(evt);
    setCapacity(cap);
    await sleep(500 / tweaks.animSpeed);

    // 3) Inject products from mix budget
    const newQueues = Object.fromEntries(
      topology.stations.map(s => [s.id, [...(queues[s.id] || [])]])
    );
    let injectionCost = 0;
    topology.products.forEach(p => {
      const count = productMix[p.id] || 0;
      const eventMult = (evt?.id === "rush_order" || evt?.id === "flash") ? 1.5 : 1;
      const actualCount = Math.floor(count * eventMult);
      injectionCost += count * p.costPerInject;
      const firstStation = p.route[0];
      for (let i = 0; i < actualCount; i++) {
        newQueues[firstStation].push({ id: `${p.id}-${round}-${i}`, productId: p.id, color: p.color, route: p.route, routeIdx: 0 });
      }
    });

    // 4) Process each station in topological order (col-based)
    const sortedStations = [...topology.stations].sort((a, b) => a.col - b.col || a.row - b.row);
    const flows = []; // {from, to, color}
    const completed = []; // products finished
    sortedStations.forEach(station => {
      const c = cap[station.id] || 0;
      const queue = newQueues[station.id];
      const processed = queue.splice(0, Math.min(c, queue.length));
      processed.forEach(item => {
        const nextIdx = item.routeIdx + 1;
        if (nextIdx >= item.route.length) {
          completed.push(item);
        } else {
          const nextSt = item.route[nextIdx];
          newQueues[nextSt].push({ ...item, routeIdx: nextIdx });
          flows.push({ from: station.id, to: nextSt, color: item.color, productId: item.productId });
        }
      });
    });

    // 5) Animate particles
    const animDur = 1400 / tweaks.animSpeed;
    const start = performance.now();
    const partList = flows.slice(0, 30).map((f, i) => ({
      id: `p-${round}-${i}`, ...f, startTime: start + i * 50,
    }));
    const tick = () => {
      const now = performance.now();
      const updated = partList.map(p => ({
        ...p, progress: Math.max(0, Math.min(1, (now - p.startTime) / (animDur * 0.55))),
      })).filter(p => p.progress < 1);
      setParticles(updated);
      if (now - start < animDur && updated.length > 0) requestAnimationFrame(tick);
      else setParticles([]);
    };
    requestAnimationFrame(tick);
    await sleep(animDur);

    // 6) Tally revenue + costs + throughput
    const newThroughput = { ...throughput };
    let revGained = 0;
    completed.forEach(item => {
      const p = topology.products.find(pp => pp.id === item.productId);
      newThroughput[item.productId] = (newThroughput[item.productId] || 0) + 1;
      revGained += p.price;
    });
    setThroughput(newThroughput);
    setRevenue(r => r + revGained);
    // costs: injection + WIP holding + upgrade overhead
    const wipCount = Object.values(newQueues).reduce((s, q) => s + q.length, 0);
    const upgradeCost = pointsUsed * POINT_COST_PER_ROUND;
    const holdCost = wipCount * 10;
    const roundCosts = injectionCost + holdCost + upgradeCost;
    setCosts(c => c + roundCosts);
    setQueues(newQueues);
    setLastRound({ revGained, completed: completed.length, injectionCost, wipCount, holdCost, upgradeCost });

    // 7) Utilization
    const util = {};
    topology.stations.forEach(s => {
      const c = cap[s.id] || 1;
      const q = (queues[s.id] || []).length + (productMix[s.id] || 0);
      util[s.id] = Math.min(100, ((Math.min(c, q + 1)) / Math.max(c, 1)) * 100);
    });
    // Simpler: utilization = how full WIP is
    topology.stations.forEach(s => {
      const wip = newQueues[s.id].length;
      util[s.id] = Math.min(100, wip * 18);
    });
    setUtilization(util);

    // 8) History
    setHistory(h => [...h, { round, revenue: revGained, costs: roundCosts, event: evt?.name }]);

    // 9) Phase transitions
    if (round >= Math.floor(difficulty.rounds / 2) && phase === "normal") setPhase("sale");
    if (round >= difficulty.rounds) {
      setPhase("review");
      setShowResults(true);
    }

    setRound(r => r + 1);
    setRunning(false);
  }

  function reset() {
    setStationPoints({});
    setQueues(Object.fromEntries(topology.stations.map(s => [s.id, []])));
    setCapacity({});
    setThroughput({});
    setRevenue(0); setCosts(0);
    setRound(1); setPhase("normal");
    setHistory([]); setUtilization({});
    setEvent(null);
    setShowResults(false);
  }

  // Bottleneck = station with biggest WIP
  const bottleneck = Object.entries(queues).reduce(
    (max, [id, q]) => (q?.length || 0) > ((queues[max]?.length || 0)) ? id : max,
    topology.stations[0].id
  );
  const queueCounts = Object.fromEntries(Object.entries(queues).map(([k, v]) => [k, v.length]));
  const queueByProduct = Object.fromEntries(
    Object.entries(queues).map(([k, items]) => {
      const breakdown = {};
      items.forEach(it => { breakdown[it.productId] = (breakdown[it.productId] || 0) + 1; });
      return [k, breakdown];
    })
  );

  return (
    <div style={{ minHeight: "100vh", background: PALETTE.bg, color: PALETTE.text,
      fontFamily: "'Inter', system-ui, sans-serif", padding: "20px" }}>
      <Header
        tweaks={tweaks}
        onShowRules={() => setShowOnboarding(true)}
        round={Math.min(round, difficulty.rounds)}
        totalRounds={difficulty.rounds}
        running={running}
        onRun={runRound}
        onReset={reset}
        event={event}
        phase={phase}
      />

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "16px", marginTop: "16px" }}>
        {/* LEFT: product mix + upgrade shop */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <window.UI.ProductMixPanel
            products={topology.products}
            mix={productMix}
            onChange={(id, v) => setProductMix({ ...productMix, [id]: v })}
            dayBudget={dayBudget}
          />
          <window.UI.PointsPool
            pointsUsed={pointsUsed}
            pointsTotal={difficulty.pointPool}
            costPerRound={POINT_COST_PER_ROUND}
            stations={topology.stations}
            stationPoints={stationPoints}
          />
        </div>

        {/* CENTER: factory floor + status below */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{
            background: PALETTE.panel, border: `1px solid ${PALETTE.border}`,
            borderRadius: "12px", padding: "20px", overflow: "auto",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px", alignItems: "flex-end" }}>
              <div>
                <div style={{ fontSize: "10px", color: PALETTE.textMute, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em", fontWeight: 700 }}>
                  {tweaks.theme === "factory" ? "FACTORY FLOOR" : "SYSTEM ARCHITECTURE"}
                </div>
                <div style={{ fontSize: "18px", fontWeight: 800, color: PALETTE.text, marginTop: "2px" }}>
                  {tweaks.theme === "factory" ? "ToyCorp 工場" : "AcmeEC 本番環境"}
                </div>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                {topology.products.map(p => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "5px",
                    fontSize: "11px", color: PALETTE.textDim }}>
                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: p.color }} />
                    <span>{p.icon} {p.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <window.ProcessFlow
              topology={topology}
              capacity={capacity}
              queues={queueCounts}
              queueByProduct={queueByProduct}
              bottleneck={bottleneck}
              particles={particles}
              stationPoints={stationPoints}
              pointsRemaining={pointsRemaining}
              onAddPoint={addPoint}
              onRemovePoint={removePoint}
              productMix={productMix}
              throughput={throughput}
              utilization={utilization}
              products={topology.products}
              lastRound={lastRound}
            />
          </div>

          {/* STATUS BAR — below factory floor */}
          <window.UI.StatusBar
            round={Math.min(round, difficulty.rounds)}
            totalRounds={difficulty.rounds}
            phase={phase}
            revenue={revenue}
            profit={profit}
            costs={costs}
            day={Math.ceil(round / 5)}
            lastRound={lastRound}
          />
        </div>
      </div>

      {/* BOTTOM: hints panel — full width below */}
      <div style={{ marginTop: "16px" }}>
        <window.UI.HintsPanel
          queues={queueCounts}
          stations={topology.stations}
          stationPoints={stationPoints}
          phase={phase}
          round={round}
          totalRounds={difficulty.rounds}
        />
      </div>

      {showOnboarding && (
        <Onboarding
          theme={tweaks.theme}
          products={topology.products}
          onClose={() => { setShowOnboarding(false); setTweak('showOnboarding', false); }}
        />
      )}

      {showResults && (
        <ResultsOverlay
          revenue={revenue}
          costs={costs}
          profit={profit}
          throughput={throughput}
          products={topology.products}
          totalRounds={difficulty.rounds}
          stationPoints={stationPoints}
          stations={topology.stations}
          onReplay={() => reset()}
          onClose={() => setShowResults(false)}
        />
      )}
    </div>
  );
}

function Header({ tweaks, onShowRules, round, totalRounds, running, onRun, onReset, event, phase }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      gap: "16px", flexWrap: "wrap",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{
          width: "36px", height: "36px",
          background: PALETTE.accent, color: PALETTE.accentInk,
          borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "18px", fontWeight: 900,
        }}>T</div>
        <div>
          <div style={{ fontSize: "18px", fontWeight: 800, color: PALETTE.text, letterSpacing: "-0.02em" }}>
            TOC Games · Bottleneck Battle
          </div>
          <div style={{ fontSize: "11px", color: PALETTE.textMute, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>
            {tweaks.theme === "factory" ? "FACTORY MODE" : "WEB SYSTEM MODE"}
          </div>
        </div>
      </div>

      {/* Center: event slot */}
      <div style={{ flex: 1, minWidth: "300px", maxWidth: "520px" }}>
        {event ? <window.UI.EventToast event={event} /> : (
          <div style={{
            background: PALETTE.panel, border: `1px dashed ${PALETTE.border}`,
            borderRadius: "10px", padding: "10px 14px",
            color: PALETTE.textMute, fontSize: "12px", fontStyle: "italic",
            textAlign: "center",
          }}>
            {phase === "normal" ? "通常運用中 — まだイベントなし" : "繁忙期 — イベント発生の可能性"}
          </div>
        )}
      </div>

      {/* Right: controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <button onClick={onShowRules} style={{
          background: PALETTE.panel, border: `1px solid ${PALETTE.borderHi}`,
          padding: "8px 14px", borderRadius: "8px", cursor: "pointer",
          color: PALETTE.text, fontSize: "12px", fontWeight: 600, height: "44px",
        }}>📖 ルール</button>
        <button onClick={onReset} title="ゲームをリセット" style={{
          background: PALETTE.panel, border: `1px solid ${PALETTE.borderHi}`,
          padding: "8px 12px", borderRadius: "8px", cursor: "pointer",
          color: PALETTE.text, fontSize: "12px", fontWeight: 600, height: "44px",
        }}>⟲ Reset</button>
        <button
          onClick={onRun}
          disabled={running || round > totalRounds}
          style={{
            padding: "0 22px", height: "44px",
            background: running ? PALETTE.borderHi : "linear-gradient(135deg, #f59e0b, #ea580c)",
            color: "#fff", border: "none", borderRadius: "10px",
            fontSize: "14px", fontWeight: 800, cursor: running ? "wait" : "pointer",
            boxShadow: running ? "none" : "0 2px 8px rgba(234,88,12,0.3)",
            letterSpacing: "0.02em", minWidth: "200px",
          }}
        >
          {running ? "▶ 実行中..." : round > totalRounds ? "完了" : `🎲 Round ${round}/${totalRounds} 実行`}
        </button>
      </div>
    </div>
  );
}

function Onboarding({ theme, products, onClose }) {
  const [step, setStep] = React.useState(0);
  const factoryMode = theme === "factory";
  const steps = [
    {
      title: "🎯 ゲームの目的",
      body: (
        <>
          <p><strong>制約理論（TOC）</strong>を体験するゲームです。</p>
          <p>あなたは{factoryMode ? "工場長" : "SAチーム"}として、限られた予算で<strong>利益最大化</strong>を目指します。</p>
          <ul>
            <li><strong>ボトルネック</strong>を見つけ、そこに集中投資する</li>
            <li>「全部良くする」は不可能。優先順位が命</li>
            <li>{factoryMode ? "高級品を作るのが正解とは限らない（スループット会計）" : "リクエスト種別ごとに通る経路が違う"}</li>
          </ul>
        </>
      ),
    },
    {
      title: "🏭 ゲームの流れ",
      body: (
        <>
          <p style={{ background: "#fef3c7", padding: "8px 12px", borderRadius: "8px", fontSize: "12px", marginBottom: "10px" }}>
            ⏱ <strong>1ラウンド = 工場の1日</strong>。「ラウンド実行」を押すと、その1日が一気にシミュレートされます。
          </p>
          <p style={{ background: "#eff6ff", padding: "8px 12px", borderRadius: "8px", fontSize: "12px", marginBottom: "10px" }}>
            🎬 <strong>ラウンド実行中の挙動：</strong><br />
            ① 各工程でサイコロを振り「今日の処理能力(1〜6)」が決まる<br />
            ② 投入した材料／リクエストが順番に各工程へ流れる<br />
            ③ 処理能力を超えた分は<strong>滞留（順番待ち）</strong>として工程前に残る<br />
            ④ 完成品は売上に。残った滞留分は翌日に持ち越し（在庫コスト発生）
          </p>
          <p><strong>初回（Round 1 開始前）に決めること：</strong></p>
          <ul>
            <li>⚡ <strong>工程強化ポイント</strong>（各工程の＋ボタン）— ポイントプールを各工程に割り振り、処理能力を＋1ずつ上げる（途中追加・撤去もOK）</li>
          </ul>
          <p style={{ marginTop: "10px" }}><strong>毎ラウンド決めること：</strong></p>
          <ul>
            <li>📦 <strong>製品ミックス</strong>（左上）— 今日は何をいくつ投入する？ 途中で変えてOK</li>
          </ul>
          <p style={{ marginTop: "10px" }}><strong>ラウンド実行ボタンを押すと：</strong></p>
          <ol>
            <li>各工程のサイコロが振られ、その日の処理能力が決まる</li>
            <li>投入した材料／リクエストが経路を流れる</li>
            <li>完成品が売上に。WIPが残れば在庫コスト発生</li>
            <li>セール期（後半）にはイベント発生の可能性</li>
          </ol>
          <p style={{ marginTop: "10px" }}>右の<strong>ボトルネック分析</strong>で渋滞箇所を確認し、次ラウンドのポイント割り振り・投入量を調整。</p>
        </>
      ),
    },
    {
      title: "📦 3種類の製品",
      body: (
        <>
          <p>製品ごとに<strong>通る工程が違う</strong>。これが TOC の本質。</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px" }}>
            {products.map(p => (
              <div key={p.id} style={{
                padding: "10px 12px",
                background: PALETTE.panelAlt, border: `1px solid ${PALETTE.border}`,
                borderRadius: "8px", borderLeft: `4px solid ${p.color}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "20px" }}>{p.icon}</span>
                  <strong>{p.name}</strong>
                  <span style={{ fontSize: "11px", color: PALETTE.textDim, fontFamily: "'JetBrains Mono', monospace" }}>
                    ¥{p.price}/個 · 投入¥{p.costPerInject}
                  </span>
                </div>
                <div style={{ marginTop: "5px", fontSize: "11px", color: PALETTE.textDim, fontFamily: "'JetBrains Mono', monospace" }}>
                  経路: {p.route.join(" → ")}
                </div>
              </div>
            ))}
          </div>
        </>
      ),
    },
    {
      title: "⚡ 工程強化ポイント",
      body: (
        <>
          <p>ポイントプールを<strong>各工程に割り振って処理能力を上げる</strong>。</p>
          <ul>
            <li>各工程の <strong>＋ / ー</strong> ボタンでポイントを割り振り・取り消し</li>
            <li>ポイントごとに処理能力が <strong>＋1</strong>（サイコロに加算）</li>
            <li>プールは <strong>{DIFFICULTY_CONFIG.normal.pointPool} ポイント</strong>（Normal時）— 限りがある</li>
            <li>割り振ったポイントは毎ラウンド <strong>1ポイントあたり ¥150</strong> の維持費</li>
            <li>ボトルネック以外を強化しても、全体スループットは伸びない</li>
          </ul>
          <p style={{ background: "#fef3c7", padding: "8px 12px", borderRadius: "8px", marginTop: "10px", fontSize: "12px" }}>
            💡 <strong>TOCの5ステップ</strong>: ①ボトルネック特定 → ②徹底活用 → ③従属化 → ④強化 → ⑤次のボトルネック特定
          </p>
        </>
      ),
    },
    {
      title: "🎲 なぜ能力がラウンドごとに変わる？",
      body: (
        <>
          <p>各工程の処理能力は<strong>毎ラウンド サイコロで決まる（1〜6個）</strong>。</p>
          <p style={{ background: "#fef3c7", padding: "10px 12px", borderRadius: "8px", fontSize: "12px", margin: "10px 0" }}>
            🎯 <strong>これが TOC ゲームの核心：</strong><br />
            現実の工程能力は<u>常に変動する</u>（人の体調・機械トラブル・素材ばらつき・割込タスク）。
            「平均で考えると間に合うはず」が崩れるのは、この<strong>統計的変動</strong>のせい。
          </p>
          <p><strong>学べる3つのこと：</strong></p>
          <ul>
            <li><strong>① 統計的変動と従属事象</strong>: 1工程の遅れが下流に連鎖し、上流の余裕では取り戻せない（ハーシュベイガー効果）</li>
            <li><strong>② バッファの必要性</strong>: 変動がある以上、ボトルネック前に意図的な滞留を持つ必要がある</li>
            <li><strong>③ 平均値の罠</strong>: 「平均能力3.5個」でも、毎ラウンド3.5個流れるわけではない</li>
          </ul>
          <p style={{ background: "#eff6ff", padding: "10px 12px", borderRadius: "8px", fontSize: "12px", marginTop: "10px" }}>
            💡 <strong>勝つコツ:</strong> ボトルネックにポイントを集中し、その手前に十分な滞留（バッファ）を確保する。
            非ボトルネックは強化しても無駄。
          </p>
        </>
      ),
    },
    {
      title: "🚀 さあ始めよう",
      body: (
        <>
          <p>準備ができたら「ラウンド実行」を押そう。</p>
          <ul>
            <li>右下のTweaksパネルでテーマ・難易度を変更可能</li>
            <li>同じ難易度で他チームと利益を競う</li>
            <li>15ラウンド後、振り返り画面で改善ポイントを確認</li>
          </ul>
          <p>📺 プロジェクター投影で複数チームが同時プレイすると盛り上がります。</p>
        </>
      ),
    },
  ];

  const cur = steps[step];
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "40px",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: PALETTE.panel, borderRadius: "16px", padding: "32px",
        width: "min(640px, 100%)", maxHeight: "90vh", overflow: "auto",
        boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div style={{ display: "flex", gap: "6px" }}>
            {steps.map((_, i) => (
              <div key={i} style={{
                width: i === step ? "24px" : "8px", height: "8px",
                borderRadius: "4px",
                background: i === step ? PALETTE.accent : i < step ? PALETTE.borderHi : PALETTE.border,
                transition: "all 0.3s",
              }} />
            ))}
          </div>
          <button onClick={onClose} style={{
            background: "transparent", border: "none", fontSize: "20px",
            color: PALETTE.textMute, cursor: "pointer", padding: "4px 10px",
          }}>✕</button>
        </div>
        <h2 style={{ fontSize: "22px", margin: "0 0 14px", color: PALETTE.text, fontWeight: 800 }}>
          {cur.title}
        </h2>
        <div style={{ fontSize: "14px", color: PALETTE.textDim, lineHeight: 1.7 }}>
          {cur.body}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "24px", gap: "10px" }}>
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            style={{
              padding: "10px 18px",
              background: PALETTE.panelAlt, border: `1px solid ${PALETTE.borderHi}`,
              borderRadius: "8px", cursor: step === 0 ? "not-allowed" : "pointer",
              opacity: step === 0 ? 0.4 : 1, color: PALETTE.text, fontWeight: 600,
            }}
          >← 戻る</button>
          {step < steps.length - 1 ? (
            <button onClick={() => setStep(step + 1)} style={{
              padding: "10px 22px",
              background: PALETTE.accent, color: PALETTE.accentInk,
              border: "none", borderRadius: "8px",
              cursor: "pointer", fontWeight: 700,
            }}>次へ →</button>
          ) : (
            <button onClick={onClose} style={{
              padding: "10px 22px",
              background: "linear-gradient(135deg, #f59e0b, #ea580c)",
              color: "#fff", border: "none", borderRadius: "8px",
              cursor: "pointer", fontWeight: 700,
            }}>始める 🎲</button>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultsOverlay({ revenue, costs, profit, throughput, products, totalRounds, stationPoints, stations, onReplay, onClose }) {
  const totalUnits = Object.values(throughput).reduce((s, v) => s + v, 0);
  const verdict = profit > 5000 ? "🏆 Excellent" : profit > 0 ? "👍 黒字達成" : profit > -3000 ? "📉 赤字" : "💀 大赤字";
  const verdictColor = profit > 5000 ? "#16a34a" : profit > 0 ? "#22c55e" : profit > -3000 ? "#f59e0b" : "#dc2626";
  const totalPoints = Object.values(stationPoints || {}).reduce((s, v) => s + v, 0);
  const upgradedStations = stations.filter(s => (stationPoints?.[s.id] || 0) > 0);
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: "40px",
    }}>
      <div style={{
        background: "#fff", borderRadius: "20px", maxWidth: "640px", width: "100%",
        boxShadow: "0 30px 60px rgba(0,0,0,0.3)", padding: "32px 36px",
      }}>
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.15em", color: PALETTE.textMute, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
            GAME OVER · {totalRounds} ROUNDS COMPLETE
          </div>
          <div style={{ fontSize: "32px", fontWeight: 800, color: verdictColor, marginTop: "6px" }}>
            {verdict}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "20px" }}>
          <div style={{ background: PALETTE.panelAlt, borderRadius: "10px", padding: "14px", textAlign: "center" }}>
            <div style={{ fontSize: "10px", color: PALETTE.textMute, fontWeight: 700, letterSpacing: "0.1em" }}>REVENUE</div>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "#16a34a", marginTop: "4px", fontFamily: "'JetBrains Mono', monospace" }}>
              ¥{revenue.toLocaleString()}
            </div>
          </div>
          <div style={{ background: PALETTE.panelAlt, borderRadius: "10px", padding: "14px", textAlign: "center" }}>
            <div style={{ fontSize: "10px", color: PALETTE.textMute, fontWeight: 700, letterSpacing: "0.1em" }}>COSTS</div>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "#dc2626", marginTop: "4px", fontFamily: "'JetBrains Mono', monospace" }}>
              −¥{costs.toLocaleString()}
            </div>
          </div>
          <div style={{ background: profit >= 0 ? "#f0fdf4" : "#fef2f2", borderRadius: "10px", padding: "14px", textAlign: "center", border: `1px solid ${profit >= 0 ? "#86efac" : "#fca5a5"}` }}>
            <div style={{ fontSize: "10px", color: PALETTE.textMute, fontWeight: 700, letterSpacing: "0.1em" }}>NET PROFIT</div>
            <div style={{ fontSize: "20px", fontWeight: 800, color: profit >= 0 ? "#16a34a" : "#dc2626", marginTop: "4px", fontFamily: "'JetBrains Mono', monospace" }}>
              {profit >= 0 ? "+" : ""}¥{profit.toLocaleString()}
            </div>
          </div>
        </div>

        <div style={{ background: PALETTE.panelAlt, borderRadius: "10px", padding: "14px 16px", marginBottom: "16px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: PALETTE.text, marginBottom: "8px", letterSpacing: "0.05em" }}>
            📦 出荷実績 — {totalUnits}個
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {products.map(p => {
              const n = throughput?.[p.id] || 0;
              return (
                <div key={p.id} style={{
                  flex: 1, minWidth: "120px",
                  background: "#fff", padding: "8px 10px", borderRadius: "8px",
                  border: `1px solid ${PALETTE.border}`,
                  display: "flex", alignItems: "center", gap: "8px",
                }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: p.color }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: PALETTE.text }}>{p.icon} {p.name}</div>
                    <div style={{ fontSize: "10px", color: PALETTE.textMute, fontFamily: "'JetBrains Mono', monospace" }}>
                      {n}個 · ¥{(n * p.price).toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {upgradedStations.length > 0 && (
          <div style={{ background: PALETTE.panelAlt, borderRadius: "10px", padding: "14px 16px", marginBottom: "20px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: PALETTE.text, marginBottom: "8px", letterSpacing: "0.05em" }}>
              ⚡ ポイント割り振り — {totalPoints}pt
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {upgradedStations.map(s => (
                <div key={s.id} style={{
                  background: "#fef3c7", border: "1px solid #fbbf24",
                  padding: "4px 10px", borderRadius: "6px",
                  fontSize: "11px", fontWeight: 700, color: "#92400e",
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {s.label} ⚡+{stationPoints[s.id]}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          <button onClick={onClose} style={{
            padding: "10px 22px", background: "#fff", color: PALETTE.text,
            border: `1px solid ${PALETTE.border}`, borderRadius: "10px",
            fontSize: "13px", fontWeight: 700, cursor: "pointer",
          }}>結果を閉じる</button>
          <button onClick={onReplay} style={{
            padding: "10px 24px",
            background: "linear-gradient(135deg, #f59e0b, #ea580c)",
            color: "#fff", border: "none", borderRadius: "10px",
            fontSize: "13px", fontWeight: 800, cursor: "pointer",
            boxShadow: "0 2px 8px rgba(234,88,12,0.3)",
          }}>🔄 もう一度プレイ</button>
        </div>
      </div>
    </div>
  );
}

window.App = App;
