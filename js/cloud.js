/*
 * Google 登入＋雲端儲存（Firebase Authentication + Cloud Firestore）。
 * 資料放在 users/{uid}/trips/{tripId}，安全規則只允許本人讀寫。
 * firebaseConfig 放在公開網頁上是正常的（它只是「這是哪個 Firebase 專案」，不是密碼）。
 */
(function () {
  'use strict';

  const firebaseConfig = {
    apiKey: 'AIzaSyBpy5r4RNW-MvCRUpSNXK_9IhhvPRRZv3I',
    authDomain: 'trip-or-treat.firebaseapp.com',
    projectId: 'trip-or-treat',
    storageBucket: 'trip-or-treat.firebasestorage.app',
    messagingSenderId: '48053881585',
    appId: '1:48053881585:web:4ed6f4d2a8d23accb7b750',
  };

  const LOCAL_MODE = 'tp.localMode'; // 使用者選了「先不登入」
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let auth = null, db = null, user = null, onReady = null, started = false;
  // Google 登入只能在網址是 http(s) 的頁面用（直接點兩下開檔案不行）
  const canUseCloud = () => !!window.firebase && /^https?:$/.test(location.protocol);

  /* 雲端版的 Store：每份行程一個文件，內容存成 JSON 字串（避開 Firestore 的格式限制），另外放清單用的摘要欄位 */
  function cloudStore(uid) {
    const col = db.collection('users').doc(uid).collection('trips');
    return {
      name: 'cloud',
      async listTrips() {
        const snap = await col.get();
        return snap.docs.map((d) => { const { data, ...s } = d.data(); return { ...s, id: d.id }; })
          .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      },
      async getTrip(id) {
        const d = await col.doc(id).get();
        if (!d.exists) return null;
        try { return JSON.parse(d.data().data); } catch (e) { return null; }
      },
      async saveTrip(trip) {
        trip.updatedAt = Date.now();
        const p = col.doc(trip.id).set({ ...tripSummary(trip), data: JSON.stringify(trip) });
        // 沒網路時不等伺服器：資料先存在手機裡，連上網後 Firestore 會自動同步
        if (navigator.onLine) await p;
        else p.catch(() => {});
      },
      async deleteTrip(id) {
        const p = col.doc(id).delete();
        if (navigator.onLine) await p;
      },
    };
  }

  /* ---------- 登入畫面 ---------- */
  function renderLogin(message) {
    const app = document.getElementById('app');
    const fileMode = !/^https?:$/.test(location.protocol);
    app.innerHTML = `
      <header class="home-hero"><h1>我的旅程</h1><p>Trip Planner</p></header>
      <main class="home login">
        <div class="card login-card">
          <h2>登入</h2>
          <p>用 Google 帳號登入後，行程會存在雲端：電腦和手機都看得到，每個人只看得到自己的行程。</p>
          ${message ? `<p class="tip warn">${esc(message)}</p>` : ''}
          ${fileMode ? `<p class="tip warn">現在是直接打開檔案，Google 登入無法使用。請改用網址開啟（GitHub Pages，或在這個資料夾執行 <code>python -m http.server 8000</code> 後開 <code>http://localhost:8000</code>）。</p>` : ''}
          <button class="btn primary big" data-cloud="login" ${canUseCloud() ? '' : 'disabled'}>
            <span class="g-logo">G</span> 用 Google 帳號登入
          </button>
          <button class="btn ghost" data-cloud="local">先不登入（資料只存在這台電腦）</button>
        </div>
      </main>`;
  }

  /* ---------- 第一次登入：把這台電腦的行程上傳 ---------- */
  async function offerMigration() {
    const key = `tp.migrated.${user.uid}`;
    if (localStorage.getItem(key)) return;
    const local = await LocalStore.listTrips();
    if (!local.length) { localStorage.setItem(key, '1'); return; }
    const cloud = new Set((await Store.listTrips()).map((t) => t.id));
    const dlg = document.getElementById('dlg');
    await new Promise((resolve) => {
      dlg.innerHTML = `
        <form class="dlg-form">
          <h3>把這台電腦的行程上傳到帳號？</h3>
          <p>這台電腦的瀏覽器裡有 ${local.length} 份行程：</p>
          <ul class="mig-list">
            ${local.map((t) => `<li><label class="chk"><input type="checkbox" value="${esc(t.id)}" checked> ${esc(t.title)}${cloud.has(t.id) ? ' <small>（帳號裡已有同一份，會覆蓋）</small>' : ''}</label></li>`).join('')}
          </ul>
          <p class="tip">上傳後，在手機登入同一個帳號就看得到。這台電腦裡原本的資料不會刪除。照片目前還是只存在這台電腦。</p>
          <div class="dlg-actions">
            <button type="button" class="btn ghost" data-skip>先不要</button>
            <button type="submit" class="btn primary">上傳勾選的行程</button>
          </div>
        </form>`;
      const form = dlg.querySelector('form');
      const done = () => { dlg.close(); resolve(); };
      dlg.querySelector('[data-skip]').onclick = () => { localStorage.setItem(key, '1'); done(); };
      form.onsubmit = async (e) => {
        e.preventDefault();
        const ids = [...form.querySelectorAll('input:checked')].map((i) => i.value);
        form.querySelector('button[type=submit]').disabled = true;
        form.querySelector('button[type=submit]').textContent = '上傳中…';
        for (const id of ids) {
          const t = await LocalStore.getTrip(id);
          if (t) await Store.saveTrip(t);
        }
        localStorage.setItem(key, '1');
        done();
      };
      dlg.oncancel = (e) => e.preventDefault(); // 要明確選一個
      dlg.showModal();
    });
  }

  async function signIn() {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await auth.signInWithPopup(provider);
    } catch (e) {
      if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') {
        await auth.signInWithRedirect(provider);
      } else if (e.code === 'auth/unauthorized-domain') {
        renderLogin(`這個網址（${location.hostname}）還沒有加到 Firebase 的「授權網域」，所以不能登入。`);
      } else if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
        renderLogin('登入失敗：' + (e.message || e.code));
      }
    }
  }

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cloud]');
    if (!b) return;
    const act = b.dataset.cloud;
    if (act === 'login') {
      if (!canUseCloud()) return;
      localStorage.removeItem(LOCAL_MODE);
      if (auth.currentUser) return;
      signIn();
    } else if (act === 'local') {
      localStorage.setItem(LOCAL_MODE, '1');
      Store.use(LocalStore);
      onReady();
    } else if (act === 'logout') {
      if (!confirm('確定要登出嗎？')) return;
      localStorage.removeItem(LOCAL_MODE);
      Store.use(LocalStore);
      auth.signOut();
    } else if (act === 'goto-login') {
      localStorage.removeItem(LOCAL_MODE);
      if (auth && auth.currentUser) return;
      renderLogin();
    }
  });

  window.Cloud = {
    available: canUseCloud,
    user: () => user,
    /* 畫面右上角的帳號區塊 */
    badgeHTML() {
      if (user) {
        const name = user.displayName || user.email || '';
        return `<span class="acct">${user.photoURL ? `<img src="${esc(user.photoURL)}" alt="" referrerpolicy="no-referrer">` : ''}<span class="acct-name">${esc(name)}</span>
          <button class="linklike" data-cloud="logout">登出</button></span>`;
      }
      return `<span class="acct local">只存在這台電腦${canUseCloud() ? ' <button class="linklike" data-cloud="goto-login">登入</button>' : ''}</span>`;
    },

    /* 啟動：決定用雲端還是本機，準備好後呼叫 ready()（之後登入／登出也會再呼叫） */
    start(ready) {
      onReady = ready;
      if (!canUseCloud()) { Store.use(LocalStore); ready(); return; }
      if (started) return;
      started = true;
      firebase.initializeApp(firebaseConfig);
      auth = firebase.auth();
      db = firebase.firestore();
      // 離線也能看、能改：資料存一份在這台裝置，連上網後自動同步
      db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
      auth.getRedirectResult().catch((e) => renderLogin('登入失敗：' + (e.message || e.code)));
      auth.onAuthStateChanged(async (u) => {
        user = u;
        if (u) {
          Store.use(cloudStore(u.uid));
          localStorage.removeItem(LOCAL_MODE);
          try { await offerMigration(); } catch (e) { /* 上傳失敗不影響使用 */ }
          ready();
        } else if (localStorage.getItem(LOCAL_MODE)) {
          Store.use(LocalStore);
          ready();
        } else {
          Store.use(LocalStore);
          renderLogin();
        }
      });
    },
  };
})();
