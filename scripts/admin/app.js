/* lbx's Blog 发布后台 · 前端逻辑（零依赖） */
(() => {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const noteList = $('#note-list');
  const postList = $('#post-list');
  const searchInput = $('#search');
  const toastEl = $('#toast');

  /* ── 状态 ── */
  let pickedFiles = []; // { file: File, rel: string }；图片项 rel 为 img:<小写文件名>
  let currentPicked = null; // 当前预览/发布的笔记记录
  let toastTimer = null;

  /* ── 工具 ── */
  function toast(msg, type = 'ok') {
    toastEl.textContent = msg;
    toastEl.className = `toast show ${type}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toastEl.className = 'toast'), 2400);
  }

  async function api(path, options) {
    const res = await fetch(path, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `请求失败（${res.status}）`);
    return data;
  }

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const fmtKB = (b) => `${(b / 1024).toFixed(0)}KB`;
  const isMd = (f) => /\.(md|markdown)$/i.test(f.name);
  const isImg = (f) => f.type.startsWith('image/');
  const PRIVATE_DIRS = ['实习', '简历', '日常'];
  const isPrivateRel = (rel) => PRIVATE_DIRS.some((d) => rel === d || rel.startsWith(`${d}/`));

  /* ── 主题 ── */
  $('#btn-theme').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('admin-theme', next);
  });
  document.documentElement.dataset.theme = localStorage.getItem('admin-theme') || 'dark';

  /* ── 文件选择与拖拽 ── */
  const dropZone = $('#drop-zone');
  const fileInput = $('#file-input');
  const folderInput = $('#folder-input');

  $('#btn-pick-files').addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });
  $('#btn-pick-folder').addEventListener('click', (e) => {
    e.stopPropagation();
    folderInput.click();
  });
  // 点拖拽区空白 = 选择文件（上面按钮已 stopPropagation，不会双触发）
  dropZone.addEventListener('click', () => fileInput.click());

  function addFiles(fileList) {
    const incoming = [...fileList];
    const mds = incoming.filter(isMd);
    const imgs = incoming.filter(isImg);
    const skipped = incoming.length - mds.length - imgs.length;
    let added = 0;

    for (const f of mds) {
      const rel = f.webkitRelativePath || f.name;
      if (!pickedFiles.some((p) => p.rel === rel && p.file.size === f.size)) {
        pickedFiles.push({ file: f, rel });
        added++;
      }
    }
    for (const img of imgs) {
      const key = `img:${img.name.toLowerCase()}`;
      if (!pickedFiles.some((p) => p.rel === key)) {
        pickedFiles.push({ file: img, rel: key });
        added++;
      }
    }
    if (skipped > 0) toast(`已忽略 ${skipped} 个非 md/图片文件`);
    if (added > 0) toast(`已添加 ${added} 个文件`);
    renderPicked();
  }

  fileInput.addEventListener('change', () => {
    addFiles(fileInput.files);
    fileInput.value = '';
  });
  folderInput.addEventListener('change', () => {
    addFiles(folderInput.files);
    folderInput.value = '';
  });

  // 拖拽（dragenter/leave 计数嵌套子元素）
  let dragDepth = 0;
  dropZone.addEventListener('dragenter', () => {
    dragDepth++;
    dropZone.classList.add('is-dragover');
  });
  dropZone.addEventListener('dragleave', () => {
    dragDepth--;
    if (dragDepth <= 0) {
      dragDepth = 0;
      dropZone.classList.remove('is-dragover');
    }
  });
  dropZone.addEventListener('dragover', (e) => e.preventDefault());
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dragDepth = 0;
    dropZone.classList.remove('is-dragover');
    addFiles(e.dataTransfer.files);
  });

  /* ── 已选文件列表 ── */
  function visibleMds() {
    const q = searchInput.value.trim().toLowerCase();
    return pickedFiles.filter((p) => !p.rel.startsWith('img:') && (!q || p.rel.toLowerCase().includes(q)));
  }

  function renderPicked() {
    const mds = pickedFiles.filter((p) => !p.rel.startsWith('img:'));
    const imgCount = pickedFiles.length - mds.length;
    $('#picked-stats').textContent = mds.length ? `${mds.length} 篇笔记 · ${imgCount} 张图片` : '';
    $('#btn-clear-picked').hidden = !pickedFiles.length;

    const list = visibleMds();
    if (!list.length) {
      noteList.innerHTML = pickedFiles.length
        ? '<div class="empty">没有匹配的笔记</div>'
        : '<div class="empty">还没有选择文件。选择文件夹上传可按目录自动推导专栏。</div>';
      return;
    }
    noteList.innerHTML = list
      .map(
        (p, vi) => `
      <div class="item" role="listitem" data-idx="${vi}" tabindex="0" title="${esc(p.rel)}">
        <div class="item-main">
          <div class="item-title">${esc(p.file.name)}</div>
          <div class="item-path">${esc(p.rel)} · ${fmtKB(p.file.size)}</div>
        </div>
        <div class="item-actions">
          <button class="pub-btn" data-preview="${vi}">发布</button>
        </div>
      </div>`,
      )
      .join('');
  }

  searchInput.addEventListener('input', renderPicked);
  $('#btn-clear-picked').addEventListener('click', () => {
    pickedFiles = [];
    renderPicked();
  });

  noteList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-preview]');
    if (btn) openPreview(Number(btn.dataset.preview));
  });
  noteList.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.classList.contains('item')) {
      openPreview(Number(e.target.dataset.idx));
    }
  });

  /* ── 预览 + 发布（上传制） ── */
  const previewDialog = $('#preview-dialog');
  const previewPre = $('#preview-content');
  const editArea = $('#edit-content');

  // 关闭：× 按钮（data-close）+ 点弹窗外遮罩；Esc 由 <dialog> 原生处理
  for (const btn of document.querySelectorAll('[data-close]')) {
    btn.addEventListener('click', () => previewDialog.close());
  }
  previewDialog.addEventListener('click', (e) => {
    if (e.target === previewDialog) previewDialog.close();
  });

  async function openPreview(idx) {
    const rec = visibleMds()[idx];
    if (!rec) return;
    currentPicked = rec;
    $('#preview-title').textContent = rec.rel;
    $('#publish-status').textContent = '';
    $('#publish-status').className = 'publish-status';
    const btn = $('#btn-publish');
    btn.disabled = false;
    btn.textContent = '发布';

    // 预填表单（建议值由 preview 接口回填）
    $('#f-title').value = '';
    $('#f-desc').value = '';
    $('#f-series').value = '';
    $('#f-order').value = '';
    $('#f-draft').checked = false;
    $('#private-hint').hidden = !isPrivateRel(rec.rel);

    previewDialog.showModal();
    previewPre.hidden = false;
    editArea.hidden = true;
    previewPre.textContent = '加载中…';
    try {
      const raw = await rec.file.text();
      const sug = await api('/api/upload/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rel: rec.rel, raw }),
      });
      previewPre.textContent = sug.raw;
      $('#f-title').value = sug.title;
      $('#f-desc').value = sug.description;
      $('#f-series').value = sug.series ?? '';
      $('#f-order').value = sug.order != null ? String(sug.order) : '';
    } catch (e) {
      previewPre.textContent = `读取失败：${e.message}`;
    }
  }

  $('#btn-publish').addEventListener('click', async () => {
    if (!currentPicked) return;
    const btn = $('#btn-publish');
    btn.disabled = true;
    $('#publish-status').textContent = '';

    const fd = new FormData();
    fd.append('rel', currentPicked.rel.replace(/\.(md|markdown)$/i, ''));
    fd.append('title', $('#f-title').value.trim());
    fd.append('description', $('#f-desc').value.trim());
    fd.append('series', $('#f-series').value.trim());
    fd.append('order', $('#f-order').value.trim());
    fd.append('draft', String($('#f-draft').checked));
    fd.append('note', currentPicked.file, currentPicked.file.name);
    for (const p of pickedFiles) {
      if (p.rel.startsWith('img:')) fd.append('images', p.file, p.file.name);
    }

    try {
      const result = await api('/api/upload/publish', { method: 'POST', body: fd });
      let msg = `已发布：${result.title}`;
      if (result.imageSavedBytes > 0) {
        msg += `（图片省 ${(result.imageSavedBytes / 1024).toFixed(0)}KB）`;
      }
      $('#publish-status').textContent = '✓ 已发布';
      toast(msg, 'ok');
      setTimeout(() => previewDialog.close(), 500);
      loadPosts();
    } catch (e) {
      $('#publish-status').textContent = e.message;
      $('#publish-status').className = 'publish-status err';
      btn.disabled = false;
    }
  });

  /* ── 已发布列表（按专栏分组，两级拖拽） ── */
  let seriesOrder = []; // 专栏展示顺序（后端 series-order.json）
  const OPEN_KEY = 'admin-open-series'; // 展开过的专栏（默认全部折叠）
  let openSeries = new Set(JSON.parse(localStorage.getItem(OPEN_KEY) || '[]'));
  const saveOpenSeries = () => localStorage.setItem(OPEN_KEY, JSON.stringify([...openSeries]));

  let lastPosts = []; // 最近一次拉到的文章（折叠/展开时无需重新请求）

  async function loadPosts() {
    postList.innerHTML = '<div class="loading">加载中…</div>';
    try {
      const { posts, seriesOrder: order } = await api('/api/posts');
      seriesOrder = order ?? [];
      lastPosts = posts;
      $('#post-count').textContent = posts.length;
      renderPosts();
    } catch (e) {
      postList.innerHTML = `<div class="empty">加载失败：${esc(e.message)}</div>`;
    }
  }

  function renderPosts() {
    if (!lastPosts.length) {
      postList.innerHTML = '<div class="empty">还没有发布任何文章</div>';
      syncExpandLabel();
      return;
    }
    postList.innerHTML = groupPosts(lastPosts).map(groupHtml).join('');
    syncExpandLabel();
  }

  /** 展开/折叠全部：状态写进 openSeries，重渲染后保持一致 */
  function setAllOpen(open) {
    for (const p of groupPosts(lastPosts)) {
      if (open) openSeries.add(p.series);
      else openSeries.delete(p.series);
    }
    saveOpenSeries();
    renderPosts();
  }

  function allGroupsOpen() {
    const groups = groupPosts(lastPosts);
    return groups.length > 0 && groups.every((g) => openSeries.has(g.series));
  }

  function syncExpandLabel() {
    $('#btn-expand-all').textContent = allGroupsOpen() ? '折叠全部' : '展开全部';
  }

  /** 按专栏分组：已登记专栏按 seriesOrder 排，未登记/无专栏的跟在后面 */
  function groupPosts(posts) {
    const map = new Map();
    for (const p of posts) {
      const key = p.series || '';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(p);
    }
    const known = seriesOrder.filter((s) => map.has(s));
    const rest = [...map.keys()].filter((s) => !known.includes(s));
    return [...known, ...rest].map((series) => ({ series, items: map.get(series) }));
  }

  function groupHtml(g) {
    return `
      <section class="series-group${openSeries.has(g.series) ? '' : ' collapsed'}" data-series="${esc(g.series)}">
        <div class="sg-head" draggable="true" title="拖动调整专栏顺序">
          <span class="sg-grip" aria-hidden="true">
            <svg width="12" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="5" r="1.7"/><circle cx="15" cy="5" r="1.7"/><circle cx="9" cy="12" r="1.7"/><circle cx="15" cy="12" r="1.7"/><circle cx="9" cy="19" r="1.7"/><circle cx="15" cy="19" r="1.7"/></svg>
          </span>
          <span class="sg-name">${esc(g.series || '未分类')}</span>
          <span class="sg-count">${g.items.length} 篇</span>
          <button class="sg-toggle" data-toggle type="button" aria-label="折叠或展开该专栏" title="折叠 / 展开">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
          </button>
        </div>
        <div class="sg-items">${g.items.map(postItemHtml).join('')}</div>
      </section>`;
  }

  function postItemHtml(p, i) {
    return `
        <div class="item post-item" role="listitem" data-slug="${esc(p.slug)}">
          <span class="pos-num" title="专栏内位置">${i + 1}</span>
          <div class="drag-handle" draggable="true" title="拖动调整专栏内顺序" aria-label="拖动调整顺序">
            <svg width="12" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="5" r="1.7"/><circle cx="15" cy="5" r="1.7"/><circle cx="9" cy="12" r="1.7"/><circle cx="15" cy="12" r="1.7"/><circle cx="9" cy="19" r="1.7"/><circle cx="15" cy="19" r="1.7"/></svg>
          </div>
          <div class="item-main">
            <div class="item-title">
              ${p.draft ? '<span class="draft-badge">草稿</span>' : ''}${esc(p.title)}
            </div>
            <div class="item-sub item-desc">${esc(p.description || '')}</div>
          </div>
          <div class="item-actions">
            ${p.draft ? `<button class="act-btn" data-action="publish-now" data-slug="${esc(p.slug)}">转正</button>` : `<button class="act-btn" data-action="unpublish" data-slug="${esc(p.slug)}">下架</button>`}
            <button class="act-btn" data-action="edit" data-slug="${esc(p.slug)}">编辑</button>
            <button class="act-btn danger" data-action="delete" data-slug="${esc(p.slug)}">删除</button>
          </div>
        </div>`;
  }

  $('#btn-refresh-posts').addEventListener('click', loadPosts);
  $('#btn-expand-all').addEventListener('click', () => setAllOpen(!allGroupsOpen()));

  postList.addEventListener('click', async (e) => {
    // 专栏折叠（记住展开过的专栏，拖拽后重新拉取列表不会缩回去）
    const toggle = e.target.closest('[data-toggle]');
    if (toggle) {
      const group = toggle.closest('.series-group');
      const collapsed = group.classList.toggle('collapsed');
      if (collapsed) openSeries.delete(group.dataset.series);
      else openSeries.add(group.dataset.series);
      saveOpenSeries();
      syncExpandLabel();
      return;
    }
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const { action, slug } = btn.dataset;

    if (action === 'delete') {
      if (!confirm(`确定删除《${slug}》？正文与这篇的图片目录会一并删除，不可撤销。`)) return;
      try {
        const r = await api(`/api/posts/${encodeURIComponent(slug)}`, { method: 'DELETE' });
        toast(r.imagesRemoved ? `已删除（含 ${r.imagesRemoved} 张图片）` : '已删除', 'ok');
        loadPosts();
      } catch (err) {
        toast(err.message, 'err');
      }
      return;
    }

    if (action === 'publish-now' || action === 'unpublish') {
      try {
        await api(`/api/posts/${encodeURIComponent(slug)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ draft: action === 'unpublish' }),
        });
        toast(action === 'unpublish' ? '已转为草稿（不公开）' : '已发布公开', 'ok');
        loadPosts();
      } catch (err) {
        toast(err.message, 'err');
      }
      return;
    }

    if (action === 'edit') openEdit(slug);
  });

  /* ── 拖拽排序：文章在专栏内拖、专栏整体拖标题栏 ── */
  let drag = null; // { type: 'post' | 'series', el: HTMLElement, series: string }

  function clearDragMarks() {
    postList.querySelectorAll('.is-dragging, .drop-above, .drop-below').forEach((el) =>
      el.classList.remove('is-dragging', 'drop-above', 'drop-below'),
    );
  }

  /** 从当前 DOM 读出分组顺序（提交给后端） */
  function readGroups() {
    return [...postList.querySelectorAll('.series-group')].map((g) => ({
      series: g.dataset.series,
      slugs: [...g.querySelectorAll('.item')].map((el) => el.dataset.slug),
    }));
  }

  postList.addEventListener('dragstart', (e) => {
    const handle = e.target.closest('.drag-handle');
    const head = e.target.closest('.sg-head');
    if (handle) {
      const item = handle.closest('.item');
      drag = { type: 'post', el: item, series: item.closest('.series-group').dataset.series };
      item.classList.add('is-dragging');
    } else if (head) {
      const group = head.closest('.series-group');
      drag = { type: 'series', el: group, series: group.dataset.series };
      group.classList.add('is-dragging');
    } else {
      e.preventDefault(); // 其余区域不允许拖动
      return;
    }
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', drag.series || drag.el.dataset.slug || ''); // Firefox 需非空 data
  });

  postList.addEventListener('dragover', (e) => {
    if (!drag) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    postList.querySelectorAll('.drop-above, .drop-below').forEach((el) => el.classList.remove('drop-above', 'drop-below'));

    if (drag.type === 'series') {
      const overGroup = e.target.closest('.series-group');
      if (!overGroup || overGroup === drag.el) return;
      const rect = overGroup.querySelector('.sg-head').getBoundingClientRect();
      overGroup.classList.add(e.clientY < rect.top + rect.height / 2 ? 'drop-above' : 'drop-below');
      return;
    }

    const overItem = e.target.closest('.item');
    if (!overItem || overItem === drag.el) return;
    // 只允许同专栏内排序（跨专栏改归属请用「编辑」改专栏名）
    if (overItem.closest('.series-group').dataset.series !== drag.series) return;
    const rect = overItem.getBoundingClientRect();
    overItem.classList.add(e.clientY < rect.top + rect.height / 2 ? 'drop-above' : 'drop-below');
  });

  postList.addEventListener('drop', async (e) => {
    e.preventDefault();
    if (!drag) return;
    let moved = false;

    if (drag.type === 'series') {
      const overGroup = e.target.closest('.series-group');
      if (overGroup && overGroup !== drag.el) {
        const rect = overGroup.querySelector('.sg-head').getBoundingClientRect();
        const above = e.clientY < rect.top + rect.height / 2;
        postList.insertBefore(drag.el, above ? overGroup : overGroup.nextSibling);
        moved = true;
      }
    } else {
      const overItem = e.target.closest('.item');
      if (
        overItem && overItem !== drag.el &&
        overItem.closest('.series-group').dataset.series === drag.series
      ) {
        const rect = overItem.getBoundingClientRect();
        const above = e.clientY < rect.top + rect.height / 2;
        overItem.parentNode.insertBefore(drag.el, above ? overItem : overItem.nextSibling);
        moved = true;
      }
    }

    drag = null;
    clearDragMarks();
    if (!moved) return;

    try {
      await api('/api/posts/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groups: readGroups() }),
      });
      toast('顺序已保存', 'ok');
      await loadPosts(); // 重新拉取：刷新组内序号与专栏顺序
    } catch (err) {
      toast(err.message, 'err');
      loadPosts(); // 失败回滚到服务器顺序
    }
  });

  postList.addEventListener('dragend', () => {
    drag = null;
    clearDragMarks();
  });

  /* ── 编辑已发布文章（元信息 + 正文） ── */
  async function openEdit(slug) {
    let post;
    try {
      post = await api(`/api/posts/${encodeURIComponent(slug)}`);
    } catch (e) {
      toast(e.message, 'err');
      return;
    }

    currentPicked = null;
    $('#preview-title').textContent = `编辑 · ${slug}`;
    $('#publish-status').textContent = '';
    $('#publish-status').className = 'publish-status';
    const btn = $('#btn-publish');
    btn.disabled = false;
    btn.textContent = '保存';
    $('#private-hint').hidden = true;

    $('#f-title').value = post.title;
    $('#f-desc').value = post.description;
    $('#f-series').value = post.series || '';
    $('#f-order').value = post.order != null ? String(post.order) : '';
    $('#f-draft').checked = post.draft;

    // 编辑模式：textarea 显示正文
    previewPre.hidden = true;
    editArea.hidden = false;
    editArea.value = post.body;

    // 保存走 PATCH（含正文）
    btn.onclick = async () => {
      $('#publish-status').textContent = '';
      try {
        await api(`/api/posts/${encodeURIComponent(slug)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: $('#f-title').value.trim(),
            description: $('#f-desc').value.trim(),
            series: $('#f-series').value.trim(),
            order: $('#f-order').value.trim(),
            draft: $('#f-draft').checked,
            body: editArea.value,
          }),
        });
        $('#publish-status').textContent = '✓ 已保存';
        toast('已保存', 'ok');
        loadPosts();
        setTimeout(() => previewDialog.close(), 500);
      } catch (e) {
        $('#publish-status').textContent = e.message;
        $('#publish-status').className = 'publish-status err';
      }
    };

    previewDialog.showModal();
  }

  // 关闭弹窗时恢复「发布」按钮语义
  previewDialog.addEventListener('close', () => {
    const btn = $('#btn-publish');
    btn.textContent = '发布';
    btn.onclick = null;
    currentPicked = null;
  });

  /* ── 启动 ── */
  renderPicked();
  loadPosts();
})();
