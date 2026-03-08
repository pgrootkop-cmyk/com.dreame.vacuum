Control your Dreame robot vacuum with Homey via the Dreame Home cloud API.

Have a Matter-compatible Dreame vacuum? Try Dreame Matter Cleaner (https://homey.app/nl-be/app/com.dreame.cleaner.pro/Dreame-Matter-Cleaner/) first — it offers local control without cloud dependency. This app is mainly intended for older or non-Matter Dreame vacuums that can only be controlled via the Dreame Home cloud API.

**Usage**
- Install this app on your Homey
- Add a device and select Dreame > Robot Vacuum
- Log in with your Dreame Home account credentials
- Select your robot vacuum from the list

Only email/password login is supported. Third-party login (Google, Apple, etc.) is not supported.

If you signed up using Google, Apple, or another third-party login, you need to set a password first: open the Dreame Home app, go to Profile > Settings > Account and Security > Password, and set a new password. Use your email and this password to pair in Homey.

We recommend using a separate Dreame Home account for Homey to avoid potential session conflicts.

**Supported Features**
- Cleaning: Start, Stop, Pause, Return to Dock
- Cleaning Modes: Sweeping, Mopping, Sweeping & Mopping, Vacuum then Mop
- Suction Level: Quiet, Standard, Strong, Turbo
- Water Volume: Low, Medium, High
- CleanGenius: Off, Routine Cleaning, Deep Cleaning (with auto-start)
- CleanGenius Mode: Vacuum & Mop, Mop after Vacuum
- Cleaning Route: Standard, Intensive, Deep, Quick
- Mop Wash Frequency: By Room, every 5/10/15/20/25 m²
- Dock Features: Auto Empty, Self Clean, Drying, Draining
- Consumable Monitoring: Main Brush, Side Brush, Filter, Mop Pad, Sensor (with reset via flow cards)
- Room Cleaning: Single room or multi-room by ID with suction/water/repeats, per-room trigger cards
- Dashboard Widget: Vacuum map with room colors, labels, robot & charger position, status bar
- App Settings: Device overview with rendered map, status grid, room list, consumable health bars
- Carpet: Boost toggle, Sensitivity (Low/Medium/High), Cleaning mode (Avoidance/Adaptation/Remove Mop/Vacuum & Mop/Ignore)
- Dock Settings: Mop Wash Level, Water Temperature, Auto Empty Frequency, Mop Pressure, Drying Time, Volume
- Toggles: Child Lock, Resume Cleaning, Tight Mopping, Silent Drying, DND
- Status: Battery, Cleaned Area, Cleaning Time, Total Cleaned Area, Error, Charging, Dock Cleaning, Drying Progress, Drainage, Detergent, Hot Water, Water Tank, Dirty Water Tank, Dust Bag
- Flow Cards: 29 actions, 16 conditions, 5 triggers

**Not Supported**
Some features from the Dreame Home app or Tasshack/dreame-vacuum (Home Assistant) cannot be implemented on Homey:
- Interactive map / room selection: Dashboard widget shows a rendered map, but tapping rooms to clean is not possible. Use Flow cards.
- Live camera feed: Homey does not support real-time video streams.
- Map editing: No map editing UI on Homey. Configure in Dreame Home app.
- Virtual walls / no-go zones: Requires interactive map editing.
- Furniture / obstacle detection: Requires image/map overlay.
- Cleaning history / statistics: No historical charts on Homey. Current session data (area, time) is available.
- Custom room schedules: Use Homey Flows for time-based automations instead.
- Real-time MQTT events: This app uses cloud polling (default 15s). Tasshack uses local MQTT for instant updates, which is not possible for Homey cloud apps.
- OTA firmware updates: Not relevant for a Homey app.

Homey excels at automations (Flow cards), device control, and status monitoring. For map-based features, camera, or visual AI, use the Dreame Home app alongside Homey.

**Supported Devices**
Works with Dreame robot vacuums controllable via the Dreame Home app, including the X40, X30, L20, L10, and other models.
