/**
 * SEMNASH ECO-PULSE - Logik Aplikasi & Pengurusan Data LocalStorage
 */

// ==========================================
// 1. NESTED DATA STRUCT & INITIAL STATE
// ==========================================
const DEFAULT_SYSTEM_DATA = {
    tingkatanList: ["Tingkatan 1", "Tingkatan 2", "Tingkatan 3", "Tingkatan 4", "Tingkatan 5"],
    kelasList: ["Cemerlang", "Gemilang", "Terbilang", "Bijak", "Kreatif"],
    students: [],
    barcodes: [
        { code: "ECO-BOTOL-001", category: "Botol Plastik", points: 10, isUsed: false, usedBy: null, usedAt: null },
        { code: "ECO-TIN-101", category: "Tin Aluminium", points: 15, isUsed: false, usedBy: null, usedAt: null },
        { code: "ECO-KERTAS-201", category: "Kertas / Kotak", points: 5, isUsed: false, usedBy: null, usedAt: null }
    ],
    rewards: [
        { id: "rew_1", name: "Pensel Eco-Pulse", pointsNeeded: 20, image: "https://via.placeholder.com/150/10b981/ffffff?text=Pensel+Eco" },
        { id: "rew_2", name: "Buku Nota Kitar Semula", pointsNeeded: 50, image: "https://via.placeholder.com/150/06b6d4/ffffff?text=Buku+Nota" }
    ],
    videoUrl: "",
    adminPassword: "admin"
};

let appState = {
    currentScreen: "screen-1",
    currentStudent: null,
    scannedBarcode: null,
    isBluetoothConnected: false,
    bluetoothSimulatorActive: true
};

// ==========================================
// 2. HELPER LOCALSTORAGE MANAGEMENT
// ==========================================
function loadDataFromStorage() {
    const stored = localStorage.getItem("SEMNASH_ECO_PULSE_DATA");
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.error("Gagal membaca LocalStorage:", e);
        }
    }
    saveDataToStorage(DEFAULT_SYSTEM_DATA);
    return JSON.parse(JSON.stringify(DEFAULT_SYSTEM_DATA));
}

function saveDataToStorage(data) {
    localStorage.setItem("SEMNASH_ECO_PULSE_DATA", JSON.stringify(data));
}

let db = loadDataFromStorage();

// ==========================================
// 3. SKRIN & NAVIGATION SYSTEM
// ==========================================
function navigateToScreen(screenId) {
    document.querySelectorAll(".screen").forEach(sc => sc.classList.remove("active"));
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add("active");
        appState.currentScreen = screenId;
        window.scrollTo(0, 0);

        // Auto Refresh Data mengikut Skrin
        if (screenId === "screen-2") populateStudentLoginDropdowns();
        if (screenId === "screen-3") updateStudentDashboardUI();
        if (screenId === "screen-7") populateRedeemScreenDropdowns();
    }
}

// ==========================================
// 4. LOGIK PAPARAN 2 & 3 (PROFIL & GAMBAR PELAJAR)
// ==========================================
function populateStudentLoginDropdowns() {
    const selectTingkatan = document.getElementById("selectTingkatan");
    const selectKelas = document.getElementById("selectKelas");

    if (selectTingkatan) {
        selectTingkatan.innerHTML = '<option value="">-- Semua Tingkatan --</option>' +
            db.tingkatanList.map(t => `<option value="${t}">${t}</option>`).join("");
    }
    if (selectKelas) {
        selectKelas.innerHTML = '<option value="">-- Semua Kelas --</option>' +
            db.kelasList.map(k => `<option value="${k}">${k}</option>`).join("");
    }

    renderStudentSelectList();
}

function renderStudentSelectList() {
    const container = document.getElementById("studentListContainer");
    const selTingkatan = document.getElementById("selectTingkatan")?.value || "";
    const selKelas = document.getElementById("selectKelas")?.value || "";

    if (!container) return;

    let filtered = db.students.filter(st => {
        const matchTingkatan = !selTingkatan || st.tingkatan === selTingkatan;
        const matchKelas = !selKelas || st.kelas === selKelas;
        return matchTingkatan && matchKelas;
    });

    if (filtered.length === 0) {
        container.innerHTML = `<p style="color: var(--text-muted); text-align: center; width: 100%; padding: 20px;">Tiada pelajar berdaftar bagi padanan ini. Sila minta Cikgu daftarkan nama anda.</p>`;
        return;
    }

    container.innerHTML = filtered.map(st => {
        const avatarSrc = st.photo || "assets/default-avatar.png";
        const isSelected = appState.currentStudent?.id === st.id ? "border: 2px solid var(--neon-green);" : "";
        return `
            <div class="student-select-card" onclick="selectStudentForLogin('${st.id}')" style="display: flex; align-items: center; gap: 12px; padding: 10px; background: rgba(15,23,42,0.8); border-radius: 8px; cursor: pointer; margin-bottom: 8px; ${isSelected}">
                <img src="${avatarSrc}" style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover; border: 1px solid var(--bright-cyan);">
                <div>
                    <h4 style="margin: 0; color: #fff;">${st.name}</h4>
                    <p style="margin: 2px 0 0 0; font-size: 0.8rem; color: var(--text-muted);">${st.tingkatan} - ${st.kelas} • 🌟 ${st.points} Points</p>
                </div>
            </div>
        `;
    }).join("");
}

function selectStudentForLogin(studentId) {
    const found = db.students.find(s => s.id === studentId);
    if (found) {
        appState.currentStudent = found;
        renderStudentSelectList();
    }
}

function updateStudentDashboardUI() {
    if (!appState.currentStudent) return;

    // Refresh data terkini dari DB
    const freshData = db.students.find(s => s.id === appState.currentStudent.id);
    if (freshData) appState.currentStudent = freshData;

    const st = appState.currentStudent;

    const elName = document.getElementById("displayStudentName");
    const elClass = document.getElementById("displayStudentClass");
    const elPoints = document.getElementById("displayStudentPoints");

    if (elName) elName.textContent = st.name;
    if (elClass) elClass.textContent = `${st.tingkatan} • ${st.kelas}`;
    if (elPoints) elPoints.textContent = st.points;

    // Tukar Gambar Pelajar jika dimuat naik
    const avatarImg = document.getElementById("displayStudentAvatar");
    if (avatarImg) {
        avatarImg.src = st.photo || "assets/default-avatar.png";
    }

    // Render Log Aktiviti
    const actList = document.getElementById("studentActivityList");
    if (actList) {
        if (!st.history || st.history.length === 0) {
            actList.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem; text-align: center;">Belum ada sejarah kitar semula.</p>`;
        } else {
            actList.innerHTML = st.history.map(h => `
                <div style="display: flex; justify-content: space-between; background: rgba(0,0,0,0.3); padding: 8px 12px; border-radius: 6px; margin-bottom: 6px; font-size: 0.85rem;">
                    <span>♻️ ${h.item} (${h.code})</span>
                    <strong style="color: var(--neon-green);">+${h.points} pts</strong>
                </div>
            `).join("");
        }
    }
}

// ==========================================
// 5. LOGIK PAPARAN 7 (PENEBUSAN GANJARAN)
// ==========================================
function populateRedeemScreenDropdowns() {
    const selTingkatan = document.getElementById("selectRedeemTingkatan");
    const selKelas = document.getElementById("selectRedeemKelas");

    if (selTingkatan) {
        selTingkatan.innerHTML = '<option value="">-- Semua Tingkatan --</option>' +
            db.tingkatanList.map(t => `<option value="${t}">${t}</option>`).join("");
    }
    if (selKelas) {
        selKelas.innerHTML = '<option value="">-- Semua Kelas --</option>' +
            db.kelasList.map(k => `<option value="${k}">${k}</option>`).join("");
    }
    filterRedeemStudentDropdown();
}

function filterRedeemStudentDropdown() {
    const selTingkatan = document.getElementById("selectRedeemTingkatan")?.value || "";
    const selKelas = document.getElementById("selectRedeemKelas")?.value || "";
    const selStudent = document.getElementById("selectRedeemStudent");

    if (!selStudent) return;

    let filtered = db.students.filter(st => {
        const matchTingkatan = !selTingkatan || st.tingkatan === selTingkatan;
        const matchKelas = !selKelas || st.kelas === selKelas;
        return matchTingkatan && matchKelas;
    });

    selStudent.innerHTML = '<option value="">-- Pilih Nama Pelajar --</option>' +
        filtered.map(s => `<option value="${s.id}">${s.name} (${s.tingkatan} - ${s.kelas})</option>`).join("");

    const dashboardSec = document.getElementById("redeemDashboardSection");
    if (dashboardSec) dashboardSec.style.display = "none";
}

function loadRedeemStudentDashboard(studentId) {
    const student = db.students.find(s => s.id === studentId);
    const dashboardSec = document.getElementById("redeemDashboardSection");

    if (!student || !dashboardSec) {
        if (dashboardSec) dashboardSec.style.display = "none";
        return;
    }

    dashboardSec.style.display = "block";

    const rName = document.getElementById("redeemStudentName");
    const rClass = document.getElementById("redeemStudentClass");
    const rPoints = document.getElementById("redeemStudentPoints");

    if (rName) rName.textContent = student.name;
    if (rClass) rClass.textContent = `${student.tingkatan} • ${student.kelas}`;
    if (rPoints) rPoints.textContent = student.points;

    renderRewardsCatalog(student);
}

function renderRewardsCatalog(student) {
    const container = document.getElementById("rewardsCatalogContainer");
    if (!container) return;

    if (!db.rewards || db.rewards.length === 0) {
        container.innerHTML = `<p style="color: var(--text-muted); grid-column: 1/-1; text-align: center;">Tiada barangan ganjaran yang dimasukkan oleh Cikgu lagi.</p>`;
        return;
    }

    container.innerHTML = db.rewards.map(item => {
        const canAfford = student.points >= item.pointsNeeded;
        const btnStyle = canAfford
            ? "background: var(--neon-green, #10b981); color: #000; font-weight: bold; cursor: pointer;"
            : "background: rgba(255,255,255,0.1); color: var(--text-muted, #94a3b8); cursor: not-allowed;";

        return `
            <div style="background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 14px; text-align: center; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                    <img src="${item.image}" alt="${item.name}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 10px;">
                    <h4 style="margin: 0; color: #fff; font-size: 1rem;">${item.name}</h4>
                    <p style="color: var(--bright-cyan, #06b6d4); font-weight: 800; font-size: 1.1rem; margin: 6px 0 12px 0;">⭐ ${item.pointsNeeded} Points</p>
                </div>
                <button style="${btnStyle} width: 100%; padding: 8px; border-radius: 6px; border: none;" ${canAfford ? `onclick="redeemRewardItem('${student.id}', '${item.id}')"` : "disabled"}>
                    ${canAfford ? "🎁 Tebus Sekarang" : "Mata Tidak Cukup"}
                </button>
            </div>
        `;
    }).join("");
}

function redeemRewardItem(studentId, rewardId) {
    const student = db.students.find(s => s.id === studentId);
    const reward = db.rewards.find(r => r.id === rewardId);

    if (!student || !reward) return;

    if (student.points >= reward.pointsNeeded) {
        if (confirm(`Adakah anda pasti mahu menebus "${reward.name}" dengan ${reward.pointsNeeded} mata?`)) {
            student.points -= reward.pointsNeeded;
            saveDataToStorage(db);
            alert(`🎉 Tahniah! Penebusan "${reward.name}" berjaya. Sila tuntut daripada Cikgu.`);
            loadRedeemStudentDashboard(studentId);
        }
    } else {
        alert("Mata ganjaran anda tidak mencukupi!");
    }
}

// ==========================================
// 6. PANEL PENTADBIR / ADMIN LOGIK
// ==========================================
function renderAdminStudentList() {
    const container = document.getElementById("adminStudentManageList");
    if (!container) return;

    if (db.students.length === 0) {
        container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem;">Tiada pelajar berdaftar lagi.</p>`;
        return;
    }

    container.innerHTML = db.students.map(s => `
        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(15,23,42,0.6); padding: 8px 12px; border-radius: 6px; margin-bottom: 6px;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <img src="${s.photo || 'assets/default-avatar.png'}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">
                <div>
                    <strong style="color: #fff; font-size: 0.9rem;">${s.name}</strong>
                    <p style="margin: 0; font-size: 0.75rem; color: var(--text-muted);">${s.tingkatan} - ${s.kelas} • ${s.points} Pts</p>
                </div>
            </div>
            <button onclick="deleteStudentByAdmin('${s.id}')" style="background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid #ef4444; border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 0.75rem;">
                🗑️ Padam
            </button>
        </div>
    `).join("");
}

function deleteStudentByAdmin(studentId) {
    if (confirm("Adakah anda pasti mahu memadam profil pelajar ini?")) {
        db.students = db.students.filter(s => s.id !== studentId);
        saveDataToStorage(db);
        renderAdminStudentList();
        populateStudentLoginDropdowns();
    }
}

function renderAdminRewardsList() {
    const container = document.getElementById("adminRewardsList");
    if (!container) return;

    if (db.rewards.length === 0) {
        container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem;">Tiada item ganjaran.</p>`;
        return;
    }

    container.innerHTML = db.rewards.map(r => `
        <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(15,23,42,0.6); padding: 8px 12px; border-radius: 6px; margin-bottom: 6px;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <img src="${r.image}" style="width: 35px; height: 35px; border-radius: 6px; object-fit: cover;">
                <div>
                    <strong style="color: #fff; font-size: 0.9rem;">${r.name}</strong>
                    <p style="margin: 0; font-size: 0.75rem; color: var(--bright-cyan);">${r.pointsNeeded} Points</p>
                </div>
            </div>
            <button onclick="deleteRewardByAdmin('${r.id}')" style="background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid #ef4444; border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 0.75rem;">
                🗑️ Padam
            </button>
        </div>
    `).join("");
}

function deleteRewardByAdmin(rewardId) {
    if (confirm("Padam barang ganjaran ini?")) {
        db.rewards = db.rewards.filter(r => r.id !== rewardId);
        saveDataToStorage(db);
        renderAdminRewardsList();
    }
}

// ==========================================
// 7. EVENT LISTENERS & INITIALIZATION
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    // Navigation Buttons
    document.getElementById("btnStartApp")?.addEventListener("click", () => navigateToScreen("screen-2"));
    document.getElementById("btnGoToRedeemDirect")?.addEventListener("click", () => navigateToScreen("screen-7"));
    document.getElementById("btnBackToPromo")?.addEventListener("click", () => navigateToScreen("screen-1"));
    document.getElementById("btnBackFromRedeem")?.addEventListener("click", () => navigateToScreen("screen-1"));
    document.getElementById("btnGoToRedeemFromProfile")?.addEventListener("click", () => navigateToScreen("screen-7"));

    document.getElementById("btnLoginStudent")?.addEventListener("click", () => {
        if (!appState.currentStudent) {
            alert("Sila pilih profil pelajar anda dari senarai!");
            return;
        }
        navigateToScreen("screen-3");
    });

    document.getElementById("btnLogoutStudent")?.addEventListener("click", () => {
        appState.currentStudent = null;
        navigateToScreen("screen-2");
    });

    // Scanner & Recycling Navigation
    document.getElementById("btnGoToScan")?.addEventListener("click", () => navigateToScreen("screen-4"));
    document.getElementById("btnBackToDashboard")?.addEventListener("click", () => navigateToScreen("screen-3"));

    // Manual Barcode Submit
    document.getElementById("btnSubmitManualBarcode")?.addEventListener("click", () => {
        const codeInput = document.getElementById("manualBarcodeInput")?.value.trim();
        if (!codeInput) {
            alert("Sila masukkan kod barkod!");
            return;
        }

        const barcodeObj = db.barcodes.find(b => b.code.toUpperCase() === codeInput.toUpperCase());
        if (!barcodeObj) {
            alert("❌ Kod barkod tidak sah atau tidak didaftarkan oleh cikgu!");
            return;
        }

        if (barcodeObj.isUsed) {
            alert(`⚠️ Kod barkod ini telah diimbas sebelum ini! (Barkod 1-Time Use)`);
            return;
        }

        appState.scannedBarcode = barcodeObj;

        const vTitle = document.getElementById("verifyItemTitle");
        const vCategory = document.getElementById("verifyItemCategory");
        if (vTitle) vTitle.textContent = "SAMPAH DISAHKAN!";
        if (vCategory) vCategory.textContent = `${barcodeObj.category} • +${barcodeObj.points} Points`;

        navigateToScreen("screen-5");
    });

    // Buka Tong & Tambah Mata
    document.getElementById("btnSendBluetoothOpen")?.addEventListener("click", () => {
        if (!appState.scannedBarcode || !appState.currentStudent) return;

        const bc = appState.scannedBarcode;
        const st = db.students.find(s => s.id === appState.currentStudent.id);

        bc.isUsed = true;
        bc.usedBy = st.name;
        bc.usedAt = new Date().toISOString();

        st.points += bc.points;
        st.history = st.history || [];
        st.history.unshift({
            item: bc.category,
            code: bc.code,
            points: bc.points,
            date: new Date().toLocaleDateString()
        });

        saveDataToStorage(db);

        const awardDisp = document.getElementById("awardedPointsDisplay");
        const totalDisp = document.getElementById("newTotalPointsDisplay");
        if (awardDisp) awardDisp.textContent = `+${bc.points}`;
        if (totalDisp) totalDisp.textContent = `${st.points} Points`;

        navigateToScreen("screen-6");
    });

    document.getElementById("btnFinishSession")?.addEventListener("click", () => navigateToScreen("screen-3"));
    document.getElementById("btnNextRecycle")?.addEventListener("click", () => navigateToScreen("screen-4"));

    // Filter Listeners untuk Pelajar Login & Penebusan
    document.getElementById("selectTingkatan")?.addEventListener("change", renderStudentSelectList);
    document.getElementById("selectKelas")?.addEventListener("change", renderStudentSelectList);
    document.getElementById("selectRedeemTingkatan")?.addEventListener("change", filterRedeemStudentDropdown);
    document.getElementById("selectRedeemKelas")?.addEventListener("change", filterRedeemStudentDropdown);
    document.getElementById("selectRedeemStudent")?.addEventListener("change", (e) => loadRedeemStudentDashboard(e.target.value));

    // Modal Admin Login & Control
    const openAdminBtn = document.getElementById("openAdminBtn");
    const adminPasswordModal = document.getElementById("adminPasswordModal");
    const adminModal = document.getElementById("adminModal");

    openAdminBtn?.addEventListener("click", () => {
        const inputPwd = document.getElementById("adminPasswordInput");
        if (inputPwd) inputPwd.value = "";
        if (adminPasswordModal) adminPasswordModal.style.display = "flex";
    });

    document.getElementById("btnCancelAdminPassword")?.addEventListener("click", () => {
        if (adminPasswordModal) adminPasswordModal.style.display = "none";
    });

    document.getElementById("adminPasswordForm")?.addEventListener("submit", (e) => {
        e.preventDefault();
        const pwd = document.getElementById("adminPasswordInput")?.value;
        if (pwd === db.adminPassword) {
            if (adminPasswordModal) adminPasswordModal.style.display = "none";
            if (adminModal) adminModal.style.display = "flex";

            // Populate Admin Forms & Tables
            populateAdminDropdowns();
            renderAdminStudentList();
            renderAdminRewardsList();
        } else {
            alert("Kata laluan Admin salah!");
        }
    });

    document.getElementById("closeAdminBtn")?.addEventListener("click", () => {
        if (adminModal) adminModal.style.display = "none";
    });

    // Admin Tab Toggle
    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
            document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

            const targetBtn = e.target;
            targetBtn.classList.add("active");
            const tabId = targetBtn.getAttribute("data-tab");
            if (tabId) document.getElementById(tabId)?.classList.add("active");
        });
    });

    // Admin Form: Add Student with Photo Upload
    document.getElementById("formAddStudent")?.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = document.getElementById("adminNewStudentName")?.value.trim();
        const tingkatan = document.getElementById("adminNewStudentTingkatan")?.value;
        const kelas = document.getElementById("adminNewStudentKelas")?.value;
        const points = parseInt(document.getElementById("adminNewStudentPoints")?.value) || 0;
        const photoFile = document.getElementById("adminNewStudentPhoto")?.files[0];

        if (!name) {
            alert("Sila masukkan nama pelajar!");
            return;
        }

        const createStudent = (photoData) => {
            const newStudent = {
                id: "st_" + Date.now(),
                name,
                tingkatan,
                kelas,
                points,
                photo: photoData || "",
                history: []
            };

            db.students.push(newStudent);
            saveDataToStorage(db);
            alert(`✅ Pelajar ${name} berjaya didaftarkan!`);
            e.target.reset();
            renderAdminStudentList();
            populateStudentLoginDropdowns();
        };

        if (photoFile) {
            const reader = new FileReader();
            reader.onload = function (event) {
                createStudent(event.target.result);
            };
            reader.readAsDataURL(photoFile);
        } else {
            createStudent("");
        }
    });

    // Admin Form: Add Reward Item
    document.getElementById("formAddRewardItem")?.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = document.getElementById("adminRewardName")?.value.trim();
        const pointsNeeded = parseInt(document.getElementById("adminRewardPoints")?.value) || 0;
        const imageFile = document.getElementById("adminRewardImageFile")?.files[0];

        if (!name) {
            alert("Sila masukkan nama barangan ganjaran!");
            return;
        }

        const createReward = (imageData) => {
            const newReward = {
                id: "rew_" + Date.now(),
                name,
                pointsNeeded,
                image: imageData || "https://via.placeholder.com/150/10b981/ffffff?text=" + encodeURIComponent(name)
            };

            db.rewards.push(newReward);
            saveDataToStorage(db);
            alert(`✅ Barang ganjaran "${name}" berjaya ditambah!`);
            e.target.reset();
            renderAdminRewardsList();
        };

        if (imageFile) {
            const reader = new FileReader();
            reader.onload = function (event) {
                createReward(event.target.result);
            };
            reader.readAsDataURL(imageFile);
        } else {
            createReward("");
        }
    });

    // Admin Helper: Reset Database
    document.getElementById("btnResetDatabase")?.addEventListener("click", () => {
        if (confirm("⚠️ Amaran: Ini akan memadamkan semua data pelajar & rekod! Anda pasti?")) {
            localStorage.removeItem("SEMNASH_ECO_PULSE_DATA");
            db = loadDataFromStorage();
            alert("Database telah di-reset!");
            renderAdminStudentList();
            renderAdminRewardsList();
            populateStudentLoginDropdowns();
        }
    });
});

function populateAdminDropdowns() {
    const selTingkatan = document.getElementById("adminNewStudentTingkatan");
    const selKelas = document.getElementById("adminNewStudentKelas");

    if (selTingkatan) {
        selTingkatan.innerHTML = db.tingkatanList.map(t => `<option value="${t}">${t}</option>`).join("");
    }
    if (selKelas) {
        selKelas.innerHTML = db.kelasList.map(k => `<option value="${k}">${k}</option>`).join("");
    }
}