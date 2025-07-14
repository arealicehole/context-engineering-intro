# Poop Quest - Akash Network Deployment

This directory contains deployment configurations and scripts for deploying Poop Quest on the Akash Network, a decentralized cloud computing platform.

## Files Overview

- `deploy.yaml` - Full production deployment configuration
- `deploy-simple.yaml` - Simplified deployment for testing
- `deploy.sh` - Automated deployment script
- `README.md` - This documentation file

## Prerequisites

### 1. Install Akash CLI

```bash
# Download and install Akash CLI
curl -sSfL https://raw.githubusercontent.com/akash-network/akash/main/godownloader.sh | sh
sudo mv ./bin/akash /usr/local/bin/akash
```

Verify installation:
```bash
akash version
```

### 2. Create Wallet

```bash
# Create a new wallet
akash keys add poop-quest-wallet --keyring-backend os

# Or recover existing wallet
akash keys add poop-quest-wallet --recover --keyring-backend os
```

### 3. Fund Wallet

You need AKT tokens to deploy on Akash. You can:
- Purchase AKT from exchanges
- Use faucets for testnet deployments
- Transfer from existing wallets

Check balance:
```bash
akash query bank balances $(akash keys show poop-quest-wallet -a --keyring-backend os) --node https://rpc.akash.forbole.com:443 --chain-id akashnet-2
```

## Deployment Options

### Option 1: Automated Deployment (Recommended)

Use the deployment script for automated deployment:

```bash
# Make script executable
chmod +x deploy.sh

# Deploy with simple configuration
./deploy.sh deploy-simple.yaml

# Deploy with full configuration
./deploy.sh deploy.yaml
```

### Option 2: Manual Deployment

#### Step 1: Create Certificate

```bash
akash tx cert create client \
    --from poop-quest-wallet \
    --keyring-backend os \
    --node https://rpc.akash.forbole.com:443 \
    --chain-id akashnet-2 \
    --gas auto \
    --gas-adjustment 1.5 \
    --fees 500uakt \
    --yes
```

#### Step 2: Create Deployment

```bash
akash tx deployment create deploy-simple.yaml \
    --from poop-quest-wallet \
    --keyring-backend os \
    --node https://rpc.akash.forbole.com:443 \
    --chain-id akashnet-2 \
    --gas auto \
    --gas-adjustment 1.5 \
    --fees 500uakt \
    --yes
```

#### Step 3: Query Deployment

```bash
# Get your wallet address
WALLET_ADDRESS=$(akash keys show poop-quest-wallet -a --keyring-backend os)

# Query deployments
akash query deployment list --owner $WALLET_ADDRESS --node https://rpc.akash.forbole.com:443 --chain-id akashnet-2
```

#### Step 4: View Bids

```bash
# Replace DSEQ with your deployment sequence
export AKASH_DSEQ=<your-deployment-sequence>

akash query market bid list --owner $WALLET_ADDRESS --dseq $AKASH_DSEQ --node https://rpc.akash.forbole.com:443 --chain-id akashnet-2
```

#### Step 5: Accept Bid

```bash
# Replace PROVIDER_ADDRESS with chosen provider
export AKASH_PROVIDER=<provider-address>

akash tx market lease create \
    --owner $WALLET_ADDRESS \
    --dseq $AKASH_DSEQ \
    --gseq 1 \
    --oseq 1 \
    --provider $AKASH_PROVIDER \
    --from poop-quest-wallet \
    --keyring-backend os \
    --node https://rpc.akash.forbole.com:443 \
    --chain-id akashnet-2 \
    --gas auto \
    --gas-adjustment 1.5 \
    --fees 500uakt \
    --yes
```

#### Step 6: Send Manifest

```bash
akash provider send-manifest deploy-simple.yaml \
    --owner $WALLET_ADDRESS \
    --dseq $AKASH_DSEQ \
    --provider $AKASH_PROVIDER \
    --keyring-backend os \
    --from poop-quest-wallet
```

#### Step 7: Check Status

```bash
akash provider lease-status \
    --owner $WALLET_ADDRESS \
    --dseq $AKASH_DSEQ \
    --provider $AKASH_PROVIDER \
    --keyring-backend os \
    --from poop-quest-wallet
```

## Configuration Details

### Resource Requirements

#### Simple Deployment (`deploy-simple.yaml`)
- **CPU**: 1.0 units
- **Memory**: 1 GiB
- **Storage**: 5 GiB
- **Estimated Cost**: ~$10-20/month

#### Full Deployment (`deploy.yaml`)
- **Main App**: 1 CPU, 1 GiB RAM, 8 GiB storage
- **Nginx**: 0.5 CPU, 512 MiB RAM, 2.2 GiB storage
- **Monitoring**: 0.5 CPU, 1 GiB RAM, 10.1 GiB storage
- **Backup**: 0.25 CPU, 256 MiB RAM, 25 GiB storage
- **Estimated Cost**: ~$50-100/month

### Environment Variables

The following environment variables are automatically set:

- `NODE_ENV=production`
- `PORT=3000`
- `DATABASE_PATH=/app/data/posts.db`
- `LOG_LEVEL=info`
- `AKASH_DEPLOYMENT=true`

### Required Secrets

Before deploying, ensure you have:

1. **Discord Bot Token** - Set as `DISCORD_BOT_TOKEN`
2. **Grok API Key** - Set as `GROK_API_KEY`
3. **Base URL** - Set as `BASE_URL`

Create a `.env` file with these values or set them directly in the deployment configuration.

## Monitoring and Maintenance

### Check Logs

```bash
akash provider lease-logs \
    --owner $WALLET_ADDRESS \
    --dseq $AKASH_DSEQ \
    --provider $AKASH_PROVIDER \
    --keyring-backend os \
    --from poop-quest-wallet
```

### Update Deployment

To update your deployment:

1. Close existing deployment:
```bash
akash tx deployment close \
    --owner $WALLET_ADDRESS \
    --dseq $AKASH_DSEQ \
    --from poop-quest-wallet \
    --keyring-backend os \
    --node https://rpc.akash.forbole.com:443 \
    --chain-id akashnet-2 \
    --gas auto \
    --gas-adjustment 1.5 \
    --fees 500uakt \
    --yes
```

2. Deploy new version following the deployment steps above.

### Backup Data

The full deployment includes automatic backup service that:
- Creates daily backups at 2 AM
- Stores backups for 7 days
- Compresses old backups to save space

## Troubleshooting

### Common Issues

1. **Insufficient Funds**
   - Ensure wallet has enough AKT tokens
   - Check current balance: `akash query bank balances $WALLET_ADDRESS`

2. **Certificate Issues**
   - Recreate certificate if expired
   - Check certificate status: `akash query cert list --owner $WALLET_ADDRESS`

3. **No Bids Received**
   - Check if deployment requirements are too high
   - Increase bid price in deployment file
   - Wait longer for bids to arrive

4. **Deployment Fails**
   - Check deployment file syntax
   - Verify Docker image is accessible
   - Review resource requirements

### Getting Help

- **Akash Discord**: https://discord.gg/akash
- **Documentation**: https://docs.akash.network
- **GitHub Issues**: https://github.com/akash-network/akash

## Security Considerations

1. **Wallet Security**
   - Store wallet mnemonic securely
   - Use hardware wallets for production
   - Regular backup of wallet files

2. **Deployment Security**
   - Review provider reputation
   - Monitor deployment logs
   - Use secure environment variables

3. **Application Security**
   - Keep Docker images updated
   - Monitor for security vulnerabilities
   - Use proper secrets management

## Cost Optimization

1. **Resource Sizing**
   - Start with simple deployment
   - Scale based on actual usage
   - Monitor resource utilization

2. **Bid Strategy**
   - Start with competitive bids
   - Adjust based on market conditions
   - Consider longer-term deployments

3. **Provider Selection**
   - Choose reputable providers
   - Consider geographic location
   - Balance cost vs. performance

## Support

For deployment support:
- Check Akash documentation
- Join Akash Discord community
- Review deployment logs for errors
- Contact Poop Quest team for application-specific issues