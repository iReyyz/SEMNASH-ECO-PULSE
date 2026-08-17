// ============================================================================
// SEMNASH ECO-PULSE - Sistem Kitar Semula Pintar & USB Serial / Bluetooth Bin
// Kod Arduino UNO / ESP32 dengan Sokongan Kabel USB Serial & Web Serial API
// ============================================================================

// Tetapan Mod Operasi ESP32 (Pilih salah satu 1 dan satu lagi 0 untuk memori 1.3MB standard)
#define ENABLE_WIFI        1 // 1 = Aktifkan Wi-Fi & REST API WebServer (Laluan Utama Web App ESP32)
#define ENABLE_BLUETOOTH   0 // Set 0 untuk mengelakkan ralat "Sketch too big" pada ESP32

#if defined(ESP32) || defined(ARDUINO_ARCH_ESP32)
  #if ENABLE_WIFI
    #include <WiFi.h>
    #include <WebServer.h>
    #include <ESPmDNS.h>

    // Tetapan Wi-Fi Router (Station Mode)
    const char *ssid = "fatihah";
    const char *password = "fatihah00";

    // Tetapan Wi-Fi Hotspot (Access Point Mode jika tiada router)
    const char *ap_ssid = "fatihah";
    const char *ap_password = "fatihah00";

    WebServer server(80);
  #endif

  #if ENABLE_BLUETOOTH
    #include <BluetoothSerial.h>
    BluetoothSerial SerialBT;
  #endif

  #include <ESP32Servo.h>
  Servo binServo;

  #define SERVO_PIN      13
  #define BUZZER_PIN     4
  #define RGB_RED_PIN    25
  #define RGB_GREEN_PIN  26
  #define RGB_BLUE_PIN   27
  #define BUTTON_PIN     14 // Pin Butang Fizikal Buka Tong (GPIO 14 & GND)
  #define SERIAL_BAUD    9600
#else
  #include <Servo.h>
  #include <SoftwareSerial.h>

  #define BT_RX_PIN      10
  #define BT_TX_PIN      11
  #define SERVO_PIN      9
  #define BUZZER_PIN     8
  #define RGB_RED_PIN    13
  #define RGB_GREEN_PIN  12
  #define RGB_BLUE_PIN   7
  #define BUTTON_PIN     2 // Butang Fizikal Arduino UNO (Pin 2 & GND)
  #define SERIAL_BAUD    9600

  SoftwareSerial bluetoothSerial(BT_RX_PIN, BT_TX_PIN);
  Servo binServo;
#endif

// Sudut Pergerakan Servo Motor Penutup Tong
#define SERVO_LID_CLOSED 0    // Penutup Ditutup (0 Darjah)
#define SERVO_LID_OPEN   90   // Penutup Dibuka (90 Darjah)
#define AUTO_CLOSE_DELAY 5000 // Auto close selepas 5 saat (5000 ms)

bool isLidOpen = false;
unsigned long openTimestamp = 0;

void openTrashLid();
void closeTrashLid();
void toggleTrashLid();
void setRGBColor(bool red, bool green, bool blue);
void processIncomingCommand(char command);

#if defined(ESP32) && ENABLE_WIFI
void sendCORSHeaders() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
}

void handleOptions() {
  sendCORSHeaders();
  server.send(204);
}

void handleRoot() {
  sendCORSHeaders();
  String html = F("<!DOCTYPE html><html><head><meta name='viewport' content='width=device-width, initial-scale=1'>"
                  "<title>SEMNASH ECO-PULSE ESP32</title>"
                  "<style>body{font-family:sans-serif;text-align:center;margin-top:30px;background:#0f172a;color:#f8fafc;}"
                  ".card{background:#1e293b;border:1px solid #10b981;padding:20px;border-radius:12px;display:inline-block;}"
                  ".btn{padding:12px 24px;margin:8px;font-size:16px;font-weight:bold;color:#fff;border:none;border-radius:8px;text-decoration:none;cursor:pointer;}"
                  ".open{background:#10b981;} .close{background:#ef4444;} .toggle{background:#38bdf8;}</style></head><body>"
                  "<div class='card'><h2>SEMNASH ECO-PULSE USB/WIFI BIN</h2>"
                  "<p>Status: <strong>");
  html += (isLidOpen ? F("DIBUKA (90&deg;)") : F("DITUTUP (0&deg;)"));
  html += F("</strong></p>"
            "<a href='/open'><button class='btn open'>Buka Tong</button></a>"
            "<a href='/close'><button class='btn close'>Tutup Tong</button></a>"
            "<br><a href='/toggle'><button class='btn toggle'>Tukar Status</button></a>"
            "</div></body></html>");
  server.send(200, "text/html", html);
}

void handleOpen() {
  sendCORSHeaders();
  openTrashLid();
  if (server.hasArg("json") || server.header("Accept").indexOf("application/json") >= 0) {
    server.send(200, "application/json", F("{\"success\":true,\"lidOpen\":true}"));
  } else {
    server.sendHeader("Location", "/");
    server.send(303);
  }
}

void handleClose() {
  sendCORSHeaders();
  closeTrashLid();
  if (server.hasArg("json") || server.header("Accept").indexOf("application/json") >= 0) {
    server.send(200, "application/json", F("{\"success\":true,\"lidOpen\":false}"));
  } else {
    server.sendHeader("Location", "/");
    server.send(303);
  }
}

void handleToggle() {
  sendCORSHeaders();
  toggleTrashLid();
  server.send(200, "application/json", isLidOpen ? F("{\"success\":true,\"lidOpen\":true}") : F("{\"success\":true,\"lidOpen\":false}"));
}

void handleStatus() {
  sendCORSHeaders();
  String json = F("{\"status\":\"OK\",\"device\":\"SEMNASH_ECOPULSE_BIN\",\"lidOpen\":");
  json += (isLidOpen ? "true" : "false");
  json += F(",\"ip\":\"");
  json += (WiFi.status() == WL_CONNECTED ? WiFi.localIP().toString() : WiFi.softAPIP().toString());
  json += F("\",\"mode\":\"");
  json += (WiFi.status() == WL_CONNECTED ? "STA" : "AP");
  json += F("\"}");
  server.send(200, "application/json", json);
}
#endif

void setRGBColor(bool red, bool green, bool blue) {
  digitalWrite(RGB_RED_PIN, red ? HIGH : LOW);
  digitalWrite(RGB_GREEN_PIN, green ? HIGH : LOW);
  digitalWrite(RGB_BLUE_PIN, blue ? HIGH : LOW);
}

void setup() {
  // 1. INISIALISASI USB SERIAL COMMUNICATION
  Serial.begin(SERIAL_BAUD);
  delay(300);

#if defined(ESP32) || defined(ARDUINO_ARCH_ESP32)
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  ESP32PWM::allocateTimer(2);
  ESP32PWM::allocateTimer(3);
  binServo.setPeriodHertz(50);
  binServo.attach(SERVO_PIN, 500, 2400);

  #if ENABLE_BLUETOOTH
    SerialBT.begin("SEMNASH_ECOPULSE_BIN");
    Serial.println(F("[ESP32 BT] Bluetooth SPP Aktif: SEMNASH_ECOPULSE_BIN"));
  #endif
#else
  bluetoothSerial.begin(9600);
  binServo.attach(SERVO_PIN);
#endif

  binServo.write(SERVO_LID_CLOSED);

  pinMode(RGB_RED_PIN, OUTPUT);
  pinMode(RGB_GREEN_PIN, OUTPUT);
  pinMode(RGB_BLUE_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);

  setRGBColor(true, false, false); // Merah = Tong Ditutup

  Serial.println(F("\n=========================================="));
  Serial.println(F("SEMNASH ECO-PULSE USB & Bluetooth Bin Ready"));
  Serial.println(F("=========================================="));
  Serial.print(F("USB Serial Baud Rate: "));
  Serial.println(SERIAL_BAUD);
  Serial.println(F("Isyarat USB Diterima: 'O'/ENTER=Buka, 'C'=Tutup, 'T'=Toggle"));

#if defined(ESP32) && ENABLE_WIFI
  setRGBColor(false, false, true); // LED Biru = Connecting WiFi
  Serial.print(F("Menyambung ke WiFi Router: "));
  Serial.println(ssid);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 15) {
    delay(400);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(F("\n[SUCCESS] ESP32 Terhubung ke Wi-Fi Router!"));
    Serial.print(F("IP Address (STA): http://"));
    Serial.println(WiFi.localIP());
    setRGBColor(true, false, false);
  } else {
    Serial.println(F("\n[INFO] Gagal menyambung ke Router. Mengaktifkan Wi-Fi Hotspot (Access Point)..."));
    WiFi.mode(WIFI_AP);
    WiFi.softAP(ap_ssid, ap_password);
    Serial.print(F("[AP MODE] Wi-Fi Hotspot Aktif: "));
    Serial.println(ap_ssid);
    Serial.print(F("IP Address (AP): http://"));
    Serial.println(WiFi.softAPIP());
    setRGBColor(true, false, false);
  }

  if (MDNS.begin("ecopulse")) {
    Serial.println(F("[mDNS] Domain Aktif: http://ecopulse.local"));
  }

  server.on("/", handleRoot);
  server.on("/open", handleOpen);
  server.on("/close", handleClose);
  server.on("/toggle", handleToggle);
  server.on("/status", handleStatus);
  server.on("/api/status", handleStatus);
  server.on("/api/open", handleOpen);
  server.on("/api/close", handleClose);
  server.on("/open", HTTP_OPTIONS, handleOptions);
  server.on("/close", HTTP_OPTIONS, handleOptions);
  server.begin();
  Serial.println(F("[HTTP] Web Server & REST API Aktif pada Port 80."));
#endif

  // Bunyi Startup Beep
  tone(BUZZER_PIN, 1000, 150);
  delay(150);
  tone(BUZZER_PIN, 1500, 200);
}

void loop() {
  // 1. SEMAK BUTANG FIZIKAL HARDWARE (PIN 14 / PIN 2 DITEKAN KE GND)
  if (digitalRead(BUTTON_PIN) == LOW) {
    delay(40); // Debounce
    if (digitalRead(BUTTON_PIN) == LOW) {
      Serial.println(F("[HARDWARE BUTTON] Butang Ditekan! Membuka Tong..."));
      openTrashLid();
      while (digitalRead(BUTTON_PIN) == LOW) delay(10);
    }
  }

  // 2. PEMASA AUTO-CLOSE 5 SAAT (BOLEH UNTUK ESP32 & ARDUINO UNO)
  if (isLidOpen && (millis() - openTimestamp >= AUTO_CLOSE_DELAY)) {
    Serial.println(F("[AUTO-CLOSE] Pemasa 5s Tamat. Menutup Tong Sampah..."));
    closeTrashLid();
  }

  // 3. SEMAK ISYARAT DARI KABEL USB SERIAL (DARI WEB APPLICATION / ENTER KEY)
  if (Serial.available() > 0) {
    char command = Serial.read();
    Serial.print(F("[USB SIGNAL RECEIVED]: '"));
    Serial.print(command);
    Serial.println(F("'"));
    processIncomingCommand(command);

    // Bersihkan baki aksara \n / \r dari buffer USB Serial
    while (Serial.available() > 0 && (Serial.peek() == '\n' || Serial.peek() == '\r')) {
      Serial.read();
    }
  }

  // 4. SEMAK ISYARAT DARI BLUETOOTH (JIKA AKTIF)
#if defined(ESP32)
  #if ENABLE_WIFI
    server.handleClient();
  #endif

  #if ENABLE_BLUETOOTH
    if (SerialBT.available() > 0) {
      char command = SerialBT.read();
      Serial.print(F("[BT SIGNAL RECEIVED]: '"));
      Serial.print(command);
      Serial.println(F("'"));
      processIncomingCommand(command);
      while (SerialBT.available() > 0 && (SerialBT.peek() == '\n' || SerialBT.peek() == '\r')) {
        SerialBT.read();
      }
    }
  #endif
#else
  if (bluetoothSerial.available() > 0) {
    char command = bluetoothSerial.read();
    processIncomingCommand(command);
    while (bluetoothSerial.available() > 0 && (bluetoothSerial.peek() == '\n' || bluetoothSerial.peek() == '\r')) {
      bluetoothSerial.read();
    }
  }
#endif
}

/**
 * Memproses aksara arahan dari USB Serial, Bluetooth, atau Web
 */
void processIncomingCommand(char command) {
  if (command == 'O' || command == 'o' || command == '1' || command == '\n' || command == '\r') {
    openTrashLid();
    Serial.println(F("OK:OPEN"));
  } else if (command == 'C' || command == 'c' || command == '0') {
    closeTrashLid();
    Serial.println(F("OK:CLOSED"));
  } else if (command == 'T' || command == 't') {
    toggleTrashLid();
    Serial.println(isLidOpen ? F("OK:OPEN") : F("OK:CLOSED"));
  }
}

void openTrashLid() {
  Serial.println(F("[ACTION] Membuka Penutup Tong Sampah (90 Deg)..."));
  isLidOpen = true;
  openTimestamp = millis();

  // 1. Gerakkan Servo Motor ke 90 darjah & Nyalakan Built-in LED
  #ifdef LED_BUILTIN
    pinMode(LED_BUILTIN, OUTPUT);
    digitalWrite(LED_BUILTIN, HIGH);
  #endif

  binServo.write(SERVO_LID_OPEN);
  setRGBColor(false, true, false); // LED Hijau = Terbuka

  // 2. Bunyi Beep Pembukaan
#if defined(ESP32)
  digitalWrite(BUZZER_PIN, HIGH);
  delay(120);
  digitalWrite(BUZZER_PIN, LOW);
#else
  tone(BUZZER_PIN, 1200, 150);
#endif
}

void closeTrashLid() {
  Serial.println(F("[ACTION] Menutup Penutup Tong Sampah (0 Deg)..."));
  isLidOpen = false;

  #ifdef LED_BUILTIN
    digitalWrite(LED_BUILTIN, LOW);
  #endif

  // 1. Gerakkan Servo Motor ke 0 darjah
  binServo.write(SERVO_LID_CLOSED);
  setRGBColor(true, false, false); // LED Merah = Tertutup

  // 2. Bunyi Beep Penutupan
#if defined(ESP32)
  digitalWrite(BUZZER_PIN, HIGH);
  delay(80);
  digitalWrite(BUZZER_PIN, LOW);
#else
  tone(BUZZER_PIN, 800, 200);
#endif
}

void toggleTrashLid() {
  if (isLidOpen) {
    closeTrashLid();
  } else {
    openTrashLid();
  }
}
