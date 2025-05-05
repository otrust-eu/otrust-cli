# OTRUST Command Line Interface

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D%2014.0.0-brightgreen.svg)](https://nodejs.org/)

Ett kraftfullt kommandoradsgränssnitt för interaktion med OTRUST distributed truth protocol.

## Översikt

OTRUST CLI ger dig möjlighet att interagera med OTRUST-protokollet direkt från kommandoraden. Med detta verktyg kan du:

- Skapa och hantera ditt OTRUST-konto
- Skapa nya påståenden (claims)
- Bekräfta, bestrida eller ogiltigförklara existerande påståenden
- Söka och filtrera påståenden
- Verifiera påståenden mot blockkedjan
- Utföra semantiska sökningar
- Visa användar- och systemstatistik

## Installation

### Globalt via npm

```bash
npm install -g otrust-cli
```

### Från källkod

```bash
git clone https://github.com/otrust-eu/otrust-cli.git
cd otrust-cli
npm install
npm link
```

## Komma igång

För att börja använda OTRUST CLI, behöver du konfigurera det och skapa ett nyckelpar:

```bash
# Konfigurera serverns URL
otrust-cli config --server https://api.otrust.eu

# Skapa ett nyckelpar (om du inte redan har ett)
otrust-cli init

# Registrera dig eller logga in
otrust-cli register
# eller
otrust-cli login
```

## Kommandoreferens

### Konfiguration och konto

```bash
# Visa och ändra konfiguration
otrust-cli config [--server <url>] [--print]

# Skapa nyckelpar
otrust-cli init [--force]

# Registrera konto
otrust-cli register

# Logga in
otrust-cli login

# Logga ut
otrust-cli logout

# Uppdatera profil
otrust-cli profile --name "Mitt Namn" --email "email@exempel.se"
```

### Påståenden (Claims)

```bash
# Skapa ett nytt påstående
otrust-cli claim:create --interactive

# Eller skapa direkt med parametrar
otrust-cli claim:create \
  --claim "Stockholm är huvudstad i Sverige" \
  --evidence "https://sv.wikipedia.org/wiki/Stockholm" \
  --type factual \
  --subject "Stockholm" \
  --predicate "huvudstad i" \
  --object "Sverige"

# Hämta ett specifikt påstående
otrust-cli claim:get <id>

# Lista påståenden
otrust-cli claim:list [options]

# Sök efter påståenden
otrust-cli search "Stockholm"

# Verifiera ett påstående mot blockkedjan
otrust-cli verify <id>
```

### Bevis (Proofs)

```bash
# Lägg till bevis till ett påstående (interaktivt)
otrust-cli proof:add --interactive

# Eller lägg till bevis direkt med parametrar
otrust-cli proof:add \
  --claim-id <id> \
  --action confirmed \
  --reason "Detta är korrekt information" \
  --confidence 0.9
```

### Semantiska sökningar

```bash
# Utför en semantisk sökning
otrust-cli semantic "Stockholm" "huvudstad i"
```

### Information och statistik

```bash
# Visa användarinformation
otrust-cli user:info [publicKey]

# Visa blockkedjestatistik
otrust-cli blockchain:stats

# Visa systemstatistik
otrust-cli stats

# Kontrollera serverns status
otrust-cli health
```

## Exempel på användning

### Skapa ett påstående om en faktisk uppgift

```bash
otrust-cli claim:create \
  --claim "Östersjön gränsar till Sverige, Finland, Ryssland, Estland, Lettland, Litauen, Polen, Tyskland och Danmark" \
  --evidence "https://sv.wikipedia.org/wiki/%C3%96stersj%C3%B6n" \
  --type factual \
  --subject "Östersjön" \
  --predicate "gränsar till" \
  --object "Sverige, Finland, Ryssland, Estland, Lettland, Litauen, Polen, Tyskland, Danmark"
```

### Bekräfta ett påstående

```bash
otrust-cli proof:add \
  --claim-id abcdef1234567890 \
  --action confirmed \
  --reason "Denna information är korrekt"
```

### Bestrida ett påstående

```bash
otrust-cli proof:add \
  --claim-id abcdef1234567890 \
  --action disputed \
  --reason "Denna information är inte korrekt eftersom..."
```

### Söka efter påståenden

```bash
# Allmän sökning
otrust-cli search "Östersjön"

# Lista påståenden med filtrering
otrust-cli claim:list --type factual --subject "Östersjön"

# Semantisk sökning
otrust-cli semantic "Östersjön" "gränsar till"
```

## Licens

Detta projekt är licensierat under MIT License - se [LICENSE](LICENSE) filen för detaljer.

## Kontakt och support

För frågor eller support, kontakta oss på:

- Webbplats: [https://otrust.eu](https://otrust.eu)
- Dokumentation: [https://docs.otrust.eu](https://docs.otrust.eu)
