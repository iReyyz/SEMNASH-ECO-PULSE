/**
 * SEMNASH ECO-PULSE - Consolidated Data Manager
 * Menguruskan Pelajar, Barkod 1-Time Use, Rekod Ganjaran, dan Katalog Penebusan Item.
 */

const ADMIN_PASSWORD = 'Semnash2026';
const STORAGE_KEYS = {
    STUDENTS: 'semnash_eco_students_v2',
    BARCODES: 'semnash_eco_barcodes_v2',
    LOGS: 'semnash_eco_logs_v2',
    BLUETOOTH_CONFIG: 'semnash_eco_bt_config_v2',
    PROMO_VIDEO: 'semnash_eco_promo_video_v2',
    REWARDS: 'semnash_eco_rewards_v2'
};

// Permulaan senarai pelajar (Boleh dikosongkan mengikut arahan pengguna, atau bermula kosong jika tiada data)
const INITIAL_STUDENTS = [
    {
        id: 'STD-1001',
        nama: 'Muhammad Amirul Hafiz',
        tingkatan: 'Tingkatan 4',
        kelas: '4 Cemerlang',
        points: 150,
        avatar: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%2310b981"/><circle cx="50" cy="38" r="20" fill="%23ffffff"/><path d="M20,85 C20,62 35,55 50,55 C65,55 80,62 80,85 Z" fill="%23ffffff"/></svg>',
        badge: 'Eco Warrior'
    },
    {
        id: 'STD-1002',
        nama: 'Nur Aisyah Humaira',
        tingkatan: 'Tingkatan 5',
        kelas: '5 Inovatif',
        points: 240,
        avatar: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%2306b6d4"/><circle cx="50" cy="38" r="20" fill="%23ffffff"/><path d="M22,85 C22,64 36,56 50,56 C64,56 78,64 78,85 Z" fill="%23ffffff"/><path d="M30,35 Q50,15 70,35 Z" fill="%230e7490"/></svg>',
        badge: 'Green Hero'
    }
];

const INITIAL_BARCODES = [
    { code: 'ECO-BOTOL-001', category: 'Botol Plastik', points: 10, status: 'available', usedBy: null, usedAt: null },
    { code: 'ECO-TIN-101', category: 'Tin Aluminium', points: 20, status: 'available', usedBy: null, usedAt: null },
    { code: 'ECO-KERTAS-201', category: 'Kertas / Kotak', points: 15, status: 'available', usedBy: null, usedAt: null }
];

const INITIAL_REWARDS = [
    { id: 'RWD-01', name: 'Pensel Eco-Pulse', cost: 20, icon: '✏️', category: 'Alat Tulis' },
    { id: 'RWD-02', name: 'Buku Nota Kitar Semula', cost: 50, icon: '📓', category: 'Alat Tulis' },
    { id: 'RWD-03', name: 'Keychain Eco Mascot', cost: 30, icon: '🔑', category: 'Aksesori' },
    { id: 'RWD-04', name: 'Botol Air SEMNASH', cost: 100, icon: '🥤', category: 'Cenderamata' },
    { id: 'RWD-05', name: 'Lanyard Eco-Pulse Neon', cost: 150, icon: '🎗️', category: 'Aksesori' },
    { id: 'RWD-06', name: 'Beg Tote Canvas Eco', cost: 120, icon: '🛍️', category: 'Cenderamata' }
];

const LIST_TINGKATAN = ['Tingkatan 1', 'Tingkatan 2', 'Tingkatan 3', 'Tingkatan 4', 'Tingkatan 5', 'Pra-U / Tingkatan 6'];
const LIST_KELAS = [
    '1 Amanah', '1 Bestari', '1 Cemerlang', '1 Harmoni', '1 Inovatif',
    '2 Amanah', '2 Bestari', '2 Cemerlang', '2 Harmoni', '2 Inovatif',
    '3 Amanah', '3 Bestari', '3 Cemerlang', '3 Harmoni', '3 Inovatif',
    '4 Amanah', '4 Bestari', '4 Cemerlang', '4 Harmoni', '4 Inovatif',
    '5 Amanah', '5 Bestari', '5 Cemerlang', '5 Harmoni', '5 Inovatif',
    'Pra-U Atas', 'Pra-U Bawah'
];

class DataManager {
    constructor() {
        this.initStorage();
    }

    initStorage() {
        if (!localStorage.getItem(STORAGE_KEYS.STUDENTS)) {
            localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(INITIAL_STUDENTS));
        }
        if (!localStorage.getItem(STORAGE_KEYS.BARCODES)) {
            localStorage.setItem(STORAGE_KEYS.BARCODES, JSON.stringify(INITIAL_BARCODES));
        }
        if (!localStorage.getItem(STORAGE_KEYS.LOGS)) {
            localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify([]));
        }
        if (!localStorage.getItem(STORAGE_KEYS.REWARDS)) {
            localStorage.setItem(STORAGE_KEYS.REWARDS, JSON.stringify(INITIAL_REWARDS));
        }
    }

    // --- STUDENT MANAGEMENT ---
    getStudents() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.STUDENTS)) || [];
        } catch (e) {
            return [];
        }
    }

    saveStudents(students) {
        localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    }

    getStudentById(id) {
        return this.getStudents().find(s => s.id === id);
    }

    getStudentsByTingkatanAndKelas(tingkatan, kelas) {
        return this.getStudents().filter(s => {
            const matchTingkatan = !tingkatan || s.tingkatan === tingkatan;
            const matchKelas = !kelas || s.kelas === kelas;
            return matchTingkatan && matchKelas;
        });
    }

    addStudent(studentData) {
        const students = this.getStudents();
        const newStudent = {
            id: 'STD-' + Math.floor(1000 + Math.random() * 9000),
            nama: studentData.nama.trim(),
            tingkatan: studentData.tingkatan,
            kelas: studentData.kelas,
            points: parseInt(studentData.points || 0, 10),
            avatar: studentData.avatar || this.generateDefaultAvatar(studentData.nama),
            badge: this.calculateBadge(parseInt(studentData.points || 0, 10))
        };
        students.push(newStudent);
        this.saveStudents(students);
        return newStudent;
    }

    deleteStudent(studentId) {
        const students = this.getStudents().filter(s => s.id !== studentId);
        this.saveStudents(students);
    }

    addPointsToStudent(studentId, pointsToAdd) {
        const students = this.getStudents();
        const index = students.findIndex(s => s.id === studentId);
        if (index !== -1) {
            const oldPoints = students[index].points;
            students[index].points += pointsToAdd;
            students[index].badge = this.calculateBadge(students[index].points);
            this.saveStudents(students);
            return {
                student: students[index],
                previousPoints: oldPoints,
                addedPoints: pointsToAdd,
                newTotal: students[index].points
            };
        }
        return null;
    }

    deductPointsFromStudent(studentId, pointsToDeduct) {
        const students = this.getStudents();
        const index = students.findIndex(s => s.id === studentId);
        if (index !== -1) {
            if (students[index].points < pointsToDeduct) {
                throw new Error('Mata ganjaran tidak mencukupi untuk penebusan ini!');
            }
            students[index].points -= pointsToDeduct;
            students[index].badge = this.calculateBadge(students[index].points);
            this.saveStudents(students);
            return students[index];
        }
        return null;
    }

    calculateBadge(points) {
        if (points >= 300) return 'Eco Champion';
        if (points >= 200) return 'Green Hero';
        if (points >= 120) return 'Eco Warrior';
        if (points >= 60) return 'Eco Guardian';
        return 'Junior Recycler';
    }

    generateDefaultAvatar(name) {
        const colors = ['%2310b981', '%2306b6d4', '%233b82f6', '%238b5cf6', '%23ec4899', '%23f59e0b'];
        const color = colors[name.length % colors.length];
        return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="${color}"/><circle cx="50" cy="38" r="20" fill="%23ffffff"/><path d="M20,85 C20,62 35,55 50,55 C65,55 80,62 80,85 Z" fill="%23ffffff"/></svg>`;
    }

    // --- BARCODE MANAGEMENT ---
    getBarcodes() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.BARCODES)) || INITIAL_BARCODES;
        } catch (e) {
            return INITIAL_BARCODES;
        }
    }

    saveBarcodes(barcodes) {
        localStorage.setItem(STORAGE_KEYS.BARCODES, JSON.stringify(barcodes));
    }

    findBarcode(code) {
        const cleanCode = code.trim().toUpperCase();
        return this.getBarcodes().find(b => b.code.toUpperCase() === cleanCode);
    }

    validateBarcode(code) {
        const barcode = this.findBarcode(code);
        if (!barcode) {
            return { valid: false, reason: 'BARKOD_TIDAK_WUDJUD', message: 'Barkod ini belum berdaftar dalam sistem!' };
        }
        if (barcode.status === 'used') {
            return { 
                valid: false, 
                reason: 'BARKOD_SUDAH_DIGUNA', 
                message: `Barkod telah diguna oleh ${barcode.usedBy || 'pelajar lain'} pada ${barcode.usedAt || 'sesi lepas'}. 1 barkod hanya 1 kali guna!` 
            };
        }
        return { valid: true, barcode: barcode };
    }

    markBarcodeAsUsed(code, studentName) {
        const barcodes = this.getBarcodes();
        const cleanCode = code.trim().toUpperCase();
        const index = barcodes.findIndex(b => b.code.toUpperCase() === cleanCode);
        if (index !== -1) {
            barcodes[index].status = 'used';
            barcodes[index].usedBy = studentName;
            barcodes[index].usedAt = new Date().toLocaleString('ms-MY', { dateStyle: 'short', timeStyle: 'short' });
            this.saveBarcodes(barcodes);
            return barcodes[index];
        }
        return null;
    }

    resetBarcodeStatus(code) {
        const barcodes = this.getBarcodes();
        const cleanCode = code.trim().toUpperCase();
        const index = barcodes.findIndex(b => b.code.toUpperCase() === cleanCode);
        if (index !== -1) {
            barcodes[index].status = 'available';
            barcodes[index].usedBy = null;
            barcodes[index].usedAt = null;
            this.saveBarcodes(barcodes);
            return barcodes[index];
        }
        return null;
    }

    deleteBarcode(code) {
        const barcodes = this.getBarcodes().filter(b => b.code.toUpperCase() !== code.trim().toUpperCase());
        this.saveBarcodes(barcodes);
    }

    addBarcode(barcodeData) {
        const barcodes = this.getBarcodes();
        const code = barcodeData.code.trim().toUpperCase();
        if (barcodes.some(b => b.code.toUpperCase() === code)) {
            throw new Error('Barkod sudah wujud dalam pangkalan data!');
        }
        const newBarcode = {
            code: code,
            category: barcodeData.category || 'Sampah Kitar Semula',
            points: parseInt(barcodeData.points || 10, 10),
            status: 'available',
            usedBy: null,
            usedAt: null
        };
        barcodes.unshift(newBarcode);
        this.saveBarcodes(barcodes);
        return newBarcode;
    }

    // --- REWARD ITEMS CATALOG MANAGEMENT ---
    getRewards() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEYS.REWARDS)) || INITIAL_REWARDS;
        } catch (e) {
            return INITIAL_REWARDS;
        }
    }

    saveRewards(rewards) {
        localStorage.setItem(STORAGE_KEYS.REWARDS, JSON.stringify(rewards));
    }

    addRewardItem(itemData) {
        const rewards = this.getRewards();
        const newItem = {
            id: 'RWD-' + Math.floor(10 + Math.random() * 90),
            name: itemData.name.trim(),
            cost: parseInt(itemData.cost || 10, 10),
            icon: itemData.icon || '🎁',
            category: itemData.category || 'Cenderamata'
        };
        rewards.push(newItem);
        this.saveRewards(rewards);
        return newItem;
    }

    deleteRewardItem(id) {
        const rewards = this.getRewards().filter(r => r.id !== id);
        this.saveRewards(rewards);
    }

    // --- DISPOSAL & REDEMPTION LOGS ---
    addLog(logEntry) {
        const logs = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGS)) || [];
        const entry = {
            id: 'LOG-' + Date.now(),
            studentId: logEntry.studentId,
            studentName: logEntry.studentName,
            tingkatan: logEntry.tingkatan,
            kelas: logEntry.kelas,
            barcode: logEntry.barcode || '-',
            category: logEntry.category,
            type: logEntry.type || 'RECYCLE', // 'RECYCLE' or 'REDEMPTION'
            points: logEntry.points,
            timestamp: new Date().toLocaleString('ms-MY')
        };
        logs.unshift(entry);
        localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
        return entry;
    }

    getLogs() {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.LOGS)) || [];
    }

    resetAllData() {
        localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.BARCODES, JSON.stringify(INITIAL_BARCODES));
        localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.REWARDS, JSON.stringify(INITIAL_REWARDS));
        localStorage.removeItem(STORAGE_KEYS.PROMO_VIDEO);
    }

    savePromoVideo(videoSrc) {
        localStorage.setItem(STORAGE_KEYS.PROMO_VIDEO, videoSrc);
    }

    getPromoVideo() {
        return localStorage.getItem(STORAGE_KEYS.PROMO_VIDEO);
    }

    resetPromoVideo() {
        localStorage.removeItem(STORAGE_KEYS.PROMO_VIDEO);
    }
}

const dataManager = new DataManager();
