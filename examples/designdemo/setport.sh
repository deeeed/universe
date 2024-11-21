#!/bin/bash

# Enable debug mode
set -x

CUSTOM_PORT=7765
CURRENT_FOLDER=$(dirname "$0")

# Color definitions
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Setting Metro port to: $CUSTOM_PORT${NC}"

# Function to update file if it exists and is regular
function update_file() {
    local file=$1
    local search=$2
    local replace=$3
    
    if [ -f "$file" ] && [ ! -h "$file" ]; then
        # Use different sed syntax for different file types
        if [[ $file == *".kt" ]]; then
            # For Kotlin files, escape the quotes
            sed -i '' "s/DEFAULT_DEV_SERVER_PORT = \"8081\"/DEFAULT_DEV_SERVER_PORT = \"$CUSTOM_PORT\"/" "$file"
        else
            # For header files
            sed -i '' "s/RCT_METRO_PORT 8081/RCT_METRO_PORT $CUSTOM_PORT/" "$file"
        fi
    else
        echo -e "${YELLOW}Skipping: $file (not a regular file)${NC}"
    fi
}

# Update React Core files
update_file "$CURRENT_FOLDER/ios/Pods/Headers/Public/React-Core/React/RCTDefines.h" \
    "RCT_METRO_PORT 8081" \
    "RCT_METRO_PORT $CUSTOM_PORT"

update_file "$CURRENT_FOLDER/ios/Pods/Headers/Private/React-Core/React/RCTDefines.h" \
    "RCT_METRO_PORT 8081" \
    "RCT_METRO_PORT $CUSTOM_PORT"

# Update Kotlin file
update_file "$CURRENT_FOLDER/node_modules/@react-native/gradle-plugin/react-native-gradle-plugin/src/main/kotlin/com/facebook/react/utils/AgpConfiguratorUtils.kt" \
    'DEFAULT_DEV_SERVER_PORT = "8081"' \
    "DEFAULT_DEV_SERVER_PORT = \"$CUSTOM_PORT\""

echo -e "${GREEN}Port update completed${NC}"
