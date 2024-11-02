#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Setting up GitGuard CLI...${NC}"

# Clean and build the package
echo -e "${YELLOW}Building package...${NC}"
yarn build:clean

CLI_PATH="./dist/cjs/cli/gitguard.cjs"

# Verify the build output exists
if [ ! -f "$CLI_PATH" ]; then
    echo -e "${RED}❌ Build failed - gitguard.cjs not found${NC}"
    exit 1
fi

# Verify the file content
if ! head -n 1 "$CLI_PATH" | grep -q "#!/usr/bin/env node"; then
    echo -e "${RED}❌ Invalid CLI file - missing shebang${NC}"
    exit 1
fi

# Ensure CLI has execute permissions
chmod +x "$CLI_PATH"

# Create local bin directory if it doesn't exist
mkdir -p "$HOME/.local/bin"

# Create symlink to the CLI
ln -sf "$(pwd)/$CLI_PATH" "$HOME/.local/bin/gitguard"

# Verify the symlink
if [ ! -L "$HOME/.local/bin/gitguard" ]; then
    echo -e "${RED}❌ Failed to create symlink${NC}"
    exit 1
fi

# Add ~/.local/bin to PATH if not already present
if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
    echo -e "${YELLOW}Adding ~/.local/bin to PATH...${NC}"
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
    export PATH="$HOME/.local/bin:$PATH"
fi

echo -e "${GREEN}✅ GitGuard CLI installed successfully!${NC}"
echo -e "Try running: gitguard --help"
echo -e "${YELLOW}Note: You may need to restart your terminal or run 'source ~/.zshrc' (or ~/.bashrc) to use the command${NC}"
