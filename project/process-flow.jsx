// Process flow visualization — light theme, multi-product routing

const { PALETTE } = window.GameData;

function StationNode({ station, capacity, queue, queueByProduct, products, points, pointsRemaining, onAddPoint, onRemovePoint, isBottleneck }) {
  return (
    <div
      style={{
        position: "absolute",
        left: `${station.col * 200 + 24}px`,
        top: `${station.row * 220 + 24}px`,
        width: "150px",
        height: "200px",
        borderRadius: "12px",
        background: isBottleneck ? "#fef2f2" : PALETTE.panel,
        border: isBottleneck ? `2px solid ${PALETTE.bad}` : `1px solid ${PALETTE.border}`,
        boxShadow: isBottleneck
          ? "0 0 0 4px rgba(220,38,38,0.12), 0 4px 12px rgba(220,38,38,0.18)"
          : "0 1px 2px rgba(0,0,0,0.04), 0 4px 10px rgba(0,0,0,0.04)",
        padding: "10px 12px",
        zIndex: 10,
        transition: "all 0.25s ease",
        animation: isBottleneck ? "bn-pulse 1.6s ease-in-out infinite" : "none",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: "9px", color: PALETTE.textMute, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em", fontWeight: 700 }}>
            工程
          </div>
          <div style={{ fontSize: "13px", fontWeight: 700, color: PALETTE.text, marginTop: "1px" }}>
            {station.label}
          </div>
        </div>
        <div title={`本日の処理能力: サイコロ + 強化ポイント = ${capacity}`} style={{
          width: "30px", height: "30px",
          background: capacity === 0 ? "#fee2e2" : capacity >= 6 ? "#dcfce7" : PALETTE.panelAlt,
          color: capacity === 0 ? PALETTE.bad : capacity >= 6 ? PALETTE.good : PALETTE.text,
          borderRadius: "6px",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          fontWeight: 800, fontSize: "13px",
          fontFamily: "'JetBrains Mono', monospace",
          border: `1px solid ${capacity === 0 ? "#fecaca" : capacity >= 6 ? "#bbf7d0" : PALETTE.border}`,
          lineHeight: 1,
        }}>
          <div style={{ fontSize: "7px", fontWeight: 700, opacity: 0.6, letterSpacing: "0.05em" }}>能力</div>
          <div>🎲{capacity}</div>
        </div>
      </div>

      <div style={{ marginTop: "6px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: PALETTE.textDim, fontFamily: "'JetBrains Mono', monospace", marginBottom: "2px" }}>
          <span>滞留</span>
          <span style={{ color: queue > 5 ? PALETTE.bad : queue > 2 ? PALETTE.warn : PALETTE.textDim, fontWeight: 700 }}>{queue}個</span>
        </div>
        <div style={{ height: "4px", background: PALETTE.panelAlt, borderRadius: "2px", overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: `${Math.min(100, queue * 12)}%`,
            background: queue > 5 ? PALETTE.bad : queue > 2 ? PALETTE.warn : PALETTE.good,
            transition: "width 0.5s ease",
          }} />
        </div>

        {products && (
          <div style={{ display: "flex", justifyContent: "space-between", gap: "3px", marginTop: "5px" }}>
            {products.filter(p => p.route.includes(station.id)).map(p => {
              const n = (queueByProduct?.[station.id]?.[p.id]) || 0;
              const active = n > 0;
              return (
                <div key={p.id} style={{
                  flex: 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "2px",
                  background: active ? p.color + "22" : PALETTE.panelAlt,
                  border: `1px solid ${active ? p.color + "66" : PALETTE.border}`,
                  borderRadius: "4px",
                  padding: "2px 0",
                  fontSize: "10px",
                  fontWeight: 700,
                  color: active ? p.color : PALETTE.textMute,
                  opacity: active ? 1 : 0.5,
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  <span>{p.icon}</span>
                  <span>{n}</span>
                </div>
              );
            })}
          </div>
        )}

        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          fontSize: "10px", fontFamily: "'JetBrains Mono', monospace", marginTop: "5px",
          color: queue > 5 ? PALETTE.bad : queue > 2 ? PALETTE.warn : PALETTE.textMute,
          fontWeight: queue > 2 ? 700 : 500,
        }}>
          <span>💸 滞留</span>
          <span>−¥{queue * 10}/R</span>
        </div>
      </div>

      {/* Upgrade points control */}
      <div style={{
        position: "absolute", left: "10px", right: "10px", bottom: "8px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: points > 0 ? "#fef3c7" : PALETTE.panelAlt,
        border: `1px solid ${points > 0 ? "#fbbf24" : PALETTE.border}`,
        borderRadius: "6px",
        padding: "3px 5px",
        fontSize: "10px",
        fontFamily: "'JetBrains Mono', monospace",
      }} title="強化ポイントを割り振ると毎ラウンドの処理能力が+1ずつ上がる">
        <button
          onClick={() => onRemovePoint?.(station.id)}
          disabled={points <= 0}
          style={{
            width: "20px", height: "20px", border: "none", borderRadius: "4px",
            background: points > 0 ? "#fff" : "transparent",
            color: points > 0 ? PALETTE.text : PALETTE.textMute,
            cursor: points > 0 ? "pointer" : "not-allowed",
            fontWeight: 800, fontSize: "13px", lineHeight: 1,
          }}>−</button>
        <div style={{ fontWeight: 800, color: points > 0 ? "#92400e" : PALETTE.textMute }}>
          ⚡ +{points || 0}
        </div>
        <button
          onClick={() => onAddPoint?.(station.id)}
          disabled={pointsRemaining <= 0}
          style={{
            width: "20px", height: "20px", border: "none", borderRadius: "4px",
            background: pointsRemaining > 0 ? "#fff" : "transparent",
            color: pointsRemaining > 0 ? PALETTE.text : PALETTE.textMute,
            cursor: pointsRemaining > 0 ? "pointer" : "not-allowed",
            fontWeight: 800, fontSize: "13px", lineHeight: 1,
          }}>+</button>
      </div>
    </div>
  );
}

function FlowLines({ products, stations, width, height }) {
  // Each product draws its own colored route
  return (
    <svg width={width} height={height} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <defs>
        {products.map(p => (
          <marker key={p.id} id={`arrow-${p.id}`} viewBox="0 0 10 10" refX="8" refY="5"
            markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={p.color} />
          </marker>
        ))}
      </defs>
      {products.map((p, pIdx) => {
        const offset = (pIdx - 1) * 6;
        const points = p.route.map(sid => {
          const s = stations.find(st => st.id === sid);
          return { x: s.col * 200 + 24 + 150, y: s.row * 220 + 24 + 100, exitX: s.col * 200 + 24, exitY: s.row * 220 + 24 + 100 };
        });
        const path = points.map((pt, i) => {
          if (i === 0) return `M ${pt.x} ${pt.y + offset}`;
          const prev = points[i - 1];
          const midX = (prev.x + pt.exitX) / 2;
          return `C ${midX} ${prev.y + offset}, ${midX} ${pt.exitY + offset}, ${pt.exitX} ${pt.exitY + offset}`;
        }).join(" ");
        return (
          <path key={p.id} d={path} stroke={p.color} strokeWidth="2" fill="none" opacity="0.45"
            strokeDasharray="0" />
        );
      })}
    </svg>
  );
}

function FlowParticles({ particles, stations }) {
  return (
    <svg style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {particles.map(p => {
        const from = stations.find(s => s.id === p.from);
        const to = stations.find(s => s.id === p.to);
        if (!from || !to) return null;
        const fx = from.col * 200 + 24 + 150;
        const fy = from.row * 220 + 24 + 100;
        const tx = to.col * 200 + 24;
        const ty = to.row * 220 + 24 + 100;
        const t = p.progress;
        const midX = (fx + tx) / 2;
        const x = (1-t)**3 * fx + 3*(1-t)**2*t*midX + 3*(1-t)*t*t*midX + t**3*tx;
        const y = (1-t)**3 * fy + 3*(1-t)**2*t*fy + 3*(1-t)*t*t*ty + t**3*ty;
        return <circle key={p.id} cx={x} cy={y} r="5" fill={p.color}
          style={{ filter: `drop-shadow(0 0 4px ${p.color})` }} />;
      })}
    </svg>
  );
}

function PileColumn({ title, kicker, products, counts, side, totalRev, totalCost, hint }) {
  const width = 130;
  return (
    <div style={{
      width: `${width}px`,
      borderRadius: "12px",
      background: side === "in" ? "#fff7ed" : "#f0fdf4",
      border: `1px dashed ${side === "in" ? "#fed7aa" : "#bbf7d0"}`,
      padding: "10px 8px",
      display: "flex", flexDirection: "column", gap: "10px",
      alignSelf: "stretch",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "9px", color: PALETTE.textMute, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em", fontWeight: 700 }}>
          {kicker}
        </div>
        <div style={{ fontSize: "12px", fontWeight: 800, color: PALETTE.text, marginTop: "2px" }}>
          {title}
        </div>
        {totalCost != null && (
          <div style={{ fontSize: "11px", color: "#9a3412", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, marginTop: "2px" }}>
            −¥{totalCost.toLocaleString()}
          </div>
        )}
        {totalRev != null && (
          <div style={{ fontSize: "11px", color: "#166534", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, marginTop: "2px" }}>
            +¥{totalRev.toLocaleString()}
          </div>
        )}
        {hint && (
          <div style={{ fontSize: "9px", color: PALETTE.textMute, marginTop: "2px" }}>{hint}</div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
        {products.map(p => {
          const n = counts[p.id] || 0;
          const dots = Math.min(n, 12);
          const subAmount = side === "in"
            ? n * p.costPerInject
            : n * p.price;
          return (
            <div key={p.id} style={{
              padding: "6px 6px",
              background: "#fff",
              border: `1px solid ${PALETTE.border}`,
              borderRadius: "8px",
              borderLeft: `3px solid ${p.color}`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2px" }}>
                <span style={{ fontSize: "13px" }}>{p.icon}</span>
                <span style={{
                  fontSize: "13px", fontWeight: 800, color: PALETTE.text,
                  fontFamily: "'JetBrains Mono', monospace",
                }}>{n}</span>
              </div>
              <div style={{
                fontSize: "9px", color: side === "in" ? "#9a3412" : "#166534",
                fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
                textAlign: "right", marginBottom: "3px",
              }}>
                {side === "in" ? "−" : "+"}¥{subAmount.toLocaleString()}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "2px", minHeight: "10px" }}>
                {Array.from({ length: dots }).map((_, i) => (
                  <div key={i} style={{
                    width: "8px", height: "8px",
                    borderRadius: "50%", background: p.color,
                    opacity: 0.85,
                  }} />
                ))}
                {n > 12 && (
                  <span style={{ fontSize: "9px", color: PALETTE.textDim, fontFamily: "'JetBrains Mono', monospace" }}>
                    +{n - 12}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProcessFlow({ topology, capacity, queues, queueByProduct, bottleneck, particles, stationPoints, pointsRemaining, onAddPoint, onRemovePoint, productMix, throughput, lastRound }) {
  const stations = topology.stations;
  const products = topology.products;
  const maxCol = Math.max(...stations.map(s => s.col));
  const maxRow = Math.max(...stations.map(s => s.row));
  const stationsWidth = (maxCol + 1) * 200 + 50;
  const height = (maxRow + 1) * 220 + 50;

  const totalRev = products.reduce((s, p) => s + (throughput?.[p.id] || 0) * p.price, 0);
  const totalInjectCost = products.reduce((s, p) => s + (productMix?.[p.id] || 0) * p.costPerInject, 0);
  const lastRevGained = lastRound?.revGained || 0;

  return (
    <div style={{ display: "flex", gap: "12px", alignItems: "stretch", justifyContent: "center" }}>
      <PileColumn
        title="本日の投入"
        kicker="INPUT · 原材料"
        products={products}
        counts={productMix || {}}
        side="in"
        totalCost={totalInjectCost}
        hint="投入時に発生"
      />
      <div style={{ position: "relative", width: `${stationsWidth}px`, height: `${height}px` }}>
        <FlowLines products={products} stations={stations} width={stationsWidth} height={height} />
        <FlowParticles particles={particles} stations={stations} />
        {stations.map(s => (
          <StationNode
            key={s.id}
            station={s}
            capacity={capacity[s.id] ?? 0}
            queue={queues[s.id] ?? 0}
            queueByProduct={queueByProduct}
            products={products}
            isBottleneck={bottleneck === s.id}
            points={stationPoints?.[s.id] || 0}
            pointsRemaining={pointsRemaining}
            onAddPoint={onAddPoint}
            onRemovePoint={onRemovePoint}
          />
        ))}
      </div>
      <PileColumn
        title="累計出荷"
        kicker="OUTPUT · 完成品"
        products={products}
        counts={throughput || {}}
        side="out"
        totalRev={totalRev}
        hint={lastRevGained > 0 ? `前ラウンド +¥${lastRevGained.toLocaleString()}` : ""}
      />
    </div>
  );
}

window.ProcessFlow = ProcessFlow;
