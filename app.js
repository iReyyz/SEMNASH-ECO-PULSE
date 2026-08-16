document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 1. DATA PANGKALAN DATA (LOCALSTORAGE & INDEXEDDB)
    // ==========================================
    const listTingkatan = ["Tingkatan 1", "Tingkatan 2", "Tingkatan 3", "Tingkatan 4", "Tingkatan 5"];
    const listKelas = ["Alfa", "Beta", "Gamma", "Delta", "Epsilon"];

    const defaultStudents = [
        { id: "STU-001", name: "Ahmad Albab", tingkatan: "Tingkatan 1", kelas: "Alfa", points: 120, photo: "assets/default-avatar.png", history: [] },
        { id: "STU-002", name: "Siti Nurhaliza", tingkatan: "Tingkatan 2", kelas: "Beta", points: 85, photo: "assets/default-avatar.png", history: [] }
    ];

    const defaultBarcodes = [
        { code: "ECO-1001", category: "Botol Plastik", points: 10, used: false },
        { code: "ECO-1002", category: "Tin Aluminium", points: 15, used: false },
        { code: "ECO-1003", category: "Kertas / Kotak", points: 5, used: false }
    ];

    const defaultRewards = [
        { id: "REW-1", name: "Buku Nota Eco", points: 50, image: "assets/default-reward.png" },
        { id: "REW-2", name: "Pensel Kayu Kitar Semula", points: 20, image: "assets/default-reward.png" }
    ];

    let students = JSON.parse(localStorage.getItem('eco_students')) || defaultStudents;
    let barcodes = JSON.parse(localStorage.getItem('eco_barcodes')) || defaultBarcodes;
    let rewards = JSON.parse(localStorage.getItem('eco_rewards')) || defaultRewards;
    let currentObjectUrl = null;

    let currentStudent = null;
    let pendingScannedItem = null;
    let cameraStream = null;
    let barcodeDetector = null;
    let scanAnimationFrame = null;
    let bluetoothDevice = null;
    let bluetoothGattServer = null;

    function saveData() {
        localStorage.setItem('eco_students', JSON.stringify(students));
        localStorage.setItem('eco_barcodes', JSON.stringify(barcodes));
        localStorage.setItem('eco_rewards', JSON.stringify(rewards));
    }

    // --- Pengurusan Video Besar Menggunakan IndexedDB ---
    function openVideoDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('EcoVideoDB', 1);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('videos')) {
                    db.createObjectStore('videos');
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async function saveVideoToDB(file) {
        try {
            const db = await openVideoDB();
            const tx = db.transaction('videos', 'readwrite');
            const store = tx.objectStore('videos');
            store.put(file, 'promo_video');
            return new Promise((resolve) => {
                tx.oncomplete = () => resolve(true);
            });
        } catch (e) {
            console.warn("Gagal simpan ke IndexedDB, guna fallback LocalStorage", e);
            return false;
        }
    }

    async function getVideoFromDB() {
        try {
            const db = await openVideoDB();
            const tx = db.transaction('videos', 'readonly');
            const store = tx.objectStore('videos');
            const request = store.get('promo_video');
            return new Promise((resolve) => {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => resolve(null);
            });
        } catch (e) {
            return null;
        }
    }

    // ==========================================
    // 2. NAVIGASI SKRIN & PENGURUSAN VIDEO DEPAN
    // ==========================================
    function showScreen(screenId) {
        if (screenId !== 'screen-4') {
            stopCamera();
        }

        document.querySelectorAll('.screen').forEach(s => {
            s.classList.remove('active');
            s.style.display = 'none';
        });

        const target = document.getElementById(screenId);
        if (target) {
            target.classList.add('active');
            target.style.display = 'block';
        }

        if (screenId === 'screen-1') {
            loadPromoVideo();
        }
    }

    // Muat dan paparkan video promosi dengan tetapan AUTOPLAY & LOOP
    async function loadPromoVideo() {
        const videoElem = document.getElementById('mainPromoVideo');
        const fallbackCanvas = document.getElementById('mainVideoCanvasFallback');

        if (!videoElem) return;

        let videoData = await getVideoFromDB();
        let videoSrc = null;

        if (videoData instanceof Blob || videoData instanceof File) {
            if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl);
            currentObjectUrl = URL.createObjectURL(videoData);
            videoSrc = currentObjectUrl;
        } else {
            videoSrc = localStorage.getItem('eco_promo_video');
        }

        if (videoSrc) {
            videoElem.src = videoSrc;
            videoElem.style.display = 'block';
            if (fallbackCanvas) fallbackCanvas.style.display = 'none';

            videoElem.muted = true;
            videoElem.loop = true;
            videoElem.playsInline = true;

            const playPromise = videoElem.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.log("Autoplay dihalang oleh browser, memerlukan interaksi pengguna.");
                });
            }
        }
    }
    loadPromoVideo();

    // Navigasi Butang Utama
    document.getElementById('btnStartApp')?.addEventListener('click', () => {
        populateDropdowns();
        renderStudentLoginList();
        showScreen('screen-2');
    });

    document.getElementById('btnGoToRedeemDirect')?.addEventListener('click', () => {
        populateRedeemDropdowns();
        showScreen('screen-7');
    });

    document.getElementById('btnBackToPromo')?.addEventListener('click', () => showScreen('screen-1'));
    document.getElementById('btnBackToDashboard')?.addEventListener('click', () => showScreen('screen-3'));
    document.getElementById('btnBackFromRedeem')?.addEventListener('click', () => showScreen('screen-1'));

    // ==========================================
    // 3. PENGURUSAN KAMERA SEBENAR & IMBAS AUTOMATIK (SCREEN 4)
    // ==========================================
    document.getElementById('btnGoToScan')?.addEventListener('click', () => {
        showScreen('screen-4');
        startCamera();
    });

    async function startCamera() {
        const video = document.getElementById('scannerVideo');
        if (!video) return;

        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { exact: "environment" } }
            });
            video.srcObject = cameraStream;
            await video.play();
            initBarcodeScanner(video);
        } catch (err) {
            try {
                cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
                video.srcObject = cameraStream;
                await video.play();
                initBarcodeScanner(video);
            } catch (error) {
                alert("⚠️ Gagal mengakses kamera. Sila pastikan kebenaran kamera dibenarkan pada browser anda.");
            }
        }
    }

    function initBarcodeScanner(videoElement) {
        if ('BarcodeDetector' in window) {
            barcodeDetector = new BarcodeDetector({
                formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'qr_code', 'upc_a', 'upc_e']
            });

            const detectFrame = async () => {
                if (!cameraStream) return;
                try {
                    const barcodesFound = await barcodeDetector.detect(videoElement);
                    if (barcodesFound.length > 0) {
                        const scannedCode = barcodesFound[0].rawValue;
                        processBarcode(scannedCode);
                        return;
                    }
                } catch (e) {
                    console.error("Ralat pengimbasan barkod:", e);
                }
                scanAnimationFrame = requestAnimationFrame(detectFrame);
            };
            detectFrame();
        } else {
            console.log("BarcodeDetector API tidak disokong secara native. Anda boleh memasukkan kod secara manual.");
        }
    }

    function stopCamera() {
        if (scanAnimationFrame) {
            cancelAnimationFrame(scanAnimationFrame);
            scanAnimationFrame = null;
        }
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            cameraStream = null;
        }
    }

    // ==========================================
    // 4. BARKOD & PROSES IMBASAN
    // ==========================================
    function processBarcode(code) {
        const found = barcodes.find(b => b.code.toUpperCase() === code.trim().toUpperCase());

        if (!found) {
            alert('❌ Kod Barkod Tidak Wujud dalam sistem! Sila semak semula.');
            return;
        }

        if (found.used) {
            alert('⚠️ Barkod ini telah digunakan sebelum ini!');
            return;
        }

        pendingScannedItem = found;
        document.getElementById('verifyItemTitle').innerText = "SAMPAH DISAHKAN!";
        document.getElementById('verifyItemCategory').innerText = `${found.category} • +${found.points} Mata Ganjaran`;
        stopCamera();
        showScreen('screen-5');
    }

    document.getElementById('btnSubmitManualBarcode')?.addEventListener('click', () => {
        const input = document.getElementById('manualBarcodeInput');
        if (input && input.value) {
            processBarcode(input.value);
            input.value = '';
        }
    });

    // ==========================================
    // 5. FUNGSI BLUETOOTH ARDUINO & PENUTUP TONG
    // ==========================================
    const bluetoothStatusPill = document.getElementById('bluetoothStatusPill');
    const bluetoothStatusDot = document.getElementById('bluetoothStatusDot');
    const bluetoothStatusText = document.getElementById('bluetoothStatusText');

    bluetoothStatusPill?.addEventListener('click', async () => {
        if (!navigator.bluetooth) {
            alert('⚠️ Web Bluetooth API tidak disokong pada browser ini. Sila guna Google Chrome versi terkini.');
            return;
        }

        try {
            bluetoothStatusText.innerText = "Mencari...";
            bluetoothDevice = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: ['00001101-0000-1000-8000-00805f9b34fb']
            });

            bluetoothStatusText.innerText = "Menyambung...";
            bluetoothGattServer = await bluetoothDevice.gatt.connect();

            if (bluetoothStatusDot) bluetoothStatusDot.style.background = "#10b981";
            bluetoothStatusText.innerText = `Terhubung: ${bluetoothDevice.name || 'Arduino'}`;
            alert(`✅ Berjaya disambungkan ke Bluetooth: ${bluetoothDevice.name || 'Arduino'}`);
        } catch (err) {
            if (bluetoothStatusDot) bluetoothStatusDot.style.background = "#ef4444";
            bluetoothStatusText.innerText = "Bluetooth (Terputus)";
            alert("❌ Sambungan Bluetooth dibatalkan atau gagal.");
        }
    });

    document.getElementById('btnSendBluetoothOpen')?.addEventListener('click', async () => {
        if (!pendingScannedItem || !currentStudent) return;

        triggerArduinoLidSimulation();

        if (bluetoothGattServer && bluetoothGattServer.connected) {
            try {
                const service = await bluetoothGattServer.getPrimaryService('00001101-0000-1000-8000-00805f9b34fb');
                const characteristic = await service.getCharacteristic('00001101-0000-1000-8000-00805f9b34fb');
                const encoder = new TextEncoder();
                await characteristic.writeValue(encoder.encode('OPEN\n'));
            } catch (e) {
                console.log("Isyarat dihantar menerusi mod simulasi.");
            }
        }

        pendingScannedItem.used = true;
        currentStudent.points += pendingScannedItem.points;
        if (!currentStudent.history) currentStudent.history = [];
        currentStudent.history.unshift({
            category: pendingScannedItem.category,
            points: pendingScannedItem.points,
            date: new Date().toLocaleDateString()
        });

        saveData();

        document.getElementById('awardedPointsDisplay').innerText = `+${pendingScannedItem.points}`;
        document.getElementById('newTotalPointsDisplay').innerText = `${currentStudent.points} Points`;

        showScreen('screen-6');
    });

    function triggerArduinoLidSimulation() {
        const simBadge = document.getElementById('arduinoBinStatusBadge');
        if (simBadge) {
            simBadge.innerText = "STATUS: TERBUKA (90°)";
            simBadge.style.color = "#10b981";
            setTimeout(() => {
                simBadge.innerText = "STATUS: TERTUTUP (0°)";
                simBadge.style.color = "var(--neon-green)";
            }, 4000);
        }
    }

    document.getElementById('btnNextRecycle')?.addEventListener('click', () => {
        showScreen('screen-4');
        startCamera();
    });

    document.getElementById('btnFinishSession')?.addEventListener('click', () => {
        loadStudentDashboard();
        showScreen('screen-3');
    });

    // ==========================================
    // 6. LOGIN & DASHBOARD PELAJAR
    // ==========================================
    function populateDropdowns() {
        const selTingkatan = document.getElementById('selectTingkatan');
        const selKelas = document.getElementById('selectKelas');

        if (selTingkatan) {
            selTingkatan.innerHTML = '<option value="">-- Semua Tingkatan --</option>';
            listTingkatan.forEach(t => selTingkatan.innerHTML += `<option value="${t}">${t}</option>`);
        }
        if (selKelas) {
            selKelas.innerHTML = '<option value="">-- Semua Kelas --</option>';
            listKelas.forEach(k => selKelas.innerHTML += `<option value="${k}">${k}</option>`);
        }
    }

    function renderStudentLoginList() {
        const container = document.getElementById('studentListContainer');
        const filterTingkatan = document.getElementById('selectTingkatan')?.value;
        const filterKelas = document.getElementById('selectKelas')?.value;

        if (!container) return;
        container.innerHTML = '';

        let filtered = students.filter(s => {
            return (!filterTingkatan || s.tingkatan === filterTingkatan) &&
                (!filterKelas || s.kelas === filterKelas);
        });

        if (filtered.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); text-align: center; width: 100%;">Tiada pelajar dijumpai.</p>';
            return;
        }

        filtered.forEach(student => {
            const card = document.createElement('div');
            card.className = 'student-select-card';
            card.style.cssText = 'background: rgba(15,23,42,0.6); padding: 10px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 10px; border: 1px solid var(--border-glass); margin-bottom: 8px;';
            card.innerHTML = `
                <img src="${student.photo}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
                <div>
                    <strong style="color: #fff; display: block;">${student.name}</strong>
                    <small style="color: var(--text-muted);">${student.tingkatan} • ${student.kelas}</small>
                </div>
            `;
            card.addEventListener('click', () => {
                currentStudent = student;
                loadStudentDashboard();
                showScreen('screen-3');
            });
            container.appendChild(card);
        });
    }

    document.getElementById('selectTingkatan')?.addEventListener('change', renderStudentLoginList);
    document.getElementById('selectKelas')?.addEventListener('change', renderStudentLoginList);

    function loadStudentDashboard() {
        if (!currentStudent) return;
        document.getElementById('displayStudentName').innerText = currentStudent.name;
        document.getElementById('displayStudentClass').innerText = `${currentStudent.tingkatan} • ${currentStudent.kelas}`;
        document.getElementById('displayStudentPoints').innerText = currentStudent.points;
        if (currentStudent.photo) {
            document.getElementById('displayStudentAvatar').src = currentStudent.photo;
        }

        const historyList = document.getElementById('studentActivityList');
        if (historyList) {
            historyList.innerHTML = '';
            if (!currentStudent.history || currentStudent.history.length === 0) {
                historyList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">Belum ada sejarah kitar semula.</p>';
            } else {
                currentStudent.history.forEach(item => {
                    historyList.innerHTML += `
                        <div style="display: flex; justify-content: space-between; font-size: 0.85rem; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                            <span>${item.category.includes('Tebus') ? '🎁' : '♻️'} ${item.category}</span>
                            <strong style="color: ${item.points < 0 ? '#ef4444' : 'var(--neon-green)'};">${item.points > 0 ? '+' : ''}${item.points} Mata</strong>
                        </div>
                    `;
                });
            }
        }
    }

    document.getElementById('btnLogoutStudent')?.addEventListener('click', () => {
        currentStudent = null;
        showScreen('screen-2');
    });

    // ==========================================
    // 7. PANEL ADMIN & URUS BARKOD / GANJARAN / VIDEO
    // ==========================================
    const openAdminBtn = document.getElementById('openAdminBtn');
    const adminPasswordModal = document.getElementById('adminPasswordModal');
    const adminPasswordForm = document.getElementById('adminPasswordForm');
    const adminPasswordInput = document.getElementById('adminPasswordInput');
    const btnCancelAdminPassword = document.getElementById('btnCancelAdminPassword');
    const adminModal = document.getElementById('adminModal');
    const closeAdminBtn = document.getElementById('closeAdminBtn');

    openAdminBtn?.addEventListener('click', () => {
        adminPasswordModal.style.display = 'flex';
        adminPasswordInput.value = '';
        adminPasswordInput.focus();
    });

    btnCancelAdminPassword?.addEventListener('click', () => {
        adminPasswordModal.style.display = 'none';
    });

    adminPasswordForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        if (adminPasswordInput.value === 'cikgu') {
            adminPasswordModal.style.display = 'none';
            adminModal.style.display = 'flex';
            initAdminPanel();
        } else {
            alert('Kata laluan salah! (Default: cikgu)');
        }
    });

    closeAdminBtn?.addEventListener('click', () => {
        adminModal.style.display = 'none';
    });

    document.querySelectorAll('#adminTabNav .tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#adminTabNav .tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => {
                c.style.display = 'none';
                c.classList.remove('active');
            });

            btn.classList.add('active');
            const target = document.getElementById(btn.getAttribute('data-tab'));
            if (target) {
                target.style.display = 'block';
                target.classList.add('active');
            }
        });
    });

    function initAdminPanel() {
        const adminTingkatan = document.getElementById('adminNewStudentTingkatan');
        const adminKelas = document.getElementById('adminNewStudentKelas');

        if (adminTingkatan) {
            adminTingkatan.innerHTML = '';
            listTingkatan.forEach(t => adminTingkatan.innerHTML += `<option value="${t}">${t}</option>`);
        }
        if (adminKelas) {
            adminKelas.innerHTML = '';
            listKelas.forEach(k => adminKelas.innerHTML += `<option value="${k}">${k}</option>`);
        }

        renderAdminStudentList();
        renderAdminBarcodeList();
        renderAdminRewardsList();
        setupVideoUploadTab();
    }

    // --- A. URUS PELAJAR ---
    const formAddStudent = document.getElementById('formAddStudent');
    formAddStudent?.addEventListener('submit', function (e) {
        e.preventDefault();

        const nameInput = document.getElementById('adminNewStudentName').value.trim();
        const tingkatanInput = document.getElementById('adminNewStudentTingkatan').value;
        const kelasInput = document.getElementById('adminNewStudentKelas').value;
        const pointsInput = parseInt(document.getElementById('adminNewStudentPoints').value) || 0;
        const photoFile = document.getElementById('adminNewStudentPhoto').files[0];

        if (!nameInput) {
            alert('Sila masukkan nama pelajar!');
            return;
        }

        const saveStudentObj = (photoDataUrl) => {
            const newStudent = {
                id: 'STU-' + Date.now(),
                name: nameInput,
                tingkatan: tingkatanInput,
                kelas: kelasInput,
                points: pointsInput,
                photo: photoDataUrl || 'assets/default-avatar.png',
                history: []
            };

            students.push(newStudent);
            saveData();

            alert(`✅ Pelajar ${nameInput} berjaya didaftarkan!`);
            formAddStudent.reset();
            renderAdminStudentList();
            renderStudentLoginList();
        };

        if (photoFile) {
            const reader = new FileReader();
            reader.onload = function (evt) { saveStudentObj(evt.target.result); };
            reader.readAsDataURL(photoFile);
        } else {
            saveStudentObj(null);
        }
    });

    function renderAdminStudentList() {
        const listContainer = document.getElementById('adminStudentManageList');
        if (!listContainer) return;
        listContainer.innerHTML = '';

        students.forEach((stu, index) => {
            listContainer.innerHTML += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px; border-bottom: 1px solid rgba(255,255,255,0.1); font-size: 0.85rem;">
                    <div>
                        <strong style="color: #fff;">${stu.name}</strong> (${stu.tingkatan} - ${stu.kelas})
                        <br><small style="color: var(--neon-green);">${stu.points} Mata</small>
                    </div>
                    <button type="button" onclick="deleteStudent(${index})" style="background: #ef4444; color: #fff; border: none; padding: 2px 8px; border-radius: 4px; cursor: pointer;">Padam</button>
                </div>
            `;
        });
    }

    window.deleteStudent = function (index) {
        if (confirm('Padam pelajar ini?')) {
            students.splice(index, 1);
            saveData();
            renderAdminStudentList();
            renderStudentLoginList();
        }
    };

    // --- B. URUS BARKOD ---
    document.getElementById('formAddBarcode')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const code = document.getElementById('adminNewBarcodeCode').value.trim();
        const category = document.getElementById('adminNewBarcodeCategory').value;
        const points = parseInt(document.getElementById('adminNewBarcodePoints').value) || 10;

        if (barcodes.some(b => b.code.toUpperCase() === code.toUpperCase())) {
            alert('⚠️ Kod Barkod ini sudah wujud!');
            return;
        }

        barcodes.push({ code, category, points, used: false });
        saveData();
        alert('✅ Barkod berjaya ditambah!');
        document.getElementById('formAddBarcode').reset();
        renderAdminBarcodeList();
    });

    function renderAdminBarcodeList() {
        const container = document.getElementById('adminBarcodeList');
        if (!container) return;
        container.innerHTML = '';

        barcodes.forEach((b, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.1);';
            itemDiv.innerHTML = `
                <div>
                    <strong style="color: var(--bright-cyan);">${b.code}</strong> (${b.category})
                    <br><small style="color: #aaa;">Mata: ${b.points} | Status: ${b.used ? 'Telah Guna' : 'Aktif'}</small>
                </div>
                <div style="display: flex; gap: 4px;">
                    <button type="button" onclick="editBarcode(${index})" style="background: #f59e0b; color: #fff; border: none; padding: 3px 8px; border-radius: 4px; cursor: pointer;">Edit Mata</button>
                    <button type="button" onclick="deleteBarcode(${index})" style="background: #ef4444; color: #fff; border: none; padding: 3px 8px; border-radius: 4px; cursor: pointer;">Padam</button>
                </div>
            `;
            container.appendChild(itemDiv);
        });
    }

    window.editBarcode = function (index) {
        const item = barcodes[index];
        const newPoints = prompt(`Masukkan nilai mata ganjaran baharu bagi ${item.code}:`, item.points);
        if (newPoints !== null && !isNaN(newPoints) && newPoints !== '') {
            barcodes[index].points = parseInt(newPoints);
            saveData();
            renderAdminBarcodeList();
        }
    };

    window.deleteBarcode = function (index) {
        if (confirm(`Adakah anda pasti untuk memadam barkod ${barcodes[index].code}?`)) {
            barcodes.splice(index, 1);
            saveData();
            renderAdminBarcodeList();
        }
    };

    // --- C. URUS GANJARAN ---
    const formAddReward = document.getElementById('formAddReward');
    formAddReward?.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('adminNewRewardName')?.value.trim();
        const points = parseInt(document.getElementById('adminNewRewardPoints')?.value) || 50;

        if (!name) {
            alert('Sila masukkan nama barang ganjaran!');
            return;
        }

        rewards.push({
            id: 'REW-' + Date.now(),
            name: name,
            points: points,
            image: 'assets/default-reward.png'
        });

        saveData();
        alert('✅ Ganjaran baharu berjaya ditambah!');
        formAddReward.reset();
        renderAdminRewardsList();
    });

    function renderAdminRewardsList() {
        const container = document.getElementById('adminRewardsList');
        if (!container) return;
        container.innerHTML = '';

        rewards.forEach((r, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.1);';
            itemDiv.innerHTML = `
                <div>
                    <strong style="color: #fff;">${r.name}</strong>
                    <br><small style="color: var(--neon-green);">${r.points} Mata diperlukan</small>
                </div>
                <div style="display: flex; gap: 4px;">
                    <button type="button" onclick="editReward(${index})" style="background: #f59e0b; color: #fff; border: none; padding: 3px 8px; border-radius: 4px; cursor: pointer;">Edit</button>
                    <button type="button" onclick="deleteReward(${index})" style="background: #ef4444; color: #fff; border: none; padding: 3px 8px; border-radius: 4px; cursor: pointer;">Padam</button>
                </div>
            `;
            container.appendChild(itemDiv);
        });
    }

    window.editReward = function (index) {
        const r = rewards[index];
        const newName = prompt("Kemaskini Nama Ganjaran:", r.name);
        if (!newName) return;
        const newPoints = prompt("Kemaskini Mata Diperlukan:", r.points);

        if (newPoints !== null && !isNaN(newPoints) && newPoints !== '') {
            rewards[index].name = newName.trim();
            rewards[index].points = parseInt(newPoints);
            saveData();
            renderAdminRewardsList();
        }
    };

    window.deleteReward = function (index) {
        if (confirm(`Adakah anda pasti untuk memadam ganjaran "${rewards[index].name}"?`)) {
            rewards.splice(index, 1);
            saveData();
            renderAdminRewardsList();
        }
    };

    // --- D. SIMPAN & URUS VIDEO PROMOSI ---
    function setupVideoUploadTab() {
        const tabVideo = document.getElementById('tab-video');
        if (!tabVideo) return;

        let formVideo = document.getElementById('formAdminVideoUpload');
        if (formVideo && !document.getElementById('btnSaveAdminVideo')) {
            const saveBtn = document.createElement('button');
            saveBtn.type = 'submit';
            saveBtn.id = 'btnSaveAdminVideo';
            saveBtn.className = 'btn-primary-neon';
            saveBtn.style.cssText = 'margin-top: 10px; width: 100%; font-size: 1rem; padding: 12px; cursor: pointer;';
            saveBtn.innerHTML = '💾 SIMPAN VIDEO PROMOSI';
            formVideo.appendChild(saveBtn);

            formVideo.addEventListener('submit', async (e) => {
                e.preventDefault();
                const fileInput = document.getElementById('adminVideoFileInput');
                const file = fileInput?.files[0];

                if (!file) {
                    alert('⚠️ Sila pilih fail video dari peranti anda!');
                    return;
                }

                // Simpan fail video bersaiz besar ke IndexedDB
                const isSavedDB = await saveVideoToDB(file);

                if (!isSavedDB) {
                    // Fallback jika DB gagal
                    const reader = new FileReader();
                    reader.onload = function (evt) {
                        try {
                            localStorage.setItem('eco_promo_video', evt.target.result);
                            loadPromoVideo();
                            alert('🎉 Video Promosi Berjaya Disimpan!');
                        } catch (err) {
                            alert('❌ Fail video terlalu besar. Sila guna fail di bawah 5MB.');
                        }
                    };
                    reader.readAsDataURL(file);
                } else {
                    await loadPromoVideo();
                    alert('🎉 Video Promosi Berjaya Disimpan & Dimainkan Secara Autoplay di Skrin Utama!');
                }
            });
        }
    }

    // Reset Pangkalan Data
    document.getElementById('btnResetDatabase')?.addEventListener('click', () => {
        if (confirm('⚠️ Adakah anda pasti ingin memadam SEMUA data dan reset semula?')) {
            localStorage.clear();
            indexedDB.deleteDatabase('EcoVideoDB');
            location.reload();
        }
    });

    // ==========================================
    // 8. PUSAT PENEBUSAN GANJARAN PELAJAR (LENGKAP)
    // ==========================================
    function populateRedeemDropdowns() {
        const tSel = document.getElementById('selectRedeemTingkatan');
        const kSel = document.getElementById('selectRedeemKelas');

        if (tSel) {
            tSel.innerHTML = '<option value="">-- Semua Tingkatan --</option>';
            listTingkatan.forEach(t => tSel.innerHTML += `<option value="${t}">${t}</option>`);
        }
        if (kSel) {
            kSel.innerHTML = '<option value="">-- Semua Kelas --</option>';
            listKelas.forEach(k => kSel.innerHTML += `<option value="${k}">${k}</option>`);
        }
        updateRedeemStudentList();
    }

    function updateRedeemStudentList() {
        const tVal = document.getElementById('selectRedeemTingkatan')?.value;
        const kVal = document.getElementById('selectRedeemKelas')?.value;
        const sSel = document.getElementById('selectRedeemStudent');

        if (!sSel) return;
        sSel.innerHTML = '<option value="">-- Pilih Nama Pelajar --</option>';

        let filtered = students.filter(s => (!tVal || s.tingkatan === tVal) && (!kVal || s.kelas === kVal));
        filtered.forEach(s => {
            sSel.innerHTML += `<option value="${s.id}">${s.name} (${s.tingkatan})</option>`;
        });
    }

    document.getElementById('selectRedeemTingkatan')?.addEventListener('change', updateRedeemStudentList);
    document.getElementById('selectRedeemKelas')?.addEventListener('change', updateRedeemStudentList);

    document.getElementById('selectRedeemStudent')?.addEventListener('change', (e) => {
        const sId = e.target.value;
        const student = students.find(s => s.id === sId);
        const section = document.getElementById('redeemDashboardSection');

        if (student) {
            if (section) section.style.display = 'block';
            document.getElementById('redeemStudentName').innerText = student.name;
            document.getElementById('redeemStudentClass').innerText = `${student.tingkatan} • ${student.kelas}`;
            document.getElementById('redeemStudentPoints').innerText = student.points;
            renderRedeemRewardsList(student);
        } else {
            if (section) section.style.display = 'none';
        }
    });

    function renderRedeemRewardsList(student) {
        const container = document.getElementById('redeemAvailableRewardsList');
        if (!container) return;
        container.innerHTML = '';

        if (rewards.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted);">Tiada ganjaran tersedia buat masa ini.</p>';
            return;
        }

        rewards.forEach(r => {
            const canAfford = student.points >= r.points;
            const rewardCard = document.createElement('div');
            rewardCard.style.cssText = `
                background: rgba(15,23,42,0.6);
                border: 1px solid ${canAfford ? 'var(--neon-green)' : 'rgba(255,255,255,0.1)'};
                padding: 12px;
                border-radius: 8px;
                margin-bottom: 10px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;

            rewardCard.innerHTML = `
                <div>
                    <strong style="color: #fff; font-size: 1rem;">${r.name}</strong>
                    <br><small style="color: ${canAfford ? 'var(--neon-green)' : '#ef4444'};">${r.points} Mata Required</small>
                </div>
                <button type="button" 
                    ${!canAfford ? 'disabled' : ''} 
                    style="
                        background: ${canAfford ? 'var(--neon-green)' : '#475569'};
                        color: ${canAfford ? '#000' : '#aaa'};
                        border: none;
                        padding: 8px 16px;
                        border-radius: 6px;
                        font-weight: bold;
                        cursor: ${canAfford ? 'pointer' : 'not-allowed'};
                    ">
                    ${canAfford ? 'TEBUS' : 'Mata Tak Cukup'}
                </button>
            `;

            rewardCard.querySelector('button')?.addEventListener('click', () => {
                if (confirm(`Adakah anda pasti mahu menebus "${r.name}" dengan ${r.points} mata?`)) {
                    student.points -= r.points;
                    if (!student.history) student.history = [];
                    student.history.unshift({
                        category: `Tebus: ${r.name}`,
                        points: -r.points,
                        date: new Date().toLocaleDateString()
                    });

                    saveData();

                    // Kemaskini Paparan Antaramuka
                    document.getElementById('redeemStudentPoints').innerText = student.points;
                    alert(`🎉 Berjaya menebus ${r.name}! Sisa mata anda: ${student.points}`);
                    renderRedeemRewardsList(student);
                }
            });

            container.appendChild(rewardCard);
        });
    }

});