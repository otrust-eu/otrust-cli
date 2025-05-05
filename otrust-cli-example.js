#!/usr/bin/env node

/**
 * OTRUST CLI Example Usage
 * 
 * This example demonstrates how to use OTRUST CLI programmatically.
 * You can run this with: node example.js
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Configuration
const SERVER_URL = 'http://localhost:3000';

// Helper function to run CLI commands
async function runCommand(command) {
  try {
    console.log(`\n> Running: otrust-cli ${command}`);
    const { stdout, stderr } = await execPromise(`otrust-cli ${command}`);
    if (stderr) {
      console.error('Error:', stderr);
      return null;
    }
    return stdout;
  } catch (error) {
    console.error('Execution error:', error.message);
    return null;
  }
}

// Main function to run the example
async function runExample() {
  console.log('=============================');
  console.log('OTRUST CLI Example Usage');
  console.log('=============================\n');

  // 1. Configure the CLI
  console.log('1. Configuring CLI...');
  await runCommand(`config --server ${SERVER_URL}`);
  
  // 2. Show current configuration
  console.log('\n2. Current configuration:');
  await runCommand('config --print');
  
  // 3. Initialize key pair if needed
  console.log('\n3. Do you want to initialize a new key pair? (y/n)');
  process.stdin.once('data', async (data) => {
    const answer = data.toString().trim().toLowerCase();
    if (answer === 'y') {
      await runCommand('init');
    }
    
    // 4. Register or login
    console.log('\n4. Do you want to register or login? (r/l/s - skip)');
    process.stdin.once('data', async (data) => {
      const authAnswer = data.toString().trim().toLowerCase();
      if (authAnswer === 'r') {
        await runCommand('register');
      } else if (authAnswer === 'l') {
        await runCommand('login');
      }
      
      // 5. Continue with operations that don't require authentication
      await exampleOperations();
    });
  });
}

// Example operations that don't require authentication
async function exampleOperations() {
  // 5. List some claims
  console.log('\n5. Listing recent claims:');
  await runCommand('claim:list --limit 5');
  
  // 6. Search for claims
  console.log('\n6. Searching for claims:');
  await runCommand('search "example" --limit 5');
  
  // 7. Check server health
  console.log('\n7. Checking server health:');
  await runCommand('health');
  
  // 8. Show blockchain stats
  console.log('\n8. Blockchain statistics:');
  await runCommand('blockchain:stats');
  
  // 9. Prompt for authenticated operations
  console.log('\n9. Do you want to create a new claim? (y/n)');
  process.stdin.once('data', async (data) => {
    const answer = data.toString().trim().toLowerCase();
    if (answer === 'y') {
      // Create a claim interactively
      console.log('\nStarting interactive claim creation:');
      console.log('(Note: This will spawn a separate process, please follow the prompts)');
      
      // Using direct exec instead of our wrapper function for interactive processes
      const child = exec('otrust-cli claim:create --interactive');
      
      // Pipe the child's streams to the parent process
      child.stdout.pipe(process.stdout);
      child.stderr.pipe(process.stderr);
      
      // When the claim creation is done, continue
      child.on('exit', async () => {
        // 10. Finishing up
        console.log('\n10. Example completed!');
        console.log('\nFor more commands, check the documentation or run:');
        console.log('otrust-cli --help');
        process.exit(0);
      });
    } else {
      // 10. Finishing up
      console.log('\n10. Example completed!');
      console.log('\nFor more commands, check the documentation or run:');
      console.log('otrust-cli --help');
      process.exit(0);
    }
  });
}

// Start the example
runExample();
