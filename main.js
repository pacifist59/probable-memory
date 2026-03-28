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

// Auth Logic
async function updateAuthUI() {
    const { data: { session } } = await sb.auth.getSession();
    const authContainer = document.getElementById('auth-buttons');
    if (!authContainer) return;

    if (session) {
        // Find a name to display: Full Name > Nickname > Email prefix
        const userDisplayName = session.user.user_metadata?.full_name || 
                                session.user.user_metadata?.name || 
                                session.user.email.split('@')[0];

        authContainer.innerHTML = `
            <div class="flex items-center gap-4">
                <div class="flex items-center gap-3 bg-gray-100 dark:bg-gray-800 pl-2 pr-4 py-1.5 rounded-2xl border border-gray-200 dark:border-gray-700">
                    <img src="${session.user.user_metadata?.avatar_url || 'https://ui-avatars.com/api/?name='+userDisplayName}" class="w-8 h-8 rounded-xl shadow-sm" alt="profile">
                    <span class="text-sm font-black text-gray-700 dark:text-gray-200 hidden lg:inline">${userDisplayName}</span>
                </div>
                <button id="logout-btn" class="text-sm font-black text-gray-500 hover:text-red-500 transition-colors">로그아웃</button>
            </div>
        `;
        document.getElementById('logout-btn')?.addEventListener('click', async () => {
            await sb.auth.signOut();
            updateAuthUI();
        });
    } else {
        authContainer.innerHTML = `
            <button onclick="toggleAuthModal(true)" class="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-base hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 active:scale-95">로그인</button>
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
        alert(`${provider} 로그인 설정이 필요합니다.\nSupabase 대시보드에서 Client ID와 Secret을 입력해주세요.`);
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
                <div class="text-center py-24 bg-white dark:bg-gray-900 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-gray-800">
                    <div class="w-24 h-24 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-8">
                        <i class="fas fa-music text-4xl text-gray-300"></i>
                    </div>
                    <p class="text-gray-500 dark:text-gray-400 font-black text-xl">아직 등록된 선곡표가 없습니다.</p>
                </div>`;
            return;
        }

        listElement.innerHTML = data.map(item => `
            <div class="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-2xl transition-all duration-500 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-8 group hover:-translate-y-2 relative overflow-hidden">
                <div class="flex items-center space-x-8 relative z-10">
                    <div class="bg-indigo-50 dark:bg-indigo-900/20 w-20 h-20 rounded-[1.5rem] flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 shadow-inner">
                        <i class="fas fa-microphone-alt text-3xl"></i>
                    </div>
                    <div>
                        <h3 class="font-black text-2xl text-gray-900 dark:text-white group-hover:text-indigo-600 transition-colors tracking-tight">${item.artist}</h3>
                        <p class="text-lg text-gray-500 dark:text-gray-400 font-bold mt-1">${item.concert}</p>
                        <div class="flex items-center mt-3 text-sm text-gray-400 dark:text-gray-500 font-black space-x-5">
                            <span><i class="fas fa-map-marker-alt mr-2 text-indigo-500"></i> ${item.venue || '공연장 정보 없음'}</span>
                            <span class="flex items-center"><i class="fas fa-list-ul mr-2 text-purple-500"></i> ${item.songs?.length || 0} 곡</span>
                        </div>
                    </div>
                </div>
                <div class="flex flex-row md:flex-col items-center md:items-end justify-between relative z-10 pt-6 md:pt-0 border-t md:border-t-0 border-gray-50 dark:border-gray-800">
                    <span class="text-xl font-black text-gray-800 dark:text-gray-200">${item.performance_date}</span>
                    <span class="text-xs font-black text-gray-400 mt-2 uppercase tracking-[0.2em] bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-full">${getRelativeTime(item.created_at)}</span>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error(err);
        listElement.innerHTML = `<div class="bg-red-50 dark:bg-red-900/20 p-10 rounded-[2.5rem] text-red-600 dark:text-red-400 font-black text-center">데이터 로딩 실패</div>`;
    }
}

// Initialize
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

    // Handle OAuth callback (if URL contains hash)
    if (window.location.hash || window.location.search) {
        sb.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') {
                updateAuthUI();
                fetchAndRenderSetlists();
            }
        });
    }
});
