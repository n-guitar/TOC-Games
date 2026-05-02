// Sidebar UI — light theme

const { PALETTE, RESOURCE_CARDS } = window.GameData;

function Card({ title, children, kicker, accent }) {
  return (
    <div style={{
      background: PALETTE.panel,
      border: `1px solid ${PALETTE.border}`,
      borderRadius: "12px",
      padding: "14px",
      boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
    }}>
      {(title || kicker) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "10px" }}>
          {kicker && <div style={{ fontSize: "10px", color: PALETTE.textMute, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em", fontWeight: 700 }}>{kicker}</div>}
          {accent && <div style={{ fontSize: "10px", color: accent, fontWeight: 700 }}>{accent}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

function ProductMixPanel({ products, mix, onChange, budget, dayBudget }) {
  const totalCost = products.reduce((s, p) => s + (mix[p.id] || 0) * p.costPerInject, 0);
  const remaining = dayBudget - totalCost;
  return (
    <Card kicker="PRODUCT MIX · 投入判断" accent={`本日¥${totalCost} / ¥${dayBudget}`}>
      <div style={{ fontSize: "11px", color: PALETTE.textDim, marginBottom: "10px", lineHeight: 1.4 }}>
        各製品を何個ずつ投入する？ <strong>製品ごとに通る工程が違う</strong>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {products.map(p => {
          const count = mix[p.id] || 0;
          const cost = count * p.costPerInject;
          return (
            <div key={p.id} style={{
              padding: "10px",
              background: PALETTE.panelAlt,
              border: `1px solid ${PALETTE.border}`,
              borderRadius: "10px",
              borderLeft: `4px solid ${p.color}`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "20px" }}>{p.icon}</span>
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: PALETTE.text }}>{p.name}</div>
                    <div style={{ fontSize: "10px", color: PALETTE.textMute, fontFamily: "'JetBrains Mono', monospace" }}>
                      ¥{p.price}/個 · 投入¥{p.costPerInject}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <button onClick={() => onChange(p.id, Math.max(0, count - 1))} style={btnStep}>−</button>
                  <div style={{
                    minWidth: "32px", textAlign: "center", fontSize: "16px",
                    fontWeight: 800, fontFamily: "'JetBrains Mono', monospace",
                    color: PALETTE.text,
                  }}>{count}</div>
                  <button
                    onClick={() => { if (cost + p.costPerInject <= dayBudget - (totalCost - cost)) onChange(p.id, count + 1); }}
                    disabled={remaining < p.costPerInject}
                    style={{ ...btnStep, opacity: remaining < p.costPerInject ? 0.3 : 1 }}
                  >+</button>
                </div>
              </div>
              <div style={{ marginTop: "6px", display: "flex", gap: "3px", flexWrap: "wrap" }}>
                {p.route.map(sid => (
                  <span key={sid} style={{
                    fontSize: "9px", padding: "2px 5px",
                    background: PALETTE.panel, border: `1px solid ${PALETTE.border}`,
                    borderRadius: "4px", color: PALETTE.textDim,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>{sid}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

const btnStep = {
  width: "26px", height: "26px",
  background: PALETTE.panel, border: `1px solid ${PALETTE.borderHi}`,
  borderRadius: "6px", color: PALETTE.text,
  fontSize: "16px", fontWeight: 700, cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: 0,
};

function PointsPool({ pointsUsed, pointsTotal, costPerRound, stations, stationPoints }) {
  const remaining = pointsTotal - pointsUsed;
  const pct = pointsTotal > 0 ? (pointsUsed / pointsTotal) * 100 : 0;
  const placed = stations.filter(s => (stationPoints?.[s.id] || 0) > 0);
  return (
    <Card kicker="UPGRADE POINTS · 工程強化" accent={`${remaining}/${pointsTotal}pt`}>
      <div style={{ fontSize: "11px", color: PALETTE.textDim, marginBottom: "10px", lineHeight: 1.5 }}>
        各工程の<strong>＋ボタン</strong>でポイントを割り振り、処理能力を <strong>+1</strong> ずつ上げる。
      </div>
      <div style={{ background: PALETTE.panelAlt, borderRadius: "8px", padding: "10px", marginBottom: "10px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", fontFamily: "'JetBrains Mono', monospace", color: PALETTE.textDim, marginBottom: "5px" }}>
          <span>使用ポイント</span>
          <span style={{ fontWeight: 800, color: PALETTE.text }}>{pointsUsed} / {pointsTotal}</span>
        </div>
        <div style={{ height: "6px", background: PALETTE.panel, borderRadius: "3px", overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: `${pct}%`,
            background: pct > 90 ? PALETTE.bad : pct > 70 ? PALETTE.warn : PALETTE.accent,
            transition: "width 0.4s ease",
          }} />
        </div>
        <div style={{ fontSize: "10px", color: PALETTE.textMute, marginTop: "6px", fontFamily: "'JetBrains Mono', monospace" }}>
          維持費 ⚡{pointsUsed} × ¥{costPerRound} = <strong style={{ color: PALETTE.bad }}>−¥{(pointsUsed * costPerRound).toLocaleString()}/R</strong>
        </div>
      </div>
      {placed.length === 0 ? (
        <div style={{
          fontSize: "11px", color: PALETTE.textMute, textAlign: "center",
          padding: "12px 8px", background: PALETTE.panelAlt, borderRadius: "8px",
          border: `1px dashed ${PALETTE.border}`,
        }}>
          各工程の <strong>＋</strong> ボタンで強化開始
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {placed.map(s => (
            <div key={s.id} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              fontSize: "11px",
              padding: "6px 9px",
              background: "#fef3c7",
              border: "1px solid #fbbf24",
              borderRadius: "6px",
            }}>
              <span style={{ fontWeight: 700, color: PALETTE.text }}>{s.label}</span>
              <span style={{ fontWeight: 800, color: "#92400e", fontFamily: "'JetBrains Mono', monospace" }}>
                ⚡ +{stationPoints[s.id]}
              </span>
            </div>
          ))}
        </div>
      )}
      <div style={{ fontSize: "10px", color: PALETTE.textMute, marginTop: "10px", lineHeight: 1.5 }}>
        💡 ポイントは <strong>毎ラウンドの能力ボーナス</strong>。割り振り過ぎると維持費で赤字になる。
      </div>
    </Card>
  );
}

function StatusBar({ round, totalRounds, phase, revenue, profit, day, costs, costBreakdown, lastRound }) {
  const phaseStyles = {
    normal: { bg: "#dcfce7", text: "#166534", label: "通常運用" },
    sale:   { bg: "#fee2e2", text: "#991b1b", label: "繁忙期" },
    review: { bg: "#ede9fe", text: "#5b21b6", label: "振り返り" },
  };
  const p = phaseStyles[phase] || phaseStyles.normal;
  const [open, setOpen] = React.useState(false);
  const cb = costBreakdown || { injection: 0, holding: 0, upgrade: 0 };
  const lr = lastRound || { revGained: 0, completed: 0, injectionCost: 0, wipCount: 0, holdCost: 0, upgradeCost: 0 };
  return (
    <Card kicker={`DAY ${day} · ROUND ${round}/${totalRounds}`}>
      <div style={{ display: "inline-block", background: p.bg, color: p.text,
        padding: "3px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: 700, marginBottom: "10px" }}>
        {p.label}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <div>
          <div style={{ fontSize: "10px", color: PALETTE.textMute, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>REVENUE</div>
          <div style={{ fontSize: "20px", fontWeight: 800, color: PALETTE.text, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.1 }}>
            ¥{revenue.toLocaleString()}
          </div>
        </div>
        <div>
          <div style={{ fontSize: "10px", color: PALETTE.textMute, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>NET PROFIT</div>
          <div style={{ fontSize: "20px", fontWeight: 800, color: profit >= 0 ? PALETTE.good : PALETTE.bad, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.1 }}>
            ¥{profit.toLocaleString()}
          </div>
        </div>
      </div>

      <button onClick={() => setOpen(o => !o)} style={{
        marginTop: "10px", width: "100%",
        padding: "6px 8px", fontSize: "10px", fontWeight: 700,
        background: PALETTE.panelAlt, border: `1px solid ${PALETTE.border}`,
        borderRadius: "6px", color: PALETTE.textDim, cursor: "pointer",
        fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span>計算式を{open ? "閉じる" : "見る"}</span>
        <span>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ marginTop: "8px", fontSize: "11px", lineHeight: 1.6, color: PALETTE.textDim }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: PALETTE.textMute, marginBottom: "4px", letterSpacing: "0.05em", fontWeight: 700 }}>
            前ラウンドの内訳
          </div>
          <Row label="✅ 完成品売上">
            +¥{lr.revGained.toLocaleString()} <span style={{ color: PALETTE.textMute }}>({lr.completed}個出荷)</span>
          </Row>
          <Row label="📦 投入コスト" neg>
            −¥{lr.injectionCost.toLocaleString()}
          </Row>
          <Row label="⏳ 滞留コスト" neg>
            −¥{lr.holdCost.toLocaleString()} <span style={{ color: PALETTE.textMute }}>({lr.wipCount}個 × ¥10)</span>
          </Row>
          <Row label="🎴 強化カード固定費" neg>
            −¥{lr.upgradeCost.toLocaleString()}
          </Row>
          <div style={{
            marginTop: "6px", paddingTop: "6px",
            borderTop: `1px dashed ${PALETTE.border}`,
            display: "flex", justifyContent: "space-between",
            fontWeight: 800, color: PALETTE.text, fontSize: "12px",
          }}>
            <span>このラウンド損益</span>
            <span style={{ color: (lr.revGained - lr.injectionCost - lr.holdCost - lr.upgradeCost) >= 0 ? PALETTE.good : PALETTE.bad, fontFamily: "'JetBrains Mono', monospace" }}>
              {(lr.revGained - lr.injectionCost - lr.holdCost - lr.upgradeCost) >= 0 ? "+" : ""}¥{(lr.revGained - lr.injectionCost - lr.holdCost - lr.upgradeCost).toLocaleString()}
            </span>
          </div>
          <div style={{
            marginTop: "8px", padding: "8px",
            background: "#fef3c7", borderRadius: "6px",
            fontSize: "10px", color: "#854d0e", lineHeight: 1.5,
          }}>
            💡 投入¥は<u>その瞬間に発生</u>。完成しなかった分は滞留として毎日¥10課金。<strong>「全投入＝高売上」ではなく、ボトルネックに合わせる</strong>のがコツ。
          </div>
        </div>
      )}
    </Card>
  );
}

function Row({ label, children, neg }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span>{label}</span>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
        color: neg ? PALETTE.bad : PALETTE.good,
      }}>{children}</span>
    </div>
  );
}

function MiniLeaderboard({ teams, currentTeamId }) {
  const sorted = [...teams].sort((a, b) => b.profit - a.profit);
  return (
    <Card kicker="LEADERBOARD">
      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
        {sorted.map((t, i) => {
          const me = t.id === currentTeamId;
          return (
            <div key={t.id} style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "7px 9px",
              background: me ? "#eff6ff" : PALETTE.panelAlt,
              border: me ? "1.5px solid #3b82f6" : `1px solid ${PALETTE.border}`,
              borderRadius: "8px",
            }}>
              <div style={{
                width: "20px", height: "20px",
                background: i === 0 ? "#fbbf24" : i === 1 ? "#a8a29e" : i === 2 ? "#b45309" : PALETTE.borderHi,
                color: i < 3 ? "#fff" : PALETTE.textDim,
                borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "10px", fontWeight: 800,
              }}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: PALETTE.text }}>
                  {t.name} {me && <span style={{ fontSize: "9px", color: "#3b82f6" }}>YOU</span>}
                </div>
                <div style={{ fontSize: "9px", color: PALETTE.textMute, fontFamily: "'JetBrains Mono', monospace" }}>
                  Throughput {t.units}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "13px", fontWeight: 800, color: PALETTE.text, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>
                  ¥{t.profit.toLocaleString()}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function BottleneckPanel({ utilization, stations, queues }) {
  const items = stations.map(s => ({
    id: s.id, label: s.label,
    util: utilization[s.id] || 0,
    queue: queues[s.id] || 0,
  })).sort((a, b) => b.util - a.util).slice(0, 6);
  return (
    <Card kicker="BOTTLENECK ANALYSIS">
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {items.map(it => {
          const c = it.util > 80 ? PALETTE.bad : it.util > 60 ? PALETTE.warn : PALETTE.good;
          return (
            <div key={it.id}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "2px" }}>
                <span style={{ color: PALETTE.text, fontWeight: 600 }}>{it.label}</span>
                <span style={{ color: c, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
                  {it.util.toFixed(0)}%
                </span>
              </div>
              <div style={{ height: "5px", background: PALETTE.panelAlt, borderRadius: "2px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min(100, it.util)}%`, background: c, transition: "width 0.5s ease" }} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function EventToast({ event }) {
  if (!event) return null;
  return (
    <div style={{
      background: "#fee2e2", border: `2px solid ${PALETTE.bad}`,
      borderRadius: "12px", padding: "12px 14px",
      display: "flex", alignItems: "center", gap: "10px",
      animation: "shake 0.5s ease-out",
    }}>
      <span style={{ fontSize: "26px" }}>{event.icon}</span>
      <div>
        <div style={{ fontSize: "10px", color: PALETTE.bad, fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, letterSpacing: "0.1em" }}>EVENT</div>
        <div style={{ fontSize: "14px", fontWeight: 800, color: PALETTE.text }}>{event.name}</div>
        <div style={{ fontSize: "11px", color: PALETTE.textDim }}>{event.desc}</div>
      </div>
    </div>
  );
}

function HintsPanel({ queues, stations, stationPoints, phase, round, totalRounds }) {
  const sorted = stations.map(s => ({ ...s, q: queues[s.id] || 0 })).sort((a, b) => b.q - a.q);
  const top = sorted[0];
  const upgradedCount = Object.values(stationPoints || {}).filter(v => v > 0).length;
  return (
    <Card kicker="💡 HINTS · TOC コーチ">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px", fontSize: "12px", lineHeight: 1.5, color: PALETTE.textDim, alignItems: "stretch" }}>
        {top && top.q > 3 ? (
          <div style={{ background: "#fef2f2", padding: "10px", borderRadius: "8px", border: `1px solid ${PALETTE.bad}33` }}>
            <div style={{ fontWeight: 700, color: PALETTE.bad, marginBottom: "3px" }}>🔴 ボトルネック検出</div>
            <strong>{top.label}</strong> に {top.q}個 滞留中。ここを強化するカードを優先配置。
          </div>
        ) : (
          <div style={{ background: "#f0fdf4", padding: "10px", borderRadius: "8px", border: `1px solid ${PALETTE.good}33` }}>
            <div style={{ fontWeight: 700, color: PALETTE.good, marginBottom: "3px" }}>🟢 フロー安定</div>
            目立った滞留なし。投入量を上げる余地があるかも。
          </div>
        )}
        {round === 1 ? (
          <div style={{ background: "#eff6ff", padding: "10px", borderRadius: "8px" }}>
            <div style={{ fontWeight: 700, color: "#1e40af", marginBottom: "3px" }}>🎴 まずカード配置</div>
            左のショップから工程強化カードをドラッグして配置。
          </div>
        ) : phase === "sale" ? (
          <div style={{ background: "#fefce8", padding: "10px", borderRadius: "8px" }}>
            <div style={{ fontWeight: 700, color: "#854d0e", marginBottom: "3px" }}>⚡ 繁忙期突入</div>
            イベント発生の可能性あり。バッファを厚めに。
          </div>
        ) : (
          <div style={{ background: "#eff6ff", padding: "10px", borderRadius: "8px" }}>
            <div style={{ fontWeight: 700, color: "#1e40af", marginBottom: "3px" }}>💰 投入バランス</div>
            高単価品ばかり作るのが正解とは限らない。スループット会計で判断。
          </div>
        )}
        <div style={{ background: PALETTE.panelAlt, padding: "10px", borderRadius: "8px" }}>
          <div style={{ fontWeight: 700, color: PALETTE.text, marginBottom: "5px" }}>📋 TOC 5ステップ</div>
          <ol style={{ margin: 0, paddingLeft: "18px", fontSize: "11px" }}>
            <li>ボトルネック特定</li>
            <li>徹底活用（休ませない）</li>
            <li>他工程を従属化</li>
            <li>能力強化（カード）</li>
            <li>次のボトルネックへ</li>
          </ol>
        </div>
        <div style={{ background: PALETTE.panelAlt, padding: "10px", borderRadius: "8px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 700, color: PALETTE.text, marginBottom: "5px" }}>📊 ステータス</div>
            <div style={{ fontSize: "11px", lineHeight: 1.7 }}>
              進行 <strong style={{ color: PALETTE.text }}>{Math.max(0, round - 1)}/{totalRounds}</strong> ラウンド<br />
              配置中 <strong style={{ color: PALETTE.text }}>{upgradedCount}枚</strong> のカード<br />
              フェーズ <strong style={{ color: PALETTE.text }}>{phase === "sale" ? "繁忙期" : "通常運用"}</strong>
            </div>
          </div>
          <div style={{ fontSize: "10px", color: PALETTE.textMute, fontFamily: "'JetBrains Mono', monospace", marginTop: "6px" }}>
            残り {Math.max(0, totalRounds - round + 1)} ラウンド
          </div>
        </div>
      </div>
    </Card>
  );
}

window.UI = { Card, ProductMixPanel, PointsPool, StatusBar, HintsPanel, BottleneckPanel, EventToast };
