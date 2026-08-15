/*
 * =================================================================================
 * SEMNASH ECO-PULSE - Arduino Smart Trash Bin Bluetooth Firmware
 * =================================================================================
 * Perkakasan (Hardware Required):
 * 1. Papan Arduino (Uno / Nano / Mega / ESP32)
 * 2. Modul Bluetooth HC-05 atau HC-06 (Baud Rate: 9600)
 * 3. Servo Motor (SG90 / MG996R untuk penutup tong sampah)
 * 4. LED Indicator Green (Pin 12) & Red (Pin 13)
 * 5. Buzzer (Pin 8 - Pilihan)
 * 
 * Connection Diagram:
 * - HC-05 TXD -> Arduino RX (Pin 10 / SoftwareSerial)
 * - HC-05 RXD -> Arduino TX (Pin 11 / SoftwareSerial - Voltage divider recommended)
 * - Servo Signal Pin -> Arduino Pin 9
 * - Buzzer -> Pin 8
 * =================================================================================
 */

#include <SoftwareSerial.h>
#include <Servo.h>

// Definisi Pin
#define BT_RX_PIN 10
#define BT_TX_PIN 11
#define SERVO_PIN 9
#define BUZZER_PIN 8
#define LED_GREEN 12
#define LED_RED 13

// Sudut Pergerakan Servo Motor Penutup Tong
#define SERVO_LID_CLOSED 0    // Penutup Ditutup (0 Step)
#define SERVO_LID_OPEN   90   // Penutup Dibuka (90 Degree)

SoftwareSerial bluetoothSerial(BT_RX_PIN, BT_TX_PIN); // RX, TX
Servo binServo;

void setup() {
  Serial.begin(9600);
  bluetoothSerial.begin(9600);
  
  binServo.attach(SERVO_PIN);
  binServo.write(SERVO_LID_CLOSED);
  
  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_RED, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  
  digitalWrite(LED_GREEN, LOW);
  digitalWrite(LED_RED, HIGH); // Red = Closed
  
  Serial.println("SEMNASH ECO-PULSE Arduino System Ready!");
  
  // Tone permulaan
  tone(BUZZER_PIN, 1000, 200);
}

void loop() {
  // Menyemak jika terdapat isyarat Bluetooth daripada Tablet App
  if (bluetoothSerial.available() > 0) {
    char command = bluetoothSerial.read();
    Serial.print("Menerima Isyarat Bluetooth: ");
    Serial.println(command);
    
    if (command == 'O' || command == 'o') {
      openTrashLid();
    } else if (command == 'C' || command == 'c') {
      closeTrashLid();
    }
  }

  // Menyemak Serial Monitor USB untuk ujian manual
  if (Serial.available() > 0) {
    char command = Serial.read();
    if (command == 'O' || command == 'o') {
      openTrashLid();
    } else if (command == 'C' || command == 'c') {
      closeTrashLid();
    }
  }
}

// Fungsi Buka Penutup Tong Sampah
void openTrashLid() {
  Serial.println("[ACTION] Membuka Penutup Tong Sampah...");
  
  digitalWrite(LED_RED, LOW);
  digitalWrite(LED_GREEN, HIGH);
  
  // Bunyi Bip Selamat Datang
  tone(BUZZER_PIN, 1200, 150);
  delay(200);
  tone(BUZZER_PIN, 1600, 250);
  
  // Memutar Servo Motor ke 90 darjah
  binServo.write(SERVO_LID_OPEN);
}

// Fungsi Tutup Penutup Tong Sampah
void closeTrashLid() {
  Serial.println("[ACTION] Menutup Penutup Tong Sampah...");
  
  // Memutar Servo Motor kembali ke 0 darjah
  binServo.write(SERVO_LID_CLOSED);
  
  digitalWrite(LED_GREEN, LOW);
  digitalWrite(LED_RED, HIGH);
  
  tone(BUZZER_PIN, 800, 300);
}
