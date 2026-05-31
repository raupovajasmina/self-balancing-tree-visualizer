// ============================================================
// THEME SYSTEM
// ============================================================
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
}

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('tv-theme', t);
  const lblLight = document.getElementById('lbl-light');
  const lblDark  = document.getElementById('lbl-dark');
  if (lblLight) lblLight.classList.toggle('active', t === 'light');
  if (lblDark)  lblDark.classList.toggle('active',  t === 'dark');
  render(new Map());
}

(function initTheme() {
  const saved = localStorage.getItem('tv-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  window.addEventListener('DOMContentLoaded', () => {
    const lblLight = document.getElementById('lbl-light');
    const lblDark  = document.getElementById('lbl-dark');
    if (lblLight) lblLight.classList.toggle('active', saved === 'light');
    if (lblDark)  lblDark.classList.toggle('active',  saved === 'dark');
  });
})();

// ============================================================
// AUTH SYSTEM (localStorage-based demo)
// ============================================================
let currentUser = null;
let chatHistory = {};
let modalMode   = 'login';

function initAuth() {
  const saved = localStorage.getItem('tv-user');
  if (saved) { try { currentUser = JSON.parse(saved); } catch(e) {} }
  const savedChats = localStorage.getItem('tv-chats');
  if (savedChats) { try { chatHistory = JSON.parse(savedChats); } catch(e) {} }
  updateAuthUI();
}

function updateAuthUI() {
  // Auth sistemi kaldırıldı — chat direkt açık
  const loggedInArea = document.getElementById('chat-logged-in');
  if (loggedInArea) {
    loggedInArea.style.display = 'flex';
    loggedInArea.style.flexDirection = 'column';
    renderChatHistory();
  }
}

function openAuthModal(mode) {
  mode = mode || 'login';
  modalMode = mode;
  document.getElementById('auth-modal').classList.remove('hidden');
  switchModalTab(mode);
  document.getElementById('modal-error').textContent = '';
}

function closeAuthModal() {
  document.getElementById('auth-modal').classList.add('hidden');
}

function switchModalTab(tab) {
  modalMode = tab;
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
  document.getElementById('modal-login-form').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('modal-register-form').style.display = tab === 'register' ? 'block' : 'none';
  document.getElementById('modal-submit-btn').textContent = tab === 'login' ? 'Giriş Yap' : 'Kayıt Ol';
  document.getElementById('modal-error').textContent = '';
}

function submitAuth() {
  const errEl = document.getElementById('modal-error');
  errEl.textContent = '';
  if (modalMode === 'login') {
    const username = document.getElementById('login-user').value.trim();
    const password = document.getElementById('login-pass').value;
    if (!username || !password) { errEl.textContent = 'Tüm alanları doldurun.'; return; }
    const accounts = JSON.parse(localStorage.getItem('tv-accounts') || '{}');
    if (!accounts[username] || accounts[username].password !== btoa(password)) {
      errEl.textContent = 'Kullanıcı adı veya şifre hatalı.'; return;
    }
    currentUser = { username, email: accounts[username].email };
    localStorage.setItem('tv-user', JSON.stringify(currentUser));
    closeAuthModal();
    updateAuthUI();
    addLog(`Hoş geldin, ${username}!`, 'insert');
    if (!chatHistory[username] || chatHistory[username].length === 0) {
      addChatMessage('ai', `Merhaba ${username}! 👋 Ağaç veri yapıları hakkında sorularınızı yanıtlamaya hazırım.`);
    }
  } else {
    const username = document.getElementById('reg-user').value.trim();
    const email    = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-pass').value;
    if (!username || !email || !password) { errEl.textContent = 'Tüm alanları doldurun.'; return; }
    if (username.length < 3) { errEl.textContent = 'Kullanıcı adı en az 3 karakter olmalı.'; return; }
    if (password.length < 6) { errEl.textContent = 'Şifre en az 6 karakter olmalı.'; return; }
    const accounts = JSON.parse(localStorage.getItem('tv-accounts') || '{}');
    if (accounts[username]) { errEl.textContent = 'Bu kullanıcı adı zaten alınmış.'; return; }
    accounts[username] = { password: btoa(password), email };
    localStorage.setItem('tv-accounts', JSON.stringify(accounts));
    currentUser = { username, email };
    localStorage.setItem('tv-user', JSON.stringify(currentUser));
    chatHistory[username] = [];
    saveChats();
    closeAuthModal();
    updateAuthUI();
    addLog(`Kayıt başarılı! Hoş geldin, ${username}!`, 'insert');
    addChatMessage('ai', `Hesabın oluşturuldu ${username}! 🎉 Sana yardımcı olmaktan mutluluk duyarım.`);
  }
}

function doLogout() {
  currentUser = null;
  localStorage.removeItem('tv-user');

  // Reset all trees
  trees = { avl: new AVLTree(), rb: new RBTree(), btree: new BTree(2) };
  currentTree = 'avl';
  stepQueue = []; stepIndex = 0; isPlaying = false; clearInterval(playTimer);
  metrics = { rotations: 0, ops: 0 }; isFirstRender = true;

  // Reset UI
  document.querySelectorAll('.tree-tab').forEach((t, i) => {
    t.classList.toggle('active', i === 0);
  });
  updateStepIndicator();
  hideStepOverlay();
  document.getElementById('traversal-result').style.display = 'none';
  render(new Map());
  updateLegend();

  if (activeRightPanel === 'pseudo') {
    currentHighlightedLines = new Set();
    renderPseudoCode('avl');
  }

  updateAuthUI();
  addLog('Çıkış yapıldı. Tüm ağaçlar sıfırlandı.', 'info');

  const msgs = document.getElementById('chat-messages');
  if (msgs) msgs.innerHTML = '';
}

// ── Chat ──
function renderChatHistory() {
  const msgs = document.getElementById('chat-messages');
  if (!msgs) return;
  msgs.innerHTML = '';
  const history = chatHistory['guest'] || [];
  history.forEach(m => appendChatBubble(m.role, m.text));
  msgs.scrollTop = msgs.scrollHeight;
}

function addChatMessage(role, text) {
  if (!chatHistory['guest']) chatHistory['guest'] = [];
  chatHistory['guest'].push({ role, text, ts: Date.now() });
  saveChats();
  appendChatBubble(role, text);
}

function appendChatBubble(role, text) {
  const msgs = document.getElementById('chat-messages');
  if (!msgs) return;
  const wrap = document.createElement('div');
  wrap.className = `chat-msg ${role}`;
  const sender = document.createElement('div');
  sender.className = 'chat-sender';
  sender.textContent = role === 'user' ? 'Siz' : '🌲 Asistan';
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble';
  bubble.textContent = text;
  wrap.appendChild(sender);
  wrap.appendChild(bubble);
  msgs.appendChild(wrap);
  msgs.scrollTop = msgs.scrollHeight;
}

function saveChats() { localStorage.setItem('tv-chats', JSON.stringify(chatHistory)); }

function chatKeyDown(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
}

// ── Gemini API ──
const GEMINI_API_KEY = CONFIG.GEMINI_API_KEY;
const GEMINI_MODEL   = 'gemini-2.5-flash-lite';

let conversationHistory = []; // { role: 'user'|'model', parts: [{text}] }

function getTreeContext() {
  const tree = trees[currentTree];
  const names = { avl: 'AVL Tree', rb: 'Red-Black Tree', btree: 'B-Tree' };
  const inorder = [];
  if (currentTree === 'avl' || currentTree === 'rb') {
    function io(n) { if (!n) return; io(n.left); inorder.push(n.val); io(n.right); }
    io(tree.root);
  } else {
    function btio(n) {
      if (!n) return;
      n.keys.forEach((k,i) => { if (n.children[i]) btio(n.children[i]); inorder.push(k); });
      if (n.children[n.keys.length]) btio(n.children[n.keys.length]);
    }
    btio(tree.root);
  }
  return `Aktif ağaç: ${names[currentTree]}. Düğüm sayısı: ${tree.size()}. Yükseklik: ${tree.getHeight()}. Rotasyon sayısı: ${metrics.rotations}. Inorder: [${inorder.join(', ')}].`;
}

async function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const text  = input.value.trim();
  if (!text) return;
  input.value    = '';
  input.disabled = true;

  // Sadece arayüze ekle. API'den başarılı cevap alana kadar kalıcı geçmişe ekleme yapmıyoruz.
  addChatMessage('user', text);
  const newUserMessage = { role: 'user', parts: [{ text }] };

  // typing indicator
  const msgs   = document.getElementById('chat-messages');
  const typing = document.createElement('div');
  typing.className = 'chat-msg ai';
  typing.id        = 'typing-indicator';
  typing.innerHTML = `<div class="chat-sender">🤖 Gemini</div>
    <div class="chat-bubble"><div class="chat-typing"><span></span><span></span><span></span></div></div>`;
  msgs.appendChild(typing);
  msgs.scrollTop = msgs.scrollHeight;

  try {
    const systemInstructionText = `Sen bir veri yapıları ve algoritmalar uzmanısın. Kullanıcı "Tree Visualizer" adlı interaktif bir ağaç görselleştirme uygulaması kullanıyor. AVL Tree, Red-Black Tree ve B-Tree konularında yardımcı ol. Güncel ağaç durumu: ${getTreeContext()} Kısa, net ve Türkçe yanıtlar ver. Gerektiğinde örnekler kullan.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    // Mevcut geçmiş ve yeni mesajı birleştirerek API'ye gönderilecek içeriği oluşturuyoruz
    const payloadContents = [...conversationHistory, newUserMessage];

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstructionText }] }, // DÜZELTME: system_instruction yerine systemInstruction yazılmalı
        contents: payloadContents,
        generationConfig: { maxOutputTokens: 1000, temperature: 0.7 },
      }),
    });

    const data  = await response.json();
    const t     = document.getElementById('typing-indicator');
    if (t) t.remove();

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (reply) {
      // DÜZELTME: API'den başarılı cevap geldi. Şimdi hem kullanıcının sorusunu hem de modelin cevabını kalıcı geçmişe ekleyebiliriz.
      conversationHistory.push(newUserMessage);
      conversationHistory.push({ role: 'model', parts: [{ text: reply }] });

      // Geçmiş 20 mesajı aşıyorsa kırp, ancak çift sayı (çift=20) kullanarak dizinin 'user' rolü ile başlamasını garanti altına al.
      if (conversationHistory.length > 20) {
        conversationHistory = conversationHistory.slice(-20);
      }
      
      addChatMessage('ai', reply);
    } else {
      const errMsg = data?.error?.message || 'Bilinmeyen hata';
      addChatMessage('ai', `⚠️ Hata: ${errMsg}`);
    }
  } catch (err) {
    const t = document.getElementById('typing-indicator');
    if (t) t.remove();
    addChatMessage('ai', `⚠️ Bağlantı hatası. İnternet bağlantınızı ve API key'i kontrol edin.`);
    // Hata durumunda newUserMessage kalıcı conversationHistory'ye eklenmediği için geçmiş bozulmaz.
  } finally {
    input.disabled = false;
    input.focus();
  }
}

function clearChat() {
  conversationHistory = [];
  if (typeof chatHistory !== 'undefined') chatHistory['guest'] = [];
  if (typeof saveChats === 'function') saveChats();
  
  const msgs = document.getElementById('chat-messages');
  if (msgs) msgs.innerHTML = '';
  
  if (typeof addLog === 'function') addLog('Sohbet temizlendi', 'info');
  if (typeof showToast === 'function') showToast('💬 Sohbet temizlendi');
}
// ============================================================
// RIGHT PANEL SYSTEM
// ============================================================
let activeRightPanel = null;

function toggleRightPanel(panel) {
  const content    = document.getElementById('right-panel-content');
  const pseudoP    = document.getElementById('pseudo-panel');
  const chatP      = document.getElementById('chat-panel');
  const bigoP      = document.getElementById('bigo-panel');
  const historyP   = document.getElementById('history-panel');
  const tabPseudo  = document.getElementById('rtab-pseudo');
  const tabChat    = document.getElementById('rtab-chat');
  const tabBigo    = document.getElementById('rtab-bigo');
  const tabHistory = document.getElementById('rtab-history');

  if (activeRightPanel === panel) {
    content.classList.remove('open');
    activeRightPanel = null;
    [tabPseudo, tabChat, tabBigo, tabHistory].forEach(t => t && t.classList.remove('active'));
  } else {
    activeRightPanel = panel;
    content.classList.add('open');
    pseudoP.classList.toggle('active',  panel === 'pseudo');
    chatP.classList.toggle('active',    panel === 'chat');
    bigoP.classList.toggle('active',    panel === 'bigo');
    historyP.classList.toggle('active', panel === 'history');
    tabPseudo.classList.toggle('active',  panel === 'pseudo');
    tabChat.classList.toggle('active',    panel === 'chat');
    if (tabBigo)    tabBigo.classList.toggle('active',    panel === 'bigo');
    if (tabHistory) tabHistory.classList.toggle('active', panel === 'history');
    if (panel === 'pseudo')  renderPseudoCode(currentTree);
    if (panel === 'bigo')    renderBigO(currentTree);
    if (panel === 'history') renderHistoryPanel();
  }
  setTimeout(() => fitTreeToView(), 350);
}

// ============================================================
// PSEUDO-CODE DATA
// ============================================================
const pseudoData = {
  avl: {
    badge: 'AVL',
    sections: [
      { title: 'Insert(value)', lines: [
        { text: 'function insert(node, value):' },
        { text: '  if node == null:' },
        { text: '    return new Node(value)   // ← leaf' },
        { text: '  if value < node.key:' },
        { text: '    node.left = insert(left, value)' },
        { text: '  else if value > node.key:' },
        { text: '    node.right = insert(right, value)' },
        { text: '  updateHeight(node)' },
        { text: '  return balance(node)' },
      ]},
      { title: 'Balance(node)', lines: [
        { text: 'function balance(node):' },
        { text: '  bf = height(left) - height(right)' },
        { text: '  if bf > 1:  // left heavy' },
        { text: '    if bf(left) < 0: rotateLeft(left)' },
        { text: '    return rotateRight(node)' },
        { text: '  if bf < -1: // right heavy' },
        { text: '    if bf(right) > 0: rotateRight(right)' },
        { text: '    return rotateLeft(node)' },
        { text: '  return node   // already balanced' },
      ]},
    ],
    complexity: [
      { label: 'Insert', val: 'O(log n)', cls: 'c-good' },
      { label: 'Delete', val: 'O(log n)', cls: 'c-good' },
      { label: 'Search', val: 'O(log n)', cls: 'c-good' },
      { label: 'Space',  val: 'O(n)',     cls: 'c-medium' },
    ],
  },
  rb: {
    badge: 'Red-Black',
    sections: [
      { title: 'Insert + Fix(node)', lines: [
        { text: 'function insert(value):' },
        { text: '  node = bstInsert(value)' },
        { text: '  node.color = RED' },
        { text: '  fixInsert(node)' },
        { text: '' },
        { text: 'function fixInsert(z):' },
        { text: '  while parent(z).color == RED:' },
        { text: '    uncle = getUncle(z)' },
        { text: '    if uncle.color == RED:' },
        { text: '      recolor(parent, uncle, gp)  ' },
        { text: '    else:' },
        { text: '      rotate + recolor' },
        { text: '  root.color = BLACK' },
      ]},
      { title: 'RB Properties', lines: [
        { text: '  1. Every node: RED or BLACK' },
        { text: '  2. Root is always BLACK' },
        { text: '  3. Red node → BLACK children' },
        { text: '  4. Equal black-height on all paths' },
      ]},
    ],
    complexity: [
      { label: 'Insert', val: 'O(log n)', cls: 'c-good' },
      { label: 'Delete', val: 'O(log n)', cls: 'c-good' },
      { label: 'Search', val: 'O(log n)', cls: 'c-good' },
      { label: 'Space',  val: 'O(n)',     cls: 'c-medium' },
    ],
  },
  btree: {
    badge: 'B-Tree',
    sections: [
      { title: 'Insert(value)', lines: [
        { text: 'function insert(value):' },
        { text: '  if root is full:' },
        { text: '    newRoot = Node()' },
        { text: '    splitChild(newRoot, root)' },
        { text: '    root = newRoot' },
        { text: '  insertNonFull(root, value)' },
      ]},
      { title: 'SplitChild(parent, i)', lines: [
        { text: 'function splitChild(x, i):' },
        { text: '  y = x.children[i]  // full child' },
        { text: '  z = new Node(y.leaf)' },
        { text: '  // promote median key to parent' },
        { text: '  x.keys.insert(y.keys[t-1])' },
        { text: '  z.keys = y.keys[t .. 2t-2]' },
        { text: '  y.keys = y.keys[0 .. t-2]' },
      ]},
      { title: 'Properties', lines: [
        { text: '  Min keys per node: t-1' },
        { text: '  Max keys per node: 2t-1' },
        { text: '  All leaves at same depth' },
      ]},
    ],
    complexity: [
      { label: 'Insert', val: 'O(t·log n)', cls: 'c-good' },
      { label: 'Delete', val: 'O(t·log n)', cls: 'c-good' },
      { label: 'Search', val: 'O(t·log n)', cls: 'c-good' },
      { label: 'Space',  val: 'O(n)',       cls: 'c-medium' },
    ],
  },
};
// ============================================================
// BIG O DATA
// ============================================================
const bigOData = {
  avl: {
    note: '<b>AVL Tree</b>, her düğümde denge faktörünü (BF) −1..+1 arasında tutar. Rotasyonlar O(1) zaman alır ancak insert/delete başına birden fazla rotasyon tetiklenebilir.',
    ops: [
      { name: 'Search',   best: ['O(log n)','good'],  avg: ['O(log n)','good'],  worst: ['O(log n)','good']  },
      { name: 'Insert',   best: ['O(log n)','good'],  avg: ['O(log n)','good'],  worst: ['O(log n)','good']  },
      { name: 'Delete',   best: ['O(log n)','good'],  avg: ['O(log n)','good'],  worst: ['O(log n)','good']  },
      { name: 'Rotation', best: ['O(1)','good'],      avg: ['O(1)','good'],      worst: ['O(log n)','good']  },
      { name: 'Space',    best: ['O(n)','medium'],    avg: ['O(n)','medium'],    worst: ['O(n)','medium']    },
    ],
  },
  rb: {
    note: '<b>Red-Black Tree</b>, AVL\'den daha az sıkı dengeli; rotasyon sayısı insert\'te max 2, delete\'te max 3 ile sınırlıdır. Pratikte yazma ağırlıklı workload\'larda tercih edilir.',
    ops: [
      { name: 'Search',   best: ['O(log n)','good'],  avg: ['O(log n)','good'],  worst: ['O(log n)','good']  },
      { name: 'Insert',   best: ['O(log n)','good'],  avg: ['O(log n)','good'],  worst: ['O(log n)','good']  },
      { name: 'Delete',   best: ['O(log n)','good'],  avg: ['O(log n)','good'],  worst: ['O(log n)','good']  },
      { name: 'Rotation', best: ['O(1)','good'],      avg: ['O(1)','good'],      worst: ['O(1)','good']      },
      { name: 'Space',    best: ['O(n)','medium'],    avg: ['O(n)','medium'],    worst: ['O(n)','medium']    },
    ],
  },
  btree: {
    note: '<b>B-Tree (t=2)</b>, her node\'da birden fazla anahtar tutar. <b>t</b> minimum derece; bir node en fazla <b>2t−1</b> anahtar içerebilir. Disk I/O\'yu minimize etmek için tasarlanmıştır.',
    ops: [
      { name: 'Search',   best: ['O(log n)','good'],  avg: ['O(t·log n)','good'],   worst: ['O(t·log n)','good']   },
      { name: 'Insert',   best: ['O(log n)','good'],  avg: ['O(t·log n)','good'],   worst: ['O(t·log n)','good']   },
      { name: 'Delete',   best: ['O(log n)','good'],  avg: ['O(t·log n)','good'],   worst: ['O(t·log n)','good']   },
      { name: 'Split',    best: ['O(1)','good'],      avg: ['O(t)','good'],         worst: ['O(t)','good']         },
      { name: 'Space',    best: ['O(n)','medium'],    avg: ['O(n)','medium'],       worst: ['O(n)','medium']       },
    ],
  },
};
// ============================================================
// BIG O DATA
// ============================================================
function renderBigO(treeType) {
  const data = bigOData[treeType];
  if (!data) return;
  const area = document.getElementById('bigo-area');
  if (!area) return;

  const names = { avl: 'AVL Tree', rb: 'Red-Black Tree', btree: 'B-Tree (t = 2)' };

  let html = `<div class="bigo-tree-title">${names[treeType] || treeType}</div>`;
  html += `<table class="bigo-table">
    <thead><tr>
      <th>Operation</th>
      <th>Best</th>
      <th>Average</th>
      <th>Worst</th>
    </tr></thead><tbody>`;

  data.ops.forEach(op => {
    html += `<tr>
      <td class="bigo-op">${op.name}</td>
      <td><span class="bigo-badge ${op.best[1]}">${op.best[0]}</span></td>
      <td><span class="bigo-badge ${op.avg[1]}">${op.avg[0]}</span></td>
      <td><span class="bigo-badge ${op.worst[1]}">${op.worst[0]}</span></td>
    </tr>`;
  });

  html += `</tbody></table>`;
  html += `<div class="bigo-note">${data.note}</div>`;

  // Comparison card
  html += `<div class="bigo-compare">
    <div class="bigo-compare-title">🏆 Karşılaştırma — Search/Insert/Delete</div>
    <div class="bigo-compare-row"><span class="bigo-compare-tree">AVL Tree</span><span class="bigo-compare-val">O(log n) — Strict</span></div>
    <div class="bigo-compare-row"><span class="bigo-compare-tree">Red-Black</span><span class="bigo-compare-val">O(log n) — Relaxed</span></div>
    <div class="bigo-compare-row"><span class="bigo-compare-tree">B-Tree</span><span class="bigo-compare-val">O(t·log n) — Disk</span></div>
  </div>`;

  area.innerHTML = html;
}

let currentHighlightedLines = new Set();

function renderPseudoCode(treeType, stepKind) {
  const data = pseudoData[treeType];
  if (!data) return;
  const badge = document.getElementById('pseudo-tree-badge');
  if (badge) badge.textContent = data.badge;
  const area = document.getElementById('pseudo-code-area');
  if (!area) return;
  area.innerHTML = '';
  let lineGlobalIndex = 0;
  data.sections.forEach(section => {
    const titleEl = document.createElement('div');
    titleEl.className = 'pseudo-section-title';
    titleEl.textContent = section.title;
    area.appendChild(titleEl);
    section.lines.forEach(lineData => {
      const lineEl = document.createElement('div');
      lineEl.className = 'pseudo-line';
      lineEl.dataset.lineIndex = lineGlobalIndex;
      const numEl = document.createElement('span');
      numEl.className = 'pseudo-num';
      numEl.textContent = lineGlobalIndex + 1;
      lineEl.appendChild(numEl);
      const textEl = document.createElement('span');
      textEl.className = 'pseudo-text';
      if (!lineData.text) { textEl.innerHTML = '&nbsp;'; }
      else { textEl.innerHTML = syntaxColor(lineData.text); }
      lineEl.appendChild(textEl);
      if (currentHighlightedLines.has(lineGlobalIndex)) lineEl.classList.add('highlighted');
      area.appendChild(lineEl);
      lineGlobalIndex++;
    });
  });
  const bar = document.getElementById('complexity-bar');
  if (bar) {
    bar.innerHTML = '';
    data.complexity.forEach(c => {
      const row = document.createElement('div');
      row.className = 'complexity-row';
      row.innerHTML = `<span class="complexity-label">${c.label}</span>
        <span class="complexity-val ${c.cls}">${c.val}</span>`;
      bar.appendChild(row);
    });
  }
}

function syntaxColor(text) {
  const keywords = ['function', 'if', 'else', 'while', 'return', 'new', 'null'];
  let result = '', i = 0;
  while (i < text.length) {
    if (text[i] === '/' && text[i+1] === '/') {
      result += `<span class="pseudo-cm">${escHtml(text.slice(i))}</span>`; break;
    }
    let matched = false;
    for (const kw of keywords) {
      if (text.slice(i, i+kw.length) === kw &&
          (i+kw.length >= text.length || !/\w/.test(text[i+kw.length])) &&
          (i === 0 || !/\w/.test(text[i-1]))) {
        result += `<span class="pseudo-kw">${kw}</span>`;
        i += kw.length; matched = true; break;
      }
    }
    if (matched) continue;
    if (/[0-9]/.test(text[i]) && (i === 0 || !/\w/.test(text[i-1]))) {
      let num = '';
      while (i < text.length && /[\d.tn\-+]/.test(text[i])) { num += text[i]; i++; }
      result += `<span class="pseudo-num-val">${escHtml(num)}</span>`; continue;
    }
    result += escHtml(text[i]); i++;
  }
  return result;
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function highlightPseudoLines(stepKind) {
  if (!activeRightPanel || activeRightPanel !== 'pseudo') return;
  const kindMap = {
    new:     [2], path: [3,4,5,6], rotate: [7,8],
    recolor: [9,10,11,12], found: [], delete: [7,8], info: [],
  };
  currentHighlightedLines = new Set(kindMap[stepKind] || []);
  renderPseudoCode(currentTree);
  const area = document.getElementById('pseudo-code-area');
  if (!area) return;
  const hl = area.querySelector('.pseudo-line.highlighted');
  if (hl) hl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ============================================================
// AVL SERIALIZE / DESERIALIZE  (snapshot helpers)
// ============================================================
function serializeAVL(node) {
  if (!node) return null;
  return {
    val:    node.val,
    height: node.height,
    bf:     node.bf,
    id:     node.id,
    left:   serializeAVL(node.left),
    right:  serializeAVL(node.right)
  };
}

function deserializeAVL(data) {
  if (!data) return null;
  let node   = new AVLNode(data.val);
  node.height = data.height;
  node.bf     = data.bf;
  node.id     = data.id;
  node.left   = deserializeAVL(data.left);
  node.right  = deserializeAVL(data.right);
  return node;
}

// ── Stub for history log called from demoRotation ──
function addToHistoryLog(type, label) {
  addLog(label, type);
}

// ============================================================
// STATE
// ============================================================
let currentTree = 'avl';
let animSpeed   = 800;
let stepQueue   = [];
let stepIndex   = 0;
let isPlaying   = false;
let playTimer   = null;
let metrics     = { rotations: 0, ops: 0 };

// ============================================================
// AVL TREE
// ============================================================
class AVLNode {
  constructor(val) {
    this.val = val; this.left = null; this.right = null;
    this.height = 1; this.bf = 0;
    this.id = 'n' + Math.random().toString(36).substr(2, 8);
  }
}

class AVLTree {
  constructor() { this.root = null; }
  height(n) { return n ? n.height : 0; }
  bf(n)     { return n ? this.height(n.left) - this.height(n.right) : 0; }
  update(n) {
    if (!n) return;
    n.height = 1 + Math.max(this.height(n.left), this.height(n.right));
    n.bf = this.bf(n);
  }
  
  rotateRight(y, steps) {
    let x = y.left, T2 = x.right;
    steps.push({ type: 'rotate', desc: `${y.val} üzerinde sağ rotasyon`, highlight: [y.id, x.id], kind: 'rotate' });
    x.right = y; y.left = T2;
    this.update(y); this.update(x);
    metrics.rotations++; return x;
  }
  rotateLeft(x, steps) {
    let y = x.right, T2 = y.left;
    steps.push({ type: 'rotate', desc: `${x.val} üzerinde sol rotasyon`, highlight: [x.id, y.id], kind: 'rotate' });
    y.left = x; x.right = T2;
    this.update(x); this.update(y);
    metrics.rotations++; return y;
  }
  balance(n, steps) {
  this.update(n);

  if (n.bf > 1) {
    const leftBf = this.bf(n.left);
    if (leftBf >= 0) {
      // LL Case
      steps.push({ type:'rotate', desc:`⚠️ LL Dengesizliği — ${n.val} sol ağırlıklı (BF=${n.bf}), sağ rotasyon uygulanacak`, highlight:[n.id, n.left?.id].filter(Boolean), kind:'rotate' });
      const result = this.rotateRight(n, steps);
      steps.push({ type:'rotate', desc:`✓ LL Rotasyonu tamamlandı — ${result.val} yeni üst düğüm`, highlight:[result.id], kind:'new' });
      return result;
    } else {
      // LR Case
      steps.push({ type:'rotate', desc:`⚠️ LR Dengesizliği — ${n.val} sol ağırlıklı, sol çocuk sağ ağırlıklı — çift rotasyon`, highlight:[n.id, n.left?.id].filter(Boolean), kind:'rotate' });
      steps.push({ type:'rotate', desc:`LR Adım 1/2 — ${n.left.val} üzerinde sol rotasyon`, highlight:[n.left?.id].filter(Boolean), kind:'rotate' });
      n.left = this.rotateLeft(n.left, steps);
      steps.push({ type:'rotate', desc:`LR Adım 2/2 — ${n.val} üzerinde sağ rotasyon`, highlight:[n.id], kind:'rotate' });
      const result = this.rotateRight(n, steps);
      steps.push({ type:'rotate', desc:`✓ LR Rotasyonu tamamlandı — ${result.val} yeni üst düğüm`, highlight:[result.id], kind:'new' });
      return result;
    }
  }

  if (n.bf < -1) {
    const rightBf = this.bf(n.right);
    if (rightBf <= 0) {
      // RR Case
      steps.push({ type:'rotate', desc:`⚠️ RR Dengesizliği — ${n.val} sağ ağırlıklı (BF=${n.bf}), sol rotasyon uygulanacak`, highlight:[n.id, n.right?.id].filter(Boolean), kind:'rotate' });
      const result = this.rotateLeft(n, steps);
      steps.push({ type:'rotate', desc:`✓ RR Rotasyonu tamamlandı — ${result.val} yeni üst düğüm`, highlight:[result.id], kind:'new' });
      return result;
    } else {
      // RL Case
      steps.push({ type:'rotate', desc:`⚠️ RL Dengesizliği — ${n.val} sağ ağırlıklı, sağ çocuk sol ağırlıklı — çift rotasyon`, highlight:[n.id, n.right?.id].filter(Boolean), kind:'rotate' });
      steps.push({ type:'rotate', desc:`RL Adım 1/2 — ${n.right.val} üzerinde sağ rotasyon`, highlight:[n.right?.id].filter(Boolean), kind:'rotate' });
      n.right = this.rotateRight(n.right, steps);
      steps.push({ type:'rotate', desc:`RL Adım 2/2 — ${n.val} üzerinde sol rotasyon`, highlight:[n.id], kind:'rotate' });
      const result = this.rotateLeft(n, steps);
      steps.push({ type:'rotate', desc:`✓ RL Rotasyonu tamamlandı — ${result.val} yeni üst düğüm`, highlight:[result.id], kind:'new' });
      return result;
    }
  }

  return n;
}
_insert(n, val, steps) {

    // yeni düğüm
    if (!n) {
        const node = new AVLNode(val);

        steps.push({
            type:'insert',
            desc:`${val} eklendi`,
            highlight:[node.id],
            kind:'new'
        });

        return node;
    }

    // ağacın içinde ilerleme
    steps.push({
        type:'visit',
        desc:`${val} ile ${n.val} karşılaştırılıyor`,
        highlight:[n.id],
        kind:'path'
    });

    if (val < n.val) {
        n.left = this._insert(n.left,val,steps);

    } else if (val > n.val) {
        n.right = this._insert(n.right,val,steps);

    } else {

        steps.push({
            type:'info',
            desc:`${val} zaten mevcut`,
            highlight:[n.id],
            kind:'found'
        });

        return n;
    }

    // yükseklik güncelle
    this.update(n);

    steps.push({
        type:'info',
        desc:`${n.val} düğümü güncellendi — BF=${n.bf}`,
        highlight:[n.id],
        kind:'info'
    });

    // ASIL DENGELEME
    return this.balance(n,steps);
}
insert(val){

    const steps=[{
        type:'info',
        desc:`${val} AVL ağacına ekleniyor`,
        highlight:[],
        kind:'info'
    }];

    this.root=this._insert(
        this.root,
        val,
        steps
    );

    return steps;
}
  _delete(n, val, steps, found) {
    if (!n) return null;
    if (val < n.val) {
      n.left = this._delete(n.left, val, steps, found);
    } else if (val > n.val) {
      n.right = this._delete(n.right, val, steps, found);
    } else {
      found.hit = true;
      steps.push({ type: 'delete', desc: `${val} siliniyor`, highlight: [n.id], kind: 'delete' });
      if (!n.left) return n.right;
      if (!n.right) return n.left;
      let successor = n.right;
      while (successor.left) successor = successor.left;
      steps.push({ type: 'info', desc: `Inorder halef: ${successor.val} ile değiştiriliyor`, highlight: [successor.id], kind: 'path' });
      n.val = successor.val;
      n.right = this._delete(n.right, successor.val, steps, { hit: false });
    }
    this.update(n);
    return this.balance(n, steps);
  }

  // Sadece arama — ağaca dokunmaz, snapshot bazlı path adımları üretir
  _searchPath(n, val, steps, currentRoot) {
    if (!n) return false;
    // Bu node'u turuncu ile highlight'la — ağaç bozulmamış halde göster
    steps.push({
      type: 'visit',
      desc: `${n.val} ziyaret ediliyor`,
      highlight: [n.id],
      kind: 'path',
      avlSnapshot: serializeAVL(currentRoot),
    });
    if (val === n.val) {
      steps.push({
        type: 'found',
        desc: `${val} bulundu — silme başlıyor`,
        highlight: [n.id],
        kind: 'found',
        avlSnapshot: serializeAVL(currentRoot),
      });
      return true;
    }
    return val < n.val
      ? this._searchPath(n.left,  val, steps, currentRoot)
      : this._searchPath(n.right, val, steps, currentRoot);
  }

  delete(val) {
    const steps = [{ type: 'info', desc: `${val} AVL ağacında aranıyor`, highlight: [], kind: 'info', avlSnapshot: serializeAVL(this.root) }];

    // Faz 1 — snapshot bazlı arama, ağaca dokunmaz
    const found = this._searchPath(this.root, val, steps, this.root);

    if (!found) {
      steps.push({ type: 'info', desc: `${val} ağaçta bulunamadı`, highlight: [], kind: 'info', avlSnapshot: serializeAVL(this.root) });
      return steps;
    }

    // Faz 2 — gerçek silme; her adım kendi o-anki ara snapshot'ını taşısın
    const tmpTree = new AVLTree();
    tmpTree.root = deserializeAVL(serializeAVL(this.root));
    const deleteSteps = [];
    tmpTree.root = tmpTree._delete(tmpTree.root, val, deleteSteps, { hit: false });

    // Her adıma o anki FINAL ağaç durumunu yaz (silme tamamlandıktan sonra)
    const finalSnap = serializeAVL(tmpTree.root);
    deleteSteps.forEach(s => { s.finalSnapshot = finalSnap; });
    steps.push(...deleteSteps);

    // Gerçek ağacı güncelle
    this.root = tmpTree.root;

    return steps;
  }
  _search(n, val, steps) {
    if (!n) { steps.push({ type: 'info', desc: `${val} bulunamadı`, highlight: [], kind: 'info' }); return; }
    steps.push({ type: 'visit', desc: `${n.val} ziyaret ediliyor`, highlight: [n.id], kind: 'path' });
    if (val === n.val) { steps.push({ type: 'found', desc: `${val} bulundu!`, highlight: [n.id], kind: 'found' }); return; }
    if (val < n.val) this._search(n.left, val, steps); else this._search(n.right, val, steps);
  }
  search(val) {
    let steps = [{ type: 'info', desc: `${val} aranıyor`, highlight: [], kind: 'info' }];
    this._search(this.root, val, steps); return steps;
  }
  size(n = this.root)  { return n ? 1 + this.size(n.left) + this.size(n.right) : 0; }
  getHeight()          { return this.height(this.root); }
}

// ============================================================
// RED-BLACK TREE  (simplified animation — fewer steps)
// ============================================================
const RED = 'red', BLACK = 'black';

class RBNode {
  constructor(val) {
    this.val = val; this.color = RED;
    this.left = null; this.right = null; this.parent = null;
    this.id = 'n' + Math.random().toString(36).substr(2, 8);
  }
}

class RBTree {
  constructor() { this.root = null; this._steps = []; }
  isRed(n) { return n && n.color === RED; }

  // ── Silent rotations (no step push) ──
  rotateLeft(n) {
    let r = n.right;
    n.right = r.left;
    if (r.left) r.left.parent = n;
    r.parent = n.parent;
    if (!n.parent)                this.root = r;
    else if (n === n.parent.left) n.parent.left  = r;
    else                          n.parent.right = r;
    r.left = n; n.parent = r;
    metrics.rotations++;
  }

  rotateRight(n) {
    let l = n.left;
    n.left = l.right;
    if (l.right) l.right.parent = n;
    l.parent = n.parent;
    if (!n.parent)                 this.root = l;
    else if (n === n.parent.right) n.parent.right = l;
    else                           n.parent.left  = l;
    l.right = n; n.parent = l;
    metrics.rotations++;
  }

  // ── Insert: only 3 clean steps ──
  insert(val) {
    this._steps = [{ type: 'info', desc: `${val} Red-Black ağacına ekleniyor`, highlight: [], kind: 'info' }];
    let node = new RBNode(val);
    let inserted = this._bstInsert(node);
    if (!inserted) {
      this._steps.push({ type: 'info', desc: `${val} zaten ağaçta mevcut`, highlight: [], kind: 'found' });
      return this._steps;
    }
    this._steps.push({ type: 'insert', desc: `${val} KIRMIZI düğüm olarak eklendi`, highlight: [node.id], kind: 'new' });
    let hadFix = this._fixInsert(node);
    if (hadFix) {
      this._steps.push({ type: 'rotate', desc: `Ağaç yeniden dengelendi — RB özellikleri sağlandı ✓`, highlight: [], kind: 'rotate' });
    } else {
      this._steps.push({ type: 'info', desc: `Düzeltme gerekmedi — ağaç zaten geçerli ✓`, highlight: [], kind: 'info' });
    }
    return this._steps;
  }

  _bstInsert(node) {
    let cur = this.root, par = null;
    while (cur) {
      par = cur;
      if      (node.val < cur.val) cur = cur.left;
      else if (node.val > cur.val) cur = cur.right;
      else return false; // duplicate
    }
    node.parent = par;
    if (!par)                    this.root = node;
    else if (node.val < par.val) par.left  = node;
    else                         par.right = node;
    return true;
  }

  _fixInsert(z) {
    let fixed = false;
    while (z !== this.root && this.isRed(z.parent)) {
      let p = z.parent, g = p.parent;
      if (!g) break;
      fixed = true;
      if (p === g.left) {
        let uncle = g.right;
        if (this.isRed(uncle)) {
          p.color = BLACK; uncle.color = BLACK; g.color = RED; z = g;
        } else {
          if (z === p.right) { z = p; this.rotateLeft(z); p = z.parent; g = p?.parent; if (!g) break; }
          p.color = BLACK; g.color = RED; this.rotateRight(g);
        }
      } else {
        let uncle = g.left;
        if (this.isRed(uncle)) {
          p.color = BLACK; uncle.color = BLACK; g.color = RED; z = g;
        } else {
          if (z === p.left) { z = p; this.rotateRight(z); p = z.parent; g = p?.parent; if (!g) break; }
          p.color = BLACK; g.color = RED; this.rotateLeft(g);
        }
      }
    }
    this.root.color = BLACK;
    return fixed;
  }

  // ── Delete: 3 clean steps ──
  delete(val) {
    this._steps = [{ type: 'info', desc: `${val} Red-Black ağacından siliniyor`, highlight: [], kind: 'info' }];
    let node = this._find(val);
    if (!node) {
      this._steps.push({ type: 'info', desc: `${val} ağaçta bulunamadı`, highlight: [], kind: 'info' });
      return this._steps;
    }
    this._steps.push({ type: 'delete', desc: `${val} bulundu — düğüm siliniyor`, highlight: [node.id], kind: 'delete' });
    this._rbDelete(node);
    this._steps.push({ type: 'info', desc: `Silme tamamlandı — ağaç yeniden dengelendi ✓`, highlight: [], kind: 'info' });
    return this._steps;
  }

  _find(val) {
    let cur = this.root;
    while (cur) {
      if (val === cur.val) return cur;
      cur = val < cur.val ? cur.left : cur.right;
    }
    return null;
  }

  _rbDelete(z) {
    let y = z, yOrigColor = y.color, x;
    if (!z.left) { x = z.right; this._transplant(z, z.right); }
    else if (!z.right) { x = z.left; this._transplant(z, z.left); }
    else {
      y = this._min(z.right); yOrigColor = y.color; x = y.right;
      if (y.parent === z) { if (x) x.parent = y; }
      else { this._transplant(y, y.right); y.right = z.right; if (y.right) y.right.parent = y; }
      this._transplant(z, y);
      y.left = z.left; if (y.left) y.left.parent = y;
      y.color = z.color;
    }
  }

  _transplant(u, v) {
    if (!u.parent)                this.root = v;
    else if (u === u.parent.left) u.parent.left  = v;
    else                          u.parent.right = v;
    if (v) v.parent = u.parent;
  }

  _min(n) { while (n.left) n = n.left; return n; }

  // ── Search: keeps step-by-step path (useful to see) ──
  search(val) {
    let steps = [{ type: 'info', desc: `${val} RB ağacında aranıyor`, highlight: [], kind: 'info' }];
    let cur = this.root;
    while (cur) {
      const renk = cur.color === 'red' ? 'kırmızı' : 'siyah';
      steps.push({ type: 'visit', desc: `${cur.val} ziyaret ediliyor (${renk})`, highlight: [cur.id], kind: 'path' });
      if (val === cur.val) { steps.push({ type: 'found', desc: `${val} bulundu!`, highlight: [cur.id], kind: 'found' }); return steps; }
      cur = val < cur.val ? cur.left : cur.right;
    }
    steps.push({ type: 'info', desc: `${val} bulunamadı`, highlight: [], kind: 'info' });
    return steps;
  }

  size(n = this.root)      { return n ? 1 + this.size(n.left) + this.size(n.right) : 0; }
  getHeight(n = this.root) { return n ? 1 + Math.max(this.getHeight(n.left), this.getHeight(n.right)) : 0; }

  toD3(n = this.root) {
    if (!n) return null;
    return { id: n.id, val: n.val, rbColor: n.color, children: [this.toD3(n.left), this.toD3(n.right)].filter(Boolean) };
  }
}

// ============================================================
// B-TREE
// ============================================================
class BTreeNode {
  constructor(leaf = false) {
    this.keys = []; this.children = []; this.leaf = leaf;
    this.id = 'bn' + Math.random().toString(36).substr(2, 8);
  }
}

class BTree {
  constructor(t = 2) { this.t = t; this.root = new BTreeNode(true); this._steps = []; }

  insert(val) {
    this._steps = [{ type: 'info', desc: `${val} B-Ağacına ekleniyor (t=${this.t})`, highlight: [], kind: 'info' }];
    let r = this.root;
    if (r.keys.length === 2 * this.t - 1) {
      let s = new BTreeNode(false);
      this.root = s; s.children.push(r);
      this._steps.push({ type: 'split', desc: `Kök düğüm dolu — kök bölünüyor`, highlight: [r.id], kind: 'rotate' });
      this._splitChild(s, 0); this._insertNonFull(s, val);
    } else { this._insertNonFull(r, val); }
    return this._steps;
  }

  _insertNonFull(n, val) {
    let i = n.keys.length - 1;
    if (n.leaf) {
      while (i >= 0 && val < n.keys[i]) i--;
      n.keys.splice(i + 1, 0, val);
      this._steps.push({ type: 'insert', desc: `${val} yaprak düğüme eklendi`, highlight: [n.id], kind: 'new' });
    } else {
      while (i >= 0 && val < n.keys[i]) i--; i++;
      this._steps.push({ type: 'visit', desc: `${i}. çocuğa iniliyor`, highlight: [n.id], kind: 'path' });
      if (n.children[i].keys.length === 2 * this.t - 1) {
        this._steps.push({ type: 'split', desc: `Çocuk düğüm dolu — bölünüyor`, highlight: [n.children[i].id], kind: 'rotate' });
        this._splitChild(n, i); if (val > n.keys[i]) i++;
      }
      this._insertNonFull(n.children[i], val);
    }
  }

  _splitChild(x, i) {
    let t = this.t, y = x.children[i], z = new BTreeNode(y.leaf);
    x.children.splice(i + 1, 0, z);
    x.keys.splice(i, 0, y.keys[t - 1]);
    z.keys = y.keys.splice(t, t - 1);
    y.keys.pop();
    if (!y.leaf) z.children = y.children.splice(t, t);
  }

  delete(val) {
    this._steps = [{ type: 'info', desc: `${val} B-Ağacından siliniyor`, highlight: [], kind: 'info' }];
    this._delete(this.root, val);
    if (this.root.keys.length === 0 && this.root.children.length > 0) this.root = this.root.children[0];
    return this._steps;
  }

  _delete(n, val) {
    let t = this.t;
    let i = n.keys.findIndex(k => k >= val);
    if (i === -1) i = n.keys.length;
    if (i < n.keys.length && n.keys[i] === val) {
      this._steps.push({ type: 'delete', desc: `${val} düğümde bulundu — siliniyor`, highlight: [n.id], kind: 'delete' });
      if (n.leaf) { n.keys.splice(i, 1); }
      else {
        if (n.children[i].keys.length >= t) { let pred = this._getPred(n.children[i]); n.keys[i] = pred; this._delete(n.children[i], pred); }
        else if (n.children[i+1].keys.length >= t) { let succ = this._getSucc(n.children[i+1]); n.keys[i] = succ; this._delete(n.children[i+1], succ); }
        else { this._merge(n, i); this._delete(n.children[i], val); }
      }
    } else {
      if (n.leaf) { this._steps.push({ type: 'info', desc: `${val} ağaçta bulunamadı`, highlight: [], kind: 'info' }); return; }
      this._steps.push({ type: 'visit', desc: `${i}. çocuğa iniliyor`, highlight: [n.id], kind: 'path' });
      if (n.children[i].keys.length < t) this._fill(n, i);
      if (i > n.keys.length) this._delete(n.children[i-1], val);
      else                   this._delete(n.children[i],   val);
    }
  }

  _getPred(n) { while (!n.leaf) n = n.children[n.children.length-1]; return n.keys[n.keys.length-1]; }
  _getSucc(n) { while (!n.leaf) n = n.children[0]; return n.keys[0]; }
  _fill(n, i) {}

  _merge(n, i) {
    let child = n.children[i], sib = n.children[i+1];
    child.keys.push(n.keys[i]);
    child.keys = child.keys.concat(sib.keys);
    child.children = child.children.concat(sib.children);
    n.keys.splice(i, 1); n.children.splice(i+1, 1);
    this._steps.push({ type: 'merge', desc: `${i}. indeksteki çocuklar birleştirildi`, highlight: [child.id], kind: 'rotate' });
  }

  search(val) {
    let steps = [{ type: 'info', desc: `${val} B-Ağacında aranıyor`, highlight: [], kind: 'info' }];
    this._search(this.root, val, steps); return steps;
  }

  _search(n, val, steps) {
    if (!n) return;
    steps.push({ type: 'visit', desc: `Düğüm kontrol ediliyor [${n.keys.join(', ')}]`, highlight: [n.id], kind: 'path' });
    let i = 0;
    while (i < n.keys.length && val > n.keys[i]) i++;
    if (i < n.keys.length && n.keys[i] === val) { steps.push({ type: 'found', desc: `${val} bulundu!`, highlight: [n.id], kind: 'found' }); return; }
    if (n.leaf) { steps.push({ type: 'info', desc: `${val} ağaçta bulunamadı`, highlight: [], kind: 'info' }); return; }
    this._search(n.children[i], val, steps);
  }

  size(n = this.root)      { if (!n) return 0; return n.keys.length + n.children.reduce((a, c) => a + this.size(c), 0); }
  getHeight(n = this.root) { if (!n || n.leaf) return 1; return 1 + this.getHeight(n.children[0]); }
}

// ============================================================
// TREE INSTANCES
// ============================================================
let trees = { avl: new AVLTree(), rb: new RBTree(), btree: new BTree(2) };

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// ============================================================
// D3 VISUALIZATION
// ============================================================
const svg = d3.select('#tree-svg');
let g = svg.append('g');
let defs = svg.append('defs');
let zoom = d3.zoom().scaleExtent([0.1, 4]).on('zoom', e => g.attr('transform', e.transform));
svg.call(zoom);

function treeToD3(tree) {
  if (currentTree === 'avl')   return nodeToD3_avl(tree.root);
  if (currentTree === 'rb')    return tree.toD3();
  if (currentTree === 'btree') return nodeToD3_btree(tree.root);
}

function nodeToD3_avl(n) {
  if (!n) return null;
  let obj = { id: n.id, val: n.val, bf: n.bf, children: [] };
  if (n.left)  obj.children.push(nodeToD3_avl(n.left));
  if (n.right) obj.children.push(nodeToD3_avl(n.right));
  if (!obj.children.length) delete obj.children;
  return obj;
}

function nodeToD3_btree(n) {
  if (!n) return null;
  let obj = { id: n.id, val: n.keys.join(','), keys: n.keys, children: [] };
  for (let c of n.children) { let d = nodeToD3_btree(c); if (d) obj.children.push(d); }
  if (!obj.children.length) delete obj.children;
  return obj;
}

function highlightFill(kind) {
  const map = {
    new:       cssVar('--node-new'),
    path:      cssVar('--node-path'),
    found:     cssVar('--node-found'),
    delete:    cssVar('--node-del'),
    rotate:    cssVar('--node-rot'),
    recolor:   cssVar('--node-rcol'),
    highlight: cssVar('--node-found'),
    info:      cssVar('--text-muted'),
  };
  return map[kind] || cssVar('--accent2');
}

function buildGradients() {
  defs.selectAll('*').remove();

  // AVL / BTree normal node gradient
  let ng = defs.append('radialGradient')
    .attr('id', 'grad-node-normal').attr('cx', '35%').attr('cy', '30%').attr('r', '65%');
  ng.append('stop').attr('offset', '0%')  .attr('stop-color', cssVar('--node-fill-a')).attr('stop-opacity', 1);
  ng.append('stop').attr('offset', '100%').attr('stop-color', cssVar('--bg2'))         .attr('stop-opacity', 1);

  // Highlight gradients for AVL/BTree
  ['new','path','found','delete','rotate','recolor'].forEach(kind => {
    let c = highlightFill(kind);
    let kg = defs.append('radialGradient')
      .attr('id', `grad-hl-${kind}`).attr('cx', '35%').attr('cy', '30%').attr('r', '65%');
    kg.append('stop').attr('offset', '0%')  .attr('stop-color', '#fff').attr('stop-opacity', 0.55);
    kg.append('stop').attr('offset', '100%').attr('stop-color', c)      .attr('stop-opacity', 1);
  });

  // Subtle glow filter (AVL/BTree only)
  let filter = defs.append('filter').attr('id', 'glow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
  filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
  let feMerge = filter.append('feMerge');
  feMerge.append('feMergeNode').attr('in', 'coloredBlur');
  feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
}

function fitTreeToView() {
  const tree = trees[currentTree];
  const data = treeToD3(tree);
  if (!data) return;
  const svgEl = document.getElementById('tree-svg');
  const W = svgEl.clientWidth, H = svgEl.clientHeight;
  if (!W || !H) return;
  const gEl = svgEl.querySelector('g');
  if (!gEl) return;
  try {
    const bbox = gEl.getBBox();
    if (!bbox.width || !bbox.height) return;
    const scale = Math.min(0.85 * W / bbox.width, 0.85 * H / bbox.height, 2.0);
    const tx = W / 2 - scale * (bbox.x + bbox.width / 2);
    const ty = H / 2 - scale * (bbox.y + bbox.height / 2);
    svg.transition().duration(300).call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
  } catch(e) {}
}

let isFirstRender = true;

function render(highlights = new Map()) {
  buildGradients();
  let tree = trees[currentTree];
  let data = treeToD3(tree);
  g.selectAll('*').remove();

  if (!data) {
    document.getElementById('empty-state').style.display = 'block';
    isFirstRender = true; updateMetrics(); return;
  }
  document.getElementById('empty-state').style.display = 'none';

  let hierarchy  = d3.hierarchy(data);
  let treeLayout = d3.tree()
    .nodeSize([currentTree === 'btree' ? 110 : 64, 90])
    .separation((a, b) => a.parent === b.parent ? 1.4 : 2.0);
  treeLayout(hierarchy);

  // Links
  g.selectAll('path.link').data(hierarchy.links()).enter().append('path')
    .attr('class', 'link')
    .attr('d', d => {
      let sx = d.source.x, sy = d.source.y, tx = d.target.x, ty = d.target.y;
      return `M${sx},${sy} C${sx},${(sy+ty)/2} ${tx},${(sy+ty)/2} ${tx},${ty}`;
    })
    .attr('stroke', cssVar('--border-h'))
    .attr('stroke-width', 2).attr('stroke-linecap', 'round')
    .attr('fill', 'none').attr('opacity', 0.6);

  // Nodes
  let node = g.selectAll('g.node').data(hierarchy.descendants()).enter()
    .append('g').attr('class', 'node node-group')
    .attr('transform', d => `translate(${d.x},${d.y})`)
    .style('cursor', 'pointer')
    .on('mouseover', function(e, d) {
      let tip = document.getElementById('node-tooltip');
      tip.style.display = 'block';
      tip.style.left = (e.pageX + 14) + 'px'; tip.style.top = (e.pageY - 14) + 'px';
      if      (currentTree === 'avl')   tip.innerHTML = `<b>${d.data.val}</b> &nbsp;·&nbsp; BF: <span style="color:${Math.abs(d.data.bf)>1?cssVar('--node-del'):cssVar('--accent2')}">${d.data.bf}</span>`;
      else if (currentTree === 'rb')    tip.innerHTML = `<b>${d.data.val}</b> &nbsp;·&nbsp; <span style="color:${d.data.rbColor==='red'?'#ef4444':cssVar('--text-muted')}">${d.data.rbColor}</span>`;
      else                              tip.innerHTML = `Keys: <b>[${d.data.keys?.join(', ')}]</b>`;
    })
    .on('mousemove', function(e) {
      let tip = document.getElementById('node-tooltip');
      tip.style.left = (e.pageX + 14) + 'px'; tip.style.top = (e.pageY - 14) + 'px';
    })
    .on('mouseout', () => { document.getElementById('node-tooltip').style.display = 'none'; });

  node.each(function(d) {
    let el    = d3.select(this);
    let id    = d.data.id;
    let isHL  = highlights.has(id);
    let hlKind = isHL ? highlights.get(id) : null;
    let hlColor = isHL ? highlightFill(hlKind) : null;

    if (currentTree === 'btree') {
      let keys = d.data.keys || [d.data.val];
      let w = Math.max(keys.length * 34 + 10, 44), h = 32;
      el.append('rect')
        .attr('x', -w/2).attr('y', -h/2).attr('width', w).attr('height', h).attr('rx', 8)
        .attr('fill',   isHL ? `url(#grad-hl-${hlKind})` : `url(#grad-node-normal)`)
        .attr('stroke', isHL ? hlColor : cssVar('--border-h'))
        .attr('stroke-width', isHL ? 2 : 1)
        .attr('filter', isHL ? 'url(#glow)' : null);
      keys.forEach((k, i) => {
        let x = -w/2 + i*34 + 17;
        el.append('text').attr('x', x).attr('y', 5).attr('text-anchor', 'middle')
          .attr('fill', '#ffffff')
          .attr('font-size', 13).attr('font-weight', 600).attr('font-family', 'JetBrains Mono, monospace').text(k);
        if (i < keys.length - 1)
          el.append('line').attr('x1', x+17).attr('y1', -h/2).attr('x2', x+17).attr('y2', h/2)
            .attr('stroke', cssVar('--border')).attr('stroke-width', 1);
      });

    } else if (currentTree === 'rb') {
      // ── Simplified RB node rendering — flat, clean colors ──
      const R = 22;
      const isRed = d.data.rbColor === 'red';

      // Base fill colors (flat, no heavy gradients)
      const baseFill   = isRed  ? '#c0392b' : '#2c3e50';
      const baseStroke = isRed  ? '#e74c3c' : '#4a5568';
      const hlFill     = isHL   ? hlColor   : baseFill;
      const hlStroke   = isHL   ? hlColor   : baseStroke;

      // Highlight ring — only on highlighted nodes
      if (isHL) {
        el.append('circle').attr('r', R + 7)
          .attr('fill', 'none').attr('stroke', hlColor)
          .attr('stroke-width', 2).attr('stroke-dasharray', '4 3')
          .attr('opacity', 0.6)
          .attr('class', 'rb-hl-ring');
      }

      // Main circle — simple flat fill
      el.append('circle').attr('r', R)
        .attr('fill',   hlFill)
        .attr('stroke', hlStroke)
        .attr('stroke-width', isHL ? 2.5 : 1.8)
        .attr('class', 'rb-node-circle');

      // Subtle top-left shine (very light)
      el.append('circle').attr('r', 7).attr('cx', -7).attr('cy', -8)
        .attr('fill', '#fff').attr('opacity', 0.08);

      // Value label
      el.append('text').attr('dy', 5).attr('text-anchor', 'middle')
        .attr('fill', '#ffffff')
        .attr('font-size', 13).attr('font-weight', 700)
        .attr('font-family', 'JetBrains Mono, monospace')
        .text(d.data.val);

      // Small color dot indicator below node
      el.append('circle').attr('r', 4).attr('cy', R + 9)
        .attr('fill', isRed ? '#e74c3c' : '#718096').attr('opacity', 0.85);

    } else {
      // AVL
      let R = 22;
      let fillId      = isHL ? `url(#grad-hl-${hlKind})` : 'url(#grad-node-normal)';
      let strokeColor = isHL ? hlColor : cssVar('--border-h');

      if (isHL) {
        el.append('circle').attr('r', R + 6)
          .attr('fill', 'none').attr('stroke', hlColor)
          .attr('stroke-width', 1.5).attr('opacity', 0.3);
      }

      el.append('circle').attr('r', R)
        .attr('fill', fillId).attr('stroke', strokeColor)
        .attr('stroke-width', isHL ? 2 : 1.5)
        .attr('filter', isHL ? 'url(#glow)' : null);

      el.append('circle').attr('r', 6).attr('cx', -7).attr('cy', -8)
        .attr('fill', '#fff').attr('opacity', 0.12);

      el.append('text').attr('dy', 5).attr('text-anchor', 'middle')
        .attr('fill', '#ffffff')
        .attr('font-size', 13).attr('font-weight', 700)
        .attr('font-family', 'JetBrains Mono, monospace').text(d.data.val);

      // BF badge
      let bf = d.data.bf;
      let bfColor = bf === 0 ? cssVar('--text-muted') : (Math.abs(bf) > 1 ? cssVar('--node-del') : cssVar('--accent4'));
      el.append('rect').attr('x', R-5).attr('y', -R-6).attr('width', 20).attr('height', 14)
        .attr('rx', 4).attr('fill', cssVar('--bg')).attr('stroke', bfColor)
        .attr('stroke-width', 1).attr('opacity', 0.9);
      el.append('text').attr('x', R+5).attr('y', -R+4).attr('text-anchor', 'middle')
        .attr('fill', bfColor).attr('font-size', 9).attr('font-weight', 700)
        .attr('font-family', 'JetBrains Mono, monospace').text(bf);
    }
  });

  if (isFirstRender) { isFirstRender = false; setTimeout(() => fitTreeToView(), 50); }
  updateMetrics();
}

// ============================================================
// OPERATIONS
// ============================================================
function doInsert() {
  let v = parseInt(document.getElementById('val-input').value);
  if (isNaN(v)) return;
  metrics.ops++;
  let steps = trees[currentTree].insert(v);
  addLog(`${v} eklendi`, 'insert');
  document.getElementById('val-input').value = '';
  queueSteps(steps);
  autoSnapshot('Insert', v);
}

function doDelete() {
  let v = parseInt(document.getElementById('val-input').value);
  if (isNaN(v)) return;
  metrics.ops++;
  let steps = trees[currentTree].delete(v);
  addLog(`${v} silindi`, 'delete');
  document.getElementById('val-input').value = '';
  queueSteps(steps);
  autoSnapshot('Delete', v);
}

function doSearch() {
  let v = parseInt(document.getElementById('val-input').value);
  if (isNaN(v)) return;
  metrics.ops++;
  let steps = trees[currentTree].search(v);
  addLog(`${v} aranıyor`, 'search');
  document.getElementById('val-input').value = '';
  queueSteps(steps);
}

function clearTree() {
  trees[currentTree] = currentTree === 'avl' ? new AVLTree() : currentTree === 'rb' ? new RBTree() : new BTree(2);
  stepQueue = []; stepIndex = 0; isPlaying = false; clearInterval(playTimer);
  metrics = { rotations: 0, ops: 0 }; isFirstRender = true;
  render(new Map()); updateStepIndicator(); hideStepOverlay();
  document.getElementById('traversal-result').style.display = 'none';
  addLog('Ağaç temizlendi', 'info');
}

function insertSequence(vals) {
  clearTree();
  for (let v of vals) { trees[currentTree].insert(v); metrics.ops++; }
  isFirstRender = true; render(new Map());
  addLog(`Eklendi: [${vals.join(', ')}]`, 'insert');
  setTimeout(() => fitTreeToView(), 80);
}

function insertRandom(n) {
  clearTree();
  let vals = [];
  for (let i = 0; i < n; i++) {
    let v = Math.floor(Math.random() * 99) + 1;
    vals.push(v); trees[currentTree].insert(v); metrics.ops++;
  }
  isFirstRender = true; render(new Map());
  addLog(`Rastgele eklendi: [${vals.join(', ')}]`, 'insert');
  setTimeout(() => fitTreeToView(), 80);
}

// ============================================================
// TRAVERSALS
// ============================================================
function traversalSteps(order) {
  let tree = trees[currentTree];
  let steps = [], sequence = [];

  const orderNames = {
    inorder:    'Sıralı Gezinme (Sol→Kök→Sağ)',
    preorder:   'Ön-sıra Gezinme (Kök→Sol→Sağ)',
    postorder:  'Son-sıra Gezinme (Sol→Sağ→Kök)',
    levelorder: 'Seviye-sıra Gezinme (BFS)',
  };
  steps.push({ type: 'info', desc: `${orderNames[order] || order} başlıyor…`, highlight: [], kind: 'info' });

  if (currentTree === 'btree') {
    function btInorder(n) {
      if (!n) return;
      n.keys.forEach((k, i) => {
        if (n.children[i]) btInorder(n.children[i]);
        sequence.push({ id: n.id, val: k });
        steps.push({ type: 'visit', desc: `${k} anahtarı ziyaret ediliyor`, highlight: [n.id], kind: 'path' });
      });
      if (n.children[n.keys.length]) btInorder(n.children[n.keys.length]);
    }
    function btPreorder(n) {
      if (!n) return;
      steps.push({ type: 'visit', desc: `Düğüm ziyaret ediliyor [${n.keys.join(',')}]`, highlight: [n.id], kind: 'path' });
      n.keys.forEach(k => sequence.push({ id: n.id, val: k }));
      n.children.forEach(btPreorder);
    }
    function btPostorder(n) {
      if (!n) return;
      n.children.forEach(btPostorder);
      steps.push({ type: 'visit', desc: `Düğüm ziyaret ediliyor [${n.keys.join(',')}]`, highlight: [n.id], kind: 'path' });
      n.keys.forEach(k => sequence.push({ id: n.id, val: k }));
    }
    function btLevel(root) {
      let q = [root];
      while (q.length) {
        let n = q.shift(); if (!n) continue;
        steps.push({ type: 'visit', desc: `Düğüm ziyaret ediliyor [${n.keys.join(',')}]`, highlight: [n.id], kind: 'path' });
        n.keys.forEach(k => sequence.push({ id: n.id, val: k }));
        n.children.forEach(c => q.push(c));
      }
    }
    if      (order === 'inorder')   btInorder(tree.root);
    else if (order === 'preorder')  btPreorder(tree.root);
    else if (order === 'postorder') btPostorder(tree.root);
    else                            btLevel(tree.root);
  } else {
    let root = tree.root;
    function inorder(n)   { if (!n) return; inorder(n.left); sequence.push({id:n.id,val:n.val}); steps.push({type:'visit',desc:`${n.val} ziyaret ediliyor`,highlight:[n.id],kind:'path'}); inorder(n.right); }
    function preorder(n)  { if (!n) return; sequence.push({id:n.id,val:n.val}); steps.push({type:'visit',desc:`${n.val} ziyaret ediliyor`,highlight:[n.id],kind:'path'}); preorder(n.left); preorder(n.right); }
    function postorder(n) { if (!n) return; postorder(n.left); postorder(n.right); sequence.push({id:n.id,val:n.val}); steps.push({type:'visit',desc:`${n.val} ziyaret ediliyor`,highlight:[n.id],kind:'path'}); }
    function levelorder(root) {
      if (!root) return;
      let q = [root];
      while (q.length) {
        let n = q.shift();
        sequence.push({id:n.id,val:n.val});
        steps.push({type:'visit',desc:`${n.val} ziyaret ediliyor (seviye sırası)`,highlight:[n.id],kind:'path'});
        if (n.left) q.push(n.left); if (n.right) q.push(n.right);
      }
    }
    if      (order === 'inorder')   inorder(root);
    else if (order === 'preorder')  preorder(root);
    else if (order === 'postorder') postorder(root);
    else                            levelorder(root);
  }

  let vals = sequence.map(s => s.val);
  steps.push({ type: 'found', desc: `Sonuç: [${vals.join(' → ')}]`, highlight: sequence.map(s => s.id), kind: 'found' });
  return { steps, vals };
}

function doTraversal(order) {
  let tree = trees[currentTree];
  if (!tree.root) { addLog('Ağaç boş', 'info'); return; }
  metrics.ops++;
  let { steps, vals } = traversalSteps(order);
  let box = document.getElementById('traversal-result');
  const names = { inorder:'Sıralı (Sol→Kök→Sağ)', preorder:'Ön-sıra (Kök→Sol→Sağ)', postorder:'Son-sıra (Sol→Sağ→Kök)', levelorder:'Seviye-sıra (BFS)' };
  document.getElementById('traversal-label').textContent = names[order] || order;
  document.getElementById('traversal-vals').textContent  = vals.join(' → ');
  box.style.display = 'block';
  addLog(`${names[order]}: [${vals.join(', ')}]`, 'search');
  queueSteps(steps);
}

// ============================================================
// STEP SYSTEM
// ============================================================
function queueSteps(steps) {
  stopPlay(); stepQueue = steps; stepIndex = -1;
  updateStepIndicator();
  if (steps.length > 1) togglePlay(); else stepForward();
}

function stepForward() {
  if (stepIndex >= stepQueue.length - 1) { stopPlay(); hideStepOverlay(); render(new Map()); return; }
  stepIndex++; applyStep(stepQueue[stepIndex]); updateStepIndicator();
}

function stepBack() {
  if (stepIndex <= 0) return;
  stepIndex--; applyStep(stepQueue[stepIndex]); updateStepIndicator();
}

function applyStep(step) {
  if (!step) return;
  let hlMap = new Map();
  (step.highlight || []).forEach(id => { if (id) hlMap.set(id, step.kind || 'path'); });

  if ('finalSnapshot' in step) {
    // Kalıcı güncelleme — trees.avl.root gerçekten değişiyor
    trees.avl.root = step.finalSnapshot ? deserializeAVL(step.finalSnapshot) : null;
    render(hlMap);
  } else if ('avlSnapshot' in step) {
    // Geçici görsel — ağacı bozmadan sadece render
    const savedRoot = trees.avl.root;
    trees.avl.root = step.avlSnapshot ? deserializeAVL(step.avlSnapshot) : null;
    render(hlMap);
    trees.avl.root = savedRoot;
  } else {
    render(hlMap);
  }

  showStepOverlay(step);
  logStep(step);
  if (activeRightPanel === 'pseudo') highlightPseudoLines(step.kind || 'info');
}

function showStepOverlay(step) {
  let overlay = document.getElementById('step-overlay');
  const labels = { insert:'Insert', delete:'Delete', rotate:'Rotation', search:'Search', visit:'Traversal', found:'Found!', recolor:'Recolor', split:'Split', merge:'Merge', info:'Info' };
  document.getElementById('step-type').textContent = labels[step.type] || step.type;
  document.getElementById('step-desc').textContent = step.desc || '';
  overlay.className = 'step-overlay show';
}

function hideStepOverlay() { document.getElementById('step-overlay').className = 'step-overlay'; }

function togglePlay() { if (isPlaying) stopPlay(); else startPlay(); }

function startPlay() {
  if (stepIndex >= stepQueue.length - 1) stepIndex = -1;
  isPlaying = true;
  document.getElementById('play-btn').textContent = '⏸';
  playTimer = setInterval(() => {
    if (stepIndex >= stepQueue.length - 1) { stopPlay(); hideStepOverlay(); render(new Map()); return; }
    stepForward();
  }, animSpeed);
}

function stopPlay() {
  isPlaying = false;
  document.getElementById('play-btn').textContent = '▶';
  clearInterval(playTimer);
}

function updateStepIndicator() {
  let el = document.getElementById('step-indicator');
  if (!stepQueue.length) { el.textContent = 'Adım kuyruğu boş'; return; }
  el.textContent = `Step ${Math.max(0, stepIndex + 1)} / ${stepQueue.length}`;
}

function updateSpeed(v) {
  animSpeed = parseInt(v);
  document.getElementById('speed-val').textContent = (animSpeed / 1000).toFixed(1) + 's';
  if (isPlaying) { stopPlay(); startPlay(); }
}

// ============================================================
// METRICS & LOG
// ============================================================
function updateMetrics() {
  let tree = trees[currentTree];
  document.getElementById('m-size').textContent      = tree.size();
  document.getElementById('m-height').textContent    = tree.getHeight();
  document.getElementById('m-rotations').textContent = metrics.rotations;
  document.getElementById('m-ops').textContent       = metrics.ops;
}

function addLog(msg, type) {
  let log = document.getElementById('log');
  let el  = document.createElement('div');
  el.className  = `log-entry ${type}`;
  el.textContent = `› ${msg}`;
  log.insertBefore(el, log.firstChild);
  while (log.children.length > 40) log.removeChild(log.lastChild);
}

function logStep(step) {
  const typeMap = { rotate:'rotate', recolor:'recolor', insert:'insert', delete:'delete', found:'search', search:'search' };
  let type = typeMap[step.type] || 'info';
  if (step.type === 'visit') return;
  addLog(step.desc, type);
}

// ============================================================
// SWITCH TREE
// ============================================================
function switchTree(type) {
  currentTree = type;
  document.querySelectorAll('.tree-tab').forEach((t, i) => {
    t.classList.toggle('active', ['avl','rb','btree'][i] === type);
  });
  stopPlay(); stepQueue = []; stepIndex = 0;
  metrics = { rotations: 0, ops: 0 }; isFirstRender = true;
  updateStepIndicator(); hideStepOverlay(); render(new Map()); updateLegend();
  document.getElementById('traversal-result').style.display = 'none';
  const rotSection = document.getElementById('rotation-demo-section');
if (rotSection) rotSection.style.display = type === 'avl' ? 'block' : 'none';
  addLog(`${type === 'avl' ? 'AVL Ağacı' : type === 'rb' ? 'Kırmızı-Siyah Ağaç' : 'B-Ağacı'} seçildi`, 'info');
  if (activeRightPanel === 'pseudo') { currentHighlightedLines = new Set(); renderPseudoCode(type); }
  if (activeRightPanel === 'bigo') renderBigO(type);
}

function updateLegend() {
  let leg = document.getElementById('legend');
  if (currentTree === 'rb') {
    leg.innerHTML = `
      <div class="legend-item"><div class="legend-dot" style="background:#c0392b;color:#c0392b"></div>Red node</div>
      <div class="legend-item"><div class="legend-dot" style="background:#2c3e50;color:#718096;border:1px solid #718096"></div>Black node</div>
      <div class="legend-item"><div class="legend-dot" style="background:var(--node-path);color:var(--node-path)"></div>Search path</div>
      <div class="legend-item"><div class="legend-dot" style="background:var(--node-found);color:var(--node-found)"></div>Found</div>`;
  } else {
    leg.innerHTML = `
      <div class="legend-item"><div class="legend-dot" style="background:var(--node-new);color:var(--node-new)"></div>New node</div>
      <div class="legend-item"><div class="legend-dot" style="background:var(--node-rot);color:var(--node-rot)"></div>Rotating</div>
      <div class="legend-item"><div class="legend-dot" style="background:var(--node-path);color:var(--node-path)"></div>Search path</div>
      <div class="legend-item"><div class="legend-dot" style="background:var(--node-found);color:var(--node-found)"></div>Found</div>`;
  }
}

// ============================================================
// KEYBOARD
// ============================================================
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.key === 'ArrowRight') stepForward();
  if (e.key === 'ArrowLeft')  stepBack();
  if (e.key === ' ')          { e.preventDefault(); togglePlay(); }
  if (e.key === 'Escape')     closeAuthModal();
});

document.getElementById('val-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') doInsert();
});

//document.getElementById('auth-modal').addEventListener('click', function(e) {
  //if (e.target === this) closeAuthModal();
//});

// ============================================================
// HISTORY SYSTEM
// ============================================================
let treeHistory = JSON.parse(localStorage.getItem('tv-tree-history') || '[]');
let currentSnapshotId = null;

function serializeTree() {
  const tree = trees[currentTree];
  if (currentTree === 'avl') {
    return { nodes: collectAVL(tree.root) };
  } else if (currentTree === 'rb') {
    return { nodes: collectRB(tree.root) };
  } else {
    return { nodes: collectBTree(tree.root) };
  }
}

function collectAVL(n) {
  if (!n) return [];
  return [n.val, ...collectAVL(n.left), ...collectAVL(n.right)];
}

function collectRB(n) {
  if (!n) return [];
  return [n.val, ...collectRB(n.left), ...collectRB(n.right)];
}

function collectBTree(n) {
  if (!n) return [];
  let vals = [...n.keys];
  n.children.forEach(c => vals.push(...collectBTree(c)));
  return vals;
}

function saveSnapshot(label) {
  const tree = trees[currentTree];
  if (tree.size() === 0) { showToast('Kaydedilecek ağaç yok!'); return; }

  const inorderVals = getInorderVals();
  const snap = {
    id: 'snap_' + Date.now(),
    treeType: currentTree,
    label: label || `${currentTree.toUpperCase()} — ${tree.size()} node`,
    timestamp: Date.now(),
    size: tree.size(),
    height: tree.getHeight(),
    rotations: metrics.rotations,
    ops: metrics.ops,
    inorder: inorderVals,
    insertOrder: serializeTree().nodes,
  };

  treeHistory.unshift(snap);
  if (treeHistory.length > 20) treeHistory = treeHistory.slice(0, 20);
  localStorage.setItem('tv-tree-history', JSON.stringify(treeHistory));
  currentSnapshotId = snap.id;
  renderHistoryPanel();
  showToast('✓ Snapshot kaydedildi');
  addLog(`Snapshot kaydedildi: "${snap.label}"`, 'insert');
}

function autoSnapshot(opName, val) {
  const tree = trees[currentTree];

  // Inorder değerleri al
  const vals = [];
  if (currentTree === 'avl' || currentTree === 'rb') {
    function inorder(n) { if (!n) return; inorder(n.left); vals.push(n.val); inorder(n.right); }
    inorder(tree.root);
  } else {
    function btInorder(n) {
      if (!n) return;
      n.keys.forEach((k, i) => { if (n.children[i]) btInorder(n.children[i]); vals.push(k); });
      if (n.children[n.keys.length]) btInorder(n.children[n.keys.length]);
    }
    btInorder(tree.root);
  }

  if (vals.length === 0) return;

  // Insert sırasını da kaydet (inorder zaten sıralı, biz preorder lazım)
  const insertOrder = [];
  if (currentTree === 'avl' || currentTree === 'rb') {
    function preorder(n) { if (!n) return; insertOrder.push(n.val); preorder(n.left); preorder(n.right); }
    preorder(tree.root);
  } else {
    insertOrder.push(...vals);
  }

  const snap = {
    id: 'snap_' + Date.now() + '_' + Math.random().toString(36).substr(2,4),
    treeType: currentTree,
    label: `${opName}(${val}) → ${currentTree.toUpperCase()}`,
    timestamp: Date.now(),
    size: tree.size(),
    height: tree.getHeight(),
    rotations: metrics.rotations,
    ops: metrics.ops,
    inorder: vals,
    insertOrder: insertOrder,
    auto: true,
  };

  treeHistory.unshift(snap);
  if (treeHistory.length > 20) treeHistory = treeHistory.slice(0, 20);
  localStorage.setItem('tv-tree-history', JSON.stringify(treeHistory));

  if (activeRightPanel === 'history') renderHistoryPanel();
}

function getInorderVals() {
  const tree = trees[currentTree];
  const vals = [];
  if (currentTree === 'avl' || currentTree === 'rb') {
    function inorder(n) { if (!n) return; inorder(n.left); vals.push(n.val); inorder(n.right); }
    inorder(tree.root);
  } else {
    function btInorder(n) {
      if (!n) return;
      n.keys.forEach((k, i) => { if (n.children[i]) btInorder(n.children[i]); vals.push(k); });
      if (n.children[n.keys.length]) btInorder(n.children[n.keys.length]);
    }
    btInorder(tree.root);
  }
  return vals;
}

function restoreSnapshot(snapId) {
  const snap = treeHistory.find(s => s.id === snapId);
  if (!snap) return;

  // Önce tree tipini değiştir ve temizle
  currentTree = snap.treeType;
  trees = { avl: new AVLTree(), rb: new RBTree(), btree: new BTree(2) };
  document.querySelectorAll('.tree-tab').forEach((t, i) => {
    t.classList.toggle('active', ['avl','rb','btree'][i] === snap.treeType);
  });

  // Preorder sırasıyla ekle (ağaç yapısını korur)
  const vals = snap.insertOrder || snap.inorder || [];
  vals.forEach(v => trees[snap.treeType].insert(v));

  metrics.rotations = snap.rotations || 0;
  metrics.ops = snap.ops || 0;
  stepQueue = []; stepIndex = 0; isPlaying = false;
  clearInterval(playTimer);
  isFirstRender = true;

  updateStepIndicator();
  hideStepOverlay();
  document.getElementById('traversal-result').style.display = 'none';
  updateLegend();
  render(new Map());
  currentSnapshotId = snapId;
  renderHistoryPanel();
  setTimeout(() => fitTreeToView(), 80);
  showToast(`✓ "${snap.label}" geri yüklendi`);
  addLog(`Snapshot geri yüklendi: "${snap.label}"`, 'traversal');
}

function deleteSnapshot(snapId) {
  treeHistory = treeHistory.filter(s => s.id !== snapId);
  localStorage.setItem('tv-tree-history', JSON.stringify(treeHistory));
  if (currentSnapshotId === snapId) currentSnapshotId = null;
  renderHistoryPanel();
}

function clearAllHistory() {
  treeHistory = [];
  localStorage.removeItem('tv-tree-history');
  currentSnapshotId = null;
  renderHistoryPanel();
  addLog('Tüm geçmiş temizlendi', 'info');
}

function renderHistoryPanel() {
  const area = document.getElementById('history-area');
  if (!area) return;

  if (treeHistory.length === 0) {
    area.innerHTML = `
      <div class="history-empty">
        <div class="history-empty-icon">🕰️</div>
        <div class="history-empty-text">Henüz snapshot yok.<br>İşlem yaptıktan sonra otomatik kaydedilir<br>veya manuel kaydet butonunu kullanın.</div>
      </div>`;
    const cnt = document.getElementById('history-count');
    if (cnt) cnt.textContent = '0 snapshot';
    return;
  }

  const cnt = document.getElementById('history-count');
  if (cnt) cnt.textContent = `${treeHistory.length} / 20 snapshot`;

  area.innerHTML = treeHistory.map(snap => {
    const isActive = snap.id === currentSnapshotId;
    const date = new Date(snap.timestamp);
    const timeStr = date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
    const inorderPreview = (snap.inorder || []).slice(0, 10).join(', ') + ((snap.inorder||[]).length > 10 ? '…' : '');
    const badgeClass = snap.treeType;
    const badgeLabel = snap.treeType === 'avl' ? 'AVL' : snap.treeType === 'rb' ? 'RB' : 'B';

    return `
      <div class="history-card ${isActive ? 'active-snapshot' : ''}" id="hcard-${snap.id}">
        <div class="history-card-header">
          <div class="history-card-title">
            <span class="history-tree-badge ${badgeClass}">${badgeLabel}</span>
            ${snap.auto ? '🔄' : '📌'} ${snap.label}
          </div>
          <div class="history-card-time">${dateStr} ${timeStr}</div>
        </div>
        <div class="history-card-meta">
          <div class="history-meta-item">Nodes: <span>${snap.size}</span></div>
          <div class="history-meta-item">Height: <span>${snap.height}</span></div>
          <div class="history-meta-item">Rot: <span>${snap.rotations}</span></div>
        </div>
        ${inorderPreview ? `<div class="history-card-vals">↕ ${inorderPreview}</div>` : ''}
        <div class="history-card-actions">
          <button class="history-action-btn restore" onclick="restoreSnapshot('${snap.id}')">⏮ Geri Yükle</button>
          <button class="history-action-btn danger" onclick="deleteSnapshot('${snap.id}')">🗑</button>
        </div>
      </div>`;
  }).join('');
}

function showToast(msg) {
  const existing = document.querySelector('.history-restore-toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'history-restore-toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2100);
}
// ============================================================
// AVL ROTATION — mevcut ağaçta rotasyon tipine uygun ilk
// dengesizlik noktasını bul ve rotasyonu doğrudan uygula
// ============================================================

// Ağaçta belirtilen rotasyon tipine uyan ilk node'u döndürür.
// LL: bf>1 ve left.bf>=0  |  RR: bf<-1 ve right.bf<=0
// LR: bf>1 ve left.bf<0   |  RL: bf<-1 ve right.bf>0
function findRotationNode(n, type, tree) {
  if (!n) return null;
  const bf = tree.bf(n);
  if (type === 'LL' && bf > 1  && tree.bf(n.left)  >= 0) return n;
  if (type === 'RR' && bf < -1 && tree.bf(n.right) <= 0) return n;
  if (type === 'LR' && bf > 1  && tree.bf(n.left)  < 0)  return n;
  if (type === 'RL' && bf < -1 && tree.bf(n.right) > 0)  return n;
  return findRotationNode(n.left, type, tree) || findRotationNode(n.right, type, tree);
}

// Rotasyon sonucu steps dizisi oluşturur (adım adım gösterim)
function applyRotation(type) {
  if (currentTree !== 'avl') { switchTree('avl'); }

  const tree = trees.avl;
  if (!tree.root) {
    setRotStatus('Ağaç boş.', 'err'); return;
  }

  const node = findRotationNode(tree.root, type, tree);
  if (!node) {
    const msgs = {
      LL: 'Sol-sol dengesizliği yok.',
      RR: 'Sağ-sağ dengesizliği yok.',
      LR: 'Sol-sağ dengesizliği yok.',
      RL: 'Sağ-sol dengesizliği yok.',
    };
    setRotStatus(msgs[type], 'err');
    addLog(`${type} rotasyonu uygulanamaz — uygun dengesizlik yok`, 'info');
    return;
  }

  // Rotasyon öncesi snapshot
  const snapBefore = serializeAVL(tree.root);

  // Rotasyonu gerçek ağaç üzerinde uygula
  const steps = [];
  const labels = { LL:'Sağ Rotasyon', RR:'Sol Rotasyon', LR:'Sol+Sağ Rotasyon', RL:'Sağ+Sol Rotasyon' };

  steps.push({
    type: 'info',
    desc: `${type} dengesizliği — ${node.val} düğümü (BF=${tree.bf(node)})`,
    highlight: [node.id], kind: 'rotate',
    avlSnapshot: snapBefore,
  });

  // Ağaçta o node'u rotasyonla dengele
  function rebalanceNode(root, targetId) {
    if (!root) return null;
    if (root.id === targetId) return tree.balance(root, steps);
    root.left  = rebalanceNode(root.left,  targetId);
    root.right = rebalanceNode(root.right, targetId);
    tree.update(root);
    return root;
  }

  tree.root = rebalanceNode(tree.root, node.id);
  metrics.rotations++;

  const snapAfter = serializeAVL(tree.root);

  steps.push({
    type: 'rotate',
    desc: `✓ ${labels[type]} tamamlandı`,
    highlight: [], kind: 'new',
    avlSnapshot: snapAfter,
  });

  setRotStatus(`${type} uygulandı — ${node.val} düğümü`, 'ok');
  addLog(`${type} rotasyonu uygulandı (${node.val} üzerinde)`, 'rotate');
  isFirstRender = false;
  queueSteps(steps);
}

function setRotStatus(msg, state) {
  const el = document.getElementById('rot-status');
  if (!el) return;
  el.textContent = msg;
  el.className = 'rot-status ' + (state || '');
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.textContent = ''; el.className = 'rot-status'; }, 3000);
}




// ── Init ──
initAuth();
render(new Map());
renderPseudoCode('avl');