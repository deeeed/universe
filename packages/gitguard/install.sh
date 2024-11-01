#!/bin/bash

# Exit on any error
set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Store the script's directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

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
    
    # Create hooks directory if it doesn't exist
    mkdir -p "$target_dir/hooks"
    
    # Copy the hook
    cp "$SCRIPT_DIR/gitguard-prepare.py" "$hook_path"
    chmod +x "$hook_path"
}

# Check if script exists
if [ ! -f "$SCRIPT_DIR/gitguard-prepare.py" ]; then
    echo -e "${RED}❌ Error: Could not find gitguard-prepare.py in $SCRIPT_DIR${NC}"
    exit 1
fi

# Function to handle installation choice
handle_installation() {
    local git_dir="$1"
    local location="$2"
    local hook_path="$git_dir/hooks/prepare-commit-msg"
    
    local existing=$(check_existing_hook "$hook_path")
    
    case $existing in
        "gitguard")
            echo -e "${YELLOW}⚠️  GitGuard is already installed in $location location${NC}"
            read -p "Do you want to overwrite it? (Y/n) " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Nn]$ ]]; then
                install_hook "$git_dir"
                echo -e "${GREEN}✅ GitGuard hook updated in $location location${NC}"
            fi
            ;;
        "other")
            echo -e "${YELLOW}⚠️  Another prepare-commit-msg hook exists in $location location${NC}"
            read -p "Do you want to overwrite it? (Y/n) " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Nn]$ ]]; then
                install_hook "$git_dir"
                echo -e "${GREEN}✅ GitGuard hook installed in $location location${NC}"
            fi
            ;;
        "none")
            install_hook "$git_dir"
            echo -e "${GREEN}✅ GitGuard hook installed in $location location${NC}"
            ;;
    esac
}

# Welcome message
echo -e "${BLUE}Welcome to GitGuard Installation!${NC}"
echo -e "This script can install GitGuard globally or for the current project.\n"

# Check if we're in a git repository
if git rev-parse --git-dir > /dev/null 2>&1; then
    GIT_PROJECT_DIR="$(git rev-parse --git-dir)"
    echo -e "📁 Current project: $(git rev-parse --show-toplevel)"
    
    read -p "Do you want to install GitGuard for this project? (Y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        PROJECT_INSTALL=true
    else
        PROJECT_INSTALL=false
    fi
else
    echo -e "${YELLOW}⚠️  Not in a git repository - skipping project installation${NC}"
    PROJECT_INSTALL=false
fi

# Ask about global installation
read -p "Do you want to install GitGuard globally for all future git projects? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    GLOBAL_INSTALL=true
else
    GLOBAL_INSTALL=false
fi

# Perform installations based on user choices
if [ "$GLOBAL_INSTALL" = true ]; then
    GLOBAL_GIT_DIR="$(git config --global core.hooksPath)"
    if [ -z "$GLOBAL_GIT_DIR" ]; then
        GLOBAL_GIT_DIR="$HOME/.git/hooks"
        # Set global hooks path
        git config --global core.hooksPath "$GLOBAL_GIT_DIR"
    fi
    handle_installation "$GLOBAL_GIT_DIR" "global"
fi

if [ "$PROJECT_INSTALL" = true ]; then
    handle_installation "$GIT_PROJECT_DIR" "project"
fi

# Final instructions
echo -e "\n${BLUE}Installation Complete!${NC}"
if [ "$GLOBAL_INSTALL" = true ]; then
    echo -e "🌍 Global installation: Hooks will be applied to all new git projects"
fi
if [ "$PROJECT_INSTALL" = true ]; then
    echo -e "📂 Project installation: Hook installed for current project"
fi

# Configuration instructions
echo -e "\n${BLUE}Next Steps:${NC}"
echo -e "1. Create a configuration file (optional):"
echo -e "   • Global: ~/.gitguard/config.json"
echo -e "   • Project: .gitguard/config.json"
echo -e "\n2. Set up environment variables (optional):"
echo -e "   • AZURE_OPENAI_API_KEY - for Azure OpenAI integration"
echo -e "   • GITGUARD_USE_AI=1 - to enable AI suggestions"
echo -e "\nFor more information, visit: https://github.com/yourusername/gitguard#readme"
