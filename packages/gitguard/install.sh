#!/bin/bash

# Exit on any error
set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to handle direct curl installation
handle_remote_install() {
    echo -e "${BLUE}Installing GitGuard from @siteed/universe...${NC}"
    
    # Create temporary directory
    TMP_DIR=$(mktemp -d)
    cleanup() {
        rm -rf "$TMP_DIR"
    }
    trap cleanup EXIT

    # Download the script
    echo -e "${YELLOW}Downloading GitGuard...${NC}"
    curl -sSL https://raw.githubusercontent.com/deeeed/universe/main/packages/gitguard/gitguard-prepare.py -o "$TMP_DIR/gitguard-prepare.py"
    chmod +x "$TMP_DIR/gitguard-prepare.py"

    # Install dependencies
    echo -e "${YELLOW}Installing dependencies...${NC}"
    python3 -m pip install --user requests openai tiktoken

    # Install the hook
    if [ ! -d ".git" ]; then
        echo -e "${RED}Error: Not a git repository. Please run this script from your git project root.${NC}"
        exit 1
    fi

    HOOK_PATH=".git/hooks/prepare-commit-msg"
    mkdir -p .git/hooks
    cp "$TMP_DIR/gitguard-prepare.py" "$HOOK_PATH"
    
    echo -e "${GREEN}✅ GitGuard installed successfully!${NC}"
    echo -e "\n${BLUE}Next Steps:${NC}"
    echo -e "1. Create a configuration file (optional):"
    echo -e "   • Global: ~/.gitguard/config.json"
    echo -e "   • Project: .gitguard/config.json"
    echo -e "\n2. Set up environment variables (optional):"
    echo -e "   • AZURE_OPENAI_API_KEY - for Azure OpenAI integration"
    echo -e "   • GITGUARD_USE_AI=1 - to enable AI suggestions"
}

# Store the script's directory for development installation
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Your existing installation functions remain the same
check_existing_hook() {
    local hook_path="$1"
    if [ -f "$hook_path" ]; then
        if grep -q "gitguard" "$hook_path"; then
            echo "gitguard"
        else
            echo "other"
        fi
    else
        echo "none"
    fi
}

install_hook() {
    local target_dir="$1"
    local hook_path="$target_dir/hooks/prepare-commit-msg"
    mkdir -p "$target_dir/hooks"
    cp "$SCRIPT_DIR/gitguard-prepare.py" "$hook_path"
    chmod +x "$hook_path"
}

handle_installation() {
    local target_dir="$1"
    local install_type="$2"
    local hook_path="$target_dir/hooks/prepare-commit-msg"
    
    # Check existing hook
    local existing_hook=$(check_existing_hook "$hook_path")
    
    if [ "$existing_hook" = "gitguard" ]; then
        echo -e "${YELLOW}⚠️  GitGuard is already installed for this $install_type installation${NC}"
        read -p "Do you want to reinstall? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return
        fi
    elif [ "$existing_hook" = "other" ]; then
        echo -e "${RED}⚠️  Another prepare-commit-msg hook exists at: $hook_path${NC}"
        read -p "Do you want to overwrite it? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}Skipping $install_type installation${NC}"
            return
        fi
    fi

    # Install the hook
    install_hook "$target_dir"
    echo -e "${GREEN}✅ GitGuard installed successfully for $install_type use!${NC}"
}

# Main installation logic
main() {
    # Development installation flow
    echo -e "${BLUE}Welcome to GitGuard Development Installation!${NC}"
    
    # Check if script exists
    if [ ! -f "$SCRIPT_DIR/gitguard-prepare.py" ]; then
        echo -e "${RED}❌ Error: Could not find gitguard-prepare.py in $SCRIPT_DIR${NC}"
        exit 1
    fi

    # Rest of your existing installation logic...
    if git rev-parse --git-dir > /dev/null 2>&1; then
        GIT_PROJECT_DIR="$(git rev-parse --git-dir)"
        echo -e "📁 Current project: $(git rev-parse --show-toplevel)"
        
        read -p "Do you want to install GitGuard for this project? (Y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            handle_installation "$GIT_PROJECT_DIR" "project"
        fi
    else
        echo -e "${YELLOW}⚠️  Not in a git repository - skipping project installation${NC}"
    fi

    # Ask about global installation
    read -p "Do you want to install GitGuard globally? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        GLOBAL_GIT_DIR="$(git config --global core.hooksPath)"
        if [ -z "$GLOBAL_GIT_DIR" ]; then
            GLOBAL_GIT_DIR="$HOME/.git/hooks"
            git config --global core.hooksPath "$GLOBAL_GIT_DIR"
        fi
        handle_installation "$GLOBAL_GIT_DIR" "global"
    fi
}

# Check how the script was invoked
if [ "${BASH_SOURCE[0]}" -ef "$0" ]; then
    if [ -n "$CURL_INSTALL" ] || [ "$1" = "--remote" ]; then
        handle_remote_install
    else
        main
    fi
fi
