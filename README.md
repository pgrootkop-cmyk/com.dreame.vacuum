<p align="center">
  <img src="assets/images/large.png" width="150" />
</p>

# Dreame

Control your Dreame robot vacuum with Homey via the Dreame Home cloud API.

> **Have a Matter-compatible Dreame vacuum?** Try [Dreame Matter Cleaner](https://homey.app/nl-be/app/com.dreame.cleaner.pro/Dreame-Matter-Cleaner/) first — it offers local control without cloud dependency. This app is mainly intended for older or non-Matter Dreame vacuums that can only be controlled via the Dreame Home cloud API.

## Usage

1. Install the app from the Homey App Store
2. Add a device and select **Dreame** > **Robot Vacuum**
3. Log in with your Dreame Home account credentials
4. Select your robot vacuum from the list

> **Important:** Only email/password login is supported. Third-party login (Google, Apple, etc.) is not supported.

### Setting up a password in the Dreame Home app

If you signed up using Google, Apple, or another third-party login, you need to set a password first:

1. Open the **Dreame Home** app on your phone
2. Go to **Profile** (bottom right) > **Settings** (gear icon)
3. Tap **Account and Security**
4. Tap **Password** and set a new password
5. Use your email and this password to pair in Homey

> **Tip:** We recommend using a separate Dreame Home account for Homey to avoid potential session conflicts.

## Supported Features

| Feature | Details |
|---------|---------|
| **Cleaning** | Start, Stop, Pause, Return to Dock |
| **Cleaning Modes** | Sweeping, Mopping, Sweeping & Mopping, Vacuum then Mop |
| **Suction Level** | Quiet, Standard, Strong, Turbo |
| **Water Volume** | Low, Medium, High |
| **CleanGenius** | Off, Routine Cleaning, Deep Cleaning (with auto-start) |
| **CleanGenius Mode** | Vacuum & Mop, Mop after Vacuum |
| **Cleaning Route** | Standard, Intensive, Deep, Quick |
| **Mop Wash Frequency** | By Room, every 5/10/15/20/25 m² |
| **Dock Features** | Auto Empty, Self Clean, Drying, Draining |
| **Consumables** | Main Brush, Side Brush, Filter, Mop Pad, Sensor (with reset) |
| **Sensors** | Battery, Cleaned Area, Cleaning Time, Total Cleaned Area, Error Status |
| **Room Cleaning** | Single room or multi-room by ID with per-room suction/water/repeats |
| **Carpet** | Carpet Boost toggle, Carpet Sensitivity (Low/Medium/High), Carpet Cleaning mode (Avoidance/Adaptation/Remove Mop/Vacuum & Mop/Ignore) |
| **Dock Settings** | Mop Wash Level, Water Temperature, Auto Empty Frequency, Mop Pressure, Drying Time, Volume |
| **Toggles** | Child Lock, Resume Cleaning, Tight Mopping, Silent Drying, DND |
| **Status** | Charging Status, Dock Cleaning Status, Drying Progress, Drainage Status, Detergent Status, Hot Water Status, Water Tank, Dirty Water Tank, Dust Bag |
| **Flow Cards** | 28 action cards, 14 condition cards, 3 trigger cards |

## Not Supported

Some features available in the Dreame Home app or in [Tasshack/dreame-vacuum](https://github.com/Tasshack/dreame-vacuum) (Home Assistant) cannot be implemented on Homey due to platform limitations:

| Feature | Reason |
|---------|--------|
| **Live map / room selection** | Homey has no UI for rendering interactive maps. Room cleaning by ID is supported via Flow cards, but there is no visual map to tap rooms on. |
| **Live camera feed** | Homey does not support real-time video streams from devices. |
| **Saved maps / map editing** | No map rendering or editing UI available on Homey. |
| **Virtual walls / no-go zones** | Requires a map canvas to draw zones — not possible on Homey. |
| **Furniture / obstacle detection** | Visual AI detection results require an image/map overlay. |
| **Cleaning history / statistics** | Homey has no UI for historical charts or session logs. Current session data (area, time) is available. |
| **Custom room schedules** | Dreame schedules are managed in the Dreame Home app. Use Homey Flows for time-based automations instead. |
| **Real-time MQTT events** | This app uses cloud polling (default 15s). The Tasshack integration uses a local MQTT connection for instant updates, which requires running on the same network as Home Assistant. Homey cloud apps cannot maintain persistent MQTT connections to the vacuum. |
| **OTA firmware updates** | Not relevant for a Homey app. |

> **In short:** Homey excels at automations (Flow cards), device control, and status monitoring. For map-based features, camera, or visual AI, use the Dreame Home app alongside Homey.

## Supported Devices

Should work with any robot vacuum controllable via the [Dreame Home](https://www.dreame.nl/pages/dreame-home) app, including the **X40**, **X30**, **L20**, **L10**, and other models. Currently only tested with the Dreame X40 Ultra.

## Disclaimer

This app is not affiliated with Dreame Technology. The Dreame Home API is reverse-engineered and may change without notice.

## Feedback

Found a bug or have a feature request? Please open an [issue](https://github.com/pgrootkop-cmyk/com.dreame.vacuum.cloud/issues).

## Credits

The Dreame cloud API client in this app is inspired by [Tasshack/dreame-vacuum](https://github.com/Tasshack/dreame-vacuum), the Home Assistant integration for Dreame vacuums.

## License

[MIT](LICENSE)
