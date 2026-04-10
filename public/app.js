// State management
const state = {
   currentTab: 'qa',
   summarizeFiles: [],
   qaFiles: [],
   isLoading: false,
};

const PAGE_LOAD_GREETING_PROMPT =
   'Greet the user with a short friendly welcome and ask how you can help.';

// DOM Elements
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');
const summarizeInput = document.getElementById('summarize-input');
const summarizeUpload = document.getElementById('summarize-upload');
const summarizeFiles = document.getElementById('summarize-files');
const summarizeSend = document.getElementById('summarize-send');
const summarizeMessages = document.getElementById('summarize-messages');
const qaInput = document.getElementById('qa-input');
const qaUpload = document.getElementById('qa-upload');
const qaFiles = document.getElementById('qa-files');
const qaSend = document.getElementById('qa-send');
const qaMessages = document.getElementById('qa-messages');
const composerToggles = document.querySelectorAll('[data-toggle-composer]');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
   setupTabSwitching();
   setupFileUpload('summarize');
   setupFileUpload('qa');
   setupComposerToggles();
   setupSendButtons();
   sendHiddenGreetingOnLoad();
});

// Tab Switching
function setupTabSwitching() {
   tabButtons.forEach((button) => {
      button.addEventListener('click', () => {
         const tab = button.dataset.tab;
         switchTab(tab);
      });
   });
}

function switchTab(tab) {
   state.currentTab = tab;

   // Update buttons
   tabButtons.forEach((btn) => btn.classList.remove('active'));
   document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

   // Update content
   tabContents.forEach((content) => content.classList.remove('active'));
   document.getElementById(`${tab}-tab`).classList.add('active');
}

// File Upload Setup
function setupFileUpload(tab) {
   const uploadZone = document.getElementById(`${tab}-upload`);
   const fileInput = document.getElementById(`${tab}-files`);

   // Click to upload
   uploadZone.addEventListener('click', () => fileInput.click());

   // File input change
   fileInput.addEventListener('change', (e) => {
      const files = Array.from(e.target.files);
      addFiles(tab, files);
   });

   // Drag and drop
   uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('dragover');
   });

   uploadZone.addEventListener('dragleave', () => {
      uploadZone.classList.remove('dragover');
   });

   uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      const files = Array.from(e.dataTransfer.files);
      addFiles(tab, files);
      fileInput.files = new DataTransfer().items; // Reset input
   });
}

function setupComposerToggles() {
   composerToggles.forEach((toggle) => {
      toggle.addEventListener('click', (event) => {
         event.stopPropagation();
         const tab = toggle.dataset.toggleComposer;
         toggleComposer(tab);
      });
   });

   if (window.matchMedia('(max-width: 768px)').matches) {
      collapseComposer('summarize', true);
      collapseComposer('qa', true);
   }
}

function toggleComposer(tab) {
   const section = document.querySelector(
      `.input-section[data-composer="${tab}"]`,
   );

   if (!section) {
      return;
   }

   collapseComposer(tab, !section.classList.contains('collapsed'));
}

function collapseComposer(tab, shouldCollapse) {
   const section = document.querySelector(
      `.input-section[data-composer="${tab}"]`,
   );
   const toggle = document.querySelector(`[data-toggle-composer="${tab}"]`);

   if (!section || !toggle) {
      return;
   }

   section.classList.toggle('collapsed', shouldCollapse);
   toggle.textContent = shouldCollapse ? 'S' : 'H';
   toggle.setAttribute('aria-expanded', String(!shouldCollapse));
   toggle.setAttribute(
      'aria-label',
      shouldCollapse
         ? `Expand ${tab} prompt box`
         : `Minimize ${tab} prompt box`,
   );
}

function addFiles(tab, files) {
   if (tab === 'summarize') {
      state.summarizeFiles = files;
   } else {
      state.qaFiles = files;
   }

   const uploadZone = document.getElementById(`${tab}-upload`);
   const statusParagraph = uploadZone.querySelector('p');

   if (files.length > 0) {
      const fileNames = files.map((f) => f.name).join(', ');
      statusParagraph.textContent = `✓ ${fileNames}`;
   } else {
      statusParagraph.textContent = '📎 Drag files here or click to upload';
   }
}

// Send Message
function setupSendButtons() {
   summarizeSend.addEventListener('click', () => sendMessage('summarize'));
   qaSend.addEventListener('click', () => sendMessage('qa'));

   // Allow Enter to send (Shift+Enter for new line)
   summarizeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
         e.preventDefault();
         sendMessage('summarize');
      }
   });

   qaInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
         e.preventDefault();
         sendMessage('qa');
      }
   });
}

async function sendMessage(tab) {
   if (state.isLoading) return;

   const input = tab === 'summarize' ? summarizeInput : qaInput;
   const messages = tab === 'summarize' ? summarizeMessages : qaMessages;
   const files = tab === 'summarize' ? state.summarizeFiles : state.qaFiles;
   const sendButton = tab === 'summarize' ? summarizeSend : qaSend;

   const text = input.value.trim();

   if (!text) {
      alert('Please enter some text');
      return;
   }

   state.isLoading = true;
   sendButton.disabled = true;

   try {
      // Show user message
      const userMsg = document.createElement('div');
      userMsg.className = 'message user';
      userMsg.innerHTML = `<div class="message-content">${escapeHtml(text)}</div>`;
      messages.appendChild(userMsg);

      // Show loading indicator
      const aiMsg = document.createElement('div');
      aiMsg.className = 'message ai';
      const loadingId = `loading-${Date.now()}`;
      aiMsg.id = loadingId;
      aiMsg.innerHTML = `<div class="message-content"><div class="loading">
            <div class="loading-dot"></div>
            <div class="loading-dot"></div>
            <div class="loading-dot"></div>
        </div></div>`;
      messages.appendChild(aiMsg);
      messages.scrollTop = messages.scrollHeight;

      // Prepare form data
      const formData = new FormData();

      // Use 'text' for summarize, 'prompt' for generate
      const fieldName = tab === 'summarize' ? 'text' : 'prompt';
      formData.append(fieldName, text);

      // Add files
      files.forEach((file) => {
         formData.append('files', file);
      });

      // Call API endpoint
      const endpoint = tab === 'summarize' ? '/summarize' : '/generate';
      const response = await fetch(endpoint, {
         method: 'POST',
         body: formData,
      });

      if (!response.ok) {
         const message = await extractErrorMessageFromResponse(response);
         throw new Error(message);
      }

      if (!response.body) {
         throw new Error('No response stream received from server.');
      }

      const aiContentDiv = document.createElement('div');
      aiContentDiv.className = 'message-content';
      aiMsg.innerHTML = '';
      aiMsg.appendChild(aiContentDiv);

      await streamResponseIntoMessage(response, aiContentDiv, messages);

      // Clear input and files
      input.value = '';
      clearFiles(tab);
   } catch (error) {
      console.error('Error:', error);

      const errorMsg = document.createElement('div');
      errorMsg.className = 'message ai';
      errorMsg.innerHTML = `<div class="message-content" style="color: #ff6b6b;">Error: ${escapeHtml(error.message)}</div>`;
      messages.appendChild(errorMsg);
      messages.scrollTop = messages.scrollHeight;
   } finally {
      state.isLoading = false;
      sendButton.disabled = false;
   }
}

async function sendHiddenGreetingOnLoad() {
   if (state.isLoading || !qaMessages) {
      return;
   }

   state.isLoading = true;
   if (qaSend) qaSend.disabled = true;
   if (summarizeSend) summarizeSend.disabled = true;

   const aiMsg = document.createElement('div');
   aiMsg.className = 'message ai';
   aiMsg.innerHTML = `<div class="message-content"><div class="loading">
      <div class="loading-dot"></div>
      <div class="loading-dot"></div>
      <div class="loading-dot"></div>
   </div></div>`;
   qaMessages.appendChild(aiMsg);
   qaMessages.scrollTop = qaMessages.scrollHeight;

   try {
      const formData = new FormData();
      formData.append('prompt', PAGE_LOAD_GREETING_PROMPT);

      const response = await fetch('/generate', {
         method: 'POST',
         body: formData,
      });

      if (!response.ok) {
         const message = await extractErrorMessageFromResponse(response);
         throw new Error(message);
      }

      if (!response.body) {
         throw new Error('No response stream received from server.');
      }

      const aiContentDiv = document.createElement('div');
      aiContentDiv.className = 'message-content';
      aiMsg.innerHTML = '';
      aiMsg.appendChild(aiContentDiv);

      await streamResponseIntoMessage(response, aiContentDiv, qaMessages);
   } catch (error) {
      console.error('Failed to send hidden greeting prompt:', error);
      aiMsg.remove();
   } finally {
      state.isLoading = false;
      if (qaSend) qaSend.disabled = false;
      if (summarizeSend) summarizeSend.disabled = false;
   }
}

async function streamResponseIntoMessage(response, aiContentDiv, messages) {
   const reader = response.body.getReader();
   const decoder = new TextDecoder();
   let buffer = '';
   let aiContent = '';

   while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');

      for (let i = 0; i < lines.length - 1; i++) {
         const block = lines[i].trim();
         if (!block) {
            continue;
         }

         const parsedBlock = parseStreamBlock(block);
         if (!parsedBlock) {
            continue;
         }

         if (parsedBlock.type === 'error') {
            throw new Error(parsedBlock.message || 'Streaming request failed.');
         }

         if (parsedBlock.type === 'text') {
            aiContent += parsedBlock.text;
            aiContentDiv.innerHTML = formatAssistantMessage(aiContent);
            messages.scrollTop = messages.scrollHeight;
         }
      }

      buffer = lines[lines.length - 1];
   }
}

function parseStreamBlock(block) {
   try {
      const lines = block.split('\n').map((line) => line.trim());
      const eventLine = lines.find((line) => line.startsWith('event: '));
      const dataLine = lines.find((line) => line.startsWith('data: '));

      if (!eventLine && block.startsWith('{')) {
         const payload = JSON.parse(block);
         if (payload?.message && !payload?.text) {
            return { type: 'error', message: payload.message };
         }

         if (payload?.text) {
            return { type: 'text', text: payload.text };
         }

         return null;
      }

      if (!dataLine) {
         return null;
      }

      const eventName = eventLine ? eventLine.slice(7).trim() : 'message';
      const payload = dataLine.slice(6).trim();
      if (payload === '[DONE]') {
         return null;
      }

      const parsedPayload = JSON.parse(payload);
      if (eventName === 'error') {
         return {
            type: 'error',
            message: parsedPayload?.message || 'Streaming request failed.',
         };
      }

      if (parsedPayload?.text) {
         return {
            type: 'text',
            text: parsedPayload.text,
         };
      }

      if (parsedPayload?.message) {
         return {
            type: 'error',
            message: parsedPayload.message,
         };
      }

      return null;
   } catch (error) {
      console.error('Error parsing stream block:', error, block);
      return null;
   }
}

async function extractErrorMessageFromResponse(response) {
   const contentType = response.headers.get('content-type') || '';

   try {
      if (contentType.includes('application/json')) {
         const body = await response.json();
         if (typeof body === 'string') {
            return body;
         }

         if (Array.isArray(body?.message)) {
            return body.message.join(', ');
         }

         if (body?.message) {
            return body.message;
         }
      } else {
         const text = (await response.text()).trim();
         if (text) {
            return text;
         }
      }
   } catch (error) {
      console.error('Failed to parse error response body:', error);
   }

   return `API error: ${response.status}`;
}

function formatAssistantMessage(text) {
   const normalized = normalizeMarkdownLayout(text);
   const escaped = escapeHtml(normalized);
   const withInlineStyles = applyInlineMarkdown(escaped);
   return buildMarkdownBlocks(withInlineStyles);
}

function normalizeMarkdownLayout(text) {
   return text
      .replace(/\r\n/g, '\n')
      .replace(/([^\n])\s(#{1,6}\s)/g, '$1\n\n$2')
      .replace(/([^\n])\s(\*\s)/g, '$1\n$2')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
}

function applyInlineMarkdown(text) {
   return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

function buildMarkdownBlocks(text) {
   const lines = text.split('\n');
   const html = [];
   let listItems = [];

   const flushList = () => {
      if (!listItems.length) {
         return;
      }

      html.push(`<ul>${listItems.join('')}</ul>`);
      listItems = [];
   };

   for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed) {
         flushList();
         continue;
      }

      const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
         flushList();
         const level = headingMatch[1].length;
         html.push(`<h${level}>${headingMatch[2]}</h${level}>`);
         continue;
      }

      const listMatch = trimmed.match(/^\*\s+(.+)$/);
      if (listMatch) {
         listItems.push(`<li>${listMatch[1]}</li>`);
         continue;
      }

      flushList();
      html.push(`<p>${trimmed}</p>`);
   }

   flushList();
   return html.join('');
}

function clearFiles(tab) {
   if (tab === 'summarize') {
      state.summarizeFiles = [];
      const uploadZone = document.getElementById('summarize-upload');
      const fileInput = uploadZone.querySelector('input[type="file"]');
      const statusParagraph = uploadZone.querySelector('p');
      if (fileInput) fileInput.value = '';
      if (statusParagraph)
         statusParagraph.textContent = '📎 Drag files here or click to upload';
   } else {
      state.qaFiles = [];
      const uploadZone = document.getElementById('qa-upload');
      const fileInput = uploadZone.querySelector('input[type="file"]');
      const statusParagraph = uploadZone.querySelector('p');
      if (fileInput) fileInput.value = '';
      if (statusParagraph)
         statusParagraph.textContent = '📎 Drag files here or click to upload';
   }
}

// Utility function to escape HTML
function escapeHtml(text) {
   const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
   };
   return text.replace(/[&<>"']/g, (m) => map[m]);
}
