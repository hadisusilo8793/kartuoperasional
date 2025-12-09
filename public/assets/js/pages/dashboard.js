document.addEventListener('DOMContentLoaded', async () => {
    // This is a placeholder as full API is not ready
    // In a real scenario, this would fetch from /api/dashboard
    const mockData = {
        stats: {
            kartuAktif: 2,
            driverAktif: 2,
            armadaAktif: 2,
            transaksiHariIni: 1
        },
        chartData: {
            tol: 150000,
            parkir: 25000
        },
        logs: [
            { level: 'INFO', pesan: 'User Hadi Susilo logged in.', waktu: new Date().toISOString() },
            { level: 'INFO', pesan: 'Kartu 003 dipinjam oleh Budi Santoso.', waktu: new Date().toISOString() },
            { level: 'WARNING', pesan: 'Saldo kartu 002 rendah.', waktu: new Date().toISOString() },
        ],
        lowBalance: [
            { nomor: '002', saldo: 25000 }
        ]
    };
    function renderStats(stats) {
        const container = document.getElementById('stats-container');
        container.innerHTML = `
            <div class="card-ui">
                <h3 class="text-sm font-medium text-slate-500">Kartu Aktif</h3>
                <p class="text-3xl font-bold">${stats.kartuAktif}</p>
            </div>
            <div class="card-ui">
                <h3 class="text-sm font-medium text-slate-500">Driver Aktif</h3>
                <p class="text-3xl font-bold">${stats.driverAktif}</p>
            </div>
            <div class="card-ui">
                <h3 class="text-sm font-medium text-slate-500">Armada Aktif</h3>
                <p class="text-3xl font-bold">${stats.armadaAktif}</p>
            </div>
            <div class="card-ui">
                <h3 class="text-sm font-medium text-slate-500">Transaksi Hari Ini</h3>
                <p class="text-3xl font-bold">${stats.transaksiHariIni}</p>
            </div>
        `;
    }
    function renderLogs(logs) {
        const container = document.getElementById('logs-container');
        container.innerHTML = logs.slice(0, 5).map(log => `
            <div class="text-sm">
                <p class="font-medium truncate">${log.pesan}</p>
                <p class="text-xs text-slate-400">${new Date(log.waktu).toLocaleString()}</p>
            </div>
        `).join('');
    }
    function renderLowBalance(cards) {
        const container = document.getElementById('low-balance-container');
        if(cards.length > 0) {
            container.innerHTML = cards.map(card => `
                <div class="flex justify-between items-center p-2 rounded-lg hover:bg-amber-50">
                    <span>Kartu <strong>${card.nomor}</strong></span>
                    <span class="font-semibold text-amber-700">Rp ${card.saldo.toLocaleString('id-ID')}</span>
                </div>
            `).join('');
        } else {
            container.innerHTML = `<p class="text-slate-500">Tidak ada kartu dengan saldo rendah.</p>`;
        }
    }
    function renderChart(chartData) {
        const ctx = document.getElementById('usageChart').getContext('2d');
        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Tol', 'Parkir'],
                datasets: [{
                    data: [chartData.tol, chartData.parkir],
                    backgroundColor: ['#0B2340', '#06B6D4'],
                    borderColor: '#ffffff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                    }
                }
            }
        });
    }
    // Simulate API call
    setTimeout(() => {
        renderStats(mockData.stats);
        renderLogs(mockData.logs);
        renderLowBalance(mockData.lowBalance);
        renderChart(mockData.chartData);
    }, 1000);
});