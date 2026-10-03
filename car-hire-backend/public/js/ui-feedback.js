(function () {
  function ensureToastStack() {
    let stack = document.querySelector('.ui-toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'ui-toast-stack';
      document.body.appendChild(stack);
    }
    return stack;
  }

  window.uiNotify = function uiNotify(message, type = 'info', title) {
    const stack = ensureToastStack();
    const toast = document.createElement('div');
    toast.className = `ui-toast ${type}`;
    const labels = { success: 'Success', warning: 'Warning', error: 'Something went wrong', info: 'Notice' };
    toast.innerHTML = `
      <div>
        <div class="ui-toast-title">${title || labels[type] || 'Notice'}</div>
        <div class="ui-toast-message"></div>
      </div>
      <button class="ui-toast-close" type="button" aria-label="Close">×</button>
    `;
    toast.querySelector('.ui-toast-message').textContent = String(message || '');
    toast.querySelector('.ui-toast-close').addEventListener('click', () => toast.remove());
    stack.appendChild(toast);
    window.setTimeout(() => toast.remove(), type === 'error' ? 7000 : 4500);
  };

  window.uiConfirm = function uiConfirm({
    title = 'Are you sure?',
    message = '',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    tone = 'default',
    reasonLabel = '',
    initialReason = '',
  } = {}) {
    return new Promise((resolve) => {
      const previousFocus = document.activeElement;
      // Bootstrap keeps focus inside an open modal. Keep this dialog inside it
      // too, otherwise the modal steals focus from the cancellation textarea.
      const dialogHost = document.querySelector('.modal.show') || document.body;
      const backdrop = document.createElement('div');
      backdrop.className = 'ui-dialog-backdrop';
      backdrop.innerHTML = `
        <div class="ui-dialog" role="dialog" aria-modal="true">
          <h3></h3>
          <p></p>
          <div class="ui-dialog-actions">
            <button type="button" class="ui-dialog-cancel"></button>
            <button type="button" class="ui-dialog-confirm ${tone === 'danger' ? 'danger' : tone === 'warning' ? 'warning' : ''}"></button>
          </div>
        </div>
      `;
      backdrop.querySelector('h3').textContent = title;
      backdrop.querySelector('p').textContent = message;
      backdrop.querySelector('.ui-dialog-cancel').textContent = cancelText;
      backdrop.querySelector('.ui-dialog-confirm').textContent = confirmText;

      let reasonInput;
      if (reasonLabel) {
        const label = document.createElement('label');
        label.textContent = reasonLabel;
        label.style.display = 'block';
        reasonInput = document.createElement('textarea');
        reasonInput.className = 'form-control';
        reasonInput.rows = 5;
        reasonInput.maxLength = 2000;
        reasonInput.required = true;
        reasonInput.value = initialReason;
        label.appendChild(reasonInput);
        backdrop.querySelector('.ui-dialog').insertBefore(label, backdrop.querySelector('.ui-dialog-actions'));
      }

      function finish(value) {
        backdrop.remove();
        if (previousFocus && previousFocus.isConnected) previousFocus.focus();
        resolve(value);
      }

      backdrop.querySelector('.ui-dialog-cancel').addEventListener('click', () => finish(false));
      backdrop.querySelector('.ui-dialog-confirm').addEventListener('click', () => {
        if (!reasonInput) return finish(true);
        reasonInput.value = reasonInput.value.trim();
        if (!reasonInput.reportValidity()) return;
        finish(reasonInput.value);
      });
      backdrop.addEventListener('click', (event) => {
        if (event.target === backdrop) finish(false);
      });
      dialogHost.appendChild(backdrop);
      if (reasonInput) reasonInput.focus();
    });
  };

  // Existing admin code that still calls alert() gets a styled toast instead.
  window.alert = function styledAlert(message) {
    window.uiNotify(message, 'warning');
  };
})();
