# Installing OTRUST CLI

This guide helps you install and configure the OTRUST Command Line Interface (CLI).

## Prerequisites

Before installing OTRUST CLI, make sure you have:

- **Node.js** (version 14 or later)
- **npm** (Node Package Manager)
- Access to an OTRUST server

You can check your Node.js and npm versions with:

```bash
node --version
npm --version
```

## Installation Options

### Option 1: Global Installation via npm

The easiest way to install OTRUST CLI is via npm:

```bash
npm install -g otrust-cli
```

After installation, you can run the `otrust-cli` command from any directory.

### Option 2: Installation from Source

To install from source:

1. Clone the GitHub repository:

```bash
git clone https://github.com/otrust-eu/otrust-cli.git
```

2. Navigate to the cloned directory:

```bash
cd otrust-cli
```

3. Install dependencies:

```bash
npm install
```

4. Link the command globally:

```bash
npm link
```

## Configuration

After installation, you need to configure the CLI to connect to an OTRUST server:

```bash
otrust-cli config --server https://api.otrust.example.com
```

Change the URL according to your OTRUST server installation.

## Creating a Key Pair

To use OTRUST CLI, you need a cryptographic key pair:

```bash
otrust-cli init
```

This command generates a new RSA key pair and saves it in the configuration file `~/.otrust/config.json`.

## Registering or Logging In

Once your key pair is generated, you can register a new account or log in:

```bash
# To register a new account
otrust-cli register

# To log in to an existing account
otrust-cli login
```

## Verifying the Installation

To check that everything is working properly, run:

```bash
otrust-cli health
```

This command checks the connection to the OTRUST server and displays its status.

## Updating OTRUST CLI

To update to the latest version:

```bash
npm update -g otrust-cli
```

## Uninstallation

If you need to uninstall OTRUST CLI:

```bash
npm uninstall -g otrust-cli
```

## Troubleshooting

### Permission Issues During Installation

If you encounter permission problems during global installation, try:

```bash
sudo npm install -g otrust-cli
```

or for a permission-free installation for the current user:

```bash
npm install -g otrust-cli --prefix ~/.npm-global
```

Remember to add `~/.npm-global/bin` to your PATH variable in this case.

### Configuration Problems

If you have problems with the configuration, check the contents of the configuration file:

```bash
cat ~/.otrust/config.json
```

You can edit this file manually if needed, or delete it to create a new one:

```bash
rm ~/.otrust/config.json
otrust-cli config --server https://api.otrust.example.com
```

## Next Steps

Once installation is complete, see [README.md](README.md) for information on how to use OTRUST CLI.

For more detailed documentation, run:

```bash
otrust-cli --help
```

or for help with a specific command:

```bash
otrust-cli <command> --help
```
