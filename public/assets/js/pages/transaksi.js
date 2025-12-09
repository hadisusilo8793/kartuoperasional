document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('pinjamForm');
    const skeleton = document.getElementById('form-skeleton');
    const formFields = document.getElementById('form-fields');
    const submitBtn = document.getElementById('submitBtn');
    let drivers = [], armadas = [], kartus = [];
    const loadInitialData = async () => {
        try {
            const [driverRes, armadaRes, kartuRes] = await Promise.all([
                window.app.api.fetch('/api/driver'),
                window.app.api.fetch('/api/armada'),
                window.app.api.fetch('/api/kartu?status_pinjam=TERSEDIA')
            ]);
            drivers = driverRes.data;
            armadas = armadaRes.data;
            kartus = kartuRes.data;
            populateDatalist('driver-list', drivers, item => `${item.nama} - ${item.nik}`);
            populateDatalist('armada-list', armadas, item => `${item.nomor_armada} - ${item.plat}`);
            populateDatalist('kartu-list', kartus, item => item.nomor);
            skeleton.classList.add('hidden');
            formFields.classList.remove('hidden');
        } catch (error) {
            window.app.ui.showToast('Gagal memuat data awal.', 'error');
            skeleton.innerHTML = '<p class="text-center text-red-500">Gagal memuat form.</p>';
        }
    };
    const populateDatalist = (listId, data, formatter) => {
        const datalist = document.getElementById(listId);
        datalist.innerHTML = '';
        data.forEach(item => {
            const option = document.createElement('option');
            option.value = formatter(item);
            option.dataset.id = item.id;
            datalist.appendChild(option);
        });
    };
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const driverId = findIdByValue('driver-list', form.driver.value, drivers, item => `${item.nama} - ${item.nik}`);
        const armadaId = findIdByValue('armada-list', form.armada.value, armadas, item => `${item.nomor_armada} - ${item.plat}`);
        const kartuId = findIdByValue('kartu-list', form.kartu.value, kartus, item => item.nomor);
        if (!driverId || !armadaId || !kartuId) {
            window.app.ui.showToast('Harap pilih driver, armada, dan kartu dari daftar.', 'error');
            return;
        }
        const data = {
            driver_id: parseInt(driverId),
            armada_id: parseInt(armadaId),
            kartu_id: parseInt(kartuId),
            tujuan: form.tujuan.value,
        };
        try {
            const response = await window.app.api.fetch('/api/transaksi/pinjam', {
                method: 'POST',
                body: JSON.stringify(data),
            });
            window.app.ui.showToast(response.message, 'success');
            form.reset();
            // Refresh available cards
            loadInitialData();
        } catch (error) {
            window.app.ui.showToast(error.message, 'error');
        }
    };
    const findIdByValue = (listId, value, data, formatter) => {
        const option = Array.from(document.getElementById(listId).options).find(opt => opt.value === value);
        return option ? option.dataset.id : null;
    };
    form.addEventListener('submit', (e) => {
        window.app.ui.antiDoubleClick(submitBtn, () => handleFormSubmit(e));
    });
    loadInitialData();
});