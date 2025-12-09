document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('settingsForm');
    const submitBtn = document.getElementById('submitBtn');
    const fetchSettings = async () => {
        try {
            const response = await window.app.api.fetch('/api/settings');
            const settings = response.data;
            form.max_per_hari.value = settings.max_per_hari;
            form.min_saldo.value = settings.min_saldo.toLocaleString('id-ID');
            form.max_saldo.value = settings.max_saldo.toLocaleString('id-ID');
        } catch (error) {
            window.app.ui.showToast('Gagal memuat pengaturan.', 'error');
        }
    };
    const handleSave = async (e) => {
        e.preventDefault();
        const data = {
            max_per_hari: parseInt(form.max_per_hari.value, 10),
            min_saldo: parseInt(form.min_saldo.value.replace(/\D/g, ''), 10),
            max_saldo: parseInt(form.max_saldo.value.replace(/\D/g, ''), 10),
        };
        try {
            const response = await window.app.api.fetch('/api/settings', {
                method: 'PUT',
                body: JSON.stringify(data),
            });
            window.app.ui.showToast('Pengaturan berhasil disimpan.', 'success');
        } catch (error) {
            window.app.ui.showToast(error.message, 'error');
        }
    };
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        window.app.ui.antiDoubleClick(submitBtn, () => handleSave(e));
    });
    // Nominal input formatting
    document.querySelectorAll('.nominal').forEach(input => {
        input.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value === '') {
                e.target.value = '';
            } else {
                e.target.value = parseInt(value, 10).toLocaleString('id-ID');
            }
        });
    });
    fetchSettings();
});