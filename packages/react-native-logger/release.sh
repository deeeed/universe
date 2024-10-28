#!/bin/bash

set -e  # Exit immediately if a command exits with a non-zero status.

# Get the directory of the current script
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

# Change to the script's directory
cd "$SCRIPT_DIR"

# Function to update changelog
update_changelog() {
    local new_version=$1
    local previous_version=$2
    local current_date=$(date +%Y-%m-%d)
    local package_prefix="react-native-logger-v"

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

echo "Starting release process..."

# Get current version from package.json
current_version=$(node -p "require('./package.json').version")
echo "Current version: $current_version"

# Ask user for version bump type
echo -e "\nPlease select version bump type:"
echo "1) patch (x.x.X) - for backwards-compatible bug fixes"
echo "2) minor (x.X.0) - for new backwards-compatible functionality"
echo "3) major (X.0.0) - for breaking changes"
echo "4) manual - enter specific version"
read -p "Enter choice (1-4): " choice

# Store the previous version before any changes
previous_version=$current_version

# Handle version bump based on user choice
case $choice in
    1)
        echo -e "\nBumping patch version..."
        yarn version patch
        ;;
    2)
        echo -e "\nBumping minor version..."
        yarn version minor
        ;;
    3)
        echo -e "\nBumping major version..."
        yarn version major
        ;;
    4)
        read -p "Enter new version (current: $current_version): " new_version
        if [[ -z "$new_version" ]]; then
            echo "Version cannot be empty. Exiting."
            exit 1
        fi
        echo -e "\nSetting version to $new_version..."
        yarn version --new-version $new_version
        ;;
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

# Get new version after bump
new_version=$(node -p "require('./package.json').version")
echo -e "\nVersion bump: $current_version → $new_version"

# Run typecheck
echo -e "\nRunning typecheck..."
yarn typecheck

# Create git tag
echo -e "\nCreating git tag..."
git tag "react-native-logger-v${new_version}"

# Update the changelog
echo -e "\nUpdating changelog..."
update_changelog "$new_version" "$previous_version"

# Show changelog diff
echo -e "\nChangelog updates:"
git diff CHANGELOG.md

# Confirm before proceeding
read -p $'\nReady to commit, push, and publish. Continue? (y/n): ' confirm
if [[ $confirm != "y" ]]; then
    echo "Operation cancelled."
    exit 1
fi

# Add changes to git
echo -e "\nCommitting changes..."
git add .
git commit -m "feat(react-native-logger): bump version $new_version"

# Push the tag
echo -e "\nPushing tag..."
git push origin "react-native-logger-v${new_version}"

# Run the release script
echo -e "\nPublishing to npm..."
yarn release

echo -e "\n✨ Release process completed successfully!"
echo "New version $new_version has been:"
echo "- Tagged in git as react-native-logger-v${new_version}"
echo "- Updated in CHANGELOG.md"
echo "- Published to npm"
