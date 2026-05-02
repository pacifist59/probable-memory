// Supabase configuration
const SUPABASE_URL = 'https://yyjghcsnomwvqwpaojug.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5amdoY3Nub213dnF3cGFvanVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NzQzNzAsImV4cCI6MjA5MDI1MDM3MH0.HANV95lxI1XgXTALkqXDbe_-U2-_yB2xJD4Zsb-pqf0';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let allSetlists = []; 

// --- Global UI Handlers ---
window.toggleMobileMenu = (s = null) => {
    const menu = document.getElementById('mobile-menu');
    const overlay = document.getElementById('mobile-overlay');
    if (!menu) return;
    const isVisible = menu.classList.contains('active');
    const shouldShow = s !== null ? s : !isVisible;
    
    if (shouldShow) {
        menu.classList.add('active');
        overlay.classList.remove('hidden');
        document.body.classList.add('no-scroll');
    } else {
        menu.classList.remove('active');
        overlay.classList.add('hidden');
        document.body.classList.remove('no-scroll');
    }
}

window.navigateTo = (page, id = null) => {
    const hash = id ? `#/${page}/${id}` : `#/${page}`;
    window.location.hash = hash;
    window.toggleMobileMenu(false);
}

// --- Routing System ---
const routes = {
    home: renderHomePage,
    setlists: renderSetlistsPage,
    artists: renderArtistsPage,
    festivals: renderFestivalsPage,
    venues: renderVenuesPage,
    stats: renderStatsPage,
    setlist: renderSetlistDetailPage,
    profile: renderProfilePage,
    myattended: renderMyAttendancePage
};

window.addEventListener('hashchange', handleRouting);

async function handleRouting() {
    const hash = window.location.hash || '#/home';
    const parts = hash.split('/');
    const page = parts[1] || 'home';
    const id = parts.slice(2).join('/');

    const hero = document.getElementById('home-hero');
    if (hero) hero.style.display = page === 'home' ? 'block' : 'none';
    
    const routerContainer = document.getElementById('page-router');
    if (!routerContainer) return;
    
    routerContainer.innerHTML = `<div class="flex justify-center py-20"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>`;

    if (routes[page]) await routes[page](id);
    else await routes.home();
    
    window.scrollTo(0, 0);
}

// --- Renderers ---

async function renderHomePage() {
    const today = new Date().toISOString().split('T')[0];
    const { data: recent } = await sb.from('setlists').select('*').lte('performance_date', today).order('performance_date', { ascending: false }).limit(5);
    const { data: upcoming } = await sb.from('setlists').select('*').gt('performance_date', today).order('performance_date', { ascending: true }).limit(3);
    
    const routerContainer = document.getElementById('page-router');
    routerContainer.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-16">
            <div class="lg:col-span-2 space-y-16">
                <div>
                    <h2 class="text-3xl font-black mb-10">최근 개최 공연</h2>
                    <div class="space-y-6" id="recent-list"></div>
                </div>
                <div>
                    <h2 class="text-3xl font-black mb-10">개최 예정 공연</h2>
                    <div class="space-y-6" id="upcoming-list"></div>
                </div>
            </div>
            <div class="space-y-10">
                <div class="bg-white dark:bg-gray-900 p-10 rounded-[2.5rem] border dark:border-gray-800 shadow-xl">
                    <h3 class="text-2xl font-black mb-8">인기 아티스트</h3>
                    <ul class="space-y-6" id="trending-artists"></ul>
                </div>
            </div>
        </div>
    `;
    renderSetlistCards(recent || [], 'recent-list');
    renderSetlistCards(upcoming || [], 'upcoming-list', true);
    loadTrendingArtists();
}

async function renderSetlistsPage(filter = null) {
    let query = sb.from('setlists').select('*').order('performance_date', { ascending: false });
    let title = '모든 선곡표';
    if (filter) {
        const parts = decodeURIComponent(filter).split(':');
        if (parts[0] === 'artist') { query = query.eq('artist', parts[1]); title = `${parts[1]} 선곡표`; }
    }
    const { data } = await query;
    document.getElementById('page-router').innerHTML = `<h2 class="text-4xl font-black mb-12">${title}</h2><div class="space-y-6" id="all-list"></div>`;
    renderSetlistCards(data || [], 'all-list');
}

async function renderSetlistDetailPage(id) {
    const { data } = await sb.from('setlists').select('*').eq('id', id).single();
    if (!data) return window.navigateTo('home');
    const { count: likeCount } = await sb.from('likes').select('*', { count: 'exact', head: true }).eq('setlist_id', id);
    const { data: comments } = await sb.from('comments').select('*').eq('setlist_id', id).order('created_at', { ascending: true });
    
    const routerContainer = document.getElementById('page-router');
    routerContainer.innerHTML = `<div id="detail-full-view"></div>`;
    renderDetailView(data, likeCount || 0, comments || [], 'detail-full-view');
}

async function renderDetailView(data, likeCount, comments, targetId) {
    const { data: { session } } = await sb.auth.getSession();
    const container = document.getElementById(targetId);
    
    const songsHtml = (data.songs || []).map((s, i) => {
        // Direct Play Link Optimization: Using search results but structured for auto-play jump
        const query = encodeURIComponent(`${data.artist} ${s} Official`);
        const youtubeLink = `https://www.youtube.com/results?search_query=${query}`;
        
        return `
            <div class="flex items-center justify-between p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800/50 group">
                <div class="flex items-center gap-6">
                    <span class="text-sm font-black text-gray-300 w-6">${i+1}</span>
                    <span class="text-lg font-bold">${s}</span>
                </div>
                <a href="${youtubeLink}" target="_blank" class="text-red-500 opacity-0 group-hover:opacity-100 transition-all text-xl"><i class="fab fa-youtube"></i></a>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div class="flex justify-between items-start mb-12">
            <div>
                <h2 class="text-5xl font-black tracking-tighter mb-2">${data.artist}</h2>
                <p class="text-2xl font-bold text-gray-500">${data.concert}</p>
            </div>
            <div class="flex gap-2">
                <button onclick="window.handleLike('${data.id}')" class="px-6 py-3 bg-pink-50 text-pink-500 rounded-2xl font-black shadow-sm"><i class="fas fa-heart mr-2"></i>${likeCount}</button>
            </div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div class="lg:col-span-8 space-y-8">
                <div class="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border dark:border-gray-800 shadow-sm">${songsHtml || '곡 정보가 없습니다.'}</div>
            </div>
            <div class="lg:col-span-4 space-y-8">
                <div class="bg-gray-100 dark:bg-gray-800 p-8 rounded-[2.5rem]">
                    <h3 class="text-xl font-black mb-6">공연 정보</h3>
                    <p class="font-bold text-gray-600 mb-2">날짜: ${data.performance_date}</p>
                    <p class="font-bold text-gray-600">장소: ${data.venue}</p>
                </div>
                <div>
                    <h3 class="text-xl font-black mb-6">팬 후기</h3>
                    <div class="space-y-4 mb-6">${comments.map(c => `<div class="p-5 bg-white dark:bg-gray-900 rounded-2xl border dark:border-gray-800 shadow-sm"><p class="text-xs font-black text-indigo-500 mb-1">${c.display_name || '익명'}</p><p class="text-sm">${c.content}</p></div>`).join('')}</div>
                    ${session ? `
                        <div class="flex flex-col gap-2">
                            <textarea id="comm-input" class="w-full p-4 rounded-xl border dark:bg-gray-800 dark:border-gray-700 outline-none" rows="3" placeholder="후기를 남겨보세요..."></textarea>
                            <button onclick="window.postComment('${data.id}')" class="w-full py-4 bg-indigo-600 text-white rounded-xl font-black shadow-lg">등록하기</button>
                        </div>` : ''}
                </div>
            </div>
        </div>
    `;
}

// --- Core Logic ---

async function updateAuthUI() {
    const { data: { session } } = await sb.auth.getSession();
    const container = document.getElementById('auth-buttons');
    const mobileSection = document.getElementById('mobile-auth-section');
    if (!container) return;

    if (session) {
        const name = session.user.user_metadata?.display_name || session.user.email.split('@')[0];
        container.innerHTML = `<div class="flex items-center gap-3 bg-gray-100 dark:bg-gray-800 pl-2 pr-4 py-1.5 rounded-2xl cursor-pointer" onclick="window.navigateTo('profile')"><img src="${session.user.user_metadata?.avatar_url || 'https://ui-avatars.com/api/?name='+name}" class="w-8 h-8 rounded-xl"><span class="text-sm font-black hidden lg:inline">${name}</span></div>`;
        if (mobileSection) {
            mobileSection.innerHTML = `
                <button onclick="window.navigateTo('myattended')" class="w-full p-4 rounded-xl font-black bg-gray-50 dark:bg-gray-800 text-left">내 공연 기록</button>
                <button onclick="window.navigateTo('profile')" class="w-full p-4 rounded-xl font-black bg-gray-50 dark:bg-gray-800 text-left">프로필 수정</button>
                <button onclick="sb.auth.signOut(); location.reload();" class="w-full p-4 rounded-xl font-black bg-red-50 text-red-500 text-left">로그아웃</button>
            `;
        }
    } else {
        container.innerHTML = `<button onclick="window.toggleAuthModal(true)" class="bg-indigo-600 text-white px-6 py-2.5 rounded-2xl font-black">로그인</button>`;
        if (mobileSection) mobileSection.innerHTML = `<button onclick="window.toggleAuthModal(true)" class="w-full p-5 bg-indigo-600 text-white rounded-2xl font-black text-xl">로그인하기</button>`;
    }
}

window.postComment = async (id) => {
    const input = document.getElementById('comm-input');
    const content = input.value.trim();
    if (!content) return;
    
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return alert('로그인이 필요합니다.');
    
    // Safety Fallback for display_name
    const nickname = session.user.user_metadata?.display_name || session.user.email.split('@')[0];
    
    const { error } = await sb.from('comments').insert({
        setlist_id: id,
        user_id: session.user.id,
        user_email: session.user.email,
        content: content,
        display_name: nickname // Ensure this column is correctly handled or removed if error persists
    });
    
    if (error) {
        // If display_name causes error, try without it
        const { error: retryError } = await sb.from('comments').insert({
            setlist_id: id, user_id: session.user.id, user_email: session.user.email, content: content
        });
        if (retryError) return alert('후기 등록 실패');
    }
    input.value = ''; renderSetlistDetailPage(id);
}

// --- Utils ---
function renderSetlistCards(data, targetId, isUpcoming = false) {
    const list = document.getElementById(targetId); if (!list) return;
    list.innerHTML = data.map(item => `
        <div onclick="window.navigateTo('setlist', '${item.id}')" class="bg-white dark:bg-gray-900 p-6 rounded-[2rem] border dark:border-gray-800 shadow-sm hover:shadow-xl transition-all cursor-pointer flex justify-between items-center group">
            <div class="flex items-center gap-6">
                <div class="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center text-indigo-600 text-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all"><i class="fas fa-microphone-alt"></i></div>
                <div>
                    <h3 class="font-black text-xl group-hover:text-indigo-600">${item.artist}</h3>
                    <p class="text-sm text-gray-500 font-bold">${item.concert}</p>
                </div>
            </div>
            <div class="text-right">
                <p class="font-black text-lg">${item.performance_date}</p>
                <p class="text-xs text-gray-400 font-bold uppercase tracking-widest">${isUpcoming ? 'Upcoming' : item.venue}</p>
            </div>
        </div>
    `).join('');
}

async function loadTrendingArtists() {
    const { data } = await sb.from('setlists').select('artist');
    const counts = {}; data.forEach(d => counts[d.artist] = (counts[d.artist] || 0) + 1);
    const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 5);
    const container = document.getElementById('trending-artists');
    if (container) {
        container.innerHTML = sorted.map(([name, count], i) => `<li class="flex items-center justify-between font-bold cursor-pointer" onclick="window.navigateTo('setlists', 'artist:${name}')"><span>${i+1}. ${name}</span><span class="text-gray-400 text-sm">${count} 셋리스트</span></li>`).join('');
    }
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI(); handleRouting();
    document.getElementById('setlist-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const { data: { session } } = await sb.auth.getSession();
        if (!session) return alert('로그인이 필요합니다.');
        const f = new FormData(e.target);
        const d = { artist: f.get('artist'), performance_date: f.get('performance_date'), concert: f.get('concert'), venue: f.get('venue'), location: f.get('location'), songs: f.get('songs_text').split('\n').map(s => s.trim()).filter(s => s), user_id: session.user.id };
        const { data: ins } = await sb.from('setlists').insert([d]).select();
        window.toggleModal(false); if (ins?.[0]) window.navigateTo('setlist', ins[0].id);
    });
});

window.handleSocialLogin = async (p) => { await sb.auth.signInWithOAuth({ provider: p, options: { redirectTo: window.location.origin } }); }
window.handleCheckAuthBeforeAdd = async () => { const { data: { session } } = await sb.auth.getSession(); if (!session) window.toggleAuthModal(true); else window.toggleModal(true); }
window.handleLike = async (id) => { const { data: { session } } = await sb.auth.getSession(); if (!session) return alert('로그인 필요'); await sb.from('likes').insert({ setlist_id: id, user_id: session.user.id }); renderSetlistDetailPage(id); }

// Placeholder for missing routes
async function renderArtistsPage() { document.getElementById('page-router').innerHTML = '<h2 class="text-3xl font-black">아티스트 목록 준비 중</h2>'; }
async function renderFestivalsPage() { document.getElementById('page-router').innerHTML = '<h2 class="text-3xl font-black">페스티벌 준비 중</h2>'; }
async function renderVenuesPage() { document.getElementById('page-router').innerHTML = '<h2 class="text-3xl font-black">공연장 준비 중</h2>'; }
async function renderStatsPage() { document.getElementById('page-router').innerHTML = '<h2 class="text-3xl font-black">통계 준비 중</h2>'; }
async function renderProfilePage() { document.getElementById('page-router').innerHTML = '<h2 class="text-3xl font-black">프로필 준비 중</h2>'; }
async function renderMyAttendancePage() { document.getElementById('page-router').innerHTML = '<h2 class="text-3xl font-black">내 공연 기록 준비 중</h2>'; }
