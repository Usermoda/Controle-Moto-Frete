// ===== auth.js — login simples =====
const LS_AUTH = 'motofrete.auth';

function isLoggedIn() {
  return localStorage.getItem(LS_AUTH) === '1';
}

function tryLogin(user, pass) {
  if (typeof CREDENTIALS === 'undefined') return false;
  const ok = user.trim() === CREDENTIALS.loginUser && pass === CREDENTIALS.loginPass;
  if (ok) localStorage.setItem(LS_AUTH, '1');
  return ok;
}

function logout() {
  localStorage.removeItem(LS_AUTH);
  location.reload();
}

function initLoginUI() {
  const $screen = document.getElementById('login-screen');
  const $user = document.getElementById('login-user');
  const $pass = document.getElementById('login-pass');
  const $btn = document.getElementById('login-btn');
  const $err = document.getElementById('login-error');
  const $form = document.getElementById('login-form');

  const submit = (e) => {
    if (e) e.preventDefault();
    if (tryLogin($user.value, $pass.value)) {
      $screen.classList.add('hidden');
      // Continua fluxo normal do app
      startAppAfterAuth();
    } else {
      $err.textContent = 'Usuário ou senha inválidos';
      $pass.value = '';
      $pass.focus();
    }
  };
  $form.onsubmit = submit;
  $btn.onclick = submit;
}
