// Supabase configuration
const SUPABASE_URL = 'https://yyjghcsnomwvqwpaojug.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5amdoY3Nub213dnF3cGFvanVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NzQzNzAsImV4cCI6MjA5MDI1MDM3MH0.HANV95lxI1XgXTALkqXDbe_-U2-_yB2xJD4Zsb-pqf0';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let allSetlists = []; 
let currentSetlistId = null;

// Modal handling
window.toggleModal = (s) => { document.getElementById('add-modal')?.classList.toggle('hidden', !s); document.body.style.overflow = s ? 'hidden' : 'auto'; }
window.toggleAuthModal = (s) => { document.getElementById('auth-modal')?.classList.toggle('hidden', !s); document.body.style.overflow = s ? 'hidden' : 'auto'; }
window.toggleDetailModal = (s) => { document.getElementById('detail-modal')?.classList.toggle('hidden', !s); document.body.style.overflow = s ? 'hidden' : 'auto'; }

// Auth UI
async function updateAuthUI() {
    const { data: { session } } = await sb.auth.getSession();
    const container = document.getElementById('auth-buttons');
    if (!container) return;
    if (session) {
        const name = session.user.user_metadata?.full_name || session.user.email.split('@')[0];
        container.innerHTML = `<div class="flex items-center gap-4"><div class="flex items-center gap-3 bg-gray-100 dark:bg-gray-800 pl-2 pr-4 py-1.5 rounded-2xl border border-gray-200 dark:border-gray-700"><img src="${session.user.user_metadata?.avatar_url || 'https://ui-avatars.com/api/?name='+name}" class="w-8 h-8 rounded-xl shadow-sm"><span class="text-sm font-black text-gray-700 dark:text-gray-200 hidden lg:inline">${name}</span></div><button id="logout-btn" class="text-xs font-black text-gray-500 hover:text-red-500 transition-colors">로그아웃</button></div>`;
        document.getElementById('logout-btn')?.addEventListener('click', async () => { await sb.auth.signOut(); updateAuthUI(); fetchAndRenderSetlists(); });
    } else {
        container.innerHTML = `<button onclick="toggleAuthModal(true)" class="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg active:scale-95">로그인</button>`;
    }
}

window.handleSocialLogin = async (p) => { try { await sb.auth.signInWithOAuth({ provider: p, options: { redirectTo: window.location.origin } }); } catch (e) { alert('설정이 필요합니다.'); } }
window.handleCheckAuthBeforeAdd = async () => { const { data: { session } } = await sb.auth.getSession(); if (!session) { alert('로그인이 필요합니다.'); toggleAuthModal(true); } else toggleModal(true); }

// Search
window.handleSearch = (q) => { renderSetlistCards(allSetlists.filter(i => (i.artist||'').toLowerCase().includes(q.toLowerCase()) || (i.concert||'').toLowerCase().includes(q.toLowerCase()))); }

// Stats
window.showStats = () => {
    const list = document.getElementById('recent-list');
    const artistCounts = {};
    allSetlists.forEach(s => artistCounts[s.artist] = (artistCounts[s.artist] || 0) + 1);
    const sorted = Object.entries(artistCounts).sort((a,b) => b[1] - a[1]);
    
    list.innerHTML = `<div class="bg-white dark:bg-gray-900 p-10 rounded-[3rem] shadow-xl border border-gray-100 dark:border-gray-800 animate-fadeIn">
        <h3 class="text-3xl font-black mb-8 dark:text-white flex items-center gap-3"><i class="fas fa-crown text-yellow-500"></i> 아티스트 랭킹</h3>
        <div class="space-y-6">${sorted.map(([name, count], i) => `
            <div class="flex items-center justify-between p-6 bg-gray-50 dark:bg-gray-800 rounded-[2rem] group hover:bg-indigo-600 transition-all">
                <div class="flex items-center gap-6">
                    <span class="text-3xl font-black ${i<3 ? 'text-indigo-500 group-hover:text-white' : 'text-gray-300'}">${i+1}</span>
                    <span class="text-xl font-bold dark:text-white group-hover:text-white">${name}</span>
                </div>
                <span class="px-6 py-2 bg-white dark:bg-gray-700 rounded-full text-indigo-600 dark:text-indigo-400 font-black group-hover:text-indigo-600 shadow-sm">${count} 선곡표</span>
            </div>
        `).join('')}</div>
    </div>`;
}

// Render Core
async function fetchAndRenderSetlists() {
    const list = document.getElementById('recent-list');
    if (!list) return;
    list.innerHTML = `<div class="animate-pulse space-y-6"><div class="h-32 bg-gray-100 dark:bg-gray-800 rounded-[2rem] w-full"></div></div>`;
    const { data } = await sb.from('setlists').select('*').order('created_at', { ascending: false });
    allSetlists = data || [];
    renderSetlistCards(allSetlists);
}

function renderSetlistCards(data) {
    const list = document.getElementById('recent-list');
    if (!data?.length) { list.innerHTML = `<div class="text-center py-20 bg-white dark:bg-gray-900 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-gray-800 text-gray-400 font-bold">내용이 없습니다.</div>`; return; }
    list.innerHTML = data.map(item => `
        <div onclick="openDetail('${item.id}')" class="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-2xl transition-all duration-500 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-8 group hover:-translate-y-2 relative overflow-hidden">
            <div class="flex items-center space-x-8">
                <div class="bg-indigo-50 dark:bg-indigo-900/20 w-20 h-20 rounded-[1.5rem] flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                    ${item.image_url ? `<img src="${item.image_url}" class="w-full h-full object-cover rounded-[1.5rem]">` : `<i class="fas fa-microphone-alt text-3xl"></i>`}
                </div>
                <div>
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-md">${item.category || 'Concert'}</span>
                    </div>
                    <h3 class="font-black text-2xl dark:text-white group-hover:text-indigo-600 transition-colors tracking-tight">${item.artist}</h3>
                    <p class="text-lg text-gray-500 dark:text-gray-400 font-bold">${item.concert}</p>
                </div>
            </div>
            <div class="flex flex-row md:flex-col items-center md:items-end justify-between">
                <span class="text-xl font-black dark:text-gray-200">${item.performance_date}</span>
                <span class="text-xs font-black text-gray-400 mt-2 tracking-widest bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-full">${item.venue || ''}</span>
            </div>
        </div>
    `).join('');
}

window.openDetail = async (id) => {
    currentSetlistId = id;
    toggleDetailModal(true);
    const { data } = await sb.from('setlists').select('*').eq('id', id).single();
    const { count: likeCount } = await sb.from('likes').select('*', { count: 'exact', head: true }).eq('setlist_id', id);
    const { data: comments } = await sb.from('comments').select('*').eq('setlist_id', id).order('created_at', { ascending: true });
    
    renderDetailView(data, likeCount || 0, comments || []);
}

async function renderDetailView(data, likeCount, comments) {
    const { data: { session } } = await sb.auth.getSession();
    const content = document.getElementById('detail-content');
    
    content.innerHTML = `
        <div class="flex justify-between items-start mb-10">
            <button onclick="toggleDetailModal(false)" class="text-gray-400 hover:text-white transition-colors text-2xl"><i class="fas fa-arrow-left"></i></button>
            <div class="flex gap-3">
                <button onclick="handleLike('${data.id}')" class="flex items-center gap-2 px-6 py-2 bg-pink-50 dark:bg-pink-900/20 text-pink-500 rounded-xl font-black text-sm hover:bg-pink-500 hover:text-white transition-all"><i class="fas fa-heart"></i> ${likeCount}</button>
                ${session ? `<button onclick="startEdit()" class="px-6 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl font-black text-sm hover:bg-indigo-600 hover:text-white transition-all">수정</button>
                <button onclick="handleDelete('${data.id}')" class="w-10 h-10 bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-600 hover:text-white rounded-xl flex items-center justify-center transition-all"><i class="fas fa-trash-alt"></i></button>` : ''}
            </div>
        </div>
        ${data.image_url ? `<img src="${data.image_url}" class="w-full h-64 object-cover rounded-[2rem] mb-10 shadow-2xl">` : ''}
        <div class="mb-12">
            <h2 class="text-5xl font-black dark:text-white tracking-tighter mb-4">${data.artist}</h2>
            <p class="text-2xl font-bold text-gray-500 dark:text-gray-400 mb-6">${data.concert}</p>
            <div class="flex flex-wrap gap-4">
                <span class="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-5 py-2 rounded-full font-black text-sm"><i class="fas fa-calendar mr-2"></i> ${data.performance_date}</span>
                <span class="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-5 py-2 rounded-full font-black text-sm"><i class="fas fa-map-marker-alt mr-2 text-indigo-500"></i> ${data.venue}</span>
            </div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
                <h3 class="text-xl font-black dark:text-white uppercase tracking-widest text-indigo-500 mb-6">SETLIST</h3>
                <div class="space-y-1">${data.songs?.map((s, i) => `<div class="flex items-center gap-6 p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group"><span class="text-2xl font-black text-indigo-200 dark:text-gray-700 group-hover:text-indigo-500">${String(i + 1).padStart(2, '0')}</span><span class="text-lg font-bold dark:text-gray-200">${s}</span></div>`).join('')}</div>
            </div>
            <div>
                <h3 class="text-xl font-black dark:text-white uppercase tracking-widest text-purple-500 mb-6">COMMENTS</h3>
                <div class="space-y-4 mb-8">${comments.map(c => `<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl"><div class="flex justify-between mb-1"><span class="text-xs font-black text-indigo-500">${c.user_email}</span><span class="text-[10px] text-gray-400">${new Date(c.created_at).toLocaleDateString()}</span></div><p class="text-sm dark:text-gray-200">${c.content}</p></div>`).join('')}</div>
                ${session ? `<div class="flex gap-2"><input id="comm-input" type="text" placeholder="후기를 남겨보세요..." class="flex-1 px-5 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 dark:text-white outline-none"><button onclick="postComment('${data.id}')" class="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black shadow-lg">전송</button></div>` : ''}
            </div>
        </div>
    `;
}

window.handleLike = async (id) => {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return alert('로그인이 필요합니다.');
    const { error } = await sb.from('likes').insert({ setlist_id: id, user_id: session.user.id });
    if (error) await sb.from('likes').delete().match({ setlist_id: id, user_id: session.user.id });
    openDetail(id);
}

window.postComment = async (id) => {
    const input = document.getElementById('comm-input');
    const content = input.value.trim();
    if (!content) return;
    const { data: { session } } = await sb.auth.getSession();
    await sb.from('comments').insert({ setlist_id: id, user_id: session.user.id, user_email: session.user.email, content: content });
    input.value = ''; openDetail(id);
}

// Registration with Image
document.addEventListener('DOMContentLoaded', () => {
    fetchAndRenderSetlists(); updateAuthUI();
    document.getElementById('setlist-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const { data: { session } } = await sb.auth.getSession();
        const f = new FormData(e.target);
        const imgFile = document.getElementById('image-upload').files[0];
        let imageUrl = null;

        if (imgFile) {
            const fileName = `${Date.now()}_${imgFile.name}`;
            const { data: imgData } = await sb.storage.from('posters').upload(fileName, imgFile);
            if (imgData) imageUrl = sb.storage.from('posters').getPublicUrl(fileName).data.publicUrl;
        }

        const d = {
            artist: f.get('artist'), performance_date: f.get('performance_date'), concert: f.get('concert'),
            venue: f.get('venue'), location: f.get('location'), category: f.get('category'), image_url: imageUrl,
            songs: f.get('songs_text').split('\n').map(s => s.trim().replace(/^\d+\.\s*/, '')).filter(s => s),
            user_id: session.user.id
        };
        await sb.from('setlists').insert([d]);
        toggleModal(false); fetchAndRenderSetlists();
    });
});