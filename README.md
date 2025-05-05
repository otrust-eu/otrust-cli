# OTRUST Command Line Interface

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D%2014.0.0-brightgreen.svg)](https://nodejs.org/)

A powerful command-line interface for interacting with the OTRUST distributed truth protocol.

## Overview

The OTRUST CLI enables you to interact with the OTRUST protocol directly from the command line. With this tool, you can:

- Create and manage your OTRUST identity
- Submit semantic claims
- Confirm, dispute, or invalidate claims
- Search and filter claims
- Verify claims against the blockchain
- Perform semantic queries
- View user and system statistics

## Installation

### Global via npm

```bash
npm install -g otrust-cli
```

### From source

```bash
git clone https://github.com/otrust-eu/otrust-cli.git
cd otrust-cli
npm install
npm link
```

## Getting Started

To begin using the OTRUST CLI:

```bash
# Configure the OTRUST server endpoint
otrust-cli config --server https://api.otrust.eu

# Generate a key pair (if not already done)
otrust-cli init

# Register or log in
otrust-cli register
# or
otrust-cli login
```

## Command Reference

### Configuration & Account

```bash
otrust-cli config [--server <url>] [--print]
otrust-cli init [--force]
otrust-cli register
otrust-cli login
otrust-cli logout
otrust-cli profile --name "Your Name" --email "you@example.com"
```

### Claims

```bash
# Create a new claim interactively
otrust-cli claim:create --interactive

# Or provide claim parameters directly
otrust-cli claim:create \
  --claim "Stockholm is the capital of Sweden" \
  --evidence "https://en.wikipedia.org/wiki/Stockholm" \
  --type factual \
  --subject "Stockholm" \
  --predicate "is capital of" \
  --object "Sweden"

otrust-cli claim:get <id>
otrust-cli claim:list [options]
otrust-cli search "Stockholm"
otrust-cli verify <id>
```

### Proofs

```bash
otrust-cli proof:add --interactive

# Or directly with flags
otrust-cli proof:add \
  --claim-id <id> \
  --action confirmed \
  --reason "This information is correct" \
  --confidence 0.9
```

### Semantic Queries

```bash
otrust-cli semantic "Stockholm" "is capital of"
```

### System & User Info

```bash
otrust-cli user:info [publicKey]
otrust-cli blockchain:stats
otrust-cli stats
otrust-cli health
```

## Usage Examples

### Create a factual claim

```bash
otrust-cli claim:create \
  --claim "The Baltic Sea borders Sweden, Finland, Russia, Estonia, Latvia, Lithuania, Poland, Germany, and Denmark" \
  --evidence "https://en.wikipedia.org/wiki/Baltic_Sea" \
  --type factual \
  --subject "Baltic Sea" \
  --predicate "borders" \
  --object "Sweden, Finland, Russia, Estonia, Latvia, Lithuania, Poland, Germany, Denmark"
```

### Confirm a claim

```bash
otrust-cli proof:add \
  --claim-id abcdef1234567890 \
  --action confirmed \
  --reason "This is verified public knowledge"
```

### Dispute a claim

```bash
otrust-cli proof:add \
  --claim-id abcdef1234567890 \
  --action disputed \
  --reason "This is incorrect due to conflicting sources..."
```

### Search for claims

```bash
otrust-cli search "Baltic Sea"
otrust-cli claim:list --type factual --subject "Baltic Sea"
otrust-cli semantic "Baltic Sea" "borders"
```

## License

This project is licensed under the MIT License – see the [LICENSE](LICENSE) file for details.

## Contact & Support

- Website: [https://otrust.eu](https://otrust.eu)
- Documentation: [https://docs.otrust.eu](https://docs.otrust.eu)
