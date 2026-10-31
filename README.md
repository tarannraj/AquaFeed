# AquaFeed

AquaFeed is an ESP8266 based automatic fish feeder with a browser control panel and 3D printable enclosure parts.

## Repository contents

- `code2.0/` — ESP8266 firmware.
- `WEB/auqafeed/` — static web app files.
- `WEB/firebase.json` — Firebase Hosting configuration.
- `step files/` — STEP models for the enclosure and feeder components.

## Hardware and libraries

The firmware is written for an ESP8266 board and uses a servo on pin D5. Install the Arduino libraries used by the sketch: FirebaseESP8266, NTPClient, WiFiManager, and Servo (plus the ESP8266 Arduino board package).

## Configure the firmware

1. Create your own Firebase project and configure its Realtime Database rules with authenticated, least-privilege access.
2. Copy `code2.0/secrets.example.h` to `code2.0/secrets.h` and fill in your database host and device credential.
3. Keep `secrets.h` private. It is ignored by Git.
4. Flash `code2.0/code2.0.ino` to your ESP8266.

## Configure the web app

Set the Firebase web app configuration in `WEB/auqafeed/assets/js/script_v2.js` to your own project before deployment. Firebase web API keys and project identifiers are visible in browser code; protect data with Firebase Authentication and database rules, and restrict the API key as appropriate in Google Cloud.

From the `WEB` folder, install/use Firebase CLI and deploy the configured Hosting site. The project-specific `.firebaserc` file is intentionally not included; use `firebase use --add` to select your own project.

## Security note

Never commit device credentials, service account keys, private keys, `.env` files, or `secrets.h`. Rotate any credential that has previously been committed or shared. This repository does not include the original project report or Firebase deployment cache.
