/**
 * 共享显示工具：图标使用本地 SVG，文案只在写入 DOM 时去除表情。
 * 不改写事件、历史记录或存档，数字与普通标点保持原样。
 */
window.CampusUI = (() => {
  // 避免使用 Emoji 属性：它也会匹配普通数字、井号和星号。
  const emojiPattern = /[0-9#*]\uFE0F?\u20E3|[\p{Extended_Pictographic}\p{Emoji_Presentation}\p{Emoji_Modifier}\uFE0E\uFE0F\u200D\u{E0020}-\u{E007F}]/gu;

  function plainText(value) {
    return String(value ?? '').replace(emojiPattern, '');
  }

  function icon(name) {
    return `<svg class="ui-icon inline-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#icon-${name}"></use></svg>`;
  }

  function setHTML(element, markup) {
    element.innerHTML = plainText(markup);
  }

  function setText(element, value) {
    element.textContent = plainText(value);
  }

  function formatDebugState(state) {
    // 调试器以 JSON Unicode 转义显示表情，复制解析后仍是原始数据。
    return JSON.stringify(state, null, 2).replace(emojiPattern, token =>
      token.split('').map(unit => `\\u${unit.charCodeAt(0).toString(16).padStart(4, '0')}`).join('')
    );
  }

  return Object.freeze({ icon, plainText, setHTML, setText, formatDebugState });
})();
