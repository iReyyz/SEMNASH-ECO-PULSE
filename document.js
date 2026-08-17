document.addEventListener('DOMContentLoaded', () => {
    const openAdminBtn = document.getElementById('openAdminBtn');
    const adminPasswordModal = document.getElementById('adminPasswordModal');
    const adminModal = document.getElementById('adminModal');
    const closeAdminBtn = document.getElementById('closeAdminBtn');
    const btnCancelAdminPassword = document.getElementById('btnCancelAdminPassword');
    const adminPasswordForm = document.getElementById('adminPasswordForm');
    const adminPasswordInput = document.getElementById('adminPasswordInput');

    // 1. Buka Modal Kata Laluan Admin bila butang header ditekan
    openAdminBtn.addEventListener('click', () => {
        adminPasswordModal.classList.add('active'); // atau style.display = 'flex';
        adminPasswordInput.value = '';
        adminPasswordInput.focus();
    });

    // 2. Tutup Modal Kata Laluan jika Batal
    btnCancelAdminPassword.addEventListener('click', () => {
        adminPasswordModal.classList.remove('active');
    });

    // 3. Pengesahan Kata Laluan
    adminPasswordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const password = adminPasswordInput.value.trim();

        if (password === 'cikgu') { // Kata laluan asal / default
            adminPasswordModal.classList.remove('active');
            adminModal.classList.add('active'); // Buka Panel Utama Admin
        } else {
            alert('Kata laluan salah! Sila cuba lagi.');
        }
    });

    // 4. Tutup Panel Utama Admin
    closeAdminBtn.addEventListener('click', () => {
        adminModal.classList.remove('active');
    });

    // 5. Pertukaran Tab Admin
    const tabButtons = document.querySelectorAll('#adminTabNav .tab-btn');
    const tabContents = document.querySelectorAll('#adminModal .tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');

            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            button.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
        });
    });
});