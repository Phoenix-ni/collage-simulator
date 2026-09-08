/**
 * 界面辅助层：只读取已渲染的 DOM，管理焦点、滚动和无障碍标记。
 * 不读取或写入引擎状态，不访问存档，不计算任何游戏数值。
 * 键盘操作通过原有元素的 click 事件进入原有流程。
 */
document.addEventListener('DOMContentLoaded', () => {
  const main = document.getElementById('main-content');
  const stageText = document.getElementById('top-stage-text');
  const actionGrid = document.getElementById('action-cards-grid');
  const restSection = document.getElementById('system-rest-section');

  function labelActionCards(container) {
    container.querySelectorAll('.action-card, .rest-action-card').forEach(card => {
      const disabled = card.classList.contains('disabled');
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', disabled ? '-1' : '0');
      card.setAttribute('aria-disabled', String(disabled));
    });
  }

  [actionGrid, restSection].forEach(container => {
    labelActionCards(container);
    new MutationObserver(() => labelActionCards(container)).observe(container, { childList: true });
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const card = event.target.closest('.action-card, .rest-action-card');
    if (!card || card.classList.contains('disabled')) return;
    event.preventDefault();
    if (!event.repeat) card.click();
  });

  function updateYearMarker() {
    const markers = [...document.querySelectorAll('.year-step')];
    const current = markers.findIndex(marker => stageText.textContent.includes(marker.dataset.year));
    markers.forEach((marker, index) => {
      marker.classList.toggle('is-current', index === current);
      marker.classList.toggle('is-complete', current >= 0 && index < current);
      if (index === current) marker.setAttribute('aria-current', 'step');
      else marker.removeAttribute('aria-current');
    });
  }
  updateYearMarker();
  new MutationObserver(updateYearMarker).observe(stageText, { childList: true, subtree: true });

  let visibleTab = '';
  function updateNavigation() {
    const active = document.querySelector('.nav-item.active');
    document.querySelectorAll('.nav-item').forEach(button => {
      if (button === active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    if (active && visibleTab !== active.dataset.tab) {
      visibleTab = active.dataset.tab;
      main.scrollTop = 0;
      const panel = document.querySelector('.tab-panel.active .panel-inner-container');
      if (panel) panel.scrollTop = 0;
    }
  }
  updateNavigation();
  new MutationObserver(updateNavigation).observe(document.querySelector('.bottom-nav-inner'), {
    attributes: true, attributeFilter: ['class'], subtree: true
  });

  function labelSubtabs() {
    document.querySelectorAll('.subtab-btn, .resume-tab-btn').forEach(button => {
      button.setAttribute('aria-pressed', String(button.classList.contains('active')));
    });
  }
  labelSubtabs();
  const subtabObserver = new MutationObserver(labelSubtabs);
  document.querySelectorAll('.history-subtabs, .resume-nav-tabs').forEach(group => {
    subtabObserver.observe(group, { attributes: true, attributeFilter: ['class'], subtree: true });
  });

  function labelEventChips() {
    document.querySelectorAll('.switch-chip').forEach(chip => {
      chip.title = chip.textContent;
      chip.setAttribute('aria-pressed', String(chip.classList.contains('active')));
    });
  }
  labelEventChips();
  new MutationObserver(labelEventChips).observe(document.getElementById('event-switch-chips'), { childList: true });

  new MutationObserver(() => {
    document.querySelectorAll('.route-card[data-route-key]').forEach(card => {
      const button = card.querySelector('.route-expand-btn');
      if (button) button.setAttribute('aria-expanded', String(card.classList.contains('expanded')));
    });
  }).observe(document.getElementById('routes-cards-container'), { childList: true });

  // 新的一页从顶部开始阅读，不影响剧情与选项的生成方式。
  new MutationObserver(() => {
    document.getElementById('current-event-card').scrollTop = 0;
    document.querySelector('.decision-column').scrollTop = 0;
  }).observe(document.getElementById('cur-event-title'), { childList: true });
  new MutationObserver(() => {
    document.getElementById('month-result-view').scrollTop = 0;
    if (document.getElementById('month-result-view').style.display !== 'none') {
      document.getElementById('result-title').focus({ preventScroll: true });
    }
  }).observe(document.getElementById('result-story-text'), { childList: true });

  // 弹窗保持原来的开关事件，只补充键盘焦点及背景隔离。
  const dialogs = [...document.querySelectorAll('.modal-overlay')];
  const background = [main, document.querySelector('.top-bar'), document.querySelector('.bottom-nav')];
  let activeDialog = null;
  let returnFocus = null;

  function updateDialogFocus() {
    const next = dialogs.filter(dialog => dialog.style.display !== 'none').at(-1) || null;
    if (next === activeDialog) return;
    if (next && !activeDialog) returnFocus = document.activeElement;
    activeDialog = next;
    background.forEach(element => { element.inert = Boolean(next); });
    dialogs.forEach(dialog => { dialog.inert = Boolean(next && dialog !== next); });
    if (next) {
      const close = next.querySelector('.btn-close, .btn-close-modal');
      close?.focus({ preventScroll: true });
    } else if (returnFocus?.isConnected) {
      returnFocus.focus({ preventScroll: true });
    }
  }
  const dialogObserver = new MutationObserver(updateDialogFocus);
  dialogs.forEach(dialog => dialogObserver.observe(dialog, { attributes: true, attributeFilter: ['style'] }));
  updateDialogFocus();

  document.addEventListener('keydown', event => {
    if (!activeDialog) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      activeDialog.querySelector('.btn-close, .btn-close-modal')?.click();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...activeDialog.querySelectorAll('button, select, input, a[href], [tabindex="0"]')]
      .filter(element => !element.disabled && element.getClientRects().length > 0);
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && (document.activeElement === first || !activeDialog.contains(document.activeElement))) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !activeDialog.contains(document.activeElement))) {
      event.preventDefault();
      first?.focus();
    }
  });
});
