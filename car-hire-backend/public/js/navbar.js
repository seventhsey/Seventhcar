// navbar.js

(function setupNavbar() {
  const adminLinks = `
    <li class="nav-item">
      <a class="nav-link font-weight-bold" href="/cars" style="font-size: 1.1rem;">Vehicles</a>
    </li>
    <li class="nav-item">
      <a class="nav-link font-weight-bold" href="/reservations" style="font-size: 1.1rem;">Reservations</a>
    </li>
    <li class="nav-item">
      <a class="nav-link font-weight-bold" href="/calendar" style="font-size: 1.1rem;">Availability Calendar</a>
    </li>
    <li class="nav-item owner-only">
      <a class="nav-link font-weight-bold" id="extrasLink" href="/extras" style="font-size: 1.1rem;">Extras</a>
    </li>
    <li class="nav-item"><a class="nav-link font-weight-bold" href="/account">Account</a></li>
    <li class="nav-item">
      <a class="nav-link font-weight-bold" id="logoutLink" href="/logout" style="font-size: 1.1rem;">Logout</a>
    </li>
  `;

  const navBarItems = document.getElementById("navbar-items");

  if (!navBarItems) {
    console.warn("No #navbar-items found in the DOM.");
    return;
  }

  navBarItems.innerHTML = adminLinks;
  fetch('/api/accounts/me', { cache: 'no-store' }).then(response => {
    if (!response.ok) throw new Error('Not authenticated');
    return response.json();
  }).then(user => { document.documentElement.dataset.adminRole = user.role; })
    .catch(() => { document.documentElement.dataset.adminRole = 'unknown'; });
})();