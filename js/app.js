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
    // UI：已移除外层 A/B 按钮，仅保留卡片内部原生横滑切换
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

    // 视频流：用本地 mp4 填充空卡片
    // - 避免重复/空白：进入视口才挂载 src 并播放
    // - 圆圈封面：若没有提供图片，则自动截取视频第一帧作为头像背景
    if ('IntersectionObserver' in window) {
      const thumbCache = new Map(); // src -> dataURL

      function captureFirstFrame(src) {
        if (!src) return Promise.resolve('');
        if (thumbCache.has(src)) return Promise.resolve(thumbCache.get(src));
        return new Promise((resolve) => {
          try {
            const v = document.createElement('video');
            v.muted = true;
            v.playsInline = true;
            v.preload = 'auto';
            v.src = src;

            const cleanup = () => {
              try { v.removeAttribute('src'); v.load(); } catch (_) {}
            };

            v.addEventListener(
              'loadeddata',
              () => {
                try {
                  const w = Math.max(2, v.videoWidth || 0);
                  const h = Math.max(2, v.videoHeight || 0);
                  const canvas = document.createElement('canvas');
                  canvas.width = w;
                  canvas.height = h;
                  const ctx = canvas.getContext('2d');
                  if (!ctx) throw new Error('no ctx');
                  ctx.drawImage(v, 0, 0, w, h);
                  const url = canvas.toDataURL('image/jpeg', 0.82);
                  thumbCache.set(src, url);
                  cleanup();
                  resolve(url);
                } catch (_) {
                  cleanup();
                  resolve('');
                }
              },
              { once: true }
            );
            v.addEventListener(
              'error',
              () => {
                cleanup();
                resolve('');
              },
              { once: true }
            );
          } catch (_) {
            resolve('');
          }
        });
      }

      function applyCover(article, coverUrl) {
        if (!coverUrl) return;
        // 1) video poster（避免加载前黑屏）
        const video = article.querySelector?.('video.feed-video');
        if (video) {
          try { video.poster = coverUrl; } catch (_) {}
        }
        // 2) 右侧圆圈封面（头像）
        const avatar = article.querySelector?.('.ra-avatar');
        if (avatar) {
          try { avatar.style.setProperty('--ra-cover', `url("${coverUrl}")`); } catch (_) {}
        }
      }

      const videoItems = Array.from(document.querySelectorAll('.feed-item[data-kind="video"]'));
      const ioV = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const item = entry.target;
            const video = item.querySelector?.('video.feed-video');
            if (!video) return;
            const src = video.getAttribute('data-src') || '';
            const nowVisible = entry.isIntersecting && entry.intersectionRatio >= 0.62;

            if (nowVisible) {
              // 进视口：挂载 src 并播放
              if (src && !video.src) {
                try { video.src = src; } catch (_) {}
              }
              try {
                const p = video.play();
                if (p && typeof p.catch === 'function') p.catch(() => {});
              } catch (_) {}

              // 生成第一帧封面（无论是否已有头像图，都用第一帧更“去重复”）
              captureFirstFrame(src).then((url) => applyCover(item, url));
            } else {
              // 出视口：暂停，降低开销
              try { video.pause(); } catch (_) {}
            }
          });
        },
        { threshold: [0, 0.35, 0.62, 0.85, 1] }
      );
      videoItems.forEach((node) => ioV.observe(node));
    }

    // 确保 iframe 加载完成后立刻对齐到当前页（避免 iOS 延迟加载导致第一次切页不生效）
    douyinFrame?.addEventListener?.('load', () => {
      try {
        setDouyinPage(douyinPage, { skipUi: true });
      } catch (_) {}
    });

    // 说明：已移除覆盖在 douyin iframe 上方的“手势层”方案。
    // 原因：会遮挡 iframe，导致无法输入城市、也无法在卡片内原生横滑。

    // 说明：曾有“iframe 内上/下滑请求外层翻页”的兼容方案（feed-swipe），
    // 但当前 dy/douyin.html 已不发送该消息，故移除以保持代码清晰。

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
