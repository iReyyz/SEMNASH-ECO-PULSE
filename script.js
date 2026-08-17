// GLOBAL BLUETOOTH DECLARATIONS & CONSTANTS
window.BT_SERVICE_UUID = '0000ffe0-0000-1000-8000-00805f9b34fb';
window.BT_CHARACTERISTIC_UUID = '0000ffe1-0000-1000-8000-00805f9b34fb';

var BT_SERVICE_UUID = window.BT_SERVICE_UUID;
var BT_CHARACTERISTIC_UUID = window.BT_CHARACTERISTIC_UUID;
var bluetoothDevice = null;
var bluetoothGattServer = null;
var bluetoothCharacteristic = null;
var isBluetoothSimulated = false;

window.connectBluetoothDevice = async function (e) {
    if (e && e.preventDefault) e.preventDefault();

    const bluetoothStatusText = document.getElementById('bluetoothStatusText');
    const bluetoothStatusDot = document.getElementById('bluetoothStatusDot');

    function updateBluetoothUI(connected, deviceName = '', simulated = false) {
        if (bluetoothStatusDot) {
            bluetoothStatusDot.style.background = connected ? "#10b981" : (simulated ? "#38bdf8" : "#ef4444");
        }
        if (bluetoothStatusText) {
            bluetoothStatusText.innerText = connected
                ? `Terhubung: ${deviceName}`
                : (simulated ? `Simulasi: ESP32/Arduino` : "Bluetooth (Terputus)");
        }
    }

    if (!navigator || !navigator.bluetooth) {
        const enableSim = confirm('⚠️ Web Bluetooth API disekat atau tidak disokong pada protokol fail tempatan (file://).\n\n*Nota: Web Bluetooth memerlukan pelayar Google Chrome pada HTTPS atau http://localhost:8080.\n\nAdakah anda mahu mengaktifkan MOD SIMULASI BLUETOOTH untuk menguji sistem sekarang?');
        if (enableSim) {
            isBluetoothSimulated = true;
            updateBluetoothUI(true, "ESP32 (Simulasi)", true);
            alert("✅ Mod Simulasi Bluetooth telah diaktifkan! Isyarat buka tong sampah akan diproses secara automatik.");
        }
        return;
    }

    try {
        if (bluetoothStatusText) bluetoothStatusText.innerText = "Mencari Peranti...";

        bluetoothDevice = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: [
                BT_SERVICE_UUID,
                '00001101-0000-1000-8000-00805f9b34fb',
                '0000ffe0-0000-1000-8000-00805f9b34fb',
                '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
                '4fae1000-1c6d-4354-8e8a-0cc7048a3d2e'
            ]
        });

        if (!bluetoothDevice) {
            updateBluetoothUI(false);
            return;
        }

        bluetoothDevice.addEventListener('gattserverdisconnected', () => {
            console.log("Sambungan Bluetooth terputus.");
            bluetoothGattServer = null;
            bluetoothCharacteristic = null;
            updateBluetoothUI(false);
        });

        if (bluetoothStatusText) bluetoothStatusText.innerText = "Menyambung...";
        bluetoothGattServer = await bluetoothDevice.gatt.connect();

        try {
            const service = await bluetoothGattServer.getPrimaryService(BT_SERVICE_UUID);
            bluetoothCharacteristic = await service.getCharacteristic(BT_CHARACTERISTIC_UUID);
        } catch (serviceErr) {
            console.warn("Primary BLE Service tidak dijumpai, mencuba perkhidmatan BLE tersedia:", serviceErr);
            const services = await bluetoothGattServer.getPrimaryServices();
            if (services.length > 0) {
                const characteristics = await services[0].getCharacteristics();
                if (characteristics.length > 0) {
                    bluetoothCharacteristic = characteristics[0];
                }
            }
        }

        const devName = bluetoothDevice.name || 'ESP32 / Arduino';
        isBluetoothSimulated = false;
        updateBluetoothUI(true, devName);
        alert(`✅ Berjaya disambungkan ke peranti ESP32 / Arduino: ${devName}`);

    } catch (err) {
        console.error("Ralat Sambungan Bluetooth:", err);

        if (err && (err.name === 'SecurityError' || err.name === 'NotSupportedError' || String(err).includes('blocked') || String(err).includes('Security'))) {
            const enableSim = confirm('⚠️ Polisi Keselamatan Chrome: Web Bluetooth disekat apabila fail dibuka terus dari komputer (file://).\n\nSila jalankan server tempatan (http://localhost:8080) atau tekan OK untuk mengaktifkan MOD SIMULASI BLUETOOTH.');
            if (enableSim) {
                isBluetoothSimulated = true;
                updateBluetoothUI(true, "ESP32 (Simulasi)", true);
                alert("✅ Mod Simulasi Bluetooth telah diaktifkan!");
                return;
            }
        }

        updateBluetoothUI(false);
        if (err && err.name !== 'NotFoundError') {
            alert("❌ Sambungan Bluetooth dibatalkan atau gagal disambungkan.");
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 1. DATA PANGKALAN DATA (LOCALSTORAGE & INDEXEDDB)
    // ==========================================
    const listTingkatan = ["Tingkatan 1", "Tingkatan 2", "Tingkatan 3", "Tingkatan 4", "Tingkatan 5"];
    const listKelas = ["Is", "It", "Iq", "Ik", "Im", "Ia", "Ir", "In"];

    const defaultStudents = [
        { id: "STU-001", name: "Ahmad Albab", tingkatan: "Tingkatan 1", kelas: "Is", points: 120, history: [] },
        { id: "STU-002", name: "Siti Nurhaliza", tingkatan: "Tingkatan 2", kelas: "It", points: 85, history: [] }
    ];

    const defaultBarcodes = [
        { code: "A0001", category: "Botol Plastik (A0001)", points: 10, used: false },
        { code: "ECO-1001", category: "Botol Plastik", points: 10, used: false },
        { code: "ECO-1002", category: "Tin Aluminium", points: 15, used: false },
        { code: "ECO-1003", category: "Kertas / Kotak", points: 5, used: false }
    ];

    const defaultRewards = [
        { id: "REW-1", name: "Buku Nota Eco", points: 50, stock: 15, image: "assets/default-reward.png" },
        { id: "REW-2", name: "Pensel Kayu Kitar Semula", points: 20, stock: 20, image: "assets/default-reward.png" }
    ];

    let students = JSON.parse(localStorage.getItem('ecoPulseStudents')) || JSON.parse(localStorage.getItem('eco_students')) || defaultStudents;
    let barcodes = JSON.parse(localStorage.getItem('eco_barcodes')) || JSON.parse(localStorage.getItem('ecoPulseBarcodes')) || defaultBarcodes;
    let rewards = JSON.parse(localStorage.getItem('eco_rewards')) || defaultRewards;
    let currentObjectUrl = null;

    function getLatestBarcodes() {
        const data = localStorage.getItem('eco_barcodes') || localStorage.getItem('ecoPulseBarcodes');
        if (data) {
            try {
                const parsed = JSON.parse(data);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    barcodes = parsed;
                    return barcodes;
                }
            } catch (e) { }
        }
        return barcodes || defaultBarcodes;
    }

    window.getLatestBarcodes = getLatestBarcodes;
    window.loadBarcodesFromStorage = getLatestBarcodes;

    window.syncGlobalBarcodes = function (newBarcodes) {
        if (Array.isArray(newBarcodes)) {
            barcodes = newBarcodes;
        } else {
            getLatestBarcodes();
        }
        localStorage.setItem('eco_barcodes', JSON.stringify(barcodes));
        localStorage.setItem('ecoPulseBarcodes', JSON.stringify(barcodes));
    };

    // Fungsi Simpan Data Secara Kekal
    function saveData() {
        getLatestBarcodes();

        let latestStudents = [];
        if (typeof loadStudentsFromStorage === 'function') {
            latestStudents = loadStudentsFromStorage();
        } else {
            const data = localStorage.getItem('ecoPulseStudents') || localStorage.getItem('eco_students');
            if (data) {
                try {
                    const parsed = JSON.parse(data);
                    if (Array.isArray(parsed) && parsed.length > 0) latestStudents = parsed;
                } catch (e) { }
            }
            if (latestStudents.length === 0) latestStudents = students;
        }

        students = latestStudents;
        localStorage.setItem('eco_students', JSON.stringify(students));
        localStorage.setItem('ecoPulseStudents', JSON.stringify(students));
        localStorage.setItem('eco_barcodes', JSON.stringify(barcodes));
        localStorage.setItem('ecoPulseBarcodes', JSON.stringify(barcodes));
        localStorage.setItem('eco_rewards', JSON.stringify(rewards));

        try { renderAdminRewardsList(); } catch (e) { }
        try { renderAdminStudentList(); } catch (e) { }
        try { renderAdminBarcodeList(); } catch (e) { }
        try { renderStudentLoginList(); } catch (e) { }
        try { updateRedeemStudentList(); } catch (e) { }

        if (typeof window.renderStudentsDynamic === 'function') {
            try { window.renderStudentsDynamic(); } catch (e) { }
        }
        if (typeof window.renderActiveBarcodesGuide === 'function') {
            try { window.renderActiveBarcodesGuide(); } catch (e) { }
        }

        if (currentStudent) {
            try { renderRedeemRewardsList(currentStudent); } catch (e) { }
        }
    }

    // --- Pengurusan Video Menggunakan IndexedDB ---
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
            return new Promise((resolve, reject) => {
                const tx = db.transaction('videos', 'readwrite');
                const store = tx.objectStore('videos');
                store.put(file, 'promo_video');
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => reject(false);
            });
        } catch (e) {
            console.warn("Gagal simpan ke IndexedDB", e);
            return false;
        }
    }

    async function getVideoFromDB() {
        try {
            const db = await openVideoDB();
            return new Promise((resolve) => {
                const tx = db.transaction('videos', 'readonly');
                const store = tx.objectStore('videos');
                const request = store.get('promo_video');
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => resolve(null);
            });
        } catch (e) {
            return null;
        }
    }

    // ==========================================
    // 2. NAVIGASI SKRIN & PROMO VIDEO
    // ==========================================
    window.navigateToScreen = function (screenId) {
        if (screenId !== 'screen-4') {
            if (typeof stopCamera === 'function') {
                try { stopCamera(); } catch (e) { }
            }
        }

        document.querySelectorAll('.screen').forEach(s => {
            s.classList.remove('active');
            s.style.display = 'none';
        });

        const target = document.getElementById(screenId);
        if (target) {
            target.classList.add('active');
            target.style.display = 'flex';
        }

        if (screenId === 'screen-1') {
            if (typeof loadPromoVideo === 'function') {
                try { loadPromoVideo(); } catch (e) { }
            }
        }

        if (typeof window.syncAllStudentViews === 'function') {
            try { window.syncAllStudentViews(); } catch (e) { }
        }
    };

    function showScreen(screenId) {
        if (typeof window.navigateToScreen === 'function') {
            window.navigateToScreen(screenId);
        } else if (typeof window.showScreen === 'function' && window.showScreen !== showScreen) {
            window.showScreen(screenId);
        } else {
            const screens = document.querySelectorAll('.screen');
            screens.forEach(s => {
                s.classList.remove('active');
                s.style.display = 'none';
            });
            const target = document.getElementById(screenId);
            if (target) {
                target.classList.add('active');
                target.style.display = 'flex';
            }
        }
    }
    window.showScreen = showScreen;

    window.handleStartApp = function (e) {
        if (e && e.preventDefault) e.preventDefault();
        showScreen('screen-2');
    };

    window.handleGoToRedeemDirect = function (e) {
        if (e && e.preventDefault) e.preventDefault();
        showScreen('screen-7');
    };

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
                playPromise.catch(() => {
                    console.log("Autoplay dihalang oleh penyemak imbas.");
                });
            }
        }
    }

    // Navigasi Butang Utama
    document.getElementById('btnStartApp')?.addEventListener('click', (e) => {
        window.handleStartApp(e);
    });

    document.getElementById('btnGoToRedeemDirect')?.addEventListener('click', (e) => {
        window.handleGoToRedeemDirect(e);
    });

    const btnRedeemFromDash = document.getElementById('btnGoToRedeemFromDashboard') || document.querySelector('.btn-redeem-dashboard');
    btnRedeemFromDash?.addEventListener('click', () => {
        populateRedeemDropdowns();
        showScreen('screen-7');

        if (currentStudent) {
            const selectRedeemTingkatan = document.getElementById('selectRedeemTingkatan');
            const selectRedeemKelas = document.getElementById('selectRedeemKelas');
            const selectRedeemStudent = document.getElementById('selectRedeemStudent');

            if (selectRedeemTingkatan) selectRedeemTingkatan.value = currentStudent.tingkatan;
            if (selectRedeemKelas) selectRedeemKelas.value = currentStudent.kelas;
            updateRedeemStudentList();
            if (selectRedeemStudent) {
                selectRedeemStudent.value = currentStudent.id;
                selectRedeemStudent.dispatchEvent(new Event('change'));
            }
        }
    });

    document.getElementById('btnBackToPromo')?.addEventListener('click', () => showScreen('screen-1'));
    document.getElementById('btnBackToDashboard')?.addEventListener('click', () => showScreen('screen-3'));
    document.getElementById('btnBackFromRedeem')?.addEventListener('click', () => {
        if (currentStudent) {
            showScreen('screen-3');
        } else {
            showScreen('screen-1');
        }
    });

    // ==========================================
    // PENGENDALIAN BUTANG "MASUK KE SISTEM" (DIBAIKI)
    // ==========================================
    function handleEnterSystem() {
        students = JSON.parse(localStorage.getItem('eco_students')) || students;

        // 1. Semak jika pembolehubah sudah ada nilai
        let targetStudent = selectedStudentToLogin;

        // 2. Semak jika ada atribut data-selected dalam DOM
        if (!targetStudent) {
            const activeCard = document.querySelector('.student-select-card[data-selected="true"]') || document.querySelector('.student-select-card.selected');
            if (activeCard) {
                const stuId = activeCard.getAttribute('data-id');
                targetStudent = students.find(s => String(s.id) === String(stuId));
            }
        }

        // 3. Fallback jika masih belum jumpa
        if (!targetStudent && currentStudent) {
            targetStudent = currentStudent;
        }

        if (targetStudent) {
            selectStudentAndEnterDashboard(targetStudent);
        } else {
            alert('⚠️ Sila pilih nama pelajar terlebih dahulu daripada senarai!');
        }
    }

    // Mengikat fungsi ke semua butang masuk
    const enterButtons = document.querySelectorAll('#btnEnterDashboard, .btn-enter-system');
    enterButtons.forEach(btn => {
        btn.onclick = handleEnterSystem;
    });

    document.addEventListener('click', (e) => {
        if (e.target && (e.target.id === 'btnEnterDashboard' || e.target.classList.contains('btn-enter-system') || e.target.innerText.includes('MASUK KE SISTEM'))) {
            handleEnterSystem();
        }
    });

    // ==========================================
    // 3. KAMERA & IMBAS BARKOD (SCREEN 4)
    // ==========================================
    document.getElementById('btnGoToScan')?.addEventListener('click', () => {
        showScreen('screen-4');
        startCamera();
    });

    let zxingCodeReader = null;
    let currentFacingMode = "environment"; // "environment" (kamera belakang) atau "user" (kamera depan)

    async function startCamera() {
        const video = document.getElementById('scannerVideo');
        if (!video) return;

        video.muted = true;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('autoplay', 'true');

        if (typeof stopCamera === 'function') {
            try { stopCamera(); } catch (e) { }
        }

        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { exact: currentFacingMode }, width: { ideal: 1280 }, height: { ideal: 720 } }
            });
            video.srcObject = cameraStream;
            await video.play();
            initBarcodeScanner(video);
        } catch (err) {
            try {
                cameraStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: currentFacingMode, width: { ideal: 1280 }, height: { ideal: 720 } }
                });
                video.srcObject = cameraStream;
                await video.play();
                initBarcodeScanner(video);
            } catch (error) {
                try {
                    cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
                    video.srcObject = cameraStream;
                    await video.play();
                    initBarcodeScanner(video);
                } catch (err3) {
                    console.error("Camera access error:", err3);
                    const ocrStatusBadge = document.getElementById('ocrStatusBadge');
                    if (ocrStatusBadge) {
                        ocrStatusBadge.style.display = 'block';
                        ocrStatusBadge.style.borderColor = '#ef4444';
                        ocrStatusBadge.style.color = '#ef4444';
                        ocrStatusBadge.textContent = '⚠️ Sila pastikan pelayar peranti anda memberi kebenaran penggunaan kamera.';
                    }
                }
            }
        }
    }

    async function switchCamera() {
        currentFacingMode = (currentFacingMode === "environment") ? "user" : "environment";
        const ocrStatusBadge = document.getElementById('ocrStatusBadge');
        if (ocrStatusBadge) {
            ocrStatusBadge.style.display = 'block';
            ocrStatusBadge.style.borderColor = '#f59e0b';
            ocrStatusBadge.style.color = '#f59e0b';
            ocrStatusBadge.textContent = `🔄 Menukar ke Kamera ${currentFacingMode === 'user' ? 'Depan' : 'Belakang'}...`;
        }
        await startCamera();
    }

    window.startCamera = startCamera;
    window.switchCamera = switchCamera;

    function initBarcodeScanner(videoElement) {
        let isScanningActive = true;
        let isOcrProcessing = false;
        let lastOcrTime = 0;

        let scanCanvas = document.getElementById('scanCanvasHidden');
        if (!scanCanvas) {
            scanCanvas = document.createElement('canvas');
            scanCanvas.id = 'scanCanvasHidden';
            scanCanvas.style.display = 'none';
            document.body.appendChild(scanCanvas);
        }
        const ctx = scanCanvas.getContext('2d', { willReadFrequently: true });

        if (window.ZXing && typeof window.ZXing.BrowserMultiFormatReader === 'function') {
            try {
                if (!zxingCodeReader) {
                    const hints = new Map();
                    if (window.ZXing.DecodeHintType && window.ZXing.BarcodeFormat) {
                        hints.set(window.ZXing.DecodeHintType.POSSIBLE_FORMATS, [
                            window.ZXing.BarcodeFormat.CODE_128,
                            window.ZXing.BarcodeFormat.CODE_39,
                            window.ZXing.BarcodeFormat.EAN_13,
                            window.ZXing.BarcodeFormat.EAN_8,
                            window.ZXing.BarcodeFormat.UPC_A,
                            window.ZXing.BarcodeFormat.UPC_E,
                            window.ZXing.BarcodeFormat.ITF,
                            window.ZXing.BarcodeFormat.CODABAR,
                            window.ZXing.BarcodeFormat.QR_CODE
                        ].filter(Boolean));
                    }
                    zxingCodeReader = new window.ZXing.BrowserMultiFormatReader(hints);
                }
            } catch (e) {
                try {
                    zxingCodeReader = new window.ZXing.BrowserMultiFormatReader();
                } catch (err) { }
            }
        }

        if ('BarcodeDetector' in window && !barcodeDetector) {
            try {
                barcodeDetector = new BarcodeDetector({
                    formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'qr_code', 'upc_a', 'upc_e', 'codabar', 'data_matrix', 'itf']
                });
            } catch (e) { }
        }

        const ocrStatusBadge = document.getElementById('ocrStatusBadge');
        if (ocrStatusBadge) {
            ocrStatusBadge.style.display = 'block';
            ocrStatusBadge.style.borderColor = 'var(--neon-green)';
            ocrStatusBadge.style.color = 'var(--neon-green)';
            ocrStatusBadge.textContent = '🟢 Imbasan Aktif — Sila halakan ke barkod / tulisan A0001';
        }

        // Pra-pemprosesan Imej Kanvas (Full Canvas ROI + Adaptive High Contrast Binarization)
        function preprocessOcrCanvas(sourceCanvas) {
            let ocrCanvas = document.getElementById('ocrCanvasHidden');
            if (!ocrCanvas) {
                ocrCanvas = document.createElement('canvas');
                ocrCanvas.id = 'ocrCanvasHidden';
                ocrCanvas.style.display = 'none';
                document.body.appendChild(ocrCanvas);
            }

            const sw = sourceCanvas.width || 640;
            const sh = sourceCanvas.height || 480;

            ocrCanvas.width = sw;
            ocrCanvas.height = sh;
            const ocrCtx = ocrCanvas.getContext('2d');

            ocrCtx.drawImage(sourceCanvas, 0, 0, sw, sh);

            const imgData = ocrCtx.getImageData(0, 0, sw, sh);
            const data = imgData.data;
            for (let i = 0; i < data.length; i += 4) {
                const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                const v = avg > 130 ? 255 : 0;
                data[i] = v;
                data[i + 1] = v;
                data[i + 2] = v;
            }
            ocrCtx.putImageData(imgData, 0, 0);
            return ocrCanvas;
        }

        // Pengesan Tulisan & Nombor Kamera (Tesseract.js OCR)
        async function runTextAndNumberOcr(sourceCanvas) {
            if (!window.Tesseract || isOcrProcessing || !isScanningActive) return;
            const now = Date.now();
            if (now - lastOcrTime < 400) return;
            lastOcrTime = now;
            isOcrProcessing = true;

            const ocrStatusBadge = document.getElementById('ocrStatusBadge');

            try {
                const processedCanvas = preprocessOcrCanvas(sourceCanvas);
                const result = await window.Tesseract.recognize(processedCanvas, 'eng');

                if (result && result.data && result.data.text && isScanningActive) {
                    const rawText = result.data.text.trim().toUpperCase();
                    const cleanTextLine = rawText.replace(/[\r\n]+/g, ' ').trim();

                    if (cleanTextLine.length >= 2) {
                        console.log("📷 OCR Dikesan Tulisan/Nombor:", cleanTextLine);

                        if (ocrStatusBadge) {
                            ocrStatusBadge.style.display = 'block';
                            ocrStatusBadge.style.borderColor = '#38bdf8';
                            ocrStatusBadge.style.color = '#38bdf8';
                            ocrStatusBadge.textContent = `🔍 Dikesan: ${cleanTextLine.slice(0, 25)}`;
                        }

                        getLatestBarcodes();

                        // Padanan 1: Semak kod sedia ada (cth: A0001, ECO-1001, 1001)
                        let matched = barcodes.find(b => {
                            const bCode = extractCodeFromItem(b).toUpperCase();
                            const bAlpha = bCode.replace(/[^A-Z0-9]/g, '');
                            const textAlpha = cleanTextLine.replace(/[^A-Z0-9]/g, '');
                            return bCode && (cleanTextLine.includes(bCode) ||
                                bCode.includes(cleanTextLine) ||
                                (bAlpha.length >= 2 && textAlpha.includes(bAlpha)));
                        });

                        // Padanan 2: Semak token alfanumerik (cth: "A0001", "ECO1001", "1001")
                        if (!matched) {
                            const tokensFound = cleanTextLine.match(/\b[A-Z0-9]{2,}\b/gi);
                            if (tokensFound) {
                                for (const token of tokensFound) {
                                    const cleanToken = token.trim().toUpperCase();
                                    matched = barcodes.find(b => {
                                        const bCode = extractCodeFromItem(b).toUpperCase();
                                        const bAlpha = bCode.replace(/[^A-Z0-9]/g, '');
                                        return bCode === cleanToken || bAlpha === cleanToken || bCode.includes(cleanToken) || cleanToken.includes(bCode);
                                    });
                                    if (matched) break;
                                }
                            }
                        }

                        // Padanan 3: Semak kata kunci kategori (cth: BOTOL, TIN, KERTAS)
                        if (!matched) {
                            matched = barcodes.find(b => {
                                const cat = extractCategoryFromItem(b).toUpperCase();
                                return cat && (cleanTextLine.includes(cat) || cat.includes(cleanTextLine));
                            });
                        }

                        if (matched && isScanningActive) {
                            isScanningActive = false;
                            if (ocrStatusBadge) {
                                ocrStatusBadge.style.borderColor = 'var(--neon-green)';
                                ocrStatusBadge.style.color = 'var(--neon-green)';
                                ocrStatusBadge.textContent = `✅ Padanan Ditemui: ${matched.code}`;
                            }
                            console.log("✅ OCR Code Matched:", matched.code);
                            processBarcode(matched.code);
                            return;
                        }
                    }
                }
            } catch (err) {
                console.warn("OCR Recognition Warning:", err);
            } finally {
                isOcrProcessing = false;
            }
        }

        const detectFrame = async () => {
            if (!cameraStream || !isScanningActive) return;

            if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
                const w = videoElement.videoWidth || 640;
                const h = videoElement.videoHeight || 480;
                scanCanvas.width = w;
                scanCanvas.height = h;
                ctx.drawImage(videoElement, 0, 0, w, h);

                // 1. Native BarcodeDetector (GPU/Browser Native Engine)
                if (barcodeDetector && isScanningActive) {
                    try {
                        const barcodesFound = await barcodeDetector.detect(scanCanvas);
                        if (barcodesFound.length > 0 && isScanningActive) {
                            isScanningActive = false;
                            const code = barcodesFound[0].rawValue;
                            console.log("BarcodeDetector Native Code:", code);
                            processBarcode(code);
                            return;
                        }
                    } catch (e) { }
                }

                // 2. ZXing Library Engine (Decodes 1D/2D Barcodes & QR)
                if (zxingCodeReader && isScanningActive) {
                    try {
                        let result = null;
                        if (typeof zxingCodeReader.decodeFromVideoElement === 'function') {
                            try { result = await zxingCodeReader.decodeFromVideoElement(videoElement); } catch (e) { }
                        }
                        if (!result && typeof zxingCodeReader.decodeFromCanvas === 'function') {
                            try { result = await zxingCodeReader.decodeFromCanvas(scanCanvas); } catch (e) { }
                        }
                        if (!result && typeof zxingCodeReader.decodeFromImageElement === 'function') {
                            try {
                                const img = new Image();
                                img.src = scanCanvas.toDataURL('image/png');
                                result = await zxingCodeReader.decodeFromImageElement(img);
                            } catch (e) { }
                        }

                        if (result && result.getText && result.getText() && isScanningActive) {
                            isScanningActive = false;
                            const code = result.getText();
                            console.log("✅ ZXing Code Matched:", code);
                            processBarcode(code);
                            return;
                        }
                    } catch (e) { }
                }

                // 3. High-Speed OCR Engine (Pengecam Tulisan Teks & Nombor)
                runTextAndNumberOcr(scanCanvas);
            }

            if (isScanningActive) {
                scanAnimationFrame = requestAnimationFrame(detectFrame);
            }
        };

        detectFrame();
    }

    function stopCamera() {
        if (scanAnimationFrame) {
            cancelAnimationFrame(scanAnimationFrame);
            scanAnimationFrame = null;
        }
        if (zxingCodeReader && typeof zxingCodeReader.reset === 'function') {
            try { zxingCodeReader.reset(); } catch (e) { }
        }
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            cameraStream = null;
        }
    }

    window.stopCamera = stopCamera;

    function extractCodeFromItem(b) {
        if (!b) return '';
        if (typeof b === 'string' || typeof b === 'number') return String(b).trim();
        if (Array.isArray(b)) return String(b[0] || '').trim();
        if (typeof b === 'object') {
            const raw = b.code || b.Code || b.barcode || b.Barcode || b.kod || b.Kod || b.id || b.ID || '';
            return String(raw).trim();
        }
        return '';
    }

    function extractCategoryFromItem(b) {
        if (!b || typeof b !== 'object') return 'Botol Plastik';
        if (Array.isArray(b)) return String(b[1] || 'Botol Plastik');
        return String(b.category || b.Category || b.kategori || b.Kategori || 'Botol Plastik');
    }

    function extractPointsFromItem(b) {
        if (!b || typeof b !== 'object') return 10;
        if (Array.isArray(b)) return parseInt(b[2]) || 10;
        const pts = b.points || b.Points || b.mata || b.Mata;
        return parseInt(pts) || 10;
    }

    function extractUsedFromItem(b) {
        if (!b || typeof b !== 'object') return false;
        if (Array.isArray(b)) return false;
        return Boolean(b.used || b.Used || b.status === 'used' || b.status === 'Telah Guna');
    }

    window.extractCodeFromItem = extractCodeFromItem;

    // ==========================================
    // 4. PROSES IMBAS BARKOD & TULISAN / NOMBOR
    // ==========================================
    function processBarcode(code) {
        if (!code) return;

        let allBarcodes = [];
        const rawData = localStorage.getItem('eco_barcodes') || localStorage.getItem('ecoPulseBarcodes');
        if (rawData) {
            try {
                const parsed = JSON.parse(rawData);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    allBarcodes = parsed;
                }
            } catch (e) { }
        }
        if (allBarcodes.length === 0) {
            if (typeof getLatestBarcodes === 'function') {
                allBarcodes = getLatestBarcodes();
            }
        }
        barcodes = allBarcodes;

        const inputCode = String(code).trim().toUpperCase();
        if (!inputCode) return;

        // Match 1: Exact match
        let found = allBarcodes.find(b => extractCodeFromItem(b).toUpperCase() === inputCode);

        // Match 2: Contains match (scanned text containing barcode)
        if (!found) {
            found = allBarcodes.find(b => {
                const bCode = extractCodeFromItem(b).toUpperCase();
                return bCode && (inputCode.includes(bCode) || bCode.includes(inputCode));
            });
        }

        // Match 3: Alphanumeric match (ignoring dashes/spaces e.g. ECO1001 == ECO-1001)
        if (!found) {
            const alphaClean = inputCode.replace(/[^A-Z0-9]/g, '');
            if (alphaClean) {
                found = allBarcodes.find(b => {
                    const bAlpha = extractCodeFromItem(b).toUpperCase().replace(/[^A-Z0-9]/g, '');
                    return bAlpha && (bAlpha === alphaClean || alphaClean.includes(bAlpha) || bAlpha.includes(alphaClean));
                });
            }
        }

        // Match 4: Extract numbers only (e.g. "1001" matches "ECO-1001")
        if (!found) {
            const numOnly = inputCode.replace(/[^0-9]/g, '');
            if (numOnly.length >= 2) {
                found = allBarcodes.find(b => {
                    const bNum = extractCodeFromItem(b).replace(/[^0-9]/g, '');
                    return bNum && (bNum === numOnly || bNum.includes(numOnly) || numOnly.includes(bNum));
                });
            }
        }

        // Match 5: Fallback match by category / keyword (e.g. "BOTOL", "TIN", "KERTAS")
        if (!found) {
            found = allBarcodes.find(b => {
                const cat = extractCategoryFromItem(b).toUpperCase();
                return cat && (inputCode.includes(cat) || cat.includes(inputCode));
            });
        }

        // JIKA KOD TIDAK WUJUD DALAM MOD GURU -> MESEJ SAMPAH TIDAK SAH!
        if (!found) {
            alert(`❌ SAMPAH TIDAK SAH!\n\nKod "${inputCode}" tidak wujud dalam senarai berdaftar Mod Guru. Sila pastikan kod ini telah didaftarkan oleh guru terlebih dahulu.`);
            return;
        }

        const itemCode = extractCodeFromItem(found) || inputCode;
        const itemCategory = extractCategoryFromItem(found);
        const itemPoints = extractPointsFromItem(found);
        const itemUsed = extractUsedFromItem(found);

        // JIKA KOD SUDAH PERNAH DIGUNAKAN -> MESEJ SAMPAH TIDAK SAH (SEKALI GUNA SAHAJA)!
        if (itemUsed) {
            alert(`❌ SAMPAH TIDAK SAH!\n\nKod "${itemCode}" ini telah pernah digunakan sebelum ini! Setiap kod sampah hanya boleh digunakan SEKALI SAHAJA.`);
            return;
        }

        // KOD SAH (DISAHKAN & AKTIF) -> SET PENDING ITEM & PAPARKAN SKRIN 5 BERSERTA BUTANG ENTER BUKA TONG SAMPAH!
        const verifiedObj = {
            code: itemCode,
            category: itemCategory,
            points: itemPoints,
            used: false
        };

        pendingScannedItem = verifiedObj;
        window.pendingScannedItem = verifiedObj;

        const titleElem = document.getElementById('verifyItemTitle');
        const catElem = document.getElementById('verifyItemCategory');

        if (titleElem) titleElem.innerText = "SAMPAH DISAHKAN!";
        if (catElem) catElem.innerText = `${verifiedObj.category} • +${verifiedObj.points} Mata Ganjaran`;

        if (typeof stopCamera === 'function') {
            try { stopCamera(); } catch (e) { }
        }
        if (typeof window.stopCamera === 'function') {
            try { window.stopCamera(); } catch (e) { }
        }

        if (typeof window.navigateToScreen === 'function') {
            window.navigateToScreen('screen-5');
        } else if (typeof window.showScreen === 'function') {
            window.showScreen('screen-5');
        }
    }

    window.processBarcode = processBarcode;

    function submitManualBarcode() {
        const input = document.getElementById('manualBarcodeInput');
        if (!input) return;
        const val = input.value.trim();
        if (!val) return;
        processBarcode(val);
        input.value = '';
    }

    window.submitManualBarcode = submitManualBarcode;

    document.getElementById('btnSubmitManualBarcode')?.addEventListener('click', submitManualBarcode);

    document.getElementById('manualBarcodeInput')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            submitManualBarcode();
        }
    });

    // Kekunci Enter di Skrin 5 untuk Buka Tong Sampah
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const screen5 = document.getElementById('screen-5');
            if (screen5 && (screen5.classList.contains('active') || screen5.style.display === 'flex' || screen5.style.display === 'block')) {
                const btnOpen = document.getElementById('btnSendBluetoothOpen');
                if (btnOpen) {
                    e.preventDefault();
                    btnOpen.click();
                }
            }
        }
    });

    // ==========================================
    // 5. BLUETOOTH ARDUINO / ESP32
    // ==========================================
    const bluetoothStatusPill = document.getElementById('bluetoothStatusPill');
    bluetoothStatusPill?.addEventListener('click', window.connectBluetoothDevice);
    document.getElementById('btnConnectBluetooth')?.addEventListener('click', window.connectBluetoothDevice);

    function onDisconnected() {
        console.log("Sambungan Bluetooth terputus.");
        bluetoothGattServer = null;
        bluetoothCharacteristic = null;
        updateBluetoothUI(false);
    }

    window.handleOpenBinAction = async function (e) {
        if (e && e.preventDefault) e.preventDefault();

        if (window.isBinActionProcessing) return;
        window.isBinActionProcessing = true;
        setTimeout(() => { window.isBinActionProcessing = false; }, 1500);

        let item = pendingScannedItem || window.pendingScannedItem;
        if (!item) {
            item = {
                code: "ECO-1001",
                category: "Botol Plastik",
                points: 10,
                used: false
            };
        }

        // Semak semula mata ganjaran terkini mengikut tetapan Mod Guru
        const latestBarcodesList = typeof getLatestBarcodes === 'function' ? getLatestBarcodes() : (typeof loadBarcodesFromStorage === 'function' ? loadBarcodesFromStorage() : []);
        if (item && item.code && Array.isArray(latestBarcodesList)) {
            const matchedBarcodeInStorage = latestBarcodesList.find(b => {
                const bCode = typeof extractCodeFromItem === 'function' ? extractCodeFromItem(b) : (b.code || '');
                return String(bCode).toUpperCase() === String(item.code).toUpperCase();
            });
            if (matchedBarcodeInStorage) {
                item.points = typeof extractPointsFromItem === 'function' ? extractPointsFromItem(matchedBarcodeInStorage) : (matchedBarcodeInStorage.points || item.points);
                item.category = typeof extractCategoryFromItem === 'function' ? extractCategoryFromItem(matchedBarcodeInStorage) : (matchedBarcodeInStorage.category || item.category);
            }
        }

        if (typeof window.getCurrentActiveStudent === 'function') {
            currentStudent = window.getCurrentActiveStudent();
        } else {
            try {
                currentStudent = JSON.parse(localStorage.getItem('ecoPulseCurrentStudent') || 'null');
            } catch (err) { }
        }

        if (!currentStudent) {
            const allStudents = JSON.parse(localStorage.getItem('ecoPulseStudents')) || JSON.parse(localStorage.getItem('eco_students')) || [];
            if (allStudents.length > 0) {
                currentStudent = allStudents[0];
            } else {
                currentStudent = {
                    id: "STU-001",
                    name: "Ahmad Albab",
                    tingkatan: "Tingkatan 1",
                    kelas: "Is",
                    points: 120,
                    history: []
                };
            }
        }

        triggerArduinoLidSimulation();

        if (bluetoothGattServer && bluetoothGattServer.connected && bluetoothCharacteristic) {
            try {
                const encoder = new TextEncoder();
                await bluetoothCharacteristic.writeValue(encoder.encode('OPEN\n'));
                console.log("Isyarat OPEN dihantar ke Arduino!");
            } catch (e) {
                console.error("Gagal menghantar data menerusi Bluetooth:", e);
                alert("⚠️ Isyarat Bluetooth gagal dihantar, simulasi diteruskan.");
            }
        } else {
            console.log("Bluetooth tidak disambungkan. Menjalankan mod simulasi sahaja.");
        }

        item.used = true;
        const pts = parseInt(item.points) || 10;
        currentStudent.points = (parseInt(currentStudent.points) || 0) + pts;

        if (!currentStudent.history) currentStudent.history = [];
        currentStudent.history.unshift({
            category: item.category || "Sampah Kitar Semula",
            points: pts,
            date: new Date().toLocaleDateString()
        });

        // Simpan data pelajar terkini
        const allStudents = JSON.parse(localStorage.getItem('ecoPulseStudents')) || JSON.parse(localStorage.getItem('eco_students')) || [];
        const studentIdx = allStudents.findIndex(s => String(s.id) === String(currentStudent.id));
        if (studentIdx !== -1) {
            allStudents[studentIdx] = currentStudent;
        } else {
            allStudents.push(currentStudent);
        }

        localStorage.setItem('eco_students', JSON.stringify(allStudents));
        localStorage.setItem('ecoPulseStudents', JSON.stringify(allStudents));
        localStorage.setItem('ecoPulseCurrentStudent', JSON.stringify(currentStudent));

        // Simpan status barkod yang telah digunakan
        getLatestBarcodes();
        const itemCodeUpper = String(item.code || '').toUpperCase();
        if (Array.isArray(barcodes)) {
            barcodes.forEach(b => {
                if (extractCodeFromItem(b).toUpperCase() === itemCodeUpper) {
                    if (typeof b === 'object' && !Array.isArray(b)) {
                        b.used = true;
                    }
                }
            });
        }
        localStorage.setItem('eco_barcodes', JSON.stringify(barcodes));
        localStorage.setItem('ecoPulseBarcodes', JSON.stringify(barcodes));

        saveData();

        if (typeof window.syncAllStudentViews === 'function') {
            try { window.syncAllStudentViews(); } catch (e) { }
        }

        const awardedElem = document.getElementById('awardedPointsDisplay');
        const totalElem = document.getElementById('newTotalPointsDisplay');

        if (awardedElem) awardedElem.innerText = `+${pts}`;
        if (totalElem) totalElem.innerText = `${currentStudent.points} Points`;

        if (typeof window.navigateToScreen === 'function') {
            window.navigateToScreen('screen-6');
        } else if (typeof window.showScreen === 'function') {
            window.showScreen('screen-6');
        }
    };

    // Pengendali tindakan buka tong dipanggil menerusi atribut onclick pada elemen HTML di terkini.html

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

        const studentData = JSON.parse(localStorage.getItem('ecoPulseStudents')) || JSON.parse(localStorage.getItem('eco_students')) || students;

        const defaultTingkatan = ["Tingkatan 1", "Tingkatan 2", "Tingkatan 3", "Tingkatan 4", "Tingkatan 5"];
        const tingkatanSet = new Set(defaultTingkatan);
        studentData.forEach(s => {
            if (s.tingkatan && s.tingkatan.trim()) tingkatanSet.add(s.tingkatan.trim());
        });

        const defaultKelas = ["Is", "Ik", "Ir", "Ia"];
        const kelasSet = new Set(defaultKelas);
        studentData.forEach(s => {
            if (s.kelas && s.kelas.trim()) kelasSet.add(s.kelas.trim());
        });

        if (selTingkatan) {
            const curT = selTingkatan.value;
            selTingkatan.innerHTML = '<option value="">-- Semua Tingkatan --</option>' +
                Array.from(tingkatanSet).map(t => `<option value="${t}">${t}</option>`).join('');
            if (curT && tingkatanSet.has(curT)) selTingkatan.value = curT;
            selTingkatan.onchange = () => {
                selectedStudentToLogin = null;
                renderStudentLoginList();
            };
        }

        if (selKelas) {
            const curK = selKelas.value;
            selKelas.innerHTML = '<option value="">-- Semua Kelas --</option>' +
                Array.from(kelasSet).map(k => `<option value="${k}">${k}</option>`).join('');
            if (curK && kelasSet.has(curK)) selKelas.value = curK;
            selKelas.onchange = () => {
                selectedStudentToLogin = null;
                renderStudentLoginList();
            };
        }

        const containerFilter = selKelas?.parentElement;
        if (containerFilter) {
            let searchInput = document.getElementById('studentSearchInput');
            if (!searchInput) {
                searchInput = document.createElement('input');
                searchInput.id = 'studentSearchInput';
                searchInput.type = 'text';
                searchInput.placeholder = '🔍 Cari nama pelajar...';
                searchInput.style.cssText = 'margin-top: 8px; width: 100%; padding: 8px; background: rgba(15,23,42,0.8); color: #fff; border: 1px solid var(--border-glass); border-radius: 6px; box-sizing: border-box;';
                containerFilter.appendChild(searchInput);
            }

            searchInput.oninput = () => {
                selectedStudentToLogin = null;
                renderStudentLoginList();
            };
            searchInput.onkeydown = handleStudentSearchEnter;

            let btnSearch = document.getElementById('btnSearchStudent');
            if (btnSearch) {
                btnSearch.remove();
            }
        }
    }

    function handleStudentSearchEnter(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleStudentSearchAction();
        }
    }

    function handleStudentSearchAction() {
        const filterTingkatan = document.getElementById('selectTingkatan')?.value;
        const filterKelas = document.getElementById('selectKelas')?.value;
        const searchKeyword = document.getElementById('studentSearchInput')?.value.toLowerCase().trim() || "";

        let filtered = students.filter(s => {
            const matchTingkatan = !filterTingkatan || s.tingkatan === filterTingkatan;
            const matchKelas = !filterKelas || s.kelas === filterKelas;
            const matchSearch = !searchKeyword || s.name.toLowerCase().includes(searchKeyword);
            return matchTingkatan && matchKelas && matchSearch;
        });

        if (filtered.length > 0) {
            selectedStudentToLogin = filtered[0];
            renderStudentLoginList();
        } else {
            alert('❌ Pelajar tidak dijumpai!');
        }
    }

    function selectStudentAndEnterDashboard(studentObj) {
        if (!studentObj) return;
        currentStudent = studentObj;
        loadStudentDashboard();
        showScreen('screen-3');

        const selectRedeemStudent = document.getElementById('selectRedeemStudent');
        if (selectRedeemStudent) {
            updateRedeemStudentList();
            selectRedeemStudent.value = studentObj.id;

            const section = document.getElementById('redeemDashboardSection');
            if (section) section.style.display = 'block';

            const nameElem = document.getElementById('redeemStudentName');
            const classElem = document.getElementById('redeemStudentClass');
            const pointsElem = document.getElementById('redeemStudentPoints');

            if (nameElem) nameElem.innerText = studentObj.name;
            if (classElem) classElem.innerText = `${studentObj.tingkatan} • ${studentObj.kelas}`;
            if (pointsElem) pointsElem.innerText = studentObj.points;

            renderRedeemRewardsList(studentObj);
        }
    }

    // ==========================================
    // SENARAI PELAJAR & PILIHAN (DIBAIKI UNTUK TANGKAP KLIK)
    // ==========================================
    function renderStudentLoginList() {
        const container = document.getElementById('studentListContainer') || document.querySelector('.student-list-container');
        const filterTingkatan = document.getElementById('selectTingkatan')?.value;
        const filterKelas = document.getElementById('selectKelas')?.value;
        const searchKeyword = document.getElementById('studentSearchInput')?.value.toLowerCase().trim() || "";

        if (!container) return;
        container.innerHTML = '';

        students = JSON.parse(localStorage.getItem('eco_students')) || students;

        let filtered = students.filter(s => {
            const matchTingkatan = !filterTingkatan || s.tingkatan === filterTingkatan;
            const matchKelas = !filterKelas || s.kelas === filterKelas;
            const matchSearch = !searchKeyword || s.name.toLowerCase().includes(searchKeyword);
            return matchTingkatan && matchKelas && matchSearch;
        });

        if (filtered.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); text-align: center; width: 100%; padding: 10px;">Tiada pelajar dijumpai.</p>';
            return;
        }

        filtered.forEach(student => {
            const isSelected = selectedStudentToLogin && String(selectedStudentToLogin.id) === String(student.id);
            const card = document.createElement('div');
            card.className = `student-select-card ${isSelected ? 'selected' : ''}`;
            card.setAttribute('data-id', student.id);
            card.setAttribute('data-selected', isSelected ? 'true' : 'false');

            card.style.cssText = `
                background: ${isSelected ? 'rgba(16, 185, 129, 0.25)' : 'rgba(15, 23, 42, 0.8)'};
                padding: 12px;
                border-radius: 10px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 12px;
                border: 2px solid ${isSelected ? '#10b981' : 'rgba(255,255,255,0.1)'};
                margin-bottom: 8px;
                transition: all 0.2s ease-in-out;
                box-shadow: ${isSelected ? '0 0 12px rgba(16, 185, 129, 0.5)' : 'none'};
            `;

            card.innerHTML = `
                <div style="flex: 1; pointer-events: none;">
                    <strong style="color: #fff; display: block; font-size: 0.95rem;">${student.name}</strong>
                    <small style="color: #94a3b8;">${student.tingkatan} • ${student.kelas}</small>
                </div>
                <strong style="color: #10b981; font-size: 0.9rem; pointer-events: none;">${student.points} PTS</strong>
            `;

            // Pengendali klik pada kad pelajar
            card.onclick = function () {
                selectedStudentToLogin = student;

                // Kemaskini semua kad tanpa perlu render semula DOM
                document.querySelectorAll('.student-select-card').forEach(c => {
                    c.classList.remove('selected');
                    c.setAttribute('data-selected', 'false');
                    c.style.background = 'rgba(15, 23, 42, 0.8)';
                    c.style.borderColor = 'rgba(255,255,255,0.1)';
                    c.style.boxShadow = 'none';
                });

                card.classList.add('selected');
                card.setAttribute('data-selected', 'true');
                card.style.background = 'rgba(16, 185, 129, 0.25)';
                card.style.borderColor = '#10b981';
                card.style.boxShadow = '0 0 12px rgba(16, 185, 129, 0.5)';
            };

            container.appendChild(card);
        });
    }

    function loadStudentDashboard() {
        if (!currentStudent) return;

        const refreshedStudent = students.find(s => s.id === currentStudent.id);
        if (refreshedStudent) currentStudent = refreshedStudent;

        const nameElem = document.getElementById('displayStudentName');
        const classElem = document.getElementById('displayStudentClass');
        const pointsElem = document.getElementById('displayStudentPoints');

        if (nameElem) nameElem.innerText = currentStudent.name;
        if (classElem) classElem.innerText = `${currentStudent.tingkatan} • ${currentStudent.kelas}`;
        if (pointsElem) pointsElem.innerText = currentStudent.points;

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

    document.getElementById('btnRefreshHistory')?.addEventListener('click', loadStudentDashboard);
    document.getElementById('btnLogoutStudent')?.addEventListener('click', () => {
        currentStudent = null;
        selectedStudentToLogin = null;
        showScreen('screen-2');
    });

    // ==========================================
    // 7. PANEL ADMIN
    // ==========================================
    const openAdminBtn = document.getElementById('openAdminBtn');
    const adminPasswordModal = document.getElementById('adminPasswordModal');
    const adminPasswordForm = document.getElementById('adminPasswordForm');
    const adminPasswordInput = document.getElementById('adminPasswordInput');
    const btnCancelAdminPassword = document.getElementById('btnCancelAdminPassword');
    const adminModal = document.getElementById('adminModal');
    const closeAdminBtn = document.getElementById('closeAdminBtn');

    openAdminBtn?.addEventListener('click', () => {
        if (adminPasswordModal) {
            adminPasswordModal.style.display = 'flex';
            if (adminPasswordInput) {
                adminPasswordInput.value = '';
                adminPasswordInput.focus();
            }
        }
    });

    btnCancelAdminPassword?.addEventListener('click', () => {
        if (adminPasswordModal) adminPasswordModal.style.display = 'none';
    });

    adminPasswordForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        if (adminPasswordInput && adminPasswordInput.value === 'cikgu') {
            if (adminPasswordModal) adminPasswordModal.style.display = 'none';
            if (adminModal) adminModal.style.display = 'flex';
            initAdminPanel();
        } else {
            alert('Kata laluan salah! (Default: cikgu)');
        }
    });

    closeAdminBtn?.addEventListener('click', () => {
        if (adminModal) adminModal.style.display = 'none';
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
        setupCSVImport();
    }

    // A. TAMBAH PELAJAR
    const formAddStudent = document.getElementById('formAddStudent');
    formAddStudent?.addEventListener('submit', function (e) {
        e.preventDefault();

        const nameInput = document.getElementById('adminNewStudentName')?.value.trim();
        const tingkatanInput = document.getElementById('adminNewStudentTingkatan')?.value;
        const kelasInput = document.getElementById('adminNewStudentKelas')?.value;
        const pointsInput = parseInt(document.getElementById('adminNewStudentPoints')?.value) || 0;

        if (!nameInput) {
            alert('Sila masukkan nama pelajar!');
            return;
        }

        const existingStudent = students.find(s =>
            s.name.toLowerCase() === nameInput.toLowerCase() &&
            s.tingkatan === tingkatanInput &&
            s.kelas === kelasInput
        );

        if (existingStudent) {
            existingStudent.points += pointsInput;
            alert(`ℹ️ Pelajar ${nameInput} sudah wujud. Mata bertambah!`);
        } else {
            const newStudent = {
                id: 'STU-' + Date.now(),
                name: nameInput,
                tingkatan: tingkatanInput,
                kelas: kelasInput,
                points: pointsInput,
                history: []
            };
            students.push(newStudent);
            alert(`✅ Pelajar ${nameInput} berjaya didaftarkan!`);
        }

        saveData();
        formAddStudent.reset();
    });

    // B. IMPORT CSV
    function setupCSVImport() {
        const csvFileInput = document.getElementById('adminCSVFileInput');
        const csvPreviewContainer = document.getElementById('csvPreviewContainer');
        const btnSaveCSVData = document.getElementById('btnSaveCSVData');

        if (!csvFileInput) return;

        csvFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function (evt) {
                parseCSVAndShowPreview(evt.target.result);
            };
            reader.readAsText(file);
        });

        btnSaveCSVData?.addEventListener('click', () => {
            if (pendingCSVStudents.length === 0) {
                alert('⚠️ Tiada data pelajar untuk disimpan!');
                return;
            }

            pendingCSVStudents.forEach(csvStudent => {
                const existingIndex = students.findIndex(s =>
                    s.name.toLowerCase() === csvStudent.name.toLowerCase() &&
                    s.kelas.toLowerCase() === csvStudent.kelas.toLowerCase()
                );

                if (existingIndex !== -1) {
                    students[existingIndex].points += csvStudent.points;
                    students[existingIndex].tingkatan = csvStudent.tingkatan || students[existingIndex].tingkatan;
                } else {
                    students.push(csvStudent);
                }
            });

            saveData();
            alert(`🎉 Berjaya memuat naik & mengemaskini ${pendingCSVStudents.length} rekod pelajar!`);

            pendingCSVStudents = [];
            csvFileInput.value = '';
            if (csvPreviewContainer) csvPreviewContainer.innerHTML = '';
            if (btnSaveCSVData) btnSaveCSVData.style.display = 'none';
        });
    }

    function parseCSVAndShowPreview(csvText) {
        const lines = csvText.split(/\r\n|\n/);
        pendingCSVStudents = [];

        if (lines.length < 2) {
            alert('❌ Fail CSV kosong atau format salah.');
            return;
        }

        for (let i = 1; i < lines.length; i++) {
            const row = lines[i].split(',');
            if (row.length >= 3) {
                const name = row[0]?.trim();
                const tingkatan = row[1]?.trim();
                const kelas = row[2]?.trim();
                const points = parseInt(row[3]?.trim()) || 0;

                if (name) {
                    pendingCSVStudents.push({
                        id: 'STU-CSV-' + Date.now() + '-' + i,
                        name: name,
                        tingkatan: tingkatan || 'Tingkatan 1',
                        kelas: kelas || 'Is',
                        points: points,
                        history: []
                    });
                }
            }
        }

        renderCSVPreview();
    }

    function renderCSVPreview() {
        const container = document.getElementById('csvPreviewContainer');
        const btnSave = document.getElementById('btnSaveCSVData');

        if (!container) return;
        container.innerHTML = '';

        if (pendingCSVStudents.length === 0) {
            container.innerHTML = '<p style="color: #ef4444; font-size: 0.85rem;">Format CSV tidak sah.</p>';
            if (btnSave) btnSave.style.display = 'none';
            return;
        }

        let html = `
            <div style="margin-top: 10px; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 6px; border: 1px dashed var(--bright-cyan);">
                <strong style="color: var(--bright-cyan); display: block; margin-bottom: 6px;">
                    📋 Pratonton Senarai Pelajar CSV (${pendingCSVStudents.length} orang)
                </strong>
                <div style="max-height: 180px; overflow-y: auto; font-size: 0.8rem;">
        `;

        pendingCSVStudents.forEach((st, idx) => {
            html += `
                <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <span>${idx + 1}. <strong>${st.name}</strong> (${st.tingkatan} - ${st.kelas})</span>
                    <span style="color: var(--neon-green);">${st.points} Mata</span>
                </div>
            `;
        });

        html += `</div></div>`;
        container.innerHTML = html;

        if (btnSave) btnSave.style.display = 'block';
    }

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
        }
    };

    // C. URUS BARKOD
    document.getElementById('formAddBarcode')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const code = document.getElementById('adminNewBarcodeCode')?.value.trim();
        const category = document.getElementById('adminNewBarcodeCategory')?.value;
        const points = parseInt(document.getElementById('adminNewBarcodePoints')?.value) || 10;

        if (!code) {
            alert('Sila masukkan kod barkod!');
            return;
        }

        if (barcodes.some(b => b.code.toUpperCase() === code.toUpperCase())) {
            alert('⚠️ Kod Barkod ini sudah wujud!');
            return;
        }

        barcodes.push({ code, category, points, used: false });
        saveData();
        alert('✅ Barkod berjaya ditambah!');
        document.getElementById('formAddBarcode').reset();
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
        }
    };

    window.deleteBarcode = function (index) {
        if (confirm(`Adakah anda pasti untuk memadam barkod ${barcodes[index].code}?`)) {
            barcodes.splice(index, 1);
            saveData();
        }
    };

    // D. URUS GANJARAN
    const formAddReward = document.getElementById('formAddReward') || document.getElementById('formAddRewardItem');
    formAddReward?.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = (document.getElementById('adminNewRewardName') || document.getElementById('adminRewardName'))?.value.trim();
        const points = parseInt((document.getElementById('adminNewRewardPoints') || document.getElementById('adminRewardPoints'))?.value) || 50;
        const stock = parseInt(document.getElementById('adminRewardStock')?.value) || 10;
        const photoFile = document.getElementById('adminRewardImageFile')?.files[0];

        if (!name) {
            alert('Sila masukkan nama barang ganjaran!');
            return;
        }

        const saveRewardObj = (imageDataUrl) => {
            rewards.push({
                id: 'REW-' + Date.now(),
                name: name,
                points: points,
                stock: stock,
                image: imageDataUrl || 'assets/default-reward.png'
            });

            saveData();
            alert('✅ Ganjaran baharu berjaya ditambah!');
            formAddReward.reset();
        };

        if (photoFile) {
            const reader = new FileReader();
            reader.onload = function (evt) { saveRewardObj(evt.target.result); };
            reader.readAsDataURL(photoFile);
        } else {
            saveRewardObj(null);
        }
    });

    function renderAdminRewardsList() {
        const container = document.getElementById('adminRewardsList');
        if (!container) return;
        container.innerHTML = '';

        rewards.forEach((r, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 6px;';
            itemDiv.innerHTML = `
                <div>
                    <strong style="color: #fff;">${r.name}</strong>
                    <br><small style="color: var(--neon-green);">${r.points} Mata Required</small>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">Baki Stok: <strong>${r.stock !== undefined ? r.stock : 0}</strong></div>
                </div>
                <div style="display: flex; gap: 4px; align-items: center;">
                    <button type="button" onclick="updateRewardStock(${index}, 1)" style="background: #3b82f6; color: #fff; border: none; padding: 2px 6px; border-radius: 4px; cursor: pointer;">+1</button>
                    <button type="button" onclick="updateRewardStock(${index}, -1)" style="background: #f59e0b; color: #fff; border: none; padding: 2px 6px; border-radius: 4px; cursor: pointer;">-1</button>
                    <button type="button" onclick="deleteReward(${index})" style="background: #ef4444; color: #fff; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">Padam</button>
                </div>
            `;
            container.appendChild(itemDiv);
        });
    }

    window.updateRewardStock = function (index, change) {
        if (rewards[index]) {
            let currentStock = rewards[index].stock !== undefined ? rewards[index].stock : 0;
            rewards[index].stock = Math.max(0, currentStock + change);
            saveData();
        }
    };

    window.deleteReward = function (index) {
        if (confirm(`Adakah anda pasti untuk memadam ganjaran "${rewards[index].name}"?`)) {
            rewards.splice(index, 1);
            saveData();
        }
    };

    // E. MUAT NAIK VIDEO
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
                    alert('⚠️ Sila pilih fail video!');
                    return;
                }

                const isSavedDB = await saveVideoToDB(file);

                if (!isSavedDB) {
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
                    alert('🎉 Video Promosi Berjaya Disimpan!');
                }
            });
        }
    }

    // Reset Pangkalan Data
    document.getElementById('btnResetDatabase')?.addEventListener('click', () => {
        if (confirm('⚠️ Padam SEMUA data dan reset semula?')) {
            localStorage.clear();
            indexedDB.deleteDatabase('EcoVideoDB');
            location.reload();
        }
    });

    // ==========================================
    // 8. TEBUS GANJARAN PELAJAR
    // ==========================================
    function populateRedeemDropdowns() {
        const tSel = document.getElementById('selectRedeemTingkatan');
        const kSel = document.getElementById('selectRedeemKelas');

        const studentData = JSON.parse(localStorage.getItem('ecoPulseStudents')) || JSON.parse(localStorage.getItem('eco_students')) || students;

        const defaultTingkatan = ["Tingkatan 1", "Tingkatan 2", "Tingkatan 3", "Tingkatan 4", "Tingkatan 5"];
        const tingkatanSet = new Set(defaultTingkatan);
        studentData.forEach(s => {
            if (s.tingkatan && s.tingkatan.trim()) tingkatanSet.add(s.tingkatan.trim());
        });

        const defaultKelas = ["Is", "It", "Iq", "Ik", "Im", "Ia", "Ir", "In"];
        const kelasSet = new Set(defaultKelas);
        studentData.forEach(s => {
            if (s.kelas && s.kelas.trim()) kelasSet.add(s.kelas.trim());
        });

        if (tSel) {
            const curT = tSel.value;
            tSel.innerHTML = '<option value="">-- Semua Tingkatan --</option>' +
                Array.from(tingkatanSet).map(t => `<option value="${t}">${t}</option>`).join('');
            if (curT && tingkatanSet.has(curT)) tSel.value = curT;
            tSel.onchange = updateRedeemStudentList;
        }

        if (kSel) {
            const curK = kSel.value;
            kSel.innerHTML = '<option value="">-- Semua Kelas --</option>' +
                Array.from(kelasSet).map(k => `<option value="${k}">${k}</option>`).join('');
            if (curK && kelasSet.has(curK)) kSel.value = curK;
            kSel.onchange = updateRedeemStudentList;
        }

        const containerRedeemFilter = kSel?.parentElement;
        if (containerRedeemFilter) {
            let searchRedeemInput = document.getElementById('redeemStudentSearchInput');
            if (!searchRedeemInput) {
                searchRedeemInput = document.createElement('input');
                searchRedeemInput.id = 'redeemStudentSearchInput';
                searchRedeemInput.type = 'text';
                searchRedeemInput.placeholder = '🔍 Cari nama pelajar tebus...';
                searchRedeemInput.style.cssText = 'margin-top: 8px; width: 100%; padding: 8px; background: rgba(15,23,42,0.8); color: #fff; border: 1px solid var(--border-glass); border-radius: 6px; box-sizing: border-box;';
                containerRedeemFilter.appendChild(searchRedeemInput);
            }

            searchRedeemInput.oninput = updateRedeemStudentList;
            searchRedeemInput.onkeydown = handleRedeemStudentSearchEnter;

            let btnSearchRedeem = document.getElementById('btnSearchRedeemStudent');
            if (btnSearchRedeem) {
                btnSearchRedeem.remove();
            }
        }

        updateRedeemStudentList();
    }

    function handleRedeemStudentSearchEnter(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleRedeemStudentSearchAction();
        }
    }

    function handleRedeemStudentSearchAction() {
        updateRedeemStudentList();
        const sSel = document.getElementById('selectRedeemStudent');
        if (sSel && sSel.options.length > 1) {
            sSel.selectedIndex = 1;
            sSel.dispatchEvent(new Event('change'));
        } else {
            alert('❌ Pelajar tidak dijumpai!');
        }
    }

    function updateRedeemStudentList() {
        const tVal = document.getElementById('selectRedeemTingkatan')?.value;
        const kVal = document.getElementById('selectRedeemKelas')?.value;
        const searchKeyword = document.getElementById('redeemStudentSearchInput')?.value.toLowerCase().trim() || "";
        const sSel = document.getElementById('selectRedeemStudent');

        if (!sSel) return;

        const data = localStorage.getItem('ecoPulseStudents') || localStorage.getItem('eco_students');
        if (data) {
            try {
                const parsed = JSON.parse(data);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    students = parsed;
                }
            } catch (e) { }
        }

        const prevVal = sSel.value;

        function cleanStr(str) {
            return (str || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
        }

        let filtered = students.filter(s => {
            const matchTingkatan = !tVal || cleanStr(s.tingkatan) === cleanStr(tVal) || cleanStr(s.tingkatan).includes(cleanStr(tVal)) || cleanStr(tVal).includes(cleanStr(s.tingkatan));
            const matchKelas = !kVal || cleanStr(s.kelas) === cleanStr(kVal);
            const matchSearch = !searchKeyword || cleanStr(s.name).includes(cleanStr(searchKeyword));
            return matchTingkatan && matchKelas && matchSearch;
        });

        if (filtered.length === 0) {
            sSel.innerHTML = '<option value="">-- Tiada Pelajar Dijumpai --</option>';
        } else {
            sSel.innerHTML = `<option value="">-- Pilih Nama Pelajar Untuk Tebus (${filtered.length} Orang) --</option>` +
                filtered.map(s => `<option value="${s.id}">${s.name} (${s.tingkatan || ''} ${s.kelas || ''}) - ${s.points || 0} PTS</option>`).join('');
        }

        if (prevVal && filtered.some(s => String(s.id) === String(prevVal))) {
            sSel.value = prevVal;
        }
    }

    document.getElementById('selectRedeemStudent')?.addEventListener('change', (e) => {
        const sId = e.target.value;
        const student = students.find(s => s.id === sId);
        const section = document.getElementById('redeemDashboardSection');

        if (student) {
            currentStudent = student;
            if (section) section.style.display = 'block';
            const nameElem = document.getElementById('redeemStudentName');
            const classElem = document.getElementById('redeemStudentClass');
            const pointsElem = document.getElementById('redeemStudentPoints');

            if (nameElem) nameElem.innerText = student.name;
            if (classElem) classElem.innerText = `${student.tingkatan} • ${student.kelas}`;
            if (pointsElem) pointsElem.innerText = student.points;
            renderRedeemRewardsList(student);
        } else {
            if (section) section.style.display = 'none';
        }
    });

    function renderRedeemRewardsList(student) {
        const container = document.getElementById('redeemAvailableRewardsList') || document.getElementById('rewardsCatalogContainer');
        if (!container) return;
        container.innerHTML = '';

        if (rewards.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); text-align: center; width: 100%;">Tiada barangan ganjaran yang ditambah.</p>';
            return;
        }

        rewards.forEach(r => {
            const itemStock = r.stock !== undefined ? r.stock : 0;
            const hasStock = itemStock > 0;
            const canAfford = student.points >= r.points;
            const canRedeem = canAfford && hasStock;

            const rewardCard = document.createElement('div');
            rewardCard.className = 'reward-card-item';
            rewardCard.style.cssText = `
                background: rgba(15,23,42,0.6);
                border: 1px solid ${canRedeem ? 'var(--neon-green)' : 'rgba(255,255,255,0.1)'};
                padding: 12px;
                border-radius: 8px;
                margin-bottom: 10px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;

            let btnText = 'TEBUS';
            if (!hasStock) btnText = '❌ STOK HABIS';
            else if (!canAfford) btnText = 'Mata Tak Cukup';

            rewardCard.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px;">
                    <img src="${r.image || 'assets/default-reward.png'}" onerror="this.src='assets/default-reward.png';" style="width: 48px; height: 48px; border-radius: 6px; object-fit: cover;">
                    <div>
                        <strong style="color: #fff; font-size: 1rem;">${r.name}</strong>
                        <br><small style="color: ${canAfford ? 'var(--neon-green)' : '#ef4444'};">${r.points} Mata Required</small>
                        <br><small style="color: ${hasStock ? 'var(--bright-cyan)' : '#ef4444'}; font-weight: bold;">Stok Baki: ${itemStock}</small>
                    </div>
                </div>
                <button type="button" 
                    ${!canRedeem ? 'disabled' : ''} 
                    style="
                        background: ${canRedeem ? 'var(--neon-green)' : '#475569'};
                        color: ${canRedeem ? '#000' : '#aaa'};
                        border: none;
                        padding: 8px 16px;
                        border-radius: 6px;
                        font-weight: bold;
                        cursor: ${canRedeem ? 'pointer' : 'not-allowed'};
                    ">
                    ${btnText}
                </button>
            `;

            rewardCard.querySelector('button')?.addEventListener('click', () => {
                if (r.stock <= 0) {
                    alert('❌ Maaf, stok barang ini telah habis!');
                    return;
                }

                if (confirm(`Adakah anda pasti mahu menebus "${r.name}" dengan ${r.points} mata?`)) {
                    student.points -= r.points;
                    r.stock -= 1;

                    if (!student.history) student.history = [];
                    student.history.unshift({
                        category: `Tebus: ${r.name}`,
                        points: -r.points,
                        date: new Date().toLocaleDateString()
                    });

                    saveData();

                    const pointsElem = document.getElementById('redeemStudentPoints');
                    if (pointsElem) pointsElem.innerText = student.points;
                    alert(`🎉 Berjaya menebus ${r.name}! Sisa mata anda: ${student.points}`);
                    loadStudentDashboard();
                }
            });

            container.appendChild(rewardCard);
        });
    }

    // Inisialisasi Permulaan Aplikasi
    loadPromoVideo();
    populateDropdowns();
    renderStudentLoginList();

});
