/* =====================================================================
   大圳故事（一頁一頁往下滑）  ★ 未來若要修改故事文字、換背景圖，只需更改這裡
   ---------------------------------------------------------------------
   一格＝一個 { … }。想加一格：複製一整塊貼到想要的位置，改 id（p12、p13…）。
   欄位（不需要的欄位整行刪掉即可）：
     id        這一格的代號，連結可以用 story.html#p4 直接跳到這一格
     big       大數字（例如 1916）
     title     標題
     text      說明文字
     bg        背景圖片
     bgMobile  直的手機畫面要換的背景圖（可省略）
     bgPos     圖片要對齊哪裡：'center'、'center 35%'（越小越靠上）
     shade     圖片上蓋多深的顏色，0（不蓋）～ 1（全蓋），讓字看得清楚（一般蓋黑色，light 時蓋米色）
     color     圖片載入前／找不到圖片時的底色
     light     true＝淺色背景配深色字
     credit    左下角的圖片出處
     buttons   按鈕 [{ label, href, color }]
   ===================================================================== */
window.STORY = {
  id: 'story',
  panels: [
    {
      id: 'p1', title: '一滴水的旅程',
      text: '往下滑，跟著一滴水從大漢溪流進桃園台地。',
      bg: 'images/ex-hero.jpg', shade: 0.45, color: '#2b7bb9',
      credit: '底圖：〈桃園農田水利會灌溉區域圖〉（出處待補）'
    },
    {
      id: 'p2', title: '台地上缺水',
      text: '大漢溪的河床深陷在台地崖壁下方，水上不來。先民利用不透水的紅土挖埤塘，蓄存雨水灌溉。',
      bg: 'images/story/p2-drought.jpg', shade: 0.5, color: '#a5643a',
      credit: '照片：出處待補'
    },
    {
      id: 'p3', title: '埤塘各自為政',
      text: '早期埤塘由農民各自開鑿、各自管理，池與池之間沒有水路相連。豪雨時溢流，久旱時乾涸。',
      bg: 'images/story/p3-farmers.jpg', shade: 0.55, color: '#8a5a2b',
      credit: '照片：出處待補（今日照片，非早期景象）'
    },
    {
      id: 'p4', big: '1916', title: '石門取水口開工',
      text: '從大漢溪上游石門取水，利用台地向西北傾斜的地勢，讓水靠重力流上台地。',
      bg: 'images/story/p4-shimen.jpg', shade: 0.45, color: '#2b6cb0',
      credit: '照片：出處待補'
    },
    {
      id: 'p5', big: '15.62 公里', title: '穿山的導水隧道',
      text: '導水路約 20.47 公里，其中 8 段隧道合計約 15.62 公里，施工時遇到地層鬆軟、地下水滲出。',
      bg: 'images/story/p5-tunnel.jpg', shade: 0.5, color: '#374151',
      credit: '照片：出處待補（拍攝年代待核）'
    },
    {
      id: 'p6', title: '蓋大圳的人',
      text: '張令紀等技師帶領工程，參與施工的還有礦工與在地客家茶農。殉職名錄中，也留下了溫細妹、范氏美妹等女性的名字。',
      bg: 'images/story/p6-people.svg', shade: 0.4, color: '#4b5563',
      credit: '示意圖：施工的人們（剪影，非特定人物）'
    },
    {
      id: 'p7', big: '1924.5.26', title: '通水',
      text: '導水路及主要幹支分線通水，水經幹線、支線、分線送往各灌溉區。',
      bg: 'images/story/p7-opening.jpg', bgPos: 'center 35%', shade: 0.45, color: '#2b7bb9',
      credit: '照片：出處待補（拍攝年代待核）'
    },
    {
      id: 'p8', big: '231口', title: '線內貯水池',
      text: '1919 年成立的桃園大圳組合整修貯水池與給水路，1928 年完成整體系統。雨季存水、乾季放水。',
      bg: 'images/story/p8-reservoirs.jpg', shade: 0.5, color: '#1f7a8c',
      credit: '照片：出處待補（今日空拍）'
    },
    {
      id: 'p9', big: '二萬二千餘公頃', title: '從看天田到雙期稻作',
      text: '大圳供應二萬二千餘公頃耕地，原本缺水的土地，成為適合一年兩期稻作的水田。',
      bg: 'images/story/p9-paddy.jpg', bgPos: 'center 60%', shade: 0.55, color: '#5d8f2f',
      credit: '照片：出處待補'
    },
    {
      id: 'p10', title: '埤塘的今天',
      text: '1-1 號池「辨天池」曾是桃園的遊憩名勝，後因機場開發與遷村安置填平，成為今天的陽明運動公園一帶。',
      bg: 'images/story/p10-yangming.jpg', bgMobile: 'images/story/p10-yangming-m.jpg',
      shade: 0.6, color: '#6b46c1',
      credit: '昔：1928 年辨天池（秋惠文庫）／今：陽明運動公園（出處待補）。上網前需確認兩張照片的授權'
    },
    {
      id: 'p11', title: '換你來蓋大圳',
      text: '在桌遊裡和其他玩家一起完成這條水路，或在小遊戲裡化身一滴水。',
      bg: 'images/story/p11-hex.svg', shade: 0.55, color: '#f4efe4', light: true,   // light：蓋的是米色而不是黑色
      credit: '示意圖：桌遊的六角板塊',
      buttons: [
        { label: '開始試玩桌遊',       href: 'play.html',   color: '#2b7bb9' },
        { label: '開始試玩互動小遊戲', href: 'index1.html', color: '#5d8f2f' }
      ]
    }
  ]
};
