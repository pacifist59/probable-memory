// Supabase configuration
const SUPABASE_URL = 'https://yyjghcsnomwvqwpaojug.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5amdoY3Nub213dnF3cGFvanVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NzQzNzAsImV4cCI6MjA5MDI1MDM3MH0.HANV95lxI1XgXTALkqXDbe_-U2-_yB2xJD4Zsb-pqf0';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Function to format date relative to now
function getRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return '방금 전';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}분 전`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}시간 전`;
    return `${Math.floor(diffInSeconds / 86400)}일 전`;
}

// Function to fetch and render setlists from Supabase
async function fetchAndRenderSetlists() {
    const listElement = document.getElementById('recent-list');
    if (!listElement) return;

    // Show loading state
    listElement.innerHTML = `
        <div class="animate-pulse space-y-4">
            <div class="h-24 bg-gray-100 dark:bg-gray-800 rounded-3xl w-full"></div>
            <div class="h-24 bg-gray-100 dark:bg-gray-800 rounded-3xl w-full"></div>
        </div>
    `;

    try {
        const { data, error } = await supabase
            .from('setlists')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            listElement.innerHTML = `
                <div class="text-center py-12 bg-white dark:bg-gray-900 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700">
                    <i class="fas fa-music text-4xl text-gray-300 mb-4"></i>
                    <p class="text-gray-500 dark:text-gray-400 font-bold">아직 등록된 세트리스트가 없습니다.<br>첫 번째 선곡표를 작성해보세요!</p>
                </div>
            `;
            return;
        }

        listElement.innerHTML = data.map(item => `
            <div class="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:-translate-y-1">
                <div class="flex items-center space-x-6">
                    <div class="bg-indigo-50 dark:bg-indigo-900/30 w-16 h-16 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                        <i class="fas fa-microphone-alt text-2xl"></i>
                    </div>
                    <div>
                        <h3 class="font-black text-xl text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">${item.artist}</h3>
                        <p class="text-base text-gray-600 dark:text-gray-400 font-bold mt-1">${item.concert}</p>
                        <div class="flex items-center mt-2 text-sm text-gray-400 dark:text-gray-500 font-medium space-x-3">
                            <span><i class="fas fa-map-marker-alt mr-1.5 text-indigo-500"></i> ${item.venue || '공연장 정보 없음'}, ${item.location || '지역 정보 없음'}</span>
                        </div>
                    </div>
                </div>
                <div class="flex flex-row md:flex-col items-center md:items-end justify-between border-t border-gray-100 dark:border-gray-800 md:border-t-0 pt-4 md:pt-0 mt-2 md:mt-0">
                    <span class="text-lg font-black text-gray-700 dark:text-gray-300">${item.performance_date}</span>
                    <span class="text-xs font-bold text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-widest bg-gray-50 dark:bg-gray-800/50 px-2.5 py-1 rounded-md">${getRelativeTime(item.created_at)} 업데이트됨</span>
                </div>
            </div>
        `).join('');

    } catch (err) {
        console.error('Error fetching setlists:', err);
        listElement.innerHTML = `<p class="text-red-500 font-bold text-center">데이터를 불러오는 중 오류가 발생했습니다.</p>`;
    }
}

// Modal handling
function toggleModal(show) {
    const modal = document.getElementById('add-modal');
    if (show) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    } else {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
}

// Form Submission
document.getElementById('setlist-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const setlistData = {
        artist: formData.get('artist'),
        performance_date: formData.get('performance_date'),
        concert: formData.get('concert'),
        venue: formData.get('venue'),
        location: formData.get('location'),
        songs: [] // Initially empty
    };

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerText = '등록 중...';

    try {
        const { error } = await supabase
            .from('setlists')
            .insert([setlistData]);

        if (error) throw error;

        alert('성공적으로 등록되었습니다!');
        toggleModal(false);
        e.target.reset();
        fetchAndRenderSetlists(); // Refresh list
    } catch (err) {
        console.error('Error inserting setlist:', err);
        alert('등록 실패: ' + err.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = '등록하기';
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchAndRenderSetlists();
});