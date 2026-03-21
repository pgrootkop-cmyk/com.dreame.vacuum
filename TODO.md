# Dreame Vacuum App - Development Plan

## Current Focus: v0.0.30 (Clean branch from v0.0.20)

### Phase 1a: Fix Sweeping/Mopping Mode Swap (CRITICAL)

**Bug**: Two independent users confirm cleaning modes are swapped on combo-dock robots.
- "Sweeping" starts mopping, "Sweeping & Mopping" starts only vacuum.
- Reported by: sverrelp (X40 Ultra), Patrickske (unknown model).

**Root Cause** (confirmed via Tasshack `device.py` lines 935-993, 1952-1976):
- Devices with `mop_pad_lifting` (combo dock = self_wash_base + auto_empty_base) use **swapped wire values** for SIID 4, PIID 23:
  - Wire value `0` = Sweeping & Mopping (our enum `2`)
  - Wire value `1` = Mopping (our enum `1`)
  - Wire value `2` = Sweeping (our enum `0`)
  - Wire value `3` = Mopping After Sweeping (our enum `3`)
- Swap applies in BOTH read and write paths.

**Detection**: `mop_pad_lifting` is true when device has both:
- `SELF_WASH_BASE_STATUS` property (SIID 4, PIID 34 or similar - device reports it)
- `DUST_COLLECTION` property (SIID 15, PIID 5 - device reports it)
- Alternative: `_isGroupedMode` is a strong proxy (grouped mode = self_wash_base = combo dock)

**Fix**:
1. Add `_mopPadLifting` flag, detected during capability probing
2. Swap 0↔2 when reading cleaning mode from device (MQTT + poll)
3. Swap 0↔2 when writing cleaning mode to device (setCleaningMode + room/zone params)
4. Fix grouped mode mask: `value & 0x03` (not `0xFF`) for mop_pad_lifting devices

**Affected models**: r2449a (X40 Ultra), r2253w (L20 Ultra), all combo-dock robots.
**Unaffected models**: r2423 (basic, no self_wash_base) - no swap needed.

### Phase 1b: Zone Cleaning Trigger (VERIFY)

Zone CRUD and trigger pipeline was fully implemented in v0.0.24-v0.0.29.
The v0.0.29 fix defers trigger to CHARGING state (not RETURNING).
**Action**: Re-implement zone features on clean branch, verify trigger fires correctly.

---

## Deferred Features (from v0.0.21-v0.0.29 work)

### Multi-Floor Support (POSTPONE)
- Added in v0.0.24, required 5 follow-up fix versions
- Root cause of most regressions: scattered data model, string/number floor ID mismatches
- `_savedMaps` architecture needs redesign before re-enabling
- **User request**: Separate floor/room dropdowns in flow cards (krl69)
- **Decision**: Shelve until single-floor experience is rock solid

### Map Rotation (SKIP FOR NOW)
- Added in v0.0.25, partially working
- CSS rotate on canvas doesn't rotate text labels (krl69 reports vertical text)
- Would need canvas-level text counter-rotation
- Low priority vs fixing core cleaning functionality

### Go-To-Point Without Cleaning (NEW REQUEST)
- krl69 requests: robot navigates to a point without cleaning, just stops there
- Workaround: create tiny zone + pause
- Dreame protocol supports POINT_CLEANING (status 27) - could implement later
- **Decision**: Postpone, not a bug fix

### Multi-Room Selection (HOMEY LIMITATION)
- Users want to pick multiple individual rooms in one card
- Homey SDK does not support true multi-select in flow card dropdowns
- Current workaround: pre-built combo pairs ("Kitchen + Living Room")
- **Decision**: Can't fix without Homey SDK changes. Combos are the best we can do.

### Simple Room Cleaning Cards (RE-IMPLEMENT)
- Added in v0.0.22: cards that use vacuum's current settings (no suction/water overrides)
- Popular with users (kvolden, Simon_Salvin requested)
- **Decision**: Re-implement on clean branch

### Dreame Shortcuts (RE-IMPLEMENT)
- Added in v0.0.26: discover shortcuts from property 4-48, execute via flow card
- Clean feature, no regressions reported
- **Decision**: Re-implement on clean branch

### SentryLite (RE-IMPLEMENT)
- Replaced @sentry/node (43MB) with 3KB custom implementation
- 80% app size reduction (63MB → 13MB)
- **Decision**: Start fresh with SentryLite from the beginning

---

## Tasshack Findings to Apply Proactively

### Already handled correctly in v0.0.20:
- Segment cleaning 5th parameter (we send `1` - correct for customized_cleaning devices)
- Map encryption with model-specific IV
- Grouped mode read-modify-write pattern

### To implement in v0.0.30:
1. **Cleaning mode 0↔2 swap** (see Phase 1a above)
2. **Grouped mode mask width**: `value & 0x03` for mop_pad_lifting, `value & 0x01` without (currently using `value & 0xFF`)

### To implement later:
3. **State old/new mapping**: Pre-gen5 devices use different state codes 19+. Low risk since most users have modern robots.
4. **Cleaning route pruning**: DEEP/INTENSIVE routes only valid during mopping mode (not sweeping). Could confuse users.
5. **Carpet cleaning option pruning**: Available modes depend on mop_pad_lifting_plus, auto_carpet_cleaning, carpet_crossing capabilities.
6. **Cleanset water volume +1 offset**: Per-room settings display off by 1. Not relevant until we implement per-room cleanset.
7. **Wetness level ranges**: Different water level thresholds for mop_clean_frequency devices. Affects water volume accuracy on newer models.

---

## User Feedback Summary (Forum: community.homey.app/t/152442)

### Active Testers
- **krl69**: Most active tester, 8+ detailed bug reports. Multi-floor, zones, triggers.
- **sverrelp**: X40 Ultra, discovered sweeping/mopping swap.
- **Patrickske**: Confirmed sweeping/mopping swap.
- **kvolden**: X40, map mirroring, font size, simple room cards.
- **Philip9000**: Requested shortcuts (implemented in v0.0.26).
- **Nitramevo**: L50 Ultra, cleaning finished automation.

### Device Models in the Wild
| Model | User | Has combo dock |
|-------|------|---------------|
| X40 Ultra (r2449a) | Our test device | Yes |
| X40 Ultra | sverrelp | Yes |
| L20 Ultra (r2253w) | Active user | Yes |
| r2423 | Test user | No |
| X40 | kvolden | Yes |
| L50 Ultra | Nitramevo | Yes |
| Aqua10 Ultra Roller | Marcel89 | Unknown |

### Overall Sentiment
- Very positive about development speed
- "Incredibly fast response to development" (krl69)
- "App works great, small issues got fixed super fast" (Viks)
- Main frustration: sweeping/mopping swap (affects daily use)

---

## Version History (v0.0.20 → v0.0.29, for reference)

| Version | What | Status |
|---------|------|--------|
| 0.0.20 | Stable baseline (consumables widget, robot position, community link) | STABLE |
| 0.0.21 | Sentry error reporting | Superseded by SentryLite |
| 0.0.22 | Multi-device MQTT fix, simple room cards | Good features to port |
| 0.0.23 | Blue dot fix, Sentry crash fix, regions | Good fixes to port |
| 0.0.24 | Multi-floor, zones, map themes, triggers (+1660 lines) | UNSTABLE - too much at once |
| 0.0.25 | Architecture rewrite for 0.0.24 breakage | Partial fix |
| 0.0.26 | Dreame shortcuts | Clean, port this |
| 0.0.27 | All-floor autocomplete, zone triggers | Regressions |
| 0.0.28 | Fix 0.0.27 regressions | Still had issues |
| 0.0.29 | Unified room data, deferred triggers, zone rename/resize | Best state but on shaky foundation |
| HEAD | SentryLite (80% size reduction) | Good, port this |
