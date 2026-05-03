// Supabase configuration
const SUPABASE_URL = 'https://yyjghcsnomwvqwpaojug.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5amdoY3Nub213dnF3cGFvanVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NzQzNzAsImV4cCI6MjA5MDI1MDM3MH0.HANV95lxI1XgXTALkqXDbe_-U2-_yB2xJD4Zsb-pqf0';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let editingId = null;

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
        setTimeout(() => overlay.style.opacity = '1', 10);
        document.body.classList.add('no-scroll');
    } else {
        menu.classList.remove('active');
        overlay.style.opacity = '0';
        setTimeout(() => overlay.classList.add('hidden'), 300);
        document.body.classList.remove('no-scroll');
    }
}

window.navigateTo = (page, id = null) => {
    const hash = id ? `#/${page}/${id}` : `#/${page}`;
    window.location.hash = hash;
    window.toggleMobileMenu(false);
    updateActiveNavLink(page);
}

function updateActiveNavLink(page) {
    document.querySelectorAll('nav a[href^="#/"]').forEach(link => {
        const linkPage = link.getAttribute('href').split('/')[1];
        if (linkPage === page) {
            link.classList.add('text-indigo-600', 'dark:text-indigo-400');
            link.classList.remove('text-gray-500', 'dark:text-gray-400');
        } else {
            link.classList.remove('text-indigo-600', 'dark:text-indigo-400');
            link.classList.add('text-gray-500', 'dark:text-gray-400');
        }
    });
}

window.showToast = (message, type = 'success') => {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    const bg = type === 'success' ? 'bg-indigo-600' : 'bg-red-500';
    toast.className = `${bg} text-white px-6 py-4 rounded-2xl shadow-2xl pointer-events-auto transform translate-x-full transition-all duration-300 font-bold flex items-center gap-3`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.remove('translate-x-full'), 10);
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-x-full');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

window.toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.theme = isDark ? 'dark' : 'light';
}

window.toggleModal = (s) => { 
    const modal = document.getElementById('add-modal');
    if (!modal) return;
    modal.classList.toggle('hidden', !s);
    if (!s) {
        editingId = null;
        document.getElementById('setlist-form')?.reset();
        const title = modal.querySelector('h3');
        const btn = modal.querySelector('button[type="submit"]');
        if (title) title.innerText = '새 선곡표 등록';
        if (btn) btn.innerText = '등록하기';
    }
}

window.toggleAuthModal = (s) => { 
    document.getElementById('auth-modal').classList.toggle('hidden', !s); 
}

window.handleSocialLogin = async (p) => { 
    await sb.auth.signInWithOAuth({ provider: p, options: { redirectTo: window.location.origin } }); 
}

window.handleCheckAuthBeforeAdd = async () => { 
    const { data: { session } } = await sb.auth.getSession(); 
    if (!session) window.toggleAuthModal(true); 
    else window.toggleModal(true); 
}

window.handleLike = async (id) => { 
    const { data: { session } } = await sb.auth.getSession(); 
    if (!session) return window.toggleAuthModal(true); 

    const { data: existing } = await sb.from('likes').select('*').eq('setlist_id', id).eq('user_id', session.user.id).single();

    if (existing) {
        const { error } = await sb.from('likes').delete().eq('id', existing.id);
        if (error) window.showToast('취소 처리 중 오류가 발생했습니다.', 'error');
        else {
            window.showToast('공연 관람 기록이 취소되었습니다.');
            renderSetlistDetailPage(id);
        }
    } else {
        const { error } = await sb.from('likes').insert({ setlist_id: id, user_id: session.user.id }); 
        if (error) window.showToast('기록 저장 중 오류가 발생했습니다.', 'error');
        else {
            window.showToast('공연 관람 기록이 저장되었습니다!');
            renderSetlistDetailPage(id); 
        }
    }
}

window.startEdit = async (id) => {
    const { data, error } = await sb.from('setlists').select('*').eq('id', id).single();
    if (error || !data) return window.showToast('데이터를 불러올 수 없습니다.', 'error');
    
    editingId = id;
    const f = document.getElementById('setlist-form');
    if (!f) return;
    
    f.artist.value = data.artist || '';
    f.category.value = data.category || 'Concert';
    f.performance_date.value = data.performance_date || '';
    f.concert.value = data.concert || '';
    f.venue.value = data.venue || '';
    f.location.value = data.location || '';
    f.songs_text.value = data.songs ? data.songs.join('\n') : '';
    
    const modal = document.getElementById('add-modal');
    const title = modal.querySelector('h3');
    const btn = modal.querySelector('button[type="submit"]');
    if (title) title.innerText = '선곡표 수정';
    if (btn) btn.innerText = '수정 완료';
    
    window.toggleModal(true);
}

// --- Global Search System ---
function initGlobalSearch() {
    const input = document.getElementById('global-search');
    const results = document.getElementById('search-results');
    if (!input || !results) return;

    let debounceTimer;
    input.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const query = e.target.value.trim();
        if (query.length < 2) {
            results.classList.add('hidden');
            return;
        }

        debounceTimer = setTimeout(async () => {
            const { data, error } = await sb.from('setlists')
                .select('id, artist, concert, performance_date')
                .or(`artist.ilike.%${query}%,concert.ilike.%${query}%,venue.ilike.%${query}%`)
                .limit(5);

            if (error || !data?.length) {
                results.innerHTML = '<div class="p-4 text-sm text-gray-500 text-center">검색 결과가 없습니다.</div>';
            } else {
                results.innerHTML = data.map(item => `
                    <div onclick="window.navigateTo('setlist', '${item.id}'); document.getElementById('search-results').classList.add('hidden'); document.getElementById('global-search').value='';" class="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border-b dark:border-gray-800 last:border-none">
                        <p class="font-black text-indigo-600 text-sm">${item.artist}</p>
                        <p class="text-xs font-bold text-gray-400 truncate">${item.concert}</p>
                        <p class="text-[10px] text-gray-300 mt-1">${item.performance_date}</p>
                    </div>
                `).join('');
            }
            results.classList.remove('hidden');
        }, 300);
    });

    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !results.contains(e.target)) {
            results.classList.add('hidden');
        }
    });
}

window.showSkeleton = (containerId, count = 3) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    const skeletons = Array(count).fill(0).map(() => `
        <div class="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 flex justify-between items-center animate-pulse-subtle">
            <div class="flex items-center gap-8">
                <div class="w-20 h-20 bg-gray-200 dark:bg-gray-800 rounded-3xl"></div>
                <div class="space-y-3">
                    <div class="h-4 bg-gray-200 dark:bg-gray-800 rounded w-24"></div>
                    <div class="h-8 bg-gray-200 dark:bg-gray-800 rounded w-48"></div>
                    <div class="h-4 bg-gray-200 dark:bg-gray-800 rounded w-32"></div>
                </div>
            </div>
            <div class="hidden sm:block space-y-3">
                <div class="h-6 bg-gray-200 dark:bg-gray-800 rounded w-32"></div>
                <div class="h-4 bg-gray-200 dark:bg-gray-800 rounded w-20 ml-auto"></div>
            </div>
        </div>
    `).join('');
    container.innerHTML = skeletons;
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
    
    // Smooth transition
    routerContainer.classList.remove('animate-fade-in');
    routerContainer.innerHTML = `<div id="router-skeleton" class="space-y-6"></div>`;
    window.showSkeleton('router-skeleton', 5);

    if (routes[page]) await routes[page](id);
    else await routes.home();
    
    routerContainer.classList.add('animate-fade-in');
    window.scrollTo(0, 0);
}

// --- Page Renderers ---

async function renderHomePage() {
    const today = new Date().toISOString().split('T')[0];
    const { data: recent } = await sb.from('setlists').select('*').lte('performance_date', today).order('performance_date', { ascending: false }).limit(5);
    const { data: upcoming } = await sb.from('setlists').select('*').gt('performance_date', today).order('performance_date', { ascending: true }).limit(3);
    
    // Phase 2: Dynamic Hero Update
    const heroContent = document.getElementById('hero-dynamic-content');
    const heroBg = document.getElementById('hero-background');
    
    if (recent?.[0]) {
        const feat = recent[0];
        if (heroBg) heroBg.style.backgroundImage = feat.image_url ? `url('${feat.image_url}')` : `url('https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1920&q=80')`;
        if (heroContent) {
            heroContent.innerHTML = `
                <div class="inline-block px-4 py-1.5 bg-indigo-600/80 backdrop-blur-md rounded-full text-white text-[10px] font-black mb-6 uppercase tracking-[0.3em] animate-fade-in">Featured Setlist</div>
                <h2 class="text-4xl md:text-6xl font-black mb-4 tracking-tighter leading-tight">${feat.artist}</h2>
                <p class="text-xl md:text-2xl mb-10 text-indigo-100/90 font-bold italic">${feat.concert}</p>
                <div class="flex flex-col sm:flex-row justify-center gap-4">
                    <button onclick="window.navigateTo('setlist', '${feat.id}')" class="bg-white text-indigo-900 px-10 py-4 rounded-2xl font-black text-lg hover:scale-105 transition-all shadow-2xl">지금 확인하기</button>
                    <button onclick="window.navigateTo('setlists')" class="bg-indigo-600/40 backdrop-blur-lg text-white border border-white/20 px-10 py-4 rounded-2xl font-black text-lg hover:bg-white/20 transition-all">전체 목록 보기</button>
                </div>
            `;
        }
    }

    const routerContainer = document.getElementById('page-router');
    routerContainer.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 sm:gap-20">
            <div class="lg:col-span-8 space-y-24">
                <section>
                    <div class="flex items-end justify-between mb-12 border-b-4 border-indigo-600 pb-4">
                        <div>
                            <p class="text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase tracking-[0.3em] mb-2">Live Archives</p>
                            <h2 class="text-5xl sm:text-6xl font-black tracking-tighter">최근 개최 공연</h2>
                        </div>
                        <a href="#/setlists" class="group flex items-center gap-2 text-gray-400 hover:text-indigo-600 font-black transition-colors mb-2">
                            전체 보기 <i class="fas fa-arrow-right text-xs group-hover:translate-x-1 transition-transform"></i>
                        </a>
                    </div>
                    <div class="space-y-8" id="recent-list"></div>
                </section>
                
                <section class="bg-gray-900 dark:bg-black rounded-[4rem] p-10 sm:p-16 text-white overflow-hidden relative group">
                    <div class="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 blur-[100px] -mr-32 -mt-32"></div>
                    <div class="relative z-10">
                        <div class="flex items-center gap-4 mb-10">
                            <div class="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-xl animate-bounce"><i class="fas fa-calendar-star"></i></div>
                            <h2 class="text-4xl font-black tracking-tighter">개최 예정 공연</h2>
                        </div>
                        <div class="space-y-6" id="upcoming-list"></div>
                    </div>
                </section>
            </div>
            
            <aside class="lg:col-span-4 space-y-12">
                <div class="bg-white dark:bg-gray-900 p-10 rounded-[3.5rem] border-2 border-indigo-50 dark:border-gray-800 shadow-xl sticky top-32">
                    <div class="flex items-center gap-3 mb-10">
                        <span class="text-3xl text-yellow-500"><i class="fas fa-fire-alt"></i></span>
                        <h3 class="text-2xl font-black tracking-tight">실시간 인기 아티스트</h3>
                    </div>
                    <ul class="space-y-4" id="trending-artists"></ul>
                    <div class="mt-10 pt-8 border-t dark:border-gray-800">
                        <button onclick="window.navigateTo('stats')" class="w-full py-4 bg-gray-50 dark:bg-gray-800 rounded-2xl font-black text-gray-500 hover:bg-indigo-600 hover:text-white transition-all">전체 랭킹 보기</button>
                    </div>
                </div>
            </aside>
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
        const decoded = decodeURIComponent(filter);
        const [type, value] = [decoded.split(':')[0], decoded.split(':').slice(1).join(':')];
        if (type === 'artist') { query = query.eq('artist', value); title = `${value} 선곡표`; }
        else if (type === 'venue') { query = query.eq('venue', value); title = `${value} 공연 기록`; }
        else if (type === 'category') { query = query.eq('category', value); title = value === 'Festival' ? '페스티벌 아카이브' : title; }
    }

    const { data } = await query;
    document.getElementById('page-router').innerHTML = `
        <div class="animate-fade-in">
            <h2 class="text-4xl font-black mb-12">${title}</h2>
            <div class="space-y-6" id="all-list"></div>
        </div>
    `;
    renderSetlistCards(data || [], 'all-list');
}

async function renderArtistsPage() {
    const { data } = await sb.from('setlists').select('artist');
    const counts = {}; 
    data?.forEach(d => counts[d.artist] = (counts[d.artist] || 0) + 1);
    const artists = Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0], 'ko'));
    
    document.getElementById('page-router').innerHTML = `
        <div class="animate-fade-in">
            <h2 class="text-4xl font-black mb-12">아티스트 목록</h2>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
                ${artists.map(([name, count]) => `
                    <div onclick="window.navigateTo('setlists', 'artist:${name}')" class="p-8 bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl hover:border-indigo-500 cursor-pointer transition-all group text-center">
                        <h3 class="text-xl font-black mb-1 group-hover:text-indigo-600">${name}</h3>
                        <p class="text-sm text-gray-400 font-bold">${count} 선곡표</p>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

async function renderFestivalsPage() {
    const { data } = await sb.from('setlists').select('*').eq('category', 'Festival').order('performance_date', { ascending: false });
    const festivals = [...new Set(data?.map(d => d.concert) || [])].sort();
    document.getElementById('page-router').innerHTML = `
        <div class="animate-fade-in">
            <h2 class="text-4xl font-black mb-12">페스티벌 아카이브</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                ${festivals.map(name => `<div onclick="window.navigateTo('setlists', 'category:Festival')" class="p-10 bg-indigo-50 dark:bg-gray-900 rounded-[2.5rem] border-2 border-transparent hover:border-indigo-500 cursor-pointer transition-all font-black text-2xl">${name}</div>`).join('')}
            </div>
        </div>
    `;
}

async function renderVenuesPage() {
    const { data } = await sb.from('setlists').select('venue, location');
    const uniqueVenues = []; const seen = new Set();
    data?.forEach(d => { if (d.venue && !seen.has(d.venue)) { seen.add(d.venue); uniqueVenues.push(d); } });
    document.getElementById('page-router').innerHTML = `
        <div class="animate-fade-in">
            <h2 class="text-4xl font-black mb-12">공연장 정보</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                ${uniqueVenues.map(v => `<div onclick="window.navigateTo('setlists', 'venue:${v.venue}')" class="p-8 bg-white dark:bg-gray-900 rounded-[2rem] border dark:border-gray-800 shadow-sm hover:border-indigo-500 cursor-pointer transition-all"><h3 class="text-xl font-black mb-1">${v.venue}</h3><p class="text-sm text-gray-400 font-bold">${v.location || ''}</p></div>`).join('')}
            </div>
        </div>
    `;
}

async function renderStatsPage() {
    const { data } = await sb.from('setlists').select('artist');
    const counts = {}; 
    data?.forEach(s => counts[s.artist] = (counts[s.artist] || 0) + 1);
    const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]);
    document.getElementById('page-router').innerHTML = `
        <div class="bg-white dark:bg-gray-900 p-10 rounded-[3rem] shadow-xl border dark:border-gray-800 animate-fade-in">
            <h3 class="text-3xl font-black mb-10 flex items-center gap-3"><i class="fas fa-crown text-yellow-500"></i> 아티스트 랭킹</h3>
            <div class="space-y-6">
                ${sorted.map(([name, count], i) => `<div class="flex items-center justify-between p-6 bg-gray-50 dark:bg-gray-800 rounded-3xl"><span class="text-2xl font-black ${i<3 ? 'text-indigo-500' : 'text-gray-300'}">${i+1}. ${name}</span><span class="px-6 py-2 bg-white dark:bg-gray-700 rounded-full font-black shadow-sm">${count} 선곡표</span></div>`).join('')}
            </div>
        </div>`;
}

async function renderSetlistDetailPage(id) {
    const { data } = await sb.from('setlists').select('*').eq('id', id).single();
    if (!data) return window.navigateTo('home');
    const { count: likeCount } = await sb.from('likes').select('*', { count: 'exact', head: true }).eq('setlist_id', id);
    const { data: comments } = await sb.from('comments').select('*').eq('setlist_id', id).order('created_at', { ascending: true });
    
    // Spotify/Songkick style detail view
    document.getElementById('page-router').innerHTML = `
        <div id="detail-view" class="animate-fade-in">
            <!-- Social Floating Bar (Mobile) -->
            <div class="lg:hidden fixed bottom-6 left-6 right-6 z-[100] flex gap-3">
                <button onclick="window.handleLike('${data.id}')" class="flex-1 py-5 bg-pink-500 text-white rounded-[2rem] font-black shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                    <i class="fas fa-heart"></i> 관람 완료 <span>${likeCount}</span>
                </button>
                <button onclick="window.shareSetlist('${data.id}', '${data.artist}')" class="w-16 h-16 bg-white dark:bg-gray-800 rounded-full shadow-2xl flex items-center justify-center text-gray-500">
                    <i class="fas fa-share-alt"></i>
                </button>
            </div>
            <div id="detail-full-view"></div>
        </div>`;
    renderDetailView(data, likeCount || 0, comments || [], 'detail-full-view');
}

async function renderDetailView(data, likeCount, comments, targetId) {
    const { data: { session } } = await sb.auth.getSession();
    const container = document.getElementById(targetId);
    
    let sets = []; let currentSetName = 'Main Set'; let currentSongs = [];
    if (data.songs) {
        data.songs.forEach(s => {
            const t = s.trim();
            if (t.startsWith('---')) {
                if (currentSongs.length > 0) sets.push({ name: currentSetName, songs: currentSongs });
                currentSetName = t.replace(/-/g, '').trim(); currentSongs = [];
            } else {
                let title = t; let note = ''; let cover = '';
                const nm = title.match(/\[(.*?)\]/); if (nm) { note = nm[1]; title = title.replace(/\[.*?\]/, '').trim(); }
                const cm = title.match(/\((.*?) cover\)/i); if (cm) { cover = cm[1]; title = title.replace(/\(.*?\)/, '').trim(); }
                currentSongs.push({ title, note, cover });
            }
        });
        if (currentSongs.length > 0) sets.push({ name: currentSetName, songs: currentSongs });
    }

    const setsHtml = sets.map(set => `
        <div class="mb-10">
            <h4 class="text-xs font-black text-indigo-500 uppercase tracking-widest mb-6 border-b dark:border-gray-800 pb-2">${set.name === 'Main Set' ? '메인 세트' : set.name}</h4>
            <div class="space-y-1">
                ${set.songs.map((s, i) => {
                    const query = encodeURIComponent(`${data.artist} ${s.title} Official`);
                    const youtubeLink = `https://www.youtube.com/results?search_query=${query}&sp=EgIQAQ%253D%253D`;
                    return `
                        <div class="flex items-start gap-4 p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800/50 group transition-all">
                            <span class="text-sm font-black text-gray-300 mt-1.5 w-6">${i+1}</span>
                            <div class="flex-1 flex justify-between items-center">
                                <div>
                                    <span class="text-xl font-bold">${s.title}</span>
                                    ${s.cover ? `<span class="text-sm text-gray-400 italic ml-2">(${s.cover} 커버)</span>` : ''}
                                    ${s.note ? `<p class="text-xs text-indigo-400 font-bold mt-1">${s.note}</p>` : ''}
                                </div>
                                <a href="${youtubeLink}" target="_blank" class="text-red-500 opacity-0 group-hover:opacity-100 transition-all text-2xl hover:scale-110"><i class="fab fa-youtube"></i></a>
                            </div>
                        </div>`;
                }).join('')}
            </div>
        </div>`).join('');

    container.innerHTML = `
        <div class="animate-fade-in">
            <div class="flex flex-col md:flex-row justify-between items-start gap-8 mb-12">
                <div>
                    <nav class="text-xs font-black text-gray-400 uppercase tracking-widest mb-2"><span onclick="window.navigateTo('setlists')" class="hover:text-indigo-500 cursor-pointer transition-colors">Setlists</span> / <span class="text-indigo-500">${data.artist}</span></nav>
                    <h2 class="text-6xl font-black tracking-tighter mb-4 leading-none">${data.artist}</h2>
                    <div class="flex gap-4">
                        <span class="px-4 py-1.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-full font-black text-sm">${data.performance_date}</span>
                        <span class="px-4 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-full font-black text-sm">${data.venue}</span>
                    </div>
                </div>
                <div class="flex gap-3">
                    <button onclick="window.handleLike('${data.id}')" class="px-8 py-4 bg-pink-50 dark:bg-pink-950/20 text-pink-500 rounded-2xl font-black shadow-sm active:scale-95 transition-all flex items-center gap-2">
                        <i class="fas fa-heart"></i>
                        <span>나도 이 공연 봤어요!</span>
                        <span class="ml-2 px-3 py-1 bg-white/50 dark:bg-black/20 rounded-full text-xs">${likeCount}</span>
                    </button>
                    ${session && session.user.id === data.user_id ? `<button onclick="window.startEdit('${data.id}')" class="p-4 bg-gray-100 dark:bg-gray-800 rounded-2xl hover:bg-indigo-100 dark:hover:bg-indigo-900 transition-all"><i class="fas fa-edit"></i></button>` : ''}
                </div>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div class="lg:col-span-8 bg-white dark:bg-gray-900 p-10 rounded-[3rem] border dark:border-gray-800 shadow-sm">${setsHtml || '등록된 곡이 없습니다.'}</div>
                <div class="lg:col-span-4 space-y-10">
                    ${data.image_url ? `<div class="bg-white dark:bg-gray-900 p-4 rounded-[3rem] border dark:border-gray-800 shadow-sm overflow-hidden"><img src="${data.image_url}" class="w-full h-auto rounded-[2.5rem] object-cover" alt="공연 포스터"></div>` : ''}
                    <div>
                        <h3 class="text-xl font-black mb-8">팬 후기</h3>
                        <div class="space-y-4 mb-8">${comments.map(c => `<div class="p-6 bg-gray-50 dark:bg-gray-800 rounded-[1.5rem] border dark:border-gray-800"><p class="text-xs font-black text-indigo-500 mb-2">${c.display_name || '익명'}</p><p class="text-sm font-medium leading-relaxed">${c.content}</p></div>`).join('')}</div>
                        ${session ? `<div class="flex flex-col gap-3"><textarea id="comm-input" class="w-full p-5 rounded-[1.5rem] bg-white dark:bg-gray-800 border dark:border-gray-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" rows="3" placeholder="공연의 감동을 나눠보세요..."></textarea><button onclick="window.postComment('${data.id}')" class="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-lg shadow-xl shadow-indigo-500/20 active:scale-95 transition-all">후기 남기기</button></div>` : ''}
                    </div>
                </div>
            </div>
        </div>`;
}

window.shareSetlist = (id, artist) => {
    const url = window.location.href;
    if (navigator.share) {
        navigator.share({ title: `${artist} 공연 선곡표`, text: '선곡표에서 공연 기록을 확인해보세요!', url });
    } else {
        navigator.clipboard.writeText(url).then(() => window.showToast('링크가 복사되었습니다.'));
    }
}

// --- Auth & User Logic ---

async function updateAuthUI() {
    const { data: { session } } = await sb.auth.getSession();
    const container = document.getElementById('auth-buttons');
    const mobileSection = document.getElementById('mobile-auth-section');
    if (!container) return;

    if (session) {
        const name = session.user.user_metadata?.display_name || session.user.email.split('@')[0];
        const avatar = session.user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${name}`;
        
        container.innerHTML = `
            <div class="flex items-center gap-3">
                <button onclick="window.navigateTo('myattended')" class="text-xs font-black text-gray-500 hover:text-indigo-600 hidden sm:block">내 공연</button>
                <div class="flex items-center gap-3 bg-gray-100 dark:bg-gray-800 pl-2 pr-4 py-1.5 rounded-2xl cursor-pointer" onclick="window.navigateTo('profile')">
                    <img src="${avatar}" class="w-8 h-8 rounded-xl shadow-sm">
                    <span class="text-sm font-black hidden lg:inline">${name}</span>
                </div>
                <button onclick="sb.auth.signOut().then(() => location.reload())" class="text-xs font-black text-red-500 hidden sm:block">로그아웃</button>
            </div>`;
            
        if (mobileSection) {
            mobileSection.innerHTML = `
                <button onclick="window.navigateTo('myattended')" class="w-full p-5 rounded-2xl font-black bg-gray-100 dark:bg-gray-800 text-left flex justify-between">내 공연 기록 <i class="fas fa-chevron-right text-gray-300"></i></button>
                <button onclick="window.navigateTo('profile')" class="w-full p-5 rounded-2xl font-black bg-gray-100 dark:bg-gray-800 text-left flex justify-between">개인 정보 수정 <i class="fas fa-chevron-right text-gray-300"></i></button>
                <button onclick="sb.auth.signOut().then(() => location.reload())" class="w-full p-5 rounded-2xl font-black bg-red-50 text-red-500 text-left">로그아웃</button>
            `;
        }
    } else {
        const loginBtn = `<button onclick="window.toggleAuthModal(true)" class="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black shadow-lg">로그인</button>`;
        container.innerHTML = loginBtn;
        if (mobileSection) mobileSection.innerHTML = loginBtn.replace('px-8 py-3 rounded-2xl', 'p-6 rounded-3xl w-full text-xl shadow-xl');
    }
}

window.postComment = async (id) => {
    const input = document.getElementById('comm-input'); 
    const content = input.value.trim(); 
    if (!content) return;
    const { data: { session } } = await sb.auth.getSession(); 
    if (!session) return window.showToast('로그인이 필요한 서비스입니다.', 'error');
    const nickname = session.user.user_metadata?.display_name || session.user.email.split('@')[0];
    
    const { error } = await sb.from('comments').insert({ 
        setlist_id: id, 
        user_id: session.user.id, 
        user_email: session.user.email, 
        content: content, 
        display_name: nickname 
    });
    
    if (error) {
        console.error('Comment error:', error);
        window.showToast('댓글 작성 중 오류가 발생했습니다.', 'error');
    } else {
        window.showToast('댓글이 등록되었습니다.');
        input.value = ''; 
        renderSetlistDetailPage(id);
    }
}

// --- Utils ---

function renderSetlistCards(data, targetId, isUpcoming = false) {
    const list = document.getElementById(targetId); 
    if (!list) return;
    if (!data?.length) { 
        list.innerHTML = `<div class="text-center py-20 bg-white dark:bg-gray-900 rounded-[3rem] border-2 border-dashed dark:border-gray-800 text-gray-400 font-bold text-xl">데이터가 없습니다.</div>`; 
        return; 
    }
    
    list.innerHTML = data.map(item => {
        const categoryColor = item.category === 'Festival' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400';
        const imageHtml = item.image_url 
            ? `<img src="${item.image_url}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500">` 
            : `<div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-3xl"><i class="fas fa-microphone-alt"></i></div>`;

        return `
        <div onclick="window.navigateTo('setlist', '${item.id}')" class="bg-white dark:bg-gray-900 p-6 sm:p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer flex flex-col sm:flex-row justify-between sm:items-center gap-6 group animate-fade-in">
            <div class="flex items-center gap-6 sm:gap-8">
                <div class="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden shadow-inner flex-shrink-0 relative">
                    <div class="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors z-10"></div>
                    ${imageHtml}
                </div>
                <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2 mb-3">
                        <span class="px-3 py-1 ${categoryColor} rounded-full text-[10px] font-black uppercase tracking-widest">${item.category || 'Concert'}</span>
                        <span class="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                            <i class="far fa-calendar-alt"></i> ${item.performance_date}
                        </span>
                    </div>
                    <h3 class="font-black text-3xl sm:text-4xl tracking-tighter dark:text-white group-hover:text-indigo-600 transition-colors leading-none mb-3 truncate">${item.artist}</h3>
                    <p class="text-lg font-bold text-gray-400 dark:text-gray-500 truncate max-w-xs md:max-w-md italic opacity-80">${item.concert}</p>
                </div>
            </div>
            <div class="sm:text-right flex flex-col sm:items-end gap-1">
                <div class="flex items-center gap-2 text-gray-400 dark:text-gray-500 font-bold mb-1">
                    <i class="fas fa-map-marker-alt text-indigo-400/50"></i>
                    <span class="text-lg sm:text-xl font-black dark:text-gray-200">${item.venue || 'TBA'}</span>
                </div>
                <p class="text-xs font-black text-gray-300 dark:text-gray-600 uppercase tracking-[0.2em]">${isUpcoming ? 'Check-in Now' : (item.location || 'Global')}</p>
                <div class="mt-4 sm:mt-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0 hidden sm:block">
                    <span class="bg-indigo-600 text-white px-5 py-2 rounded-full text-xs font-black shadow-lg">상세 보기 <i class="fas fa-arrow-right ml-2"></i></span>
                </div>
            </div>
        </div>`;
    }).join('');
}

async function loadTrendingArtists() {
    const { data } = await sb.from('setlists').select('artist');
    const counts = {}; 
    data?.forEach(d => counts[d.artist] = (counts[d.artist] || 0) + 1);
    const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 5);
    const container = document.getElementById('trending-artists');
    if (container) {
        container.innerHTML = sorted.map(([name, count], i) => `
            <li class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl font-black cursor-pointer hover:bg-indigo-600 hover:text-white transition-all group" onclick="window.navigateTo('setlists', 'artist:${name}')">
                <span class="flex items-center gap-3">
                    <span class="text-indigo-400 opacity-50 group-hover:text-white">0${i+1}</span>
                    ${name}
                </span>
                <span class="px-3 py-1 bg-white dark:bg-gray-700 rounded-full text-[10px] shadow-sm">${count}</span>
            </li>`).join('');
    }
}

// --- Profile & Attendance ---

async function renderProfilePage() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return window.navigateTo('home');
    const nickname = session.user.user_metadata?.display_name || session.user.email.split('@')[0];
    document.getElementById('page-router').innerHTML = `
        <div class="max-w-2xl mx-auto bg-white dark:bg-gray-900 p-12 rounded-[3rem] shadow-2xl border dark:border-gray-800 animate-fade-in">
            <h2 class="text-4xl font-black mb-10 text-center">개인 정보 설정</h2>
            <form id="profile-form" class="space-y-8">
                <div><label class="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">이메일 계정</label><input type="text" value="${session.user.email}" disabled class="w-full px-6 py-5 rounded-2xl bg-gray-50 dark:bg-gray-800 text-gray-400 border-none font-bold"></div>
                <div><label class="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">활동 닉네임</label><input type="text" id="profile-nickname" value="${nickname}" required class="w-full px-6 py-5 rounded-2xl border dark:border-gray-800 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-indigo-600 transition-all font-black text-xl"></div>
                <button type="submit" class="w-full bg-indigo-600 text-white py-6 rounded-2xl font-black text-2xl shadow-xl active:scale-95 transition-all">설정 저장하기</button>
            </form>
        </div>`;
    document.getElementById('profile-form').onsubmit = async (e) => {
        e.preventDefault(); 
        const newName = document.getElementById('profile-nickname').value;
        const { error } = await sb.auth.updateUser({ data: { display_name: newName } });
        if (error) window.showToast('설정 저장 중 오류가 발생했습니다.', 'error');
        else { 
            window.showToast('프로필이 성공적으로 업데이트되었습니다.'); 
            updateAuthUI(); 
            window.navigateTo('home'); 
        }
    };
}

async function renderMyAttendancePage() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return window.navigateTo('home');
    const { data: att } = await sb.from('likes').select('setlist_id').eq('user_id', session.user.id);
    const ids = att?.map(a => a.setlist_id) || [];
    const { data: list } = await sb.from('setlists').select('*').in('id', ids).order('performance_date', { ascending: false });
    document.getElementById('page-router').innerHTML = `
        <div class="animate-fade-in">
            <h2 class="text-4xl font-black mb-12">내가 다녀온 공연</h2>
            <div class="space-y-6" id="my-list"></div>
        </div>`;
    renderSetlistCards(list || [], 'my-list');
}

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI(); 
    handleRouting();
    initGlobalSearch();
    document.getElementById('setlist-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const { data: { session } } = await sb.auth.getSession();
        if (!session) return window.showToast('로그인이 필요합니다.', 'error');
        
        const f = new FormData(e.target);
        const imgInput = document.getElementById('image-upload');
        let imageUrl = null;

        if (imgInput?.files?.[0]) {
            const file = imgInput.files[0];
            const fileName = `${Date.now()}_${file.name}`;
            const { error: err } = await sb.storage.from('posters').upload(fileName, file);
            if (!err) {
                imageUrl = sb.storage.from('posters').getPublicUrl(fileName).data.publicUrl;
            } else {
                console.error('Upload error:', err);
                window.showToast('이미지 업로드에 실패했습니다.', 'error');
            }
        }

        const d = { 
            artist: f.get('artist'), 
            performance_date: f.get('performance_date'), 
            concert: f.get('concert'), 
            venue: f.get('venue'), 
            location: f.get('location'), 
            category: f.get('category'),
            songs: f.get('songs_text').split('\n').map(s => s.trim()).filter(s => s), 
            user_id: session.user.id 
        };
        if (imageUrl) d.image_url = imageUrl;
        
        let result;
        if (editingId) {
            result = await sb.from('setlists').update(d).eq('id', editingId).select();
        } else {
            result = await sb.from('setlists').insert([d]).select();
        }

        const { data: resData, error: resErr } = result;
        if (resErr) {
            console.error('Submit error:', resErr);
            window.showToast('저장 중 오류가 발생했습니다.', 'error');
        } else {
            window.showToast(editingId ? '선곡표가 수정되었습니다.' : '새 선곡표가 등록되었습니다.');
            window.toggleModal(false); 
            if (resData?.[0]) window.navigateTo('setlist', resData[0].id);
            else if (editingId) renderSetlistDetailPage(editingId);
        }
    });
});
