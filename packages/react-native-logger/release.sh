#!/bin/bash

set -e  # Exit immediately if a command exits with a non-zero status.

# Get the directory of the current script
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

# Change to the script's directory
cd "$SCRIPT_DIR"

# Function to display help message
show_help() {
    echo "Usage: $0 [patch|minor|major]"
    echo
    echo "Specify the type of version bump:"
    echo "  patch   - Increment the patch version (x.x.1)"
    echo "  minor   - Increment the minor version (x.1.x)"
    echo "  major   - Increment the major version (1.x.x)"
    exit 1
}

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

# Check if version type is provided
if [ -z "$1" ]; then
    show_help
fi

version_type=$1

# Validate the version type
if [[ "$version_type" != "patch" && "$version_type" != "minor" && "$version_type" != "major" ]]; then
    echo "Invalid version type: $version_type"
    show_help
fi

# Extract the current version
previous_version=$(node -p "require('./package.json').version")
echo "Current version: $previous_version"

# Run typecheck
yarn typecheck

# Bump the specified version type
yarn version $version_type

# Get the new version
new_version=$(node -p "require('./package.json').version")
echo "New version: $new_version"

# Create git tag with correct prefix
git tag "react-native-logger-v${new_version}"

# Update the changelog
update_changelog "$new_version" "$previous_version"

# Add changes to git
git add .

# Commit changes with the new version in the commit message
git commit -m "feat(react-native-logger): bump version $new_version"

# Push the tag
git push origin "react-native-logger-v${new_version}"

# Run the release script
yarn release
