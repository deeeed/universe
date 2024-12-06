#!/bin/bash

set -e  # Exit immediately if a command exits with a non-zero status.

# Get the directory of the current script
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

# Change to the script's directory
cd "$SCRIPT_DIR"

# Function to check if tag exists
check_tag_exists() {
    local new_version=$1
    local tag_name="design-system-v${new_version}"
    
    # Check if tag exists locally
    if git tag | grep -q "$tag_name"; then
        echo "Error: Tag $tag_name already exists locally. Please remove it first:"
        echo "git tag -d $tag_name"
        exit 1
    fi
    
    # Check if tag exists on remote
    if git ls-remote --tags origin | grep -q "refs/tags/$tag_name"; then
        echo "Error: Tag $tag_name already exists on remote. Please remove it first:"
        echo "git push --delete origin $tag_name"
        exit 1
    fi
}

# Function to cleanup if something goes wrong
cleanup() {
    local new_version=$1
    echo -e "\nCleaning up..."
    
    # Remove the tag locally if it exists
    if git tag | grep -q "design-system-v${new_version}"; then
        echo "Removing local tag design-system-v${new_version}"
        git tag -d "design-system-v${new_version}"
    fi
    
    # Restore the original changelog if it was modified
    if git status --porcelain | grep -q "CHANGELOG.md"; then
        echo "Restoring CHANGELOG.md"
        git checkout -- CHANGELOG.md
    fi

    # Restore package.json if it was modified
    if git status --porcelain | grep -q "package.json"; then
        echo "Restoring package.json"
        git checkout -- package.json
    fi
    
    echo "Cleanup completed"
    exit 1
}

# Function to update changelog
update_changelog() {
    local new_version=$1
    local previous_version=$2
    local current_date=$(date +%Y-%m-%d)
    local package_prefix="design-system-v"

    # Create temporary file
    temp_file=$(mktemp)

    # Read line by line and update the changelog
    while IFS= read -r line; do
        echo "$line" >> "$temp_file"

        # Find the [Unreleased] section and add the new version
        if [[ "$line" == "## [Unreleased]" ]]; then
            echo "" >> "$temp_file"
            echo "## [$new_version] - $current_date" >> "$temp_file"
        fi

        # Update the comparison links at the bottom
        if [[ "$line" == "[unreleased]:"* ]]; then
            echo "[unreleased]: https://github.com/deeeed/universe/compare/${package_prefix}${new_version}...HEAD" >> "$temp_file"
            echo "[$new_version]: https://github.com/deeeed/universe/compare/${package_prefix}${previous_version}...${package_prefix}${new_version}" >> "$temp_file"
            break
        fi
    done < CHANGELOG.md

    # Replace original file with updated content
    mv "$temp_file" CHANGELOG.md
}

# Check if CHANGELOG.md exists
if [ ! -f "CHANGELOG.md" ]; then
    echo "Error: CHANGELOG.md not found. Please create it first."
    exit 1
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo -e "\n⚠️  Warning: You have uncommitted changes:"
    git status --short
    echo -e "\nThese changes will be included in the release commit."
    read -p "Do you want to continue anyway? (y/n): " continue_with_changes
    if [[ $continue_with_changes != "y" ]]; then
        echo "Please commit or stash your changes first."
        exit 1
    fi
    echo -e "\nProceeding with uncommitted changes..."
fi

echo "Starting release process..."

# Show changelog diff
echo -e "\nChangelog updates preview:"
git diff CHANGELOG.md

# Show all changes that will be included
if [ -n "$(git status --porcelain)" ]; then
    echo -e "\nAll changes that will be included in this release:"
    git status --short
fi

# Confirm before making any permanent changes
read -p $'\nReady to proceed with release? This will:\n- Run typecheck\n- Deploy Storybook\n- Create git tag\n- Publish to npm\nProceed? (y/n): ' confirm
if [[ $confirm != "y" ]]; then
    cleanup $new_version
fi

# Run typecheck
echo -e "\nRunning typecheck..."
yarn typecheck || { cleanup $new_version; }

# Deploy storybook
echo -e "\nDeploying Storybook..."
yarn deploy:storybook || { cleanup $new_version; }
