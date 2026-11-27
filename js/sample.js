/*
 * 範例行程：取自「東京秋日文青慢遊記」。
 * 座標為大約位置，可在地圖上拖曳標記修正。
 * 用 *星號* 包住的字會顯示成咖啡色重點字。
 */
window.makeSampleTrip = function () {
  let n = 0;
  const id = () => 's' + (++n).toString(36) + Math.random().toString(36).slice(2, 6);
  const stop = (name, category, lat, lng, extra = {}) =>
    ({ id: id(), name, category, lat, lng, hours: '', note: '', link: '', ...extra });
  const ride = (line, from, to) => ({ line, from, to });
  const step = (text, rides = []) => ({ id: id(), text, rides });
  const day = (title, meals, transport, stops, summary = '') =>
    ({ id: id(), title, summary, meals, transport, stops });

  /* 餐廳備案 */
  const opt = (name, area, lat, lng, extra = {}) => ({
    id: id(), name, area, lat, lng,
    rating: '', budget: '', closed: '', hours: '', station: '', note: '', link: '', ...extra,
  });
  /* 一餐：一句話安排 + 備案；chosen 是選定第幾個（從 0 開始），-1 代表還沒決定 */
  const meal = (text, options = [], chosen = -1) =>
    ({ text, options, chosen: chosen >= 0 && options[chosen] ? options[chosen].id : '' });
  const home = () => meal('溫暖的家');

  const reve = () => stop('Reve Asakusa（住宿）', 'stay', 35.7052, 139.8066, {
    note: '本所吾妻橋站 500 m／押上站 950 m／錦糸町站 1.5 km\nCheck-in 16:00–22:00，Check-out 10:00 前',
  });

  return {
    id: 'sample-' + Date.now().toString(36),
    title: '東京秋日文青慢遊記',
    subtitle: 'Tokyo Autumn Artisan Journey',
    startDate: '2025-10-14',
    coverUrl: '',
    flights: [
      {
        id: id(), label: '去程', airline: '泰國獅子航空', flightNo: 'SL394',
        from: 'TPE 桃園機場', departDate: '2025-10-14', departTime: '12:10',
        to: 'NRT 東京成田機場', arriveDate: '2025-10-14', arriveTime: '16:30', note: '',
      },
      {
        id: id(), label: '回程', airline: '長榮航空', flightNo: 'BR183',
        from: 'NRT 東京成田機場', departDate: '2025-10-20', departTime: '13:25',
        to: 'TPE 桃園機場', arriveDate: '2025-10-20', arriveTime: '16:05', note: '',
      },
    ],
    stays: [
      {
        id: id(), name: 'Reve Asakusa', room: '602',
        checkIn: '2025-10-14', checkInTime: '16:00–22:00',
        checkOut: '2025-10-20', checkOutTime: '10:00 前',
        guests: '2 位成人・1 間公寓', price: 'TWD 19,776（¥95,827）',
        stations: '本所吾妻橋站 – 500 m（*淺草線*）\n押上站 – 950 m（半藏門線、京成押上線、東武晴空塔線）\n錦糸町車站 – 1.5 km',
        address: '東京都墨田區', link: '',
        lat: 35.7052, lng: 139.8066,
        note: '含 10% 加值稅與清潔費\n*垃圾*：大樓入口旁邊的門是垃圾間，分可燃、不可燃、資源垃圾',
        secret: '（範例）大門、房間、垃圾間鑰匙盒的密碼可以記在這裡，瀏覽時會先隱藏。',
      },
    ],
    checklist: [
      {
        id: id(), title: '交通與錢', items: [
          { id: id(), text: '地鐵周遊券', done: false },
          { id: id(), text: 'Visit Japan Web App', done: true },
          { id: id(), text: 'Klook App', done: true },
          { id: id(), text: 'Japan Transit Planner App', done: false },
          { id: id(), text: '全支付', done: false },
        ],
      },
      {
        id: id(), title: '物品', items: [
          { id: id(), text: 'SIM 卡', done: false },
          { id: id(), text: '牙線', done: false },
          { id: id(), text: '塑膠袋', done: false },
        ],
      },
    ],
    intro:
      '當秋意漸濃、微風輕拂，東京悄悄換上溫柔的色彩。這趟「東京秋日文青慢遊記」，不走人潮洶湧的觀光路線，而是帶您深入城市最有溫度的角落——那些只有在慢下腳步時，才能感受到的靈魂風景。\n\n' +
      '我們將造訪藝術家的私房秘境、設計師的靈感天堂，以及職人世代傳承的匠心場域。從*晴空塔*俯瞰層層秋色，到*根津美術館*靜賞日式庭園的禪意；漫步*中目黑*與*代官山*，探訪隱身巷弄的設計小店；走進*日暮里*織品街，感受手作的溫度與質地；*六本木*與*麻布台*的藝術燈火——每一段旅程，都是一次與東京靈魂的深度對話。',
    days: [
      day('初抵東京 → 遠眺*晴空塔*夜色初印象',
        { breakfast: home(), lunch: home(), dinner: home() },
        [
          step('台北 12:10 → 成田 16:30（泰國獅子航空 SL394）'),
          step('成田機場 → 住宿（京成 Access 特急，約 1 小時）', [ride('KS-SA', '成田機場', '本所吾妻橋')]),
        ],
        [
          stop('成田機場', 'transit', 35.7720, 140.3929, { note: '抵達後可在京成站服務台買*西瓜卡*' }),
          reve(),
          stop('錦糸町', 'spot', 35.6963, 139.8143),
          stop('東京晴空塔', 'spot', 35.7101, 139.8107, { note: '遠眺夜色初印象' }),
        ]),

      day('*淺草道具街*職人尋寶 → *日暮里*懷舊風情 → *阿美橫町*熱鬧市集',
        {
          breakfast: home(),
          lunch: meal('', [
            opt('江戸料理 櫻田', '淺草', 35.7117, 139.7927, {
              rating: 'tabelog 3.46', budget: '¥1,000–1,999', closed: '週一、節假日後',
              hours: '11:00–14:00', station: '距離淺草站 350 m',
              note: '中午只有壽喜燒，¥2000\n據說白飯好吃，但老闆娘會逼你把白飯吃完\n是和牛，但有一些筋',
            }),
            opt('浅草 ひら山', '淺草', 35.7108, 139.7910, {
              rating: 'tabelog 3.71', budget: '¥2,000–2,999', closed: '週一、週二',
              hours: '12:00–14:00', station: '距離淺草站 700 m',
              note: '蠻清淡、評價高、道地少外國人\n世界第一間入圍米其林必比登的蕎麥麵店\n推薦*星鰻凍、天婦羅、玉子燒*',
            }),
            opt('Guruatsu STAND', '上野', 35.7103, 139.7836, {
              rating: 'tabelog 3.08', budget: '～¥999', closed: '週日',
              hours: '11:30–16:00', station: '距離上野站 800 m',
              note: '餐盒健康蔬菜多\n評價很少的在地隱藏小店\n要走去上野，但其實是*順路*的',
            }),
            opt('日本料理 稲荷町 髙はし', '上野', 35.7110, 139.7826, {
              rating: 'tabelog 3.40', budget: '¥1,000–1,999', closed: '週日、節假日',
              hours: '11:30–13:30', station: '距離上野站 500 m',
              note: '非常少人知道的私房料理\n清爽日式商業午餐\n菜單不固定',
            }),
          ]),
          dinner: meal('', [
            opt('鴨to葱', '阿美橫町', 35.7073, 139.7738, {
              rating: 'tabelog 3.74', budget: '¥1,000–1,999',
              hours: '24 小時', station: '距離御徒町站 88 m',
              note: '付款在機台完成，*目前只收現金*\n點完之後會給予票券',
            }),
            opt('利久牛舌', '阿美橫町', 35.7086, 139.7724, {
              rating: 'tabelog 3.07', budget: '¥2,000–2,999',
              hours: '11:00–21:30', station: '距離上野廣小路站 160 m',
              note: '彈牙的肉質，濃郁的香氣\n厚切牛舌有點太硬，*一般的就好*',
            }),
            opt('名代 宇奈とと 上野店', '阿美橫町', 35.7121, 139.7744, {
              rating: 'tabelog 3.14', budget: '¥1,000–1,999',
              hours: '10:00–23:00', station: '距離上野站 130 m',
              note: '超級超級便宜的鰻魚飯\n居酒屋類型，不強制一人一份餐點\n推薦*鰻魚蓋飯、玉子燒、白燒*',
            }),
          ]),
        },
        [
          step('淺草道具街 → 住宿（約 31 分鐘）', [ride('A', '淺草', '本所吾妻橋')]),
          step('住宿 → 根津神社／日暮里（約 45／36 分鐘）'),
          step('日暮里 → 御徒町（約 9 分鐘）¥146', [ride('JY', '日暮里', '御徒町')]),
          step('御徒町 → 住宿（約 30 分鐘）¥280'),
        ],
        [
          stop('淺草文化觀光中心 展望台', 'spot', 35.71065, 139.79656, {
            note: '雷門對面，*8 樓免費展望台*，可同時欣賞晴空塔與淺草寺。',
          }),
          stop('淺草寺', 'spot', 35.71477, 139.79665),
          stop('雷一茶 傳法院通店', 'cafe', 35.7123, 139.7942, { hours: '10:00–18:00', note: '好喝抹茶！' }),
          stop('合羽橋道具街', 'shop', 35.7140, 139.7883, {
            note: '*DR.GOODS*：廚房道具專賣殿堂\n*飯田屋*：兩層樓、超過 8500 種專業廚具\n*川崎商店*：創業 73 年的廚房器具老舖\n中午往淺草或上野地鐵站移動，兌換地鐵周遊券',
          }),
          stop('谷中銀座商店街', 'spot', 35.7276, 139.7664, {
            note: '*夕陽觀賞聖地*，170 公尺短街匯聚 60 間店鋪',
          }),
          stop('茶の君野園', 'cafe', 35.7101, 139.7744, { hours: '10:00–18:30', note: '抹茶粉、超濃郁抹茶冰淇淋' }),
          stop('二木の菓子', 'shop', 35.7083, 139.7743, {
            hours: '10:30–19:30', note: '零食批發，*可退稅*，伴手禮一次買齊',
          }),
        ]),

      day('*明治神宮*森林晨參 → *代代木公園*酸種麵包野餐 → 漫步*澀谷*',
        {
          breakfast: home(),
          lunch: meal('', [
            opt('東京たらこスパゲティ 原宿表参道店', '原宿', 35.6693, 139.7052, {
              rating: 'tabelog 3.44', budget: '¥1,000–1,999',
              hours: '11:30–20:00', station: '距離明治神宮 750 m',
              note: '日本風味的明太子義大利麵\n一開始是專為女性設計的店\n主打清爽無負擔',
            }),
            opt('BROWN RICE Tokyo Omotesando', '原宿', 35.6658, 139.7095, {
              rating: 'tabelog 3.48', budget: '¥2,000–2,999',
              hours: '09:00–19:00', station: '表參道站',
              note: '蔬食餐廳，調味溫和，*價錢稍貴*\n一湯三菜 ¥2900／時令蔬菜蒸籠 ¥3000／季節蔬菜咖哩 ¥2700',
            }),
            opt('Levain 富ヶ谷', '代代木', 35.6666, 139.6860, {
              rating: 'tabelog 3.77', budget: '～¥999', closed: '週一',
              hours: '09:00–18:00', station: '距離代代木公園站 400 m',
              note: '人氣酸種麵包店，日本天然酵母麵包的先驅\n天氣好可以去*代代木公園野餐*',
            }),
            opt('MEALS', '代代木', 35.6680, 139.6893, {
              rating: 'tabelog 3.55', budget: '¥1,000–1,999', closed: '週三',
              hours: '11:30–17:30', station: '距離代代木公園站 350 m',
              note: '日式套餐，均價 ¥2400\n生意很好，樓下賣漂亮餐具',
            }),
          ]),
          dinner: meal('或回家吃（溫暖的家）', [
            opt('渋谷きんぼし', '澀谷', 35.6590, 139.7020, {
              rating: 'tabelog 3.60', budget: '¥5,000–5,999',
              hours: '16:00–23:30', station: '距離澀谷站 312 m',
              note: '每天更換菜單\n最近在東京紅起來的居酒屋\n推薦*鮭魚卵餐盒、肉豆腐、六種小菜拼盤、生魚片*',
            }),
          ]),
        },
        [
          step('住宿 → 明治神宮（約 50 分鐘）', [
            ride('A', '本所吾妻橋', '淺草橋'), ride('JB', '淺草橋', '代代木'), ride('JY', '代代木', '原宿'),
          ]),
          step('明治神宮 → 代代木（約 3 分鐘）', [ride('C', '明治神宮前', '代代木公園')]),
          step('代代木 → 澀谷，*步行 1.3 km*'),
          step('澀谷 → 住宿（約 45 分鐘）', [ride('Z', '澀谷', '押上'), ride('A', '押上', '本所吾妻橋')]),
        ],
        [
          stop('明治神宮', 'spot', 35.6764, 139.6993),
          stop('365日', 'cafe', 35.6688, 139.6878, { note: '10 坪小店 60 種麵包，招牌*巧克力脆球麵包*' }),
          stop('代代木公園', 'spot', 35.6717, 139.6949),
          stop('LOST AND FOUND TOKYO STORE', 'shop', 35.6676, 139.6870, { note: '手工陶瓷、木製餐具選物店' }),
          stop('AKOMEYA TOKYO', 'shop', 35.6605, 139.7005, { note: '以「米」為靈魂的日式生活美學，招牌*高湯包、炊飯包*' }),
        ]),

      day('*根津美術館*庭園美學 → *六本木*精緻午餐 → *麻布台*手作工藝體驗',
        {
          breakfast: home(),
          lunch: meal('', [
            opt('Bricolage bread & co.', '六本木', 35.6596, 139.7287, {
              rating: 'Google 4.3', budget: '¥1,000–2,000',
              hours: '07:00–19:00', station: '距離六本木站 450 m',
            }),
          ], 0),
          dinner: meal('溫暖的家，或錦糸町備案', [
            opt('カレーリーブス', '錦糸町', 35.6975, 139.8121, {
              rating: 'tabelog 3.49', budget: '¥2,000–2,999', closed: '週二',
              hours: '17:30–21:30', station: '距離錦糸町站 287 m', note: '印度咖哩',
            }),
            opt('野口鮮魚店', '本所吾妻橋', 35.7075, 139.8030, {
              rating: 'tabelog 3.58', budget: '¥1,000–1,999', closed: '週三',
              hours: '11:30–14:00／16:00–18:30', station: '距離本所吾妻橋 260 m',
              note: '建議*外帶生魚片*回去吃！\n可以加購醋飯',
            }),
            opt('鳥貴族 錦糸町駅前店', '錦糸町', 35.6960, 139.8140, {
              rating: 'tabelog 3.03', budget: '¥2,000–2,999',
              hours: '17:00–04:00', station: '距離錦糸町站 112 m',
              note: '日本連鎖居酒屋，只推雞肉品項\n所有菜式 ¥390',
            }),
          ]),
        },
        [
          step('住宿 → 根津美術館（約 53 分鐘）', [ride('A', '本所吾妻橋', '日本橋'), ride('G', '日本橋', '表參道')]),
          step('根津美術館 → Bricolage bread & co.（*步行 1.2 km*）'),
          step('Bricolage bread & co. → 麻布台（約 18 分鐘）', [ride('H', '六本木', '神谷町')]),
          step('麻布台 → 住宿（約 44 分鐘）', [ride('H', '神谷町', '東銀座'), ride('A', '東銀座', '本所吾妻橋')]),
        ],
        [
          stop('根津美術館', 'spot', 35.6625, 139.7173, { note: '門票 ¥1600，隈研吾設計，秋日庭園' }),
          stop('Bricolage bread & co.', 'food', 35.6596, 139.7287, { hours: '07:00–19:00', note: '午餐' }),
          stop('麻布台ヒルズ', 'shop', 35.6604, 139.7404, {
            note: '*だし尾粂*：客製高湯包（等候一小時、最少 30 包）\n*Echiré*：費南雪\n*中村藤吉*：抹茶甜點',
          }),
        ]),

      day('*惠比壽・代官山・中目黑*文青設計巡禮 → 暖心雞湯關東煮晚餐',
        {
          breakfast: meal('溫暖的家，safn° サフン'),
          lunch: meal('或回家吃（溫暖的家）', [
            opt('豆富食堂', '惠比壽', 35.6460, 139.7094, {
              rating: 'tabelog 3.49', budget: '¥1,000–1,999',
              hours: '11:30–14:30', station: '距離惠比壽站 210 m',
              note: '豆類料理，*建議預約*\n豆腐午餐 ¥1540／雞肉拉麵 ¥1100',
              link: 'https://yoyaku.toreta.in/tofushokudo/#/',
            }),
            opt('medel deli', '惠比壽', 35.6478, 139.7088, {
              rating: 'tabelog 3.44', budget: '¥2,000–2,999',
              hours: '09:00–19:00', station: '距離惠比壽站 260 m',
              note: '輕食，頗受惠比壽女性上班族喜愛\n奶昔、輕食碗、芽菜漢堡、鬆餅',
            }),
            opt('恵比寿土鍋炊', '惠比壽', 35.6470, 139.7105, {
              rating: 'tabelog 3.44', budget: '～¥999',
              hours: '11:00–22:30', station: '距離惠比壽站 130 m',
              note: '家常日式定食，*午間套餐便宜*（約 ¥1,000–1,200）',
            }),
            opt('AFURI 惠比壽', '惠比壽', 35.6476, 139.7098, {
              rating: 'tabelog 3.49', budget: '¥1,000–1,999',
              hours: '11:00–05:00', station: '距離惠比壽站 220 m',
              note: '清爽的*柚子拉麵*！\n但是偏貴喔',
            }),
          ]),
          dinner: meal('', [
            opt('鶏だしおでん さもん', '中目黑', 35.6430, 139.6993, {
              rating: 'Google 4.0', budget: '¥2,000–3,000',
              hours: '16:00–02:00', station: '距離中目黑站 200 m',
            }),
          ], 0),
        },
        [
          step('住宿 → 惠比壽（約 51 分鐘）', [ride('A', '本所吾妻橋', '東銀座'), ride('H', '東銀座', '惠比壽')]),
          step('惠比壽 → 代官山 → 中目黑 *步行*'),
          step('中目黑 → 住宿（約 53 分鐘）', [ride('H', '中目黑', '東銀座'), ride('A', '東銀座', '本所吾妻橋')]),
        ],
        [
          stop('猿田彦珈琲 恵比寿本店', 'cafe', 35.6480, 139.7115),
          stop('Forestgate 代官山', 'shop', 35.6488, 139.7031),
          stop('豆虎 中目黒焙煎所', 'cafe', 35.6442, 139.6985, { note: '買咖啡豆，吃冰淇淋' }),
          stop('鶏だしおでん さもん', 'food', 35.6430, 139.6993, { hours: '16:00–02:00', note: '晚餐' }),
        ]),

      day('*日本橋*歷史街區深度體驗 → *銀座*精品街區優雅漫遊',
        {
          breakfast: home(),
          lunch: meal('', [
            opt('五代目 花山うどん 日本橋店', '日本橋', 35.6812, 139.7740, {
              rating: 'tabelog 3.59', budget: '¥1,000–1,999',
              hours: '11:00–16:00', station: '距離日本橋站 120 m',
              note: '烏龍寬麵\n*排隊排爆*（應該）',
            }),
            opt('京都石塀小路豆ちゃ 日本橋', '日本橋', 35.6822, 139.7737, {
              rating: 'tabelog 3.37', budget: '¥1,000–1,999',
              hours: '11:00–15:00', station: '距離日本橋站 35 m',
              note: '日式套餐，均價 ¥1400\n新鮮健康',
            }),
          ]),
          dinner: meal('', [
            opt('根室花まる KITTE丸の内店', '東京站', 35.6795, 139.7648, {
              rating: 'tabelog 3.55', budget: '¥2,000–2,999',
              hours: '11:00–23:00', station: '距離東京站 279 m',
              note: '店外自助機台取號，額滿即止\n*建議 16:00 取號*，約等 2 小時\n必點：花咲蟹味噌湯、鱈魚頭三平湯、兩層生扇貝',
              link: 'https://www.bigfang.tw/blog/post/sushi-hanamaru-kitte-tokyo',
            }),
            opt('辻半 日本橋本店', '日本橋', 35.6830, 139.7745, {
              rating: 'tabelog 3.61', budget: '¥1,000–1,999',
              hours: '10:00–21:30', station: '距離日本橋 314 m',
              note: '*只能付現*\n東京第一名的海鮮丼\n如果也排不到就吃便利商店吧…',
            }),
          ], 0),
        },
        [
          step('住宿 → 小網神社（約 22 分鐘）', [ride('A', '本所吾妻橋', '人形町')]),
          step('小網神社 → IPPUKU&MATCHA（*步行 15 分鐘*）'),
          step('五代目 花山烏冬 → BONGEN COFFEE（約 12 分鐘）', [ride('A', '日本橋', '東銀座')]),
          step('日本橋 → 住宿（約 31 分鐘）', [ride('A', '日本橋', '本所吾妻橋')]),
        ],
        [
          stop('小網神社', 'spot', 35.6835, 139.7792),
          stop('IPPUKU&MATCHA', 'cafe', 35.6862, 139.7733),
          stop('BONGEN COFFEE Tokyo Ginza', 'cafe', 35.6705, 139.7702, { hours: '10:00–17:00' }),
          stop('銀座 伊東屋 本店', 'shop', 35.6718, 139.7668, { hours: '10:00–20:00', note: '12 層樓精品文具' }),
          stop('東京 SKY BUS（15:30 發車）', 'transit', 35.6800, 139.7635, { note: '東京鐵塔・彩虹大橋路線，已預約 2 位' }),
          stop('根室花まる KITTE丸の内店', 'food', 35.6795, 139.7648, { note: '晚餐，建議 16:00 先取號' }),
        ]),

      day('成田機場溫馨送別，滿載東京秋日美好回憶歸家',
        { breakfast: home(), lunch: meal('機上簡餐'), dinner: meal('') },
        [
          step('住宿 → 成田機場（約 1 小時 16 分）', [ride('A', '本所吾妻橋', '機場第二航廈')]),
          step('成田 13:25 → 桃園 16:05（長榮航空 BR183）'),
        ],
        [reve(), stop('成田機場', 'transit', 35.7720, 140.3929)]),
    ],
  };
};
