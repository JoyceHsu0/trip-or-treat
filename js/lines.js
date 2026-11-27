/*
 * 交通路線：代號、名稱、代表色。
 * 依地區分組；每趟旅程可以在「總覽 → 編輯模式 → 交通路線」選擇地區，或自動判斷。
 * 想加新的城市：在 LINE_SETS 加一組，並在 REGION_BOUNDS 加上範圍（自動判斷用）。
 * 注意：id 不能重複（舊的東京路線沿用原本的 id，其他城市加上前綴）。
 */
window.LINE_SETS = {
  tokyo: {
    label: '東京',
    lines: [
      { id: 'A', code: 'A', name: '淺草線', color: '#E85298' },
      { id: 'I', code: 'I', name: '三田線', color: '#0079C2' },
      { id: 'S', code: 'S', name: '新宿線', color: '#6CBB5A' },
      { id: 'E', code: 'E', name: '大江戶線', color: '#B6007A' },
      { id: 'G', code: 'G', name: '銀座線', color: '#FF9500' },
      { id: 'M', code: 'M', name: '丸之內線', color: '#F62E36' },
      { id: 'H', code: 'H', name: '日比谷線', color: '#9CAEB7' },
      { id: 'T', code: 'T', name: '東西線', color: '#009BBF' },
      { id: 'C', code: 'C', name: '千代田線', color: '#00BB85' },
      { id: 'Y', code: 'Y', name: '有樂町線', color: '#C1A470' },
      { id: 'Z', code: 'Z', name: '半藏門線', color: '#8F76D6' },
      { id: 'N', code: 'N', name: '南北線', color: '#00AC9B' },
      { id: 'F', code: 'F', name: '副都心線', color: '#9C5E31' },
      { id: 'JY', code: 'JY', name: '山手線', color: '#9ACD32' },
      { id: 'JB', code: 'JB', name: '中央·總武線', color: '#FFD400' },
      { id: 'JC', code: 'JC', name: '中央線快速', color: '#F15A22' },
      { id: 'JK', code: 'JK', name: '京濱東北線', color: '#00B2E5' },
      { id: 'KS', code: 'KS', name: '京成本線', color: '#005BAC' },
      { id: 'KS-SA', code: 'KS', name: '成田SKY ACCESS', color: '#F06A00' },
      { id: 'TS', code: 'TS', name: '東武晴空塔線', color: '#0F6CC3' },
      { id: 'TY', code: 'TY', name: '東急東橫線', color: '#DA0442' },
      { id: 'IN', code: 'IN', name: '京王井之頭線', color: '#DD0077' },
    ],
  },
  osaka: {
    label: '大阪',
    lines: [
      { id: 'OS-M', code: 'M', name: '御堂筋線', color: '#E5171F' },
      { id: 'OS-T', code: 'T', name: '谷町線', color: '#522886' },
      { id: 'OS-Y', code: 'Y', name: '四橋線', color: '#0078BA' },
      { id: 'OS-C', code: 'C', name: '中央線', color: '#019A66' },
      { id: 'OS-S', code: 'S', name: '千日前線', color: '#E44D93' },
      { id: 'OS-K', code: 'K', name: '堺筋線', color: '#814721' },
      { id: 'OS-N', code: 'N', name: '長堀鶴見綠地線', color: '#A9CC51' },
      { id: 'OS-I', code: 'I', name: '今里筋線', color: '#EE7B1A' },
      { id: 'OS-P', code: 'P', name: '南港港城線', color: '#00A0DE' },
      { id: 'OS-JO', code: 'O', name: 'JR 大阪環狀線', color: '#E8423C' },
      { id: 'OS-HK', code: 'HK', name: '阪急', color: '#7A1F2B' },
      { id: 'OS-HS', code: 'HS', name: '阪神', color: '#00539F' },
      { id: 'OS-NK', code: 'NK', name: '南海', color: '#F26722' },
      { id: 'OS-KH', code: 'KH', name: '京阪', color: '#00703C' },
      { id: 'OS-KT', code: 'KT', name: '近鐵', color: '#C8102E' },
    ],
  },
  fukuoka: {
    label: '福岡',
    lines: [
      { id: 'FK-K', code: 'K', name: '空港線', color: '#F37021' },
      { id: 'FK-H', code: 'H', name: '箱崎線', color: '#2B6CB0' },
      { id: 'FK-N', code: 'N', name: '七隈線', color: '#00A55B' },
      { id: 'FK-JR', code: 'JR', name: 'JR 九州', color: '#D7000F' },
      { id: 'FK-NT', code: 'T', name: '西鐵天神大牟田線', color: '#2E8BC0' },
      { id: 'FK-BUS', code: '西', name: '西鐵巴士', color: '#C9161D' },
    ],
  },
};

/* 不分地區、每趟都會出現的交通方式 */
window.GENERIC_LINES = [
  { id: 'WALK', code: '步', name: '步行', color: '#8B6F47' },
  { id: 'BUS', code: 'B', name: '巴士', color: '#6B7B8C' },
  { id: 'TAXI', code: '計', name: '計程車', color: '#E0A800' },
  { id: 'TRAIN', code: 'JR', name: 'JR／火車', color: '#2E8B57' },
  { id: 'SUBWAY', code: 'M', name: '地鐵', color: '#4A6FA5' },
  { id: 'TRAM', code: '電', name: '路面電車', color: '#B5651D' },
  { id: 'FERRY', code: '船', name: '船', color: '#1F7A8C' },
  { id: 'FLIGHT', code: '機', name: '飛機', color: '#5C6BC0' },
  { id: 'CUSTOM', code: '?', name: '自訂路線…', color: '#888888' },
  { id: 'OTHER', code: '?', name: '其他', color: '#888888' },
];

/* 自動判斷用的大概範圍：[南, 西, 北, 東] */
window.REGION_BOUNDS = {
  tokyo: [35.3, 139.0, 36.1, 140.5],   // 含成田、橫濱
  osaka: [34.3, 135.0, 35.1, 136.0],   // 含京都、神戶、奈良
  fukuoka: [33.2, 130.1, 33.95, 130.8],
};

window.LINE_MAP = Object.fromEntries(
  Object.values(window.LINE_SETS).flatMap((s) => s.lines).concat(window.GENERIC_LINES).map((l) => [l.id, l]),
);

/* 淺色底的路線用深色字 */
window.lineTextColor = function (hex) {
  const n = parseInt(String(hex || '#888888').slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) > 170 ? '#222' : '#fff';
};
