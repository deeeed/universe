#!/bin/bash

# Exit on any error
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Find git root directory
GIT_ROOT=$(git rev-parse --show-toplevel)
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error: Not in a git repository${NC}"
    exit 1
fi

# List of sample files and directories to remove
SAMPLE_PATHS=(
    "packages/ui/src/Button.tsx"
    "packages/ui/tests/Button.test.tsx"
    "packages/ui/package.json"
    "packages/core/src/utils.ts"
    "packages/core/package.json"
    "docs/README.md"
)

# Remove sample files
for path in "${SAMPLE_PATHS[@]}"; do
    full_path="$GIT_ROOT/$path"
    if [ -f "$full_path" ]; then
        rm "$full_path"
        echo "Removed: $path"
    fi
done

# Clean up empty directories
SAMPLE_DIRS=(
    "packages/ui/src"
    "packages/ui/tests"
    "packages/ui"
    "packages/core/src"
    "packages/core"
    "docs"
)

for dir in "${SAMPLE_DIRS[@]}"; do
    full_dir="$GIT_ROOT/$dir"
    if [ -d "$full_dir" ] && [ -z "$(ls -A $full_dir)" ]; then
        rmdir "$full_dir"
        echo "Removed empty directory: $dir"
    fi
done

echo -e "${GREEN}✅ Sample files cleaned up successfully!${NC}" 
