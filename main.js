// Supabase configuration
const SUPABASE_URL = 'https://yyjghcsnomwvqwpaojug.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5amdoY3Nub213dnF3cGFvanVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NzQzNzAsImV4cCI6MjA5MDI1MDM3MH0.HANV95lxI1XgXTALkqXDbe_-U2-_yB2xJD4Zsb-pqf0';

// Global Supabase Client
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Modal handling
window.toggleModal = function(show) {
    const modal = document.getElementById('add-modal');
    if (!modal) return;
    if (show) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    } else {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
}

window.toggleLoginModal = function(show) {
    const modal = document.getElementById('login-modal');
    if (!modal) return;
    if (show) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    } else {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
}

// Auth Logic
async function updateAuthUI() {
    const { data: { session } } = await sb.auth.getSession();
    const authContainer = document.getElementById('auth-buttons');
    if (!authContainer) return;

    if (session) {
        authContainer.innerHTML = `
            <span class="text-sm font-bold text-gray-500 dark:text-gray-400 hidden lg:inline mr-2">${session.user.email}</span>
            <button id="logout-btn" class="text-sm font-bold text-gray-700 dark:text-gray-300 hover:text-red-500 transition">로그아웃</button>
        `;
        document.getElementById('logout-btn')?.addEventListener('click', async () => {
            await sb.auth.signOut();
            updateAuthUI();
        });
    } else {
        authContainer.innerHTML = `
            <button onclick="toggleLoginModal(true)" class="text-sm font-bold text-gray-700 dark:text-gray-300 hover:text-indigo-600 transition">로그인</button>
            <button onclick="toggleLoginModal(true)" class="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition shadow-md shadow-indigo-500/20">회원가입</button>
        `;
    }
}

window.handleCheckAuthBeforeAdd = async function() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
        alert('선곡표를 작성하려면 로그인이 필요합니다.');
        toggleLoginModal(true);
    } else {
        toggleModal(true);
    }
}

// Date helper
function getRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    if (diffInSeconds < 60) return '방금 전';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`;
    return `${Math.floor(diffInSeconds / 86400)}일 전`;
}

// Fetch and Render
async function fetchAndRenderSetlists() {
    const listElement = document.getElementById('recent-list');
    if (!listElement) return;

    listElement.innerHTML = `<div class="animate-pulse space-y-4"><div class="h-24 bg-gray-100 dark:bg-gray-800 rounded-3xl w-full"></div></div>`;

    try {
        const { data, error } = await sb.from('setlists').select('*').order('created_at', { ascending: false });
        if (error) throw error;

        if (!data || data.length === 0) {
            listElement.innerHTML = `<div class="text-center py-12 bg-white dark:bg-gray-900 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700"><p class="text-gray-500 dark:text-gray-400 font-bold">아직 등록된 선곡표가 없습니다.</p></div>`;
            return;
        }

        listElement.innerHTML = data.map(item => `
            <div class="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:-translate-y-1">
                <div class="flex items-center space-x-6">
                    <div class="bg-indigo-50 dark:bg-indigo-900/30 w-16 h-16 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                        <i class="fas fa-microphone-alt text-2xl"></i>
                    </div>
                    <div>
                        <h3 class="font-black text-xl text-gray-900 dark:text-white group-hover:text-indigo-600 transition-colors">${item.artist}</h3>
                        <p class="text-base text-gray-600 dark:text-gray-400 font-bold mt-1">${item.concert}</p>
                        <div class="flex items-center mt-2 text-sm text-gray-400 dark:text-gray-500 font-medium space-x-3">
                            <span><i class="fas fa-map-marker-alt mr-1.5 text-indigo-500"></i> ${item.venue || '공연장 정보 없음'}</span>
                        </div>
                    </div>
                </div>
                <div class="flex flex-row md:flex-col items-center md:items-end justify-between">
                    <span class="text-lg font-black text-gray-700 dark:text-gray-300">${item.performance_date}</span>
                    <span class="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-md">${getRelativeTime(item.created_at)}</span>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error(err);
        listElement.innerHTML = `<p class="text-red-500 font-bold text-center">오류 발생</p>`;
    }
}

// Forms Initialization
document.addEventListener('DOMContentLoaded', () => {
    fetchAndRenderSetlists();
    updateAuthUI();

    // Setlist Form
    document.getElementById('setlist-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const { data: { session } } = await sb.auth.getSession();
        if (!session) return alert('로그인이 필요합니다.');

        const formData = new FormData(e.target);
        const songsText = formData.get('songs_text');
        const songs = songsText ? songsText.split('\n').map(s => s.trim()).filter(s => s) : [];

        const setlistData = {
            artist: formData.get('artist'),
            performance_date: formData.get('performance_date'),
            concert: formData.get('concert'),
            venue: formData.get('venue'),
            location: formData.get('location'),
            songs: songs
        };

        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true; btn.innerText = '등록 중...';

        try {
            const { error } = await sb.from('setlists').insert([setlistData]);
            if (error) throw error;
            alert('등록되었습니다!');
            toggleModal(false);
            e.target.reset();
            fetchAndRenderSetlists();
        } catch (err) {
            alert('등록 실패: ' + err.message);
        } finally {
            btn.disabled = false; btn.innerText = '등록하기';
        }
    });

    // Login Form
    document.getElementById('login-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const email = formData.get('email');
        const password = formData.get('password');
        const btn = document.getElementById('login-btn');
        btn.disabled = true; btn.innerText = '로그인 중...';

        try {
            const { error } = await sb.auth.signInWithPassword({ email, password });
            if (error) throw error;
            toggleLoginModal(false);
            updateAuthUI();
        } catch (err) {
            alert('로그인 실패: ' + err.message);
        } finally {
            btn.disabled = false; btn.innerText = '로그인';
        }
    });

    // Signup Btn
    document.getElementById('signup-btn')?.addEventListener('click', async () => {
        const form = document.getElementById('login-form');
        const email = form.email.value;
        const password = form.password.value;
        if (!email || !password) return alert('이메일과 비밀번호를 입력해주세요.');

        try {
            const { error } = await sb.auth.signUp({ email, password });
            if (error) throw error;
            alert('가입 확인 메일이 발송되었거나 가입되었습니다. 이메일을 확인하거나 로그인해주세요.');
        } catch (err) {
            alert('가입 실패: ' + err.message);
        }
    });
});
