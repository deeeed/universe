#!/bin/bash

# Exit on any error
set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Store the script's directory for development installation
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

check_installation_status() {
    local project_hook=""
    local global_hook=""
    local status=()

    # Check project installation
    if git rev-parse --git-dir > /dev/null 2>&1; then
        local project_dir="$(git rev-parse --git-dir)"
        project_hook=$(check_existing_hook "$project_dir/hooks/prepare-commit-msg")
        status+=("project:$project_hook")
    else
        status+=("project:none")
    fi

    # Initialize GLOBAL_GIT_DIR
    GLOBAL_GIT_DIR="$(git config --global core.hooksPath || echo "")"
    if [ -z "$GLOBAL_GIT_DIR" ]; then
        GLOBAL_GIT_DIR="$HOME/.config/git/hooks"
    fi
    
    global_hook=$(check_existing_hook "$GLOBAL_GIT_DIR/prepare-commit-msg")
    status+=("global:$global_hook")

    printf "%s " "${status[@]}"
}

handle_installation() {
    local target_dir="$1"
    local install_type="$2"
    
    echo -e "${BLUE}Starting $install_type installation...${NC}"
    echo -e "Target directory: $target_dir"
    
    # For global installation, use GLOBAL_GIT_DIR directly
    if [ "$install_type" = "global" ]; then
        if [ -z "$GLOBAL_GIT_DIR" ]; then
            echo -e "${RED}Error: Global git hooks directory is not set${NC}"
            echo -e "Attempting to create default directory at: $HOME/.config/git/hooks"
            GLOBAL_GIT_DIR="$HOME/.config/git/hooks"
        fi
        target_dir="$GLOBAL_GIT_DIR"
    fi
    
    local hook_path="$target_dir/prepare-commit-msg"
    echo -e "Installing hook to: $hook_path"
    
    # Check existing hook
    local existing_hook=$(check_existing_hook "$hook_path")
    
    if [ "$existing_hook" = "other" ]; then
        echo -e "${RED}⚠️  Another prepare-commit-msg hook exists at: $hook_path${NC}"
        read -p "Do you want to overwrite it? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}Skipping $install_type installation${NC}"
            return
        fi
    fi

    # Create directory with verbose output
    echo -e "Creating directory: $(dirname "$hook_path")"
    if ! mkdir -p "$(dirname "$hook_path")" 2>/dev/null; then
        echo -e "${RED}Failed to create directory: $(dirname "$hook_path")${NC}"
        echo -e "Attempting with sudo..."
        sudo mkdir -p "$(dirname "$hook_path")"
    fi

    # Copy hook file with verbose output
    echo -e "Copying hook from: $SCRIPT_DIR/gitguard-prepare.py"
    if ! cp "$SCRIPT_DIR/gitguard-prepare.py" "$hook_path" 2>/dev/null; then
        echo -e "${RED}Failed to copy hook file${NC}"
        echo -e "Attempting with sudo..."
        sudo cp "$SCRIPT_DIR/gitguard-prepare.py" "$hook_path"
    fi

    # Set permissions with verbose output
    echo -e "Setting execute permissions"
    if ! chmod +x "$hook_path" 2>/dev/null; then
        echo -e "${RED}Failed to set permissions${NC}"
        echo -e "Attempting with sudo..."
        sudo chmod +x "$hook_path"
    fi
    
    # If this is a global installation, set the global hooks path
    if [ "$install_type" = "global" ]; then
        echo -e "Configuring global git hooks path"
        if ! git config --global core.hooksPath "$GLOBAL_GIT_DIR" 2>/dev/null; then
            echo -e "${RED}Failed to set global git hooks path${NC}"
            echo -e "Attempting with sudo..."
            sudo git config --global core.hooksPath "$GLOBAL_GIT_DIR"
        fi
    fi
    
    # Verify installation
    if [ -x "$hook_path" ]; then
        echo -e "${GREEN}✅ GitGuard installed successfully for $install_type use!${NC}"
        echo -e "Hook location: $hook_path"
    else
        echo -e "${RED}❌ Installation failed. Please check permissions and try again.${NC}"
        echo -e "You may need to run the script with sudo or manually create the directory:"
        echo -e "mkdir -p \"$(dirname "$hook_path")\""
        exit 1
    fi
}

main() {
    echo -e "${BLUE}Welcome to GitGuard Installation!${NC}"
    
    if [ ! -f "$SCRIPT_DIR/gitguard-prepare.py" ]; then
        echo -e "${RED}❌ Error: Could not find gitguard-prepare.py in $SCRIPT_DIR${NC}"
        exit 1
    fi

    local status=($(check_installation_status))
    local project_status=$(echo "${status[0]}" | cut -d':' -f2)
    local global_status=$(echo "${status[1]}" | cut -d':' -f2)
    
    # Show current status
    echo -e "\n${BLUE}Current Installation Status:${NC}"
    if git rev-parse --git-dir > /dev/null 2>&1; then
        echo -e " Project ($(git rev-parse --show-toplevel)): ${project_status:-none}"
    fi
    echo -e "🌍 Global: ${global_status:-none}"
    
    # Determine installation options
    if [ "$project_status" = "none" ] && [ "$global_status" = "none" ]; then
        echo -e "\nWhere would you like to install GitGuard?"
        echo -e "1) Project only ${GREEN}[default]${NC}"
        echo -e "2) Global only"
        echo -e "3) Both project and global"
        read -p "Select an option (1-3, press Enter for default): " -r
        echo
        
        # Default to option 1 if Enter is pressed
        REPLY=${REPLY:-1}
        
        case $REPLY in
            1) handle_installation "$(git rev-parse --git-dir)/hooks" "project" ;;
            2) handle_installation "$GLOBAL_GIT_DIR" "global" ;;
            3)
                handle_installation "$(git rev-parse --git-dir)/hooks" "project"
                handle_installation "$GLOBAL_GIT_DIR" "global"
                ;;
            *) 
                echo -e "${YELLOW}Invalid option. Using default: Project only${NC}"
                handle_installation "$(git rev-parse --git-dir)/hooks" "project"
                ;;
        esac
    else
        # Handle existing installations
        if [ "$project_status" = "gitguard" ] || [ "$global_status" = "gitguard" ]; then
            echo -e "\n${YELLOW}GitGuard is already installed. What would you like to do?${NC}"
            echo -e "1) Reinstall existing hooks ${GREEN}[default]${NC}"
            echo -e "2) Cancel"
            read -p "Select an option (1-2, press Enter to reinstall): " -r
            echo
            
            # Default to option 1 (reinstall) if Enter is pressed
            REPLY=${REPLY:-1}
            
            case $REPLY in
                2) echo -e "${YELLOW}Installation cancelled.${NC}" ;;
                *) 
                    # Directly reinstall without additional confirmation
                    [ "$project_status" = "gitguard" ] && handle_installation "$(git rev-parse --git-dir)/hooks" "project"
                    [ "$global_status" = "gitguard" ] && handle_installation "$GLOBAL_GIT_DIR" "global"
                    ;;
            esac
        fi
    fi
}

handle_remote_install() {
    # Create temporary directory
    local temp_dir=$(mktemp -d)
    trap 'rm -rf "$temp_dir"' EXIT

    echo -e "${BLUE}Downloading GitGuard...${NC}"
    
    # Download the necessary files
    curl -s -o "$temp_dir/gitguard-prepare.py" "https://raw.githubusercontent.com/deeeed/universe/main/packages/gitguard/gitguard-prepare.py"
    
    if [ ! -f "$temp_dir/gitguard-prepare.py" ]; then
        echo -e "${RED}❌ Failed to download GitGuard files${NC}"
        exit 1
    fi

    # Set script directory to temp directory for installation
    SCRIPT_DIR="$temp_dir"
    
    # Run the main installation
    main
}

# Check how the script was invoked
if [ -n "$BASH_SOURCE" ] && [ "${BASH_SOURCE[0]}" != "$0" ]; then
    # Script is being sourced
    export CURL_INSTALL=1
else
    # Script is being executed directly
    if [ -n "$CURL_INSTALL" ] || [ "$1" = "--remote" ]; then
        handle_remote_install
    else
        main
    fi
fi
