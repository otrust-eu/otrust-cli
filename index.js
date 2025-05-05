#!/usr/bin/env node

/**
 * OTRUST CLI - Command Line Interface for the OTRUST distributed truth protocol
 * 
 * Detta är huvudinträde för CLI:et
 */

// Importera CLI huvudfil
const cli = require('./otrust-cli');

// Kör CLI
cli();

// Exportera API-klass för användning som bibliotek
module.exports = require('./lib/api');
