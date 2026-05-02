# CLAUDE.md

このリポジトリで作業する際にClaude Code（および他のAIコーディングエージェント）が参照するガイド。

## プロジェクト概要

**TOC Games · Bottleneck Battle** — 制約理論（Theory of Constraints, TOC）を体験する教育用Webゲーム。
プレイヤーは工場長／SAチームとして、限られたリソースで利益最大化を目指す。

学べること：
- ボトルネックの発見と集中投資
- 統計的変動と従属事象（ハーシュベイガー効果）
- スループット会計（高単価品＝正解 ではない）
- 投入過多のムダ（ドラム・バッファ・ロープ）

ターゲット：プロジェクター投影でのチーム研修。デスクトップ大画面想定（最小幅1720px）。

## 起動方法

ビルドステップなし。ブラウザのBabel Standaloneが`text/babel`スクリプトをトランスパイルする。

```bash
cd project
python3 -m http.server 8080
# http://localhost:8080/TOC%20Games.html
```

`file://`での直接オープンは、外部JSXのfetchがCORSで弾かれる場合がある。必ずHTTP経由で配信する。

## ファイル構成

```
project/
  TOC Games.html         # エントリポイント。React/ReactDOM/Babel CDN + 各JSXを読み込み、Rootをマウント
  game-engine.jsx        # データ層: トポロジー・製品・イベント・難易度・パレット (window.GameData)
  process-flow.jsx       # 工場フロア描画: StationNode / FlowLines / FlowParticles / PileColumn (window.ProcessFlow)
  sidebar-components.jsx # サイドバーUI: ProductMixPanel / PointsPool / StatusBar / HintsPanel / EventToast (window.UI)
  tweaks-panel.jsx       # 右下フローティングTweaks（テーマ/難易度/速度/イベント頻度） (window.useTweaks など)
  app.jsx                # メイン: App / Header / Onboarding / ResultsOverlay (window.App)
```

各JSXファイルは`window.*`にエクスポートする伝統的グローバル方式（モジュールバンドラなし）。
読み込み順は HTML 側に固定：tweaks-panel → game-engine → process-flow → sidebar-components → app。

## ゲーム仕様（重要）

ここを変える時は意図を確認してから。ゲームバランスとTOC教育効果に直結する。

### 状態モデル
- **stationPoints**: `{stationId: number}` — 各工程に割り振られた強化ポイント。サイコロ結果に+1ずつ加算
- **productMix**: `{productId: number}` — 各製品の毎ラウンド投入数。プレイヤーが+/−で調整
- **queues**: `{stationId: [item, ...]}` — 各工程の仕掛品キュー。`item.routeIdx`で経路上の現在地を追跡
- **throughput**: `{productId: number}` — 完成品の累計
- **revenue / costs**: 累計値。`profit = revenue − costs`

### 1ラウンドの処理（app.jsx `runRound`）
1. 各工程で1〜6のサイコロ → `stationPoints`を加算 → その日の処理能力
2. 繁忙期（ラウンド後半）は確率でイベント発生（capacity減 or 需要増）
3. `productMix`に従って各製品の最初の工程に投入（投入コスト発生）
4. col昇順で各工程を処理。能力分だけ次工程へ流す。最終工程まで到達した分は完成品
5. パーティクルアニメーション（particles state、bezier補間）
6. 集計: 売上 +、投入コスト/滞留コスト/強化維持費 −

### コスト構造
- **投入コスト**: 投入した瞬間に発生。`productMix[id] × p.costPerInject`
- **滞留コスト**: 仕掛品1個 × ¥10 / ラウンド（`wipCount * 10`）
- **強化維持費**: ポイント1個 × ¥150 / ラウンド（`POINT_COST_PER_ROUND = 150`）

### 製品（factoryテーマ）
- 高級品α ¥500（投入¥80）: 旋盤→穴あけ→組立→検品→梱包
- 中級品β ¥300（投入¥50）: プレス→溶接→組立→検品→梱包
- 廉価品γ ¥100（投入¥20）: 鋳造→研磨→検品→梱包

組立・検品・梱包は3製品共通の合流点。ここがボトルネックになりやすい設計。

### 難易度（difficulty.pointPool で違い）
- Easy: 10ラウンド・12pt・イベントなし
- Normal: 15ラウンド・8pt・イベント率0.35
- Hard: 20ラウンド・5pt・イベント率0.55

## デザイン原則（チャット履歴より）

会話を通じて固まった意思決定。安易に戻さない：

1. **ライトテーマ固定**（暖色系オフホワイト）— ダークは却下済み
2. **ドラッグ&ドロップ撤廃** — 各工程の+/−ボタンによるポイント割り振りに変更（UX向上のため）
3. **LEADERBOARD廃止** — ブラウザ単独完結。チーム連携は不要
4. **HINTS は工場フロアの下に横並び4カラム** — 右カラム廃止で工場を広く
5. **滞留コストは各工程ノードに常時表示**（`−¥X/R`）— ボタン押下前に痛みが見える
6. **製品別WIP内訳**を各工程ノードに（🔧α 5 / 🎁β 3 / ...） — どの製品が詰まっているか即判別
7. **ヘッダーに集約**: ロゴ・イベント・ルール・Reset・Round実行ボタン
8. **本日の投入 / 累計出荷の山** を工場フロアの左右に統合 — 一連の流れを視覚化

## 開発の注意

- **JSX変更後は必ずブラウザでハードリロード**（CDN Babelはキャッシュされやすい）
- **emojiを安易に増やさない** — 既存のところに留める
- **window.* グローバル汚染前提** — bundler導入はスコープ外。やりたい場合はユーザに確認
- **viewport幅 1760px固定** — `<meta>`と`body min-width`を変える時は両方
- **ボトルネック判定** = WIPが最大の工程（`bottleneck`変数）。能力ではなく滞留量ベース
- **状態リセット**: テーマ・難易度切替で全state再初期化（`useEffect` deps）

## ブランチ運用

開発はすべて `claude/implement-toc-games-cO0rj` ブランチで実施。`main`への直接プッシュは行わない。

## 参考

- 元々のデザインバンドル: Claude Design からの handoff（HTML/CSS/JSプロトタイプ）
- チャット履歴の意思決定要約は上記「デザイン原則」を参照
