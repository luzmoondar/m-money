
import { initDashboard } from "./script.js";
import { supabase } from "./supabase.js";

// DOM Elements
const authContainer = document.getElementById('auth-container');
const dashboardContainer = document.getElementById('dashboard-container');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const btnShowSignup = document.getElementById('btn-show-signup');
const btnShowLogin = document.getElementById('btn-show-login');
const authMessage = document.getElementById('auth-message');
const btnLogout = document.getElementById('btn-logout');

let isDashboardInitialized = false;

// ----------------------------
// Event Listeners
// ----------------------------

async function setupAuth() {
    console.log("[Auth] Setting up Auth Listeners");
    console.group("Auth Initialization");

    // ----------------------------
    // Independent UI Listeners (Attach FIRST for responsiveness)
    // ----------------------------

    // Switch to Signup
    if (btnShowSignup) {
        btnShowSignup.addEventListener('click', (e) => {
            e.preventDefault();
            console.log("Switching to Signup");
            loginForm.classList.remove('active');
            signupForm.classList.add('active');
            clearMessage();
        });
    }

    // Switch to Login
    if (btnShowLogin) {
        btnShowLogin.addEventListener('click', (e) => {
            e.preventDefault();
            console.log("Switching to Login");
            signupForm.classList.remove('active');
            loginForm.classList.add('active');
            clearMessage();
        });
    }

    // Handle Login Submit
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            showMessage('로그인 중...', 'neutral');
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) showMessage(`로그인 실패: ${error.message}`, 'error');
            else showMessage('로그인 성공!', 'success');
        });
    }

    // Handle Signup Submit
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const nickname = document.getElementById('signup-nickname').value;
            showMessage('회원가입 중...', 'neutral');
            const { error } = await supabase.auth.signUp({
                email, password,
                options: { data: { display_name: nickname } }
            });
            if (error) showMessage(`가입 실패: ${error.message}`, 'error');
            else showMessage('가입 성공! 자동 로그인됩니다.', 'success');
        });
    }

    // Handle Logout
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.reload();
        });
    }

    // Handle Profile Modal (Open)
    const profileContainer = document.querySelector('.user-profile');
    if (profileContainer) {
        profileContainer.style.cursor = 'pointer';
        profileContainer.addEventListener('click', () => {
            const modal = document.getElementById('profile-modal-overlay');
            if (modal) modal.classList.add('active');
        });
    }

    // Handle Profile Close
    const btnCloseProfile = document.getElementById('btn-close-profile');
    if (btnCloseProfile) {
        btnCloseProfile.addEventListener('click', () => {
            document.getElementById('profile-modal-overlay').classList.remove('active');
        });
    }

    // Handle Profile Update Form
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        const uploadInput = document.getElementById('profile-upload');
        const previewImg = document.getElementById('profile-img-tag');
        const previewContainer = document.getElementById('profile-preview');

        uploadInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    previewImg.src = ev.target.result;
                    previewImg.style.display = 'block';
                    previewContainer.classList.add('has-image');
                };
                reader.readAsDataURL(file);
            }
        });

        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = profileForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.textContent;

            try {
                submitBtn.disabled = true;
                submitBtn.textContent = '저장 중...';
                const newName = document.getElementById('profile-nickname').value.trim();
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error('Refresh needed');

                const file = uploadInput.files[0];
                let avatarUrl = null;
                if (file) {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    await new Promise(resolve => reader.onload = resolve);
                    avatarUrl = reader.result;
                    localStorage.setItem(`avatar_${user.id}`, avatarUrl);
                }

                let finalUser = user;
                if (newName) {
                    const { data } = await supabase.auth.updateUser({ data: { display_name: newName } });
                    finalUser = data.user;
                }

                alert('프로필이 수정되었습니다.');
                document.getElementById('profile-modal-overlay').classList.remove('active');
                profileForm.reset();
                if (previewContainer) previewContainer.classList.remove('has-image');
                if (previewImg) previewImg.style.display = 'none';
                await showDashboard(finalUser);
            } catch (err) {
                console.error(err);
                alert('수정 실패: ' + err.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            }
        });
    }

    // ----------------------------
    // Async Balance: Check session on load (At the end)
    // ----------------------------
    try {
        console.log("[Auth] Checking initial session...");
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session) {
            console.log("[Auth] Active session found for:", session.user.email);
            await showDashboard(session.user);
        } else {
            console.log("[Auth] No active session, showing login view.");
            showAuth();
        }
    } catch (err) {
        console.error("[Auth] Session check failed:", err.message);
        showAuth();
    } finally {
        console.groupEnd();
    }
}

// Initialization Logic
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupAuth);
} else {
    setupAuth();
}

supabase.auth.onAuthStateChange(async (event, session) => {
    console.log("[Auth] State Change Event:", event);
    if (session) {
        console.log("[Auth] Session active, updating dashboard...");
        await showDashboard(session.user);
    } else {
        console.log("[Auth] No session, showing auth...");
        showAuth();
    }
});

// ----------------------------
// Helper Functions
// ----------------------------
async function showDashboard(user) {
    console.log("[Auth] Switching to Dashboard view...");
    authContainer.style.display = 'none';
    dashboardContainer.style.display = 'flex';

    try {
        const displayName = user.user_metadata?.display_name || user.email.split('@')[0];
        const initial = displayName.charAt(0).toUpperCase();

        const userNameEl = document.getElementById('user-display-name');
        const userAvatarEl = document.getElementById('user-avatar');

        if (userNameEl) userNameEl.textContent = `${displayName}님`;

        const savedAvatar = localStorage.getItem(`avatar_${user.id}`);
        if (savedAvatar && userAvatarEl) {
            userAvatarEl.style.backgroundImage = `url(${savedAvatar})`;
            userAvatarEl.style.backgroundSize = 'cover';
            userAvatarEl.style.backgroundPosition = 'center';
            userAvatarEl.textContent = '';
        } else if (userAvatarEl) {
            userAvatarEl.textContent = initial;
            userAvatarEl.style.backgroundImage = 'none';
        }

        if (!isDashboardInitialized) {
            isDashboardInitialized = true;
            console.log("[Auth] Initializing full dashboard logic...");
            await initDashboard(user);
        }
    } catch (err) {
        console.error("[Auth] Failed to show dashboard UI:", err);
    }
}

function showAuth() {
    dashboardContainer.style.display = 'none';
    authContainer.style.display = 'flex';
    if (loginForm) { loginForm.classList.add('active'); loginForm.reset(); }
    if (signupForm) { signupForm.classList.remove('active'); signupForm.reset(); }
    clearMessage();
}

function showMessage(msg, type) {
    if (!authMessage) return;
    authMessage.textContent = msg;
    authMessage.className = 'auth-message';
    if (type === 'error') authMessage.classList.add('msg-error');
    if (type === 'success') authMessage.classList.add('msg-success');
}

function clearMessage() {
    if (!authMessage) return;
    authMessage.textContent = '';
    authMessage.className = 'auth-message';
}
