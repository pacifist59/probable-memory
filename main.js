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
        <div class="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:-translate-y-1">
            <div class="flex items-center space-x-6">
                <div class="bg-indigo-50 dark:bg-indigo-900/30 w-16 h-16 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                    <i class="fas fa-microphone-alt text-2xl"></i>
                </div>
                <div>
                    <h3 class="font-black text-xl text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">${item.artist}</h3>
                    <p class="text-base text-gray-600 dark:text-gray-400 font-bold mt-1">${item.concert}</p>
                    <div class="flex items-center mt-2 text-sm text-gray-400 dark:text-gray-500 font-medium space-x-3">
                        <span><i class="fas fa-map-marker-alt mr-1.5 text-indigo-500"></i> ${item.venue}, ${item.location}</span>
                    </div>
                </div>
            </div>
            <div class="flex flex-row md:flex-col items-center md:items-end justify-between border-t border-gray-100 dark:border-gray-800 md:border-t-0 pt-4 md:pt-0 mt-2 md:mt-0">
                <span class="text-lg font-black text-gray-700 dark:text-gray-300">${item.date}</span>
                <span class="text-xs font-bold text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-widest bg-gray-50 dark:bg-gray-800/50 px-2.5 py-1 rounded-md">${item.updated} 업데이트됨</span>
            </div>
        </div>
    `).join('');
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Artificial delay to show loading state
    setTimeout(renderRecentSetlists, 300);
});
