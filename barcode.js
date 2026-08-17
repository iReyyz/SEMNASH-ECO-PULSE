/**
 * SEMNASH ECO-PULSE - Barcode Scanner & Inventory Management Module
 * Mengendalikan imbasan kamera HTML5, input manual, dan pengesahan 1-Time Barcode.
 */

import { dataManager } from './data.js';

export class BarcodeScanner {
    constructor() {
        this.videoElement = null;
        this.canvasElement = null;
        this.stream = null;
        this.isScanning = false;
        this.onScanCallback = null;
        this.scanInterval = null;
    }

    init(videoEl, canvasEl, onScan) {
        this.videoElement = videoEl;
        this.canvasElement = canvasEl;
        this.onScanCallback = onScan;
    }

    async startCamera() {
        if (!this.videoElement) return false;

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
            });
            this.videoElement.srcObject = this.stream;
            await this.videoElement.play();
            this.isScanning = true;
            this.startScanLoop();
            return true;
        } catch (error) {
            console.warn('Gagal membuka kamera (mungkin tiada kebenaran/kamera):', error);
            this.isScanning = false;
            return false;
        }
    }

    stopCamera() {
        this.isScanning = false;
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = null;
        }
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.videoElement) {
            this.videoElement.srcObject = null;
        }
    }

    startScanLoop() {
        // High compatibility frame sampling for visual scanning simulation & Native BarcodeDetector API if available
        if ('BarcodeDetector' in window) {
            const barcodeDetector = new window.BarcodeDetector({ formats: ['code_128', 'code_39', 'ean_13', 'qr_code', 'upc_a'] });
            this.scanInterval = setInterval(async () => {
                if (!this.isScanning || !this.videoElement || this.videoElement.readyState !== 4) return;
                try {
                    const barcodes = await barcodeDetector.detect(this.videoElement);
                    if (barcodes.length > 0 && this.onScanCallback) {
                        const rawCode = barcodes[0].rawValue;
                        this.stopCamera();
                        this.onScanCallback(rawCode);
                    }
                } catch (e) {
                    // Ignore frame detection error
                }
            }, 300);
        }
    }

    /**
     * Memproses Barkod yang diimbas (sama ada dari Kamera atau Input Manual)
     * Menguatkuasakan Peraturan 1 BARCODE = 1 KALI GUNA
     */
    processBarcode(rawCode, currentStudent) {
        if (!rawCode || !rawCode.trim()) {
            return {
                success: false,
                title: 'Barkod Kosong',
                message: 'Sila masukkan nombor barkod yang sah.'
            };
        }

        const cleanCode = rawCode.trim();
        const validation = dataManager.validateBarcode(cleanCode);

        if (!validation.valid) {
            if (validation.reason === 'BARKOD_SUDAH_DIGUNA') {
                return {
                    success: false,
                    title: 'BARKOD TELAH DIGUNAKAN!',
                    message: validation.message,
                    isUsed: true
                };
            } else {
                return {
                    success: false,
                    title: 'BARKOD TIDAK DITEMUI!',
                    message: validation.message,
                    isInvalid: true
                };
            }
        }

        // Valid and available barcode!
        return {
            success: true,
            title: 'BARKOD DISAHKAN!',
            barcode: validation.barcode,
            student: currentStudent,
            message: `Sampah: ${validation.barcode.category} (${validation.barcode.points} Mata Ganjaran)`
        };
    }

    /**
     * Menjana kod barkod automatik untuk Cikgu
     */
    generateRandomBarcode(categoryPrefix = 'ECO-BOTOL') {
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        return `${categoryPrefix}-${randomNum}`;
    }
}

export const barcodeScanner = new BarcodeScanner();
