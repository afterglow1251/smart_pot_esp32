#include <WiFi.h>
#include <PubSubClient.h>
#include <OneWire.h>
#include <DallasTemperature.h>

const char* ssid = "YOUR_WIFI_SSID"; // Change to your WiFi network name
const char* password = "YOUR_WIFI_PASSWORD"; // Change to your WiFi password

const char* mqtt_server = "YOUR_MQTT_BROKER_IP"; // MQTT broker IP address (e.g., 192.168.1.100)
const int mqtt_port = 1883;
const char* mqtt_topic = "esp32/temperature";

#define ONE_WIRE_BUS 4
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

#define BUTTON_PIN 12
#define LED_PIN 2

WiFiClient espClient;
PubSubClient mqtt(espClient);

unsigned long lastSend = 0;
const unsigned long SEND_INTERVAL = 1000;
bool isWorking = true;
bool lastButtonState = HIGH;

void setupWiFi() {
  Serial.print("Підключення до WiFi");
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println();
  Serial.print("WiFi підключено! IP: ");
  Serial.println(WiFi.localIP());
}

void reconnectMQTT() {
  while (!mqtt.connected()) {
    Serial.print("Підключення до MQTT...");
    
    if (mqtt.connect("ESP32_SmartPot")) {
      Serial.println(" підключено!");
    } else {
      Serial.print(" помилка, rc=");
      Serial.print(mqtt.state());
      Serial.println(" повтор через 5 сек");
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  Serial.println("\n=== Розумна Каструля ===");
  
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, HIGH);
  
  sensors.begin();
  Serial.print("Знайдено датчиків: ");
  Serial.println(sensors.getDeviceCount());
  
  Serial.println("Стабілізація датчика...");
  for (int i = 0; i < 3; i++) {
    sensors.requestTemperatures();
    delay(1000);
  }
  Serial.println("Датчик готовий!");
  
  setupWiFi();
  mqtt.setServer(mqtt_server, mqtt_port);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    setupWiFi();
  }
  
  if (!mqtt.connected()) {
    reconnectMQTT();
  }
  mqtt.loop();
  
  bool buttonState = digitalRead(BUTTON_PIN);
  if (buttonState == LOW && lastButtonState == HIGH) {
    delay(50);
    if (digitalRead(BUTTON_PIN) == LOW) {
      isWorking = !isWorking;
      digitalWrite(LED_PIN, isWorking ? HIGH : LOW);
      
      Serial.print("Кнопка натиснута, статус: ");
      Serial.println(isWorking ? "Працює" : "Зупинено");
      
      String statusJson = "{";
      statusJson += "\"status\":\"" + String(isWorking ? "working" : "stopped") + "\",";
      statusJson += "\"rssi\":" + String(WiFi.RSSI());
      statusJson += "}";
      mqtt.publish(mqtt_topic, statusJson.c_str());
    }
  }
  lastButtonState = buttonState;
  
  if (isWorking) {
    unsigned long now = millis();
    if (now - lastSend >= SEND_INTERVAL) {
      lastSend = now;
      
      sensors.requestTemperatures();
      float temp = sensors.getTempCByIndex(0);
      
      if (temp == DEVICE_DISCONNECTED_C) {
        Serial.println("Помилка: датчик не підключено!");
        return;
      }
      
      String json = "{";
      json += "\"temperature\":" + String(temp, 2) + ",";
      json += "\"rssi\":" + String(WiFi.RSSI()) + ",";
      json += "\"status\":\"working\"";
      json += "}";
      
      if (mqtt.publish(mqtt_topic, json.c_str())) {
        Serial.print("📤 ");
        Serial.println(json);
      } else {
        Serial.println("❌ Помилка відправки");
      }
    }
  }
}
