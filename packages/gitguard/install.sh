#!/bin/bash

# Exit on any error
set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

check_dependencies() {
    local missing_deps=()
    
    # Check Python version (needs 3.7+)
    if ! command -v python3 &> /dev/null; then
        missing_deps+=("python3")
    else
        local python_version=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
        if [ "$(printf '%s\n' "3.7" "$python_version" | sort -V | head -n1)" != "3.7" ]; then
            echo -e "${RED}Error: Python 3.7 or higher is required (found $python_version)${NC}"
            echo -e "${YELLOW}Please upgrade Python using your package manager:${NC}"
            echo -e "• Ubuntu/Debian: sudo apt update && sudo apt install python3"
            echo -e "• MacOS: brew install python3"
            exit 1
        fi
    fi
    
    # Check pip
    if ! command -v pip3 &> /dev/null && ! python3 -m pip --version &> /dev/null; then
        missing_deps+=("pip3")
    fi
    
    # Check curl
    if ! command -v curl &> /dev/null; then
        missing_deps+=("curl")
    fi
    
    # Check git
    if ! command -v git &> /dev/null; then
        missing_deps+=("git")
    fi
    
    # If any dependencies are missing, provide installation instructions
    if [ ${#missing_deps[@]} -ne 0 ]; then
        echo -e "${RED}Error: Missing required dependencies: ${missing_deps[*]}${NC}"
        echo -e "\n${YELLOW}Please install the missing dependencies:${NC}"
        echo -e "Ubuntu/Debian:"
        echo -e "  sudo apt update && sudo apt install ${missing_deps[*]}"
        echo -e "\nMacOS:"
        echo -e "  brew install ${missing_deps[*]}"
        echo -e "\nWindows (using Chocolatey):"
        echo -e "  choco install ${missing_deps[*]}"
        exit 1
    fi
}

handle_remote_install() {
    echo -e "${BLUE}Installing GitGuard from @siteed/universe...${NC}"
    
    # Check dependencies first
    check_dependencies
    
    # Verify we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        echo -e "${RED}Error: Not in a git repository${NC}"
        echo -e "${YELLOW}Please run this command from your git project root:${NC}"
        echo -e "  cd /path/to/your/git/project"
        echo -e "  curl -sSL https://raw.githubusercontent.com/deeeed/universe/main/packages/gitguard/install.sh | bash -s -- --remote"
        exit 1
    fi
    
    # Create temporary directory with error handling
    TMP_DIR=$(mktemp -d 2>/dev/null || mktemp -d -t 'gitguard')
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Failed to create temporary directory${NC}"
        echo -e "${YELLOW}Please ensure you have write permissions to /tmp or TMP directory${NC}"
        exit 1
    fi
    
    cleanup() {
        rm -rf "$TMP_DIR"
    }
    trap cleanup EXIT
    
    # Download the script with error handling and retry
    echo -e "${YELLOW}Downloading GitGuard...${NC}"
    MAX_RETRIES=3
    for i in $(seq 1 $MAX_RETRIES); do
        if curl -sSL --retry 3 https://raw.githubusercontent.com/deeeed/universe/main/packages/gitguard/gitguard-prepare.py -o "$TMP_DIR/gitguard-prepare.py"; then
            break
        fi
        if [ $i -eq $MAX_RETRIES ]; then
            echo -e "${RED}Error: Failed to download GitGuard after $MAX_RETRIES attempts${NC}"
            echo -e "${YELLOW}Please check:${NC}"
            echo -e "1. Your internet connection"
            echo -e "2. Access to githubusercontent.com"
            echo -e "3. Try again in a few minutes"
            exit 1
        fi
        echo -e "${YELLOW}Retry $i/$MAX_RETRIES...${NC}"
        sleep 2
    done
    
    chmod +x "$TMP_DIR/gitguard-prepare.py"
    
    # Install Python dependencies with error handling
    echo -e "${YELLOW}Installing Python dependencies...${NC}"
    if ! python3 -m pip install --user --quiet requests openai tiktoken; then
        echo -e "${RED}Error: Failed to install Python dependencies${NC}"
        echo -e "${YELLOW}Please try:${NC}"
        echo -e "1. Running manually: python3 -m pip install --user requests openai tiktoken"
        echo -e "2. Check your Python environment: python3 -m pip --version"
        echo -e "3. Ensure you have write permissions to your user's pip directory"
        exit 1
    fi
    
    # Install the hook
    HOOK_PATH=".git/hooks/prepare-commit-msg"
    if ! mkdir -p .git/hooks 2>/dev/null; then
        echo -e "${RED}Error: Failed to create hooks directory${NC}"
        echo -e "${YELLOW}Please check permissions on .git/hooks directory${NC}"
        exit 1
    fi
    
    if ! cp "$TMP_DIR/gitguard-prepare.py" "$HOOK_PATH" 2>/dev/null; then
        echo -e "${RED}Error: Failed to install hook${NC}"
        echo -e "${YELLOW}Please check:${NC}"
        echo -e "1. Permissions on .git/hooks directory"
        echo -e "2. Available disk space"
        echo -e "3. Existing hook file permissions"
        exit 1
    fi
    
    chmod +x "$HOOK_PATH" 2>/dev/null || {
        echo -e "${RED}Warning: Failed to make hook executable${NC}"
        echo -e "${YELLOW}Please run: chmod +x $HOOK_PATH${NC}"
    }
    
    echo -e "${GREEN}✅ GitGuard installed successfully!${NC}"
    echo -e "\n${BLUE}Next Steps:${NC}"
    echo -e "1. Create a configuration file (optional):"
    echo -e "   • Global: ~/.gitguard/config.json"
    echo -e "   • Project: .gitguard/config.json"
    echo -e "\n2. Set up environment variables (required for AI features):"
    echo -e "   • AZURE_OPENAI_API_KEY - for Azure OpenAI integration"
    echo -e "   • GITGUARD_USE_AI=1 - to enable AI suggestions"
    echo -e "\n3. Test the installation:"
    echo -e "   git commit -m \"test\" --allow-empty"
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
