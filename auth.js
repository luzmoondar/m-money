
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm"
import { initDashboard } from "./script.js";

// Supabase Configuration
const supabaseUrl = "https://rqdwpnddynwjgekopiea.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxZHdwbmRkeW53amdla29waWVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MzQ3MzcsImV4cCI6MjA4NjQxMDczN30.i431TCpDpYQ6wObMnr62iRiqF6tyDj5hRGk73ZPFe4Y"
const supabase = createClient(supabaseUrl, supabaseKey)

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

function setupAuth() {
    console.log("Setting up Auth Listeners");

    // Switch to Signup
    if (btnShowSignup) {
        btnShowSignup.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent any default action
            console.log("Switching to Signup");
            loginForm.classList.remove('active');
            signupForm.classList.add('active');
            clearMessage();
        });
    } else {
        console.error("Signup button not found");
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
    } else {
        console.error("Login button not found");
    }

    // Handle Login
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            showMessage('로그인 중...', 'neutral');

            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            })

            if (error) {
                showMessage(`로그인 실패: ${error.message}`, 'error');
            } else {
                showMessage('로그인 성공!', 'success');
                // Auth state change will handle transition
            }
        });
    }

    // Handle Signup
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const nickname = document.getElementById('signup-nickname').value;

            showMessage('회원가입 중...', 'neutral');

            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        display_name: nickname,
                    }
                }
            })

            if (error) {
                showMessage(`가입 실패: ${error.message}`, 'error');
            } else {
                showMessage('가입 성공! 자동 로그인됩니다.', 'success');
                // Auth state change will handle transition if auto-confirm is on
            }
        });
    }

    // Handle Logout
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.reload(); // Reload to clear state
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

    // Handle Profile Update
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        // Preview handling
        const uploadInput = document.getElementById('profile-upload');
        const previewImg = document.getElementById('profile-img-tag');
        const previewContainer = document.getElementById('profile-preview');

        uploadInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    previewImg.src = e.target.result;
                    previewImg.style.display = 'block';
                    previewContainer.classList.add('has-image');
                };
                reader.readAsDataURL(file);
            }
        });

        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newName = document.getElementById('profile-nickname').value;
            if (!newName) return;

            // Handle Image Save (Local Storage for Demo as Supabase Storage might not be setup)
            // We save base64 string to localStorage with a key based on User ID
            const file = uploadInput.files[0];
            let avatarUrl = null;

            if (file) {
                // Convert to Base64 and save to localStorage
                // Ideally this should go to Supabase Storage
                const reader = new FileReader();
                reader.readAsDataURL(file);
                await new Promise(resolve => reader.onload = resolve);
                avatarUrl = reader.result;
            }

            // We update the user metadata with the nickname.
            // For the avatar, if we had storage we'd put the URL in metadata.
            // Here we will save the avatarUrl to localStorage keyed by user.id
            // and separate metadata update.

            const { data, error } = await supabase.auth.updateUser({
                data: { display_name: newName }
            });

            if (error) {
                alert('프로필 수정 실패: ' + error.message);
            } else {

                if (avatarUrl && data.user) {
                    localStorage.setItem(`avatar_${data.user.id}`, avatarUrl);
                }

                alert('프로필이 수정되었습니다.');
                document.getElementById('profile-modal-overlay').classList.remove('active');
                // Update UI immediately
                if (data.user) {
                    showDashboard(data.user);
                }
            }
        });
    }
}

// Ensure DOM is ready (though module sort of guarantees it)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupAuth);
} else {
    setupAuth();
}

// ----------------------------
// Auth State Management
// ----------------------------

supabase.auth.onAuthStateChange((event, session) => {
    console.log("Auth Event:", event, session);

    if (session) {
        // User is logged in
        showDashboard(session.user);
    } else {
        // User is logged out
        showAuth();
    }
});

// ----------------------------
// Helper Functions
// ----------------------------

function showDashboard(user) {
    authContainer.style.display = 'none';
    dashboardContainer.style.display = 'flex';

    // Update User Profile UI
    const displayName = user.user_metadata.display_name || user.email.split('@')[0];
    const initial = displayName.charAt(0).toUpperCase();

    const userNameEl = document.getElementById('user-display-name');
    const userAvatarEl = document.getElementById('user-avatar');

    if (userNameEl) userNameEl.textContent = `${displayName}님`;

    // Avatar Logic
    const savedAvatar = localStorage.getItem(`avatar_${user.id}`);
    if (savedAvatar && userAvatarEl) {
        userAvatarEl.style.backgroundImage = `url(${savedAvatar})`;
        userAvatarEl.style.backgroundSize = 'cover';
        userAvatarEl.style.backgroundPosition = 'center';
        userAvatarEl.textContent = ''; // Hide initial
    } else if (userAvatarEl) {
        userAvatarEl.textContent = initial;
        userAvatarEl.style.backgroundImage = 'none';
    }

    // Initialize Dashboard Logic (Only once)
    if (!isDashboardInitialized) {
        initDashboard(user);
        isDashboardInitialized = true;
    }
}

function showAuth() {
    dashboardContainer.style.display = 'none';
    authContainer.style.display = 'flex';
    if (loginForm) {
        loginForm.classList.add('active');
        loginForm.reset();
    }
    if (signupForm) {
        signupForm.classList.remove('active');
        signupForm.reset();
    }
    clearMessage();
}

function showMessage(msg, type) {
    if (!authMessage) return;
    authMessage.textContent = msg;
    authMessage.className = 'auth-message'; // reset
    if (type === 'error') authMessage.classList.add('msg-error');
    if (type === 'success') authMessage.classList.add('msg-success');
}

function clearMessage() {
    if (!authMessage) return;
    authMessage.textContent = '';
    authMessage.className = 'auth-message';
}
