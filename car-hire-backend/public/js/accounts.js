(() => {
  const $id = id => document.getElementById(id);
  const message = (text, error = false) => {
    $id('accountMessage').textContent = text;
    $id('accountMessage').className = error ? 'text-danger' : 'text-success';
  };
  async function api(path, body) {
    const response = await fetch(`/api/accounts${path}`, body ? {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    } : { cache: 'no-store' });
    if (response.status === 401) { window.location.assign('/login'); throw new Error('Please sign in again.'); }
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Account request failed.');
    return data;
  }
  async function busy(button, action) {
    button.disabled = true;
    try { await action(); } catch (error) { message(error.message, true); }
    finally { button.disabled = false; }
  }
  async function loadAccounts() {
    const users = await api('/');
    $id('accountsList').replaceChildren();
    users.forEach(user => {
      const row = document.createElement('li');
      row.className = 'list-group-item d-flex flex-wrap justify-content-between align-items-center';
      const label = document.createElement('span');
      label.textContent = `${user.username} — ${user.account_role === 'owner' ? 'Owner' : 'Admin'}${user.is_active ? '' : ' (disabled)'}`;
      row.appendChild(label);
      if (user.account_role !== 'owner') {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `btn btn-sm ${user.is_active ? 'btn-outline-danger' : 'btn-outline-success'}`;
        button.textContent = user.is_active ? 'Disable' : 'Reactivate';
        button.onclick = () => busy(button, async () => {
          if (!$id('ownerPassword').value) throw new Error('Enter your current password to confirm account changes.');
          if (!(await window.uiConfirm({ title: `${button.textContent} ${user.username}?`, message: user.is_active ? 'This admin will be signed out and unable to sign in.' : 'This admin can sign in again using their existing password.', confirmText: button.textContent }))) return;
          await api(`/${user.id}/status`, { active: !user.is_active, current_password: $id('ownerPassword').value });
          $id('ownerPassword').value = '';
          await loadAccounts();
          message('Admin account updated.');
        });
        row.appendChild(button);
      }
      $id('accountsList').appendChild(row);
    });
  }
  $id('passwordForm').onsubmit = event => {
    event.preventDefault();
    const button = event.submitter || $id('passwordForm').querySelector('button');
    busy(button, async () => {
      if ($id('newPassword').value !== $id('confirmPassword').value) throw new Error('New passwords do not match.');
      await api('/password', { current_password: $id('currentPassword').value, new_password: $id('newPassword').value });
      $id('passwordForm').reset();
      window.location.assign('/login');
    });
  };
  $id('createAccountForm').onsubmit = event => {
    event.preventDefault();
    const button = event.submitter || $id('createAccountForm').querySelector('button');
    busy(button, async () => {
      if (!$id('ownerPassword').value) throw new Error('Enter your current password to confirm account changes.');
      if ($id('adminPassword').value !== $id('adminPasswordConfirm').value) throw new Error('New admin passwords do not match.');
      await api('/', { username: $id('newUsername').value.trim(), password: $id('adminPassword').value, current_password: $id('ownerPassword').value });
      $id('createAccountForm').reset();
      $id('ownerPassword').value = '';
      await loadAccounts();
      message('Admin account created.');
    });
  };
  fetch('/partials/navbar.html').then(r => r.text()).then(html => {
    $id('navbar-placeholder').innerHTML = html;
    const script = document.createElement('script'); script.src = '/js/navbar.js'; document.body.appendChild(script);
  }).catch(() => message('Navigation could not load. Refresh the page.', true));
  api('/me').then(async user => {
    $id('accountIdentity').textContent = `Signed in as ${user.username}${user.role === 'owner' ? ' (owner)' : ''}`;
    if (user.role === 'owner') { $id('ownerAccounts').hidden = false; await loadAccounts(); }
  }).catch(error => message(error.message, true));
})();
