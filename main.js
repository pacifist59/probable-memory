// Supabase configuration
const SUPABASE_URL = 'https://yyjghcsnomwvqwpaojug.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5amdoY3Nub213dnF3cGFvanVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NzQzNzAsImV4cCI6MjA5MDI1MDM3MH0.HANV95lxI1XgXTALkqXDbe_-U2-_yB2xJD4Zsb-pqf0';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let allSetlists = []; 
let currentSetlistId = null;

// Modal handling
window.toggleModal = (show) => {
    const m = document.getElementById('add-modal');
    if (m) { 
        m.classList.toggle('hidden', !show); 
        document.body.style.overflow = show ? 'hidden' : 'auto'; 
    }
}
window.toggleAuthModal = (show) => {
    const m = document.getElementById('auth-modal');
    if (m) { 
        m.classList.toggle('hidden', !show); 
        document.body.style.overflow = show ? 'hidden' : 'auto'; 
    }
}
window.toggleDetailModal = (show) => {
    const m = document.getElementById('detail-modal');
    if (m) { 
        m.classList.toggle('hidden', !show); 
        document.body.style.overflow = show ? 'hidden' : 'auto'; 
    }
}

// Auth UI
async function updateAuthUI() {
    try {
        const { data: { session } } = await sb.auth.getSession();
        const container = document.getElementById('auth-buttons');
        if (!container) return;

        if (session) {
            const name = session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email.split('@')[0];
            container.innerHTML = `
                <div class="flex items-center gap-4">
                    <div class="flex items-center gap-3 bg-gray-100 dark:bg-gray-800 pl-2 pr-4 py-1.5 rounded-2xl border border-gray-200 dark:border-gray-700">
                        <img src="${session.user.user_metadata?.avatar_url || 'https://ui-avatars.com/api/?name='+name}" class="w-8 h-8 rounded-xl shadow-sm" alt="profile">
                        <span class="text-sm font-black text-gray-700 dark:text-gray-200 hidden lg:inline">${name}</span>
                    </div>
                    <button id="logout-btn" class="text-sm font-black text-gray-500 hover:text-red-500 transition-colors">로그아웃</button>
                </div>
            `;
            document.getElementById('logout-btn')?.addEventListener('click', async () => { 
                await sb.auth.signOut(); 
                updateAuthUI(); 
                fetchAndRenderSetlists(); 
            });
        } else {
            container.innerHTML = `<button onclick="toggleAuthModal(true)" class="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 active:scale-95">로그인</button>`;
        }
    } catch (e) { console.error('Auth UI Error:', e); }
}

window.handleSocialLogin = async (provider) => {
    try { 
        const { error } = await sb.auth.signInWithOAuth({ 
            provider, 
            options: { redirectTo: window.location.origin } 
        }); 
        if (error) throw error;
    } catch (err) { alert(`${provider} 로그인 중 오류가 발생했습니다: ${err.message}`); }
}

window.handleCheckAuthBeforeAdd = async () => {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { 
        alert('로그인이 필요합니다.'); 
        toggleAuthModal(true); 
    } else { 
        toggleModal(true); 
    } 
}

// Search Logic
window.handleSearch = (query) => {
    const filtered = allSetlists.filter(item => {
        const artist = item.artist || '';
        const concert = item.concert || '';
        return artist.toLowerCase().includes(query.toLowerCase()) || 
               concert.toLowerCase().includes(query.toLowerCase());
    });
    renderSetlistCards(filtered);
}

// Render Functions
function getRelativeTime(d) {
    try {
        const diff = Math.floor((new Date() - new Date(d)) / 1000);
        if (diff < 60) return '방금 전'; 
        if (diff < 3600) return `${Math.floor(diff/60)}분 전`;
        if (diff < 86400) return `${Math.floor(diff/3600)}시간 전`; 
        return `${Math.floor(diff/86400)}일 전`;
    } catch (e) { return '알 수 없음'; }
}

async function fetchAndRenderSetlists() {
    const list = document.getElementById('recent-list');
    if (!list) return;
    list.innerHTML = `<div class="animate-pulse space-y-6"><div class="h-32 bg-gray-100 dark:bg-gray-800 rounded-[2rem] w-full"></div></div>`;
    try {
        const { data, error } = await sb.from('setlists').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        allSetlists = data || [];
        renderSetlistCards(allSetlists);
    } catch (err) { 
        console.error('Fetch Error:', err); 
        list.innerHTML = `<p class="text-center text-red-500">데이터를 불러오지 못했습니다.</p>`;
    }
}

function renderSetlistCards(data) {
    const list = document.getElementById('recent-list');
    if (!list) return;
    if (!data?.length) { 
        list.innerHTML = `<div class="text-center py-20 bg-white dark:bg-gray-900 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-gray-800"><p class="text-gray-400 font-bold text-xl">선곡표가 없습니다.</p></div>`; 
        return; 
    }
    list.innerHTML = data.map(item => `
        <div onclick="openDetail('${item.id}')" class="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-2xl transition-all duration-500 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-8 group hover:-translate-y-2 relative overflow-hidden">
            <div class="flex items-center space-x-8">
                <div class="bg-indigo-50 dark:bg-indigo-900/20 w-20 h-20 rounded-[1.5rem] flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 shadow-inner">
                    <i class="fas fa-microphone-alt text-3xl"></i>
                </div>
                <div>
                    <h3 class="font-black text-2xl dark:text-white group-hover:text-indigo-600 transition-colors tracking-tight">${item.artist || '알 수 없는 아티스트'}</h3>
                    <p class="text-lg text-gray-500 dark:text-gray-400 font-bold mt-1">${item.concert || '공연 정보 없음'}</p>
                    <div class="flex items-center mt-3 text-sm text-gray-400 font-black space-x-5">
                        <span><i class="fas fa-map-marker-alt mr-2 text-indigo-500"></i> ${item.venue || '정보 없음'}</span>
                        <span><i class="fas fa-list-ul mr-2 text-purple-500"></i> ${item.songs?.length || 0} 곡</span>
                    </div>
                </div>
            </div>
            <div class="flex flex-row md:flex-col items-center md:items-end justify-between border-t md:border-t-0 border-gray-50 dark:border-gray-800 pt-6 md:pt-0">
                <span class="text-xl font-black dark:text-gray-200">${item.performance_date || '-'}</span>
                <span class="text-xs font-black text-gray-400 mt-2 tracking-widest bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-full">${getRelativeTime(item.created_at)}</span>
            </div>
        </div>
    `).join('');
}

window.openDetail = async (id) => {
    currentSetlistId = id;
    toggleDetailModal(true);
    const content = document.getElementById('detail-content');
    if (!content) return;
    content.innerHTML = `<div class="animate-pulse space-y-6"><div class="h-8 bg-gray-100 dark:bg-gray-800 rounded-xl w-1/3"></div><div class="h-40 bg-gray-100 dark:bg-gray-800 rounded-3xl w-full"></div></div>`;
    try {
        const { data, error } = await sb.from('setlists').select('*').eq('id', id).single();
        if (error) throw error;
        renderDetailView(data);
    } catch (err) { alert('데이터를 불러오지 못했습니다.'); }
}

async function renderDetailView(data) {
    const { data: { session } } = await sb.auth.getSession();
    const content = document.getElementById('detail-content');
    if (!content) return;
    const isLoggedIn = session !== null;

    const songsHtml = data.songs?.length 
        ? data.songs.map((s, i) => `
            <div class="flex items-center gap-6 p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                <span class="text-2xl font-black text-indigo-200 dark:text-gray-700 group-hover:text-indigo-500 transition-colors">${String(i + 1).padStart(2, '0')}</span>
                <span class="text-lg font-bold dark:text-gray-200">${s}</span>
            </div>
        `).join('')
        : `<p class="text-gray-400 font-bold py-10 text-center">곡 목록이 없습니다.</p>`;

    content.innerHTML = `
        <div class="flex justify-between items-start mb-10">
            <button onclick="toggleDetailModal(false)" class="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors text-2xl"><i class="fas fa-arrow-left"></i></button>
            <div class="flex gap-3">
                ${isLoggedIn ? `
                    <button onclick="startEdit()" class="px-6 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl font-black text-sm hover:bg-indigo-600 hover:text-white transition-all">수정하기</button>
                    <button id="del-btn" onclick="handleDelete('${data.id}')" class="w-10 h-10 bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-600 hover:text-white rounded-xl flex items-center justify-center transition-all"><i class="fas fa-trash-alt"></i></button>
                ` : ''}
                <button onclick="handleShare()" class="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all"><i class="fas fa-share-alt"></i></button>
            </div>
        </div>
        <div class="mb-12">
            <h2 class="text-5xl font-black dark:text-white tracking-tighter mb-4">${data.artist || '아티스트'}</h2>
            <p class="text-2xl font-bold text-gray-500 dark:text-gray-400 mb-6">${data.concert || '공연명'}</p>
            <div class="flex flex-wrap gap-4">
                <span class="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-5 py-2 rounded-full font-black text-sm"><i class="fas fa-calendar mr-2"></i> ${data.performance_date || '-'}</span>
                <span class="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-5 py-2 rounded-full font-black text-sm"><i class="fas fa-map-marker-alt mr-2 text-indigo-500"></i> ${data.venue || '장소'}</span>
            </div>
        </div>
        <div class="space-y-6">
            <h3 class="text-xl font-black dark:text-white uppercase tracking-widest text-indigo-500">SETLIST</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
                ${songsHtml}
            </div>
        </div>
    `;
}

window.handleDelete = async (id) => {
    if (!confirm('정말로 삭제하시겠습니까?')) return;
    const btn = document.getElementById('del-btn');
    if (btn) btn.disabled = true;

    try {
        const { error } = await sb.from('setlists').delete().eq('id', id);
        if (error) throw error;
        
        alert('성공적으로 삭제되었습니다.');
        toggleDetailModal(false);
        fetchAndRenderSetlists();
    } catch (err) {
        alert('삭제 실패: ' + err.message);
    } finally {
        if (btn) btn.disabled = false;
    }
}

window.handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('사이트 주소가 복사되었습니다!');
}

window.startEdit = async () => {
    try {
        const { data } = await sb.from('setlists').select('*').eq('id', currentSetlistId).single();
        const content = document.getElementById('detail-content');
        if (!content) return;
        content.innerHTML = `
            <div class="flex justify-between items-center mb-8">
                <h3 class="text-3xl font-black dark:text-white">선곡표 수정</h3>
                <button onclick="openDetail('${currentSetlistId}')" class="text-gray-400 hover:text-white text-2xl"><i class="fas fa-times"></i></button>
            </div>
            <form id="edit-form" class="space-y-6">
                <div class="grid grid-cols-2 gap-4">
                    <input type="text" name="artist" value="${data.artist || ''}" required class="w-full px-5 py-4 rounded-2xl border dark:border-gray-800 dark:bg-gray-800 dark:text-white">
                    <input type="date" name="performance_date" value="${data.performance_date || ''}" required class="w-full px-5 py-4 rounded-2xl border dark:border-gray-800 dark:bg-gray-800 dark:text-white">
                </div>
                <input type="text" name="concert" value="${data.concert || ''}" required class="w-full px-5 py-4 rounded-2xl border dark:border-gray-800 dark:bg-gray-800 dark:text-white">
                <textarea name="songs_text" rows="10" class="w-full px-5 py-4 rounded-2xl border dark:border-gray-800 dark:bg-gray-800 dark:text-white resize-none font-medium">${data.songs?.join('\n') || ''}</textarea>
                <div class="flex gap-4">
                    <button type="submit" class="flex-1 bg-indigo-600 text-white py-5 rounded-2xl font-black text-xl">수정 완료</button>
                    <button type="button" onclick="openDetail('${currentSetlistId}')" class="px-8 bg-gray-100 dark:bg-gray-800 py-5 rounded-2xl font-black">취소</button>
                </div>
            </form>
        `;

        document.getElementById('edit-form').onsubmit = async (e) => {
            e.preventDefault();
            const f = new FormData(e.target);
            const updateData = {
                artist: f.get('artist'),
                performance_date: f.get('performance_date'),
                concert: f.get('concert'),
                songs: f.get('songs_text').split('\n').map(s => s.trim().replace(/^\d+\.\s*/, '')).filter(s => s)
            };
            const { error } = await sb.from('setlists').update(updateData).eq('id', currentSetlistId);
            if (error) alert('수정 실패'); 
            else { 
                alert('수정되었습니다!'); 
                openDetail(currentSetlistId); 
                fetchAndRenderSetlists(); 
            } 
        };
    } catch (e) { alert('수정 화면을 불러오지 못했습니다.'); }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    fetchAndRenderSetlists();
    updateAuthUI();
    
    document.getElementById('setlist-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const { data: { session } } = await sb.auth.getSession();
            if (!session) return alert('로그인이 필요합니다.');

            const f = new FormData(e.target);
            const d = {
                artist: f.get('artist'), 
                performance_date: f.get('performance_date'), 
                concert: f.get('concert'),
                venue: f.get('venue'), 
                location: f.get('location'),
                songs: f.get('songs_text').split('\n').map(s => s.trim().replace(/^\d+\.\s*/, '')).filter(s => s),
                user_id: session.user.id
            };

            const btn = e.target.querySelector('button[type="submit"]');
            btn.disabled = true; btn.innerText = '등록 중...';

            const { error } = await sb.from('setlists').insert([d]);
            if (error) throw error;
            
            alert('등록되었습니다!');
            window.toggleModal(false);
            e.target.reset();
            fetchAndRenderSetlists();
        } catch (err) { alert('등록 실패: ' + err.message); } 
        finally { 
            const btn = e.target.querySelector('button[type="submit"]');
            if (btn) { btn.disabled = false; btn.innerText = '등록하기'; }
        }
    });

    if (window.location.hash || window.location.search) {
        sb.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') { 
                updateAuthUI(); 
                fetchAndRenderSetlists(); 
            }
        });
    }
});
