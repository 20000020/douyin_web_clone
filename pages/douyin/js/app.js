(() => {
  const device = document.getElementById('device');
  const tabs = Array.from(document.querySelectorAll('.tab'));
  const pages = Array.from(document.querySelectorAll('.page'));
  const roots = Array.from(document.querySelectorAll('.root'));
  const rootBtns = Array.from(document.querySelectorAll('.bottom-nav .bn[data-root]'));
  const feed = document.getElementById('feed');
  const sheetMask = document.getElementById('sheet-mask');
  const sheetComments = document.getElementById('sheet-comments');
  const magicMask = document.getElementById('magic-mask');
  const sheetMagic = document.getElementById('sheet-magic');
  const magicStatus = document.getElementById('magic-status');
  const magicCity = document.getElementById('magic-city');
  const magicRun = document.getElementById('magic-run');
  const magicCopy = document.getElementById('magic-copy');
  const magicErr = document.getElementById('magic-error');
  const magicWeather = document.getElementById('magic-weather');
  const magicAi = document.getElementById('magic-ai');
  const mwTime = document.getElementById('mw-time');
  const mwSunrise = document.getElementById('mw-sunrise');
  const mwSunset = document.getElementById('mw-sunset');
  const mwCond = document.getElementById('mw-cond');
  const mwTemp = document.getElementById('mw-temp');
  const mwHumi = document.getElementById('mw-humi');
  const magicAiText = document.getElementById('magic-ai-text');

  // inline（直接在抖音卡片里输入/展示）
  const magicCityInline = document.getElementById('magic-city-inline');
  const magicRunInline = document.getElementById('magic-run-inline');
  const magicCopyInline = document.getElementById('magic-inline-copy');
  const magicErrInline = document.getElementById('magic-inline-error');
  const magicWeatherInline = document.getElementById('magic-inline-weather');
  const magicAiInline = document.getElementById('magic-inline-ai');
  const mwTimeInline = document.getElementById('mw-time-inline');
  const mwSunriseInline = document.getElementById('mw-sunrise-inline');
  const mwSunsetInline = document.getElementById('mw-sunset-inline');
  const mwCondInline = document.getElementById('mw-cond-inline');
  const mwTempInline = document.getElementById('mw-temp-inline');
  const mwHumiInline = document.getElementById('mw-humi-inline');
  const magicAiTextInline = document.getElementById('magic-inline-ai-text');
  const barsFrame = document.querySelector('.bars-item .bars-frame');
  const barsItem = document.querySelector('.bars-item');

  const BASE_W = 390;
  const BASE_H = 844;
  const TAB_ORDER = ['live', 'shanghai', 'follow', 'recommend'];
  let currentTab = 'recommend';
  let currentRoot = 'home';

  function setActiveTab(tabId) {
    currentTab = tabId;
    tabs.forEach((btn) => btn.classList.toggle('is-active', btn.dataset.tab === tabId));
    pages.forEach((p) => p.classList.toggle('is-active', p.dataset.page === tabId));
  }

  function setActiveRoot(rootId) {
    currentRoot = rootId;
    roots.forEach((r) => r.classList.toggle('is-active', r.dataset.root === rootId));
    rootBtns.forEach((b) => b.classList.toggle('is-active', b.dataset.root === rootId));
  }

  function openComments() {
    if (!sheetMask || !sheetComments) return;
    sheetMask.classList.add('is-active');
    sheetComments.classList.add('is-active');
    sheetMask.setAttribute('aria-hidden', 'false');
    sheetComments.setAttribute('aria-hidden', 'false');
  }

  function closeComments() {
    if (!sheetMask || !sheetComments) return;
    sheetMask.classList.remove('is-active');
    sheetComments.classList.remove('is-active');
    sheetMask.setAttribute('aria-hidden', 'true');
    sheetComments.setAttribute('aria-hidden', 'true');
  }

  function openMagic() {
    if (!magicMask || !sheetMagic) return;
    // 避免两个抽屉叠在一起
    closeComments();
    magicMask.classList.add('is-active');
    sheetMagic.classList.add('is-active');
    magicMask.setAttribute('aria-hidden', 'false');
    sheetMagic.setAttribute('aria-hidden', 'false');
    window.setTimeout(() => magicCity?.focus?.(), 30);
  }

  function closeMagic() {
    if (!magicMask || !sheetMagic) return;
    magicMask.classList.remove('is-active');
    sheetMagic.classList.remove('is-active');
    magicMask.setAttribute('aria-hidden', 'true');
    sheetMagic.setAttribute('aria-hidden', 'true');
    if (magicStatus) magicStatus.textContent = '输入城市生成调色建议';
    if (magicRun) magicRun.removeAttribute('disabled');
  }

  function setMagicError(msg) {
    const targets = [magicErr, magicErrInline].filter(Boolean);
    targets.forEach((el) => {
      if (!el) return;
      if (!msg) {
        el.classList.add('is-hidden');
        el.textContent = '';
        return;
      }
      el.classList.remove('is-hidden');
      el.textContent = msg;
    });
  }

  function setMagicLoading(isLoading) {
    const btns = [magicRun, magicRunInline].filter(Boolean);
    btns.forEach((btn) => {
      if (!btn) return;
      if (isLoading) {
        btn.setAttribute('disabled', 'true');
        btn.textContent = '生成中…';
      } else {
        btn.removeAttribute('disabled');
        btn.textContent = '生成';
      }
    });
    if (magicStatus) magicStatus.textContent = isLoading ? '正在生成，请稍等…' : '输入城市生成调色建议';
  }

  function fillWeatherTo(set, w) {
    if (!set || !w) return;
    set.mwTime && (set.mwTime.textContent = w.time || '—');
    set.mwSunrise && (set.mwSunrise.textContent = w.tomorrow_sunrise || '—');
    set.mwSunset && (set.mwSunset.textContent = w.sunset || '—');
    set.mwCond && (set.mwCond.textContent = w.condition || '—');
    set.mwTemp && (set.mwTemp.textContent = (w.temperature != null ? `${w.temperature}°C` : '—'));
    set.mwHumi && (set.mwHumi.textContent = (w.humidity != null ? `${w.humidity}%` : '—'));
  }

  function _getCityValue() {
    const v1 = (magicCityInline?.value || '').trim();
    if (v1) return v1;
    return (magicCity?.value || '').trim();
  }

  async function runMagic() {
    const city = _getCityValue();
    if (!city) {
      setMagicError('请输入城市名（中文），例如：上海 / 北京 / 深圳。');
      return;
    }
    setMagicError('');
    setMagicLoading(true);
    magicWeather?.classList?.add('is-hidden');
    magicAi?.classList?.add('is-hidden');
    magicWeatherInline?.classList?.add('is-hidden');
    magicAiInline?.classList?.add('is-hidden');

    try {
      const url = `/api/magic?city=${encodeURIComponent(city)}`;
      const res = await fetch(url, { method: 'GET' });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error || '生成失败');

      const payload = data.data || {};
      const weather = payload.weather || {};
      const ai = payload.ai || '';

      fillWeatherTo({ mwTime, mwSunrise, mwSunset, mwCond, mwTemp, mwHumi }, weather);
      fillWeatherTo(
        {
          mwTime: mwTimeInline,
          mwSunrise: mwSunriseInline,
          mwSunset: mwSunsetInline,
          mwCond: mwCondInline,
          mwTemp: mwTempInline,
          mwHumi: mwHumiInline,
        },
        weather
      );
      if (magicWeather) magicWeather.classList.remove('is-hidden');
      if (magicWeatherInline) magicWeatherInline.classList.remove('is-hidden');

      if (magicAiText) magicAiText.textContent = ai || '（模型返回为空）';
      if (magicAi) magicAi.classList.remove('is-hidden');
      if (magicAiTextInline) magicAiTextInline.textContent = ai || '（模型返回为空）';
      if (magicAiInline) magicAiInline.classList.remove('is-hidden');

      if (magicStatus) magicStatus.textContent = `已生成：${payload.city || city}`;
      setMagicLoading(false);
    } catch (e) {
      setMagicLoading(false);
      setMagicError(`出错了：${e?.message || e}`);
    }
  }

  async function copyMagic(fromInline = false) {
    const text = (fromInline ? (magicAiTextInline?.textContent || '') : (magicAiText?.textContent || '')).trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      const btn = fromInline ? magicCopyInline : magicCopy;
      if (btn) {
        const old = btn.textContent;
        btn.textContent = '已复制';
        window.setTimeout(() => (btn.textContent = old), 900);
      }
    } catch (e) {
      setMagicError('复制失败：浏览器未授权剪贴板权限，请手动全选复制。');
    }
  }

  function toggleLike(likeEl) {
    if (!likeEl) return;
    likeEl.classList.toggle('is-liked');
  }

  function spawnHeart(itemEl, clientX, clientY) {
    if (!itemEl) return;
    const rect = itemEl.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const heart = document.createElement('div');
    heart.className = 'tap-heart';
    heart.style.left = `${x}px`;
    heart.style.top = `${y}px`;
    itemEl.appendChild(heart);
    window.setTimeout(() => {
      if (heart.parentNode) heart.parentNode.removeChild(heart);
    }, 820);
  }

  function fitDevice() {
    if (!device) return;
    // 预留 stage padding（16px * 2）
    const availW = Math.max(1, window.innerWidth - 32);
    const availH = Math.max(1, window.innerHeight - 32);
    const scale = Math.min(availW / BASE_W, availH / BASE_H, 1);
    device.style.transform = `scale(${scale.toFixed(4)})`;
  }

  function bind() {
    tabs.forEach((btn) => {
      btn.addEventListener('click', () => {
        // 顶部栏目只在“首页”根页面可用
        if (currentRoot !== 'home') return;
        setActiveTab(btn.dataset.tab);
      });
    });

    rootBtns.forEach((btn) => {
      btn.addEventListener('click', () => setActiveRoot(btn.dataset.root));
    });

    // 事件委托：右侧交互区 & 抽屉
    device?.addEventListener('click', (e) => {
      const target = e.target?.closest?.('[data-action]');
      if (!target) return;
      const action = target.getAttribute('data-action');
      if (!action) return;

      if (action === 'close-sheet') {
        closeComments();
        return;
      }

      if (action === 'magic-open') {
        e.preventDefault();
        e.stopPropagation();
        openMagic();
        return;
      }

      if (action === 'close-magic') {
        e.preventDefault();
        e.stopPropagation();
        closeMagic();
        return;
      }

      if (action === 'magic-run') {
        e.preventDefault();
        e.stopPropagation();
        runMagic();
        return;
      }

      if (action === 'magic-copy') {
        e.preventDefault();
        e.stopPropagation();
        copyMagic();
        return;
      }

      if (action === 'magic-run-inline') {
        e.preventDefault();
        e.stopPropagation();
        runMagic();
        return;
      }

      if (action === 'magic-copy-inline') {
        e.preventDefault();
        e.stopPropagation();
        copyMagic(true);
        return;
      }

      if (action === 'comment') {
        e.preventDefault();
        e.stopPropagation();
        openComments();
        return;
      }

      if (action === 'like') {
        e.preventDefault();
        e.stopPropagation();
        toggleLike(target);
        return;
      }

      if (action === 'collect') {
        e.preventDefault();
        e.stopPropagation();
        target.classList.toggle('is-collected');
        return;
      }
    });

    sheetMask?.addEventListener('click', () => closeComments());
    magicMask?.addEventListener('click', () => closeMagic());

    // 双击点赞（仿抖音）：在推荐流里双击内容区域触发
    let lastTapAt = 0;
    let lastTapX = 0;
    let lastTapY = 0;
    feed?.addEventListener('pointerup', (e) => {
      // 抽屉打开时不处理
      if (sheetComments?.classList?.contains('is-active')) return;
      if (sheetMagic?.classList?.contains('is-active')) return;
      if (currentRoot !== 'home' || currentTab !== 'recommend') return;

      const item = e.target?.closest?.('.feed-item');
      if (!item) return;

      // 点在按钮上不算（避免误触）
      if (e.target?.closest?.('[data-action]')) return;

      const now = Date.now();
      const dx = Math.abs(e.clientX - lastTapX);
      const dy = Math.abs(e.clientY - lastTapY);
      const isDouble = now - lastTapAt < 280 && dx < 26 && dy < 26;

      lastTapAt = now;
      lastTapX = e.clientX;
      lastTapY = e.clientY;

      if (!isDouble) return;

      spawnHeart(item, e.clientX, e.clientY);
      const likeEl = item.querySelector('.ra-like');
      if (likeEl && !likeEl.classList.contains('is-liked')) {
        toggleLike(likeEl);
      }
    });

    // bars 卡片入场：每次刷到这一条，都重置并播放 bars.html 的“定位 → 圆圈浮动入场 → 抽屉上拉”
    if (barsItem && barsFrame && 'IntersectionObserver' in window) {
      let visible = false;
      const io = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (!entry) return;
          const nowVisible = entry.isIntersecting && entry.intersectionRatio >= 0.62;
          if (nowVisible && !visible) {
            visible = true;
            try {
              barsFrame.contentWindow?.postMessage({ type: 'bars-intro', mode: 'reset' }, '*');
            } catch (_) {
              // ignore
            }
          } else if (!nowVisible && visible) {
            visible = false;
          }
        },
        { threshold: [0, 0.35, 0.62, 0.85, 1] }
      );
      io.observe(barsItem);
    }

    // 左右滑动切换栏目（更像抖音“滑动切页”的手感）
    let startX = 0;
    let startY = 0;
    let tracking = false;

    function onPointerDown(e) {
      // 仅主指针，避免多指干扰
      if (e.isPrimary === false) return;
      tracking = true;
      startX = e.clientX;
      startY = e.clientY;
      try {
        device?.setPointerCapture?.(e.pointerId);
      } catch (_) {
        // ignore
      }
    }

    function onPointerUp(e) {
      if (!tracking) return;
      tracking = false;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const threshold = 44; // 触发距离（px）

      if (currentRoot !== 'home') return;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) {
        const idx = TAB_ORDER.indexOf(currentTab);
        if (idx === -1) return;
        const nextIdx = dx < 0 ? idx + 1 : idx - 1; // 左滑→下一个；右滑→上一个
        const clamped = Math.max(0, Math.min(TAB_ORDER.length - 1, nextIdx));
        if (clamped !== idx) setActiveTab(TAB_ORDER[clamped]);
      }
    }

    device?.addEventListener('pointerdown', onPointerDown);
    device?.addEventListener('pointerup', onPointerUp);
    device?.addEventListener('pointercancel', () => (tracking = false));

    window.addEventListener('resize', fitDevice);
    window.addEventListener('orientationchange', fitDevice);

    // 避免双击缩放导致“1:1”不稳定（不影响辅助功能）
    let lastTouchEnd = 0;
    document.addEventListener(
      'touchend',
      (e) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 260) e.preventDefault();
        lastTouchEnd = now;
      },
      { passive: false }
    );
  }

  function init() {
    bind();
    fitDevice();
    setActiveRoot('home');
    setActiveTab('recommend');
    closeComments();
    closeMagic();
  }

  // 全局兜底：避免白屏
  try {
    init();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);
    const fallback = document.createElement('div');
    fallback.style.cssText =
      'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#060b1b;color:#eaf4ff;font-size:16px;padding:24px;text-align:center;z-index:9999;';
    fallback.textContent = '哎呀，页面出错了，请刷新重试。';
    document.body.innerHTML = '';
    document.body.appendChild(fallback);
  }
})();
