Bedien je Dreame robotstofzuiger met Homey via de Dreame Home cloud API.

Heb je een Matter-compatibele Dreame stofzuiger? Probeer dan eerst Dreame Matter Cleaner (https://homey.app/nl-be/app/com.dreame.cleaner.pro/Dreame-Matter-Cleaner/) — deze biedt lokale bediening zonder cloudafhankelijkheid. Deze app is vooral bedoeld voor oudere of niet-Matter Dreame stofzuigers die alleen via de Dreame Home cloud API bediend kunnen worden.

**Gebruik**
- Installeer deze app op je Homey
- Voeg een apparaat toe en selecteer Dreame > Robotstofzuiger
- Log in met je Dreame Home accountgegevens
- Selecteer je robotstofzuiger uit de lijst

Alleen inloggen met e-mail/wachtwoord wordt ondersteund. Inloggen via derden (Google, Apple, etc.) wordt niet ondersteund.

Als je je hebt aangemeld via Google, Apple of een andere derde partij, moet je eerst een wachtwoord instellen: open de Dreame Home app, ga naar Profiel > Instellingen > Account en Beveiliging > Wachtwoord, en stel een nieuw wachtwoord in. Gebruik je e-mailadres en dit wachtwoord om te koppelen in Homey.

We raden aan een apart Dreame Home account te gebruiken voor Homey om mogelijke sessieconflicten te voorkomen.

**Ondersteunde functies**
- Schoonmaken: Start, Stop, Pauze, Terug naar Dock
- Reinigingsmodi: Stofzuigen, Dweilen, Stofzuigen & Dweilen, Stofzuigen dan Dweilen
- Zuigkracht: Stil, Standaard, Sterk, Turbo
- Watervolume: Laag, Midden, Hoog
- CleanGenius: Uit, Routine Reiniging, Dieptereiniging (met automatische start)
- CleanGenius Modus: Stofzuigen & Dweilen, Dweilen na Stofzuigen
- Reinigingsroute: Standaard, Intensief, Diep, Snel
- Dweilwasfrequentie: Per kamer, elke 5/10/15/20/25 m²
- Dock functies: Automatisch Legen, Zelfreiniging, Drogen, Afvoeren
- Verbruiksartikelen: Hoofdborstel, Zijborstel, Filter, Dweilpad, Sensor (met reset via flow cards)
- Kamerreinigen: Enkele of meerdere kamers op ID met zuigkracht/water/herhalingen, trigger cards per kamer
- Dashboard Widget: Stofzuigerkaart met kamerkleuren, labels, robot- & oplaadpositie, statusbalk
- App Instellingen: Apparaatoverzicht met kaart, statusraster, kamerlijst, verbruiksartikelstatus
- Tapijt: Boost schakelaar, Gevoeligheid (Laag/Midden/Hoog), Reinigingsmodus (Vermijding/Aanpassing/Dweil verwijderen/Stofzuigen & Dweilen/Negeren)
- Dock instellingen: Dweilwasniveau, Watertemperatuur, Leegfrequentie, Dweildruk, Droogtijd, Volume
- Schakelaars: Kinderslot, Hervatten Reinigen, Strak Dweilen, Stil Drogen, Niet Storen
- Status: Batterij, Gereinigd Oppervlak, Reinigingstijd, Totaal Gereinigd Oppervlak, Fout, Opladen, Dock Reiniging, Droogvoortgang, Afvoer, Reinigingsmiddel, Warm Water, Watertank, Vuilwatertank, Stofzak
- Flow cards: 29 acties, 16 condities, 5 triggers

**Niet ondersteund**
Sommige functies uit de Dreame Home app of Tasshack/dreame-vacuum (Home Assistant) kunnen niet worden geïmplementeerd op Homey:
- Interactieve kaart / kamerselectie: De dashboard widget toont een kaart, maar kamers aantikken om te reinigen is niet mogelijk. Gebruik Flow cards.
- Live camerabeeld: Homey ondersteunt geen realtime videostreams.
- Kaart bewerken: Geen kaartbewerkings-UI op Homey. Configureer in de Dreame Home app.
- Virtuele muren / no-go zones: Vereist interactieve kaartbewerking.
- Meubel-/obstakeldetectie: Vereist een beeld-/kaartoverlay.
- Reinigingsgeschiedenis / statistieken: Geen historische grafieken op Homey. Huidige sessiegegevens (oppervlak, tijd) zijn beschikbaar.
- Aangepaste kamerschema's: Gebruik Homey Flows voor tijdgebaseerde automatiseringen.
- Realtime MQTT events: Deze app gebruikt cloud-polling (standaard 15s). Tasshack gebruikt lokale MQTT voor directe updates, wat niet mogelijk is voor Homey cloud apps.
- OTA firmware-updates: Niet relevant voor een Homey app.

Homey blinkt uit in automatiseringen (Flow cards), apparaatbediening en statusmonitoring. Gebruik de Dreame Home app naast Homey voor kaartfuncties, camera of visuele AI.

**Ondersteunde apparaten**
Werkt met Dreame robotstofzuigers die te bedienen zijn via de Dreame Home app, waaronder de X40, X30, L20, L10 en andere modellen.
