/* Aurora 发布后台 · 前端逻辑（零依赖） */
(() => {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const noteList = $('#note-list');
  const postList = $('#post-list');
  const searchInput = $('#search');
  const toastEl = $('#toast');

  let notes = [];
  let currentRel = null; // 当前预览/发布的笔记
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
  const fmtDate = (iso) => (iso ? iso.slice(0, 10) : '');
  const fmtKB = (b) => `${(b / 1024).toFixed(0)}KB`;

  /* ── 主题 ── */
  $('#btn-theme').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('admin-theme', next);
  });
  document.documentElement.dataset.theme = localStorage.getItem('admin-theme') || 'dark';

  /* ── 笔记库列表 ── */
  async function loadNotes(q = '') {
    noteList.innerHTML = '<div class="loading">加载中…</div>';
    try {
      const data = await api(`/api/notes?q=${encodeURIComponent(q)}`);
      notes = data.notes;
      $('#vault-path').textContent = data.vault;
      $('#vault-path').title = data.vault;
      renderNotes();
    } catch (e) {
      noteList.innerHTML = `<div class="empty">加载失败：${esc(e.message)}</div>`;
    }
  }

  function renderNotes() {
    if (!notes.length) {
      noteList.innerHTML = '<div class="empty">没有匹配的笔记</div>';
      return;
    }
    // 按目录分组（listAllNotes 已按路径排序，同目录笔记必然相邻）
    const groups = [];
    notes.forEach((n, i) => {
      const dir = n.rel.includes('/') ? n.rel.slice(0, n.rel.lastIndexOf('/')) : '';
      let g = groups[groups.length - 1];
      if (!g || g.dir !== dir) groups.push((g = { dir, items: [] }));
      g.items.push(i);
    });

    const folderIcon =
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>';
    const chevron =
      '<svg class="group-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

    noteList.innerHTML = groups
      .map(
        (g, gi) => `
      <div class="note-group" data-group="${gi}">
        <div class="group-head" role="button" tabindex="0" aria-expanded="true"
             title="${esc(g.dir || '库根目录')}">
          ${folderIcon}
          <span class="group-name">${esc(g.dir ? g.dir.split('/').join(' / ') : '库根目录')}</span>
          <span class="group-count">${g.items.length} 篇</span>
          ${chevron}
        </div>
        <div class="group-items">
          ${g.items
            .map((i) => {
              const n = notes[i];
              return `
          <div class="item" role="listitem" data-idx="${i}" tabindex="0"
               title="${esc(n.rel)}">
            <div class="item-main">
              <div class="item-title">${esc(n.title || n.rel)}</div>
              <div class="item-sub">${esc(n.excerpt || '')}</div>
              <div class="item-path">${esc(n.rel.split('/').pop())} · ${fmtKB(n.size)} · ${fmtDate(n.mtime)}</div>
            </div>
            <div class="item-actions">
              <button class="pub-btn" data-preview="${i}">发布</button>
            </div>
          </div>`;
            })
            .join('')}
        </div>
      </div>`,
      )
      .join('');
  }

  noteList.addEventListener('click', (e) => {
    // 分组头：折叠/展开该目录
    const head = e.target.closest('.group-head');
    if (head) {
      const collapsed = head.parentElement.classList.toggle('collapsed');
      head.setAttribute('aria-expanded', String(!collapsed));
      return;
    }
    const btn = e.target.closest('[data-preview]');
    if (btn) openPreview(Number(btn.dataset.preview));
  });
  noteList.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    if (e.target.classList.contains('group-head')) {
      e.target.click();
      return;
    }
    if (e.target.classList.contains('item')) {
      openPreview(Number(e.target.dataset.idx));
    }
  });

  let searchTimer = null;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadNotes(searchInput.value.trim()), 250);
  });

  /* ── 预览 + 发布 ── */
  const previewDialog = $('#preview-dialog');

  async function openPreview(idx) {
    const note = notes[idx];
    if (!note) return;
    currentRel = note.rel;
    $('#preview-title').textContent = note.rel;
    $('#publish-status').textContent = '';
    $('#publish-status').className = 'publish-status';
    $('#btn-publish').disabled = false;

    // 预填表单
    $('#f-title').value = note.title || '';
    $('#f-desc').value = '';
    $('#f-tags').value = '';
    $('#f-date').value = fmtDate(note.mtime);
    $('#f-draft').checked = false;

    previewDialog.showModal();
    const pre = $('#preview-content');
    pre.textContent = '加载中…';
    try {
      const { raw } = await api('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rel: note.rel }),
      });
      // 截断超长内容，弹窗里只看头部
      pre.textContent = raw.length > 6000 ? `${raw.slice(0, 6000)}\n\n…（后文省略，共 ${raw.length} 字符）` : raw;
    } catch (e) {
      pre.textContent = `读取失败：${e.message}`;
    }
  }

  $('#btn-publish').addEventListener('click', async () => {
    if (!currentRel) return;
    const btn = $('#btn-publish');
    btn.disabled = true;
    $('#publish-status').textContent = '';
    try {
      const result = await api('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rel: currentRel,
          title: $('#f-title').value.trim() || undefined,
          description: $('#f-desc').value.trim() || undefined,
          tags: $('#f-tags').value.trim() || undefined,
          pubDate: $('#f-date').value || undefined,
          draft: $('#f-draft').checked,
        }),
      });
      $('#publish-status').textContent = '✓ 已发布';
      toast(`已发布：${result.title}`, 'ok');
      setTimeout(() => previewDialog.close(), 500);
      loadPosts();
    } catch (e) {
      $('#publish-status').textContent = e.message;
      $('#publish-status').className = 'publish-status err';
      btn.disabled = false;
    }
  });

  /* ── 已发布列表 ── */
  async function loadPosts() {
    postList.innerHTML = '<div class="loading">加载中…</div>';
    try {
      const { posts } = await api('/api/posts');
      $('#post-count').textContent = posts.length;
      if (!posts.length) {
        postList.innerHTML = '<div class="empty">还没有发布任何文章</div>';
        return;
      }
      postList.innerHTML = posts
        .map(
          (p) => `
        <div class="item" role="listitem" data-slug="${esc(p.slug)}">
          <div class="item-main">
            <div class="item-title">
              ${p.draft ? '<span class="draft-badge">草稿</span>' : ''}${esc(p.title)}
            </div>
            <div class="item-sub">${esc(p.description || '')}</div>
            <div class="item-sub">
              ${p.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}
              <span style="margin-left:4px">${esc(p.pubDate)}</span>
            </div>
          </div>
          <div class="item-actions">
            ${p.draft ? `<button class="act-btn" data-action="publish-now" data-slug="${esc(p.slug)}">转正</button>` : `<button class="act-btn" data-action="unpublish" data-slug="${esc(p.slug)}">下架</button>`}
            <button class="act-btn" data-action="edit" data-slug="${esc(p.slug)}">编辑</button>
            <button class="act-btn danger" data-action="delete" data-slug="${esc(p.slug)}">删除</button>
          </div>
        </div>`,
        )
        .join('');
    } catch (e) {
      postList.innerHTML = `<div class="empty">加载失败：${esc(e.message)}</div>`;
    }
  }

  $('#btn-refresh-posts').addEventListener('click', loadPosts);

  postList.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const { action, slug } = btn.dataset;

    if (action === 'delete') {
      if (!confirm(`确定删除《${slug}》？此操作不可撤销（文件直接删除）。`)) return;
      try {
        await api(`/api/posts/${encodeURIComponent(slug)}`, { method: 'DELETE' });
        toast('已删除', 'ok');
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

  /* ── 编辑已发布文章 ── */
  async function openEdit(slug) {
    const { posts } = await api('/api/posts');
    const post = posts.find((p) => p.slug === slug);
    if (!post) return;

    currentRel = null;
    $('#preview-title').textContent = `编辑 · ${slug}`;
    $('#publish-status').textContent = '';
    $('#publish-status').className = 'publish-status';
    $('#btn-publish').disabled = false;
    $('#btn-publish').textContent = '保存';

    $('#f-title').value = post.title;
    $('#f-desc').value = post.description;
    $('#f-tags').value = post.tags.join(', ');
    $('#f-date').value = post.pubDate;
    $('#f-draft').checked = post.draft;
    $('#preview-content').textContent = '（编辑模式下不显示正文。正文如需修改，请直接编辑 src/content/blog/ 下的 .md 文件。）';

    // 保存走 PATCH
    $('#btn-publish').onclick = async () => {
      $('#publish-status').textContent = '';
      try {
        await api(`/api/posts/${encodeURIComponent(slug)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: $('#f-title').value.trim(),
            description: $('#f-desc').value.trim(),
            tags: $('#f-tags').value.trim(),
            pubDate: $('#f-date').value,
            draft: $('#f-draft').checked,
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
    $('#btn-publish').textContent = '发布';
    $('#btn-publish').onclick = null;
    currentRel = null;
  });

  /* ── 设置 ── */
  const settingsDialog = $('#settings-dialog');
  $('#btn-settings').addEventListener('click', () => {
    $('#s-vault').value = $('#vault-path').textContent;
    $('#settings-status').textContent = '';
    settingsDialog.showModal();
  });
  $('#btn-save-settings').addEventListener('click', async () => {
    try {
      await api('/api/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vaultPath: $('#s-vault').value.trim() }),
      });
      $('#settings-status').textContent = '✓ 已保存';
      toast('设置已保存', 'ok');
      setTimeout(() => settingsDialog.close(), 400);
      loadNotes(searchInput.value.trim());
    } catch (e) {
      $('#settings-status').textContent = e.message;
      $('#settings-status').className = 'publish-status err';
    }
  });

  /* ── 通用关闭 ── */
  document.querySelectorAll('dialog [data-close]').forEach((btn) =>
    btn.addEventListener('click', () => btn.closest('dialog').close()),
  );

  /* ── 启动 ── */
  loadNotes();
  loadPosts();
})();
