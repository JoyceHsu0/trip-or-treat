(function () {
  'use strict';

  /* ---------- 小工具 ---------- */
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  /* 跳脫後，把 *文字* 變成重點色，換行變 <br> */
  const rich = (s) => esc(s).replace(/\*(.+?)\*/g, '<em class="hl">$1</em>').replace(/\n/g, '<br>');
  const paras = (s) => String(s || '').split(/\n\s*\n/).filter(Boolean).map((p) => `<p>${rich(p)}</p>`).join('');
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? u : '');

  const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
  const DAY_COLORS = ['#B5651D', '#C0392B', '#2E86AB', '#6A994E', '#8E5EA2', '#D08C2E', '#3D7A7A', '#A23B72'];
  const dayColor = (i) => DAY_COLORS[i % DAY_COLORS.length];
  const CATEGORIES = {
    spot: { label: '景點', icon: '📍' },
    food: { label: '餐廳', icon: '🍽' },
    cafe: { label: '咖啡甜點', icon: '☕' },
    shop: { label: '購物', icon: '🛍' },
    stay: { label: '住宿', icon: '🏠' },
    transit: { label: '交通', icon: '🚉' },
  };
  const MEALS = [['breakfast', '早餐'], ['lunch', '午餐'], ['dinner', '晚餐']];
  const MEAL_SHORT = { breakfast: '早', lunch: '午', dinner: '晚' };
  /* 餐廳備案的文字欄位 */
  const OPT_FIELDS = ['name', 'area', 'rating', 'budget', 'closed', 'hours', 'station', 'note', 'link'];
  const letter = (n) => String.fromCharCode(65 + (n % 26)); // 0 → A
  const MAX_PHOTOS = { stop: 1, opt: 3 }; // 一個景點 1 張、一間餐廳 3 張

  /* 名稱點下去要開的 Google 地圖：有存 Google 地圖網址就用它，否則用「店名＋位置」搜尋 */
  const isGmapsUrl = (u) => /google\.[a-z.]+\/maps|maps\.google\.|maps\.app\.goo\.gl|goo\.gl\/maps/i.test(u || '');
  function mapsLink(x) {
    const l = safeUrl(x.link);
    if (l && isGmapsUrl(l)) return l;
    if (x.lat != null && x.lng != null) return `https://www.google.com/maps/search/${encodeURIComponent(x.name || '')}/@${x.lat},${x.lng},17z`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(x.name || '')}`;
  }
  /* 另外的連結（tabelog、官網…），不是 Google 地圖的才另外顯示 */
  const otherLink = (x) => { const l = safeUrl(x.link); return l && !isGmapsUrl(l) ? l : ''; };

  /* 照片區（新增／編輯視窗裡）：貼上、拖曳、選檔，自動壓縮 */
  function photoZoneHTML(max) {
    return `
      <div class="photo-zone">
        <div class="pz-head">照片 <small>最多 ${max} 張${max === 1 ? '（再貼會換掉）' : ''}</small></div>
        <div class="pz-list"></div>
        <div class="pz-drop" tabindex="0">
          📷 直接按 <kbd>${/Mac/.test(navigator.platform) ? '⌘' : 'Ctrl'}</kbd>+<kbd>V</kbd> 貼上照片、把照片拖到這裡，或
          <button type="button" class="linklike pz-pick">選擇檔案</button>
          <input type="file" accept="image/*" ${max > 1 ? 'multiple' : ''} hidden>
        </div>
        <p class="tip pz-msg">會自動壓縮成長邊 1400px 的 JPEG（一張約 150～350 KB）。</p>
      </div>`;
  }

  /* photos：這個視窗編輯中的照片 id 陣列（會直接修改它），按儲存時再寫回資料 */
  function initPhotoZone(dlg, photos, max) {
    const zone = dlg.querySelector('.photo-zone');
    const list = zone.querySelector('.pz-list'), drop = zone.querySelector('.pz-drop');
    const input = zone.querySelector('input[type=file]'), msg = zone.querySelector('.pz-msg');
    const render = () => {
      list.innerHTML = photos.map((id, i) => `
        <div class="pz-item"><img data-photo="${esc(id)}" alt=""><button type="button" class="pz-del" data-i="${i}" title="移除">✕</button></div>`).join('');
      drop.hidden = photos.length >= max && max > 1;
    };
    async function addFiles(files) {
      const imgs = [...files].filter((f) => f.type.startsWith('image/'));
      if (!imgs.length) return;
      for (const f of imgs) {
        if (max > 1 && photos.length >= max) { msg.innerHTML = `<span class="warn">最多 ${max} 張，請先移除一張。</span>`; break; }
        msg.textContent = '壓縮中…';
        try {
          const blob = await Photos.compress(f);
          const id = 'p' + uid();
          await Photos.put(id, blob);
          if (max === 1) photos.splice(0, photos.length, id); else photos.push(id);
          msg.textContent = `✔ 已加入（${(f.size / 1024 / 1024).toFixed(1)} MB → ${Math.round(blob.size / 1024)} KB）`;
        } catch (e) {
          msg.innerHTML = `<span class="warn">${esc(e.message)}</span>`;
        }
        render();
      }
    }
    zone.querySelector('.pz-pick').onclick = () => input.click();
    input.onchange = () => { addFiles(input.files); input.value = ''; };
    list.onclick = (e) => {
      const b = e.target.closest('.pz-del');
      if (b) { photos.splice(+b.dataset.i, 1); render(); }
    };
    ['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, () => drop.classList.remove('over')));
    drop.addEventListener('drop', (e) => { e.preventDefault(); addFiles(e.dataTransfer.files); });
    // 在整個視窗任何地方按 Ctrl+V：剪貼簿裡有圖片才攔下來，文字照常貼到欄位
    dlg.onpaste = (e) => {
      const files = [...(e.clipboardData ? e.clipboardData.items : [])]
        .filter((it) => it.kind === 'file' && it.type.startsWith('image/')).map((it) => it.getAsFile());
      if (!files.length) return;
      e.preventDefault();
      addFiles(files);
    };
    dlg.addEventListener('close', () => { dlg.onpaste = null; }, { once: true });
    render();
  }
  const pad = (n) => String(n).padStart(2, '0');
  const isoDate = (d) => (d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : '');

  /* 航班、住宿、行前清單的欄位 */
  const FLIGHT_FIELDS = ['label', 'airline', 'flightNo', 'from', 'departDate', 'departTime', 'to', 'arriveDate', 'arriveTime', 'note'];
  const STAY_FIELDS = ['name', 'room', 'checkIn', 'checkInTime', 'checkOut', 'checkOutTime', 'guests', 'price', 'stations', 'address', 'link', 'note', 'secret'];

  /* 常用機場：代碼 → 名稱、城市、時區（UTC+），用來顯示城市和扣掉時差算飛行時間 */
  const AIRPORTS = {
    TPE: { name: '桃園機場', city: '台北', tz: 8 }, TSA: { name: '松山機場', city: '台北', tz: 8 },
    KHH: { name: '高雄機場', city: '高雄', tz: 8 }, RMQ: { name: '台中機場', city: '台中', tz: 8 },
    NRT: { name: '東京成田機場', city: '東京', tz: 9 }, HND: { name: '東京羽田機場', city: '東京', tz: 9 },
    KIX: { name: '關西機場', city: '大阪', tz: 9 }, ITM: { name: '伊丹機場', city: '大阪', tz: 9 },
    NGO: { name: '中部機場', city: '名古屋', tz: 9 }, FUK: { name: '福岡機場', city: '福岡', tz: 9 },
    CTS: { name: '新千歲機場', city: '札幌', tz: 9 }, OKA: { name: '那霸機場', city: '沖繩', tz: 9 },
    SDJ: { name: '仙台機場', city: '仙台', tz: 9 }, HKD: { name: '函館機場', city: '函館', tz: 9 },
    KMJ: { name: '熊本機場', city: '熊本', tz: 9 }, KOJ: { name: '鹿兒島機場', city: '鹿兒島', tz: 9 },
    ICN: { name: '仁川機場', city: '首爾', tz: 9 }, GMP: { name: '金浦機場', city: '首爾', tz: 9 },
    PUS: { name: '金海機場', city: '釜山', tz: 9 }, HKG: { name: '香港機場', city: '香港', tz: 8 },
    SIN: { name: '樟宜機場', city: '新加坡', tz: 8 }, KUL: { name: '吉隆坡機場', city: '吉隆坡', tz: 8 },
    BKK: { name: '蘇凡納布機場', city: '曼谷', tz: 7 }, DMK: { name: '廊曼機場', city: '曼谷', tz: 7 },
    CNX: { name: '清邁機場', city: '清邁', tz: 7 }, MNL: { name: '馬尼拉機場', city: '馬尼拉', tz: 8 },
    SGN: { name: '新山一機場', city: '胡志明市', tz: 7 }, HAN: { name: '內排機場', city: '河內', tz: 7 },
    DAD: { name: '峴港機場', city: '峴港', tz: 7 },
  };

  /* 行前清單常用項目（Tab 會依序建議還沒加入的） */
  const CHECK_PRESETS = [
    '護照', '機票 / 登機證', '住宿訂房確認', '日幣現金', '信用卡', '西瓜卡 / 交通卡', '網卡 / SIM 卡',
    'Visit Japan Web', '地鐵周遊券', '旅遊保險', '充電器、行動電源', '常備藥', '雨傘', '換洗衣物',
    '盥洗用品', '牙線', '塑膠袋', '購物袋',
  ];

  function dayDate(trip, i) {
    if (!trip.startDate) return null;
    const d = new Date(trip.startDate + 'T00:00:00');
    if (isNaN(d)) return null;
    d.setDate(d.getDate() + i);
    return d;
  }
  const fmtDay = (d) => (d ? `${d.getMonth() + 1}/${d.getDate()}（${WEEK[d.getDay()]}）` : '');

  /* ---------- 狀態 ---------- */
  const state = {
    trip: null,
    view: 'overview', // 'overview' | 'day'
    dayIdx: 0,
    editMode: localStorage.getItem('tp.editMode') === '1',
    showLabels: localStorage.getItem('tp.showLabels') !== '0',
    showOptions: localStorage.getItem('tp.showOptions') !== '0',
    map: null,
    layer: null,
    markers: {},
    optMarkers: {},
    pickMode: false,
    searchResults: [],
  };
  const app = $('#app');

  /* ---------- 資料 ---------- */
  /*
   * 一餐 = { text: 一句話安排（例如「溫暖的家」）, options: [餐廳備案…], chosen: 選定的備案 id }
   * 舊版資料的一餐只是一個字串，這裡會自動轉成新格式。
   */
  function normMeal(m) {
    if (m == null || typeof m === 'string') m = { text: m || '', options: [], chosen: '' };
    m.text = m.text || '';
    m.options = Array.isArray(m.options) ? m.options : [];
    m.options.forEach((o) => {
      o.id = o.id || uid();
      OPT_FIELDS.forEach((k) => { o[k] = o[k] || ''; });
      o.photos = Array.isArray(o.photos) ? o.photos.slice(0, MAX_PHOTOS.opt) : [];
      o.lat = o.lat == null || o.lat === '' ? null : +o.lat;
      o.lng = o.lng == null || o.lng === '' ? null : +o.lng;
    });
    if (!m.options.some((o) => o.id === m.chosen)) m.chosen = '';
    return m;
  }

  function newDay() {
    return {
      id: uid(), title: '', summary: '',
      meals: { breakfast: normMeal(''), lunch: normMeal(''), dinner: normMeal('') },
      transport: [], stops: [],
    };
  }

  const defaultChecklist = () => [
    { id: uid(), title: '交通與錢', items: [] },
    { id: uid(), title: '物品', items: [] },
  ];

  function newTrip(title) {
    return {
      id: uid(), title, subtitle: '', startDate: '', coverUrl: '', intro: '', days: [newDay()],
      flights: [], stays: [], checklist: defaultChecklist(),
    };
  }

  /* 補齊欄位，匯入舊版或不完整的檔案時也能用 */
  function normalizeTrip(t) {
    t.id = t.id || uid();
    t.title = t.title || '未命名旅程';
    ['subtitle', 'startDate', 'coverUrl', 'intro'].forEach((k) => { t[k] = t[k] || ''; });
    t.region = t.region || 'auto';
    t.days = Array.isArray(t.days) && t.days.length ? t.days : [newDay()];
    t.days.forEach((d) => {
      d.id = d.id || uid();
      d.title = d.title || '';
      d.summary = d.summary || '';
      const meals = d.meals || {};
      d.meals = {};
      MEALS.forEach(([k]) => { d.meals[k] = normMeal(meals[k]); });
      d.transport = Array.isArray(d.transport) ? d.transport : [];
      d.transport.forEach((s) => { s.id = s.id || uid(); s.text = s.text || ''; s.rides = Array.isArray(s.rides) ? s.rides : []; });
      d.stops = Array.isArray(d.stops) ? d.stops : [];
      d.stops.forEach((s) => {
        s.id = s.id || uid();
        s.category = CATEGORIES[s.category] ? s.category : 'spot';
        ['name', 'hours', 'note', 'link'].forEach((k) => { s[k] = s[k] || ''; });
        s.photos = Array.isArray(s.photos) ? s.photos.slice(0, MAX_PHOTOS.stop) : [];
        s.lat = s.lat == null || s.lat === '' ? null : +s.lat;
        s.lng = s.lng == null || s.lng === '' ? null : +s.lng;
      });
    });
    t.flights = Array.isArray(t.flights) ? t.flights : [];
    t.flights.forEach((f) => { f.id = f.id || uid(); FLIGHT_FIELDS.forEach((k) => { f[k] = f[k] || ''; }); });
    t.stays = Array.isArray(t.stays) ? t.stays : [];
    t.stays.forEach((s) => {
      s.id = s.id || uid();
      STAY_FIELDS.forEach((k) => { s[k] = s[k] || ''; });
      s.lat = s.lat == null || s.lat === '' ? null : +s.lat;
      s.lng = s.lng == null || s.lng === '' ? null : +s.lng;
    });
    // 舊資料：已選定的餐廳如果早就在今日地點裡（同名的餐廳），把兩者連起來，避免選定時重複加入
    t.days.forEach((d) => MEALS.forEach(([k]) => {
      const m = d.meals[k];
      const o = m.options.find((x) => x.id === m.chosen);
      if (!o || d.stops.some((s) => s.mealKey === k)) return;
      const s = d.stops.find((x) => !x.mealKey && (x.fromOpt === o.id || (x.category === 'food' && x.name.trim() === o.name.trim())));
      if (s) { s.mealKey = k; s.fromOpt = o.id; }
    }));
    t.checklist = Array.isArray(t.checklist) ? t.checklist : defaultChecklist();
    t.checklist.forEach((g) => {
      g.id = g.id || uid();
      g.title = g.title || '';
      g.items = Array.isArray(g.items) ? g.items : [];
      g.items.forEach((it) => { it.id = it.id || uid(); it.text = it.text || ''; it.done = !!it.done; });
    });
    return t;
  }

  let saveTimer, savePending = false;
  // 關掉或切走分頁時，還沒存的修改馬上存
  const flushSave = () => {
    if (!savePending || !state.trip) return;
    clearTimeout(saveTimer);
    savePending = false;
    Store.saveTrip(state.trip).catch(() => {});
  };
  window.addEventListener('pagehide', flushSave);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushSave(); });
  function save() {
    setStatus('儲存中…');
    savePending = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      savePending = false;
      try {
        await Store.saveTrip(state.trip);
        // 存檔後才顯示的提示（例如「已加入…」）不要被「已儲存」蓋掉
        const el = $('#status');
        if (!el || el.textContent === '儲存中…') setStatus('已儲存');
      } catch (e) {
        setStatus('儲存失敗：' + e.message);
      }
    }, 300);
  }
  function setStatus(t) {
    const el = $('#status');
    if (el) el.textContent = t;
  }

  /* ---------- 路由 ---------- */
  async function route() {
    destroyMap();
    const p = location.hash.replace(/^#\/?/, '').split('/');
    if (p[0] === 'trip' && p[1]) {
      let trip = state.trip && state.trip.id === p[1] ? state.trip : await Store.getTrip(p[1]);
      if (!trip) { location.hash = '#/'; return; }
      state.trip = normalizeTrip(trip);
      if (p[2] === 'day' && trip.days[+p[3]]) {
        state.view = 'day';
        state.dayIdx = +p[3];
      } else if (['flights', 'stays', 'prep'].includes(p[2])) {
        state.view = p[2];
      } else if (p[2] === 'print') {
        state.view = 'print';
        renderPrint();
        window.scrollTo(0, 0);
        return;
      } else {
        state.view = 'overview';
      }
      renderTrip();
    } else {
      state.trip = null;
      renderHome();
    }
    window.scrollTo(0, 0);
  }

  /* ---------- 首頁 ---------- */
  async function renderHome() {
    cleanupPhotos();
    const trips = await Store.listTrips();
    app.innerHTML = `
      <header class="home-hero">
        <div class="home-acct">${Cloud.badgeHTML()}</div>
        <h1>我的旅程</h1>
        <p>Trip Planner</p>
      </header>
      <main class="home">
        <div class="toolbar">
          <button class="btn primary" data-act="new-trip">＋ 新增旅程</button>
          <label class="btn">匯入行程檔<input type="file" accept=".json,application/json" hidden data-act="import"></label>
          <button class="btn ghost" data-act="sample">載入範例：東京秋日文青慢遊記</button>
          <button class="btn ghost" data-act="search-settings">⚙ 搜尋設定（<span class="search-mode">${googleKey() ? 'Google 搜尋' : '免費搜尋'}</span>）</button>
        </div>
        <div class="trip-grid">
          ${trips.length ? trips.map((t) => `
            <div class="trip-card" data-act="open-trip" data-id="${esc(t.id)}">
              <div class="trip-card-cover"></div>
              <div class="trip-card-body">
                <h3>${esc(t.title)}</h3>
                <p>${esc(t.subtitle || '')}</p>
                <small>${t.startDate ? esc(t.startDate) + ' 出發・' : ''}${t.dayCount} 天</small>
              </div>
              <button class="icon del" data-act="delete-trip" data-id="${esc(t.id)}" title="刪除">✕</button>
            </div>`).join('') : '<p class="empty">還沒有旅程。新增一個，或先載入範例看看。</p>'}
        </div>
        <p class="hint">${Store.name === 'cloud'
          ? '行程存在你的 Google 帳號（雲端），電腦和手機都看得到。照片目前只存在拍照／貼上的那台裝置；要備份照片請用「匯出行程檔」。'
          : '目前資料只存在<b>這個瀏覽器</b>裡。換電腦或清除瀏覽器資料前，記得進入行程按「匯出行程檔」備份。'}</p>
      </main>`;
  }

  /* ---------- 行程頁框架 ---------- */
  function renderTrip() {
    app.innerHTML = `
      <header class="topbar">
        <a href="#/" class="back">← 我的旅程</a>
        <div class="spacer"></div>
        <span class="status" id="status"></span>
        ${Cloud.badgeHTML()}
        <label class="switch"><input type="checkbox" data-act="toggle-edit" ${state.editMode ? 'checked' : ''}><span>編輯模式</span></label>
        <a class="btn small" href="#/trip/${esc(state.trip.id)}/print">匯出 PDF</a>
        <button class="btn small" data-act="export">匯出行程檔</button>
        <button class="btn small ghost danger" data-act="delete-current">刪除旅程</button>
      </header>
      <div class="layout">
        <aside class="sidebar" id="sidebar">${sidebarHTML()}</aside>
        <main class="content" id="content"></main>
      </div>`;
    renderContent();
  }

  function sidebarHTML() {
    const t = state.trip;
    return `
      <div class="side-title">${esc(t.title)}</div>
      <nav class="day-nav">
        <a href="#/trip/${esc(t.id)}" class="${state.view === 'overview' ? 'active' : ''}">
          <span class="dn">總覽</span>
        </a>
        <a href="#/trip/${esc(t.id)}/flights" class="side-sub ${state.view === 'flights' ? 'active' : ''}">
          <span class="dn">✈ 航班<small>${t.flights.length || ''}</small></span>
        </a>
        <a href="#/trip/${esc(t.id)}/stays" class="side-sub ${state.view === 'stays' ? 'active' : ''}">
          <span class="dn">🏠 住宿<small>${t.stays.length || ''}</small></span>
        </a>
        <a href="#/trip/${esc(t.id)}/prep" class="side-sub ${state.view === 'prep' ? 'active' : ''}">
          <span class="dn">✓ 行前準備<small>${checkProgress().text}</small></span>
        </a>
        <div class="side-sep"></div>
        ${t.days.map((d, i) => `
          <a href="#/trip/${esc(t.id)}/day/${i}" class="${state.view === 'day' && state.dayIdx === i ? 'active' : ''}">
            <span class="dot" style="background:${dayColor(i)}"></span>
            <span class="dn">Day ${i + 1}<small>${fmtDay(dayDate(t, i))}</small></span>
            <span class="dt">${rich(d.title) || '<i>未命名</i>'}</span>
          </a>`).join('')}
      </nav>
      <button class="btn small ghost add-day" data-act="add-day">＋ 新增一天</button>`;
  }
  const refreshSidebar = () => { const s = $('#sidebar'); if (s) s.innerHTML = sidebarHTML(); };

  function renderContent() {
    destroyMap();
    if (state.view === 'day') renderDay();
    else if (state.view === 'flights') renderFlights();
    else if (state.view === 'stays') renderStays();
    else if (state.view === 'prep') renderPrep();
    else renderOverview();
  }

  function setEditMode(on) {
    state.editMode = on;
    localStorage.setItem('tp.editMode', on ? '1' : '0');
    const box = $('[data-act="toggle-edit"]');
    if (box) box.checked = on;
  }

  function checkProgress() {
    const all = state.trip.checklist.flatMap((g) => g.items);
    const done = all.filter((it) => it.done).length;
    return { done, total: all.length, pct: all.length ? Math.round((done / all.length) * 100) : 0, text: all.length ? `${done}/${all.length}` : '' };
  }

  /* ---------- Tab 自動填入 ----------
   * 有 data-sg 的輸入框：
   *  1. 空白時顯示建議（咖啡色斜體），按 Tab 直接填入
   *  2. 打字時用這趟旅程裡用過的值自動補完（反白），按 Tab 接受、繼續打字則忽略
   */
  const SG_PRESETS = {
    meal: ['溫暖的家', '飯店早餐', '便利商店', '機上簡餐', '自由活動'],
    budget: ['¥1,000–1,999', '～¥999', '¥2,000–2,999', '¥3,000–3,999', '¥4,000–4,999', '¥5,000–5,999'],
    closed: ['週一', '週二', '週三', '週四', '週五', '週六', '週日', '週一、週二', '週日、節假日', '無休'],
    rating: ['tabelog ', 'Google '],
    hours: ['10:00–18:00', '10:00–20:00', '11:00–14:00', '11:00–22:00', '11:30–14:30', '17:00–23:00', '24 小時'],
    dist: ['距離  站  m'],
    airline: ['長榮航空', '中華航空', '星宇航空', '台灣虎航', '泰國獅子航空', '樂桃航空', '日本航空', '全日空', '國泰航空', '酷航'],
    airport: Object.entries(AIRPORTS).map(([c, a]) => `${c} ${a.name}`),
    flightLabel: ['去程', '回程', '轉機'],
    checkin: ['15:00', '16:00–22:00'],
    checkout: ['10:00 前', '11:00 前'],
    guests: ['2 位成人・1 間房'],
    price: ['TWD '],
    check: CHECK_PRESETS,
  };
  const TAB_TIP = '咖啡色斜體的提示字按 <kbd>Tab</kbd> 就會填入；打字時會用你用過的內容自動補完，按 <kbd>Tab</kbd> 接受。';

  /* 這趟旅程裡某一類欄位用過的值，依出現次數排序，再接上預設建議 */
  function sgValues(kind) {
    const t = state.trip, vals = [];
    const add = (v) => { v = String(v || '').trim(); if (v) vals.push(v); };
    const OPT_KIND = { area: 'area', budget: 'budget', closed: 'closed', hours: 'hours', dist: 'station', rating: 'rating' };
    if (t) {
      t.days.forEach((d) => {
        MEALS.forEach(([k]) => {
          if (kind === 'meal') add(d.meals[k].text);
          if (OPT_KIND[kind]) d.meals[k].options.forEach((o) => add(o[OPT_KIND[kind]]));
        });
        if (kind === 'hours') d.stops.forEach((s) => add(s.hours));
        if (kind === 'station') d.transport.forEach((s) => s.rides.forEach((r) => { add(r.from); add(r.to); }));
        if (kind === 'step') d.transport.forEach((s) => add(s.text));
      });
      t.flights.forEach((f) => {
        if (kind === 'airline') add(f.airline);
        if (kind === 'airport') { add(f.from); add(f.to); }
        if (kind === 'flightLabel') add(f.label);
      });
      t.stays.forEach((s) => {
        if (kind === 'checkin') add(s.checkInTime);
        if (kind === 'checkout') add(s.checkOutTime);
        if (kind === 'guests') add(s.guests);
      });
      if (kind === 'check') t.checklist.forEach((g) => g.items.forEach((it) => add(it.text)));
    }
    const freq = new Map();
    vals.forEach((v) => freq.set(v, (freq.get(v) || 0) + 1));
    const list = [...freq.keys()].sort((a, b) => freq.get(b) - freq.get(a));
    (SG_PRESETS[kind] || []).forEach((p) => { if (!freq.has(p)) list.push(p); });
    return list;
  }
  const sgTop = (kind) => sgValues(kind)[0] || '';

  /* 產生輸入框屬性：def = Tab 會填入的建議；沒有建議時顯示 hint（一般灰色說明字） */
  const sg = (kind, def, hint) =>
    `data-sg="${kind}" data-def="${esc(def || '')}" placeholder="${esc(def || hint || '')}"`;

  /* 行前清單：下一個還沒加入的常用項目 */
  function nextCheck() {
    const have = new Set(state.trip.checklist.flatMap((g) => g.items.map((it) => it.text.trim())));
    return CHECK_PRESETS.find((p) => !have.has(p)) || '';
  }

  let sgPending = null;
  function sgSuggest(el) {
    sgPending = null;
    const typed = el.value;
    if (!typed || el.selectionStart !== typed.length || el.selectionEnd !== typed.length) return;
    const low = typed.toLowerCase();
    const cand = sgValues(el.dataset.sg).find((c) => c.length > typed.length && c.toLowerCase().startsWith(low));
    if (!cand) return;
    el.value = typed + cand.slice(typed.length);
    el.setSelectionRange(typed.length, el.value.length);
    sgPending = { el, typed };
  }
  function sgCommit(el) {
    sgPending = null;
    el.setSelectionRange(el.value.length, el.value.length);
    el.dispatchEvent(new Event('input', { bubbles: true })); // 讓資料綁定存下完整的值
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  document.addEventListener('input', (e) => {
    const el = e.target;
    if (!el.dataset || !el.dataset.sg || !e.inputType) return; // 沒有 inputType = 程式觸發的，略過
    if (e.isComposing || !e.inputType.startsWith('insert')) { sgPending = null; return; }
    sgSuggest(el);
  });
  // 中文輸入法選字完成後才補完
  document.addEventListener('compositionend', (e) => {
    const el = e.target;
    if (el.dataset && el.dataset.sg) setTimeout(() => sgSuggest(el), 0);
  });
  document.addEventListener('keydown', (e) => {
    const el = e.target;
    if (!el.dataset || !el.dataset.sg || e.isComposing) return;
    const pending = sgPending && sgPending.el === el && el.selectionEnd > el.selectionStart;
    if (e.key === 'Tab' && !e.shiftKey) {
      if (pending) { e.preventDefault(); sgCommit(el); return; }
      if (!el.value && el.dataset.def) {
        e.preventDefault();
        el.value = el.dataset.def;
        sgCommit(el);
      }
    } else if (e.key === 'Enter' && pending) {
      sgCommit(el); // 不擋 Enter：表單照常送出、清單照常加入
    } else if (e.key === 'Escape' && pending) {
      e.preventDefault();
      el.value = sgPending.typed;
      sgPending = null;
    }
  });
  // 沒按 Tab 就離開欄位：補完的部分不算數
  document.addEventListener('focusout', (e) => {
    if (sgPending && e.target === sgPending.el) {
      e.target.value = sgPending.typed;
      sgPending = null;
    }
  });

  /* ---------- 總覽 ---------- */
  function renderOverview() {
    const t = state.trip, ed = state.editMode;
    const cover = safeUrl(t.coverUrl);
    $('#content').innerHTML = `
      <section class="cover" ${cover ? `style="background-image:url('${esc(cover)}')"` : ''}>
        <div class="cover-inner">
          ${ed ? `
            <input class="in-title" data-bind="title" value="${esc(t.title)}" placeholder="旅程名稱">
            <input class="in-sub" data-bind="subtitle" value="${esc(t.subtitle)}" placeholder="副標題（英文或一句話）">`
          : `<h1>${esc(t.title)}</h1><p class="sub">${esc(t.subtitle)}</p>`}
        </div>
      </section>

      ${ed ? `
      <section class="card form-grid">
        <label>出發日期<input type="date" data-bind="startDate" value="${esc(t.startDate)}"></label>
        <label>封面圖片網址<input data-bind="coverUrl" value="${esc(t.coverUrl)}" placeholder="https://…（之後會改成上傳照片）"></label>
        <label>交通路線
          <select data-bind="region">
            <option value="auto" ${t.region === 'auto' ? 'selected' : ''}>自動判斷（目前：${esc(REGION_LABEL(detectRegion(t)))}）</option>
            ${Object.entries(LINE_SETS).map(([k, s]) => `<option value="${k}" ${t.region === k ? 'selected' : ''}>${esc(s.label)}</option>`).join('')}
            <option value="general" ${t.region === 'general' ? 'selected' : ''}>其他地區（只用通用交通方式＋自訂路線）</option>
          </select>
        </label>
      </section>` : ''}

      <section class="card">
        <h2 class="sec">旅程簡介</h2>
        ${ed ? `<textarea data-bind="intro" rows="7" placeholder="寫下這趟旅程的介紹。用 *星號* 包住的字會變成重點色。">${esc(t.intro)}</textarea>`
             : (t.intro ? `<div class="prose">${paras(t.intro)}</div>` : '<p class="empty">開啟「編輯模式」來寫旅程簡介。</p>')}
      </section>

      <section class="card">
        <h2 class="sec">行程概要</h2>
        <ul class="overview-list">
          ${t.days.map((d, i) => `
            <li><a href="#/trip/${esc(t.id)}/day/${i}">
              <span class="ov-day" style="color:${dayColor(i)}">Day ${i + 1}｜${fmtDay(dayDate(t, i))}</span>
              <span class="ov-title">${rich(d.title) || '<i>未命名</i>'}</span>
            </a></li>`).join('')}
        </ul>
      </section>

      ${tripInfoHTML()}

      <section class="card">
        <h2 class="sec">總覽地圖</h2>
        <div id="map" class="map tall"></div>
        <div class="legend">
          ${t.days.map((d, i) => `<span><i style="background:${dayColor(i)}"></i>Day ${i + 1}</span>`).join('')}
        </div>
        <label class="chk"><input type="checkbox" data-act="toggle-labels" ${state.showLabels ? 'checked' : ''}> 地圖上顯示名稱</label>
      </section>`;
    initMap();
    drawOverview(true);
  }

  /* ---------- 航班 ---------- */
  /* 「TPE 桃園機場」→ 代碼、名稱、城市、時區 */
  function airportInfo(s) {
    const str = String(s || '').trim();
    const m = str.match(/^([A-Za-z]{3})(?:\s+(.*))?$/);
    if (!m) return { code: '', name: str, city: str, tz: null };
    const code = m[1].toUpperCase(), a = AIRPORTS[code];
    return { code, name: m[2] || (a ? a.name : ''), city: a ? a.city : (m[2] || code), tz: a ? a.tz : null };
  }
  const validTime = (t) => /^\d{1,2}:\d{2}$/.test(t || '');
  function fmtDT(date, time) {
    if (!date) return esc(time || '');
    const d = new Date(date + 'T00:00:00');
    if (isNaN(d)) return esc(`${date} ${time || ''}`);
    return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}（${WEEK[d.getDay()]}）${esc(time || '')}`;
  }
  /* 飛行時間：當地時間相減，再扣掉兩地時差 */
  function flightDuration(f) {
    const a = airportInfo(f.from), b = airportInfo(f.to);
    if (!f.departDate || !f.arriveDate || !validTime(f.departTime) || !validTime(f.arriveTime) || a.tz == null || b.tz == null) return '';
    const t0 = new Date(`${f.departDate}T${f.departTime.padStart(5, '0')}`);
    const t1 = new Date(`${f.arriveDate}T${f.arriveTime.padStart(5, '0')}`);
    const min = Math.round((t1 - t0) / 60000) - (b.tz - a.tz) * 60;
    if (!(min > 0)) return '';
    return `${Math.floor(min / 60)}h${pad(min % 60)}m`;
  }
  const durText = (f) => {
    const d = flightDuration(f);
    return d ? `飛行時間 <b>${d}</b>（已扣除時差）` : '填好機場代碼（例如 TPE、NRT）和時間後，會自動算出飛行時間。';
  };

  function flightCardHTML(f) {
    const a = airportInfo(f.from), b = airportInfo(f.to), dur = flightDuration(f);
    return `
      <section class="flight-card">
        <div class="fc-head">✈ ${esc(f.label || '航班')}　${esc(a.city || '？')} – ${esc(b.city || '？')}</div>
        <div class="fc-body">
          <div class="fc-times">
            <div class="fc-row"><span class="fc-dt">${fmtDT(f.departDate, f.departTime)}</span><b>${esc(a.code)}</b> ${esc(a.name)}</div>
            <div class="fc-dur"><span class="arrow">↓</span>${dur}</div>
            <div class="fc-row"><span class="fc-dt">${fmtDT(f.arriveDate, f.arriveTime)}</span><b>${esc(b.code)}</b> ${esc(b.name)}</div>
          </div>
          <div class="fc-airline">${esc(f.airline)} <b>${esc(f.flightNo)}</b></div>
        </div>
        ${f.note ? `<div class="fc-note">${rich(f.note)}</div>` : ''}
      </section>`;
  }

  function flightEditHTML(f, i) {
    const t = state.trip, base = `flights.${i}`, first = t.flights[0];
    const isLater = i > 0 && first;
    // 建議：第 1 班 = 去程、第 2 班 = 回程；回程的機場預設為去程反過來
    const labelDef = i === 0 ? '去程' : i === 1 ? '回程' : '轉機';
    const fromDef = isLater ? first.to : sgTop('airport');
    const toDef = isLater ? first.from : '';
    return `
      <section class="card flight-edit">
        <div class="row fe-top">
          <input class="fe-label" data-bind="${base}.label" value="${esc(f.label)}" ${sg('flightLabel', labelDef)}>
          <input data-bind="${base}.airline" value="${esc(f.airline)}" ${sg('airline', isLater ? first.airline : '', '航空公司')}>
          <input class="fe-no" data-bind="${base}.flightNo" value="${esc(f.flightNo)}" placeholder="班次，例如 BR183">
          <button class="icon" data-act="del-flight" data-i="${i}" title="刪除這班">✕</button>
        </div>
        <div class="fe-grid">
          <label>出發機場<input data-bind="${base}.from" value="${esc(f.from)}" ${sg('airport', fromDef, '代碼＋名稱，例如 TPE 桃園機場')}></label>
          <label>出發日期<input type="date" data-bind="${base}.departDate" value="${esc(f.departDate)}"></label>
          <label>出發時間（當地）<input data-bind="${base}.departTime" data-time value="${esc(f.departTime)}" placeholder="12:10（也可打 1210）"></label>
          <label>抵達機場<input data-bind="${base}.to" value="${esc(f.to)}" ${sg('airport', toDef, '例如 NRT 東京成田機場')}></label>
          <label>抵達日期<input type="date" data-bind="${base}.arriveDate" value="${esc(f.arriveDate)}"></label>
          <label>抵達時間（當地）<input data-bind="${base}.arriveTime" data-time value="${esc(f.arriveTime)}" placeholder="16:30"></label>
        </div>
        <div class="fe-dur" id="fdur-${i}">${durText(f)}</div>
        <label class="fe-note">備註<input data-bind="${base}.note" value="${esc(f.note)}" placeholder="例如：行李 23 kg、線上報到"></label>
      </section>`;
  }

  function renderFlights() {
    const t = state.trip, ed = state.editMode;
    $('#content').innerHTML = `
      <div class="page-head">
        <h1 class="page-title">航班</h1>
        <button class="btn small" data-act="add-flight">＋ 新增航班</button>
      </div>
      ${t.flights.length
        ? t.flights.map((f, i) => (ed ? flightEditHTML(f, i) : flightCardHTML(f))).join('')
        : '<p class="empty card">還沒有航班。按「＋ 新增航班」加入去程和回程。</p>'}
      ${ed ? `<p class="tip">${TAB_TIP}</p>` : (t.flights.length ? '<p class="tip">開啟右上角「編輯模式」可以修改。</p>' : '')}`;
  }

  /* ---------- 住宿 ---------- */
  function fmtLongDate(s) {
    if (!s) return '';
    const d = new Date(s + 'T00:00:00');
    return isNaN(d) ? esc(s) : `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日（${WEEK[d.getDay()]}）`;
  }
  function nights(s) {
    const a = new Date(s.checkIn + 'T00:00:00'), b = new Date(s.checkOut + 'T00:00:00');
    const n = Math.round((b - a) / 86400000);
    return n > 0 ? n : 0;
  }

  function stayCardHTML(s) {
    const link = safeUrl(s.link), n = nights(s);
    const stations = s.stations.split('\n').map((l) => l.trim()).filter(Boolean);
    const gmap = s.lat != null ? `https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`
      : s.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address)}` : '';
    return `
      <section class="card stay-card">
        <div class="sc-title">
          <h2>${esc(s.name) || '<i>未命名住宿</i>'}${s.room ? ` <span class="room">- ${esc(s.room)}</span>` : ''}</h2>
          ${link ? `<a href="${esc(link)}" target="_blank" rel="noopener">訂房頁 ↗</a>` : ''}
        </div>
        <div class="sc-boxes">
          <div class="sc-box"><small>入住時間</small><b>${fmtLongDate(s.checkIn) || '—'}</b><span>${esc(s.checkInTime)}</span></div>
          <div class="sc-box"><small>退房時間</small><b>${fmtLongDate(s.checkOut) || '—'}</b><span>${esc(s.checkOutTime)}</span></div>
          ${n || s.guests ? `<div class="sc-box"><small>預訂資料</small><b>${n ? `${n} 晚` : ''}</b><span>${esc(s.guests)}</span></div>` : ''}
          ${s.price ? `<div class="sc-box"><small>價格</small><b class="price">${esc(s.price)}</b></div>` : ''}
        </div>
        ${stations.length ? `<ul class="sc-stations">${stations.map((l) => `<li>🚉 ${rich(l)}</li>`).join('')}</ul>` : ''}
        ${s.address || gmap ? `<p class="sc-addr">📍 ${esc(s.address)} ${gmap ? `<a href="${esc(gmap)}" target="_blank" rel="noopener">在 Google 地圖開啟 ↗</a>` : ''}</p>` : ''}
        ${s.note ? `<div class="sc-note">${rich(s.note)}</div>` : ''}
        ${s.secret ? `
          <div class="secret">
            <button class="btn tiny ghost" data-act="toggle-secret">🔒 顯示私密資訊</button>
            <div class="secret-body" hidden>${rich(s.secret)}</div>
          </div>` : ''}
      </section>`;
  }

  function stayEditHTML(s, i) {
    const base = `stays.${i}`, n = nights(s);
    return `
      <section class="card stay-edit">
        <div class="row">
          <input class="in-stayname" data-bind="${base}.name" value="${esc(s.name)}" placeholder="住宿名稱，例如 Reve Asakusa">
          <input class="in-room" data-bind="${base}.room" value="${esc(s.room)}" placeholder="房號">
          <button class="icon" data-act="del-stay" data-i="${i}" title="刪除">✕</button>
        </div>
        <div class="fe-grid">
          <label>入住日期<input type="date" data-bind="${base}.checkIn" value="${esc(s.checkIn)}"></label>
          <label>入住時間<input data-bind="${base}.checkInTime" value="${esc(s.checkInTime)}" ${sg('checkin', sgTop('checkin'))}></label>
          <label>預訂資料<input data-bind="${base}.guests" value="${esc(s.guests)}" ${sg('guests', sgTop('guests'))}></label>
          <label>退房日期<input type="date" data-bind="${base}.checkOut" value="${esc(s.checkOut)}"></label>
          <label>退房時間<input data-bind="${base}.checkOutTime" value="${esc(s.checkOutTime)}" ${sg('checkout', sgTop('checkout'))}></label>
          <label>價格<input data-bind="${base}.price" value="${esc(s.price)}" ${sg('price', sgTop('price'))}></label>
        </div>
        <div class="fe-dur" id="snights-${i}">${n ? `共 <b>${n}</b> 晚` : '填好入住和退房日期後會算出幾晚。'}</div>
        <label>附近車站 <small>一行一個，例如「本所吾妻橋站 – 500 m」</small><textarea data-bind="${base}.stations" rows="3">${esc(s.stations)}</textarea></label>
        <label>地址<input data-bind="${base}.address" value="${esc(s.address)}"></label>
        <label>位置 <small>貼上 Google 地圖網址或座標，會自動填入經緯度（總覽地圖會出現 🏠）</small>
          <input class="loc-paste" data-target="${base}" placeholder="https://www.google.com/maps/place/…"></label>
        <div class="row2">
          <label>緯度<input type="number" step="any" data-num data-bind="${base}.lat" value="${s.lat ?? ''}"></label>
          <label>經度<input type="number" step="any" data-num data-bind="${base}.lng" value="${s.lng ?? ''}"></label>
        </div>
        <label>訂房連結<input data-bind="${base}.link" value="${esc(s.link)}" placeholder="https://"></label>
        <label>備註 <small>入住方式、垃圾分類…；用 *星號* 標重點</small><textarea data-bind="${base}.note" rows="3">${esc(s.note)}</textarea></label>
        <label>🔒 私密資訊 <small>大門密碼、房間密碼等。瀏覽時預設隱藏，要按一下才顯示</small><textarea data-bind="${base}.secret" rows="2">${esc(s.secret)}</textarea></label>
      </section>`;
  }

  function renderStays() {
    const t = state.trip, ed = state.editMode;
    $('#content').innerHTML = `
      <div class="page-head">
        <h1 class="page-title">住宿</h1>
        <button class="btn small" data-act="add-stay">＋ 新增住宿</button>
      </div>
      ${t.stays.length
        ? t.stays.map((s, i) => (ed ? stayEditHTML(s, i) : stayCardHTML(s))).join('')
        : '<p class="empty card">還沒有住宿。按「＋ 新增住宿」加入。</p>'}
      ${ed ? `<p class="tip">${TAB_TIP}</p>` : (t.stays.length ? '<p class="tip">開啟右上角「編輯模式」可以修改。</p>' : '')}`;
  }

  /* ---------- 行前準備 ---------- */
  function checklistHTML() {
    const t = state.trip, ed = state.editMode, p = checkProgress(), suggest = nextCheck();
    return `
      <div class="cl-progress">
        <span>${p.total ? `已完成 <b>${p.done}</b> / ${p.total}` : '還沒有項目'}</span>
        <div class="bar"><i style="width:${p.pct}%"></i></div>
      </div>
      <div class="cl-groups">
        ${t.checklist.map((g, gi) => `
          <section class="card cl-group">
            <div class="cl-head">
              ${ed ? `<input class="cl-title-in" data-bind="checklist.${gi}.title" value="${esc(g.title)}" placeholder="分類名稱，例如：物品">`
                   : `<h2 class="sec">行前準備 – ${esc(g.title) || '未命名'}</h2>`}
              <small>${g.items.filter((it) => it.done).length}/${g.items.length}</small>
              ${ed ? `<button class="icon" data-act="del-group" data-g="${gi}" title="刪除分類">✕</button>` : ''}
            </div>
            <ul class="cl-items" data-g="${gi}">
              ${g.items.map((it, ii) => `
                <li class="cl-item ${it.done ? 'done' : ''}">
                  <span class="handle" title="拖曳排序（可拖到別的分類）">⋮⋮</span>
                  ${ed ? `
                    <input type="checkbox" data-act="check-item" data-g="${gi}" data-i="${ii}" ${it.done ? 'checked' : ''}>
                    <input class="cl-text-in" data-bind="checklist.${gi}.items.${ii}.text" value="${esc(it.text)}" ${sg('check', '', '')}>`
                  : `<label><input type="checkbox" data-act="check-item" data-g="${gi}" data-i="${ii}" ${it.done ? 'checked' : ''}><span>${rich(it.text)}</span></label>`}
                  <button class="icon" data-act="del-item" data-g="${gi}" data-i="${ii}" title="刪除">✕</button>
                </li>`).join('')}
            </ul>
            <div class="row cl-add">
              <input class="cl-new" data-g="${gi}" ${sg('check', suggest, '新增項目')}>
              <button class="btn small" data-act="add-item" data-g="${gi}">加入</button>
            </div>
          </section>`).join('')}
      </div>
      <button class="btn small ghost" data-act="add-group">＋ 新增分類</button>
      <p class="tip">輸入後按 Enter 加入。${TAB_TIP}${suggest ? `（目前建議：${esc(suggest)}）` : ''}</p>`;
  }

  function renderPrep() {
    $('#content').innerHTML = `
      <div class="page-head"><h1 class="page-title">行前準備</h1></div>
      <div id="checklist"></div>`;
    refreshChecklist();
  }

  function refreshChecklist(focusGroup) {
    const box = $('#checklist');
    if (!box) return;
    const t = state.trip;
    box.innerHTML = checklistHTML();
    if (window.Sortable) {
      box.querySelectorAll('.cl-items').forEach((ul) => {
        Sortable.create(ul, {
          group: 'checklist',
          handle: '.handle',
          animation: 150,
          onEnd(ev) {
            const from = +ev.from.dataset.g, to = +ev.to.dataset.g;
            if (from === to && ev.oldIndex === ev.newIndex) return;
            const [it] = t.checklist[from].items.splice(ev.oldIndex, 1);
            t.checklist[to].items.splice(ev.newIndex, 0, it);
            save();
            refreshChecklist();
          },
        });
      });
    }
    refreshSidebar();
    if (focusGroup != null) {
      const inp = box.querySelector(`.cl-new[data-g="${focusGroup}"]`);
      if (inp) inp.focus();
    }
  }

  function addCheckItem(gi) {
    const inp = $(`.cl-new[data-g="${gi}"]`);
    const text = inp ? inp.value.trim() : '';
    if (!text) return;
    state.trip.checklist[gi].items.push({ id: uid(), text, done: false });
    save();
    refreshChecklist(gi);
  }

  /* ---------- 總覽上的旅程資訊 ---------- */
  function tripInfoHTML() {
    const t = state.trip, p = checkProgress(), base = `#/trip/${esc(t.id)}`;
    const md = (s) => (s ? s.slice(5).replace('-', '/') : '');
    return `
      <section class="card">
        <h2 class="sec">旅程資訊</h2>
        <div class="info-grid">
          <a class="info-box" href="${base}/flights">
            <small>✈ 航班</small>
            ${t.flights.length ? t.flights.map((f) => {
              const a = airportInfo(f.from), b = airportInfo(f.to);
              return `<div><b>${esc(f.label || '航班')}</b> ${esc(md(f.departDate))} ${esc(f.departTime)}　${esc(a.code || f.from)} → ${esc(b.code || f.to)} <span class="muted">${esc(f.flightNo)}</span></div>`;
            }).join('') : '<div class="muted">尚未新增</div>'}
          </a>
          <a class="info-box" href="${base}/stays">
            <small>🏠 住宿</small>
            ${t.stays.length ? t.stays.map((s) => `<div><b>${esc(s.name) || '未命名'}</b>${nights(s) ? `　${nights(s)} 晚` : ''}</div>`).join('') : '<div class="muted">尚未新增</div>'}
          </a>
          <a class="info-box" href="${base}/prep">
            <small>✓ 行前準備</small>
            <div>${p.total ? `已完成 <b>${p.done}</b> / ${p.total}` : '<span class="muted">尚未新增</span>'}</div>
            ${p.total ? `<div class="bar"><i style="width:${p.pct}%"></i></div>` : ''}
          </a>
        </div>
      </section>`;
  }

  /* ---------- 匯出 PDF（列印版面） ----------
   * 每一頁是 16:9（1280×720，和 PowerPoint 寬螢幕投影片一樣），用瀏覽器「列印 → 另存為 PDF」輸出。
   */
  const PRINT_DEFAULTS = {
    cover: true, intro: true, overview: true, overviewMap: true, flights: true, stays: true, secret: false,
    prep: true, dayMain: true, bigMap: true, spots: true, meals: true, exDays: [],
  };
  const PRINT_SECTIONS = [
    ['cover', '封面'], ['intro', '旅程簡介'], ['overview', '行程概要'], ['overviewMap', '總覽地圖'],
    ['flights', '航班'], ['stays', '住宿'], ['secret', '🔒 住宿私密資訊'], ['prep', '行前準備'],
    ['dayMain', '每日：餐食＋交通'], ['bigMap', '每日：路線大地圖'], ['spots', '每日：景點卡片'], ['meals', '每日：餐食方案'],
  ];
  function printOpts() {
    let o = {};
    try { o = JSON.parse(localStorage.getItem('tp.printOpts')) || {}; } catch (e) { /* 用預設 */ }
    return { ...PRINT_DEFAULTS, ...o, exDays: Array.isArray(o.exDays) ? o.exDays : [] };
  }
  const savePrintOpts = (o) => localStorage.setItem('tp.printOpts', JSON.stringify(o));
  const chunk = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

  function renderPrint() {
    const t = state.trip, o = printOpts();
    app.innerHTML = `
      <div class="print-bar no-print">
        <div class="pb-row">
          <a class="back" href="#/trip/${esc(t.id)}">← 回到行程</a>
          <b class="pb-title">匯出 PDF：${esc(t.title)}</b>
          <span class="spacer"></span>
          <span class="status" id="print-status"></span>
          <button class="btn primary" data-act="print-now">🖨 列印／存成 PDF</button>
        </div>
        <div class="pb-row pb-opts">
          <span class="pb-label">要印的內容：</span>
          ${PRINT_SECTIONS.map(([k, label]) => `<label class="chk"><input type="checkbox" data-popt="${k}" ${o[k] ? 'checked' : ''}> ${label}</label>`).join('')}
        </div>
        <div class="pb-row pb-opts">
          <span class="pb-label">要印的天數：</span>
          ${t.days.map((d, i) => `<label class="chk"><input type="checkbox" data-pday="${i}" ${o.exDays.includes(i) ? '' : 'checked'}> Day ${i + 1}</label>`).join('')}
        </div>
        <p class="tip">按「列印／存成 PDF」後，在列印視窗的「目的地」選 <b>另存為 PDF</b>；若顏色或背景沒印出來，請在「更多設定」勾選 <b>背景圖形</b>。</p>
      </div>
      <div class="print-pages" id="print-pages"></div>`;
    refreshPrintPages();
  }

  function refreshPrintPages() {
    destroyMap();
    const box = $('#print-pages');
    box.innerHTML = printPagesHTML(state.trip, printOpts());
    initPrintMaps();
  }

  function printPagesHTML(t, o) {
    const pages = [];
    const page = (cls, body) => pages.push({ cls, body });
    const first = dayDate(t, 0), last = dayDate(t, t.days.length - 1);
    const range = first ? `${first.getFullYear()}/${first.getMonth() + 1}/${first.getDate()} – ${last.getMonth() + 1}/${last.getDate()}・${t.days.length} 天` : `${t.days.length} 天`;
    const cover = safeUrl(t.coverUrl);
    const band = (title) => `<header class="pg-band" ${cover ? `style="background-image:url('${esc(cover)}')"` : ''}><h1>${title}</h1></header>`;

    if (o.cover) {
      page('p-cover', `
        <div class="pc-bg" ${cover ? `style="background-image:url('${esc(cover)}')"` : ''}></div>
        <div class="pc-text">
          <h1>${esc(t.title)}</h1>
          ${t.subtitle ? `<p class="pc-sub">${esc(t.subtitle)}</p>` : ''}
          <p class="pc-range">${esc(range)}</p>
        </div>`);
    }
    if (o.intro && t.intro) page('p-band', `${band('旅程簡介')}<div class="pg-body prose-lg">${paras(t.intro)}</div>`);
    if (o.overview) {
      page('p-band', `${band('行程概要')}
        <div class="pg-body"><ul class="pg-overview">
          ${t.days.map((d, i) => `<li><span class="ov-d">Day ${i + 1}｜${fmtDay(dayDate(t, i))}</span><span>${rich(d.title) || '—'}</span></li>`).join('')}
        </ul></div>`);
    }
    if (o.overviewMap) {
      page('p-map', `
        <div class="pmap" data-kind="overview" data-labels="0"></div>
        <div class="pm-legend">${t.days.map((d, i) => `<span><i style="background:${dayColor(i)}"></i>Day ${i + 1}</span>`).join('')}</div>`);
    }
    if (o.flights && t.flights.length) {
      chunk(t.flights, 2).forEach((fs) => page('p-plain', `<h1 class="pg-h">航班</h1><div class="pg-flights">${fs.map(flightCardHTML).join('')}</div>`));
    }
    if (o.stays) t.stays.forEach((s) => page('p-plain', `<h1 class="pg-h">住宿：<a href="${esc(mapsLink(s.lat != null ? s : { name: s.address || s.name }))}" target="_blank" rel="noopener">${esc(s.name)}</a>${s.room ? ` - <span class="room">${esc(s.room)}</span>` : ''}</h1>${stayPrintHTML(s, o.secret)}`));
    if (o.prep && t.checklist.some((g) => g.items.length)) {
      page('p-band', `${band('行前準備')}
        <div class="pg-body pg-prep">
          ${t.checklist.filter((g) => g.items.length).map((g) => `
            <div><h2>${esc(g.title) || '其他'}</h2>
              <ul>${g.items.map((it) => `<li class="${it.done ? 'done' : ''}">${it.done ? '☑' : '☐'} ${rich(it.text)}</li>`).join('')}</ul>
            </div>`).join('')}
        </div>`);
    }

    t.days.forEach((d, i) => {
      if (o.exDays.includes(i)) return;
      const head = `<div class="pd-head"><span class="pd-label" style="color:${dayColor(i)}">Day ${i + 1}</span><span class="pd-date">${fmtDay(dayDate(t, i))}</span></div>`;
      const routeLine = `<div class="pd-route">${rich(d.title)}</div>`;
      if (o.dayMain) {
        page('p-day', `${head}<h1 class="pd-title">${rich(d.title) || '—'}</h1>
          ${d.summary ? `<p class="pd-summary">${rich(d.summary)}</p>` : ''}
          <div class="pd-grid">
            <div class="pd-left">
              <h2>餐食安排</h2>${mealsPrintHTML(d)}
              <div class="pmap pmap-small" data-kind="day" data-day="${i}" data-labels="0"></div>
            </div>
            <div class="pd-right"><h2>交通安排</h2>${transportHTML(d, `days.${i}`, false)}</div>
          </div>`);
      }
      if (o.bigMap && d.stops.some((s) => s.lat != null)) {
        page('p-map', `${routeLine}<div class="pmap pmap-big" data-kind="day" data-day="${i}" data-labels="1"></div>`);
      }
      if (o.spots) {
        // 從餐食方案來的餐廳（★ 選定或「→」加入的）已經印在餐食方案頁，景點卡片就不再重複
        // （沒勾「每日：餐食方案」時仍保留，免得整份 PDF 都沒有這間店）
        const optIds = new Set(MEALS.flatMap(([k]) => d.meals[k].options.map((x) => x.id)));
        const spots = d.stops.filter((s) => s.category !== 'stay' && s.category !== 'transit'
          && !(o.meals && s.fromOpt && optIds.has(s.fromOpt)));
        chunk(spots, 3).forEach((group) => page('p-cards', `${routeLine}<div class="pg-cards">${group.map(spotPrintHTML).join('')}</div>`));
      }
      if (o.meals) {
        MEALS.forEach(([k, label]) => {
          const m = d.meals[k];
          if (!m.options.length) return;
          const areas = [...new Set(m.options.map((x) => x.area).filter(Boolean))];
          chunk(m.options.map((x, n) => ({ x, n })), 3).forEach((group) => page('p-meal', `
            <h1 class="pg-h">${label}方案${areas.length ? ` – ${esc(areas.join('・'))}` : ''} <small>Day ${i + 1}</small></h1>
            <div class="pg-cards">${group.map(({ x, n }) => optCardHTML(x, k, n, x.id === m.chosen)).join('')}</div>`));
        });
      }
    });

    if (!pages.length) return '<p class="empty card no-print">沒有勾選任何內容。</p>';
    return pages.map((p, n) => `
      <section class="page ${p.cls}">
        ${p.body}
        ${p.cls === 'p-cover' ? '' : `<footer class="pg-foot">${esc(t.title)}　${n + 1} / ${pages.length}</footer>`}
      </section>`).join('');
  }

  function mealsPrintHTML(d) {
    const rows = MEALS.map(([k, label]) => {
      const m = d.meals[k];
      const chosen = m.options.find((o) => o.id === m.chosen);
      const parts = [];
      if (m.text) parts.push(rich(m.text));
      const a = (o) => `<a href="${esc(mapsLink(o))}" target="_blank" rel="noopener">${esc(o.name)}</a>`;
      if (chosen) parts.push(`<strong>${a(chosen)}</strong>`);
      else if (m.options.length) parts.push(`${m.options.length} 個備案：${m.options.map(a).join('／')}`);
      return parts.length ? `<li><b class="ml">${label}</b><span>${parts.join('<br>')}</span></li>` : '';
    }).join('');
    return rows ? `<ul class="meals">${rows}</ul>` : '<p class="empty">尚未安排。</p>';
  }

  function spotPrintHTML(s) {
    const c = CATEGORIES[s.category] || CATEGORIES.spot;
    return `
      <div class="pcard ${s.photos && s.photos.length ? 'has-photo' : ''}">
        <h3>【<a href="${esc(mapsLink(s))}" target="_blank" rel="noopener">${esc(s.name)}</a>】</h3>
        <span class="cat">${c.icon} ${c.label}</span>
        ${otherLink(s) ? `<a class="pc-link" href="${esc(otherLink(s))}" target="_blank" rel="noopener">🔗 連結</a>` : ''}
        ${s.note ? `<div class="pc-note">${rich(s.note)}</div>` : ''}
        ${s.hours ? `<div class="pc-hours">營業時間：${esc(s.hours)}</div>` : ''}
        ${s.photos && s.photos.length ? `<img class="pc-photo" data-photo="${esc(s.photos[0])}" alt="">` : ''}
      </div>`;
  }

  function stayPrintHTML(s, showSecret) {
    const n = nights(s);
    const stations = s.stations.split('\n').map((l) => l.trim()).filter(Boolean);
    return `
      <div class="pg-stay">
        <div class="sc-boxes">
          <div class="sc-box"><small>入住時間</small><b>${fmtLongDate(s.checkIn) || '—'}</b><span>${esc(s.checkInTime)}</span></div>
          <div class="sc-box"><small>退房時間</small><b>${fmtLongDate(s.checkOut) || '—'}</b><span>${esc(s.checkOutTime)}</span></div>
          ${n || s.guests ? `<div class="sc-box"><small>預訂資料</small><b>${n ? `${n} 晚` : ''}</b><span>${esc(s.guests)}</span></div>` : ''}
          ${s.price ? `<div class="sc-box"><small>價格</small><b class="price">${esc(s.price)}</b></div>` : ''}
        </div>
        <div class="ps-grid">
          <div>
            ${stations.length ? `<ul class="sc-stations">${stations.map((l) => `<li>🚉 ${rich(l)}</li>`).join('')}</ul>` : ''}
            ${s.address ? `<p class="sc-addr">📍 ${esc(s.address)}</p>` : ''}
            ${s.note ? `<div class="sc-note">${rich(s.note)}</div>` : ''}
            ${showSecret && s.secret ? `<div class="secret-body">🔒 ${rich(s.secret)}</div>` : ''}
          </div>
          ${s.lat != null ? `<div class="pmap pmap-stay" data-kind="stay" data-lat="${s.lat}" data-lng="${s.lng}"></div>` : ''}
        </div>
      </div>`;
  }

  /* 列印頁上的地圖：借用一般頁面的畫圖函式（暫時把 state 指到這張地圖） */
  function initPrintMaps() {
    const els = [...document.querySelectorAll('#print-pages .pmap')];
    const status = $('#print-status');
    let loaded = 0;
    const update = () => {
      if (!status) return;
      status.textContent = !els.length ? '' : loaded < els.length ? `地圖載入中 ${loaded}/${els.length}…` : '✔ 地圖都載入了，可以列印';
    };
    update();
    if (!window.L) return;
    state.printMaps = [];
    els.forEach((el) => {
      const map = L.map(el, {
        zoomControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false,
        keyboard: false, touchZoom: false, zoomSnap: 0.25, fadeAnimation: false, zoomAnimation: false, markerZoomAnimation: false,
      }).setView([35.68, 139.76], 12);
      map.attributionControl.setPrefix(false); // PDF 裡只留 OpenStreetMap 的標示（必要），不放 Leaflet 連結
      const tiles = L.tileLayer(TILE_URL, { maxZoom: 19, attribution: '© OpenStreetMap contributors' }).addTo(map);
      let counted = false;
      tiles.on('load', () => { if (!counted) { counted = true; loaded++; update(); } });
      state.printMaps.push(map);

      if (el.dataset.kind === 'stay') {
        const p = [+el.dataset.lat, +el.dataset.lng];
        map.setView(p, 15);
        L.marker(p, { icon: L.divIcon({ className: 'pin-wrap', html: '<div class="stay-pin">🏠</div>', iconSize: [30, 30], iconAnchor: [15, 15] }) }).addTo(map);
        return;
      }
      const saved = { map: state.map, layer: state.layer, dayIdx: state.dayIdx, markers: state.markers, optMarkers: state.optMarkers, showLabels: state.showLabels, showOptions: state.showOptions };
      state.map = map;
      state.layer = L.layerGroup().addTo(map);
      state.showLabels = el.dataset.labels === '1';
      state.showOptions = false;
      if (el.dataset.kind === 'overview') drawOverview(true);
      else { state.dayIdx = +el.dataset.day; drawDay(true); }
      Object.assign(state, saved);
    });
  }

  /* ---------- 單日 ---------- */
  function renderDay() {
    const t = state.trip, i = state.dayIdx, d = t.days[i], ed = state.editMode, base = `days.${i}`;
    $('#content').innerHTML = `
      <div class="day-head">
        <div class="day-label" style="color:${dayColor(i)}">Day ${i + 1} <small>${fmtDay(dayDate(t, i))}</small></div>
        ${ed ? `
          <input class="in-daytitle" data-bind="${base}.title" value="${esc(d.title)}" placeholder="例如：*淺草道具街*職人尋寶 → *日暮里*懷舊風情">
          <textarea data-bind="${base}.summary" rows="2" placeholder="今日說明（選填）">${esc(d.summary)}</textarea>
          <p class="tip">用 *星號* 包住的字會變成咖啡色重點字。</p>`
        : `<h1 class="day-title">${rich(d.title) || '<i>未命名的一天</i>'}</h1>
           ${d.summary ? `<p class="day-summary">${rich(d.summary)}</p>` : ''}`}
      </div>

      <div class="two-col">
        <section class="card">
          <h3 class="sec">餐食安排</h3>
          <div id="meals">${mealsHTML(d, base, ed)}</div>
        </section>
        <section class="card">
          <h3 class="sec">交通安排</h3>
          <div id="transport">${transportHTML(d, base, ed)}</div>
        </section>
      </div>

      <section class="card stops-card">
        <div class="stops-layout">
          <div class="stops-col">
            <h3 class="sec">今日地點 <small>拖曳 ⋮⋮ 調整順序</small></h3>
            <ol class="stops" id="stops"></ol>
            <p class="empty" id="stops-empty">還沒有地點。用下方搜尋、貼上 Google 地圖連結，或在地圖上點選來新增。</p>
            ${addPlaceHTML()}
          </div>
          <div class="map-col">
            <div id="map" class="map"></div>
            <div class="map-opts">
              <label class="chk"><input type="checkbox" data-act="toggle-labels" ${state.showLabels ? 'checked' : ''}> 地圖上顯示名稱</label>
              <label class="chk"><input type="checkbox" data-act="toggle-options" ${state.showOptions ? 'checked' : ''}> 顯示餐廳備案（午A、晚B…）</label>
            </div>
          </div>
        </div>
      </section>

      <section class="card meal-plans" id="meal-plans"></section>

      ${ed ? `<div class="danger-zone"><button class="btn small ghost danger" data-act="delete-day">刪除這一天</button></div>` : ''}`;

    refreshStops(false);
    refreshMealPlans(false);
    initMap();
    drawDay(true);
    initSortable();
    handlePaste($('#place-q'), () => doSearch());
  }

  /* 餐食摘要：一句話安排 + 選定的備案（或「N 個備案，尚未決定」） */
  function mealPickHTML(m, k) {
    const n = m.options.length;
    if (!n) return '';
    const chosen = m.options.find((o) => o.id === m.chosen);
    return chosen
      ? `<button class="meal-pick chosen" data-act="scroll-meal" data-k="${k}">✔ ${esc(chosen.name)}<small>（共 ${n} 個備案）</small></button>`
      : `<button class="meal-pick" data-act="scroll-meal" data-k="${k}">${n} 個備案，尚未決定 ›</button>`;
  }

  function mealsHTML(d, base, ed) {
    if (ed) {
      return `<div class="meal-edit">${MEALS.map(([k, label]) => `
        <label><span>${label}</span>
          <input data-bind="${base}.meals.${k}.text" value="${esc(d.meals[k].text)}" ${sg('meal', sgTop('meal'), '一句話安排（選填）')}>
          ${mealPickHTML(d.meals[k], k)}
        </label>`).join('')}
        <p class="tip">餐廳備案在下方「餐食方案」新增和選定。${TAB_TIP}</p></div>`;
    }
    const rows = MEALS.filter(([k]) => d.meals[k].text || d.meals[k].options.length);
    if (!rows.length) return '<p class="empty">尚未安排。</p>';
    return `<ul class="meals">${rows.map(([k, label]) => `
      <li><b>${label}</b><div>${rich(d.meals[k].text)}${d.meals[k].text && d.meals[k].options.length ? '<br>' : ''}${mealPickHTML(d.meals[k], k)}</div></li>`).join('')}</ul>`;
  }

  /* 餐食方案：每一餐的備案卡片 */
  function optCardHTML(o, k, n, isChosen) {
    const extra = otherLink(o);
    const meta = [
      o.rating && `⭐ ${esc(o.rating)}`,
      o.budget && `💴 ${esc(o.budget)}`,
      o.closed && `休 ${esc(o.closed)}`,
      extra && `<a href="${esc(extra)}" target="_blank" rel="noopener">🔗 連結</a>`,
    ].filter(Boolean).join('<span class="sep">・</span>');
    const photos = o.photos || [];
    return `
      <div class="opt-card ${isChosen ? 'chosen' : ''}" data-id="${esc(o.id)}">
        <div class="oc-top">
          <span class="handle" title="拖曳排序">⋮⋮</span>
          <span class="oc-tag">${MEAL_SHORT[k]}${letter(n)}</span>
          ${o.area ? `<span class="cat">${esc(o.area)}</span>` : ''}
          <span class="spacer"></span>
          <button class="icon star ${isChosen ? 'on' : ''}" data-act="choose-opt" data-k="${k}" data-id="${esc(o.id)}" title="${isChosen ? '取消選定' : '選定這間'}">${isChosen ? '★' : '☆'}</button>
          <button class="icon" data-act="opt-to-route" data-k="${k}" data-id="${esc(o.id)}" title="另外加一份到今日地點（不連動；選定 ☆ 會自動加入）">→</button>
          <button class="icon" data-act="edit-opt" data-k="${k}" data-id="${esc(o.id)}" title="編輯">✎</button>
          <button class="icon" data-act="del-opt" data-k="${k}" data-id="${esc(o.id)}" title="刪除">✕</button>
        </div>
        <div class="oc-body" data-act="focus-opt" data-id="${esc(o.id)}">
          <h5 class="oc-name">【<a href="${esc(mapsLink(o))}" target="_blank" rel="noopener" title="在 Google 地圖開啟">${esc(o.name)}</a>】</h5>
          ${meta ? `<div class="oc-meta">${meta}</div>` : ''}
          ${o.hours || o.station ? `<ul class="oc-facts">
            ${o.hours ? `<li>營業時間：${esc(o.hours)}</li>` : ''}
            ${o.station ? `<li>${esc(o.station)}</li>` : ''}
          </ul>` : ''}
          ${o.note ? `<div class="bubble">${rich(o.note)}</div>` : ''}
          ${photos.length ? `<div class="oc-photos n${photos.length}">${photos.map((id) => `<img data-photo="${esc(id)}" alt="">`).join('')}</div>` : ''}
          ${o.lat == null ? '<div class="smeta warn">尚未設定位置</div>' : ''}
          ${isChosen ? '<div class="oc-chosen">✔ 已選定</div>' : ''}
        </div>
      </div>`;
  }

  function mealPlansHTML(d) {
    const blocks = MEALS.filter(([k]) => d.meals[k].options.length).map(([k, label]) => {
      const m = d.meals[k];
      return `
        <div class="meal-block" id="meal-${k}">
          <div class="mb-head">
            <h4>${label}方案 <small>${m.options.length} 個備案${m.chosen ? '' : '・尚未決定'}</small></h4>
            <button class="btn tiny ghost" data-act="add-opt" data-k="${k}">＋ 新增${label}備案</button>
          </div>
          <div class="opt-grid" data-k="${k}">
            ${m.options.map((o, n) => optCardHTML(o, k, n, o.id === m.chosen)).join('')}
          </div>
        </div>`;
    }).join('');
    const empty = MEALS.filter(([k]) => !d.meals[k].options.length);
    return `
      <h3 class="sec">餐食方案 <small>拖曳 ⋮⋮ 排序・☆ 選定後自動加入今日地點</small></h3>
      ${blocks || '<p class="empty">還沒有餐廳備案。可以為每一餐加入多個候選餐廳，比較後再選定。</p>'}
      ${empty.length ? `<div class="add-opt-row">${empty.map(([k, label]) =>
        `<button class="btn small ghost" data-act="add-opt" data-k="${k}">＋ 新增${label}備案</button>`).join('')}</div>` : ''}`;
  }

  function refreshMealPlans(redrawMap = true) {
    const i = state.dayIdx, d = state.trip.days[i];
    $('#meals').innerHTML = mealsHTML(d, `days.${i}`, state.editMode);
    const box = $('#meal-plans');
    box.innerHTML = mealPlansHTML(d);
    if (window.Sortable) {
      box.querySelectorAll('.opt-grid').forEach((grid) => {
        Sortable.create(grid, {
          handle: '.handle',
          animation: 150,
          onEnd(ev) {
            if (ev.oldIndex === ev.newIndex) return;
            const arr = d.meals[grid.dataset.k].options;
            const [m] = arr.splice(ev.oldIndex, 1);
            arr.splice(ev.newIndex, 0, m);
            save();
            refreshMealPlans();
          },
        });
      });
    }
    if (redrawMap) drawDay(false);
  }

  /* 一段車實際顯示的代號／名稱／顏色（自訂路線用自己填的） */
  function lineOf(r) {
    if (r.line === 'CUSTOM') return { code: r.code || '?', name: r.name || '自訂路線', color: r.color || '#888888' };
    return LINE_MAP[r.line] || LINE_MAP.OTHER;
  }

  function rideHTML(r) {
    const l = lineOf(r);
    const seg = [r.from, r.to].filter(Boolean).map(esc).join(' – ');
    return `
      <div class="ride" style="--lc:${l.color};--fg:${lineTextColor(l.color)}">
        <span class="rcode">${esc(l.code)}</span>
        <span class="rname">${esc(l.name)}</span>
        ${seg ? `<span class="rseg">${seg}</span>` : ''}
      </div>`;
  }

  /* 這趟旅程用哪一組路線：手動指定，或依地點位置自動判斷（多數決） */
  const REGION_LABEL = (k) => (LINE_SETS[k] ? LINE_SETS[k].label : '其他地區');
  function detectRegion(t) {
    const votes = {};
    t.days.forEach((d) => d.stops.forEach((s) => {
      if (s.lat == null) return;
      for (const [k, [s0, w, n, e]] of Object.entries(REGION_BOUNDS)) {
        if (s.lat >= s0 && s.lat <= n && s.lng >= w && s.lng <= e) { votes[k] = (votes[k] || 0) + 1; break; }
      }
    }));
    const best = Object.keys(votes).sort((a, b) => votes[b] - votes[a])[0];
    return best || 'general';
  }
  function tripRegion(t = state.trip) {
    return t.region && t.region !== 'auto' ? t.region : detectRegion(t);
  }

  function lineOptions(sel) {
    const region = tripRegion();
    const set = LINE_SETS[region];
    const opt = (l) => `<option value="${l.id}" ${l.id === sel ? 'selected' : ''}>${esc(l.code)}｜${esc(l.name)}</option>`;
    const inSet = (set ? set.lines : []).concat(GENERIC_LINES).some((l) => l.id === sel);
    return `
      ${set ? `<optgroup label="${esc(set.label)}">${set.lines.map(opt).join('')}</optgroup>` : ''}
      <optgroup label="通用">${GENERIC_LINES.map(opt).join('')}</optgroup>
      ${!inSet && LINE_MAP[sel] ? `<optgroup label="其他地區（已使用）">${opt(LINE_MAP[sel])}</optgroup>` : ''}`;
  }
  const defaultLine = () => {
    const set = LINE_SETS[tripRegion()];
    return set ? set.lines[0].id : 'SUBWAY';
  };

  function transportHTML(d, base, ed) {
    if (!ed) {
      if (!d.transport.length) return '<p class="empty">尚未安排。</p>';
      return `<ul class="transport">${d.transport.map((s) => `
        <li><div class="tx">${rich(s.text)}</div>${s.rides.map(rideHTML).join('')}</li>`).join('')}</ul>`;
    }
    // 建議：上一步的目的地 → ；第一段車的上車站 = 這趟最常出發的站（通常是住宿附近）
    const homeStation = firstRideFrom();
    return `
      ${d.transport.map((s, si) => {
        const prev = d.transport[si - 1];
        const dest = prev ? destOf(prev.text) : '住宿';
        const stepDef = dest ? `${dest} → ` : '';
        return `
        <div class="step-edit">
          <div class="row">
            <input data-bind="${base}.transport.${si}.text" value="${esc(s.text)}" ${sg('step', stepDef, '例如：住宿 → 明治神宮（約 50 分鐘）')}>
            <button class="icon" data-act="del-step" data-s="${si}" title="刪除這個步驟">✕</button>
          </div>
          ${s.rides.map((r, ri) => {
            const l = lineOf(r);
            const fromDef = ri > 0 ? s.rides[ri - 1].to : homeStation;
            const rb = `${base}.transport.${si}.rides.${ri}`;
            return `
            <div class="row ride-edit">
              <span class="rcode mini" style="--lc:${l.color}">${esc(l.code)}</span>
              <select data-bind="${rb}.line">${lineOptions(r.line)}</select>
              <input data-bind="${rb}.from" value="${esc(r.from)}" ${sg('station', fromDef, '上車站')}>
              <span>–</span>
              <input data-bind="${rb}.to" value="${esc(r.to)}" ${sg('station', '', '下車站')}>
              <button class="icon" data-act="del-ride" data-s="${si}" data-r="${ri}" title="刪除">✕</button>
            </div>
            ${r.line === 'CUSTOM' ? `
            <div class="row ride-custom">
              <input class="rc-code" data-bind="${rb}.code" value="${esc(r.code || '')}" maxlength="3" placeholder="代號">
              <input data-bind="${rb}.name" value="${esc(r.name || '')}" placeholder="路線名稱，例如：江之電">
              <input type="color" data-bind="${rb}.color" value="${esc(r.color || '#888888')}" title="路線顏色">
            </div>` : ''}`;
          }).join('')}
          <button class="btn tiny ghost" data-act="add-ride" data-s="${si}">＋ 乘車段</button>
        </div>`;
      }).join('')}
      <button class="btn small ghost" data-act="add-step">＋ 交通步驟</button>
      <p class="tip">路線組合：<b>${esc(REGION_LABEL(tripRegion()))}</b>${state.trip.region && state.trip.region !== 'auto' ? '' : '（依地點自動判斷）'}，可在「總覽」的編輯模式更改。${TAB_TIP}</p>`;
  }

  /* 「A → B（約 30 分鐘）」取出 B */
  function destOf(text) {
    const parts = String(text || '').split(/→|->/);
    return parts.length > 1 ? parts[parts.length - 1].replace(/[（(].*$/, '').replace(/[，,].*$/, '').replace(/\*/g, '').trim() : '';
  }

  /* 這趟旅程中，各交通步驟第一段車最常見的上車站 */
  function firstRideFrom() {
    const freq = new Map();
    state.trip.days.forEach((d) => d.transport.forEach((s) => {
      const f = s.rides[0] && s.rides[0].from.trim();
      if (f) freq.set(f, (freq.get(f) || 0) + 1);
    }));
    return [...freq.keys()].sort((a, b) => freq.get(b) - freq.get(a))[0] || '';
  }
  function refreshTransport() {
    const i = state.dayIdx;
    $('#transport').innerHTML = transportHTML(state.trip.days[i], `days.${i}`, state.editMode);
  }

  /* 剛加入／複製的地點閃一下，讓人知道在哪 */
  function flashStop(id) {
    const li = $(`#stops .stop[data-id="${id}"]`);
    if (!li) return;
    li.classList.add('flash');
    li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    setTimeout(() => li.classList.remove('flash'), 1600);
  }

  function addPlaceHTML() {
    // 住宿頁有填位置的住宿 → 一鍵加入（飯店常常一天要出現好幾次）
    const stays = state.trip.stays.map((s, i) => ({ s, i })).filter(({ s }) => s.lat != null && s.name);
    return `
      <div class="add-place">
        ${stays.length ? `
        <div class="quick-add">
          <span>一鍵加入：</span>
          ${stays.map(({ s, i }) => `<button class="btn tiny" data-act="add-stay-stop" data-i="${i}">🏠 ${esc(s.name)}</button>`).join('')}
        </div>` : ''}
        <div class="ap-title">新增地點
          <button class="linklike ap-mode" data-act="search-settings" title="搜尋設定">⚙ <span class="search-mode">${googleKey() ? 'Google 搜尋' : '免費搜尋'}</span></button>
        </div>
        <div class="row">
          <input id="place-q" placeholder="店名、地址、Google 地圖網址或座標都可以">
          <button class="btn small" data-act="search">搜尋</button>
        </div>
        <div class="row ap-actions">
          <button class="btn small primary" data-act="gmaps" title="最準：用 Google 地圖找到後複製網址，回來自動帶入">在 Google 地圖找 ↗</button>
          <button class="btn small ghost" id="pick-btn" data-act="pick-mode">在地圖上點選</button>
        </div>
        <div id="gm-hint"></div>
        <div id="search-results"></div>
        <p class="tip">也可以直接貼上：Google 地圖網址、手機「分享」的整段文字、座標。</p>
      </div>`;
  }

  function stopsHTML(d) {
    const color = dayColor(state.dayIdx);
    return d.stops.map((s, n) => {
      const c = CATEGORIES[s.category] || CATEGORIES.spot;
      const extra = otherLink(s);
      return `
        <li class="stop" data-id="${esc(s.id)}">
          <span class="handle" title="拖曳排序">⋮⋮</span>
          <span class="num" style="background:${color}">${n + 1}</span>
          <div class="sbody" data-act="focus-stop" data-id="${esc(s.id)}">
            ${s.photos && s.photos.length ? `<img class="s-thumb" data-photo="${esc(s.photos[0])}" alt="" title="點一下看大圖">` : ''}
            <div class="sname">${esc(s.name)} ${s.mealKey
              ? `<span class="cat meal-tag" title="餐食方案中選定的${mealLabel(s.mealKey)}；在下方改選或取消 ★ 會自動更新">★ ${mealLabel(s.mealKey)}</span>`
              : `<span class="cat">${c.icon} ${c.label}</span>`}</div>
            ${s.hours ? `<div class="smeta">🕘 ${esc(s.hours)}</div>` : ''}
            ${s.note ? `<div class="snote">${rich(s.note)}</div>` : ''}
            ${s.lat == null ? '<div class="smeta warn">尚未設定位置</div>' : ''}
            <div class="slinks">
              <a class="slink" href="${esc(mapsLink(s))}" target="_blank" rel="noopener">Google 地圖 ↗</a>
              ${extra ? `<a class="slink" href="${esc(extra)}" target="_blank" rel="noopener">連結 ↗</a>` : ''}
            </div>
          </div>
          <div class="sactions">
            <button class="icon" data-act="edit-stop" data-id="${esc(s.id)}" title="編輯">✎</button>
            <button class="icon" data-act="dup-stop" data-id="${esc(s.id)}" title="複製（加在這個地點後面）">⧉</button>
            <button class="icon" data-act="move-stop" data-id="${esc(s.id)}" title="移到／複製到其他天">⇄</button>
            <button class="icon" data-act="del-stop" data-id="${esc(s.id)}" title="刪除">✕</button>
          </div>
        </li>`;
    }).join('');
  }

  function refreshStops(redrawMap = true) {
    const d = state.trip.days[state.dayIdx];
    $('#stops').innerHTML = stopsHTML(d);
    $('#stops-empty').hidden = d.stops.length > 0;
    if (redrawMap) drawDay(false);
  }

  function initSortable() {
    const el = $('#stops');
    if (!el || !window.Sortable) return;
    Sortable.create(el, {
      handle: '.handle',
      animation: 150,
      onEnd(ev) {
        if (ev.oldIndex === ev.newIndex) return;
        const arr = state.trip.days[state.dayIdx].stops;
        const [m] = arr.splice(ev.oldIndex, 1);
        arr.splice(ev.newIndex, 0, m);
        save();
        refreshStops();
      },
    });
  }

  /* ---------- 地圖 ---------- */
  const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';

  function destroyMap() {
    if (state.map) {
      state.map.stop(); // 先停掉移動動畫，避免移除後 Leaflet 還在算位置而報錯
      state.map.off();
      state.map.remove();
      state.map = null;
    }
    state.layer = null;
    state.markers = {};
    state.optMarkers = {};
    state.pickMode = false;
    (state.printMaps || []).forEach((m) => { m.stop(); m.off(); m.remove(); });
    state.printMaps = [];
  }

  function initMap() {
    const el = $('#map');
    if (!el) return;
    if (!window.L) {
      el.innerHTML = '<p class="empty pad">地圖載入失敗，請確認網路連線。</p>';
      return;
    }
    const m = L.map(el).setView([35.68, 139.76], 12);
    L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTR }).addTo(m);
    state.map = m;
    state.layer = L.layerGroup().addTo(m);
    m.on('click', onMapClick);
  }

  /* 標記寬度：單一號碼是圓形，「1・4・6」這種會變成膠囊形 */
  const pinWidth = (label) => Math.max(28, String(label).length * 8 + 12);
  const mkHalf = (label) => pinWidth(label) / 2;
  const pinIcon = (label, color) => {
    const w = pinWidth(label);
    return L.divIcon({
      className: 'pin-wrap',
      html: `<div class="pin${w > 28 ? ' multi' : ''}" style="background:${color};width:${w}px">${label}</div>`,
      iconSize: [w, 28],
      iconAnchor: [w / 2, 14],
      popupAnchor: [0, -14],
    });
  };

  function popupHTML(s, n, dayIdx) {
    const c = CATEGORIES[s.category] || CATEGORIES.spot;
    return `<div class="popup">
      <div class="p-day" style="color:${dayColor(dayIdx)}">Day ${dayIdx + 1}・第 ${n} 站</div>
      <b>${esc(s.name)}</b> <span class="cat">${c.icon} ${c.label}</span>
      ${s.hours ? `<div>🕘 ${esc(s.hours)}</div>` : ''}
      ${s.note ? `<div class="p-note">${rich(s.note)}</div>` : ''}
      <a href="https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}" target="_blank" rel="noopener">在 Google 地圖開啟 ↗</a>
    </div>`;
  }

  function drawDay(fit) {
    if (!state.map) return;
    const i = state.dayIdx, d = state.trip.days[i], color = dayColor(i);
    state.layer.clearLayers();
    state.markers = {};
    const pts = [];
    // 同一個位置出現好幾次（例如 飯店→A→B→飯店→C→飯店）：合併成一個標記「1・4・6」
    const groups = new Map();
    d.stops.forEach((s, n) => {
      if (s.lat == null || s.lng == null) return;
      pts.push([s.lat, s.lng]);
      const key = `${(+s.lat).toFixed(5)},${(+s.lng).toFixed(5)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ s, n: n + 1 });
    });
    groups.forEach((g) => {
      const { s } = g[0];
      const label = g.map((x) => x.n).join('・');
      const mk = L.marker([s.lat, s.lng], { icon: pinIcon(label, color), draggable: true }).addTo(state.layer);
      mk.bindPopup(g.length === 1 ? popupHTML(s, g[0].n, i)
        : `${popupHTML(s, label, i)}<div class="p-multi">這一天經過這裡 ${g.length} 次</div>`);
      if (state.showLabels) {
        mk.bindTooltip(esc(s.name), { permanent: true, direction: 'right', offset: [mkHalf(label) + 2, 0], className: 'pin-label' });
      }
      mk.on('dragend', () => {
        const p = mk.getLatLng();
        g.forEach(({ s: x }) => { x.lat = +p.lat.toFixed(6); x.lng = +p.lng.toFixed(6); });
        save();
        drawDay(false);
      });
      g.forEach(({ s: x }) => { state.markers[x.id] = mk; });
    });
    if (pts.length > 1) {
      L.polyline(pts, { color, weight: 3, opacity: 0.85, dashArray: '6 8' }).addTo(state.layer);
    }

    // 餐廳備案：午A、午B、晚A…（選定的上色），不連進路線
    state.optMarkers = {};
    const optPts = [];
    if (state.showOptions) {
      MEALS.forEach(([k, label]) => {
        const m = d.meals[k];
        m.options.forEach((o, n) => {
          if (o.lat == null || o.lng == null) return;
          const chosen = o.id === m.chosen;
          const mk = L.marker([o.lat, o.lng], {
            icon: L.divIcon({
              className: 'pin-wrap',
              html: `<div class="opt-pin ${chosen ? 'chosen' : ''}" style="--c:${color}">${MEAL_SHORT[k]}${letter(n)}</div>`,
              iconSize: [34, 22],
              iconAnchor: [17, 11],
              popupAnchor: [0, -11],
            }),
            draggable: true,
            zIndexOffset: chosen ? 500 : -500,
          }).addTo(state.layer);
          mk.bindPopup(`<div class="popup">
            <div class="p-day" style="color:${color}">${label}備案 ${letter(n)}${chosen ? '・✔ 已選定' : ''}</div>
            <b>${esc(o.name)}</b>${o.area ? ` <span class="cat">${esc(o.area)}</span>` : ''}
            ${o.hours ? `<div>🕘 ${esc(o.hours)}</div>` : ''}
            ${o.note ? `<div class="p-note">${rich(o.note)}</div>` : ''}
            <a href="https://www.google.com/maps/search/?api=1&query=${o.lat},${o.lng}" target="_blank" rel="noopener">在 Google 地圖開啟 ↗</a>
          </div>`);
          if (state.showLabels && chosen) {
            mk.bindTooltip(esc(o.name), { permanent: true, direction: 'right', offset: [18, 0], className: 'pin-label' });
          } else {
            mk.bindTooltip(esc(o.name), { direction: 'right', offset: [18, 0], className: 'pin-label' });
          }
          mk.on('dragend', () => {
            const p = mk.getLatLng();
            o.lat = +p.lat.toFixed(6);
            o.lng = +p.lng.toFixed(6);
            save();
            drawDay(false);
          });
          state.optMarkers[o.id] = mk;
          optPts.push([o.lat, o.lng]);
        });
      });
    }

    const fitPts = pts.length ? pts : optPts;
    if (fit && fitPts.length) state.map.fitBounds(fitPts, { padding: [40, 40], maxZoom: 16, animate: false });
  }

  /* 凸包：畫出每天的範圍色塊 */
  function hull(points) {
    const p = points.map((x) => [x[1], x[0]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (p.length < 3) return null;
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lower = [], upper = [];
    for (const q of p) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
      lower.push(q);
    }
    for (let k = p.length - 1; k >= 0; k--) {
      const q = p[k];
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
      upper.push(q);
    }
    const h = lower.slice(0, -1).concat(upper.slice(0, -1));
    return h.length >= 3 ? h.map((x) => [x[1], x[0]]) : null;
  }

  function drawOverview(fit) {
    if (!state.map) return;
    state.layer.clearLayers();
    const areaPts = [], allPts = [];
    state.trip.days.forEach((d, i) => {
      const color = dayColor(i);
      const pts = [], area = [], groups = new Map();
      d.stops.forEach((s, n) => {
        if (s.lat == null || s.lng == null) return;
        // 同一天同一個位置只畫一個標記（例如飯店 1・4・6）
        const key = `${(+s.lat).toFixed(5)},${(+s.lng).toFixed(5)}`;
        if (!groups.has(key)) groups.set(key, { s, nums: [] });
        groups.get(key).nums.push(n + 1);
        pts.push([s.lat, s.lng]);
        allPts.push([s.lat, s.lng]);
        // 住宿和交通（機場等）不算進當天的範圍
        if (s.category !== 'stay' && s.category !== 'transit') area.push([s.lat, s.lng]);
      });
      groups.forEach(({ s, nums }) => {
        const label = nums.join('・');
        const mk = L.marker([s.lat, s.lng], { icon: pinIcon(label, color) }).addTo(state.layer);
        mk.bindPopup(popupHTML(s, label, i));
        if (state.showLabels) {
          mk.bindTooltip(esc(s.name), { direction: 'right', offset: [mkHalf(label) + 2, 0], className: 'pin-label' });
        }
      });
      if (pts.length > 1) L.polyline(pts, { color, weight: 2, opacity: 0.6, dashArray: '4 6' }).addTo(state.layer);
      const h = hull(area);
      if (h) {
        L.polygon(h, { color, weight: 2, fillColor: color, fillOpacity: 0.18 })
          .bindTooltip(`Day ${i + 1}`, { permanent: true, direction: 'center', className: 'area-label' })
          .addTo(state.layer);
      }
      areaPts.push(...area);
    });
    // 住宿
    state.trip.stays.forEach((s) => {
      if (s.lat == null || s.lng == null) return;
      L.marker([s.lat, s.lng], {
        icon: L.divIcon({ className: 'pin-wrap', html: '<div class="stay-pin">🏠</div>', iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -15] }),
        zIndexOffset: 800,
      }).bindPopup(`<div class="popup"><div class="p-day">住宿</div><b>${esc(s.name)}</b>${s.address ? `<div>${esc(s.address)}</div>` : ''}</div>`)
        .addTo(state.layer);
      allPts.push([s.lat, s.lng]);
    });
    const focus = areaPts.length ? areaPts : allPts;
    if (fit && focus.length) state.map.fitBounds(focus, { padding: [30, 30], maxZoom: 15, animate: false });
  }

  function onMapClick(e) {
    if (!state.pickMode || state.view !== 'day') return;
    setPickMode(false);
    openStopDialog({
      id: uid(), name: '', category: 'spot', hours: '', note: '', link: '',
      lat: +e.latlng.lat.toFixed(6), lng: +e.latlng.lng.toFixed(6),
    }, true);
  }

  function setPickMode(on) {
    state.pickMode = on;
    const btn = $('#pick-btn');
    if (btn) {
      btn.classList.toggle('on', on);
      btn.textContent = on ? '請點地圖上的位置…（再按一次取消）' : '在地圖上點選';
    }
    const m = $('#map');
    if (m) m.classList.toggle('picking', on);
  }

  /* ---------- 地點搜尋 ----------
   * 一個搜尋框什麼都能貼：地名、地址、Google 地圖網址、手機「分享」的文字、座標。
   * 有 Google API 金鑰 → 用 Google Places（結果跟 Google 地圖一樣），選了之後還會帶入評分、營業時間。
   * 沒有金鑰 → 同時查 Photon（OpenStreetMap）、國土地理院（日本地址）、Nominatim（只有放在網站上時能用）。
   */
  const GKEY = 'tp.googleKey';
  const googleKey = () => localStorage.getItem(GKEY) || '';

  /* 繁體字 → 日本漢字（OpenStreetMap 裡的日本地名是日文寫法） */
  const JP_KANJI = {
    淺: '浅', 澀: '渋', 惠: '恵', 壽: '寿', 黑: '黒', 鐵: '鉄', 驛: '駅', 櫻: '桜', 廣: '広', 舊: '旧', 圓: '円', 藝: '芸',
    區: '区', 濱: '浜', 戶: '戸', 邊: '辺', 齋: '斎', 豐: '豊', 樂: '楽', 澤: '沢', 關: '関', 會: '会', 國: '国', 學: '学',
    縣: '県', 實: '実', 傳: '伝', 鹽: '塩', 條: '条', 點: '点', 燒: '焼', 醫: '医', 發: '発', 稻: '稲', 號: '号', 參: '参',
    與: '与', 廳: '庁', 讀: '読', 賣: '売', 晝: '昼', 單: '単', 隱: '隠', 德: '徳', 嚴: '厳', 對: '対', 歲: '歳', 歷: '歴',
    續: '続', 總: '総', 聽: '聴', 鄉: '郷', 團: '団', 專: '専', 寫: '写', 圖: '図', 樓: '楼', 莊: '荘', 營: '営', 榮: '栄',
    兩: '両', 戀: '恋', 雙: '双', 據: '拠', 轉: '転', 輕: '軽', 擇: '択', 澤: '沢', 驗: '験', 齒: '歯', 龜: '亀', 繪: '絵',
    藥: '薬', 觀: '観', 歡: '歓', 權: '権', 劍: '剣', 險: '険', 擔: '担', 拜: '拝', 氣: '気', 來: '来', 麥: '麦', 黃: '黄',
    畫: '画', 寶: '宝', 舖: '舗', 鋪: '舗', 館: '館', 書: '書', 檢: '検', 經: '経', 變: '変', 晉: '晋', 帶: '帯', 惡: '悪',
  };
  const toJpKanji = (s) => s.replace(/[一-鿿]/g, (c) => JP_KANJI[c] || c);
  const inJapan = (p) => p.lat > 24 && p.lat < 46 && p.lng > 122 && p.lng < 146;
  function distKm(a, b) {
    const R = 6371, r = Math.PI / 180;
    const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  /* 搜尋的中心：目前地圖的中心；沒有地圖時用這趟行程地點的平均 */
  function searchCenter() {
    if (state.map) { const c = state.map.getCenter(); return { lat: c.lat, lng: c.lng }; }
    const pts = state.trip ? state.trip.days.flatMap((d) => d.stops).filter((s) => s.lat != null) : [];
    if (pts.length) return { lat: pts.reduce((a, s) => a + s.lat, 0) / pts.length, lng: pts.reduce((a, s) => a + s.lng, 0) / pts.length };
    return { lat: 35.68, lng: 139.76 };
  }

  /* 判斷輸入是什麼 */
  function interpretInput(text) {
    const s = text.trim();
    const url = (s.match(/https?:\/\/\S+/) || [''])[0];
    const loc = parseLocation(url || s);
    if (loc) return { loc, link: url };
    if (url) {
      let dec = url;
      try { dec = decodeURIComponent(url); } catch (e) { /* 保留 */ }
      // 網址裡有店名（/place/店名、/search/店名、?q=店名）
      const m = dec.match(/\/maps\/(?:place|search)\/([^/@?]+)/) || dec.match(/[?&](?:q|query)=([^&]+)/);
      const fromUrl = m ? m[1].replace(/\+/g, ' ').trim() : '';
      // Google 地圖「搜尋結果頁」：還沒點選某一間店，網址裡沒有店的位置
      if (/\/maps\/search\//.test(dec) && fromUrl) return { searchPage: true, query: fromUrl, link: url };
      // 手機分享的文字：網址前後通常有店名、地址
      const rest = s.replace(url, '').split('\n').map((l) => l.trim()).filter(Boolean)[0] || '';
      const query = fromUrl || rest;
      if (query) return { query, link: url };
      return { shortOnly: /goo\.gl|maps\.app/.test(url), unknownUrl: true, link: url };
    }
    return { query: s, link: '' };
  }

  function catFromGoogle(types) {
    const t = types.join(' ');
    if (/cafe|bakery|coffee|dessert|ice_cream|tea_house|confectioner/.test(t)) return 'cafe';
    if (/restaurant|food|meal_|bar\b|ramen|sushi|izakaya/.test(t)) return 'food';
    if (/lodging|hotel/.test(t)) return 'stay';
    if (/station|airport|transit|bus_/.test(t)) return 'transit';
    if (/store|shop|market|mall/.test(t)) return 'shop';
    return 'spot';
  }

  async function googleSearch(query, key = googleKey()) {
    const body = { textQuery: query, languageCode: 'zh-TW', maxResultCount: 8 };
    if (state.map) {
      const b = state.map.getBounds();
      body.locationBias = { rectangle: {
        low: { latitude: b.getSouth(), longitude: b.getWest() },
        high: { latitude: b.getNorth(), longitude: b.getEast() },
      } };
    } else {
      const c = searchCenter();
      body.locationBias = { circle: { center: { latitude: c.lat, longitude: c.lng }, radius: 50000 } };
    }
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.googleMapsUri,places.types',
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data.error && data.error.message) || `HTTP ${res.status}`);
    return (data.places || []).map((p) => ({
      name: (p.displayName && p.displayName.text) || '', address: p.formattedAddress || '',
      lat: p.location.latitude, lng: p.location.longitude, cat: catFromGoogle(p.types || []),
      source: 'Google', gid: p.id, link: p.googleMapsUri || '',
    }));
  }

  /* 選了 Google 的結果之後，再抓評分、營業時間（只在選定時查一次） */
  async function googleDetails(gid) {
    const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(gid)}?languageCode=zh-TW`, {
      headers: { 'X-Goog-Api-Key': googleKey(), 'X-Goog-FieldMask': 'rating,userRatingCount,regularOpeningHours.weekdayDescriptions,websiteUri' },
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((d.error && d.error.message) || `HTTP ${res.status}`);
    const out = {};
    if (d.rating) out.rating = `Google ${d.rating}${d.userRatingCount ? `（${d.userRatingCount.toLocaleString()}）` : ''}`;
    if (d.regularOpeningHours && d.regularOpeningHours.weekdayDescriptions) Object.assign(out, summarizeHours(d.regularOpeningHours.weekdayDescriptions));
    if (d.websiteUri) out.website = d.websiteUri;
    return out;
  }

  /* ["星期一: 休息", "星期二: 11:00 – 14:00", …] → { hours: '11:00–14:00', closed: '週一' } */
  function summarizeHours(desc) {
    const rows = desc.map((line) => {
      const i = line.search(/[:：]/);
      return { day: line.slice(0, i).trim().replace(/^星期/, '週'), v: line.slice(i + 1).trim().replace(/\s*[–-]\s*/g, '–') };
    });
    const isClosed = (v) => /休息|休業|closed/i.test(v);
    const closed = rows.filter((r) => isClosed(r.v)).map((r) => r.day);
    const open = rows.filter((r) => !isClosed(r.v)).map((r) => r.v.replace(/24 小時營業|Open 24 hours/i, '24 小時'));
    const freq = new Map();
    open.forEach((v) => freq.set(v, (freq.get(v) || 0) + 1));
    const top = [...freq.keys()].sort((a, b) => freq.get(b) - freq.get(a))[0] || '';
    return { hours: top + (freq.size > 1 ? '（部分日子不同）' : ''), closed: closed.join('、') };
  }

  async function freeSearch(query) {
    const c = searchCenter();
    const q = inJapan(c) ? toJpKanji(query) : query;
    const enc = encodeURIComponent(q);
    const getJSON = async (url) => { const r = await fetch(url); if (!r.ok) throw new Error(r.status); return r.json(); };
    const tasks = [
      // lang=default：用當地名稱（日文），不然會跟著瀏覽器語言變成英文名
      getJSON(`https://photon.komoot.io/api/?q=${enc}&limit=10&lang=default&lat=${c.lat}&lon=${c.lng}`).then((d) => d.features.map((f) => {
        const p = f.properties;
        return {
          name: p.name || p.street || '', lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0],
          address: [p.state, p.city, p.district, p.locality, p.street, p.housenumber].filter(Boolean).join(' '),
          cat: guessCategory({ category: p.osm_key, type: p.osm_value }), source: 'OSM',
        };
      })),
    ];
    if (inJapan(c)) {
      tasks.push(getJSON(`https://msearch.gsi.go.jp/address-search/AddressSearch?q=${enc}`).then((d) => d.map((x) => ({
        name: x.properties.title, address: '日本・國土地理院地名／地址', lat: x.geometry.coordinates[1], lng: x.geometry.coordinates[0],
        cat: 'spot', source: '國土地理院',
      }))));
    }
    // Nominatim 不接受沒有來源網址的請求，直接開檔案時用不了；放上網站（GitHub Pages）後才會加入
    if (/^https?:$/.test(location.protocol)) {
      let url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&accept-language=ja,zh-TW,en&q=${enc}`;
      if (state.map) { const b = state.map.getBounds(); url += `&viewbox=${b.getWest()},${b.getNorth()},${b.getEast()},${b.getSouth()}`; }
      tasks.push(getJSON(url).then((d) => d.map((r) => ({
        name: r.name || r.display_name.split(',')[0], address: r.display_name, lat: +r.lat, lng: +r.lon,
        cat: guessCategory(r), source: 'OSM',
      }))));
    }
    const settled = await Promise.allSettled(tasks);
    if (settled.every((s) => s.status === 'rejected')) throw new Error('免費搜尋服務暫時連不上');
    const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, '');
    const qn = norm(q);
    let all = settled.flatMap((s) => (s.status === 'fulfilled' ? s.value : [])).filter((r) => r.name && isFinite(r.lat));
    // 排序：名稱完全相同 > 開頭相同 > 包含 > 其他，同一級再依距離
    all.forEach((r) => {
      r.km = distKm(c, r);
      const n = norm(r.name);
      const tier = n === qn ? 0 : n.startsWith(qn) || qn.startsWith(n) ? 1 : n.includes(qn) || qn.includes(n) ? 2 : 3;
      r.score = tier * 1000 + r.km;
    });
    if (all.some((r) => r.km < 300)) all = all.filter((r) => r.km < 300); // 有附近的結果就不顯示其他縣市的同名地點
    all.sort((a, b) => a.score - b.score);
    const seen = [];
    return all.filter((r) => {
      const dup = seen.some((x) => norm(x.name) === norm(r.name) && distKm(x, r) < 0.3);
      if (!dup) seen.push(r);
      return !dup;
    }).slice(0, 8);
  }

  async function searchPlaces(query) {
    if (googleKey()) {
      try {
        return { results: await googleSearch(query), mode: 'google' };
      } catch (e) {
        return { results: await freeSearch(query), mode: 'free', warn: `Google 搜尋失敗（${e.message}），先改用免費搜尋。可到「⚙ 搜尋設定」檢查金鑰。` };
      }
    }
    return { results: await freeSearch(query), mode: 'free' };
  }

  /* ---------- 用 Google 地圖找（不需要金鑰） ----------
   * 在旁邊開 Google 地圖 → 點選店家 → 複製網址 → 回到這裡自動讀剪貼簿帶入。
   */
  const MOD = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl';
  const looksLikeMapsText = (t) =>
    /google\.[a-z.]+\/maps|maps\.google\.|maps\.app\.goo\.gl|goo\.gl\/maps/i.test(t) ||
    /^\(?\s*-?\d{1,3}\.\d+\s*[,，\s]\s*-?\d{1,3}\.\d+\s*\)?$/.test(t.trim());
  let gmWatch = null; // { input, run(text), hint, last, since }

  function openGoogleMaps(input, run, hint) {
    const q = input.value.trim();
    const c = searchCenter();
    const url = q && !looksLikeMapsText(q)
      ? `https://www.google.com/maps/search/${encodeURIComponent(q)}/@${c.lat.toFixed(5)},${c.lng.toFixed(5)},14z`
      : `https://www.google.com/maps/@${c.lat.toFixed(5)},${c.lng.toFixed(5)},15z`;
    const w = Math.round(Math.min(1000, screen.availWidth * 0.5)), h = Math.round(screen.availHeight * 0.9);
    const win = window.open(url, 'tp-gmaps', `width=${w},height=${h},left=${screen.availWidth - w},top=0`);
    if (!win) window.open(url, '_blank'); // 擋彈出視窗時改開新分頁
    gmWatch = { input, run, hint, last: '', since: Date.now() };
    // 如果早就允許讀剪貼簿，先記下目前的內容，回來時才不會誤用舊的網址
    if (navigator.clipboard && navigator.clipboard.readText) {
      Promise.race([navigator.clipboard.readText(), new Promise((_, rej) => setTimeout(rej, 400))])
        .then((t) => { if (gmWatch) gmWatch.last = t.trim(); }).catch(() => {});
    }
    hint.innerHTML = `
      <div class="gm-guide">
        <b>已在旁邊開啟 Google 地圖</b>
        <ol>
          <li>在 Google 地圖<b>點一下正確的店</b>（左邊會出現店家資訊）</li>
          <li>按 <kbd>${MOD}</kbd>+<kbd>L</kbd>，再按 <kbd>${MOD}</kbd>+<kbd>C</kbd> 複製網址</li>
          <li>回到這個視窗，會<b>自動帶入</b>；沒反應的話，在搜尋框按 <kbd>${MOD}</kbd>+<kbd>V</kbd></li>
        </ol>
        <span class="tip">第一次瀏覽器會問「是否允許查看剪貼簿」，按「允許」之後就會自動帶入。可以連續加好幾間。</span>
      </div>`;
  }

  async function checkClipboard() {
    const g = gmWatch;
    if (!g) return;
    if (!document.body.contains(g.input) || Date.now() - g.since > 60 * 60 * 1000) { gmWatch = null; return; }
    // 已經開著別的視窗（例如上一間的「新增地點」）就先不處理，等關掉後再回來時才帶入
    const dlg = $('#dlg');
    if (dlg.open && !dlg.contains(g.input)) return;
    let t = '';
    try {
      t = (await navigator.clipboard.readText()).trim();
    } catch (e) {
      // 不允許或不支援自動讀取：請使用者自己貼上
      g.input.focus();
      g.input.select();
      const tip = g.hint.querySelector('.gm-paste') || g.hint.appendChild(Object.assign(document.createElement('p'), { className: 'tip ok gm-paste' }));
      tip.innerHTML = `複製好了嗎？在搜尋框按 <kbd>${MOD}</kbd>+<kbd>V</kbd> 就會帶入。`;
      return;
    }
    if (!t || t === g.last || !looksLikeMapsText(t)) return;
    g.last = t;
    g.input.value = t;
    g.run(t);
  }
  window.addEventListener('focus', () => setTimeout(checkClipboard, 150));

  /* 在搜尋框貼上網址、座標或分享文字：不用按搜尋，直接處理 */
  function handlePaste(input, run) {
    input.addEventListener('paste', () => setTimeout(() => {
      const t = input.value.trim();
      if (looksLikeMapsText(t) || /https?:\/\//.test(t)) {
        if (gmWatch) gmWatch.last = t;
        run(t);
      }
    }, 0));
  }

  /*
   * 執行搜尋並把結果顯示在 box 裡；選了某一筆就呼叫 onPick({ name, lat, lng, cat, link, hours, closed, rating… })
   * opts.openGm：「在 Google 地圖找」的函式（顯示在找不到時的提示裡）
   */
  async function runSearch(text, box, onPick, opts = {}) {
    if (!text.trim()) return;
    const it = interpretInput(text);
    if (it.loc) {
      box.innerHTML = '';
      onPick({ name: it.loc.name || '', lat: it.loc.lat, lng: it.loc.lng, cat: 'spot', link: it.link });
      return;
    }
    if (it.searchPage) {
      box.innerHTML = `
        <div class="search-help">
          <b>還沒選到店：</b>這是 Google 地圖「搜尋『${esc(it.query)}』」的結果頁網址，裡面沒有店的位置。
          請在 Google 地圖<b>左邊的清單點一下正確的店</b>，網址會改變，再複製一次就會自動帶入。
        </div>`;
      return;
    }
    if (it.unknownUrl) {
      box.innerHTML = `
        <div class="search-help">
          <b>${it.shortOnly ? '這是 Google 地圖的分享短網址' : '這個網址裡沒有位置資訊'}</b>，網頁讀不到裡面的位置。可以改用：
          <ol>
            <li>直接打<b>店名</b>搜尋（手機分享時，店名通常就在網址上面一行，可以整段一起貼上）</li>
            <li><a href="${esc(it.link)}" target="_blank" rel="noopener">在新分頁打開這個連結 ↗</a>，等地圖載入後，複製<b>網址列的完整網址</b>貼回來</li>
            <li>在 Google 地圖對地點<b>按右鍵</b>，點最上面的座標就會複製，貼回來即可</li>
          </ol>
        </div>`;
      return;
    }
    box.innerHTML = '<p class="tip">搜尋中…</p>';
    let out;
    try {
      out = await searchPlaces(it.query);
    } catch (e) {
      box.innerHTML = `<p class="tip warn">搜尋失敗：${esc(e.message)}。請稍後再試。</p>`;
      return;
    }
    const { results, mode, warn } = out;
    const footer = mode === 'free' ? `
      <div class="search-foot">
        不是要找的？<button type="button" class="linklike" data-gm>在 Google 地圖找「${esc(it.query)}」↗</button>，最準。
      </div>` : '';
    box.innerHTML = `
      ${warn ? `<p class="tip warn">${esc(warn)}</p>` : ''}
      ${results.length ? `<ul class="results">${results.map((r, k) => `
        <li><button type="button" data-k="${k}">
          <b>${esc(r.name)}</b> <span class="src">${esc(r.source)}${r.km != null ? `・${r.km < 1 ? Math.round(r.km * 1000) + ' m' : r.km.toFixed(1) + ' km'}` : ''}</span>
          <small>${esc(r.address)}</small>
        </button></li>`).join('')}</ul>` : `<p class="tip warn">找不到「${esc(it.query)}」。</p>`}
      ${footer}`;
    box.onclick = async (e) => {
      if (e.target.closest('[data-gm]')) { if (opts.openGm) opts.openGm(); return; }
      const b = e.target.closest('[data-k]');
      if (!b) return;
      const r = { ...results[+b.dataset.k] };
      if (!r.link && it.link) r.link = it.link;
      if (r.gid) {
        b.classList.add('loading');
        b.querySelector('small').textContent = '讀取評分、營業時間…';
        try { Object.assign(r, await googleDetails(r.gid)); } catch (err) { /* 沒有詳細資料也沒關係 */ }
      }
      box.innerHTML = '';
      box.onclick = null;
      onPick(r);
    };
  }

  /* ---------- 搜尋設定（Google API 金鑰） ---------- */
  function openSearchSettings() {
    const dlg = $('#dlg');
    const key = googleKey();
    dlg.innerHTML = `
      <form class="dlg-form wide">
        <h3>⚙ 搜尋設定</h3>
        <p>目前使用：<b>${key ? 'Google 搜尋' : '免費搜尋'}</b>${key ? '（結果跟 Google 地圖一樣）' : '（OpenStreetMap＋國土地理院：大景點、地址找得到，小店常常找不到）'}</p>
        <h4>想要跟 Google 地圖一樣的搜尋結果</h4>
        <ol class="steps">
          <li>到 <a href="https://console.cloud.google.com/" target="_blank" rel="noopener">Google Cloud Console ↗</a>，用你的 Google 帳號建立一個專案。</li>
          <li>為專案設定<b>帳單帳戶</b>（需要信用卡）。Google 每個月有免費額度，個人規劃行程通常用不完，但超過會收費。</li>
          <li>在「API 和服務」→「程式庫」搜尋並啟用 <b>Places API (New)</b>。</li>
          <li>在「憑證」建立 <b>API 金鑰</b>，在金鑰的「API 限制」只勾選 Places API (New)。</li>
          <li>把金鑰貼到下面，按「測試」確認可以用。</li>
        </ol>
        <label>Google API 金鑰<input name="key" autocomplete="off" spellcheck="false" placeholder="AIza…"></label>
        <p class="tip">金鑰只存在這台電腦的瀏覽器裡，<b>不會</b>放進匯出的行程檔。之後放上 GitHub Pages 時，建議再到金鑰設定加上「網站限制」，只允許你的網址使用。</p>
        <div class="test-result"></div>
        <div class="dlg-actions">
          ${key ? '<button type="button" class="btn ghost danger" data-clear>清除金鑰</button>' : ''}
          <span class="spacer"></span>
          <button type="button" class="btn ghost" data-test>測試</button>
          <button type="button" class="btn ghost" data-close>取消</button>
          <button type="submit" class="btn primary">儲存</button>
        </div>
      </form>`;
    const form = dlg.querySelector('form'), input = form.elements.key, out = form.querySelector('.test-result');
    input.value = key;
    dlg.querySelector('[data-close]').onclick = () => dlg.close();
    const clear = dlg.querySelector('[data-clear]');
    if (clear) clear.onclick = () => { localStorage.removeItem(GKEY); dlg.close(); setStatus('已改回免費搜尋'); refreshSearchMode(); };
    dlg.querySelector('[data-test]').onclick = async () => {
      const k = input.value.trim();
      if (!k) { out.innerHTML = '<p class="tip warn">請先貼上金鑰。</p>'; return; }
      out.innerHTML = '<p class="tip">測試中…</p>';
      try {
        const r = await googleSearch('浅草寺', k);
        out.innerHTML = `<p class="tip ok">✔ 可以用！搜尋「浅草寺」找到：${esc(r[0] ? r[0].name : '（沒有結果）')}</p>`;
      } catch (e) {
        out.innerHTML = `<p class="tip warn">✕ 無法使用：${esc(e.message)}<br>請確認已啟用 Places API (New)、已設定帳單，且金鑰的 API 限制有勾選它。剛建立的金鑰有時要等幾分鐘才生效。</p>`;
      }
    };
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const k = input.value.trim();
      if (k) localStorage.setItem(GKEY, k); else localStorage.removeItem(GKEY);
      dlg.close();
      setStatus(k ? '已啟用 Google 搜尋' : '已改回免費搜尋');
      refreshSearchMode();
    });
    dlg.showModal();
  }
  function refreshSearchMode() {
    document.querySelectorAll('.search-mode').forEach((el) => { el.textContent = googleKey() ? 'Google 搜尋' : '免費搜尋'; });
  }

  function guessCategory(r) {
    const t = `${r.category || ''} ${r.type || ''}`;
    if (/restaurant|fast_food|food_court|bar|pub/.test(t)) return 'food';
    if (/cafe|bakery|ice_cream|confectionery/.test(t)) return 'cafe';
    if (/shop|mall|marketplace|department/.test(t)) return 'shop';
    if (/hotel|hostel|guest_house|apartment/.test(t)) return 'stay';
    if (/station|aerodrome|railway|bus/.test(t)) return 'transit';
    return 'spot';
  }

  function parseLocation(text) {
    let s = text.trim();
    try { s = decodeURIComponent(s); } catch (e) { /* 保留原字串 */ }
    const nameFromUrl = () => {
      const m = s.match(/\/place\/([^/@?]+)/);
      return m ? m[1].replace(/\+/g, ' ') : '';
    };
    let m;
    // 1. 店家的精確位置（點選店家後網址才會有 !3d…!4d…）
    if ((m = s.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/))) return { lat: +m[1], lng: +m[2], name: nameFromUrl() };
    // 2. 網址路徑直接是座標：/search/35.66,+139.71
    if ((m = s.match(/\/(?:search|place|dir)\/(-?\d+\.\d+),\s*\+?(-?\d+\.\d+)/))) return { lat: +m[1], lng: +m[2], name: '' };
    // 3. @緯度,經度 = 畫面中心。「搜尋結果頁」的畫面中心不是店的位置，所以不採用
    if (!/\/maps\/search\//.test(s) && (m = s.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/))) return { lat: +m[1], lng: +m[2], name: nameFromUrl() };
    if ((m = s.match(/[?&](?:q|query|ll|center|destination)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/))) return { lat: +m[1], lng: +m[2], name: '' };
    if ((m = s.match(/^\(?\s*(-?\d+\.\d+)\s*[,，\s]\s*(-?\d+\.\d+)\s*\)?$/))) return { lat: +m[1], lng: +m[2], name: '' };
    return null;
  }

  /* 今日地點的搜尋框 */
  const openGmForStops = () => openGoogleMaps($('#place-q'), () => doSearch(), $('#gm-hint'));
  function doSearch() {
    const input = $('#place-q');
    if (!input) return;
    runSearch(input.value, $('#search-results'), (r) => {
      input.value = '';
      openStopDialog({
        id: uid(), name: r.name || '', category: CATEGORIES[r.cat] ? r.cat : 'spot',
        hours: r.hours || '', link: r.link || r.website || '',
        note: [r.rating, r.closed && `公休：${r.closed}`].filter(Boolean).join('・'),
        lat: +(+r.lat).toFixed(6), lng: +(+r.lng).toFixed(6),
      }, true);
    }, { openGm: openGmForStops });
  }

  /* ---------- 對話框 ---------- */
  function openStopDialog(stop, isNew) {
    const dlg = $('#dlg');
    const dayIdx = state.dayIdx;
    dlg.innerHTML = `
      <form method="dialog" class="dlg-form">
        <h3>${isNew ? '新增地點' : '編輯地點'}</h3>
        <label>名稱<input name="name" required></label>
        <label>類型<select name="category">${Object.entries(CATEGORIES).map(([k, c]) => `<option value="${k}">${c.icon} ${c.label}</option>`).join('')}</select></label>
        <label>營業時間<input name="hours" ${sg('hours', sgTop('hours'))}></label>
        <label>備註 <small>用 *星號* 包住的字會變成重點色</small><textarea name="note" rows="4"></textarea></label>
        ${photoZoneHTML(MAX_PHOTOS.stop)}
        <label>連結<input name="link" placeholder="https://（官網、tabelog、Google 地圖…）"></label>
        <div class="row2">
          <label>緯度<input name="lat" type="number" step="any"></label>
          <label>經度<input name="lng" type="number" step="any"></label>
        </div>
        <p class="tip">位置也可以之後直接在地圖上拖曳標記調整。${TAB_TIP}</p>
        <div class="dlg-actions">
          <button type="button" class="btn ghost" data-close>取消</button>
          <button type="submit" class="btn primary">${isNew ? '加入' : '儲存'}</button>
        </div>
      </form>`;
    const form = dlg.querySelector('form');
    const f = form.elements;
    ['name', 'category', 'hours', 'note', 'link'].forEach((k) => { f[k].value = stop[k] || ''; });
    f.lat.value = stop.lat ?? '';
    f.lng.value = stop.lng ?? '';
    const photos = [...(stop.photos || [])];
    initPhotoZone(dlg, photos, MAX_PHOTOS.stop);
    dlg.querySelector('[data-close]').onclick = () => dlg.close();
    // 在送出當下處理（不等 close 事件），按 Enter 也等於「加入／儲存」
    form.addEventListener('submit', () => {
      stop.photos = photos;
      stop.name = f.name.value.trim() || '未命名地點';
      stop.category = f.category.value;
      stop.hours = f.hours.value.trim();
      stop.note = f.note.value.trim();
      stop.link = f.link.value.trim();
      stop.lat = f.lat.value === '' ? null : +f.lat.value;
      stop.lng = f.lng.value === '' ? null : +f.lng.value;
      if (isNew) state.trip.days[dayIdx].stops.push(stop);
      save();
      if (state.view === 'day' && state.dayIdx === dayIdx) {
        refreshStops();
        if (stop.lat != null && state.map) state.map.panTo([stop.lat, stop.lng]);
      }
      const box = $('#search-results');
      if (box && isNew) box.innerHTML = '';
    });
    dlg.showModal();
    f.name.focus();
  }

  function openOptDialog(opt, k, isNew) {
    const dlg = $('#dlg');
    const dayIdx = state.dayIdx;
    const label = MEALS.find(([key]) => key === k)[1];
    // 建議值：同一餐上一個備案的區域、這趟最常用的評分網站／預算／營業時間…
    const others = state.trip.days[dayIdx].meals[k].options.filter((o) => o !== opt);
    const areaDef = (others.length && others[others.length - 1].area) || sgTop('area');
    const ratingDef = (sgTop('rating').match(/^\S+\s/) || ['tabelog '])[0];
    dlg.innerHTML = `
      <form class="dlg-form wide">
        <h3>${isNew ? `新增${label}備案` : `編輯${label}備案`}</h3>
        <div class="dlg-search">
          <div class="row">
            <input name="sq" placeholder="搜尋店名，或貼 Google 地圖網址／分享文字，自動帶入資料">
            <button type="button" class="btn small" data-sq>搜尋</button>
            <button type="button" class="btn small primary" data-gm title="用 Google 地圖找到後複製網址，回來自動帶入">Google 地圖找 ↗</button>
          </div>
          <div class="dlg-gm-hint"></div>
          <div class="dlg-results"></div>
        </div>
        <div class="row2">
          <label>店名<input name="name" required></label>
          <label>區域<input name="area" ${sg('area', areaDef, '淺草、上野…（方便比較同區的店）')}></label>
        </div>
        <div class="row3">
          <label>評分<input name="rating" ${sg('rating', ratingDef)}></label>
          <label>預算<input name="budget" ${sg('budget', sgTop('budget'))}></label>
          <label>公休日<input name="closed" ${sg('closed', sgTop('closed'))}></label>
        </div>
        <div class="row2">
          <label>營業時間<input name="hours" ${sg('hours', sgTop('hours'))}></label>
          <label>距離車站<input name="station" ${sg('dist', sgTop('dist'))}></label>
        </div>
        <label>備註 <small>每行一點；用 *星號* 包住的字會變成重點色</small><textarea name="note" rows="4" placeholder="推薦星鰻凍、天婦羅、玉子燒&#10;只收現金"></textarea></label>
        ${photoZoneHTML(MAX_PHOTOS.opt)}
        <label>連結<input name="link" placeholder="https://（tabelog、官網、Google 地圖…）"></label>
        <label>位置 <small>貼上 Google 地圖網址或座標，會自動填入下方經緯度</small><input name="loc" placeholder="https://www.google.com/maps/place/…"></label>
        <div class="row2">
          <label>緯度<input name="lat" type="number" step="any"></label>
          <label>經度<input name="lng" type="number" step="any"></label>
        </div>
        <p class="tip">${TAB_TIP}</p>
        <div class="dlg-actions">
          <button type="button" class="btn ghost" data-close>取消</button>
          <button type="submit" class="btn primary">${isNew ? '加入' : '儲存'}</button>
        </div>
      </form>`;
    const form = dlg.querySelector('form');
    const f = form.elements;
    OPT_FIELDS.forEach((key) => { f[key].value = opt[key] || ''; });
    f.lat.value = opt.lat ?? '';
    f.lng.value = opt.lng ?? '';
    const photos = [...(opt.photos || [])];
    initPhotoZone(dlg, photos, MAX_PHOTOS.opt);
    // 搜尋帶入：店名、位置、連結；Google 搜尋還會帶入評分、營業時間、公休日（只填空白的欄位，店名和位置一律更新）
    const sbox = form.querySelector('.dlg-results');
    const fillFrom = (r) => {
      f.name.value = r.name || f.name.value;
      f.lat.value = (+r.lat).toFixed(6);
      f.lng.value = (+r.lng).toFixed(6);
      const fillIfEmpty = (field, v) => { if (v && !f[field].value) f[field].value = v; };
      fillIfEmpty('link', r.link || r.website);
      fillIfEmpty('rating', r.rating);
      fillIfEmpty('hours', r.hours);
      fillIfEmpty('closed', r.closed);
      f.sq.value = '';
      sbox.innerHTML = `<p class="tip ok">✔ 已帶入「${esc(r.name)}」${r.rating || r.hours ? '的位置、評分與營業時間' : '的位置'}，請確認下方欄位。</p>`;
    };
    const openGm = () => openGoogleMaps(f.sq, () => doSq(), form.querySelector('.dlg-gm-hint'));
    const doSq = () => runSearch(f.sq.value, sbox, (r) => {
      fillFrom(r);
      form.querySelector('.dlg-gm-hint').innerHTML = '';
    }, { openGm });
    form.querySelector('[data-sq]').onclick = doSq;
    form.querySelector('[data-gm]').onclick = openGm;
    handlePaste(f.sq, () => doSq());
    f.sq.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); doSq(); }
    });
    f.loc.addEventListener('input', () => {
      const loc = parseLocation(f.loc.value);
      if (!loc) return;
      f.lat.value = loc.lat;
      f.lng.value = loc.lng;
      if (!f.name.value && loc.name) f.name.value = loc.name;
      if (!f.link.value && /^https?:/.test(f.loc.value.trim())) f.link.value = f.loc.value.trim();
    });
    dlg.querySelector('[data-close]').onclick = () => dlg.close();
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      OPT_FIELDS.forEach((key) => { opt[key] = f[key].value.trim(); });
      opt.photos = photos;
      opt.name = opt.name || '未命名餐廳';
      opt.lat = f.lat.value === '' ? null : +f.lat.value;
      opt.lng = f.lng.value === '' ? null : +f.lng.value;
      if (isNew) state.trip.days[dayIdx].meals[k].options.push(opt);
      else updateLinkedStops(state.trip.days[dayIdx], opt);
      dlg.close();
      save();
      if (state.view === 'day' && state.dayIdx === dayIdx) { refreshStops(false); refreshMealPlans(); }
    });
    dlg.showModal();
    (isNew ? f.sq : f.name).focus();
  }

  function openMoveDialog(stopId) {
    const t = state.trip, from = state.dayIdx;
    const dlg = $('#dlg');
    const stop = t.days[from].stops.find((s) => s.id === stopId);
    if (!stop) return;
    // 住宿這類會重複出現的地點，預設勾「複製」
    const copyDefault = stop.category === 'stay';
    dlg.innerHTML = `
      <form method="dialog" class="dlg-form">
        <h3>「${esc(stop.name)}」要放到哪一天？</h3>
        <label class="chk copy-chk"><input type="checkbox" name="copy" ${copyDefault ? 'checked' : ''}> 複製（保留這一天原本的）</label>
        <div class="move-list">
          ${t.days.map((d, i) => `
            <button value="${i}" ${i === from && !copyDefault ? 'disabled' : ''} class="move-btn" data-day="${i}">
              <span class="dot" style="background:${dayColor(i)}"></span>
              <b>Day ${i + 1}</b> ${fmtDay(dayDate(t, i))}${i === from ? '（這一天）' : ''}<br><small>${rich(d.title) || '未命名'}</small>
            </button>`).join('')}
        </div>
        <p class="tip">會加到那一天的最後面，之後可以再拖曳調整。</p>
        <div class="dlg-actions"><button type="button" class="btn ghost" data-close>取消</button></div>
      </form>`;
    const form = dlg.querySelector('form');
    const copyBox = form.elements.copy;
    // 不複製的話不能「移到」同一天
    copyBox.onchange = () => { form.querySelector(`[data-day="${from}"]`).disabled = !copyBox.checked; };
    dlg.querySelector('[data-close]').onclick = () => dlg.close();
    form.addEventListener('submit', (e) => {
      const to = parseInt(e.submitter ? e.submitter.value : '', 10);
      if (isNaN(to)) return;
      const arr = t.days[from].stops;
      const k = arr.findIndex((s) => s.id === stopId);
      if (k < 0) return;
      if (copyBox.checked) {
        t.days[to].stops.push(cloneStop(arr[k]));
        setStatus(`已複製到 Day ${to + 1}`);
      } else {
        if (to === from) return;
        const [s] = arr.splice(k, 1);
        delete s.mealKey; // 移到別天就不再跟這天的餐食方案連動
        t.days[to].stops.push(s);
        setStatus(`已移到 Day ${to + 1}`);
      }
      save();
      refreshStops();
    });
    dlg.showModal();
  }

  // 複製出來的是一般地點，不再跟餐食方案連動
  const cloneStop = (s) => { const c = { ...JSON.parse(JSON.stringify(s)), id: uid() }; delete c.mealKey; return c; };

  /* ---------- 選定的餐廳 ⇄ 今日地點 ----------
   * 每一餐選定的那間會以一個「連動地點」（mealKey = breakfast/lunch/dinner）出現在今日地點。
   */
  const mealLabel = (k) => (MEALS.find(([key]) => key === k) || [, ''])[1];

  function stopFromOpt(o, k) {
    return {
      id: uid(), fromOpt: o.id, mealKey: k, name: o.name, category: 'food', hours: o.hours, link: o.link,
      note: [`${mealLabel(k)}｜${[o.budget, o.station].filter(Boolean).join('・')}`.replace(/｜$/, ''), o.note].filter(Boolean).join('\n'),
      lat: o.lat, lng: o.lng, photos: (o.photos || []).slice(0, MAX_PHOTOS.stop),
    };
  }

  /* 新加入的餐廳要插在哪：早餐最前（飯店之後）、晚餐最後（回飯店之前）、午餐插在繞路最少的兩站之間 */
  function mealInsertIndex(stops, k, o) {
    const n = stops.length;
    const isStay = (s) => s && s.category === 'stay';
    if (k === 'breakfast') return isStay(stops[0]) ? 1 : 0;
    if (k === 'dinner') return n && isStay(stops[n - 1]) && n > 1 ? n - 1 : n;
    if (o.lat == null || n < 2) return Math.ceil(n / 2);
    let best = Math.ceil(n / 2), bestCost = Infinity;
    for (let i = 1; i < n; i++) {
      const a = stops[i - 1], b = stops[i];
      if (a.lat == null || b.lat == null) continue;
      const cost = distKm(a, o) + distKm(o, b) - distKm(a, b);
      if (cost < bestCost) { bestCost = cost; best = i; }
    }
    return best;
  }

  /* 依目前的選定，加入／換掉／移除這一餐的連動地點；回傳要顯示的訊息 */
  function syncMealStop(d, k) {
    const m = d.meals[k];
    const o = m.options.find((x) => x.id === m.chosen);
    const idx = d.stops.findIndex((s) => s.mealKey === k);
    const label = mealLabel(k);
    if (!o) {
      if (idx < 0) return '';
      const [s] = d.stops.splice(idx, 1);
      return `已從今日地點移除「${s.name}」`;
    }
    if (idx >= 0 && d.stops[idx].fromOpt === o.id) return '';
    // 之前用「→」手動加過這一間：直接改成連動，不再加一次
    const manual = d.stops.findIndex((s) => s.fromOpt === o.id && !s.mealKey);
    if (manual >= 0) {
      if (idx >= 0) d.stops.splice(idx, 1);
      d.stops.find((s) => s.fromOpt === o.id && !s.mealKey).mealKey = k;
      return `「${o.name}」已在今日地點中，設為${label}`;
    }
    const stop = stopFromOpt(o, k);
    if (idx >= 0) {
      const old = d.stops[idx].name;
      d.stops[idx] = stop; // 換成新選的那間，位置不變
      return `${label}改成「${o.name}」（取代「${old}」，位置不變）`;
    }
    d.stops.splice(mealInsertIndex(d.stops, k, o), 0, stop);
    return `已把${label}「${o.name}」加入今日地點，可拖曳調整順序`;
  }

  /* 編輯備案後，更新今日地點裡連動的那一站（保留使用者在地點上自己改的備註） */
  function updateLinkedStops(d, o) {
    d.stops.filter((s) => s.fromOpt === o.id).forEach((s) => {
      Object.assign(s, { name: o.name, hours: o.hours, link: o.link, lat: o.lat, lng: o.lng, photos: (o.photos || []).slice(0, MAX_PHOTOS.stop) });
    });
  }

  function afterMealChange(msg, newStopId) {
    save();
    refreshStops(false);
    refreshMealPlans(true);
    if (msg) setStatus(msg);
    if (newStopId) flashStop(newStopId);
  }

  /* ---------- 匯出 / 匯入 ---------- */
  /* 一趟（或全部）旅程用到的照片 id */
  function photoIdsOf(t) {
    const ids = new Set();
    t.days.forEach((d) => {
      d.stops.forEach((s) => (s.photos || []).forEach((id) => ids.add(id)));
      MEALS.forEach(([k]) => d.meals[k].options.forEach((o) => (o.photos || []).forEach((id) => ids.add(id))));
    });
    return ids;
  }

  /* 刪掉沒有任何行程用到的照片（刪除地點、換照片、取消新增後留下的） */
  async function cleanupPhotos() {
    try {
      // 照片可能屬於這台電腦的行程或雲端的行程，兩邊都算「有在用」
      const used = new Set();
      const stores = Store.name === 'cloud' ? [Store, LocalStore] : [LocalStore];
      for (const st of stores) {
        for (const s of await st.listTrips()) {
          const t = await st.getTrip(s.id);
          if (t) photoIdsOf(normalizeTrip(t)).forEach((id) => used.add(id));
        }
      }
      if ($('#dlg').open) return; // 對話框開著時可能有剛貼上、還沒儲存的照片
      for (const id of await Photos.keys()) if (!used.has(id)) await Photos.del(id);
    } catch (e) { /* 清理失敗不影響使用 */ }
  }

  async function exportTrip() {
    // 照片一起放進行程檔（base64），換電腦匯入時照片也會跟著過去
    const photos = {};
    const ids = [...photoIdsOf(state.trip)];
    if (ids.length) setStatus(`打包照片中（${ids.length} 張）…`);
    for (const id of ids) {
      try { const u = await Photos.toDataURL(id); if (u) photos[id] = u; } catch (e) { /* 少一張照片不影響匯出 */ }
    }
    const data = { app: 'trip-planner', version: 1, exportedAt: new Date().toISOString(), trip: state.trip, photos };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    if (ids.length) setStatus(`已匯出（含 ${Object.keys(photos).length} 張照片，${(blob.size / 1024 / 1024).toFixed(1)} MB）`);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${state.trip.title.replace(/[\\/:*?"<>|]/g, '_')}.trip.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async function importFile(file) {
    let data;
    try {
      data = JSON.parse(await file.text());
    } catch (e) {
      alert('這個檔案不是有效的行程檔。');
      return;
    }
    if (!data || data.app !== 'trip-planner' || !data.trip) {
      alert('這個檔案不是本網站匯出的行程檔。');
      return;
    }
    const trip = normalizeTrip(data.trip);
    if (data.photos && typeof data.photos === 'object') {
      for (const [id, url] of Object.entries(data.photos)) {
        if (typeof url === 'string' && url.startsWith('data:image/')) {
          try { await Photos.fromDataURL(id, url); } catch (e) { /* 壞掉的照片略過 */ }
        }
      }
    }
    const existing = await Store.getTrip(trip.id);
    if (existing && !confirm(`這個瀏覽器已經有「${existing.title}」。\n\n按「確定」用檔案覆蓋它；\n按「取消」匯入成一份新的行程。`)) {
      trip.id = uid();
      trip.title += '（匯入）';
    }
    await Store.saveTrip(trip);
    state.trip = null;
    location.hash = `#/trip/${trip.id}`;
  }

  /* ---------- 事件 ---------- */
  const findStop = (id) => state.trip.days[state.dayIdx].stops.find((s) => s.id === id);
  const findOpt = (k, id) => state.trip.days[state.dayIdx].meals[k].options.find((o) => o.id === id);

  const actions = {
    async 'new-trip'() {
      const title = prompt('旅程名稱', '新的旅程');
      if (!title) return;
      const t = newTrip(title.trim());
      await Store.saveTrip(t);
      state.editMode = true;
      localStorage.setItem('tp.editMode', '1');
      location.hash = `#/trip/${t.id}`;
    },
    async sample() {
      const t = normalizeTrip(makeSampleTrip());
      await Store.saveTrip(t);
      location.hash = `#/trip/${t.id}`;
    },
    'open-trip'(el) { location.hash = `#/trip/${el.dataset.id}`; },
    async 'delete-trip'(el) {
      const t = await Store.getTrip(el.dataset.id);
      if (t && confirm(`確定刪除「${t.title}」？刪除後無法復原（建議先匯出備份）。`)) {
        await Store.deleteTrip(t.id);
        renderHome();
      }
    },
    async 'delete-current'() {
      if (!confirm(`確定刪除「${state.trip.title}」？刪除後無法復原（建議先匯出備份）。`)) return;
      clearTimeout(saveTimer);
      await Store.deleteTrip(state.trip.id);
      state.trip = null;
      location.hash = '#/';
    },
    'toggle-edit'(el) {
      state.editMode = el.checked;
      localStorage.setItem('tp.editMode', el.checked ? '1' : '0');
      renderContent();
    },
    'toggle-labels'(el) {
      state.showLabels = el.checked;
      localStorage.setItem('tp.showLabels', el.checked ? '1' : '0');
      if (state.view === 'day') drawDay(false); else drawOverview(false);
    },
    'toggle-options'(el) {
      state.showOptions = el.checked;
      localStorage.setItem('tp.showOptions', el.checked ? '1' : '0');
      drawDay(false);
    },
    /* 航班 */
    'add-flight'() {
      const t = state.trip, i = t.flights.length;
      // 第 1 班帶入出發日，之後的帶入最後一天
      const date = i === 0 ? t.startDate : isoDate(dayDate(t, t.days.length - 1));
      const f = { id: uid() };
      FLIGHT_FIELDS.forEach((k) => { f[k] = ''; });
      f.departDate = date || '';
      f.arriveDate = date || '';
      t.flights.push(f);
      save();
      setEditMode(true);
      refreshSidebar();
      renderContent();
      const inp = $(`[data-bind="flights.${i}.label"]`);
      if (inp) { inp.scrollIntoView({ block: 'center' }); inp.focus(); }
    },
    'del-flight'(el) {
      const f = state.trip.flights[+el.dataset.i];
      if (!f || !confirm(`刪除航班「${f.label || ''} ${f.flightNo || ''}」？`)) return;
      state.trip.flights.splice(+el.dataset.i, 1);
      save();
      refreshSidebar();
      renderContent();
    },
    /* 住宿 */
    'add-stay'() {
      const t = state.trip, i = t.stays.length, prev = t.stays[i - 1];
      const s = { id: uid(), lat: null, lng: null };
      STAY_FIELDS.forEach((k) => { s[k] = ''; });
      // 第一間：整趟旅程；之後的：從上一間退房那天開始
      s.checkIn = prev ? prev.checkOut : t.startDate;
      s.checkOut = isoDate(dayDate(t, t.days.length - 1));
      t.stays.push(s);
      save();
      setEditMode(true);
      refreshSidebar();
      renderContent();
      const inp = $(`[data-bind="stays.${i}.name"]`);
      if (inp) { inp.scrollIntoView({ block: 'center' }); inp.focus(); }
    },
    'del-stay'(el) {
      const s = state.trip.stays[+el.dataset.i];
      if (!s || !confirm(`刪除住宿「${s.name || '未命名'}」？`)) return;
      state.trip.stays.splice(+el.dataset.i, 1);
      save();
      refreshSidebar();
      renderContent();
    },
    'toggle-secret'(el) {
      const body = el.nextElementSibling;
      body.hidden = !body.hidden;
      el.textContent = body.hidden ? '🔒 顯示私密資訊' : '🔓 隱藏私密資訊';
    },
    /* 行前清單 */
    'check-item'(el) {
      const it = state.trip.checklist[+el.dataset.g].items[+el.dataset.i];
      if (!it) return;
      it.done = el.checked;
      save();
      refreshChecklist();
    },
    'add-item'(el) { addCheckItem(+el.dataset.g); },
    'del-item'(el) {
      state.trip.checklist[+el.dataset.g].items.splice(+el.dataset.i, 1);
      save();
      refreshChecklist();
    },
    'add-group'() {
      state.trip.checklist.push({ id: uid(), title: '', items: [] });
      save();
      setEditMode(true);
      refreshChecklist();
      const ins = document.querySelectorAll('.cl-title-in');
      if (ins.length) ins[ins.length - 1].focus();
    },
    'del-group'(el) {
      const g = state.trip.checklist[+el.dataset.g];
      if (!g || (g.items.length && !confirm(`刪除分類「${g.title || '未命名'}」和裡面的 ${g.items.length} 個項目？`))) return;
      state.trip.checklist.splice(+el.dataset.g, 1);
      save();
      refreshChecklist();
    },
    'scroll-meal'(el, e) {
      e.preventDefault();
      const target = $(`#meal-${el.dataset.k}`);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    'add-opt'(el) {
      const o = { id: uid(), lat: null, lng: null };
      OPT_FIELDS.forEach((k) => { o[k] = ''; });
      openOptDialog(o, el.dataset.k, true);
    },
    'edit-opt'(el) {
      const o = findOpt(el.dataset.k, el.dataset.id);
      if (o) openOptDialog(o, el.dataset.k, false);
    },
    'del-opt'(el) {
      const m = state.trip.days[state.dayIdx].meals[el.dataset.k];
      const k = m.options.findIndex((o) => o.id === el.dataset.id);
      if (k < 0 || !confirm(`刪除備案「${m.options[k].name}」？`)) return;
      m.options.splice(k, 1);
      let msg = '';
      if (m.chosen === el.dataset.id) {
        m.chosen = '';
        msg = syncMealStop(state.trip.days[state.dayIdx], el.dataset.k);
      }
      afterMealChange(msg);
    },
    'choose-opt'(el) {
      const d = state.trip.days[state.dayIdx], k = el.dataset.k, m = d.meals[k];
      m.chosen = m.chosen === el.dataset.id ? '' : el.dataset.id;
      const msg = syncMealStop(d, k);
      const linked = d.stops.find((s) => s.mealKey === k);
      afterMealChange(msg, linked && m.chosen ? linked.id : null);
    },
    'opt-to-route'(el) {
      const o = findOpt(el.dataset.k, el.dataset.id);
      if (!o) return;
      const stops = state.trip.days[state.dayIdx].stops;
      if (stops.some((s) => s.fromOpt === o.id) && !confirm(`「${o.name}」已經在今日地點裡了，還要再加一次嗎？`)) return;
      // 「→」是手動加一份（不連動）；選定 ★ 才會自動連動
      const stop = stopFromOpt(o, el.dataset.k);
      delete stop.mealKey;
      stops.push(stop);
      save();
      refreshStops();
      setStatus(`已把「${o.name}」加入今日地點，可拖曳調整順序`);
    },
    'focus-opt'(el, e) {
      if (e.target.closest('a')) return;
      const mk = state.optMarkers[el.dataset.id];
      if (!mk || !state.map) return;
      $('#map').scrollIntoView({ behavior: 'smooth', block: 'center' });
      state.map.setView(mk.getLatLng(), Math.max(state.map.getZoom(), 15));
      mk.openPopup();
    },
    export: exportTrip,
    'add-day'() {
      state.trip.days.push(newDay());
      save();
      location.hash = `#/trip/${state.trip.id}/day/${state.trip.days.length - 1}`;
    },
    'delete-day'() {
      const t = state.trip;
      if (t.days.length <= 1) { alert('至少要保留一天。'); return; }
      const d = t.days[state.dayIdx];
      if (!confirm(`確定刪除 Day ${state.dayIdx + 1}${d.stops.length ? `（含 ${d.stops.length} 個地點）` : ''}？`)) return;
      t.days.splice(state.dayIdx, 1);
      save();
      location.hash = `#/trip/${t.id}`;
    },
    'add-step'() {
      state.trip.days[state.dayIdx].transport.push({ id: uid(), text: '', rides: [] });
      save();
      refreshTransport();
    },
    'del-step'(el) {
      state.trip.days[state.dayIdx].transport.splice(+el.dataset.s, 1);
      save();
      refreshTransport();
    },
    'add-ride'(el) {
      // 新的一段車：沿用這一步上一段的路線，沒有的話用這個地區的第一條
      const rides = state.trip.days[state.dayIdx].transport[+el.dataset.s].rides;
      const prev = rides[rides.length - 1];
      rides.push(prev && prev.line === 'CUSTOM'
        ? { line: 'CUSTOM', code: prev.code, name: prev.name, color: prev.color, from: '', to: '' }
        : { line: defaultLine(), from: '', to: '' });
      save();
      refreshTransport();
    },
    'del-ride'(el) {
      state.trip.days[state.dayIdx].transport[+el.dataset.s].rides.splice(+el.dataset.r, 1);
      save();
      refreshTransport();
    },
    search: doSearch,
    gmaps: () => openGmForStops(),
    'search-settings'() { openSearchSettings(); },
    'pick-mode'() { setPickMode(!state.pickMode); },
    'focus-stop'(el, e) {
      if (e.target.closest('a')) return;
      const mk = state.markers[el.dataset.id];
      if (mk && state.map) {
        state.map.setView(mk.getLatLng(), Math.max(state.map.getZoom(), 15));
        mk.openPopup();
      }
    },
    'edit-stop'(el) {
      const s = findStop(el.dataset.id);
      if (s) openStopDialog(s, false);
    },
    'move-stop'(el) { openMoveDialog(el.dataset.id); },
    'print-now'() {
      const st = $('#print-status');
      if (st && st.textContent.includes('載入中') && !confirm('還有地圖沒載入完，印出來可能是灰色的。仍要列印嗎？')) return;
      window.print();
    },
    'dup-stop'(el) {
      const arr = state.trip.days[state.dayIdx].stops;
      const k = arr.findIndex((s) => s.id === el.dataset.id);
      if (k < 0) return;
      const copy = cloneStop(arr[k]);
      arr.splice(k + 1, 0, copy);
      save();
      refreshStops();
      flashStop(copy.id);
      setStatus(`已複製「${copy.name}」，拖曳 ⋮⋮ 放到想要的位置`);
    },
    'add-stay-stop'(el) {
      const s = state.trip.stays[+el.dataset.i];
      if (!s) return;
      const stop = {
        id: uid(), name: s.name || '住宿', category: 'stay', hours: '', note: '', link: s.link || '',
        lat: s.lat, lng: s.lng,
      };
      state.trip.days[state.dayIdx].stops.push(stop);
      save();
      refreshStops();
      flashStop(stop.id);
      setStatus(`已加入「${stop.name}」`);
    },
    'del-stop'(el) {
      const arr = state.trip.days[state.dayIdx].stops;
      const k = arr.findIndex((s) => s.id === el.dataset.id);
      if (k >= 0 && confirm(`刪除「${arr[k].name}」？`)) {
        arr.splice(k, 1);
        save();
        refreshStops();
      }
    },
  };

  app.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || (el.tagName === 'INPUT' && el.type === 'file')) return;
    const fn = actions[el.dataset.act];
    if (fn) fn(el, e);
  });

  app.addEventListener('change', (e) => {
    const el = e.target;
    if (el.dataset.act === 'import' && el.files[0]) {
      importFile(el.files[0]);
      el.value = '';
      return;
    }
    // 匯出 PDF 的勾選項目
    if (el.dataset.popt || el.dataset.pday !== undefined) {
      const o = printOpts();
      if (el.dataset.popt) o[el.dataset.popt] = el.checked;
      else {
        const i = +el.dataset.pday;
        o.exDays = el.checked ? o.exDays.filter((x) => x !== i) : [...new Set([...o.exDays, i])];
      }
      savePrintOpts(o);
      refreshPrintPages();
      return;
    }
    if (!el.dataset.bind) return;
    if (el.dataset.bind === 'startDate' || el.dataset.bind === 'region') { refreshSidebar(); renderContent(); return; }
    // 換路線：重畫交通區（選「自訂路線」時要多出代號、名稱、顏色欄）
    if (/\.line$/.test(el.dataset.bind)) { refreshTransport(); return; }
    // 自訂路線的代號、顏色：只更新前面的小圓標，不重畫（才不會打斷 Tab 到下一格）
    const cm = el.dataset.bind.match(/^(.*\.rides\.\d+)\.(code|color)$/);
    if (cm) {
      const keys = cm[1].split('.');
      let r = state.trip;
      keys.forEach((k) => { r = r[k]; });
      const l = lineOf(r);
      const badge = $(`select[data-bind="${cm[1]}.line"]`);
      if (badge && badge.previousElementSibling) {
        badge.previousElementSibling.style.setProperty('--lc', l.color);
        badge.previousElementSibling.textContent = l.code;
      }
    }
    if (/(^title$|\.title$)/.test(el.dataset.bind)) refreshSidebar();
    // 時間：1210 → 12:10、930 → 09:30
    if (el.dataset.time !== undefined) {
      const m = el.value.trim().match(/^(\d{1,2})[:：]?(\d{2})$/);
      if (m && +m[1] < 24 && +m[2] < 60) {
        const v = `${pad(+m[1])}:${m[2]}`;
        if (v !== el.value) { el.value = v; setPath(el.dataset.bind, v); save(); }
      }
      updateComputed(el.dataset.bind);
    }
    // 出發日期填了、抵達日期還空著 → 先帶入同一天
    const dm = el.dataset.bind.match(/^flights\.(\d+)\.departDate$/);
    if (dm) {
      const f = state.trip.flights[+dm[1]];
      if (f && !f.arriveDate && f.departDate) {
        f.arriveDate = f.departDate;
        const a = $(`[data-bind="flights.${dm[1]}.arriveDate"]`);
        if (a) a.value = f.arriveDate;
        save();
        updateComputed(el.dataset.bind);
      }
    }
  });

  function setPath(path, value) {
    const keys = path.split('.');
    let o = state.trip;
    for (let k = 0; k < keys.length - 1; k++) o = o[keys[k]];
    o[keys[keys.length - 1]] = value;
  }

  /* 航班飛行時間、住宿晚數：欄位改了就即時更新 */
  function updateComputed(path) {
    let m = path.match(/^flights\.(\d+)\./);
    if (m) {
      const box = $(`#fdur-${m[1]}`);
      if (box) box.innerHTML = durText(state.trip.flights[+m[1]]);
    }
    m = path.match(/^stays\.(\d+)\./);
    if (m) {
      const box = $(`#snights-${m[1]}`), n = nights(state.trip.stays[+m[1]]);
      if (box) box.innerHTML = n ? `共 <b>${n}</b> 晚` : '填好入住和退房日期後會算出幾晚。';
    }
  }

  app.addEventListener('input', (e) => {
    const el = e.target;
    if (!state.trip) return;
    // 住宿：貼上 Google 地圖網址 → 填入經緯度
    if (el.classList.contains('loc-paste')) {
      const loc = parseLocation(el.value);
      if (!loc) return;
      const base = el.dataset.target;
      ['lat', 'lng'].forEach((k) => {
        setPath(`${base}.${k}`, loc[k]);
        const inp = $(`[data-bind="${base}.${k}"]`);
        if (inp) inp.value = loc[k];
      });
      save();
      setStatus('已填入位置');
      return;
    }
    const path = el.dataset.bind;
    if (!path) return;
    const value = el.dataset.num !== undefined ? (el.value === '' ? null : +el.value) : el.value;
    setPath(path, value);
    save();
    updateComputed(path);
  });

  app.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.isComposing) return;
    if (e.target.id === 'place-q') { e.preventDefault(); doSearch(); }
    if (e.target.classList.contains('cl-new')) { e.preventDefault(); addCheckItem(+e.target.dataset.g); }
  });

  /* 點照片看大圖（用 dialog 才能蓋在「編輯地點」視窗上面） */
  document.addEventListener('click', (e) => {
    const img = e.target.closest('img[data-photo]');
    if (!img || !img.src || img.closest('.page')) return;
    e.preventDefault();
    e.stopPropagation();
    let box = document.getElementById('lightbox');
    if (!box) {
      box = document.createElement('dialog');
      box.id = 'lightbox';
      box.className = 'lightbox';
      box.addEventListener('click', () => box.close());
      document.body.appendChild(box);
    }
    box.innerHTML = `<img src="${img.src}" alt=""><p>點一下關閉</p>`;
    box.showModal();
  }, true);

  // 先確定是用雲端（已登入）還是這台電腦，再顯示畫面；登入／登出後會重新顯示
  let booted = false;
  window.addEventListener('hashchange', () => { if (booted) route(); });
  Cloud.start(() => { booted = true; state.trip = null; route(); });
})();
