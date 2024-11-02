#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Uninstalling GitGuard CLI...${NC}"

# Remove symlink
rm -f "$HOME/.local/bin/gitguard"

echo -e "${GREEN}✅ GitGuard CLI uninstalled successfully!${NC}" 
