/*
 * 照片：壓縮後存在瀏覽器的 IndexedDB（容量比 localStorage 大很多）。
 * 行程資料裡只存照片的 id；之後換成 Google Drive 時，只要替換這個檔案的 put/get/del/keys。
 */
(function () {
  'use strict';

  const DB_NAME = 'tp-photos', STORE = 'photos';
  let dbPromise = null;

  function db() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return dbPromise;
  }

  async function tx(mode, fn) {
    const d = await db();
    return new Promise((resolve, reject) => {
      const t = d.transaction(STORE, mode);
      const req = fn(t.objectStore(STORE));
      t.oncomplete = () => resolve(req && req.result);
      t.onerror = () => reject(t.error);
    });
  }

  const urls = new Map(); // id → objectURL（同一張照片只建立一次）

  window.Photos = {
    put: (id, blob) => tx('readwrite', (s) => s.put(blob, id)),
    get: (id) => tx('readonly', (s) => s.get(id)),
    del: (id) => {
      if (urls.has(id)) { URL.revokeObjectURL(urls.get(id)); urls.delete(id); }
      return tx('readwrite', (s) => s.delete(id));
    },
    keys: () => tx('readonly', (s) => s.getAllKeys()),

    async url(id) {
      if (urls.has(id)) return urls.get(id);
      const blob = await this.get(id);
      if (!blob) return '';
      const u = URL.createObjectURL(blob);
      urls.set(id, u);
      return u;
    },

    /*
     * 壓縮：長邊縮到 maxEdge（預設 1400px，菜單上的字也看得清楚），轉成 JPEG 品質 0.8。
     * 小圖不會放大；如果壓完反而比原檔大，就用原檔。
     */
    async compress(file, maxEdge = 1400, quality = 0.8) {
      let bmp;
      try {
        bmp = await createImageBitmap(file);
      } catch (e) {
        throw new Error('讀不了這個圖片格式（iPhone 的 HEIC 請先轉成 JPG，或用截圖）');
      }
      const scale = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height));
      const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff'; // 透明的 PNG 轉 JPEG 時底色用白色
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(bmp, 0, 0, w, h);
      if (bmp.close) bmp.close();
      const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', quality));
      return file.type === 'image/jpeg' && file.size <= blob.size && scale === 1 ? file : blob;
    },

    /* 匯出／匯入行程檔用 */
    async toDataURL(id) {
      const blob = await this.get(id);
      if (!blob) return '';
      return new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
    },
    async fromDataURL(id, dataUrl) {
      const blob = await (await fetch(dataUrl)).blob();
      await this.put(id, blob);
    },
  };

  /* 頁面上 <img data-photo="id"> 自動載入照片（不管是哪個畫面產生的） */
  function hydrate(root) {
    const imgs = root.querySelectorAll ? root.querySelectorAll('img[data-photo]:not([src])') : [];
    imgs.forEach((img) => {
      Photos.url(img.dataset.photo).then((u) => {
        if (u) img.src = u;
        else img.classList.add('missing');
      }).catch(() => img.classList.add('missing'));
    });
  }
  new MutationObserver((muts) => muts.forEach((m) => m.addedNodes.forEach((n) => {
    if (n.nodeType !== 1) return;
    if (n.matches && n.matches('img[data-photo]:not([src])')) hydrate(n.parentNode || n);
    else hydrate(n);
  }))).observe(document.documentElement, { childList: true, subtree: true });
})();
