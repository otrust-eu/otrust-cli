#!/usr/bin/env node

/**
 * OTRUST CLI - Command Line Interface for the OTRUST distributed truth protocol
 * 
 * This CLI provides tools for interacting with an OTRUST server, including:
 * - Account management
 * - Creating and verifying claims
 * - Adding proofs to claims
 * - Searching and querying claims
 * - Blockchain verification
 */

const { Command } = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const axios = require('axios');
const ora = require('ora');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');
const Table = require('cli-table3');
const { Parser } = require('json2csv');

// Initialize CLI program
const program = new Command();

// Configuration
const CONFIG_DIR = path.join(os.homedir(), '.otrust');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
let config = {
  server: 'http://localhost:3000',
  keyPair: null,
  token: null
};

// Initialize configuration
function initConfig() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }

  if (fs.existsSync(CONFIG_FILE)) {
    try {
      config = { ...config, ...JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) };
    } catch (error) {
      console.error(chalk.red('Error loading config file:'), error.message);
    }
  } else {
    saveConfig();
  }
}

// Save configuration
function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error(chalk.red('Error saving config file:'), error.message);
  }
}

// Generate a new key pair
function generateKeyPair() {
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
}

// Sign data with private key
function signData(data, privateKey) {
  const sign = crypto.createSign('SHA256');
  sign.update(data);
  sign.end();
  return sign.sign(privateKey, 'hex');
}

// Set up axios with auth token
function getAxiosInstance() {
  const instance = axios.create({
    baseURL: config.server,
    headers: config.token ? {
      'Authorization': `Bearer ${config.token}`
    } : {}
  });

  // Add interceptor for error handling
  instance.interceptors.response.use(
    response => response,
    error => {
      if (error.response) {
        if (error.response.status === 401) {
          console.error(chalk.red('Authentication error:'), 'Please login first');
        } else if (error.response.data && error.response.data.error) {
          console.error(chalk.red(`Error (${error.response.status}):`), error.response.data.error);
          if (error.response.data.message) {
            console.error(chalk.yellow('Details:'), error.response.data.message);
          }
        } else {
          console.error(chalk.red(`Error ${error.response.status}:`), error.response.statusText);
        }
      } else if (error.request) {
        console.error(chalk.red('Network error:'), 'Could not connect to server');
      } else {
        console.error(chalk.red('Error:'), error.message);
      }
      return Promise.reject(error);
    }
  );

  return instance;
}

// CLI version and description
program
  .name('otrust-cli')
  .description('Command line interface for the OTRUST distributed truth protocol')
  .version('1.0.0');

// Config command
program
  .command('config')
  .description('Manage CLI configuration')
  .option('-s, --server <url>', 'Set the OTRUST server URL')
  .option('-p, --print', 'Print current configuration')
  .action((options) => {
    if (options.server) {
      config.server = options.server;
      saveConfig();
      console.log(chalk.green('Server URL updated:'), config.server);
    }

    if (options.print || (!options.server)) {
      console.log(chalk.cyan('Current configuration:'));
      console.log('Server URL:', config.server);
      console.log('Public key:', config.keyPair ? 'Configured' : 'Not configured');
      console.log('Authentication:', config.token ? 'Logged in' : 'Not logged in');
    }
  });

// Initialize key pair
program
  .command('init')
  .description('Initialize a new key pair')
  .option('-f, --force', 'Force regeneration of keys')
  .action((options) => {
    if (config.keyPair && !options.force) {
      console.log(chalk.yellow('Key pair already exists.'), 'Use --force to regenerate');
      return;
    }

    const spinner = ora('Generating key pair...').start();
    try {
      config.keyPair = generateKeyPair();
      saveConfig();
      spinner.succeed('Key pair generated and saved');
      console.log(chalk.green('Public key:'));
      console.log(config.keyPair.publicKey.split('\n').slice(1, -2).join(''));
    } catch (error) {
      spinner.fail('Failed to generate key pair');
      console.error(chalk.red('Error:'), error.message);
    }
  });

// Register account
program
  .command('register')
  .description('Register a new account with the OTRUST server')
  .action(async () => {
    if (!config.keyPair) {
      console.error(chalk.red('Error:'), 'No key pair found. Run "otrust-cli init" first');
      return;
    }

    const spinner = ora('Registering account...').start();
    try {
      const timestamp = Date.now();
      const payload = JSON.stringify({ action: 'register', publicKey: config.keyPair.publicKey, timestamp });
      const signature = signData(payload, config.keyPair.privateKey);

      const api = getAxiosInstance();
      const response = await api.post('/api/auth/register', {
        publicKey: config.keyPair.publicKey,
        signature,
        timestamp
      });

      config.token = response.data.token;
      saveConfig();

      spinner.succeed('Account registered successfully');
      console.log(chalk.green('You are now logged in as:'), response.data.user.publicKey);
    } catch (error) {
      spinner.fail('Registration failed');
      // Error handled by axios interceptor
    }
  });

// Login
program
  .command('login')
  .description('Login to the OTRUST server')
  .action(async () => {
    if (!config.keyPair) {
      console.error(chalk.red('Error:'), 'No key pair found. Run "otrust-cli init" first');
      return;
    }

    const spinner = ora('Logging in...').start();
    try {
      const timestamp = Date.now();
      const payload = JSON.stringify({ action: 'login', publicKey: config.keyPair.publicKey, timestamp });
      const signature = signData(payload, config.keyPair.privateKey);

      const api = getAxiosInstance();
      const response = await api.post('/api/auth/login', {
        publicKey: config.keyPair.publicKey,
        signature,
        timestamp
      });

      config.token = response.data.token;
      saveConfig();

      spinner.succeed('Login successful');
      console.log(chalk.green('You are logged in as:'), response.data.user.publicKey);
      if (response.data.user.displayName) {
        console.log('Display name:', response.data.user.displayName);
      }
      console.log('Score:', response.data.user.score);
    } catch (error) {
      spinner.fail('Login failed');
      // Error handled by axios interceptor
    }
  });

// Logout
program
  .command('logout')
  .description('Logout from the OTRUST server')
  .action(() => {
    if (!config.token) {
      console.log(chalk.yellow('You are not logged in'));
      return;
    }

    config.token = null;
    saveConfig();
    console.log(chalk.green('Logged out successfully'));
  });

// Update profile
program
  .command('profile')
  .description('Update user profile')
  .option('-n, --name <name>', 'Set display name')
  .option('-e, --email <email>', 'Set email address')
  .action(async (options) => {
    if (!config.token) {
      console.error(chalk.red('Error:'), 'You must be logged in to update your profile');
      return;
    }

    if (!options.name && !options.email) {
      console.log(chalk.yellow('No updates provided.'), 'Use --name or --email to update profile');
      return;
    }

    const spinner = ora('Updating profile...').start();
    try {
      const api = getAxiosInstance();
      const response = await api.put('/api/user/profile', {
        displayName: options.name,
        email: options.email
      });

      spinner.succeed('Profile updated successfully');
      console.log(chalk.green('Profile:'));
      console.log('Public key:', response.data.user.publicKey);
      console.log('Display name:', response.data.user.displayName || 'Not set');
      console.log('Score:', response.data.user.score);
    } catch (error) {
      spinner.fail('Profile update failed');
      // Error handled by axios interceptor
    }
  });

// Create a claim
program
  .command('claim:create')
  .description('Create a new claim')
  .option('-i, --interactive', 'Use interactive mode')
  .option('-c, --claim <text>', 'Claim text')
  .option('-e, --evidence <urls>', 'Evidence URLs (comma-separated)')
  .option('-t, --type <type>', 'Claim type (factual, opinion, analysis, reference)')
  .option('-s, --subject <subject>', 'Semantic subject')
  .option('-p, --predicate <predicate>', 'Semantic predicate')
  .option('-o, --object <object>', 'Semantic object')
  .action(async (options) => {
    if (!config.token || !config.keyPair) {
      console.error(chalk.red('Error:'), 'You must be logged in to create a claim');
      return;
    }

    let claimData = {
      claim: options.claim,
      evidence: options.evidence ? options.evidence.split(',').map(e => e.trim()) : null,
      type: options.type,
      semantic: {
        subject: options.subject,
        predicate: options.predicate,
        object: options.object
      }
    };

    // Interactive mode
    if (options.interactive || !claimData.claim || !claimData.evidence || !claimData.type ||
      !claimData.semantic.subject || !claimData.semantic.predicate || !claimData.semantic.object) {
      
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'claim',
          message: 'Enter your claim text:',
          default: claimData.claim,
          validate: input => input.length >= 3 && input.length <= 5000 ? true : 'Claim must be between 3 and 5000 characters'
        },
        {
          type: 'input',
          name: 'evidence',
          message: 'Enter evidence URLs (comma-separated):',
          default: claimData.evidence ? claimData.evidence.join(', ') : '',
          validate: input => input.length > 0 ? true : 'At least one evidence URL is required',
          filter: input => input.split(',').map(url => url.trim())
        },
        {
          type: 'list',
          name: 'type',
          message: 'Select claim type:',
          default: claimData.type,
          choices: ['factual', 'opinion', 'analysis', 'reference']
        },
        {
          type: 'input',
          name: 'subject',
          message: 'Enter semantic subject:',
          default: claimData.semantic.subject,
          validate: input => input.length > 0 ? true : 'Subject is required'
        },
        {
          type: 'input',
          name: 'predicate',
          message: 'Enter semantic predicate:',
          default: claimData.semantic.predicate,
          validate: input => input.length > 0 ? true : 'Predicate is required'
        },
        {
          type: 'input',
          name: 'object',
          message: 'Enter semantic object:',
          default: claimData.semantic.object,
          validate: input => input.length > 0 ? true : 'Object is required'
        }
      ]);

      claimData = {
        claim: answers.claim,
        evidence: answers.evidence,
        type: answers.type,
        semantic: {
          subject: answers.subject,
          predicate: answers.predicate,
          object: answers.object
        }
      };
    }

    // Add timestamp and sign
    const timestamp = Date.now();
    claimData.timestamp = timestamp;
    claimData.publicKey = config.keyPair.publicKey;
    claimData.parent_id = null;

    const payload = JSON.stringify({
      claim: claimData.claim,
      evidence: claimData.evidence,
      publicKey: claimData.publicKey,
      type: claimData.type,
      parent_id: claimData.parent_id,
      timestamp: claimData.timestamp,
      semantic: claimData.semantic
    });

    claimData.signature = signData(payload, config.keyPair.privateKey);

    const spinner = ora('Creating claim...').start();
    try {
      const api = getAxiosInstance();
      const response = await api.post('/api/claim', claimData);

      spinner.succeed('Claim created successfully');
      console.log(chalk.green('Claim ID:'), response.data.id);
      console.log('Blockchain Status:', response.data.blockchainStatus);
      
      if (response.data.conflicts && response.data.conflicts.length > 0) {
        console.log(chalk.yellow('\nWarning:'), 'Potential conflicting claims found:');
        response.data.conflicts.forEach(conflict => {
          console.log(`- ${conflict.id}: ${conflict.claim.substring(0, 50)}...`);
        });
      }
    } catch (error) {
      spinner.fail('Failed to create claim');
      // Error handled by axios interceptor
    }
  });

// Add proof to a claim
program
  .command('proof:add')
  .description('Add a proof to a claim')
  .option('-i, --interactive', 'Use interactive mode')
  .option('-c, --claim-id <id>', 'Claim ID')
  .option('-a, --action <action>', 'Action (confirmed, disputed, invalidated)')
  .option('-r, --reason <text>', 'Reason for your action')
  .option('-cf, --confidence <float>', 'Confidence level (0.0 to 1.0)')
  .action(async (options) => {
    if (!config.token || !config.keyPair) {
      console.error(chalk.red('Error:'), 'You must be logged in to add a proof');
      return;
    }

    let proofData = {
      claimId: options.claimId,
      action: options.action,
      reason: options.reason,
      confidence: options.confidence ? parseFloat(options.confidence) : 1.0
    };

    // Interactive mode
    if (options.interactive || !proofData.claimId || !proofData.action) {
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'claimId',
          message: 'Enter claim ID:',
          default: proofData.claimId,
          validate: input => input.length > 0 ? true : 'Claim ID is required'
        },
        {
          type: 'list',
          name: 'action',
          message: 'Select action:',
          default: proofData.action,
          choices: ['confirmed', 'disputed', 'invalidated']
        },
        {
          type: 'input',
          name: 'reason',
          message: 'Enter reason for your action (optional):',
          default: proofData.reason
        },
        {
          type: 'input',
          name: 'confidence',
          message: 'Enter confidence level (0.0 to 1.0):',
          default: proofData.confidence,
          validate: input => {
            const value = parseFloat(input);
            return (!isNaN(value) && value >= 0 && value <= 1) ? true : 'Confidence must be between 0.0 and 1.0';
          },
          filter: input => parseFloat(input)
        }
      ]);

      proofData = {
        claimId: answers.claimId,
        action: answers.action,
        reason: answers.reason,
        confidence: answers.confidence
      };
    }

    // Add timestamp and sign
    const timestamp = Date.now();
    proofData.timestamp = timestamp;
    proofData.publicKey = config.keyPair.publicKey;

    const payload = JSON.stringify({
      claimId: proofData.claimId,
      action: proofData.action,
      publicKey: proofData.publicKey,
      timestamp: proofData.timestamp,
      reason: proofData.reason,
      confidence: proofData.confidence
    });

    proofData.signature = signData(payload, config.keyPair.privateKey);

    const spinner = ora('Adding proof...').start();
    try {
      const api = getAxiosInstance();
      const response = await api.post('/api/proof', proofData);

      spinner.succeed('Proof added successfully');
      console.log(chalk.green('Claim ID:'), response.data.claimId);
      console.log('Blockchain Status:', response.data.blockchainStatus);
      console.log(chalk.cyan('Credibility:'));
      console.log('Score:', response.data.credibility.score.toFixed(2));
      console.log('Confirmations:', response.data.credibility.confirmations);
      console.log('Disputes:', response.data.credibility.disputes);
    } catch (error) {
      spinner.fail('Failed to add proof');
      // Error handled by axios interceptor
    }
  });

// Get claim details
program
  .command('claim:get')
  .description('Get details for a specific claim')
  .argument('<id>', 'Claim ID')
  .action(async (id) => {
    const spinner = ora('Fetching claim...').start();
    try {
      const api = getAxiosInstance();
      const response = await api.get(`/api/claim/${id}`);
      const claim = response.data.claim;

      spinner.succeed('Claim details:');
      
      console.log(chalk.green('\nClaim Information:'));
      console.log('ID:', claim.id);
      console.log('Type:', claim.type);
      console.log('Created:', new Date(claim.timestamp).toLocaleString());
      console.log('Credibility Score:', response.data.credibility.score.toFixed(2));

      console.log(chalk.green('\nClaim Content:'));
      console.log(claim.claim);

      console.log(chalk.green('\nSemantic Structure:'));
      console.log(`${claim.semantic.subject} ${claim.semantic.predicate} ${claim.semantic.object}`);

      console.log(chalk.green('\nEvidence:'));
      claim.evidence.forEach((url, i) => {
        console.log(`${i+1}. ${url}`);
      });

      console.log(chalk.green('\nProofs:'));
      if (claim.proofChain && claim.proofChain.length > 0) {
        const table = new Table({
          head: ['Action', 'User', 'Timestamp', 'Reason'],
          colWidths: [15, 15, 25, 40]
        });

        claim.proofChain.forEach(proof => {
          table.push([
            proof.action,
            proof.publicKey.substring(0, 12) + '...',
            new Date(proof.timestamp).toLocaleString(),
            proof.reason || '-'
          ]);
        });

        console.log(table.toString());
      } else {
        console.log('No proofs yet');
      }

      console.log(chalk.green('\nBlockchain Verification:'));
      if (response.data.blockchainVerification) {
        console.log('Status: Verified on blockchain');
        console.log('Block Hash:', response.data.blockchainVerification.blockHash);
        console.log('Block Index:', response.data.blockchainVerification.blockIndex);
        console.log('Timestamp:', response.data.blockchainVerification.timestamp);
      } else {
        console.log('Status: Not verified on blockchain yet');
      }

      if (response.data.relatedClaims && response.data.relatedClaims.length > 0) {
        console.log(chalk.green('\nRelated Claims:'));
        response.data.relatedClaims.forEach(related => {
          console.log(`- ${related.id}: ${related.claim.substring(0, 50)}...`);
        });
      }
    } catch (error) {
      spinner.fail('Failed to fetch claim');
      // Error handled by axios interceptor
    }
  });

// List claims
program
  .command('claim:list')
  .description('List claims with optional filtering')
  .option('-p, --page <number>', 'Page number', '1')
  .option('-l, --limit <number>', 'Results per page', '10')
  .option('-t, --type <type>', 'Filter by claim type')
  .option('-s, --subject <subject>', 'Filter by semantic subject')
  .option('-pr, --predicate <predicate>', 'Filter by semantic predicate')
  .option('-o, --object <object>', 'Filter by semantic object')
  .option('-u, --user <publicKey>', 'Filter by user public key')
  .option('-v, --verified <boolean>', 'Filter by verification status')
  .option('--sort <field>', 'Sort by field (newest, oldest, credibility)', 'newest')
  .option('--csv', 'Output in CSV format')
  .action(async (options) => {
    const spinner = ora('Fetching claims...').start();
    try {
      const api = getAxiosInstance();
      const params = {};
      
      // Add pagination
      params.page = parseInt(options.page);
      params.limit = parseInt(options.limit);
      
      // Add filters
      if (options.type) params.type = options.type;
      if (options.subject) params.subject = options.subject;
      if (options.predicate) params.predicate = options.predicate;
      if (options.object) params.object = options.object;
      if (options.user) params.publicKey = options.user;
      if (options.verified) params.verified = options.verified === 'true';
      
      // Add sorting
      if (options.sort === 'oldest') params.sort = 'oldest';
      else if (options.sort === 'credibility') params.sort = 'credibility';
      else params.sort = 'newest';
      
      const response = await api.get('/api/claims', { params });
      const { claims, meta } = response.data;

      spinner.succeed(`Found ${meta.total} claims`);
      
      if (options.csv) {
        // Output as CSV
        const fields = ['id', 'claim', 'type', 'publicKey', 'timestamp', 'credibilityScore'];
        const parser = new Parser({ fields });
        const csv = parser.parse(claims.map(claim => ({
          ...claim,
          timestamp: new Date(claim.timestamp).toISOString()
        })));
        console.log(csv);
      } else {
        // Output as table
        const table = new Table({
          head: ['ID', 'Claim', 'Type', 'User', 'Date', 'Score'],
          colWidths: [15, 40, 10, 15, 16, 7]
        });

        claims.forEach(claim => {
          const claimText = claim.claim.length > 37 ? claim.claim.substring(0, 34) + '...' : claim.claim;
          table.push([
            claim.id.substring(0, 12) + '...',
            claimText,
            claim.type,
            claim.publicKey.substring(0, 12) + '...',
            new Date(claim.timestamp).toLocaleDateString(),
            claim.credibilityScore ? claim.credibilityScore.toFixed(1) : '-'
          ]);
        });

        console.log(table.toString());
        
        // Pagination info
        console.log(chalk.cyan(`Page ${meta.page} of ${meta.totalPages} (${meta.total} total claims)`));
        
        if (meta.hasNext || meta.hasPrev) {
          console.log(chalk.yellow('\nNavigation:'));
          if (meta.hasPrev) {
            console.log(`Previous page: otrust-cli claim:list --page ${meta.page - 1} --limit ${meta.limit}`);
          }
          if (meta.hasNext) {
            console.log(`Next page: otrust-cli claim:list --page ${meta.page + 1} --limit ${meta.limit}`);
          }
        }
      }
    } catch (error) {
      spinner.fail('Failed to fetch claims');
      // Error handled by axios interceptor
    }
  });

// Search claims
program
  .command('search')
  .description('Search for claims')
  .argument('<query>', 'Search query')
  .option('-l, --limit <number>', 'Maximum results', '10')
  .action(async (query, options) => {
    const spinner = ora(`Searching for "${query}"...`).start();
    try {
      const api = getAxiosInstance();
      const response = await api.get('/api/search', {
        params: {
          q: query,
          limit: parseInt(options.limit)
        }
      });

      spinner.succeed(`Found ${response.data.count} results (${response.data.searchType} search)`);
      
      if (response.data.count === 0) {
        console.log(chalk.yellow('No results found'));
        return;
      }
      
      const table = new Table({
        head: ['ID', 'Claim', 'Subject - Predicate - Object', 'Score'],
        colWidths: [15, 40, 36, 7]
      });

      response.data.results.forEach(result => {
        const claimText = result.claim.length > 37 ? result.claim.substring(0, 34) + '...' : result.claim;
        const semanticStr = `${result.semantic.subject} - ${result.semantic.predicate} - ${result.semantic.object}`;
        const semanticText = semanticStr.length > 33 ? semanticStr.substring(0, 30) + '...' : semanticStr;
        
        table.push([
          result.id.substring(0, 12) + '...',
          claimText,
          semanticText,
          result.credibilityScore ? result.credibilityScore.toFixed(1) : '-'
        ]);
      });

      console.log(table.toString());
    } catch (error) {
      spinner.fail('Search failed');
      // Error handled by axios interceptor
    }
  });

// Semantic query
program
  .command('semantic')
  .description('Perform a semantic query')
  .argument('<subject>', 'Subject')
  .argument('<predicate>', 'Predicate')
  .action(async (subject, predicate) => {
    const spinner = ora(`Querying semantic data...`).start();
    try {
      const api = getAxiosInstance();
      const response = await api.get(`/api/semantic/${subject}/${predicate}`);

      spinner.succeed(`Semantic query results`);
      
      console.log(chalk.green(`Subject: ${subject}`));
      console.log(chalk.green(`Predicate: ${predicate}`));
      
      if (response.data.hasConsensus) {
        console.log(chalk.cyan('\nConsensus value:'), response.data.consensusValue);
      } else {
        console.log(chalk.yellow('\nNo consensus. Multiple values found:'));
      }
      
      const table = new Table({
        head: ['Object', 'Credibility', 'Confirmations', 'Disputes', 'Claim ID'],
        colWidths: [30, 12, 15, 10, 20]
      });

      response.data.objects.forEach(obj => {
        table.push([
          obj.object.length > 27 ? obj.object.substring(0, 24) + '...' : obj.object,
          obj.credibility.toFixed(2),
          obj.confirmations,
          obj.disputes,
          obj.claimId.substring(0, 17) + '...'
        ]);
      });

      console.log(table.toString());
    } catch (error) {
      spinner.fail('Semantic query failed');
      // Error handled by axios interceptor
    }
  });

// Verify claim
program
  .command('verify')
  .description('Verify a claim against the blockchain')
  .argument('<id>', 'Claim ID')
  .action(async (id) => {
    const spinner = ora('Verifying claim...').start();
    try {
      const api = getAxiosInstance();
      const response = await api.get(`/api/claim/${id}/verify`);

      if (response.data.verified) {
        spinner.succeed('Claim is verified on blockchain');
        console.log(chalk.green('Verification details:'));
        console.log('Block Hash:', response.data.blockHash);
        console.log('Block Index:', response.data.blockIndex);
        console.log('Timestamp:', response.data.timestamp);
        console.log('Hash Match:', response.data.hashMatch ? 'Yes' : 'No');
        console.log('Blockchain Valid:', response.data.blockchainValid ? 'Yes' : 'No');
      } else {
        spinner.warn('Claim is not verified on blockchain');
        console.log(chalk.yellow('Message:'), response.data.message);
      }
    } catch (error) {
      spinner.fail('Verification failed');
      // Error handled by axios interceptor
    }
  });

// Get user info
program
  .command('user:info')
  .description('Get information about a user')
  .argument('[publicKey]', 'Public key of the user (defaults to current user)')
  .action(async (publicKey) => {
    if (!publicKey && !config.keyPair) {
      console.error(chalk.red('Error:'), 'No public key provided and not logged in');
      return;
    }

    const userKey = publicKey || config.keyPair.publicKey;
    const spinner = ora(`Fetching user information...`).start();
    
    try {
      const api = getAxiosInstance();
      const response = await api.get(`/api/user/${userKey}`);
      const user = response.data;

      spinner.succeed('User information:');
      
      console.log(chalk.green('\nUser Details:'));
      console.log('Public Key:', user.publicKey);
      console.log('Display Name:', user.displayName || '-');
      console.log('Score:', user.score);
      console.log('Created:', new Date(user.created_at).toLocaleString());
      console.log('Last Active:', new Date(user.lastActive).toLocaleString());

      console.log(chalk.green('\nActivity Stats:'));
      console.log('Claims Created:', user.stats.claimsCount);
      console.log('Claims Confirmed by Others:', user.stats.confirmedByOthers);
      console.log('Claims Disputed by Others:', user.stats.disputedByOthers);

      if (user.recentClaims && user.recentClaims.length > 0) {
        console.log(chalk.green('\nRecent Claims:'));
        const table = new Table({
          head: ['ID', 'Claim', 'Date', 'Score'],
          colWidths: [15, 50, 16, 7]
        });

        user.recentClaims.forEach(claim => {
          const claimText = claim.claim.length > 47 ? claim.claim.substring(0, 44) + '...' : claim.claim;
          table.push([
            claim.id.substring(0, 12) + '...',
            claimText,
            new Date(claim.timestamp).toLocaleDateString(),
            claim.credibilityScore ? claim.credibilityScore.toFixed(1) : '-'
          ]);
        });

        console.log(table.toString());
      }
    } catch (error) {
      spinner.fail('Failed to fetch user information');
      // Error handled by axios interceptor
    }
  });

// Get blockchain stats
program
  .command('blockchain:stats')
  .description('Get blockchain statistics')
  .action(async () => {
    const spinner = ora('Fetching blockchain statistics...').start();
    try {
      const api = getAxiosInstance();
      const response = await api.get('/api/blockchain/stats');
      const stats = response.data;

      spinner.succeed('Blockchain statistics:');
      
      console.log(chalk.green('\nBlockchain Status:'));
      console.log('Blocks:', stats.blocks);
      console.log('Total Transactions:', stats.totalTransactions);
      console.log('Pending Transactions:', stats.pendingTransactions);
      console.log('Difficulty:', stats.difficulty);
      console.log('Chain Valid:', stats.isValid ? 'Yes' : 'No');

      console.log(chalk.green('\nLatest Block:'));
      console.log('Index:', stats.latestBlock.index);
      console.log('Hash:', stats.latestBlock.hash);
      console.log('Transactions:', stats.latestBlock.transactions);
      console.log('Timestamp:', stats.latestBlock.timestamp);
    } catch (error) {
      spinner.fail('Failed to fetch blockchain stats');
      // Error handled by axios interceptor
    }
  });

// Get system stats
program
  .command('stats')
  .description('Get system statistics')
  .action(async () => {
    const spinner = ora('Fetching system statistics...').start();
    try {
      const api = getAxiosInstance();
      const response = await api.get('/api/stats');
      const stats = response.data;

      spinner.succeed('System statistics:');
      
      console.log(chalk.green('\nSystem Stats:'));
      console.log('Total Claims:', stats.stats.claims);
      console.log('Total Users:', stats.stats.users);
      console.log('Blockchain Verified Claims:', stats.stats.blockchainVerifiedClaims);
      console.log('Total Proofs:', stats.stats.proofs);
      console.log('Conflicting Claims:', stats.stats.conflicts);

      console.log(chalk.green('\nBlockchain Stats:'));
      console.log('Blocks:', stats.blockchain.blocks);
      console.log('Transactions:', stats.blockchain.transactions);
      console.log('Pending Transactions:', stats.blockchain.pendingTransactions);

      console.log(chalk.green('\nTop Claims by Credibility:'));
      const claimsTable = new Table({
        head: ['ID', 'Claim', 'Score', 'User'],
        colWidths: [15, 50, 7, 15]
      });

      stats.topClaims.forEach(claim => {
        const claimText = claim.claim.length > 47 ? claim.claim.substring(0, 44) + '...' : claim.claim;
        claimsTable.push([
          claim.id.substring(0, 12) + '...',
          claimText,
          claim.credibilityScore.toFixed(1),
          claim.publicKey.substring(0, 12) + '...'
        ]);
      });

      console.log(claimsTable.toString());

      console.log(chalk.green('\nTop Users by Reputation:'));
      const usersTable = new Table({
        head: ['Public Key', 'Display Name', 'Score'],
        colWidths: [20, 30, 10]
      });

      stats.topUsers.forEach(user => {
        usersTable.push([
          user.publicKey.substring(0, 17) + '...',
          user.displayName || '-',
          user.score.toFixed(1)
        ]);
      });

      console.log(usersTable.toString());
    } catch (error) {
      spinner.fail('Failed to fetch system stats');
      // Error handled by axios interceptor
    }
  });

// Health check
program
  .command('health')
  .description('Check server health')
  .action(async () => {
    const spinner = ora('Checking server health...').start();
    try {
      const api = getAxiosInstance();
      const response = await api.get('/health');
      const health = response.data;

      if (health.status === 'ok') {
        spinner.succeed('Server is healthy');
        console.log(chalk.green('\nHealth Information:'));
        console.log('Version:', health.version);
        console.log('Database:', health.db);
        console.log('Blockchain Blocks:', health.blockchain.blocks);
        console.log('Blockchain Valid:', health.blockchain.isValid ? 'Yes' : 'No');
        console.log('Uptime:', `${Math.floor(health.uptime / 3600)} hours, ${Math.floor((health.uptime % 3600) / 60)} minutes`);
        console.log('Environment:', health.environment);
      } else {
        spinner.warn('Server is reporting issues');
        console.log(chalk.yellow('Status:'), health.status);
      }
    } catch (error) {
      spinner.fail('Failed to check server health');
      // Error handled by axios interceptor
    }
  });

// Initialize configuration before any command runs
initConfig();

// Parse command line arguments
program.parse(process.argv);

// If no command provided, display help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
