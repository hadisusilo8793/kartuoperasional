document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('pengembalianForm');
    const skeleton = document.getElementById('form-skeleton');
    const pinjamanSelect = document.getElementById('pinjaman-aktif');
    const detailSection = document.getElementById('detail-section');
    const addGateRowBtn = document.getElementById('add-gate-row');
    const addParkirRowBtn = document.getElementById('add-parkir-row');
    const gateRowsContainer = document.getElementById('gate-rows-container');
    const parkirRowsContainer = document.getElementById('parkir-rows-container');
    const modal = document.getElementById('confirmation-modal');
    const confirmModalBtn = document.getElementById('confirm-modal-btn');
    const cancelModalBtn = document.getElementById('cancel-modal-btn');
    let pinjamanAktif = [], gates = [], selectedPinjaman = null;
    const loadInitialData = async () => {
        try {
            const [pinjamanRes, gateRes] = await Promise.all([
                window.app.api.fetch('/api/transaksi/pinjaman-aktif'),
                window.app.api.fetch('/api/gate')
            ]);
            pinjamanAktif = pinjamanRes.data;
            gates = gateRes.data;
            populatePinjamanSelect();
            skeleton.classList.add('hidden');
            form.classList.remove('hidden');
        } catch (error) {
            window.app.ui.showToast('Gagal memuat data.', 'error');
        }
    };
    const populatePinjamanSelect = () => {
        pinjamanSelect.innerHTML = '<option value="">-- Pilih Transaksi --</option>';
        pinjamanAktif.forEach(p => {
            const option = document.createElement('option');
            option.value = p.transaksi_id;
            option.textContent = `${p.nomor_kartu} - ${p.nama_driver} - ${p.nomor_armada} (${p.plat})`;
            pinjamanSelect.appendChild(option);
        });
    };
    pinjamanSelect.addEventListener('change', (e) => {
        const trxId = e.target.value;
        selectedPinjaman = pinjamanAktif.find(p => p.transaksi_id == trxId);
        if (selectedPinjaman) {
            detailSection.classList.remove('hidden');
            gateRowsContainer.innerHTML = '';
            parkirRowsContainer.innerHTML = '';
            calculateTotals();
        } else {
            detailSection.classList.add('hidden');
        }
    });
    const createGateRow = () => {
        const row = document.createElement('div');
        row.className = 'dynamic-row';
        row.innerHTML = `
            <select name="gate_id" class="form-input-sm flex-grow">
                <option value="">Pilih Gate</option>
                ${gates.map(g => `<option value="${g.id}">${g.nama}</option>`).join('')}
            </select>
            <input type="text" name="gate_biaya" class="form-input-sm nominal w-32 text-right" placeholder="Biaya" value="0">
            <button type="button" class="remove-row-btn"><i data-lucide="x" class="w-4 h-4"></i></button>
        `;
        gateRowsContainer.appendChild(row);
        lucide.createIcons();
    };
    const createParkirRow = () => {
        const row = document.createElement('div');
        row.className = 'dynamic-row';
        row.innerHTML = `
            <input type="text" name="parkir_lokasi" class="form-input-sm flex-grow" placeholder="Lokasi Parkir">
            <input type="text" name="parkir_biaya" class="form-input-sm nominal w-32 text-right" placeholder="Biaya" value="0">
            <button type="button" class="remove-row-btn"><i data-lucide="x" class="w-4 h-4"></i></button>
        `;
        parkirRowsContainer.appendChild(row);
        lucide.createIcons();
    };
    addGateRowBtn.addEventListener('click', createGateRow);
    addParkirRowBtn.addEventListener('click', createParkirRow);
    form.addEventListener('click', (e) => {
        if (e.target.closest('.remove-row-btn')) {
            e.target.closest('.dynamic-row').remove();
            calculateTotals();
        }
    });
    form.addEventListener('input', (e) => {
        if (e.target.classList.contains('nominal')) {
            let value = e.target.value.replace(/\D/g, '');
            e.target.value = value === '' ? '0' : parseInt(value, 10).toLocaleString('id-ID');
            calculateTotals();
        }
    });
    const calculateTotals = async () => {
        const gateBiaya = Array.from(document.querySelectorAll('[name="gate_biaya"]')).reduce((sum, input) => sum + parseInt(input.value.replace(/\D/g, '') || 0, 10), 0);
        const parkirBiaya = Array.from(document.querySelectorAll('[name="parkir_biaya"]')).reduce((sum, input) => sum + parseInt(input.value.replace(/\D/g, '') || 0, 10), 0);
        const totalBiaya = gateBiaya + parkirBiaya;
        document.getElementById('total-tol').textContent = `Rp ${gateBiaya.toLocaleString('id-ID')}`;
        document.getElementById('total-parkir').textContent = `Rp ${parkirBiaya.toLocaleString('id-ID')}`;
        document.getElementById('total-biaya').textContent = `Rp ${totalBiaya.toLocaleString('id-ID')}`;
        if (selectedPinjaman) {
            const card = await window.app.api.fetch(`/api/kartu?nomor=${selectedPinjaman.nomor_kartu}`);
            const saldoAwal = card.data[0].saldo;
            const saldoAkhir = saldoAwal - totalBiaya;
            document.getElementById('saldo-akhir').textContent = `Rp ${saldoAkhir.toLocaleString('id-ID')}`;
        }
    };
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        // Show confirmation modal
        modal.classList.remove('hidden');
        // Populate modal summary
    });
    cancelModalBtn.addEventListener('click', () => modal.classList.add('hidden'));
    confirmModalBtn.addEventListener('click', async () => {
        const gate_in_out = Array.from(document.querySelectorAll('#gate-rows-container .dynamic-row')).map(row => ({
            gate_id: row.querySelector('[name="gate_id"]').value,
            biaya: parseInt(row.querySelector('[name="gate_biaya"]').value.replace(/\D/g, '') || 0, 10)
        }));
        const parkir = Array.from(document.querySelectorAll('#parkir-rows-container .dynamic-row')).map(row => ({
            lokasi: row.querySelector('[name="parkir_lokasi"]').value,
            biaya: parseInt(row.querySelector('[name="parkir_biaya"]').value.replace(/\D/g, '') || 0, 10)
        }));
        const data = {
            gate_in_out,
            parkir,
            kondisi: document.getElementById('kondisi').value,
            deskripsi: document.getElementById('deskripsi').value,
        };
        try {
            const response = await window.app.api.fetch(`/api/transaksi/pengembalian/${selectedPinjaman.transaksi_id}`, {
                method: 'POST',
                body: JSON.stringify(data)
            });
            window.app.ui.showToast(response.message, 'success');
            modal.classList.add('hidden');
            form.reset();
            detailSection.classList.add('hidden');
            loadInitialData();
        } catch (error) {
            window.app.ui.showToast(error.message, 'error');
        }
    });
    loadInitialData();
});