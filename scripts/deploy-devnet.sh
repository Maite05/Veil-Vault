
set -euo pipefail

PROGRAM_ID="5Jn23ZQaF8LVbm5WQASc7QWcAhq9QPLJQGFxmC2gUwgB"
KEYPAIR="program-keypair.json"

echo "==> Building program..."
anchor build

echo "==> Syncing program ID into IDL and source..."
anchor keys sync

echo "==> Airdropping SOL to deployer wallet (devnet)..."
solana airdrop 2 --url devnet || true   # may fail if already funded

echo "==> Deploying to devnet..."
anchor deploy \
  --provider.cluster devnet \
  --program-keypair "$KEYPAIR" \
  --program-name veil_vault

echo ""
echo "✓ Deployed. Program ID: $PROGRAM_ID"
echo "  Update README.md with the live program ID if it differs."
echo "  Run 'anchor test --provider.cluster devnet' to verify."
