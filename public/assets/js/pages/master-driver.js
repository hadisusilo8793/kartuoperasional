document.addEventListener('DOMContentLoaded', () => {
    const tableBody = document.getElementById('data-table-body');
    const addBtn = document.getElementById('add-btn');
    // Assuming CSV import buttons will be added to the HTML if needed
    // const importBtn = document.getElementById('import-btn');
    // const csvImportInput = document.getElementById('csv-import');
    const fetchData = async () => {
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center py-4">Memuat data...</td></tr>`;
        try {
            const response = await window.app.api.fetch('/api/driver');
            renderTable(response.data);
        } catch (error) {
            window.app.ui.showToast(error.message, 'error');
            tableBody.innerHTML = `<tr><td colspan="4" class="text-center py-4">Gagal memuat data.</td></tr>`;
        }
    };
    const renderTable = (data) => {
        tableBody.innerHTML = '';
        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" class="text-center py-4">Tidak ada data driver.</td></tr>`;
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
        <td class="px-6 py-4">${item.nik}</td>
        <td class="px-6 py-4">${item.nama}</td>
        <td class="px-6 py-4"><span class="status-${item.status.toLowerCase()}">${item.status}</span></td>
        <td class="px-6 py-4 text-center">
            <div class="flex justify-center gap-2">
                <button class="edit-btn text-cyan-600 hover:text-cyan-800" title="Edit"><i data-lucide="edit" class="w-4 h-4"></i></button>
                <button class="delete-btn text-red-600 hover:text-red-800" title="Hapus"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>
        </td>
    `;
    const createFormHtml = (item = {}) => `
        <td class="px-6 py-4"><input type="text" name="nik" value="${item.nik || ''}" class="form-input-sm uppercase-input" required></td>
        <td class="px-6 py-4"><input type="text" name="nama" value="${item.nama || ''}" class="form-input-sm" required></td>
        <td class="px-6 py-4">
            <select name="status" class="form-input-sm">
                <option value="AKTIF" ${item.status === 'AKTIF' ? 'selected' : ''}>AKTIF</option>
                <option value="NONAKTIF" ${item.status === 'NONAKTIF' ? 'selected' : ''}>NONAKTIF</option>
            </select>
        </td>
        <td class="px-6 py-4 text-center">
            <div class="flex justify-center gap-2">
                <button class="save-btn text-green-600 hover:text-green-800" title="Simpan"><i data-lucide="check" class="w-4 h-4"></i></button>
                <button class="cancel-btn text-red-600 hover:text-red-800" title="Batal"><i data-lucide="x" class="w-4 h-4"></i></button>
            </div>
        </td>
    `;
    const handleSave = async (row) => {
        const id = row.dataset.id;
        const isNew = !id;
        const data = {
            nik: row.querySelector('[name="nik"]').value,
            nama: row.querySelector('[name="nama"]').value,
            status: row.querySelector('[name="status"]').value,
        };
        try {
            const url = isNew ? '/api/driver' : `/api/driver/${id}`;
            const method = isNew ? 'POST' : 'PUT';
            const response = await window.app.api.fetch(url, { method, body: JSON.stringify(data) });
            window.app.ui.showToast(response.message, 'success');
            fetchData();
        } catch (error) {
            window.app.ui.showToast(error.message, 'error');
        }
    };
    addBtn.addEventListener('click', () => {
        const newRow = document.createElement('tr');
        newRow.className = 'bg-white border-b';
        newRow.innerHTML = createFormHtml();
        tableBody.prepend(newRow);
        lucide.createIcons();
    });
    tableBody.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-btn');
        const saveBtn = e.target.closest('.save-btn');
        const cancelBtn = e.target.closest('.cancel-btn');
        if (editBtn) {
            const row = editBtn.closest('tr');
            const id = row.dataset.id;
            try {
                const res = await window.app.api.fetch(`/api/driver?id=${id}`);
                const item = res.data[0];
                row.dataset.original = JSON.stringify(item);
                row.innerHTML = createFormHtml(item);
                lucide.createIcons();
            } catch (error) {
                window.app.ui.showToast('Gagal mengambil data driver.', 'error');
            }
        }
        if (deleteBtn) {
            const row = deleteBtn.closest('tr');
            if (confirm('Apakah Anda yakin ingin menghapus driver ini?')) {
                try {
                    const res = await window.app.api.fetch(`/api/driver/${row.dataset.id}`, { method: 'DELETE' });
                    window.app.ui.showToast(res.message, 'success');
                    fetchData();
                } catch (err) {
                    window.app.ui.showToast(err.message, 'error');
                }
            }
        }
        if (saveBtn) {
            window.app.ui.antiDoubleClick(saveBtn, () => handleSave(saveBtn.closest('tr')));
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
    tableBody.addEventListener('input', (e) => {
        if (e.target.classList.contains('uppercase-input')) {
            e.target.value = e.target.value.toUpperCase();
        }
    });
    fetchData();
});