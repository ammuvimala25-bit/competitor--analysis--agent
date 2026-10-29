const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');

if (menuToggle && navLinks) {
  menuToggle.addEventListener('click', () => {
    const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', String(!isOpen));
    menuToggle.setAttribute('aria-label', isOpen ? 'Open navigation' : 'Close navigation');
    navLinks.classList.toggle('is-open', !isOpen);
  });
  navLinks.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    navLinks.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open navigation');
  }));
}

const launcher = document.querySelector('#chat-launcher');
const panel = document.querySelector('#chat-panel');
const closeChat = document.querySelector('.chat-close');
const clearChatButton = document.querySelector('#chat-clear');
const chatContent = document.querySelector('#chat-content');
const chatForm = document.querySelector('#chat-form');
const chatInput = document.querySelector('#chat-input');

function setChatOpen(open) {
  if (!panel || !launcher) return;
  panel.hidden = !open;
  panel.setAttribute('aria-hidden', String(!open));
  launcher.setAttribute('aria-expanded', String(open));
  if (open) chatInput?.focus(); else launcher.focus();
}

launcher?.addEventListener('click', () => setChatOpen(panel.hidden));
closeChat?.addEventListener('click', () => setChatOpen(false));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && panel && !panel.hidden) setChatOpen(false);
});

// Verified portfolio facts only. This is a local keyword-based helper, not an LLM.
const KNOWLEDGE = {
  education: [
    'M.Sc. Statistics - Periyar University, 2023-2025, 73%.',
    'B.Sc. Statistics - Periyar University, 2020-2023, 77%.'
  ],
  skills: [
    'Python and R.',
    'Statistics, data analysis, hypothesis testing, correlation analysis, and data cleaning.',
    'AI, machine learning, RAG pipelines, AI chatbots, regression, classification, and clustering.',
    'HTML, CSS, and JavaScript.'
  ],
  projects: [
    'AI Banking Assistant Chatbot',
    'Beauty Salon Website',
    'Salary Prediction Model',
    'Loan Approval Prediction',
    'Agentic AI Projects'
  ],
  github: 'https://github.com/ammuvimala25-bit',
  linkedin: 'http://www.linkedin.com/in/vimala-s8',
  email: 'ammuvimala25@gmail.com',
  phone: '+91 93429 89363'
};

const tamil = /[\u0B80-\u0BFF]/;
const normalize = value => value.toLocaleLowerCase().normalize('NFKC')
  .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
const contains = (text, terms) => terms.some(term => text.includes(normalize(term)));

function answer(question) {
  const text = normalize(question);
  const isTamil = tamil.test(question);
  if (contains(text, ['github', 'git hub', '\u0b95\u0bbf\u0b9f\u0bcd\u0b9f\u0baa\u0bcd']))
    return { text: isTamil ? '\u0bb5\u0bbf\u0bae\u0bb2\u0bbe\u0bb5\u0bbf\u0ba9\u0bcd GitHub:' : 'Vimala\'s GitHub profile:', links: [['GitHub', KNOWLEDGE.github]] };
  if (contains(text, ['linkedin', 'linked in', 'linkdin', '\u0bb2\u0bbf\u0b99\u0bcd\u0b95\u0bcd\u0b9f\u0bcd\u0b90\u0ba9\u0bcd']))
    return { text: isTamil ? '\u0bb5\u0bbf\u0bae\u0bb2\u0bbe\u0bb5\u0bbf\u0ba9\u0bcd LinkedIn:' : 'Vimala\'s LinkedIn profile:', links: [['LinkedIn', KNOWLEDGE.linkedin]] };
  if (contains(text, ['portfolio', 'website', 'site', '\u0baa\u0bcb\u0bb0\u0bcd\u0b9f\u0bcd\u0baa\u0bcb\u0bb2\u0bbf\u0baf\u0bcb']))
    return { text: isTamil ? '\u0ba4\u0bbf\u0b9f\u0bcd\u0b9f\u0b99\u0bcd\u0b95\u0bb3\u0bcd \u0bae\u0bb1\u0bcd\u0bb1\u0bc1\u0bae\u0bcd \u0ba4\u0bca\u0b9f\u0bb0\u0bcd\u0baa\u0bc1 \u0bb5\u0bbf\u0bb5\u0bb0\u0b99\u0bcd\u0b95\u0bb3\u0bc8\u0baa\u0bcd \u0baa\u0bb1\u0bcd\u0bb1\u0bbf \u0b95\u0bc7\u0b9f\u0bcd\u0b95\u0bb2\u0bbe\u0bae\u0bcd.' : 'You are on Vimala\'s portfolio. Ask about projects or contact details.', links: [['Portfolio home', '#home'], ['Projects', '#projects']] };
  if (contains(text, ['resume', 'cv', '\u0bb0\u0bc6\u0b9a\u0bc1\u0bae\u0bc7']))
    return { text: isTamil ? '\u0bb5\u0bbf\u0bae\u0bb2\u0bbe\u0bb5\u0bbf\u0ba9\u0bcd resume:' : 'View Vimala\'s resume:', links: [['View resume', 'assets/resume.pdf']] };
  if (contains(text, ['contact', 'email', 'phone', 'reach', '\u0ba4\u0bca\u0b9f\u0bb0\u0bcd\u0baa\u0bc1', '\u0bae\u0bbf\u0ba9\u0bcd\u0b9e\u0b9e\u0bb2\u0bcd']))
    return { text: isTamil ? '\u0bb5\u0bbf\u0bae\u0bb2\u0bbe\u0bb5\u0bc8 \u0ba4\u0bca\u0b9f\u0bb0\u0bcd\u0baa\u0bc1\u0b95\u0bca\u0bb3\u0bcd\u0bb3\u0bb5\u0bc1\u0bae\u0bcd:' : 'You can contact Vimala here:', items: [`Email: ${KNOWLEDGE.email}`, `Phone: ${KNOWLEDGE.phone}`], links: [['Email', `mailto:${KNOWLEDGE.email}`], ['LinkedIn', KNOWLEDGE.linkedin], ['GitHub', KNOWLEDGE.github]] };
  if (contains(text, ['education', 'degree', 'studied', 'university', 'qualification', '\u0b95\u0bb2\u0bcd\u0bb5\u0bbf', '\u0baa\u0b9f\u0bbf\u0baa\u0bcd\u0baa\u0bc1']))
    return { text: isTamil ? '\u0bb5\u0bbf\u0bae\u0bb2\u0bbe\u0bb5\u0bbf\u0ba9\u0bcd \u0b95\u0bb2\u0bcd\u0bb5\u0bbf:' : 'Vimala\'s education:', items: KNOWLEDGE.education };
  if (contains(text, ['programming', 'programming language', 'coding language', 'python', 'javascript', 'html', 'css', '\u0ba8\u0bbf\u0bb0\u0bb2\u0bbe\u0b95\u0bcd\u0b95\u0bae\u0bcd']))
    return { text: 'Programming languages and web technologies:', items: ['Python and R.', 'HTML, CSS, and JavaScript.'] };
  if (contains(text, ['spoken language', 'speaks', 'language', 'languages', 'tamil', 'english', '\u0bae\u0bca\u0bb4\u0bbf', '\u0ba4\u0bae\u0bbf\u0bb4\u0bcd']))
    return { text: isTamil ? '\u0baa\u0bc7\u0b9a\u0bc1\u0bae\u0bcd \u0bae\u0bca\u0bb4\u0bbf\u0ba4\u0bcd \u0ba4\u0bbf\u0bb1\u0ba9\u0bcd portfolio/resume\u0bb2\u0bcd \u0b95\u0bc1\u0bb1\u0bbf\u0baa\u0bcd\u0baa\u0bbf\u0b9f\u0baa\u0bcd\u0baa\u0b9f\u0bb5\u0bbf\u0bb2\u0bcd\u0bb2\u0bc8.' : 'The portfolio and resume do not specify spoken-language proficiency.' };
  if (contains(text, ['skill', 'skills', 'technology', 'technologies', 'tools', 'tech stack', '\u0ba4\u0bbf\u0bb1\u0ba9\u0bcd', '\u0ba4\u0bbf\u0bb1\u0ba9\u0bcd\u0b95\u0bb3\u0bcd']))
    return { text: isTamil ? '\u0baa\u0b9f\u0bcd\u0b9f\u0bbf\u0baf\u0bb2\u0bbf\u0b9f\u0baa\u0bcd\u0baa\u0b9f\u0bcd\u0b9f \u0ba4\u0bbf\u0bb1\u0ba9\u0bcd\u0b95\u0bb3\u0bcd:' : 'Skills listed in the portfolio:', items: KNOWLEDGE.skills };
  if (contains(text, ['project', 'projects', 'built', 'work', 'prediction', 'bankai', 'bank ai', 'banking assistant', 'agentic', 'loan approval', '\u0ba4\u0bbf\u0b9f\u0bcd\u0b9f\u0bae\u0bcd', '\u0ba4\u0bbf\u0b9f\u0bcd\u0b9f\u0b99\u0bcd\u0b95\u0bb3\u0bcd']))
    return { text: isTamil ? '\u0baa\u0b9f\u0bcd\u0b9f\u0bbf\u0baf\u0bb2\u0bbf\u0b9f\u0baa\u0bcd\u0baa\u0b9f\u0bcd\u0b9f \u0ba4\u0bbf\u0b9f\u0bcd\u0b9f\u0b99\u0bcd\u0b95\u0bb3\u0bcd:' : 'Projects listed in the portfolio and resume:', items: KNOWLEDGE.projects };
  if (contains(text, ['who is', 'about vimala', 'tell me about', 'introduce', '\u0bb5\u0bbf\u0bae\u0bb2\u0bbe', '\u0baf\u0bbe\u0bb0\u0bcd']))
    return { text: isTamil ? '\u0bb5\u0bbf\u0bae\u0bb2\u0bbe \u0b8e\u0bb8\u0bcd. Periyar University\u0baf\u0bbf\u0bb2\u0bcd Statistics M.Sc. \u0bae\u0bc1\u0b9f\u0bbf\u0ba4\u0bcd\u0ba4\u0bb5\u0bb0\u0bcd; \u0ba4\u0bb0\u0bb5\u0bc1 \u0baa\u0b95\u0bc1\u0baa\u0bcd\u0baa\u0bbe\u0baf\u0bcd\u0bb5\u0bc1, AI, machine learning\u0bb2\u0bcd \u0b86\u0bb0\u0bcd\u0bb5\u0bae\u0bcd \u0b95\u0bca\u0ba3\u0bcd\u0b9f\u0bb5\u0bb0\u0bcd.' : 'Vimala S. is a Statistics graduate with an M.Sc. from Periyar University. Her portfolio describes interests in data analysis, AI, and machine learning.', links: [['Education', '#education'], ['Projects', '#projects']] };
  if (contains(text, ['hi', 'hello', 'hey', 'vanakkam', '\u0bb5\u0ba3\u0b95\u0bcd\u0b95\u0bae\u0bcd']))
    return { text: isTamil ? '\u0bb5\u0ba3\u0b95\u0bcd\u0b95\u0bae\u0bcd! \u0b95\u0bb2\u0bcd\u0bb5\u0bbf, \u0ba4\u0bbf\u0bb1\u0ba9\u0bcd\u0b95\u0bb3\u0bcd, \u0ba4\u0bbf\u0b9f\u0bcd\u0b9f\u0b99\u0bcd\u0b95\u0bb3\u0bcd \u0b85\u0bb2\u0bcd\u0bb2\u0ba4\u0bc1 \u0ba4\u0bca\u0b9f\u0bb0\u0bcd\u0baa\u0bc1 \u0bb5\u0bbf\u0bb5\u0bb0\u0b99\u0bcd\u0b95\u0bb3\u0bc8\u0b95\u0bcd \u0b95\u0bc7\u0b9f\u0bcd\u0b95\u0bb2\u0bbe\u0bae\u0bcd.' : 'Hi! Ask about Vimala\'s education, skills, projects, or contact details.' };
  return { text: isTamil ? '\u0b87\u0ba8\u0bcd\u0ba4\u0b95\u0bcd \u0b95\u0bc7\u0bb3\u0bcd\u0bb5\u0bbf\u0b95\u0bcd\u0b95\u0bbe\u0ba9 \u0ba4\u0b95\u0bb5\u0bb2\u0bcd portfolio\u0bb2\u0bcd \u0b87\u0bb2\u0bcd\u0bb2\u0bc8. \u0b95\u0bb2\u0bcd\u0bb5\u0bbf, \u0ba4\u0bbf\u0bb1\u0ba9\u0bcd\u0b95\u0bb3\u0bcd, \u0ba4\u0bbf\u0b9f\u0bcd\u0b9f\u0b99\u0bcd\u0b95\u0bb3\u0bcd \u0b85\u0bb2\u0bcd\u0bb2\u0ba4\u0bc1 \u0ba4\u0bca\u0b9f\u0bb0\u0bcd\u0baa\u0bc1 \u0bb5\u0bbf\u0bb5\u0bb0\u0b99\u0bcd\u0b95\u0bb3\u0bc8\u0b95\u0bcd \u0b95\u0bc7\u0b9f\u0bcd\u0b95\u0bb2\u0bbe\u0bae\u0bcd.' : 'I could not find that in the portfolio information. Try asking about education, skills, projects, or contact details.' };
}

function addMessage(text, kind) {
  const node = document.createElement('div');
  node.className = `chat-message ${kind}`;
  node.textContent = text;
  chatContent.append(node);
  chatContent.scrollTop = chatContent.scrollHeight;
}

function renderAnswer(result) {
  const node = document.createElement('article');
  node.className = 'chat-message bot-message structured-response';
  const summary = document.createElement('p');
  summary.textContent = result.text;
  node.append(summary);
  if (result.items?.length) {
    const list = document.createElement('ul');
    result.items.forEach(item => { const li = document.createElement('li'); li.textContent = item; list.append(li); });
    node.append(list);
  }
  if (result.links?.length) {
    const links = document.createElement('div');
    result.links.forEach(([label, href]) => { const a = document.createElement('a'); a.textContent = label; a.href = href; if (/^https?:/i.test(href)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; } links.append(a); });
    node.append(links);
  }
  chatContent.append(node);
  chatContent.scrollTop = chatContent.scrollHeight;
}

const initialContent = Array.from(chatContent.childNodes, node => node.cloneNode(true));
let pending = false;
function clearChat() {
  if (pending) return;
  chatContent.replaceChildren(...initialContent.map(node => node.cloneNode(true)));
  chatInput.value = '';
  chatInput.focus();
  chatContent.scrollTop = 0;
}
clearChatButton?.addEventListener('click', clearChat);
chatContent?.addEventListener('click', event => {
  const suggestion = event.target.closest('.suggestions button');
  if (suggestion) respond(suggestion.textContent);
});

async function respond(question) {
  if (pending) return;
  const value = question.trim();
  if (!value) { addMessage('Please enter a question about Vimala\'s portfolio.', 'bot-message chat-error'); chatInput.focus(); return; }
  if (value.length > 1000) { addMessage('Please keep your question under 1,000 characters.', 'bot-message chat-error'); return; }
  pending = true;
  addMessage(value, 'user-message');
  const send = chatForm.querySelector('button[type="submit"]');
  const status = document.createElement('div');
  status.className = 'chat-message bot-message chat-loading';
  status.setAttribute('role', 'status');
  status.textContent = 'Checking the portfolio...';
  chatContent.append(status);
  chatContent.scrollTop = chatContent.scrollHeight;
  send.disabled = true;
  chatInput.disabled = true;
  clearChatButton.disabled = true;
  chatForm.setAttribute('aria-busy', 'true');
  try {
    await new Promise(resolve => window.setTimeout(resolve, 80));
    status.remove();
    renderAnswer(answer(value));
  } catch {
    status.remove();
    addMessage('I could not prepare a reply from the local portfolio information. Please try another question.', 'bot-message chat-error');
  } finally {
    pending = false;
    send.disabled = false;
    chatInput.disabled = false;
    clearChatButton.disabled = false;
    chatForm.setAttribute('aria-busy', 'false');
    chatInput.value = '';
    chatInput.focus();
  }
}

chatForm?.addEventListener('submit', event => {
  event.preventDefault();
  respond(chatInput.value || '');
});
