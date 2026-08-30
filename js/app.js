// 風自然訂房網分數查詢 - 前端
// 讀取 data/metadata.json，渲染兩館 × 三家訂房網站的分數截圖

(function () {
  const META_URL = 'data/metadata.json';
  const BRAND_COLORS = {
    booking: '#003580',
    agoda: '#0c4258',
    trip: '#173CD2'
  };

  const app = document.getElementById('app');
  const updatedLabel = document.getElementById('updated-label');

  async function load() {
    try {
      const res = await fetch(META_URL, { cache: 'no-cache' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      render(data);
    } catch (e) {
      app.innerHTML = '';
      const el = document.createElement('div');
      el.className = 'error';
      el.textContent = '無法載入分數資料，請稍後再試。 (' + (e.message || '') + ')';
      app.appendChild(el);
    }
  }

  function render(data) {
    app.innerHTML = '';
    if (data.generatedAt) {
      updatedLabel.textContent = '資料更新時間：' + data.generatedAt;
    }
    (data.hotels || []).forEach(hotel => app.appendChild(buildHotelCard(hotel)));
  }

  function buildHotelCard(hotel) {
    const card = document.createElement('section');
    card.className = 'hotel-card';
    card.dataset.hotel = hotel.id;

    const head = document.createElement('div');
    head.className = 'card-head';
    const badge = document.createElement('div');
    badge.className = 'badge';
    badge.textContent = hotel.alias || hotel.id;
    const h2 = document.createElement('h2');
    h2.textContent = `${hotel.name}（${hotel.alias || ''}）`;
    head.appendChild(badge);
    head.appendChild(h2);
    card.appendChild(head);

    const body = document.createElement('div');
    body.className = 'card-body';
    const order = ['booking', 'agoda', 'trip'];
    order.forEach(key => {
      const src = hotel.sources && hotel.sources[key];
      if (!src) return;
      body.appendChild(buildSourceBlock(hotel, key, src));
    });
    card.appendChild(body);
    return card;
  }

  function buildSourceBlock(hotel, key, src) {
    const a = document.createElement('a');
    a.className = 'source-block' + (src.available ? '' : ' broken');
    a.href = src.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.setAttribute('aria-label', src.label + '（' + hotel.name + '）點擊前往');

    const head = document.createElement('div');
    head.className = 'source-head';
    const name = document.createElement('div');
    name.className = 'site-name';
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.background = BRAND_COLORS[key] || '#999';
    name.appendChild(dot);
    name.appendChild(document.createTextNode(src.label || key));
    const time = document.createElement('span');
    time.className = 'time';
    time.textContent = src.updatedAt || '';
    head.appendChild(name);
    head.appendChild(time);

    const wrap = document.createElement('div');
    wrap.className = 'img-wrap';
    if (src.available && src.image) {
      const img = document.createElement('img');
      img.src = src.image;
      img.alt = src.label + ' 分數';
      img.loading = 'lazy';
      wrap.appendChild(img);
    } else {
      const m = document.createElement('div');
      m.className = 'missing';
      m.textContent = '暫無分數截圖';
      wrap.appendChild(m);
    }

    const hint = document.createElement('div');
    hint.className = 'open-hint';
    hint.textContent = '前往 ' + src.label + ' ↗';

    a.appendChild(head);
    a.appendChild(wrap);
    a.appendChild(hint);
    return a;
  }

  load();
})();
