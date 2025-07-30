#!/bin/bash
set -euo pipefail

# Deployment script for iframe outputs service
# Deploys to runtusercontent.com and subdomains

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
IFRAME_DIR="$PROJECT_ROOT/iframe-outputs"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default environment
ENV="${1:-production}"

echo -e "${GREEN}🚀 Deploying iframe outputs service${NC}"
echo "Environment: $ENV"
echo "Directory: $IFRAME_DIR"
echo ""

# Check if we're in the right place
if [ ! -f "$IFRAME_DIR/wrangler.toml" ]; then
    echo -e "${RED}❌ Error: Cannot find iframe-outputs/wrangler.toml${NC}"
    echo "Please run this script from the anode project root"
    exit 1
fi

# Check if wrangler is available
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}❌ Error: wrangler CLI not found${NC}"
    echo "Please install dependencies with: pnpm install"
    exit 1
fi

# Change to iframe directory
cd "$IFRAME_DIR"

# Validate environment
case "$ENV" in
    production|preview|staging)
        echo -e "${GREEN}✓ Valid environment: $ENV${NC}"
        ;;
    *)
        echo -e "${RED}❌ Error: Invalid environment '$ENV'${NC}"
        echo "Valid environments: production, preview, staging"
        exit 1
        ;;
esac

# Deploy based on environment
echo -e "${YELLOW}📦 Deploying to Cloudflare Workers...${NC}"

case "$ENV" in
    production)
        echo "Target domain: https://runtusercontent.com"
        wrangler deploy --env production
        ;;
    preview)
        echo "Target domain: https://preview.runtusercontent.com"
        wrangler deploy --env preview
        ;;
    staging)
        echo "Target domain: https://staging.runtusercontent.com"
        wrangler deploy --env staging
        ;;
esac

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Verify the deployment:"
    case "$ENV" in
        production)
            echo "   curl -I https://runtusercontent.com"
            ;;
        preview)
            echo "   curl -I https://preview.runtusercontent.com"
            ;;
        staging)
            echo "   curl -I https://staging.runtusercontent.com"
            ;;
    esac
    echo ""
    echo "2. Update main app environment variables if needed:"
    echo "   VITE_IFRAME_OUTPUT_URI should point to the deployed domain"
    echo ""
    echo "3. Monitor logs with:"
    echo "   cd iframe-outputs && pnpm logs${ENV:+:$ENV}"
else
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi
