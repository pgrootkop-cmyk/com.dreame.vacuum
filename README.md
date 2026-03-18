<p align="center">
  <img src="assets/images/large.png" width="150" />
</p>

# Dreame

Control your Dreame robot vacuum with Homey via the Dreame Home cloud API.

> **Have a Matter-compatible Dreame vacuum?** Try [Dreame Matter Cleaner](https://homey.app/nl-be/app/com.dreame.cleaner.pro/Dreame-Matter-Cleaner/) first — it offers local control without cloud dependency. This app is mainly intended for older or non-Matter Dreame vacuums that can only be controlled via the Dreame Home cloud API.

## Usage

1. Install the app from the Homey App Store
2. Add a device and select **Dreame** > **Robot Vacuum**
3. Select your Dreame Home region, enter your email and password, and log in
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
| **Sensors** | Battery, Cleaned Area, Cleaning Time, Total Cleaned Area, Error Status, Current Room |
| **Room Cleaning** | Room discovery via MQTT + cloud map download. Simple room cleaning (uses current device settings) or advanced with per-room suction/water/repeats. Single/multi-room with autocomplete or manual room ID. Per-room trigger cards (start/finish) |
| **Zone Cleaning** | Draw custom cleaning zones on the map in App Settings. Name each zone and use them in Flow cards. Zones are stored per floor and support the Dreame zone cleaning protocol |
| **Multi-Floor** | Automatic detection of multi-floor/multi-map setups. View different floor maps in App Settings and the widget. Switch floors via Flow card for cleaning automations. Current floor shown as device capability |
| **Live Tracking** | Real-time robot position on map widget and settings page during cleaning (~5s updates) |
| **Current Room** | Shows which room the robot is in — live during cleaning, dock room when charging |
| **Current Floor** | Shows which floor the robot is currently on (multi-floor devices) |
| **Dashboard Widget** | Live vacuum map widget with 5 color schemes (Dreame Light/Dark, Mijia Light/Dark, Grayscale), configurable room label size, floor selection, room labels, robot & charger position, battery status, and cleaning progress |
| **Consumables Widget** | Dashboard widget with color-coded health bars for Main Brush, Side Brush, Filter, Mop Pad, and Sensor |
| **App Settings** | Device overview with rendered map, floor selector, visual zone editor, status grid, room list, and consumable health bars |
| **Carpet** | Carpet Boost toggle, Carpet Sensitivity (Low/Medium/High), Carpet Cleaning mode (Avoidance/Adaptation/Remove Mop/Vacuum & Mop/Ignore) |
| **Dock Settings** | Mop Wash Level, Water Temperature, Auto Empty Frequency, Mop Pressure, Drying Time, Volume |
| **Toggles** | Child Lock, Resume Cleaning, Tight Mopping, Silent Drying, DND |
| **Status** | Charging Status, Dock Cleaning Status, Drying Progress, Drainage Status, Detergent Status, Hot Water Status, Water Tank, Dirty Water Tank, Dust Bag, Dust Collection |
| **Real-time MQTT** | Persistent connection to Dreame MQTT broker for instant property updates and room discovery. All 35+ properties pushed via MQTT — ~80% fewer API calls |
| **Adaptive Polling** | Automatic poll interval adjustment: 60s idle / 15s cleaning with MQTT, 5s fallback without. MQTT health monitoring with automatic fast-poll recovery |
| **Flow Cards** | 34 action cards, 19 condition cards, 14 trigger cards |

### Flow Tips

**Run actions after cleaning finishes:** Use the **"Cleaning finished"** trigger card (fires when any cleaning task completes and the robot docks — includes cleaned area and time as tokens). You can also use **"Room cleaning finished"** or **"Zone cleaning finished"** for more specific triggers.

**Simple room cleaning:** The **"Clean a room"** and **"Clean multiple rooms"** cards use whatever suction/water settings are currently active on the vacuum — no need to specify them in every flow. For fine-grained control, use the advanced cards that let you set suction, water volume, and repeats per room.

**Zone cleaning:** Draw zones on the map in App Settings first (see below), then use the **"Clean a zone"** Flow card to clean them. Zones use the vacuum's current suction/water settings.

**Multi-floor cleaning:** Use the **"Select floor"** action card to switch the vacuum's active floor before starting room or zone cleaning. Room and trigger cards show rooms from all floors with floor labels.

### Setting Up Zones

1. Open the Dreame app settings in Homey
2. Select your device (and floor, if multi-floor)
3. Scroll to the **Zones** section
4. Enter a name for the zone (e.g. "Under dining table")
5. Click **+ Draw** — the map enters drawing mode
6. Click and drag on the map to draw a rectangle over the area you want to clean
7. Click **Save** to store the zone
8. The zone appears in the list and is available in the **"Clean a zone"** Flow card

You can create multiple zones per floor. Delete zones with the X button.

## Not Supported

Some features available in the Dreame Home app or in [Tasshack/dreame-vacuum](https://github.com/Tasshack/dreame-vacuum) (Home Assistant) cannot be implemented on Homey due to platform limitations:

| Feature | Reason |
|---------|--------|
| **Interactive map / room selection** | The dashboard widget shows a rendered map with rooms, but tapping rooms to start cleaning is not possible. Use Flow cards for room cleaning. |
| **Live camera feed** | Homey does not support real-time video streams from devices. |
| **Map editing** | Virtual walls and no-go zones must be configured in the Dreame Home app. Custom cleaning zones can be drawn in Homey's App Settings. |
| **Virtual walls / no-go zones** | Must be configured in the Dreame Home app. |
| **Furniture / obstacle detection** | Visual AI detection results require an image/map overlay. |
| **Cleaning history / statistics** | Homey has no UI for historical charts or session logs. Current session data (area, time) is available. |
| **Custom room schedules** | Dreame schedules are managed in the Dreame Home app. Use Homey Flows for time-based automations instead. |
| **OTA firmware updates** | Not relevant for a Homey app. |

> **In short:** Homey excels at automations (Flow cards), device control, and status monitoring. For map-based features, camera, or visual AI, use the Dreame Home app alongside Homey.

## Supported Devices

Should work with any robot vacuum controllable via the [Dreame Home](https://www.dreame.nl/pages/dreame-home) app, including the **X40**, **X30**, **L20**, **L10**, and other models. Currently only tested with the Dreame X40 Ultra.

## Disclaimer

This app is not affiliated with Dreame Technology. The Dreame Home API is reverse-engineered and may change without notice.

## Reporting Issues

Found a bug or have a feature request? Please open an [issue](https://github.com/pgrootkop-cmyk/com.dreame.vacuum.cloud/issues) and include:

1. **Your exact vacuum model** (e.g. Dreame X40 Ultra, L20 Ultra, L10 Pro)
2. **A description of the problem** — what happened and what you expected
3. **Enable diagnostic logging** — go to the app settings in Homey, enable **Diagnostic Logging**, and reproduce the issue. This sends anonymous logs to the developer to help debug your problem. You can disable it again afterwards.

## Credits

The Dreame cloud API client in this app is inspired by [Tasshack/dreame-vacuum](https://github.com/Tasshack/dreame-vacuum), the Home Assistant integration for Dreame vacuums.

## License

[MIT](LICENSE)
