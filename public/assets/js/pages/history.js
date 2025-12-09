document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('history-table-body');
    const paginationControls = document.getElementById('pagination-controls');
    const searchForm = document.getElementById('search-form');
    const exportBtn = document.getElementById('export-csv-btn');
    let currentPage = 1;
    let currentData = [];
    let searchTimer;
    const fetchHistory = async (page = 1) => {
        tableBody.innerHTML = `
            <tr class="animate-pulse"><td class="px-6 py-4" colspan="12"><div class="h-8 bg-slate-200 rounded"></div></td></tr>
            <tr class="animate-pulse"><td class="px-6 py-4" colspan="12"><div class="h-8 bg-slate-200 rounded"></div></td></tr>
            <tr class="animate-pulse"><td class="px-6 py-4" colspan="12"><div class="h-8 bg-slate-200 rounded"></div></td></tr>
        `;
        try {
            const params = new URLSearchParams({
                page,
                limit: 10,
                kartu_search: document.getElementById('kartu-search').value,
                driver_search: document.getElementById('driver-search').value,
                armada_search: document.getElementById('armada-search').value,
                date_from: document.getElementById('date-from').value,
                date_to: document.getElementById('date-to').value,
            });
            const response = await window.app.api.fetch(`/api/history?${params.toString()}`);
            currentData = response.data;
            renderTable(response.data);
            renderPagination(response.pagination);
        } catch (error) {
            window.app.ui.showToast(error.message, 'error');
            tableBody.innerHTML = `<tr><td colspan="12" class="text-center py-4">Gagal memuat data.</td></tr>`;
        }
    };
    const renderTable = (data) => {
        tableBody.innerHTML = '';
        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="12" class="text-center py-4">Tidak ada data riwayat yang cocok.</td></tr>`;
            return;
        }
        data.forEach(item => {
            const row = document.createElement('tr');
            row.className = 'bg-white border-b hover:bg-slate-50';
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">${new Date(item.waktu_pinjam).toLocaleDateString('id-ID')}</td>
                <td class="px-6 py-4">${item.nomor_armada}</td>
                <td class="px-6 py-4">${item.plat}</td>
                <td class="px-6 py-4">${item.nama_driver}</td>
                <td class="px-6 py-4">${item.nik}</td>
                <td class="px-6 py-4">${item.nomor_kartu}</td>
                <td class="px-6 py-4">${item.serial_kartu}</td>
                <td class="px-6 py-4">${item.gate_in || '-'}</td>
                <td class="px-6 py-4">${item.gate_out || '-'}</td>
                <td class="px-6 py-4 text-right">Rp ${item.total_tol.toLocaleString('id-ID')}</td>
                <td class="px-6 py-4 text-right">Rp ${item.total_parkir.toLocaleString('id-ID')}</td>
                <td class="px-6 py-4 text-right font-semibold">Rp ${item.total_biaya.toLocaleString('id-ID')}</td>
            `;
            tableBody.appendChild(row);
        });
    };
    const renderPagination = (pagination) => {
        currentPage = pagination.page;
        paginationControls.innerHTML = `
            <span class="text-sm text-slate-700">
                Menampilkan ${((currentPage - 1) * pagination.limit) + 1} - ${Math.min(currentPage * pagination.limit, pagination.total)} dari ${pagination.total} hasil
            </span>
            <div class="inline-flex -space-x-px rounded-md shadow-sm">
                <button id="prev-page" ${pagination.page === 1 ? 'disabled' : ''} class="px-3 py-2 text-sm font-medium text-slate-500 bg-white border border-slate-300 rounded-l-md disabled:opacity-50 hover:bg-slate-50">Sebelumnya</button>
                <button id="next-page" ${pagination.page >= pagination.totalPages ? 'disabled' : ''} class="px-3 py-2 text-sm font-medium text-slate-500 bg-white border border-slate-300 rounded-r-md disabled:opacity-50 hover:bg-slate-50">Berikutnya</button>
            </div>
        `;
        document.getElementById('prev-page').addEventListener('click', () => fetchHistory(currentPage - 1));
        document.getElementById('next-page').addEventListener('click', () => fetchHistory(currentPage + 1));
    };
    const exportToCSV = () => {
        if (currentData.length === 0) {
            window.app.ui.showToast('Tidak ada data untuk diekspor', 'info');
            return;
        }
        const csv = Papa.unparse(currentData.map(item => ({
            "Tanggal": new Date(item.waktu_pinjam).toLocaleString('id-ID'),
            "No Armada": item.nomor_armada,
            "Plat": item.plat,
            "Nama Driver": item.nama_driver,
            "NIK": item.nik,
            "No Kartu": item.nomor_kartu,
            "Serial": item.serial_kartu,
            "Gate In": item.gate_in,
            "Gate Out": item.gate_out,
            "Biaya Tol": item.total_tol,
            "Biaya Parkir": item.total_parkir,
            "Total Biaya": item.total_biaya,
        })));
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `riwayat_transaksi_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.app.ui.showToast('Ekspor CSV berhasil', 'success');
    };
    searchForm.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => fetchHistory(1), 500);
    });
    exportBtn.addEventListener('click', exportToCSV);
    fetchHistory();
});