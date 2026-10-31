#include "FirebaseESP8266.h"
#include "secrets.h"
#include <ESP8266WiFi.h>
#include <NTPClient.h>
#include <WiFiUdp.h>
#include <Servo.h>
#include <WiFiManager.h>

Servo servo;

// Firebase

// NTP (IST)
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", 19800);

// Firebase objects
FirebaseData timer, feed;

// Variables
String Str[] = {"", "", ""};
String stimer;

int feednow = 0;
int feedDuration = 600;
int feedspeed = 0;

String foodType = "";
String foodSize = "";
int grams = 0;

unsigned long lastPing = 0;

// ================= SETUP =================
void setup() {
  Serial.begin(115200);

  WiFiManager wm;
  wm.autoConnect("AquaFeed Setup");

  Serial.print("IP: ");
  Serial.println(WiFi.localIP());

  timeClient.begin();

  Firebase.begin(FIREBASE_HOST, FIREBASE_AUTH);
  Firebase.reconnectWiFi(true);

  servo.attach(D5);
  servo.write(90);
}

// ================= LOOP =================
void loop() {
  //testing speed
  Firebase.getInt(feed, "/settings/speed");
    feedspeed = feed.to<int>();

  // 🔌 WiFi reconnect
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi lost. Reconnecting...");
    WiFiManager wm;
    wm.autoConnect("AquaFeed Setup");
  }

  // ================= HEARTBEAT =================
  if (millis() - lastPing > 5000) {
    lastPing = millis();

    timeClient.update();

    // IST → UTC
    unsigned long epochSec = timeClient.getEpochTime() - 19800;

    Firebase.setInt(feed, "/device/lastSeen", epochSec);

    Serial.println("Heartbeat sent");
  }

  // ================= READ TRIGGER =================
  if (!Firebase.getInt(feed, "/feednow")) return;
  feednow = feed.to<int>();

  Serial.print("feednow: ");
  Serial.println(feednow);

  // ================= MANUAL FEED =================
  if (feednow == 1) {

    Firebase.getInt(feed, "/settings/duration");
    feedDuration = feed.to<int>();

    Firebase.getString(feed, "/settings/foodType");
    foodType = feed.to<String>();

    Firebase.getString(feed, "/settings/size");
    foodSize = feed.to<String>();

    Firebase.getInt(feed, "/settings/grams");
    grams = feed.to<int>();

    if (feedDuration <= 0 || feedDuration > 10000) {
      feedDuration = 600;
    }

    Serial.println("Manual Feed Triggered");

    servo.write(feedspeed);
    delay(feedDuration);
    servo.write(90);

    Firebase.setInt(feed, "/feednow", 0);

    // 🔥 LOG MANUAL FEED
    FirebaseJson json;
    json.set("title", "Manual Feed");
    json.set("foodType", foodType);
    json.set("size", foodSize);
    json.set("grams", grams);
    json.set("duration", feedDuration);

    timeClient.update();
    unsigned long epochSec = timeClient.getEpochTime() - 19800; // UTC

    json.set("timestamp", epochSec);

    Firebase.pushJSON(feed, "/activities", json);

    Serial.println("Manual feed logged");
  }

  // ================= SCHEDULED FEED =================
  else {

    // Read timers
    for (int i = 0; i < 3; i++) {
      String path = "timers/timer" + String(i);
      if (Firebase.getString(timer, path)) {
        stimer = timer.to<String>();
        Str[i] = stimer;  // no substring
      }
    }

    timeClient.update();

    // Get IST time directly
    String hh = String(timeClient.getHours());
    if (hh.length() == 1) hh = "0" + hh;

    String mm = String(timeClient.getMinutes());
    if (mm.length() == 1) mm = "0" + mm;

    String currentTime = hh + ":" + mm;

    if (Str[0] == currentTime || Str[1] == currentTime || Str[2] == currentTime) {

      if (Firebase.getInt(feed, "/settings/duration")) {
        feedDuration = feed.to<int>();
      } else {
        feedDuration = 600;
      }

      Firebase.getString(feed, "/settings/foodType");
      foodType = feed.to<String>();

      Firebase.getString(feed, "/settings/size");
      foodSize = feed.to<String>();

      Firebase.getInt(feed, "/settings/grams");
      grams = feed.to<int>();

      if (feedDuration <= 0 || feedDuration > 10000) {
        feedDuration = 600;
      }

      Serial.print("Scheduled Feeding: ");
      Serial.println(feedDuration);

      servo.write(feedspeed);
      delay(feedDuration);
      servo.write(90);

      Serial.println("Scheduled Feed Done");

      // 🔥 LOG SCHEDULED FEED
      FirebaseJson json;
      json.set("title", "Scheduled Feed");
      json.set("foodType", foodType);
      json.set("size", foodSize);
      json.set("grams", grams);
      json.set("duration", feedDuration);

      timeClient.update();
      unsigned long epochSec = timeClient.getEpochTime() - 19800; // UTC

      json.set("timestamp", epochSec);

      Firebase.pushJSON(feed, "/activities", json);

      delay(60000); // prevent duplicate trigger
    }
  }

  // ================= CALIBRATION =================
  int calibrate = 0;
  int calibrationTime = 2000; // fallback

  if (Firebase.getInt(feed, "/settings/calibrate")) {
    calibrate = feed.to<int>();
  }

  if (Firebase.getInt(feed, "/settings/calibrationTime")) {
    calibrationTime = feed.to<int>();
  }

  if (calibrate == 1) {
    Serial.println("Calibration started");

    servo.write(feedspeed);
    delay(calibrationTime);   // 🔥 dynamic from DB
    servo.write(90);

    Firebase.setInt(feed, "/settings/calibrate", 0);

    Serial.println("Calibration done");
  }
}