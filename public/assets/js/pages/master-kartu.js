document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('data-table-body');
    const addBtn = document.getElementById('add-btn');
    const importBtn = document.getElementById('import-btn');
    const csvImportInput = document.getElementById('csv-import');
    const fetchData = async () => {
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4">Memuat data...</td></tr>`;
        try {
            const response = await window.app.api.fetch('/api/kartu');
            renderTable(response.data);
        } catch (error) {
            window.app.ui.showToast(error.message, 'error');
            tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4">Gagal memuat data.</td></tr>`;
        }
    };
    const renderTable = (data) => {
        tableBody.innerHTML = '';
        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4">Tidak ada data kartu.</td></tr>`;
            return;
        }
        data.forEach(item => {
            const row = document.createElement('tr');
            row.className = 'bg-white border-b hover:bg-slate-50';
            row.dataset.id = item.id;
            row.innerHTML = createRowHtml(item);
            tableBody.appendChild(row);
        });
        lucide.createIcons();
    };
    const createRowHtml = (item) => `
        <td class="px-6 py-4">${item.nomor}</td>
        <td class="px-6 py-4">${item.serial}</td>
        <td class="px-6 py-4">${item.jenis}</td>
        <td class="px-6 py-4"><span class="status-${item.status.toLowerCase()}">${item.status}</span></td>
        <td class="px-6 py-4"><span class="status-pinjam-${item.status_pinjam.toLowerCase()}">${item.status_pinjam}</span></td>
        <td class="px-6 py-4 text-right font-medium">Rp ${item.saldo.toLocaleString('id-ID')}</td>
        <td class="px-6 py-4 text-center">
            <div class="flex justify-center gap-2">
                <button class="edit-btn text-cyan-600 hover:text-cyan-800"><i data-lucide="edit" class="w-4 h-4"></i></button>
                <button class="delete-btn text-red-600 hover:red-800"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>
        </td>
    `;
    const createFormHtml = (item = {}) => {
        const isNew = !item.id;
        const isDipinjam = item.status_pinjam === 'DIPINJAM';
        return `
            <td class="px-6 py-4"><input type="text" name="nomor" value="${item.nomor || ''}" class="form-input-sm" ${isDipinjam ? 'disabled' : ''} required></td>
            <td class="px-6 py-4"><input type="text" name="serial" value="${item.serial || ''}" class="form-input-sm" ${isDipinjam ? 'disabled' : ''} required></td>
            <td class="px-6 py-4"><input type="text" name="jenis" value="${item.jenis || ''}" class="form-input-sm" ${isDipinjam ? 'disabled' : ''} required></td>
            <td class="px-6 py-4">
                <select name="status" class="form-input-sm">
                    <option value="AKTIF" ${item.status === 'AKTIF' ? 'selected' : ''}>AKTIF</option>
                    <option value="NONAKTIF" ${item.status === 'NONAKTIF' ? 'selected' : ''}>NONAKTIF</option>
                </select>
            </td>
            <td class="px-6 py-4">
                <select name="status_pinjam" class="form-input-sm" ${isDipinjam ? 'disabled' : ''}>
                    <option value="TERSEDIA" ${item.status_pinjam === 'TERSEDIA' ? 'selected' : ''}>TERSEDIA</option>
                    <option value="DIPINJAM" ${item.status_pinjam === 'DIPINJAM' ? 'selected' : ''}>DIPINJAM</option>
                </select>
            </td>
            <td class="px-6 py-4"><input type="text" name="saldo" value="${item.saldo || '0'}" class="form-input-sm nominal text-right" required></td>
            <td class="px-6 py-4 text-center">
                <div class="flex justify-center gap-2">
                    <button class="save-btn text-green-600 hover:text-green-800"><i data-lucide="check" class="w-4 h-4"></i></button>
                    <button class="cancel-btn text-red-600 hover:red-800"><i data-lucide="x" class="w-4 h-4"></i></button>
                </div>
            </td>
        `;
    };
    const handleSave = async (row) => {
        const id = row.dataset.id;
        const isNew = !id;
        const data = {
            nomor: row.querySelector('[name="nomor"]').value,
            serial: row.querySelector('[name="serial"]').value,
            jenis: row.querySelector('[name="jenis"]').value,
            status: row.querySelector('[name="status"]').value,
            status_pinjam: row.querySelector('[name="status_pinjam"]').value,
            saldo: row.querySelector('[name="saldo"]').value.replace(/\D/g, ''),
        };
        try {
            const url = isNew ? '/api/kartu' : `/api/kartu/${id}`;
            const method = isNew ? 'POST' : 'PUT';
            const response = await window.app.api.fetch(url, { method, body: JSON.stringify(data) });
            window.app.ui.showToast(response.message, 'success');
            fetchData();
        } catch (error) {
            window.app.ui.showToast(error.message, 'error');
            if (!isNew) {
                // Revert on failure
                const originalData = JSON.parse(row.dataset.original);
                row.innerHTML = createRowHtml(originalData);
                lucide.createIcons();
            }
        }
    };
    addBtn.addEventListener('click', () => {
        const newRow = document.createElement('tr');
        newRow.className = 'bg-white border-b';
        newRow.innerHTML = createFormHtml();
        tableBody.prepend(newRow);
        lucide.createIcons();
    });
    tableBody.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');
        const saveBtn = e.target.closest('.save-btn');
        const cancelBtn = e.target.closest('.cancel-btn');
        if (editBtn) {
            const row = editBtn.closest('tr');
            const id = row.dataset.id;
            window.app.api.fetch(`/api/kartu?id=${id}`).then(res => {
                const item = res.data.find(d => d.id == id);
                row.dataset.original = JSON.stringify(item);
                row.innerHTML = createFormHtml(item);
                lucide.createIcons();
            });
        }
        if (deleteBtn) {
            const row = deleteBtn.closest('tr');
            if (confirm('Apakah Anda yakin ingin menghapus kartu ini?')) {
                window.app.api.fetch(`/api/kartu/${row.dataset.id}`, { method: 'DELETE' })
                    .then(res => {
                        window.app.ui.showToast(res.message, 'success');
                        fetchData();
                    })
                    .catch(err => window.app.ui.showToast(err.message, 'error'));
            }
        }
        if (saveBtn) {
            handleSave(saveBtn.closest('tr'));
        }
        if (cancelBtn) {
            const row = cancelBtn.closest('tr');
            if (row.dataset.id) {
                const originalData = JSON.parse(row.dataset.original);
                row.innerHTML = createRowHtml(originalData);
                lucide.createIcons();
            } else {
                row.remove();
            }
        }
    });
    importBtn.addEventListener('click', () => csvImportInput.click());
    csvImportInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        // Papa.parse(file, { ... }); // CSV import logic to be added
        window.app.ui.showToast('Fitur import CSV akan segera hadir.', 'info');
    });
    fetchData();
});