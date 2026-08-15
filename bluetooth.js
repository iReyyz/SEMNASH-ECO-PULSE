/**
 * SEMNASH ECO-PULSE - Web Bluetooth & Simulator Module
 * Mengendalikan komunikasi Bluetooth LE / Serial (HC-05/HC-06/ESP32) dengan sistem Tong Sampah Arduino
 */

export class BluetoothManager {
    constructor() {
        this.device = null;
        this.server = null;
        this.characteristic = null;
        this.isConnected = false;
        this.isSimulated = true; // Subscribed simulator by default for safe browser demo
        this.onStatusChangeCallbacks = [];
        this.onLogCallbacks = [];

        // Standard Serial Bluetooth UUIDs for HC-05/HC-06/ESP32
        this.SERIAL_SERVICE_UUID = '00001101-0000-1000-8000-00805f9b34fb'; // SPP Standard
        this.CUSTOM_SERVICE_UUID = '0000ffe0-0000-1000-8000-00805f9b34fb';  // HM-10 / Nordic
        this.CUSTOM_CHAR_UUID    = '0000ffe1-0000-1000-8000-00805f9b34fb';
    }

    onStatusChange(callback) {
        this.onStatusChangeCallbacks.push(callback);
    }

    onLog(callback) {
        this.onLogCallbacks.push(callback);
    }

    log(msg, type = 'info') {
        const timestamp = new Date().toLocaleTimeString('ms-MY');
        const formatted = `[BT ${timestamp}] ${msg}`;
        console.log(formatted);
        this.onLogCallbacks.forEach(cb => cb(formatted, type));
    }

    notifyStatus(statusText, connected = false) {
        this.isConnected = connected;
        this.onStatusChangeCallbacks.forEach(cb => cb({ text: statusText, connected, simulated: this.isSimulated }));
    }

    /**
     * Mula penyambungan ke Peranti Bluetooth Fizikal (HC-05/HC-06/ESP32)
     */
    async connectPhysicalBluetooth() {
        if (!navigator.bluetooth) {
            this.log('Web Bluetooth API tidak disokong oleh browser ini! Menggunakan Mod Simulator.', 'warning');
            return this.enableSimulator('Browser tiada sokongan Web Bluetooth (Menggunakan Simulator)');
        }

        try {
            this.log('Mencari peranti Bluetooth Arduino (HC-05 / HC-06 / ESP32)...');
            this.notifyStatus('Mencari peranti...', false);

            this.device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: [this.SERIAL_SERVICE_UUID, this.CUSTOM_SERVICE_UUID]
            });

            this.device.addEventListener('gattserverdisconnected', () => {
                this.log('Sambungan Bluetooth terputus!', 'error');
                this.notifyStatus('Terputus Sambungan', false);
            });

            this.log(`Menyambung ke peranti: ${this.device.name || 'Arduino BT'}...`);
            this.server = await this.device.gatt.connect();

            // Try resolving service & characteristic
            let service;
            try {
                service = await this.server.getPrimaryService(this.CUSTOM_SERVICE_UUID);
                this.characteristic = await service.getCharacteristic(this.CUSTOM_CHAR_UUID);
            } catch (err) {
                this.log('Mencuba perkhidmatan SPP alternatif...');
                service = await this.server.getPrimaryService(this.SERIAL_SERVICE_UUID);
                const chars = await service.getCharacteristics();
                this.characteristic = chars[0];
            }

            this.isSimulated = false;
            this.log(`Berjaya menyambung ke ${this.device.name}!`, 'success');
            this.notifyStatus(`Terhubung: ${this.device.name}`, true);
            return true;

        } catch (error) {
            this.log(`Ralat sambungan Bluetooth: ${error.message}`, 'error');
            this.log('Mengaktifkan Mod Simulasi Bluetooth automatik...', 'info');
            return this.enableSimulator('Mod Simulator Aktif');
        }
    }

    enableSimulator(message = 'Mod Simulator Arduino Aktif') {
        this.isSimulated = true;
        this.isConnected = true;
        this.log(`[SIMULATOR] ${message}`, 'success');
        this.notifyStatus('Simulator Arduino (Connected)', true);
        return true;
    }

    disconnect() {
        if (this.device && this.device.gatt.connected) {
            this.device.gatt.disconnect();
        }
        this.isSimulated = true;
        this.notifyStatus('Terputus Sambungan', false);
        this.log('Bluetooth terputus sambungan.', 'info');
    }

    /**
     * Menghantar isyarat ke Arduino untuk membuka Penutup Tong Sampah
     * Sends 'O' (Open) or 'C' (Close) to Servo Motor control
     */
    async openBinLid(durationMs = 5000) {
        this.log('Menghantar isyarat "OPEN" (O) ke Arduino...');

        if (this.isSimulated) {
            return this.simulateBinOpening(durationMs);
        }

        if (!this.characteristic) {
            throw new Error('Tiada sambungan Bluetooth aktif!');
        }

        try {
            const encoder = new TextEncoder();
            // Send 'O' command to open lid
            await this.characteristic.writeValue(encoder.encode('O\n'));
            this.log('Isyarat "O" (Buka Penutup) berjaya dihantar ke Arduino!', 'success');

            // Set auto close after duration
            setTimeout(async () => {
                try {
                    await this.characteristic.writeValue(encoder.encode('C\n'));
                    this.log('Isyarat "C" (Tutup Penutup) dihantar automatik.', 'info');
                } catch (e) {
                    console.error('Ralat tutup penutup:', e);
                }
            }, durationMs);

            return true;
        } catch (error) {
            this.log(`Gagal menghantar isyarat Bluetooth: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Simulator visual untuk pergerakan Penutup Tong Sampah Arduino
     */
    simulateBinOpening(durationMs = 5000) {
        return new Promise((resolve) => {
            this.log('[SIMULATOR ARDUINO] Servo Motor memutar penutup ke 90° (OPEN)...', 'success');
            
            // Visual element update if simulator UI is mounted
            const binSimElement = document.getElementById('arduinoBinLidSim');
            const binStatusBadge = document.getElementById('arduinoBinStatusBadge');

            if (binSimElement) {
                binSimElement.classList.add('bin-lid-open');
            }
            if (binStatusBadge) {
                binStatusBadge.textContent = 'TONG DIBUKA (SERVO 90°)';
                binStatusBadge.className = 'bin-status-open';
            }

            setTimeout(() => {
                this.log('[SIMULATOR ARDUINO] Pemasa tamat. Servo Motor memutar penutup ke 0° (CLOSE)...', 'info');
                if (binSimElement) {
                    binSimElement.classList.remove('bin-lid-open');
                }
                if (binStatusBadge) {
                    binStatusBadge.textContent = 'TONG DITUTUP (SERVO 0°)';
                    binStatusBadge.className = 'bin-status-closed';
                }
                resolve(true);
            }, durationMs);
        });
    }
}

export const bluetoothManager = new BluetoothManager();
