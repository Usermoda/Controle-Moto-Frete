// ===== auth.js — login simples =====
const LS_AUTH = 'motofrete.auth';

function isLoggedIn() {
  return localStorage.getItem(LS_AUTH) === '1';
}

function tryLogin(user, pass) {
  if (typeof CREDENTIALS === 'undefined') {
    console.error('CREDENTIALS não carregou');
    return { ok: false, reason: 'Config não carregou (limpe o cache e recarregue)' };
  }
  const expectedUser = String(CREDENTIALS.loginUser || '').trim().toLowerCase();
  const expectedPass = String(CREDENTIALS.loginPass || '').trim();
  const typedUser = String(user || '').trim().toLowerCase();
  const typedPass = String(pass || '').trim();
  if (!expectedUser || !expectedPass) {
    return { ok: false, reason: 'Login não configurado no credentials.js' };
  }
  const ok = typedUser === expectedUser && typedPass === expectedPass;
  if (ok) localStorage.setItem(LS_AUTH, '1');
  return { ok, reason: ok ? '' : 'Usuário ou senha inválidos' };
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
    const result = tryLogin($user.value, $pass.value);
    if (result.ok) {
      $screen.classList.add('hidden');
      startAppAfterAuth();
    } else {
      $err.textContent = result.reason;
      $pass.value = '';
      $pass.focus();
    }
  };
  $form.onsubmit = submit;
  $btn.onclick = submit;
}
