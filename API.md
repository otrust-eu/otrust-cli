# OTRUST CLI API

Det här dokumentet beskriver hur du kan använda OTRUST CLI som ett JavaScript-bibliotek i dina egna applikationer. Detta gör det möjligt att integrera OTRUST-funktioner i andra program eller skript.

## Installation

Installera OTRUST CLI som en beroende i ditt projekt:

```bash
npm install otrust-cli
```

## Grundläggande användning

```javascript
const OtrustCLI = require('otrust-cli/lib/api');

// Skapa en instans
const otrust = new OtrustCLI({
  server: 'https://api.otrust.example.com'
});

// Använd API-funktioner
async function main() {
  // Initiera nyckelpar om det behövs
  await otrust.init();
  
  // Logga in
  const loginResult = await otrust.login();
  console.log('Inloggad:', loginResult.success);
  
  // Skapa ett påstående (claim)
  const claim = await otrust.createClaim({
    claim: 'Stockholm är huvudstad i Sverige',
    evidence: ['https://sv.wikipedia.org/wiki/Stockholm'],
    type: 'factual',
    semantic: {
      subject: 'Stockholm',
      predicate: 'huvudstad i',
      object: 'Sverige'
    }
  });
  
  console.log('Claim skapad med ID:', claim.id);
}

main().catch(console.error);
```

## API-referens

### Konstruktor

```javascript
const otrust = new OtrustCLI(options);
```

Parametrar:
- `options` (objekt):
  - `server` (sträng): URL till OTRUST-servern
  - `configDir` (sträng, valfri): Sökväg till konfigurationsmappen (standard: ~/.otrust)
  - `logLevel` (sträng, valfri): Loggnivå (debug, info, warn, error)

### Metoder

#### Konfiguration och konto

```javascript
// Läs konfiguration
const config = await otrust.getConfig();

// Uppdatera konfiguration
await otrust.setConfig({ server: 'https://new-server.example.com' });

// Skapa nytt nyckelpar
const keyPair = await otrust.init({ force: false });

// Registrera konto
const registerResult = await otrust.register();

// Logga in
const loginResult = await otrust.login();

// Logga ut
await otrust.logout();

// Uppdatera profil
await otrust.updateProfile({
  displayName: 'Mitt Namn',
  email: 'email@exempel.se'
});
```

#### Påståenden (Claims)

```javascript
// Skapa ett nytt påstående
const claim = await otrust.createClaim({
  claim: 'Påståendetext',
  evidence: ['https://exempel.se/evidens'],
  type: 'factual', // factual, opinion, analysis, reference
  semantic: {
    subject: 'Subjekt',
    predicate: 'Predikat',
    object: 'Objekt'
  }
});

// Hämta ett specifikt påstående
const claimDetails = await otrust.getClaim('claimId');

// Lista påståenden
const claims = await otrust.listClaims({
  page: 1,
  limit: 10,
  type: 'factual',
  subject: 'Subjekt',
  predicate: 'Predikat',
  object: 'Objekt',
  publicKey: 'användarensPublikaKey',
  verified: true,
  sort: 'newest' // newest, oldest, credibility
});

// Sök efter påståenden
const searchResults = await otrust.search('sökterm', { limit: 10 });

// Verifiera ett påstående mot blockkedjan
const verificationResult = await otrust.verify('claimId');
```

#### Bevis (Proofs)

```javascript
// Lägg till bevis till ett påstående
const proofResult = await otrust.addProof({
  claimId: 'claimId',
  action: 'confirmed', // confirmed, disputed, invalidated
  reason: 'Anledning till åtgärden',
  confidence: 0.9 // 0.0 till 1.0
});
```

#### Semantiska sökningar

```javascript
// Utför en semantisk sökning
const semanticResult = await otrust.semanticQuery('Subjekt', 'Predikat');
```

#### Information och statistik

```javascript
// Visa användarinformation
const userInfo = await otrust.getUserInfo('publicKey'); // Utan parameter: aktuell användare

// Visa blockkedjestatistik
const blockchainStats = await otrust.getBlockchainStats();

// Visa systemstatistik
const systemStats = await otrust.getSystemStats();

// Kontrollera serverns status
const health = await otrust.getHealth();
```

## Avancerad användning

### Hantera signaturer manuellt

Om du vill ha mer kontroll över signaturprocessen:

```javascript
// Hämta raw payload för ett påstående
const payload = otrust.buildClaimPayload({
  claim: 'Påståendetext',
  evidence: ['https://exempel.se/evidens'],
  type: 'factual',
  semantic: {
    subject: 'Subjekt',
    predicate: 'Predikat',
    object: 'Objekt'
  }
});

// Signera med din egen nyckel
const signature = yourSignFunction(payload);

// Skapa påstående med egen signatur
const claim = await otrust.createClaimWithSignature(payload, signature);
```

### Direktinteraktion med API

För att interagera direkt med OTRUST-servern:

```javascript
// Använd den interna API-klienten
const response = await otrust.api.get('/api/stats');
const stats = response.data;

// Eller gör en POST-förfrågan
const response = await otrust.api.post('/api/endpoint', { data: value });
```

## Felhantering

Alla metoder kastar undantag när fel uppstår. Använd try/catch för att hantera dem:

```javascript
try {
  await otrust.getClaim('nonexistentId');
} catch (error) {
  console.error('Fel:', error.message);
  
  // API-fel innehåller ytterligare information
  if (error.response) {
    console.error('Status:', error.response.status);
    console.error('Serverfelmeddelande:', error.response.data.error);
  }
}
```

## Exempel

### Skapa ett påstående och verifiera det

```javascript
async function createAndVerify() {
  // Logga in
  await otrust.login();
  
  // Skapa ett påstående
  const claim = await otrust.createClaim({
    claim: 'Jorden kretsar runt solen',
    evidence: ['https://sv.wikipedia.org/wiki/Jorden'],
    type: 'factual',
    semantic: {
      subject: 'Jorden',
      predicate: 'kretsar runt',
      object: 'solen'
    }
  });
  
  console.log('Påstående skapat:', claim.id);
  
  // Vänta tills blockkedjan har behandlat påståendet
  // Detta kan ta några minuter beroende på serverinställningar
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Verifiera påståendet
  const verification = await otrust.verify(claim.id);
  
  if (verification.verified) {
    console.log('Påståendet är verifierat i blockkedjan!');
    console.log('Block:', verification.blockHash);
  } else {
    console.log('Påståendet är inte verifierat än:', verification.message);
  }
}
```

### Söka och filtrera påståenden

```javascript
async function searchAndFilter() {
  // Sök efter ett nyckelord
  const results = await otrust.search('klimat');
  console.log(`Hittade ${results.count} resultat för "klimat"`);
  
  // Lista påståenden med filtrering
  const claims = await otrust.listClaims({
    type: 'factual',
    subject: 'CO2',
    sort: 'credibility',
    verified: true,
    limit: 20
  });
  
  console.log(`Hittade ${claims.meta.total} verifierade påståenden om CO2`);
  claims.claims.forEach(claim => {
    console.log(`- ${claim.claim} (trovärdighet: ${claim.credibilityScore})`);
  });
}
```

### Utföra semantiska sökningar

```javascript
async function semanticSearch() {
  // Hitta alla påståenden om "Stockholm" som "huvudstad i"
  const result = await otrust.semanticQuery('Stockholm', 'huvudstad i');
  
  if (result.hasConsensus) {
    console.log(`Konsensus: Stockholm är huvudstad i ${result.consensusValue}`);
  } else {
    console.log('Ingen konsensus hittad, alternativa värden:');
    result.objects.forEach(obj => {
      console.log(`- ${obj.object} (trovärdighet: ${obj.credibility})`);
    });
  }
}
```

## Integrera med webbapplikationer

För att integrera med webbapplikationer, används följande mönster:

```javascript
// På serversidan (Node.js)
const express = require('express');
const OtrustCLI = require('otrust-cli/lib/api');

const app = express();
const otrust = new OtrustCLI({
  server: process.env.OTRUST_SERVER
});

// Ladda nycklar från miljövariabler eller annan säker lagring
otrust.loadKeyPair({
  publicKey: process.env.OTRUST_PUBLIC_KEY,
  privateKey: process.env.OTRUST_PRIVATE_KEY
});

app.get('/api/claims', async (req, res) => {
  try {
    const claims = await otrust.listClaims({
      page: req.query.page || 1,
      limit: req.query.limit || 10
    });
    res.json(claims);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/claims', async (req, res) => {
  try {
    const claim = await otrust.createClaim(req.body);
    res.status(201).json(claim);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('API körs på port 3000');
});
```

## Prestanda och bästa praxis

1. **Återanvänd instansen**: Skapa en instans av `OtrustCLI` och återanvänd den för att undvika att läsa konfigurationsfilen flera gånger.

2. **Hantera caching**: För att minska antalet nätverksanrop, överväg att cacha resultat:

```javascript
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 60 }); // 60 sekunder TTL

async function getCachedClaim(id) {
  const cacheKey = `claim_${id}`;
  
  // Kontrollera cachen först
  const cachedClaim = cache.get(cacheKey);
  if (cachedClaim) {
    return cachedClaim;
  }
  
  // Hämta från API om det inte finns i cachen
  const claim = await otrust.getClaim(id);
  
  // Spara i cachen
  cache.set(cacheKey, claim);
  
  return claim;
}
```

3. **Batchbearbetning**: För att hantera många påståenden effektivt:

```javascript
async function processClaimsBatch(claimIds) {
  // Använd Promise.all för parallell bearbetning
  const results = await Promise.all(
    claimIds.map(id => otrust.getClaim(id).catch(err => ({ id, error: err.message })))
  );
  
  return results;
}
```

## Säkerhetsöverväganden

1. **Skydda privata nycklar**: Spara aldrig privata nycklar i kodbasen eller offentliga konfigurationsfiler.

2. **Använd miljövariabler**: För servertillämpningar, använd miljövariabler för känslig information:

```javascript
// .env fil
OTRUST_SERVER=https://api.otrust.example.com
OTRUST_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...

// Kod
require('dotenv').config();
const otrust = new OtrustCLI({
  server: process.env.OTRUST_SERVER
});
```

3. **Rollbaserad åtkomst**: För serverapplikationer som hanterar många användare, överväg att använda olika nycklar med olika behörigheter.

## Felsökning

För att aktivera detaljerad loggning:

```javascript
const otrust = new OtrustCLI({
  server: 'https://api.otrust.example.com',
  logLevel: 'debug'
});

// Alternativt, aktivera loggning för befintlig instans
otrust.setLogLevel('debug');
```

## Mer information

För komplett källkod och exempel, se GitHub-repositoryt för OTRUST CLI: 
https://github.com/otrust-eu/otrust-cli

För information om OTRUST API:et, se:
https://docs.otrust.eu/api
