#!/bin/bash

# Exit on any error
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Function to run a single test
run_test() {
    local test_name="$1"
    local setup_cmd="$2"
    local test_cmd="$3"
    
    echo -e "\n${YELLOW}Testing ${test_name}...${NC}"
    eval "$setup_cmd"
    echo -e "\n${YELLOW}Testing commit - you should see a warning and confirmation prompt${NC}"
    if eval "$test_cmd"; then
        echo -e "${RED}❌ Failed: Warning not shown${NC}"
        return 1
    else
        echo -e "${GREEN}✅ Success: Warning shown${NC}"
        return 0
    fi
}

# Function to clean up test files
cleanup() {
    echo -e "\n${YELLOW}Cleaning up...${NC}"
    git reset HEAD "$SCRIPT_DIR/.env" "$SCRIPT_DIR/packages/core/src/config.json" 2>/dev/null || true
    ./cleanup-samples.sh
    rm -f "$SCRIPT_DIR/.env" "$SCRIPT_DIR/packages/core/src/config.json"
}

# Ensure we're in the gitguard directory
if [[ ! "$SCRIPT_DIR" =~ .*/packages/gitguard$ ]]; then
    echo -e "${RED}❌ Error: Script must be run from packages/gitguard directory${NC}"
    echo "Current directory: $SCRIPT_DIR"
    exit 1
fi

# Create sample files
echo "Creating sample files..."
./create-samples.sh

# Create additional test directories if they don't exist
mkdir -p "$SCRIPT_DIR/packages/core/src"

# Display menu
echo -e "\n${BLUE}GitGuard Security Tests${NC}"
echo -e "\nAvailable tests:"
echo "1) AWS Key Detection"
echo "2) Generic API Key Detection"
echo "3) Environment File Detection"
echo "4) Config File Detection"
echo "5) Multiple Secrets Detection"
echo "6) Run All Tests"
echo "q) Quit"

read -p $'\nSelect a test to run (1-6, q to quit): ' choice

case $choice in
    1)
        run_test "AWS Key Detection" \
            "echo 'AWS_KEY=AKIAXXXXXXXXXXXXXXXX' > '$SCRIPT_DIR/.env' && git add '$SCRIPT_DIR/.env'" \
            "git commit -m 'add config'"
        ;;
    2)
        run_test "Generic API Key Detection" \
            "echo 'API_KEY=\"abc123xyz456\"' > '$SCRIPT_DIR/.env' && git add '$SCRIPT_DIR/.env'" \
            "git commit -m 'add api key'"
        ;;
    3)
        run_test "Environment File Detection" \
            "echo 'DATABASE_URL=postgresql://localhost:5432/db' > '$SCRIPT_DIR/.env.production' && git add '$SCRIPT_DIR/.env.production'" \
            "git commit -m 'add env file'"
        ;;
    4)
        run_test "Config File Detection" \
            "echo '{\"secretKey\": \"test123\"}' > '$SCRIPT_DIR/packages/core/src/config.json' && git add '$SCRIPT_DIR/packages/core/src/config.json'" \
            "git commit -m 'add config'"
        ;;
    5)
        run_test "Multiple Secrets Detection" \
            "echo -e 'AWS_KEY=AKIAXXXXXXXXXXXXXXXX\nAPI_KEY=\"abc123xyz456\"\nDATABASE_URL=postgresql://user:pass@localhost:5432/db' > '$SCRIPT_DIR/.env' && git add '$SCRIPT_DIR/.env'" \
            "git commit -m 'add multiple secrets'"
        ;;
    6)
        echo -e "\n${YELLOW}Running all tests...${NC}"
        for test_num in {1..5}; do
            case $test_num in
                1) test_name="AWS Key Detection"
                   setup="echo 'AWS_KEY=AKIAXXXXXXXXXXXXXXXX' > '$SCRIPT_DIR/.env' && git add '$SCRIPT_DIR/.env'"
                   ;;
                2) test_name="Generic API Key Detection"
                   setup="echo 'API_KEY=\"abc123xyz456\"' > '$SCRIPT_DIR/.env' && git add '$SCRIPT_DIR/.env'"
                   ;;
                3) test_name="Environment File Detection"
                   setup="echo 'DATABASE_URL=postgresql://localhost:5432/db' > '$SCRIPT_DIR/.env.production' && git add '$SCRIPT_DIR/.env.production'"
                   ;;
                4) test_name="Config File Detection"
                   setup="echo '{\"secretKey\": \"test123\"}' > '$SCRIPT_DIR/packages/core/src/config.json' && git add '$SCRIPT_DIR/packages/core/src/config.json'"
                   ;;
                5) test_name="Multiple Secrets Detection"
                   setup="echo -e 'AWS_KEY=AKIAXXXXXXXXXXXXXXXX\nAPI_KEY=\"abc123xyz456\"\nDATABASE_URL=postgresql://user:pass@localhost:5432/db' > '$SCRIPT_DIR/.env' && git add '$SCRIPT_DIR/.env'"
                   ;;
            esac
            run_test "$test_name" "$setup" "git commit -m 'test $test_num'"
            cleanup
        done
        ;;
    q|Q)
        echo -e "\n${YELLOW}Exiting...${NC}"
        ;;
    *)
        echo -e "\n${RED}Invalid choice${NC}"
        ;;
esac

# Final cleanup
cleanup

echo -e "\n${GREEN}✅ Tests completed!${NC}"
