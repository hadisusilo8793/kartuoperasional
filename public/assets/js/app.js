(function() {
    'use strict';
    const TOKEN_KEY = 'authToken';
    const auth = {
        getToken: () => localStorage.getItem(TOKEN_KEY),
        saveToken: (token) => localStorage.setItem(TOKEN_KEY, token),
        logout: () => {
            localStorage.removeItem(TOKEN_KEY);
            window.location.href = '/login.html';
        },
        login: async (username, password) => {
            const response = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const data = await response.json();
            if (data.success && data.token) {
                auth.saveToken(data.token);
            }
            return data;
        }
    };
    const api = {
        fetch: async (url, options = {}) => {
            const token = auth.getToken();
            const headers = {
                'Content-Type': 'application/json',
                ...options.headers,
            };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            const response = await fetch(url, { ...options, headers });
            if (response.status === 401) {
                auth.logout();
                throw new Error('Sesi Anda telah berakhir. Silakan login kembali.');
            }
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }
            return data;
        }
    };
    const ui = {
        showToast: (message, type = 'info') => {
            let container = document.getElementById('toast-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'toast-container';
                document.body.appendChild(container);
            }
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.textContent = message;
            container.appendChild(toast);
            setTimeout(() => toast.classList.add('show'), 10);
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        },
        antiDoubleClick: (button, action) => {
            let isSubmitting = false;
            button.addEventListener('click', async (e) => {
                if (isSubmitting) return;
                isSubmitting = true;
                button.disabled = true;
                const originalText = button.innerHTML;
                button.innerHTML = `<span class="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" role="status" aria-label="loading"></span>`;
                try {
                    await action(e);
                } finally {
                    isSubmitting = false;
                    button.disabled = false;
                    button.innerHTML = originalText;
                }
            });
        }
    };
    function initSidebar() {
        const sidebar = document.getElementById('sidebar');
        const toggleClose = document.getElementById('sidebar-toggle-close');
        const toggleOpen = document.getElementById('sidebar-toggle-open');
        const collapseSidebar = () => {
            sidebar.classList.add('w-20');
            sidebar.classList.remove('w-64');
            document.querySelectorAll('.sidebar-text').forEach(el => el.classList.add('hidden'));
        };
        const expandSidebar = () => {
            sidebar.classList.remove('w-20');
            sidebar.classList.add('w-64');
            document.querySelectorAll('.sidebar-text').forEach(el => el.classList.remove('hidden'));
        };
        if (toggleClose) {
            toggleClose.addEventListener('click', collapseSidebar);
        }
        if (toggleOpen) {
            toggleOpen.addEventListener('click', expandSidebar);
        }
    }
    function initAuthCheck() {
        if (window.location.pathname !== '/login.html' && !auth.getToken()) {
            window.location.href = '/login.html';
        }
    }
    function initLogout() {
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', auth.logout);
        }
    }
    window.app = {
        auth,
        api,
        ui,
        init: () => {
            document.addEventListener('DOMContentLoaded', () => {
                initAuthCheck();
                initSidebar();
                initLogout();
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            });
        }
    };
})();