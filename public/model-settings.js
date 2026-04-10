const activeModelEl = document.getElementById('active-model');
const modelSelectEl = document.getElementById('available-models');
const statusEl = document.getElementById('model-status');
const saveButton = document.getElementById('save-model');
const refreshButton = document.getElementById('refresh-models');

document.addEventListener('DOMContentLoaded', async () => {
   await Promise.all([loadActiveModel(), loadModels()]);
});

saveButton.addEventListener('click', async () => {
   const selected = modelSelectEl.value;
   if (!selected) {
      setStatus('Please choose a model first.', true);
      return;
   }

   try {
      saveButton.disabled = true;
      const response = await fetch('/model', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ modelName: selected }),
      });

      if (!response.ok) {
         const message = await extractErrorMessageFromResponse(response);
         throw new Error(message);
      }

      const data = await response.json();
      activeModelEl.textContent = data.modelName;
      modelSelectEl.value = data.modelName;
      setStatus('Active model updated successfully.');
   } catch (error) {
      setStatus(error.message || 'Failed to update model.', true);
   } finally {
      saveButton.disabled = false;
   }
});

refreshButton.addEventListener('click', async () => {
   refreshButton.disabled = true;
   try {
      await Promise.all([loadActiveModel(), loadModels()]);
      setStatus('Model list refreshed.');
   } catch (error) {
      setStatus(error.message || 'Failed to refresh models.', true);
   } finally {
      refreshButton.disabled = false;
   }
});

async function loadActiveModel() {
   const response = await fetch('/model');
   if (!response.ok) {
      const message = await extractErrorMessageFromResponse(response);
      throw new Error(message);
   }

   const data = await response.json();
   activeModelEl.textContent = data.modelName;
}

async function loadModels() {
   const response = await fetch('/models?pageSize=100');
   if (!response.ok) {
      const message = await extractErrorMessageFromResponse(response);
      throw new Error(message);
   }

   const data = await response.json();
   const currentModel = activeModelEl.textContent?.trim();
   const rawModels = Array.isArray(data.models) ? data.models : [];

   const modelNames = rawModels
      .map((item) => normalizeModelName(item?.name || item?.model || ''))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

   const uniqueModels = [...new Set(modelNames)];

   if (!uniqueModels.length) {
      modelSelectEl.innerHTML = '<option value="">No models available</option>';
      return;
   }

   modelSelectEl.innerHTML = uniqueModels
      .map(
         (name) =>
            `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`,
      )
      .join('');

   if (currentModel && uniqueModels.includes(currentModel)) {
      modelSelectEl.value = currentModel;
   }
}

function normalizeModelName(value) {
   const trimmed = String(value || '').trim();
   if (!trimmed) {
      return '';
   }

   const parts = trimmed.split('/').filter(Boolean);
   return parts.length ? parts[parts.length - 1] : trimmed;
}

function setStatus(message, isError = false) {
   statusEl.textContent = message;
   statusEl.classList.toggle('error', isError);
}

function escapeHtml(text) {
   const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
   };

   return String(text).replace(/[&<>"']/g, (m) => map[m]);
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
      }

      const text = (await response.text()).trim();
      if (text) {
         return text;
      }
   } catch (error) {
      console.error('Failed to parse error response:', error);
   }

   return `Request failed (${response.status})`;
}
