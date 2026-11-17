const $ = (selector) => document.querySelector(selector);
const state = { mode: 'chat', messages: [], busy: false };
const chatStoreKey = 'neura-chat-v1';

function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 3200);
}

function setMode(mode) {
  state.mode = mode;
  $('#welcome').classList.toggle('hidden', mode !== 'welcome');
  $('#chatArea').classList.toggle('hidden', mode !== 'chat');
  $('#imageArea').classList.toggle('hidden', mode !== 'image');
  $('#topMode').textContent = mode === 'image' ? 'Criar imagem' : 'Conversar';
  document.querySelectorAll('.nav-item').forEach((el) => el.classList.toggle('active', el.dataset.mode === mode));
  $('#sidebar').classList.remove('open');
  if (mode === 'chat') $('#chatInput').focus();
}

function saveMessages() {
  try { localStorage.setItem(chatStoreKey, JSON.stringify(state.messages.slice(-30))); }
  catch (_) { /* O chat continua funcionando mesmo se o navegador bloquear o armazenamento. */ }
}

function addMessage(role, content, pending = false) {
  const wrap = document.createElement('div');
  wrap.className = `message ${role}${pending ? ' pending' : ''}`;
  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.textContent = role === 'user' ? 'V' : '✦';
  const body = document.createElement('div');
  body.className = 'message-body';
  body.textContent = content;
  wrap.append(avatar, body);
  $('#messages').appendChild(wrap);
  $('#messages').scrollTop = $('#messages').scrollHeight;
  return { wrap, body };
}

function renderHistory() {
  $('#messages').innerHTML = '';
  state.messages.forEach((message) => addMessage(message.role, message.content));
}

async function sendChat(text) {
  if (state.busy || !text.trim()) return;
  state.busy = true;
  $('#chatInput').value = '';
  state.messages.push({ role: 'user', content: text.trim() });
  addMessage('user', text.trim());
  saveMessages();
  const pending = addMessage('assistant', 'Pensando…', true);
  $('#chatInput').disabled = true;
  $('.send-btn').disabled = true;
  try {
    const response = await fetch('/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: state.messages.slice(-30) })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Não foi possível enviar a mensagem.');
    pending.body.textContent = data.answer;
    pending.wrap.classList.remove('pending');
    state.messages.push({ role: 'assistant', content: data.answer });
    saveMessages();
  } catch (error) {
    pending.wrap.remove();
    toast(error.message || 'Erro de conexão.');
    state.messages.pop();
    saveMessages();
  } finally {
    state.busy = false;
    $('#chatInput').disabled = false;
    $('.send-btn').disabled = false;
    $('#chatInput').focus();
    $('#messages').scrollTop = $('#messages').scrollHeight;
  }
}

$('#chatForm').addEventListener('submit', (event) => {
  event.preventDefault();
  sendChat($('#chatInput').value);
});
$('#chatInput').addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    $('#chatForm').requestSubmit();
  }
});

async function generateImage(event) {
  event.preventDefault();
  const prompt = $('#imagePrompt').value.trim();
  if (!prompt) { toast('Escreva uma descrição para a imagem.'); return; }
  const button = $('.generate-btn');
  button.disabled = true;
  button.innerHTML = '<span>◌</span> Criando imagem…';
  $('#imageResult').innerHTML = '<div class="empty-art"><div class="art-orbit orbit-one"></div><div class="art-orbit orbit-two"></div><div class="art-center">✦</div><div class="art-caption">A NEURA ESTÁ CRIANDO SUA IMAGEM…</div></div>';
  try {
    const response = await fetch('/api/image', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, size: $('#imageSize').value, quality: $('#imageQuality').value })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Não foi possível gerar a imagem.');

    const image = document.createElement('img');
    image.className = 'generated-image';
    image.alt = prompt;
    image.src = data.image;
    const actions = document.createElement('div');
    actions.className = 'image-actions';
    const caption = document.createElement('span');
    caption.textContent = 'Imagem criada pela Neura';
    const download = document.createElement('a');
    download.className = 'download-btn';
    download.href = data.image;
    download.download = 'neura-imagem.png';
    download.textContent = '↓ Baixar imagem';
    actions.append(caption, download);
    $('#imageResult').replaceChildren(image, actions);
  } catch (error) {
    $('#imageResult').innerHTML = '<div class="empty-art"><div class="art-center">!</div><div class="art-caption">NÃO FOI POSSÍVEL GERAR A IMAGEM</div></div>';
    toast(error.message || 'Erro ao gerar imagem.');
  } finally {
    button.disabled = false;
    button.innerHTML = '<span>✦</span> Gerar imagem <b>↗</b>';
  }
}
$('#imageForm').addEventListener('submit', generateImage);

document.querySelectorAll('[data-mode]').forEach((element) => {
  element.addEventListener('click', () => setMode(element.dataset.mode));
});
document.querySelectorAll('[data-prompt]').forEach((element) => {
  element.addEventListener('click', () => {
    setMode('chat');
    sendChat(element.dataset.prompt);
  });
});
$('#newChatBtn').addEventListener('click', () => {
  state.messages = [];
  saveMessages();
  renderHistory();
  setMode('welcome');
});
$('#mobileMenu').addEventListener('click', () => $('#sidebar').classList.toggle('open'));

async function checkStatus() {
  try {
    const response = await fetch('/api/status');
    const data = await response.json();
    $('#statusDot').classList.toggle('online', data.configured);
    $('#statusTitle').textContent = data.configured ? 'API conectada' : 'Configuração pendente';
    $('#statusText').textContent = data.configured ? 'Pronta para funcionar' : 'Adicione sua chave no .env';
  } catch (_) {
    $('#statusTitle').textContent = 'Servidor indisponível';
    $('#statusText').textContent = 'Verifique a instalação';
  }
}

try {
  const saved = JSON.parse(localStorage.getItem(chatStoreKey) || '[]');
  if (Array.isArray(saved)) state.messages = saved.filter((item) => item && ['user', 'assistant'].includes(item.role) && typeof item.content === 'string').slice(-30);
} catch (_) { state.messages = []; }
renderHistory();
checkStatus();
