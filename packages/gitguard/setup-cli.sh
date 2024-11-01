#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Setting up GitGuard CLI...${NC}"

# Check if yarn is available
if ! command -v yarn &> /dev/null; then
    echo -e "${RED}❌ Error: yarn is not installed${NC}"
    exit 1
fi

# Clean and build the package
echo -e "${YELLOW}Building package...${NC}"
yarn build:clean

# Verify the build output exists
if [ ! -f "./dist/src/cli.js" ]; then
    echo -e "${RED}❌ Build failed - cli.js not found${NC}"
    exit 1
fi

if [ ! -f "./dist/src/config.js" ]; then
    echo -e "${RED}❌ Build failed - config.js not found${NC}"
    exit 1
fi

# Ensure CLI has execute permissions
chmod +x ./dist/src/cli.js

# Create a temporary package directory
TEMP_DIR="$(mktemp -d)"
    
# Pack the package with verbose output
echo -e "${YELLOW}Packing package...${NC}"
yarn pack -v -o "$TEMP_DIR/package.tgz"
    
# Install globally using npm with verbose output
echo -e "${YELLOW}Installing package globally...${NC}"
npm install -g "$TEMP_DIR/package.tgz" --verbose
    
# Cleanup
rm -rf "$TEMP_DIR"

echo -e "${GREEN}✅ GitGuard CLI installed successfully!${NC}"
echo -e "Try running: gitguard analyze -v"
