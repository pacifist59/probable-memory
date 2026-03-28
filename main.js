// Supabase configuration
const SUPABASE_URL = 'https://yyjghcsnomwvqwpaojug.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5amdoY3Nub213dnF3cGFvanVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NzQzNzAsImV4cCI6MjA5MDI1MDM3MH0.HANV95lxI1XgXTALkqXDbe_-U2-_yB2xJD4Zsb-pqf0';

// Global Supabase Client
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let isLoginMode = true;

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

window.toggleAuthModal = function(show) {
    const modal = document.getElementById('auth-modal');
    if (!modal) return;
    if (show) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    } else {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
}

window.toggleAuthMode = function() {
    isLoginMode = !isLoginMode;
    const title = document.getElementById('auth-title');
    const subtitle = document.getElementById('auth-subtitle');
    const submitBtn = document.getElementById('auth-submit-btn');
    const switchText = document.getElementById('auth-switch-text');
    const switchBtn = document.getElementById('auth-switch-btn');

    if (isLoginMode) {
        title.innerText = '반가워요!';
        subtitle.innerText = '선곡표에 로그인하여 감동을 기록하세요.';
        submitBtn.innerText = '로그인';
        switchText.innerText = '계정이 없으신가요?';
        switchBtn.innerText = '회원가입';
    } else {
        title.innerText = '환영합니다!';
        subtitle.innerText = '회원으로 가입하고 나만의 선곡표를 만들어보세요.';
        submitBtn.innerText = '회원가입';
        switchText.innerText = '이미 계정이 있으신가요?';
        switchBtn.innerText = '로그인';
    }
}

// Auth Logic
async function updateAuthUI() {
    const { data: { session } } = await sb.auth.getSession();
    const authContainer = document.getElementById('auth-buttons');
    if (!authContainer) return;

    if (session) {
        authContainer.innerHTML = `
            <div class="flex items-center gap-4">
                <span class="text-sm font-bold text-gray-500 dark:text-gray-400 hidden lg:inline bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700">${session.user.email}</span>
                <button id="logout-btn" class="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 transition-all border border-transparent hover:border-red-200">로그아웃</button>
            </div>
        `;
        document.getElementById('logout-btn')?.addEventListener('click', async () => {
            await sb.auth.signOut();
            updateAuthUI();
        });
    } else {
        authContainer.innerHTML = `
            <button onclick="toggleAuthModal(true)" class="text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-indigo-600 transition-colors">로그인</button>
            <button onclick="toggleAuthModal(true)" class="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 active:scale-95">시작하기</button>
        `;
    }
}

window.handleSocialLogin = async function(provider) {
    try {
        const { error } = await sb.auth.signInWithOAuth({
            provider: provider,
            options: {
                redirectTo: window.location.origin
            }
        });
        if (error) throw error;
    } catch (err) {
        alert(`${provider} 로그인 실패: ${err.message}\n(Supabase 대시보드에서 해당 Provider를 먼저 활성화해야 합니다)`);
    }
}

window.handleCheckAuthBeforeAdd = async function() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) {
        alert('선곡표를 작성하려면 로그인이 필요합니다.');
        toggleAuthModal(true);
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

    listElement.innerHTML = `<div class="animate-pulse space-y-6"><div class="h-32 bg-gray-100 dark:bg-gray-800 rounded-[2rem] w-full"></div><div class="h-32 bg-gray-100 dark:bg-gray-800 rounded-[2rem] w-full"></div></div>`;

    try {
        const { data, error } = await sb.from('setlists').select('*').order('created_at', { ascending: false });
        if (error) throw error;

        if (!data || data.length === 0) {
            listElement.innerHTML = `
                <div class="text-center py-20 bg-white dark:bg-gray-900 rounded-[2rem] border-2 border-dashed border-gray-100 dark:border-gray-800">
                    <div class="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                        <i class="fas fa-music text-3xl text-gray-300"></i>
                    </div>
                    <p class="text-gray-500 dark:text-gray-400 font-bold text-lg">아직 등록된 선곡표가 없습니다.<br>첫 번째 선곡표의 주인공이 되어보세요!</p>
                </div>`;
            return;
        }

        listElement.innerHTML = data.map(item => `
            <div class="bg-white dark:bg-gray-900 p-8 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-2xl transition-all duration-500 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-8 group hover:-translate-y-2 relative overflow-hidden">
                <div class="flex items-center space-x-8 relative z-10">
                    <div class="bg-indigo-50 dark:bg-indigo-900/20 w-20 h-20 rounded-[1.5rem] flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 shadow-inner">
                        <i class="fas fa-microphone-alt text-3xl"></i>
                    </div>
                    <div>
                        <h3 class="font-black text-2xl text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors tracking-tight">${item.artist}</h3>
                        <p class="text-lg text-gray-500 dark:text-gray-400 font-bold mt-1">${item.concert}</p>
                        <div class="flex items-center mt-3 text-sm text-gray-400 dark:text-gray-500 font-bold space-x-4">
                            <span><i class="fas fa-map-marker-alt mr-2 text-indigo-500"></i> ${item.venue || '공연장 정보 없음'}</span>
                            <span class="flex items-center"><i class="fas fa-compact-disc mr-2 text-purple-500"></i> ${item.songs?.length || 0} 곡 수록</span>
                        </div>
                    </div>
                </div>
                <div class="flex flex-row md:flex-col items-center md:items-end justify-between relative z-10 border-t md:border-t-0 border-gray-50 dark:border-gray-800 pt-6 md:pt-0">
                    <span class="text-xl font-black text-gray-800 dark:text-gray-200">${item.performance_date}</span>
                    <span class="text-xs font-black text-gray-400 mt-2 uppercase tracking-[0.2em] bg-gray-50 dark:bg-gray-800 px-4 py-1.5 rounded-full border border-gray-100 dark:border-gray-700">${getRelativeTime(item.created_at)}</span>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error(err);
        listElement.innerHTML = `<div class="bg-red-50 dark:bg-red-900/20 p-8 rounded-[2rem] text-red-600 dark:text-red-400 font-black text-center border border-red-100 dark:border-red-900/30">데이터를 불러오는 중 오류가 발생했습니다.</div>`;
    }
}

// Forms Initialization
document.addEventListener('DOMContentLoaded', () => {
    fetchAndRenderSetlists();
    updateAuthUI();

    // Integrated Auth Form (Login/Signup)
    document.getElementById('auth-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const email = formData.get('email');
        const password = formData.get('password');
        const btn = document.getElementById('auth-submit-btn');
        
        btn.disabled = true;
        btn.innerText = isLoginMode ? '로그인 중...' : '회원가입 중...';

        try {
            if (isLoginMode) {
                const { error } = await sb.auth.signInWithPassword({ email, password });
                if (error) throw error;
                toggleAuthModal(false);
            } else {
                const { error } = await sb.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: window.location.origin
                    }
                });
                if (error) throw error;
                alert('가입되었습니다! 이메일을 확인하거나 지금 바로 로그인해보세요.\n(이메일 인증 설정에 따라 즉시 로그인이 가능할 수 있습니다)');
                isLoginMode = true;
                toggleAuthMode();
            }
            updateAuthUI();
        } catch (err) {
            alert((isLoginMode ? '로그인' : '회원가입') + ' 실패: ' + err.message);
        } finally {
            btn.disabled = false;
            btn.innerText = isLoginMode ? '로그인' : '회원가입';
        }
    });

    // Setlist Form
    document.getElementById('setlist-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const { data: { session } } = await sb.auth.getSession();
        if (!session) return alert('로그인이 필요합니다.');

        const formData = new FormData(e.target);
        const songsText = formData.get('songs_text');
        const songs = songsText ? songsText.split('\n').map(s => s.trim().replace(/^\d+\.\s*/, '')).filter(s => s) : [];

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
            alert('성공적으로 등록되었습니다!');
            toggleModal(false);
            e.target.reset();
            fetchAndRenderSetlists();
        } catch (err) {
            alert('등록 실패: ' + err.message);
        } finally {
            btn.disabled = false; btn.innerText = '등록하기';
        }
    });
});