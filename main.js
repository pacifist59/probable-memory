// Supabase configuration
const SUPABASE_URL = 'https://yyjghcsnomwvqwpaojug.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5amdoY3Nub213dnF3cGFvanVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NzQzNzAsImV4cCI6MjA5MDI1MDM3MH0.HANV95lxI1XgXTALkqXDbe_-U2-_yB2xJD4Zsb-pqf0';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let allSetlists = []; 
let currentSetlistId = null;

// Modal handling
window.toggleModal = (s) => { 
    const m = document.getElementById('add-modal');
    if (m) m.classList.toggle('hidden', !s); 
    document.body.style.overflow = s ? 'hidden' : 'auto'; 
}
window.toggleAuthModal = (s) => { 
    const m = document.getElementById('auth-modal');
    if (m) m.classList.toggle('hidden', !s); 
    document.body.style.overflow = s ? 'hidden' : 'auto'; 
}
window.toggleDetailModal = (s) => { 
    const m = document.getElementById('detail-modal');
    if (m) m.classList.toggle('hidden', !s); 
    document.body.style.overflow = s ? 'hidden' : 'auto'; 
}

// Auth UI
async function updateAuthUI() {
    const { data: { session } } = await sb.auth.getSession();
    const container = document.getElementById('auth-buttons');
    if (!container) return;
    if (session) {
        const name = session.user.user_metadata?.full_name || session.user.email.split('@')[0];
        container.innerHTML = `
            <div class="flex items-center gap-4">
                <div class="flex items-center gap-3 bg-gray-100 dark:bg-gray-800 pl-2 pr-4 py-1.5 rounded-2xl border border-gray-200 dark:border-gray-700">
                    <img src="${session.user.user_metadata?.avatar_url || 'https://ui-avatars.com/api/?name='+name}" class="w-8 h-8 rounded-xl shadow-sm">
                    <span class="text-sm font-black text-gray-700 dark:text-gray-200 hidden lg:inline">${name}</span>
                </div>
                <button id="logout-btn" class="text-xs font-black text-gray-500 hover:text-red-500 transition-colors">로그아웃</button>
            </div>
        `;
        document.getElementById('logout-btn')?.addEventListener('click', async () => { 
            await sb.auth.signOut(); 
            updateAuthUI(); 
            fetchAndRenderSetlists(); 
        });
    } else {
        container.innerHTML = `<button onclick="toggleAuthModal(true)" class="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg active:scale-95">로그인</button>`;
    }
}

window.handleSocialLogin = async (p) => { 
    try { 
        await sb.auth.signInWithOAuth({ provider: p, options: { redirectTo: window.location.origin } }); 
    } catch (e) { alert('설정이 필요합니다.'); } 
}

window.handleCheckAuthBeforeAdd = async () => { 
    const { data: { session } } = await sb.auth.getSession(); 
    if (!session) { alert('로그인이 필요합니다.'); toggleAuthModal(true); } 
    else toggleModal(true); 
}

// Search
window.handleSearch = (q) => { 
    const filtered = allSetlists.filter(i => 
        (i.artist||'').toLowerCase().includes(q.toLowerCase()) || 
        (i.concert||'').toLowerCase().includes(q.toLowerCase())
    );
    renderSetlistCards(filtered); 
}

// Stats
window.showStats = () => {
    const list = document.getElementById('recent-list');
    const artistCounts = {};
    allSetlists.forEach(s => artistCounts[s.artist] = (artistCounts[s.artist] || 0) + 1);
    const sorted = Object.entries(artistCounts).sort((a,b) => b[1] - a[1]);
    
    list.innerHTML = `
        <div class="bg-white dark:bg-gray-900 p-10 rounded-[3rem] shadow-xl border border-gray-100 dark:border-gray-800">
            <h3 class="text-3xl font-black mb-8 dark:text-white flex items-center gap-3"><i class="fas fa-crown text-yellow-500"></i> 아티스트 랭킹</h3>
            <div class="space-y-6">
                ${sorted.map(([name, count], i) => `
                    <div class="flex items-center justify-between p-6 bg-gray-50 dark:bg-gray-800 rounded-[2rem] group hover:bg-indigo-600 transition-all">
                        <div class="flex items-center gap-6">
                            <span class="text-3xl font-black ${i<3 ? 'text-indigo-500 group-hover:text-white' : 'text-gray-300'}">${i+1}</span>
                            <span class="text-xl font-bold dark:text-white group-hover:text-white">${name}</span>
                        </div>
                        <span class="px-6 py-2 bg-white dark:bg-gray-700 rounded-full text-indigo-600 dark:text-indigo-400 font-black shadow-sm">${count} 선곡표</span>
                    </div>
                `).join('')}
            </div>
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
    const content = document.getElementById('detail-content');
    content.innerHTML = `<div class="animate-pulse space-y-6"><div class="h-8 bg-gray-100 dark:bg-gray-800 rounded-xl w-1/3"></div><div class="h-40 bg-gray-100 dark:bg-gray-800 rounded-3xl w-full"></div></div>`;
    
    const { data } = await sb.from('setlists').select('*').eq('id', id).single();
    const { count: likeCount } = await sb.from('likes').select('*', { count: 'exact', head: true }).eq('setlist_id', id);
    const { data: comments } = await sb.from('comments').select('*').eq('setlist_id', id).order('created_at', { ascending: true });
    
    renderDetailView(data, likeCount || 0, comments || []);
}

async function renderDetailView(data, likeCount, comments) {
    const { data: { session } } = await sb.auth.getSession();
    const content = document.getElementById('detail-content');
    
    // Parse songs for setlist.fm features
    let currentSetHtml = '';
    let sets = [];
    let currentSetName = 'Main Set';
    let currentSongs = [];

    if (data.songs && data.songs.length > 0) {
        data.songs.forEach(songText => {
            const trimmed = songText.trim();
            if (trimmed.startsWith('---') && trimmed.endsWith('---')) {
                if (currentSongs.length > 0) sets.push({ name: currentSetName, songs: currentSongs });
                currentSetName = trimmed.replace(/-/g, '').trim();
                currentSongs = [];
            } else {
                // Parse "Song Title (Artist cover) [Note]"
                let title = trimmed;
                let note = '';
                let cover = '';

                const noteMatch = title.match(/\[(.*?)\]/);
                if (noteMatch) {
                    note = noteMatch[1];
                    title = title.replace(/\[.*?\]/, '').trim();
                }

                const coverMatch = title.match(/\((.*?) cover\)/i);
                if (coverMatch) {
                    cover = coverMatch[1];
                    title = title.replace(/\(.*?\)/, '').trim();
                }

                currentSongs.push({ title, note, cover });
            }
        });
        if (currentSongs.length > 0) sets.push({ name: currentSetName, songs: currentSongs });
    }

    const setsHtml = sets.map(set => `
        <div class="mb-8">
            <h4 class="text-xs font-black text-indigo-500 uppercase tracking-[0.2em] mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">${set.name === 'Main Set' ? '메인 세트' : set.name}</h4>
            <div class="space-y-1">
                ${set.songs.map((s, i) => `
                    <div class="flex items-start gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                        <span class="text-sm font-black text-gray-300 dark:text-gray-700 mt-1">${i + 1}</span>
                        <div class="flex-1">
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="text-lg font-bold dark:text-gray-200">${s.title}</span>
                                ${s.cover ? `<span class="text-sm text-gray-400 italic font-medium">(${s.cover} 커버)</span>` : ''}
                            </div>
                            ${s.note ? `<p class="text-xs text-indigo-400 font-bold mt-1"><i class="fas fa-info-circle mr-1"></i>${s.note}</p>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');

    content.innerHTML = `
        <div class="flex flex-col sm:flex-row justify-between items-start gap-6 mb-12">
            <div class="flex items-center gap-4">
                <button onclick="toggleDetailModal(false)" class="w-12 h-12 flex items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-indigo-600 transition-all"><i class="fas fa-arrow-left"></i></button>
                <div>
                    <nav class="flex text-xs font-black text-gray-400 uppercase tracking-widest mb-1">
                        <span class="hover:text-indigo-500 cursor-pointer">세트리스트</span>
                        <span class="mx-2">/</span>
                        <span class="text-indigo-500">${data.artist}</span>
                    </nav>
                    <h2 class="text-4xl font-black dark:text-white tracking-tighter">${data.artist} <span class="text-indigo-500 font-light ml-2">세트리스트</span></h2>
                </div>
            </div>
            <div class="flex flex-wrap gap-2 w-full sm:w-auto">
                <button onclick="handleLike('${data.id}')" class="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-pink-50 dark:bg-pink-900/20 text-pink-500 rounded-2xl font-black text-sm hover:bg-pink-500 hover:text-white transition-all shadow-sm"><i class="fas fa-heart"></i> ${likeCount}</button>
                <button class="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"><i class="fas fa-check-circle"></i> 공연 관람 완료</button>
                ${session ? `
                    <button onclick="startEdit()" class="p-3 bg-gray-100 dark:bg-gray-800 rounded-2xl text-gray-500 hover:text-indigo-600 transition-all"><i class="fas fa-edit"></i></button>
                    <button onclick="handleDelete('${data.id}')" class="p-3 bg-red-50 dark:bg-red-900/20 text-red-400 hover:bg-red-500 hover:text-white rounded-2xl transition-all"><i class="fas fa-trash-alt"></i></button>
                ` : ''}
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div class="lg:col-span-8">
                <div class="bg-gray-50/50 dark:bg-gray-800/30 rounded-[2.5rem] p-8 sm:p-10 border border-gray-100 dark:border-gray-800">
                    <div class="flex flex-col md:flex-row gap-8 mb-12">
                        ${data.image_url ? `<div class="w-full md:w-48 h-64 rounded-3xl overflow-hidden shadow-xl flex-shrink-0"><img src="${data.image_url}" class="w-full h-full object-cover"></div>` : ''}
                        <div class="flex-1">
                            <div class="space-y-4">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-xl bg-white dark:bg-gray-900 flex items-center justify-center text-indigo-500 shadow-sm border border-gray-100 dark:border-gray-800"><i class="fas fa-calendar"></i></div>
                                    <div>
                                        <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest">공연 날짜</p>
                                        <p class="font-bold dark:text-white">${new Date(data.performance_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                    </div>
                                </div>
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-xl bg-white dark:bg-gray-900 flex items-center justify-center text-purple-500 shadow-sm border border-gray-100 dark:border-gray-800"><i class="fas fa-map-marker-alt"></i></div>
                                    <div>
                                        <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest">공연장 및 위치</p>
                                        <p class="font-bold dark:text-white">${data.venue}, ${data.location || '정보 없음'}</p>
                                    </div>
                                </div>
                                ${data.concert ? `
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-xl bg-white dark:bg-gray-900 flex items-center justify-center text-orange-500 shadow-sm border border-gray-100 dark:border-gray-800"><i class="fas fa-ticket-alt"></i></div>
                                    <div>
                                        <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest">투어</p>
                                        <p class="font-bold dark:text-white">${data.concert}</p>
                                    </div>
                                </div>` : ''}
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-gray-800">
                        ${setsHtml || `<p class="text-center py-10 text-gray-400 font-medium">등록된 곡이 없습니다.</p>`}
                    </div>
                </div>
            </div>

            <div class="lg:col-span-4 space-y-8">
                <div>
                    <h3 class="text-lg font-black dark:text-white mb-6 flex items-center gap-2"><i class="fas fa-comments text-indigo-500"></i> 팬 후기</h3>
                    <div class="space-y-4 mb-6">
                        ${comments.length > 0 ? comments.map(c => `
                            <div class="p-5 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                                <div class="flex justify-between items-center mb-2">
                                    <span class="text-xs font-black text-indigo-500">${c.user_email.split('@')[0]}</span>
                                    <span class="text-[10px] text-gray-400">${new Date(c.created_at).toLocaleDateString()}</span>
                                </div>
                                <p class="text-sm dark:text-gray-300 leading-relaxed">${c.content}</p>
                            </div>
                        `).join('') : '<p class="text-center py-6 text-gray-400 text-sm font-medium">첫 후기를 남겨보세요!</p>'}
                    </div>
                    ${session ? `
                        <div class="flex flex-col gap-2">
                            <textarea id="comm-input" placeholder="공연의 감동을 공유해보세요..." class="w-full px-5 py-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none text-sm" rows="3"></textarea>
                            <button onclick="postComment('${data.id}')" class="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 active:scale-[0.98] transition-all">후기 등록</button>
                        </div>
                    ` : ''}
                </div>
                
                <div class="p-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2.5rem] text-white shadow-xl">
                    <h4 class="font-black text-xl mb-3 leading-tight">정보가 잘못되었나요?</h4>
                    <p class="text-indigo-100 text-sm mb-6 leading-relaxed">누락된 곡을 추가하거나 잘못된 정보를 수정하여 다른 팬들을 도와주세요.</p>
                    <button onclick="startEdit()" class="w-full py-3 bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-xl font-bold hover:bg-white/30 transition-all">정보 수정하기</button>
                </div>
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

window.handleDelete = async (id) => {
    if (!confirm('정말로 삭제하시겠습니까?')) return;
    await sb.from('setlists').delete().match({ id });
    toggleDetailModal(false); fetchAndRenderSetlists();
}

window.startEdit = async () => {
    const { data } = await sb.from('setlists').select('*').eq('id', currentSetlistId).single();
    const content = document.getElementById('detail-content');
    content.innerHTML = `
        <h3 class="text-3xl font-black mb-8 dark:text-white">선곡표 수정</h3>
        <form id="edit-form" class="space-y-6">
            <input type="text" name="artist" value="${data.artist}" required class="w-full px-5 py-4 rounded-2xl border dark:border-gray-800 dark:bg-gray-800 dark:text-white">
            <input type="date" name="performance_date" value="${data.performance_date}" required class="w-full px-5 py-4 rounded-2xl border dark:border-gray-800 dark:bg-gray-800 dark:text-white">
            <input type="text" name="concert" value="${data.concert}" required class="w-full px-5 py-4 rounded-2xl border dark:border-gray-800 dark:bg-gray-800 dark:text-white">
            <textarea name="songs_text" rows="10" class="w-full px-5 py-4 rounded-2xl border dark:border-gray-800 dark:bg-gray-800 dark:text-white resize-none font-medium">${data.songs?.join('\n') || ''}</textarea>
            <div class="flex gap-4">
                <button type="submit" class="flex-1 bg-indigo-600 text-white py-5 rounded-2xl font-black">수정 완료</button>
                <button type="button" onclick="openDetail('${currentSetlistId}')" class="px-8 bg-gray-100 dark:bg-gray-800 dark:text-white py-5 rounded-2xl font-black">취소</button>
            </div>
        </form>
    `;
    document.getElementById('edit-form').onsubmit = async (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        await sb.from('setlists').update({
            artist: f.get('artist'), performance_date: f.get('performance_date'), concert: f.get('concert'),
            songs: f.get('songs_text').split('\n').map(s => s.trim()).filter(s => s)
        }).eq('id', currentSetlistId);
        openDetail(currentSetlistId); fetchAndRenderSetlists();
    };
}

// Registration
document.addEventListener('DOMContentLoaded', () => {
    fetchAndRenderSetlists(); updateAuthUI();
    document.getElementById('setlist-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const { data: { session } } = await sb.auth.getSession();
        if (!session) return alert('로그인이 필요합니다.');
        
        const f = new FormData(e.target);
        const imgInput = document.getElementById('image-upload');
        let imageUrl = null;

        if (imgInput && imgInput.files && imgInput.files[0]) {
            const file = imgInput.files[0];
            const fileName = `${Date.now()}_${file.name}`;
            const { data: uploadData, error: uploadError } = await sb.storage.from('posters').upload(fileName, file);
            if (!uploadError) imageUrl = sb.storage.from('posters').getPublicUrl(fileName).data.publicUrl;
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
