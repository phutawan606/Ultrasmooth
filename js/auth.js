function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getUser() {
  const user = localStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
}

function checkAuth(requireAuth = true) {
  const token = getToken();
  const isLoginPage = window.location.pathname.includes('login.html');

  if (requireAuth && !token && !isLoginPage) {
    window.location.href = 'login.html';
  } else if (!requireAuth && token && isLoginPage) {
    window.location.href = 'index.html';
  }
}

function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.location.href = 'login.html';
}

function setupHeaderUser() {
  const user = getUser();
  const userNameEl = document.getElementById('header-user-name');
  if (user && userNameEl) {
    userNameEl.textContent = user.name;
  }
}