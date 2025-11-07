/* Shared logic for register / login / dashboard pages.
   Stores users in localStorage under key 'auth_users' as array of {name,email,password,createdAt,lastSeen}
   Stores session in sessionStorage 'auth_session' = email (logged in)
   Optionally 'remember' credentials stored in localStorage 'auth_remember'
*/

(function () {
  // ---------- Utilities ----------
  function $(sel, ctx = document) { return ctx.querySelector(sel); }
  function $all(sel, ctx = document) { return Array.from(ctx.querySelectorAll(sel)); }

  function toast(msg, type = 'default', ttl = 3000) {
    const hold = document.getElementById('toastHold');
    if (!hold) return;
    const node = document.createElement('div');
    node.className = 'toast' + (type === 'success' ? ' success' : type === 'error' ? ' error' : '');
    node.textContent = msg;
    hold.appendChild(node);
    setTimeout(() => {
      node.style.transform = 'translateY(-6px)';
      node.style.opacity = '0';
    }, ttl - 400);
    setTimeout(() => hold.removeChild(node), ttl);
  }

  function loadUsers() {
    try {
      const raw = localStorage.getItem('auth_users');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }
  function saveUsers(list) { localStorage.setItem('auth_users', JSON.stringify(list)); }

  function setSession(email) {
    sessionStorage.setItem('auth_session', email);
  }
  function clearSession() {
    sessionStorage.removeItem('auth_session');
  }
  function getSession() {
    return sessionStorage.getItem('auth_session');
  }

  function emailValid(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  }

  // current path
  const path = location.pathname.split('/').pop();

  // ---------- Register Page ----------
  if (document.getElementById('registerForm')) {
    const form = $('#registerForm');
    const nameInput = $('#fullName');
    const email = $('#regEmail');
    const password = $('#regPassword');
    const confirm = $('#confirmPassword');
    const registerBtn = $('#registerBtn');

    // password toggle
    $('#regToggle').addEventListener('click', () => {
      const p = password;
      const open = $('#rEyeOpen'), closed = $('#rEyeClosed');
      if (p.type === 'password') { p.type = 'text'; open.style.display = 'none'; closed.style.display = 'inline'; }
      else { p.type = 'password'; open.style.display = 'inline'; closed.style.display = 'none'; }
    });

    // realtime hints
    email.addEventListener('input', () => {
      const h = $('#emailHint');
      if (!emailValid(email.value)) h.textContent = 'Invalid email format';
      else h.textContent = '';
    });
    password.addEventListener('input', () => {
      const h = $('#passHint');
      if (password.value.length < 6) h.textContent = 'Password must be at least 6 characters';
      else h.textContent = '';
    });
    confirm.addEventListener('input', () => {
      const h = $('#confirmHint');
      if (confirm.value !== password.value) h.textContent = 'Passwords do not match';
      else h.textContent = '';
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const nameVal = nameInput.value.trim();
      const emailVal = email.value.trim().toLowerCase();
      const passVal = password.value;
      const confVal = confirm.value;

      if (!nameVal) { toast('Please enter your name', 'error'); return; }
      if (!emailValid(emailVal)) { toast('Enter a valid email', 'error'); return; }
      if (passVal.length < 6) { toast('Password must be at least 6 characters', 'error'); return; }
      if (passVal !== confVal) { toast('Passwords do not match', 'error'); return; }

      const users = loadUsers();
      if (users.some(u => u.email === emailVal)) {
        toast('An account with this email already exists', 'error');
        return;
      }

      const now = new Date().toISOString();
      users.push({ name: nameVal, email: emailVal, password: passVal, createdAt: now, lastSeen: now });
      saveUsers(users);

      toast('Registered successfully — redirecting to login...', 'success', 2000);
      setTimeout(() => { location.href = 'login.html'; }, 1200);
    });
  }

  // ---------- Login Page ----------
  if (document.getElementById('loginForm')) {
    const form = $('#loginForm');
    const email = $('#loginEmail'), password = $('#loginPassword'), remember = $('#rememberMe');
    const loginBtn = $('#loginBtn');
    const spinner = document.getElementById('spinnerOverlay');

    // toggle eye
    $('#loginToggle').addEventListener('click', () => {
      const p = password;
      const open = $('#eyeOpen'), closed = $('#eyeClosed');
      if (p.type === 'password') { p.type = 'text'; open.style.display = 'none'; closed.style.display = 'inline'; }
      else { p.type = 'password'; open.style.display = 'inline'; closed.style.display = 'none'; }
    });

    // prefill if remember stored
    (function prefillRemember() {
      try {
        const saved = localStorage.getItem('auth_remember');
        if (!saved) return;
        const obj = JSON.parse(saved);
        if (obj && obj.email) {
          email.value = obj.email;
          password.value = obj.password || '';
          remember.checked = true;
        }
      } catch (e) {}
    })();

    // forgot password mock
    $('#forgotBtn').addEventListener('click', () => {
      const em = email.value.trim();
      if (!em || !emailValid(em)) {
        toast('Enter your email first to use Forgot Password (mock).', 'error');
        return;
      }
      toast('Mock: Password reset link sent to ' + em, 'success');
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const em = email.value.trim().toLowerCase();
      const pw = password.value;

      if (!emailValid(em)) { toast('Enter a valid email', 'error'); return; }
      if (pw.length < 6) { toast('Password must be at least 6 characters', 'error'); return; }

      const users = loadUsers();
      const user = users.find(u => u.email === em);

      // simulate API delay with spinner
      spinner.classList.remove('hidden');

      setTimeout(() => {
        spinner.classList.add('hidden');

        if (!user || user.password !== pw) {
          toast('Invalid credentials', 'error');
          return;
        }

        // login success
        // update lastSeen
        user.lastSeen = new Date().toISOString();
        saveUsers(users);

        // remember me store credentials ONLY if checked
        if (remember.checked) {
          localStorage.setItem('auth_remember', JSON.stringify({ email: em, password: pw }));
        } else {
          localStorage.removeItem('auth_remember');
        }

        setSession(em);
        toast('Login successful', 'success', 1400);
        setTimeout(() => {
          location.href = 'dashboard.html';
        }, 900);
      }, 2000);
    });
  }

  // ---------- Dashboard Page ----------
  if (document.getElementById('welcome')) {
    const emailEl = $('#userEmail');
    const welcome = $('#welcome');
    const regDate = $('#regDate');
    const lastSeen = $('#lastSeen');
    const logout = $('#logoutBtn');
    const logout2 = $('#logoutBtn2');
    const backLogin = $('#backLogin');

    function redirectToLogin() {
      clearSession();
      location.href = 'login.html';
    }

    // check session — allow remembered session too
    const session = getSession();
    const rem = (function(){
      try { return JSON.parse(localStorage.getItem('auth_remember') || 'null'); }
      catch(e){return null;}
    })();

    let userEmail = session || (rem && rem.email) || null;
    if (!userEmail) {
      toast('Not logged in — redirecting to login', 'error', 900);
      setTimeout(() => location.href = 'login.html', 800);
    } else {
      const users = loadUsers();
      const user = users.find(u => u.email === userEmail);
      if (!user) {
        toast('User not found — redirecting', 'error', 900);
        setTimeout(() => location.href = 'login.html', 800);
      } else {
        welcome.textContent = `Hello, ${user.name.split(' ')[0] || user.email}`;
        emailEl.textContent = user.email;
        regDate.textContent = new Date(user.createdAt).toLocaleString();
        lastSeen.textContent = new Date(user.lastSeen).toLocaleString();
      }
    }

    // logout handlers
    [logout, logout2].forEach(btn => {
      if (btn) btn.addEventListener('click', () => {
        clearSession();
        toast('Logged out', 'success');
        setTimeout(() => { location.href = 'login.html'; }, 700);
      });
    });

    if (backLogin) backLogin.addEventListener('click', () => { location.href = 'login.html'; });
  }

})();