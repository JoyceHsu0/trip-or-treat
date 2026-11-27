/*
 * 資料儲存層：畫面程式只用 Store.listTrips / getTrip / saveTrip / deleteTrip。
 *  - LocalStore：存在這個瀏覽器的 localStorage（沒登入時、或直接開檔案時）
 *  - 雲端（Firebase）：登入後由 js/cloud.js 用 Store.use(...) 換上去
 */
(function () {
  'use strict';

  const KEY = 'tp.trips.v1';
  const clone = (o) => JSON.parse(JSON.stringify(o));

  function readAll() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || {};
    } catch (e) {
      return {};
    }
  }
  function writeAll(all) {
    localStorage.setItem(KEY, JSON.stringify(all));
  }

  const summary = (t) => ({
    id: t.id,
    title: t.title,
    subtitle: t.subtitle,
    startDate: t.startDate,
    dayCount: (t.days || []).length,
    updatedAt: t.updatedAt || 0,
  });

  window.LocalStore = {
    name: 'local',
    async listTrips() {
      return Object.values(readAll()).map(summary).sort((a, b) => b.updatedAt - a.updatedAt);
    },
    async getTrip(id) {
      const t = readAll()[id];
      return t ? clone(t) : null;
    },
    async saveTrip(trip) {
      const all = readAll();
      trip.updatedAt = Date.now();
      all[trip.id] = clone(trip);
      writeAll(all);
    },
    async deleteTrip(id) {
      const all = readAll();
      delete all[id];
      writeAll(all);
    },
  };

  window.tripSummary = summary;

  let backend = window.LocalStore;
  window.Store = {
    use(b) { backend = b; },
    get name() { return backend.name; },
    listTrips: (...a) => backend.listTrips(...a),
    getTrip: (...a) => backend.getTrip(...a),
    saveTrip: (...a) => backend.saveTrip(...a),
    deleteTrip: (...a) => backend.deleteTrip(...a),
  };
})();
