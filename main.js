// Mock data for initial prototype
const recentSetlists = [
    {
        artist: "데이식스 (DAY6)",
        concert: "3RD WORLD TOUR [FOREVER YOUNG] in SEOUL",
        venue: "인스파이어 아레나",
        location: "인천, 대한민국",
        date: "2024.09.22",
        updated: "2시간 전"
    },
    {
        artist: "아이유 (IU)",
        concert: "2024 IU HEREH WORLD TOUR CONCERT ENCORE",
        venue: "서울 월드컵 경기장",
        location: "서울, 대한민국",
        date: "2024.09.21",
        updated: "5시간 전"
    },
    {
        artist: "Coldplay",
        concert: "Music of the Spheres World Tour",
        venue: "Rajamangala Stadium",
        location: "Bangkok, Thailand",
        date: "2024.02.04",
        updated: "어제"
    },
    {
        artist: "NewJeans",
        concert: "Bunnies Camp 2024 Tokyo Dome",
        venue: "Tokyo Dome",
        location: "Tokyo, Japan",
        date: "2024.06.27",
        updated: "3일 전"
    }
];

// Function to render setlist items
function renderRecentSetlists() {
    const listElement = document.getElementById('recent-list');
    if (!listElement) return;

    listElement.innerHTML = recentSetlists.map(item => `
        <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group">
            <div class="flex items-center space-x-4">
                <div class="bg-indigo-50 w-12 h-12 rounded-xl flex items-center justify-center text-indigo-600 flex-shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <i class="fas fa-microphone-alt text-xl"></i>
                </div>
                <div>
                    <h3 class="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">${item.artist}</h3>
                    <p class="text-sm text-gray-600 font-medium">${item.concert}</p>
                    <div class="flex items-center mt-1 text-xs text-gray-400 space-x-2">
                        <span><i class="fas fa-map-marker-alt mr-1"></i> ${item.venue}, ${item.location}</span>
                    </div>
                </div>
            </div>
            <div class="flex flex-row md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-3 md:pt-0 mt-3 md:mt-0">
                <span class="text-sm font-bold text-gray-500">${item.date}</span>
                <span class="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">${item.updated} 업데이트됨</span>
            </div>
        </div>
    `).join('');
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Artificial delay to show loading state
    setTimeout(renderRecentSetlists, 300);
});
