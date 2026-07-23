// ====== 配置（改梗从这里下手） ======
const CONFIG = {
  baselineRate: 50 / 3,        // 2017 基准：1 CNY = 16.6667 JPY（1円 = 0.06元）
  budgetCny: 388000,           // 预算：38.8 万元人民币
  pricePerYearJpy: 200000,     // 专属陪伴单价：20 万日元/年
  lifetimeYears: 50,           // 触发《终身套餐自动生效条款》的年限
  fallbackRate: 24.071,        // 两个 API 都挂时的离线兜底汇率
  images: [
    'images/chizuru-01.jpg',
    'images/chizuru-02.jpg',
    'images/chizuru-03.jpg',
    'images/chizuru-04.jpg',
    'images/chizuru-05.jpg',
  ],
};

const DATA_BASE = 'https://raw.githubusercontent.com/LanscorTK/mzhr-index/data';

// ====== 数据源 ======
async function fetchRate() {
  // 首选：仓库 data 分支（GitHub Actions 约每10分钟抓一次 Yahoo Finance 盘中价）
  try {
    const res = await fetch(`${DATA_BASE}/rate.json`, { cache: 'no-cache' });
    const data = await res.json();
    const rate = Number(data.rate);
    if (Number.isFinite(rate) && rate > 15 && rate < 40) {
      return {
        rate,
        date: new Date(data.time * 1000),
        source: 'Yahoo Finance（盘中价，约每10分钟更新）',
        showTime: true,
      };
    }
  } catch { /* 落到下面的日更源 */ }
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/CNY');
    const data = await res.json();
    if (data.result === 'success' && Number.isFinite(Number(data.rates?.JPY))) {
      return {
        rate: Number(data.rates.JPY),
        date: new Date(data.time_last_update_unix * 1000),
        source: 'ExchangeRate-API（每日更新）',
      };
    }
    throw new Error('er-api bad payload');
  } catch {
    try {
      const res = await fetch('https://api.frankfurter.dev/v1/latest?base=CNY&symbols=JPY');
      const data = await res.json();
      if (!Number.isFinite(Number(data.rates?.JPY))) throw new Error('frankfurter bad payload');
      return {
        rate: Number(data.rates.JPY),
        date: new Date(data.date + 'T00:00:00Z'),
        source: '欧洲央行 · Frankfurter（每日更新）',
      };
    } catch {
      return {
        rate: CONFIG.fallbackRate,
        date: null,
        source: '离线存档数据（实时接口暂不可用，仅供参考）',
      };
    }
  }
}

// ====== 换算 ======
function compute(rate) {
  const index = -(rate / CONFIG.baselineRate - 1) * 100;
  const totalJpy = CONFIG.budgetCny * rate;
  const years = totalJpy / CONFIG.pricePerYearJpy;
  const baselineYears = CONFIG.budgetCny * CONFIG.baselineRate / CONFIG.pricePerYearJpy;
  const lifetimeRate = CONFIG.lifetimeYears * CONFIG.pricePerYearJpy / CONFIG.budgetCny;
  return { index, totalJpy, years, baselineYears, diffYears: years - baselineYears, lifetimeRate };
}

function yearsToYm(years) {
  let y = Math.floor(years);
  let m = Math.round((years - y) * 12);
  if (m === 12) { y += 1; m = 0; }
  return m > 0 ? `${y}年零${m}个月` : `${y}年整`;
}

const CN_DIGITS = '〇一二三四五六七八九';
function cnDate(d) {
  const y = String(d.getFullYear()).split('').map(c => CN_DIGITS[+c]).join('');
  const cn = n => n < 10 ? CN_DIGITS[n]
    : n === 10 ? '十'
    : n < 20 ? '十' + CN_DIGITS[n % 10]
    : CN_DIGITS[Math.floor(n / 10)] + '十' + (n % 10 ? CN_DIGITS[n % 10] : '');
  return `${y}年${cn(d.getMonth() + 1)}月${cn(d.getDate())}日`;
}

const fmt = (n, digits = 2) => n.toLocaleString('zh-CN', {
  minimumFractionDigits: digits, maximumFractionDigits: digits,
});

// ====== 渲染 ======
function render({ rate, date, source, showTime }) {
  const r = compute(rate);
  const $ = id => document.getElementById(id);
  const displayDate = date ?? new Date();

  $('issue-no').textContent =
    `第${String(Math.ceil((displayDate - new Date(displayDate.getFullYear(), 0, 0)) / 864e5)).padStart(3, '0')}期`;
  $('issue-date').textContent = cnDate(displayDate);

  const iv = $('index-value');
  iv.textContent = `${r.index >= 0 ? '+' : ''}${fmt(r.index)}`;
  iv.classList.toggle('up', r.index >= 0);
  $('index-note').textContent = r.index < 0
    ? `日元较2017年基准贬值约${fmt(-r.index)}%`
    : `日元较2017年基准升值约${fmt(r.index)}%`;

  $('para-1').innerHTML =
    `受日元${r.index < 0 ? '继续走软' : '汇率回升'}影响，今日水源千鹤指数更新为 <strong>${fmt(r.index)}</strong>` +
    `（日元较2017年基准${r.index < 0 ? '贬值' : '升值'}约${fmt(Math.abs(r.index))}%）。`;

  $('para-2').innerHTML =
    `您的 <strong>38.8万元人民币</strong> 预算，按实时汇率 <strong>1:${fmt(rate, 3)}</strong> 计算，` +
    `可兑换约 <strong>${fmt(r.totalJpy / 10000)}万日元</strong>，` +
    `折合水源千鹤专属陪伴 <strong>${fmt(r.years)}年</strong>（约${yearsToYm(r.years)}）。`;

  $('para-3').innerHTML = r.diffYears >= 0
    ? `相比2017年基准购买力，同笔预算多出 <strong>${fmt(r.diffYears, 1)}年</strong> 的相伴时长。`
    : `相比2017年基准购买力，同笔预算缩水 <strong>${fmt(-r.diffYears, 1)}年</strong> 的相伴时长，请谨慎安排。`;

  $('t-rate').textContent = `1 元 = ${fmt(rate, 3)} 日元`;
  $('t-jpy').textContent = `${fmt(r.totalJpy, 0)} 日元（约${fmt(r.totalJpy / 10000)}万）`;
  $('t-years').textContent = `${fmt(r.years)} 年（${yearsToYm(r.years)}）`;
  $('t-diff').textContent = `${r.diffYears >= 0 ? '+' : ''}${fmt(r.diffYears)} 年`;

  $('clause').textContent = r.years >= CONFIG.lifetimeYears
    ? `折合陪伴时长已达 ${CONFIG.lifetimeYears} 年，《终身套餐自动生效条款》已触发，恕不退换 ♡`
    : `日元${r.index < 0 ? '再度探底，陪伴持续延长' : '暂有回升，敬请关注'}。汇率升至 1:${fmt(r.lifetimeRate, 2)}` +
      `（尚差 ${fmt(r.lifetimeRate - rate, 3)}）即触发《终身套餐自动生效条款》。`;

  const pct = Math.min(r.years / CONFIG.lifetimeYears * 100, 100);
  $('progress-text').textContent = `${fmt(r.years)} / ${CONFIG.lifetimeYears} 年（${fmt(pct, 1)}%）`;
  $('progress-bar-wrap').setAttribute('aria-valuenow', pct.toFixed(1));
  requestAnimationFrame(() => {
    $('progress-fill').style.width = `${pct}%`;
    $('progress-heart').style.left = `${pct}%`;
  });

  const dateText = !date ? ''
    : showTime
      ? ` · 数据时间 ${date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}`
      : ` · 数据时间 ${date.toISOString().slice(0, 10)}`;
  $('data-source').textContent = `数据来源：${source}${dateText}`;

  document.getElementById('seal').classList.add('stamped');
}

// ====== 看板娘：远程图池随机（不与上次重复），失败回退本地 ======
async function pickImage() {
  let pool = CONFIG.images;
  try {
    const res = await fetch(`${DATA_BASE}/images.json`, { cache: 'no-cache' });
    const list = await res.json();
    const valid = Array.isArray(list)
      ? list.filter(u => typeof u === 'string' && u.startsWith('https://'))
      : [];
    if (valid.length) pool = valid;
  } catch { /* 用本地图池 */ }

  const last = localStorage.getItem('mzhr-last-img');
  const candidates = pool.length > 1 ? pool.filter(u => u !== last) : pool;
  const src = candidates[Math.floor(Math.random() * candidates.length)];

  const img = document.getElementById('chizuru-img');
  img.onerror = () => {
    img.onerror = null;
    const locals = CONFIG.images.filter(u => u !== src);
    img.src = locals[Math.floor(Math.random() * locals.length)];
  };
  img.src = src;
  localStorage.setItem('mzhr-last-img', src);
}

// ====== 启动 ======
pickImage();
fetchRate().then(render);
