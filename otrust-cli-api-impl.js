/**
 * OTRUST CLI API - Ett JavaScript-bibliotek för att interagera med OTRUST-protokollet
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

/**
 * Huvudklass för OTRUST CLI API
 */
class OtrustCLI {
  /**
   * Skapa en ny instans av OTRUST CLI API
   * @param {Object} options - Konfigurationsalternativ
   * @param {string} options.server - URL till OTRUST-servern
   * @param {string} [options.configDir] - Sökväg till konfigurationsmappen
   * @param {string} [options.logLevel] - Loggnivå (debug, info, warn, error)
   */
  constructor(options = {}) {
    this.server = options.server || 'http://localhost:3000';
    this.configDir = options.configDir || path.join(os.homedir(), '.otrust');
    this.configFile = path.join(this.configDir, 'config.json');
    this.logLevel = options.logLevel || 'info';
    this.config = {
      server: this.server,
      keyPair: null,
      token: null
    };

    // Skapa api-klient
    this.api = axios.create({
      baseURL: this.server
    });

    // Konfigurera axios interceptors för felhanterings
    this.api.interceptors.response.use(
      response => response,
      error => {
        this._log('error', `API Error: ${error.message}`);
        return Promise.reject(error);
      }
    );

    // Ladda konfigurationen om den finns
    this._loadConfig();
  }

  /**
   * Logga meddelanden baserat på loggnivå
   * @private
   * @param {string} level - Loggnivå
   * @param {string} message - Meddelande att logga
   */
  _log(level, message) {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    if (levels[level] >= levels[this.logLevel]) {
      console[level === 'debug' ? 'log' : level](`[OTRUST] ${message}`);
    }
  }

  /**
   * Ställ in loggnivå
   * @param {string} level - Loggnivå (debug, info, warn, error)
   */
  setLogLevel(level) {
    if (['debug', 'info', 'warn', 'error'].includes(level)) {
      this.logLevel = level;
    } else {
      throw new Error(`Ogiltig loggnivå: ${level}`);
    }
  }

  /**
   * Läs konfigurationen från filen
   * @private
   */
  _loadConfig() {
    try {
      if (fs.existsSync(this.configFile)) {
        const data = fs.readFileSync(this.configFile, 'utf8');
        this.config = { ...this.config, ...JSON.parse(data) };
        this.server = this.config.server;
        
        // Uppdatera api-klient med ny server
        this.api.defaults.baseURL = this.server;
        
        // Uppdatera auth token om den finns
        if (this.config.token) {
          this.api.defaults.headers.common['Authorization'] = `Bearer ${this.config.token}`;
        }
        
        this._log('debug', 'Konfiguration laddad');
      }
    } catch (error) {
      this._log('error', `Fel vid laddning av konfiguration: ${error.message}`);
      // Fortsätt med defaultvärden
    }
  }

  /**
   * Spara konfigurationen till filen
   * @private
   */
  _saveConfig() {
    try {
      if (!fs.existsSync(this.configDir)) {
        fs.mkdirSync(this.configDir, { recursive: true });
      }
      fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 2));
      this._log('debug', 'Konfiguration sparad');
    } catch (error) {
      this._log('error', `Fel vid sparande av konfiguration: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generera ett nytt RSA-nyckelpar
   * @private
   * @returns {Object} Nyckelparet med publicKey och privateKey
   */
  _generateKeyPair() {
    try {
      this._log('debug', 'Genererar nytt nyckelpar');
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      });
      return { publicKey, privateKey };
    } catch (error) {
      this._log('error', `Fel vid generering av nyckelpar: ${error.message}`);
      throw error;
    }
  }

  /**
   * Signera data med privat nyckel
   * @private
   * @param {string} data - Data att signera
   * @param {string} [privateKey] - Privat nyckel att använda (använder konfigurerad nyckel om ej angiven)
   * @returns {string} Signaturen som hex-sträng
   */
  _sign(data, privateKey) {
    try {
      const key = privateKey || (this.config.keyPair ? this.config.keyPair.privateKey : null);
      if (!key) {
        throw new Error('Ingen privat nyckel konfigurerad');
      }
      
      const sign = crypto.createSign('SHA256');
      sign.update(data);
      sign.end();
      return sign.sign(key, 'hex');
    } catch (error) {
      this._log('error', `Fel vid signering: ${error.message}`);
      throw error;
    }
  }

  /**
   * Hämta aktuell konfiguration
   * @returns {Object} Konfigurationsobjektet
   */
  async getConfig() {
    return { 
      server: this.config.server,
      hasKeyPair: !!this.config.keyPair,
      isLoggedIn: !!this.config.token
    };
  }

  /**
   * Uppdatera konfigurationen
   * @param {Object} options - Konfigurationsalternativ
   * @param {string} [options.server] - URL till OTRUST-servern
   * @returns {Object} Uppdaterad konfiguration
   */
  async setConfig(options = {}) {
    if (options.server) {
      this.config.server = options.server;
      this.server = options.server;
      this.api.defaults.baseURL = options.server;
    }
    
    this._saveConfig();
    return this.getConfig();
  }

  /**
   * Initialisera ett nytt nyckelpar
   * @param {Object} [options] - Alternativ
   * @param {boolean} [options.force=false] - Tvinga omgenerering av nycklar
   * @returns {Object} Information om nyckelparet
   */
  async init(options = {}) {
    if (!this.config.keyPair || options.force) {
      this.config.keyPair = this._generateKeyPair();
      this._saveConfig();
      this._log('info', 'Nytt nyckelpar genererat');
    } else {
      this._log('info', 'Nyckelpar finns redan');
    }
    
    return {
      publicKey: this.config.keyPair.publicKey.split('\n').slice(1, -2).join('')
    };
  }

  /**
   * Ladda ett externt nyckelpar
   * @param {Object} keyPair - Nyckelparet att ladda
   * @param {string} keyPair.publicKey - Publik nyckel i PEM-format
   * @param {string} keyPair.privateKey - Privat nyckel i PEM-format
   */
  loadKeyPair(keyPair) {
    if (!keyPair.publicKey || !keyPair.privateKey) {
      throw new Error('Både publik och privat nyckel krävs');
    }
    
    this.config.keyPair = {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey
    };
    
    this._saveConfig();
    this._log('info', 'Nyckelpar laddat');
  }

  /**
   * Registrera ett nytt konto på OTRUST-servern
   * @returns {Object} Registreringsresultatet
   */
  async register() {
    if (!this.config.keyPair) {
      throw new Error('Inget nyckelpar konfigurerat. Kör init() först.');
    }
    
    const timestamp = Date.now();
    const payload = JSON.stringify({ 
      action: 'register', 
      publicKey: this.config.keyPair.publicKey, 
      timestamp 
    });
    const signature = this._sign(payload);

    try {
      const response = await this.api.post('/api/auth/register', {
        publicKey: this.config.keyPair.publicKey,
        signature,
        timestamp
      });

      this.config.token = response.data.token;
      this.api.defaults.headers.common['Authorization'] = `Bearer ${this.config.token}`;
      this._saveConfig();
      
      return {
        success: true,
        user: response.data.user
      };
    } catch (error) {
      return {
        success: false,
        error: error.response ? error.response.data : error.message
      };
    }
  }

  /**
   * Logga in på OTRUST-servern
   * @returns {Object} Inloggningsresultatet
   */
  async login() {
    if (!this.config.keyPair) {
      throw new Error('Inget nyckelpar konfigurerat. Kör init() först.');
    }
    
    const timestamp = Date.now();
    const payload = JSON.stringify({ 
      action: 'login', 
      publicKey: this.config.keyPair.publicKey, 
      timestamp 
    });
    const signature = this._sign(payload);

    try {
      const response = await this.api.post('/api/auth/login', {
        publicKey: this.config.keyPair.publicKey,
        signature,
        timestamp
      });

      this.config.token = response.data.token;
      this.api.defaults.headers.common['Authorization'] = `Bearer ${this.config.token}`;
      this._saveConfig();
      
      return {
        success: true,
        user: response.data.user
      };
    } catch (error) {
      return {
        success: false,
        error: error.response ? error.response.data : error.message
      };
    }
  }

  /**
   * Logga ut från OTRUST-servern
   * @returns {Object} Utloggningsresultatet
   */
  async logout() {
    this.config.token = null;
    delete this.api.defaults.headers.common['Authorization'];
    this._saveConfig();
    
    return { success: true };
  }

  /**
   * Uppdatera användarprofil
   * @param {Object} profile - Profildata att uppdatera
   * @param {string} [profile.displayName] - Visningsnamn
   * @param {string} [profile.email] - E-postadress
   * @returns {Object} Uppdateringsresultatet
   */
  async updateProfile(profile = {}) {
    if (!this.config.token) {
      throw new Error('Du måste vara inloggad för att uppdatera profilen');
    }

    try {
      const response = await this.api.put('/api/user/profile', {
        displayName: profile.displayName,
        email: profile.email
      });
      
      return {
        success: true,
        user: response.data.user
      };
    } catch (error) {
      return {
        success: false,
        error: error.response ? error.response.data : error.message
      };
    }
  }

  /**
   * Bygg payload för ett påstående
   * @param {Object} claimData - Data för påståendet
   * @returns {string} JSON-sträng av påståendepayload
   */
  buildClaimPayload(claimData) {
    if (!this.config.keyPair) {
      throw new Error('Inget nyckelpar konfigurerat. Kör init() först.');
    }
    
    const timestamp = Date.now();
    const payload = {
      claim: claimData.claim,
      evidence: claimData.evidence,
      publicKey: this.config.keyPair.publicKey,
      type: claimData.type,
      parent_id: claimData.parent_id || null,
      timestamp,
      semantic: claimData.semantic
    };
    
    return JSON.stringify(payload);
  }

  /**
   * Skapa ett nytt påstående
   * @param {Object} claimData - Data för påståendet
   * @returns {Object} Det skapade påståendet
   */
  async createClaim(claimData) {
    if (!this.config.token) {
      throw new Error('Du måste vara inloggad för att skapa påståenden');
    }

    // Bygg payload
    const payload = this.buildClaimPayload(claimData);
    
    // Signera payload
    const signature = this._sign(payload);
    
    // Skapa påståendeobjekt
    const claim = JSON.parse(payload);
    claim.signature = signature;
    
    try {
      const response = await this.api.post('/api/claim', claim);
      return response.data;
    } catch (error) {
      throw new Error(error.response ? 
        `Fel vid skapande av påstående: ${error.response.data.error}` : 
        `Fel vid skapande av påstående: ${error.message}`);
    }
  }

  /**
   * Skapa ett påstående med färdig signatur
   * @param {string} payload - JSON-sträng av påståendepayload
   * @param {string} signature - Signatur för påståendet
   * @returns {Object} Det skapade påståendet
   */
  async createClaimWithSignature(payload, signature) {
    if (!this.config.token) {
      throw new Error('Du måste vara inloggad för att skapa påståenden');
    }

    const claim = JSON.parse(payload);
    claim.signature = signature;
    
    try {
      const response = await this.api.post('/api/claim', claim);
      return response.data;
    } catch (error) {
      throw new Error(error.response ? 
        `Fel vid skapande av påstående: ${error.response.data.error}` : 
        `Fel vid skapande av påstående: ${error.message}`);
    }
  }

  /**
   * Hämta ett specifikt påstående
   * @param {string} id - ID för påståendet
   * @returns {Object} Påståendet
   */
  async getClaim(id) {
    try {
      const response = await this.api.get(`/api/claim/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response ? 
        `Fel vid hämtning av påstående: ${error.response.data.error}` : 
        `Fel vid hämtning av påstående: ${error.message}`);
    }
  }

  /**
   * Lista påståenden med filtrering
   * @param {Object} options - Filtreringsalternativ
   * @returns {Object} Lista med påståenden
   */
  async listClaims(options = {}) {
    try {
      const response = await this.api.get('/api/claims', { params: options });
      return response.data;
    } catch (error) {
      throw new Error(error.response ? 
        `Fel vid listning av påståenden: ${error.response.data.error}` : 
        `Fel vid listning av påståenden: ${error.message}`);
    }
  }

  /**
   * Sök efter påståenden
   * @param {string} query - Sökfråga
   * @param {Object} options - Sökalternativ
   * @returns {Object} Sökresultat
   */
  async search(query, options = {}) {
    try {
      const params = { q: query, ...options };
      const response = await this.api.get('/api/search', { params });
      return response.data;
    } catch (error) {
      throw new Error(error.response ? 
        `Fel vid sökning: ${error.response.data.error}` : 
        `Fel vid sökning: ${error.message}`);
    }
  }

  /**
   * Verifiera ett påstående mot blockkedjan
   * @param {string} id - ID för påståendet
   * @returns {Object} Verifieringsresultat
   */
  async verify(id) {
    try {
      const response = await this.api.get(`/api/claim/${id}/verify`);
      return response.data;
    } catch (error) {
      throw new Error(error.response ? 
        `Fel vid verifiering: ${error.response.data.error}` : 
        `Fel vid verifiering: ${error.message}`);
    }
  }

  /**
   * Lägg till bevis till ett påstående
   * @param {Object} proofData - Data för beviset
   * @returns {Object} Resultatet av bevisläggningen
   */
  async addProof(proofData) {
    if (!this.config.token) {
      throw new Error('Du måste vara inloggad för att lägga till bevis');
    }

    // Förbereda data för bevis
    const timestamp = Date.now();
    const payload = JSON.stringify({
      claimId: proofData.claimId,
      action: proofData.action,
      publicKey: this.config.keyPair.publicKey,
      timestamp,
      reason: proofData.reason,
      confidence: proofData.confidence
    });
    
    // Signera payload
    const signature = this._sign(payload);
    
    // Skapa bevisobjekt
    const proof = JSON.parse(payload);
    proof.signature = signature;
    
    try {
      const response = await this.api.post('/api/proof', proof);
      return response.data;
    } catch (error) {
      throw new Error(error.response ? 
        `Fel vid läggning av bevis: ${error.response.data.error}` : 
        `Fel vid läggning av bevis: ${error.message}`);
    }
  }

  /**
   * Utför en semantisk sökning
   * @param {string} subject - Subjekt
   * @param {string} predicate - Predikat
   * @returns {Object} Resultat av semantisk sökning
   */
  async semanticQuery(subject, predicate) {
    try {
      const response = await this.api.get(`/api/semantic/${subject}/${predicate}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response ? 
        `Fel vid semantisk sökning: ${error.response.data.error}` : 
        `Fel vid semantisk sökning: ${error.message}`);
    }
  }

  /**
   * Få information om en användare
   * @param {string} [publicKey] - Publik nyckel för användaren (om ej angiven används inloggad användare)
   * @returns {Object} Användarinformation
   */
  async getUserInfo(publicKey) {
    try {
      const key = publicKey || (this.config.keyPair ? this.config.keyPair.publicKey : null);
      if (!key) {
        throw new Error('Ingen publik nyckel angiven och du är inte inloggad');
      }
      
      const response = await this.api.get(`/api/user/${key}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response ? 
        `Fel vid hämtning av användarinfo: ${error.response.data.error}` : 
        `Fel vid hämtning av användarinfo: ${error.message}`);
    }
  }

  /**
   * Få statistik om blockkedjan
   * @returns {Object} Blockkedjestatistik
   */
  async getBlockchainStats() {
    try {
      const response = await this.api.get('/api/blockchain/stats');
      return response.data;
    } catch (error) {
      throw new Error(error.response ? 
        `Fel vid hämtning av blockkedjestatistik: ${error.response.data.error}` : 
        `Fel vid hämtning av blockkedjestatistik: ${error.message}`);
    }
  }

  /**
   * Få systemstatistik
   * @returns {Object} Systemstatistik
   */
  async getSystemStats() {
    try {
      const response = await this.api.get('/api/stats');
      return response.data;
    } catch (error) {
      throw new Error(error.response ? 
        `Fel vid hämtning av systemstatistik: ${error.response.data.error}` : 
        `Fel vid hämtning av systemstatistik: ${error.message}`);
    }
  }

  /**
   * Kontrollera serverns hälsa
   * @returns {Object} Hälsoinformation
   */
  async getHealth() {
    try {
      const response = await this.api.get('/health');
      return response.data;
    } catch (error) {
      throw new Error(error.response ? 
        `Fel vid hälsokontroll: ${error.response.data.error}` : 
        `Fel vid hälsokontroll: ${error.message}`);
    }
  }
}

module.exports = OtrustCLI;
