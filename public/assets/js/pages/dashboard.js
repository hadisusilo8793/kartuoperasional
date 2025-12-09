document.addEventListener('DOMContentLoaded', async () => {
    const statsContainer = document.getElementById('stats-container');
    const logsContainer = document.getElementById('logs-container');
    const lowBalanceContainer = document.getElementById('low-balance-container');
    const chartCanvas = document.getElementById('usageChart');
    const renderStats = (stats) => {
        statsContainer.innerHTML = `
            <div class="card-ui flex items-center gap-4">
                <div class="p-3 rounded-full bg-cyan-100 text-cyan-600"><i data-lucide="credit-card" class="w-6 h-6"></i></div>
                <div>
                    <h3 class="text-sm font-medium text-slate-500">Kartu Aktif</h3>
                    <p class="text-3xl font-bold">${stats.kartuAktif}</p>
                </div>
            </div>
            <div class="card-ui flex items-center gap-4">
                <div class="p-3 rounded-full bg-cyan-100 text-cyan-600"><i data-lucide="user-square" class="w-6 h-6"></i></div>
                <div>
                    <h3 class="text-sm font-medium text-slate-500">Driver Aktif</h3>
                    <p class="text-3xl font-bold">${stats.driverAktif}</p>
                </div>
            </div>
            <div class="card-ui flex items-center gap-4">
                <div class="p-3 rounded-full bg-cyan-100 text-cyan-600"><i data-lucide="truck" class="w-6 h-6"></i></div>
                <div>
                    <h3 class="text-sm font-medium text-slate-500">Armada Aktif</h3>
                    <p class="text-3xl font-bold">${stats.armadaAktif}</p>
                </div>
            </div>
            <div class="card-ui flex items-center gap-4">
                <div class="p-3 rounded-full bg-cyan-100 text-cyan-600"><i data-lucide="arrow-right-left" class="w-6 h-6"></i></div>
                <div>
                    <h3 class="text-sm font-medium text-slate-500">Transaksi Hari Ini</h3>
                    <p class="text-3xl font-bold">${stats.transaksiHariIni}</p>
                </div>
            </div>
        `;
        lucide.createIcons();
    };
    const renderLogs = (logs) => {
        if (!logs || logs.length === 0) {
            logsContainer.innerHTML = '<p class="text-sm text-slate-500">Tidak ada log terbaru.</p>';
            return;
        }
        logsContainer.innerHTML = logs.map(log => `
            <div class="text-sm border-b border-slate-100 pb-2">
                <p class="font-medium truncate text-slate-700">${log.pesan}</p>
                <p class="text-xs text-slate-400">${new Date(log.waktu).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</p>
            </div>
        `).join('');
    };
    const renderLowBalance = (cards) => {
        if (!cards || cards.length === 0) {
            lowBalanceContainer.innerHTML = `<p class="text-sm text-slate-500">Tidak ada kartu dengan saldo rendah.</p>`;
            return;
        }
        lowBalanceContainer.innerHTML = cards.map(card => `
            <div class="flex justify-between items-center p-2 rounded-lg hover:bg-amber-50">
                <span class="text-slate-600">Kartu <strong>${card.nomor}</strong></span>
                <span class="font-semibold text-amber-700">Rp ${card.saldo.toLocaleString('id-ID')}</span>
            </div>
        `).join('');
    };
    const renderChart = (chartData) => {
        const ctx = chartCanvas.getContext('2d');
        if (window.usageChart instanceof Chart) {
            window.usageChart.destroy();
        }
        if (chartData.tol === 0 && chartData.parkir === 0) {
            chartCanvas.parentElement.innerHTML = '<p class="text-center text-slate-500">Belum ada data biaya transaksi.</p>';
            return;
        }
        window.usageChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Tol', 'Parkir'],
                datasets: [{
                    data: [chartData.tol, chartData.parkir],
                    backgroundColor: ['#0B2340', '#06B6D4'],
                    borderColor: '#ffffff',
                    borderWidth: 4,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            font: {
                                family: "'Inter', sans-serif",
                                size: 14
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed !== null) {
                                    label += new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(context.parsed);
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    };
    try {
        const response = await window.app.api.fetch('/api/dashboard');
        const data = response.data;
        renderStats(data.stats);
        renderLogs(data.logs);
        renderLowBalance(data.lowBalance);
        renderChart(data.chartData);
    } catch (error) {
        window.app.ui.showToast('Gagal memuat data dashboard.', 'error');
        statsContainer.innerHTML = '<p class="text-center text-red-500 col-span-4">Gagal memuat statistik.</p>';
        logsContainer.innerHTML = '<p class="text-sm text-red-500">Gagal memuat log.</p>';
        lowBalanceContainer.innerHTML = '<p class="text-sm text-red-500">Gagal memuat info saldo.</p>';
        chartCanvas.parentElement.innerHTML = '<p class="text-center text-red-500">Gagal memuat chart.</p>';
    }
});