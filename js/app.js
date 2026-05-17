(() => {
  const device = document.getElementById('device');
  const tabs = Array.from(document.querySelectorAll('.tab'));
  const pages = Array.from(document.querySelectorAll('.page'));
  const roots = Array.from(document.querySelectorAll('.root'));
  const rootBtns = Array.from(document.querySelectorAll('.bottom-nav .bn[data-root]'));
  const feed = document.getElementById('feed');
  const sheetMask = document.getElementById('sheet-mask');
  const sheetComments = document.getElementById('sheet-comments');
  const barsFrame = document.querySelector('.bars-item .bars-frame');
  const barsItem = document.querySelector('.bars-item');
  const douyinFrame = document.querySelector('.douyin-item .douyin-frame');
  const douyinItem = document.querySelector('.douyin-item');
  const douyinGesture = document.querySelector('.douyin-item .douyin-gesture-layer');
  const douyinAB = document.querySelector('.douyin-item .douyin-ab');

  // douyin 卡片当前页（0=A，1=B），用于外层手势/点按控制
  let douyinPage = 0;
  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }
  function setDouyinPage(next, opts) {
    douyinPage = clamp(Number(next) || 0, 0, 1);
    // 优先：同源时直接操控 iframe 内的 pager（比 postMessage 更稳，iOS 上也更可靠）
    let controlled = false;
    try {
      const win = douyinFrame?.contentWindow;
      const doc = douyinFrame?.contentDocument || win?.document;
      const pager = doc?.getElementById?.('pager');
      if (pager && typeof pager.scrollTo === 'function') {
        const w = Math.max(1, pager.clientWidth || doc.documentElement.clientWidth || 1);
        pager.scrollTo({ left: douyinPage * w, behavior: 'auto' });
        controlled = true;
      }
    } catch (_) {
      // ignore cross-origin / access errors
    }
    // 兜底：postMessage 通知 iframe 自己切页
    if (!controlled) {
      try {
        douyinFrame?.contentWindow?.postMessage({ type: 'douyin-page', index: douyinPage }, '*');
      } catch (_) {}
      // 再兜底：hash（不依赖 message）
      try {
        if (douyinFrame?.contentWindow) {
          douyinFrame.contentWindow.location.hash = douyinPage === 0 ? '#a' : '#b';
        }
      } catch (_) {}
    }
    if (!opts?.skipUi) {
      const action = douyinPage === 0 ? 'douyin-page-a' : 'douyin-page-b';
      douyinAB?.querySelectorAll?.('.dab-btn')?.forEach((b) => {
        b.classList.toggle('is-active', b.getAttribute('data-action') === action);
      });
    }
  }

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

      if (action === 'douyin-page-a' || action === 'douyin-page-b') {
        e.preventDefault();
        e.stopPropagation();
        setDouyinPage(action === 'douyin-page-a' ? 0 : 1);
        return;
      }

      if (action === 'close-sheet') {
        closeComments();
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

    // 双击点赞（仿抖音）：在推荐流里双击内容区域触发
    let lastTapAt = 0;
    let lastTapX = 0;
    let lastTapY = 0;
    feed?.addEventListener('pointerup', (e) => {
      // 抽屉打开时不处理
      if (sheetComments?.classList?.contains('is-active')) return;
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

    // douyin 展示卡片入场：每次刷到都重置并播放更“商业”的动态入场
    if (douyinItem && douyinFrame && 'IntersectionObserver' in window) {
      let visible2 = false;
      const io2 = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (!entry) return;
          const nowVisible = entry.isIntersecting && entry.intersectionRatio >= 0.62;
          if (nowVisible && !visible2) {
            visible2 = true;
            // 每次刷到这一条，先回到 A 页（保证体验一致）
            setDouyinPage(0);
            // “呼之欲出”入场：触发一次动画类名
            try {
              douyinItem.classList.remove('is-peek');
              // 强制 reflow，确保重复触发
              void douyinItem.offsetWidth;
              douyinItem.classList.add('is-peek');
              window.setTimeout(() => douyinItem.classList.remove('is-peek'), 920);
            } catch (_) {}
            try {
              douyinFrame.contentWindow?.postMessage({ type: 'douyin-intro', mode: 'reset' }, '*');
            } catch (_) {
              // ignore
            }
          } else if (!nowVisible && visible2) {
            visible2 = false;
          }
        },
        { threshold: [0, 0.35, 0.62, 0.85, 1] }
      );
      io2.observe(douyinItem);
    }

    // 确保 iframe 加载完成后立刻对齐到当前页（避免 iOS 延迟加载导致第一次切页不生效）
    douyinFrame?.addEventListener?.('load', () => {
      try {
        setDouyinPage(douyinPage, { skipUi: true });
      } catch (_) {}
    });

    // douyin 手势：解决 iframe 吃掉上下刷的问题
    // - 竖向：不 preventDefault，让外层 feed 正常滚动
    // - 横向：在手势层识别后，阻止外层抖动并通过 postMessage 让 iframe 切 A/B
    if (douyinGesture && douyinFrame) {
      let sx = 0;
      let sy = 0;
      let st = 0;
      let tracking = false;
      let axis = null; // null | 'h' | 'v'
      let dx = 0;
      let dy = 0;
      let feedLock = false;
      let feedPrevOverflow = '';

      douyinGesture.addEventListener(
        'pointerdown',
        (e) => {
          if (e.isPrimary === false) return;
          tracking = true;
          axis = null;
          sx = e.clientX;
          sy = e.clientY;
          st = performance.now();
          dx = 0;
          dy = 0;
        },
        { passive: true }
      );

      douyinGesture.addEventListener(
        'pointermove',
        (e) => {
          if (!tracking) return;
          dx = e.clientX - sx;
          dy = e.clientY - sy;
          if (axis === null) {
            const ax = Math.abs(dx);
            const ay = Math.abs(dy);
            // iOS 上手指横滑会带一点纵向噪声：放宽横向判定
            if (ax > 6 && ax > ay * 1.05) axis = 'h';
            else if (ay > 10 && ay > ax * 1.2) axis = 'v';
          }
          if (axis === 'h') {
            // 一旦判定横向，锁住外层竖向滚动，避免 iOS 把手势交给滚动容器导致横滑失效
            if (!feedLock && feed) {
              feedLock = true;
              feedPrevOverflow = feed.style.overflowY || '';
              feed.style.overflowY = 'hidden';
            }
            // 横向翻页：阻止外层滚动抖动
            try {
              e.preventDefault();
            } catch (_) {}
          }
        },
        { passive: false }
      );

      douyinGesture.addEventListener(
        'pointerup',
        (e) => {
          if (!tracking) return;
          tracking = false;
          if (feedLock && feed) {
            feed.style.overflowY = feedPrevOverflow;
            feedLock = false;
          }
          const dt = Math.max(1, performance.now() - st);
          const vx = dx / dt; // px/ms
          // 允许在 axis 未判定成功时，仍然用最终位移判断
          const horizontalEnough = Math.abs(dx) > Math.abs(dy) * 0.9;
          if (!(axis === 'h' || horizontalEnough)) return;

          // 轻轻一滑即可切页：降低位移阈值，同时降低速度阈值
          // （遵循 RN 手势体验：更偏“意图识别”，而不是必须大幅拖动）
          const threshold = 16;
          const fastFlick = Math.abs(vx) > 0.28 && Math.abs(dx) > 8;
          if (Math.abs(dx) < threshold && !fastFlick) return;
          const delta = dx < 0 ? 1 : -1;
          setDouyinPage(douyinPage + delta);
        },
        { passive: true }
      );
      douyinGesture.addEventListener('pointercancel', () => (tracking = false), { passive: true });

      // iOS/Safari 下 pointer 事件偶发不稳定：再补一套 touch 事件（与 RN 手势仲裁类似）
      let tsx = 0;
      let tsy = 0;
      let tst = 0;
      let tdx = 0;
      let tdy = 0;
      let taxis = null;
      let tTracking = false;

      douyinGesture.addEventListener(
        'touchstart',
        (e) => {
          const t = e.touches?.[0];
          if (!t) return;
          tTracking = true;
          taxis = null;
          tsx = t.clientX;
          tsy = t.clientY;
          tst = performance.now();
          tdx = 0;
          tdy = 0;
        },
        { passive: true }
      );

      douyinGesture.addEventListener(
        'touchmove',
        (e) => {
          if (!tTracking) return;
          const t = e.touches?.[0];
          if (!t) return;
          tdx = t.clientX - tsx;
          tdy = t.clientY - tsy;
          if (taxis === null) {
            const ax = Math.abs(tdx);
            const ay = Math.abs(tdy);
            if (ax > 6 && ax > ay * 1.05) taxis = 'h';
            else if (ay > 10 && ay > ax * 1.2) taxis = 'v';
          }
          if (taxis === 'h') {
            if (!feedLock && feed) {
              feedLock = true;
              feedPrevOverflow = feed.style.overflowY || '';
              feed.style.overflowY = 'hidden';
            }
            // 横向：阻止外层滚动抖动
            e.preventDefault();
            e.stopPropagation();
          }
        },
        { passive: false }
      );

      douyinGesture.addEventListener(
        'touchend',
        () => {
          if (!tTracking) return;
          tTracking = false;
          if (feedLock && feed) {
            feed.style.overflowY = feedPrevOverflow;
            feedLock = false;
          }
          const dt = Math.max(1, performance.now() - tst);
          const vx = tdx / dt;
          const horizontalEnough = Math.abs(tdx) > Math.abs(tdy) * 0.9;
          if (!(taxis === 'h' || horizontalEnough)) return;

          const threshold = 16;
          const fastFlick = Math.abs(vx) > 0.28 && Math.abs(tdx) > 8;
          if (Math.abs(tdx) < threshold && !fastFlick) return;
          const delta = tdx < 0 ? 1 : -1;
          setDouyinPage(douyinPage + delta);
        },
        { passive: true }
      );

      // 点按切换：点击（几乎不移动）即可 A/B 互切
      let tapStartX = 0;
      let tapStartY = 0;
      let tapStartT = 0;
      douyinGesture.addEventListener(
        'touchstart',
        (e) => {
          const t = e.touches?.[0];
          if (!t) return;
          tapStartX = t.clientX;
          tapStartY = t.clientY;
          tapStartT = performance.now();
        },
        { passive: true }
      );
      douyinGesture.addEventListener(
        'touchend',
        (e) => {
          const t = e.changedTouches?.[0];
          if (!t) return;
          const dx0 = t.clientX - tapStartX;
          const dy0 = t.clientY - tapStartY;
          const dt0 = performance.now() - tapStartT;
          // 很小的移动 + 较短时间 -> 认为是 tap
          if (dt0 > 320) return;
          if (Math.abs(dx0) > 10 || Math.abs(dy0) > 10) return;
          setDouyinPage(1 - douyinPage);
        },
        { passive: true }
      );
    }

    // 解决：进入 douyin iframe 后无法上拉/下拽切换下一条
    // iframe 会吞掉竖向手势，因此让 iframe 通过 postMessage 请求外层滚动
    window.addEventListener('message', (ev) => {
      const data = ev?.data;
      if (!data || data.type !== 'feed-swipe') return;
      if (!douyinFrame || ev.source !== douyinFrame.contentWindow) return;
      if (!feed) return;
      if (sheetComments?.classList?.contains('is-active')) return;
      if (currentRoot !== 'home' || currentTab !== 'recommend') return;

      // 快滑：直接跳到上一条/下一条并吸附
      const h = Math.max(1, feed.clientHeight);
      const items = Array.from(feed.querySelectorAll('.feed-item'));
      if (!items.length) return;
      const idx = Math.round(feed.scrollTop / h);
      const next = data.dir === 'up' ? idx + 1 : idx - 1;
      const clamped = Math.max(0, Math.min(items.length - 1, next));
      feed.scrollTo({ top: clamped * h, behavior: 'smooth' });
    });

    // 左右滑动切换栏目（更像抖音“滑动切页”的手感）
    let startX = 0;
    let startY = 0;
    let tracking = false;

    function onPointerDown(e) {
      // 仅主指针，避免多指干扰
      if (e.isPrimary === false) return;
      // 在 douyin 手势层上滑动时，不触发“左右切顶部栏目”
      if (e.target?.closest?.('.douyin-gesture-layer')) return;
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
      // 在 douyin 手势层上滑动时，不触发“左右切顶部栏目”
      if (e.target?.closest?.('.douyin-gesture-layer')) return;
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
