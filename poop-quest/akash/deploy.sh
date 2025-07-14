#!/bin/bash

# Poop Quest Akash Deployment Script
# Automated deployment to Akash Network

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AKASH_BINARY="akash"
DEPLOYMENT_FILE="${1:-deploy-simple.yaml}"
AKASH_CHAIN_ID="akashnet-2"
AKASH_NODE="https://rpc.akash.forbole.com:443"
WALLET_NAME="poop-quest-wallet"
KEYRING_BACKEND="os"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if akash binary exists
check_akash_binary() {
    if ! command -v $AKASH_BINARY &> /dev/null; then
        print_error "Akash binary not found. Please install akash CLI."
        print_status "Visit: https://docs.akash.network/guides/cli"
        exit 1
    fi
    print_success "Akash binary found: $(which $AKASH_BINARY)"
}

# Check if deployment file exists
check_deployment_file() {
    if [ ! -f "$DEPLOYMENT_FILE" ]; then
        print_error "Deployment file not found: $DEPLOYMENT_FILE"
        print_status "Available deployment files:"
        ls -la *.yaml
        exit 1
    fi
    print_success "Deployment file found: $DEPLOYMENT_FILE"
}

# Check wallet
check_wallet() {
    print_status "Checking wallet..."
    
    if ! $AKASH_BINARY keys show $WALLET_NAME --keyring-backend $KEYRING_BACKEND &> /dev/null; then
        print_warning "Wallet not found. Please create a wallet first:"
        print_status "akash keys add $WALLET_NAME --keyring-backend $KEYRING_BACKEND"
        exit 1
    fi
    
    WALLET_ADDRESS=$($AKASH_BINARY keys show $WALLET_NAME -a --keyring-backend $KEYRING_BACKEND)
    print_success "Wallet found: $WALLET_ADDRESS"
}

# Check account balance
check_balance() {
    print_status "Checking account balance..."
    
    BALANCE=$($AKASH_BINARY query bank balances $WALLET_ADDRESS --node $AKASH_NODE --chain-id $AKASH_CHAIN_ID -o json | jq -r '.balances[0].amount // "0"')
    
    if [ "$BALANCE" = "0" ]; then
        print_warning "Account balance is 0. Please fund your account."
        print_status "Send AKT tokens to: $WALLET_ADDRESS"
        exit 1
    fi
    
    print_success "Account balance: $BALANCE uakt"
}

# Create certificate if needed
create_certificate() {
    print_status "Checking for certificate..."
    
    if ! $AKASH_BINARY query cert list --owner $WALLET_ADDRESS --node $AKASH_NODE --chain-id $AKASH_CHAIN_ID | grep -q "certificates:"; then
        print_status "Creating certificate..."
        
        $AKASH_BINARY tx cert create client \
            --from $WALLET_NAME \
            --keyring-backend $KEYRING_BACKEND \
            --node $AKASH_NODE \
            --chain-id $AKASH_CHAIN_ID \
            --gas auto \
            --gas-adjustment 1.5 \
            --fees 500uakt \
            --yes
        
        print_success "Certificate created successfully"
    else
        print_success "Certificate already exists"
    fi
}

# Validate deployment file
validate_deployment() {
    print_status "Validating deployment file..."
    
    if ! $AKASH_BINARY tx deployment create $DEPLOYMENT_FILE --from $WALLET_NAME --dry-run --keyring-backend $KEYRING_BACKEND --node $AKASH_NODE --chain-id $AKASH_CHAIN_ID; then
        print_error "Deployment validation failed"
        exit 1
    fi
    
    print_success "Deployment file is valid"
}

# Create deployment
create_deployment() {
    print_status "Creating deployment..."
    
    DEPLOYMENT_TX=$($AKASH_BINARY tx deployment create $DEPLOYMENT_FILE \
        --from $WALLET_NAME \
        --keyring-backend $KEYRING_BACKEND \
        --node $AKASH_NODE \
        --chain-id $AKASH_CHAIN_ID \
        --gas auto \
        --gas-adjustment 1.5 \
        --fees 500uakt \
        --yes \
        -o json)
    
    DEPLOYMENT_TXHASH=$(echo $DEPLOYMENT_TX | jq -r '.txhash')
    print_success "Deployment created. Transaction hash: $DEPLOYMENT_TXHASH"
    
    # Wait for deployment to be processed
    sleep 10
    
    # Get deployment sequence
    DEPLOYMENT_SEQ=$($AKASH_BINARY query tx $DEPLOYMENT_TXHASH --node $AKASH_NODE --chain-id $AKASH_CHAIN_ID -o json | jq -r '.logs[0].events[] | select(.type=="akash.v1beta1.EventDeploymentCreated") | .attributes[] | select(.key=="dseq") | .value')
    
    if [ -z "$DEPLOYMENT_SEQ" ]; then
        print_error "Failed to get deployment sequence"
        exit 1
    fi
    
    print_success "Deployment sequence: $DEPLOYMENT_SEQ"
    echo "export AKASH_DSEQ=$DEPLOYMENT_SEQ" > .env.deployment
}

# Query market for bids
query_market() {
    print_status "Querying market for bids..."
    
    # Wait for bids to arrive
    sleep 30
    
    $AKASH_BINARY query market bid list --owner $WALLET_ADDRESS --dseq $DEPLOYMENT_SEQ --node $AKASH_NODE --chain-id $AKASH_CHAIN_ID
}

# Accept bid (manual step)
accept_bid() {
    print_status "To accept a bid, run:"
    print_status "akash tx market lease create --owner $WALLET_ADDRESS --dseq $DEPLOYMENT_SEQ --gseq 1 --oseq 1 --provider <PROVIDER_ADDRESS> --from $WALLET_NAME --keyring-backend $KEYRING_BACKEND --node $AKASH_NODE --chain-id $AKASH_CHAIN_ID --gas auto --gas-adjustment 1.5 --fees 500uakt --yes"
}

# Main deployment process
main() {
    print_status "Starting Poop Quest deployment to Akash Network..."
    print_status "=================================================="
    
    # Pre-flight checks
    check_akash_binary
    check_deployment_file
    check_wallet
    check_balance
    create_certificate
    validate_deployment
    
    # Deploy
    create_deployment
    query_market
    accept_bid
    
    print_success "Deployment process completed!"
    print_status "Next steps:"
    print_status "1. Review the bids above"
    print_status "2. Accept a bid using the provided command"
    print_status "3. Send manifest to the provider"
    print_status "4. Monitor your deployment"
}

# Help function
show_help() {
    echo "Poop Quest Akash Deployment Script"
    echo ""
    echo "Usage: $0 [deployment-file]"
    echo ""
    echo "Options:"
    echo "  deployment-file    Path to deployment YAML file (default: deploy-simple.yaml)"
    echo "  --help            Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                      # Deploy with default simple configuration"
    echo "  $0 deploy.yaml         # Deploy with full configuration"
    echo "  $0 deploy-simple.yaml  # Deploy with simple configuration"
}

# Check for help flag
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    show_help
    exit 0
fi

# Run main function
main