// Game data — TOC Executive Challenge style
// 3 products, each with its own routing through shared processes
// Players decide: (1) product mix to inject, (2) which station to upgrade

const DIFFICULTY_CONFIG = {
  easy:   { rounds: 10, eventChance: 0,    pointPool: 12, label: "Easy" },
  normal: { rounds: 15, eventChance: 0.35, pointPool: 8,  label: "Normal" },
  hard:   { rounds: 20, eventChance: 0.55, pointPool: 5,  label: "Hard" },
};

// Stations are shared. Each product visits a subset in order.
const FACTORY = {
  stations: [
    { id: "lathe",    label: "旋盤",   short: "旋", row: 0, col: 0 },
    { id: "drill",    label: "穴あけ", short: "穴", row: 0, col: 1 },
    { id: "press",    label: "プレス", short: "プ", row: 1, col: 0 },
    { id: "weld",     label: "溶接",   short: "溶", row: 1, col: 1 },
    { id: "cast",     label: "鋳造",   short: "鋳", row: 2, col: 0 },
    { id: "polish",   label: "研磨",   short: "研", row: 2, col: 1 },
    { id: "assembly", label: "組立",   short: "組", row: 1, col: 2 },
    { id: "inspect",  label: "検品",   short: "検", row: 1, col: 3 },
    { id: "pack",     label: "梱包",   short: "梱", row: 1, col: 4 },
  ],
  products: [
    {
      id: "premium", name: "高級品 α", icon: "💎",
      route: ["lathe", "drill", "assembly", "inspect", "pack"],
      price: 500, color: "#a855f7", costPerInject: 80,
    },
    {
      id: "standard", name: "中級品 β", icon: "📦",
      route: ["press", "weld", "assembly", "inspect", "pack"],
      price: 300, color: "#3b82f6", costPerInject: 50,
    },
    {
      id: "basic", name: "廉価品 γ", icon: "🔩",
      route: ["cast", "polish", "inspect", "pack"],
      price: 100, color: "#10b981", costPerInject: 20,
    },
  ],
};

const WEB = {
  stations: [
    { id: "cf",        label: "CloudFront", short: "CF",  row: 1, col: 0 },
    { id: "alb",       label: "ALB",        short: "LB",  row: 1, col: 1 },
    { id: "prod_api",  label: "商品API",    short: "商",  row: 0, col: 2 },
    { id: "stock_api", label: "在庫API",    short: "在",  row: 1, col: 2 },
    { id: "rec_api",   label: "推薦API",    short: "推",  row: 2, col: 2 },
    { id: "rds",       label: "商品DB",     short: "PD",  row: 0, col: 3 },
    { id: "dynamo",    label: "在庫DB",     short: "SD",  row: 1, col: 3 },
    { id: "ml",        label: "ML推論",     short: "ML",  row: 2, col: 3 },
    { id: "bff",       label: "BFF集約",    short: "BFF", row: 1, col: 4 },
  ],
  products: [
    {
      id: "checkout", name: "決済リクエスト", icon: "💳",
      route: ["cf", "alb", "prod_api", "rds", "stock_api", "dynamo", "bff"],
      price: 500, color: "#a855f7", costPerInject: 80,
    },
    {
      id: "browse", name: "閲覧リクエスト", icon: "🛍",
      route: ["cf", "alb", "prod_api", "rds", "bff"],
      price: 200, color: "#3b82f6", costPerInject: 30,
    },
    {
      id: "search", name: "検索+推薦", icon: "🔍",
      route: ["cf", "alb", "rec_api", "ml", "bff"],
      price: 350, color: "#10b981", costPerInject: 50,
    },
  ],
};

const TOPOLOGIES = { factory: FACTORY, web: WEB };

// Resource cards — upgrade a single station
const RESOURCE_CARDS = {
  factory: [
    { id: "auto_lathe",  name: "旋盤自動化",   cost: 2, target: "lathe",    effect: "+2 capacity", icon: "⚙" },
    { id: "auto_drill",  name: "穴あけ自動化", cost: 2, target: "drill",    effect: "+2 capacity", icon: "⚙" },
    { id: "auto_press",  name: "プレス自動化", cost: 2, target: "press",    effect: "+2 capacity", icon: "⚙" },
    { id: "auto_weld",   name: "溶接ロボ",     cost: 2, target: "weld",     effect: "+2 capacity", icon: "🤖" },
    { id: "auto_cast",   name: "鋳造機増設",   cost: 2, target: "cast",     effect: "+2 capacity", icon: "🔥" },
    { id: "auto_polish", name: "研磨機増設",   cost: 2, target: "polish",   effect: "+2 capacity", icon: "✨" },
    { id: "two_assy",    name: "組立2ライン",  cost: 3, target: "assembly", effect: "+3 capacity", icon: "🔧" },
    { id: "qc_team",     name: "検品増員",     cost: 2, target: "inspect",  effect: "+2 capacity", icon: "👁" },
    { id: "auto_pack",   name: "梱包自動化",   cost: 1, target: "pack",     effect: "+2 capacity", icon: "📦" },
  ],
  web: [
    { id: "asg_prod",   name: "商品API ASG",   cost: 2, target: "prod_api",  effect: "+2 capacity", icon: "⚡" },
    { id: "asg_stock",  name: "在庫API ASG",   cost: 2, target: "stock_api", effect: "+2 capacity", icon: "⚡" },
    { id: "asg_rec",    name: "推薦API ASG",   cost: 2, target: "rec_api",   effect: "+2 capacity", icon: "⚡" },
    { id: "rds_replica",name: "RDS Replica",   cost: 2, target: "rds",       effect: "+2 capacity", icon: "📚" },
    { id: "dynamo_dax", name: "DAX Cache",     cost: 2, target: "dynamo",    effect: "+2 capacity", icon: "💎" },
    { id: "ml_gpu",     name: "GPU推論",       cost: 3, target: "ml",        effect: "+3 capacity", icon: "🧠" },
    { id: "alb_scale",  name: "ALB容量増",     cost: 1, target: "alb",       effect: "+2 capacity", icon: "🔀" },
    { id: "cf_pop",     name: "CF POP増",      cost: 1, target: "cf",        effect: "+2 capacity", icon: "🌐" },
    { id: "bff_scale",  name: "BFF ASG",       cost: 2, target: "bff",       effect: "+2 capacity", icon: "🔧" },
  ],
};

const EVENTS = {
  factory: [
    { id: "breakdown_lathe", name: "旋盤故障",   desc: "旋盤capacity = 0", icon: "💥", target: "lathe" },
    { id: "breakdown_weld",  name: "溶接機故障", desc: "溶接capacity = 0", icon: "💥", target: "weld" },
    { id: "rush_order",      name: "急ぎ注文",   desc: "需要+50%",         icon: "🔥" },
    { id: "shortage",        name: "材料不足",   desc: "投入コスト2倍",    icon: "📉" },
  ],
  web: [
    { id: "ddos",     name: "DDoS",       desc: "CF capacity = 0",   icon: "💀", target: "cf" },
    { id: "slow_q",   name: "スロークエリ", desc: "RDS capacity 半減", icon: "🐌", target: "rds" },
    { id: "flash",    name: "フラッシュセール", desc: "需要 +100%",     icon: "⚡" },
    { id: "ml_lag",   name: "ML推論遅延",  desc: "ML capacity 半減",   icon: "🔻", target: "ml" },
  ],
};

// Light theme palette
const PALETTE = {
  bg:        "#fafaf9",
  panel:     "#ffffff",
  panelAlt:  "#f5f5f4",
  border:    "#e7e5e4",
  borderHi:  "#d6d3d1",
  text:      "#1c1917",
  textDim:   "#57534e",
  textMute:  "#a8a29e",
  accent:    "#0f172a",
  accentInk: "#fafaf9",
  good:      "#16a34a",
  warn:      "#ea580c",
  bad:       "#dc2626",
  hot:       "#ef4444",
  premium:   "#a855f7",
  standard:  "#3b82f6",
  basic:     "#10b981",
};

window.GameData = { DIFFICULTY_CONFIG, TOPOLOGIES, RESOURCE_CARDS, EVENTS, PALETTE };
