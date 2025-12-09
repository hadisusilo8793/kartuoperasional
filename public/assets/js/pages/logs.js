document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('logs-table-body');
    const copyBtn = document.getElementById('copy-logs-btn');
    let allLogs = [];
    const fetchLogs = async () => {
        tableBody.innerHTML = `<tr><td colspan="3" class="text-center py-4">Memuat log...</td></tr>`;
        try {
            const response = await window.app.api.fetch('/api/logs?limit=100');
            allLogs = response.data;
            renderLogs(allLogs);
        } catch (error) {
            window.app.ui.showToast(error.message, 'error');
            tableBody.innerHTML = `<tr><td colspan="3" class="text-center py-4">Gagal memuat log.</td></tr>`;
        }
    };
    const renderLogs = (logs) => {
        tableBody.innerHTML = '';
        if (logs.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="3" class="text-center py-4">Tidak ada log.</td></tr>`;
            return;
        }
        logs.forEach(log => {
            const row = document.createElement('tr');
            row.className = 'bg-white border-b';
            const levelClass = {
                'INFO': 'text-blue-600 bg-blue-100',
                'WARNING': 'text-amber-600 bg-amber-100',
                'ERROR': 'text-red-600 bg-red-100',
            }[log.level] || 'text-slate-600 bg-slate-100';
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">${new Date(log.waktu).toLocaleString('id-ID')}</td>
                <td class="px-6 py-4"><span class="px-2 py-1 text-xs font-medium rounded-full ${levelClass}">${log.level}</span></td>
                <td class="px-6 py-4">${log.pesan}</td>
            `;
            tableBody.appendChild(row);
        });
    };
    copyBtn.addEventListener('click', () => {
        const logText = allLogs.map(log => `[${new Date(log.waktu).toLocaleString('id-ID')}] [${log.level}] ${log.pesan}`).join('\n');
        navigator.clipboard.writeText(logText)
            .then(() => window.app.ui.showToast('Log disalin ke clipboard.', 'success'))
            .catch(() => window.app.ui.showToast('Gagal menyalin log.', 'error'));
    });
    fetchLogs();
});