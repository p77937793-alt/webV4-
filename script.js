// 找出頁面上所有的卡牌
const cards = document.querySelectorAll('.card');

// 幫每一張卡牌加上「被點一下就翻面」
cards.forEach(function (card) {
  // 讓鍵盤也能操作：Tab 可以選到卡牌，按 Enter 或空白鍵翻面
  card.setAttribute('tabindex', '0');
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', '翻面看卡牌背後的歷史');

  function flip() {
    card.classList.toggle('flipped');
  }
  card.addEventListener('click', function (e) {
    if (e.target.closest('a')) return;   // 點的是「延伸閱讀」連結：直接換頁，不翻面
    flip();
  });
  card.addEventListener('keydown', function (e) {
    if (e.target !== card) return;       // 焦點在連結上時，交給連結自己處理
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      flip();
    }
  });
});
