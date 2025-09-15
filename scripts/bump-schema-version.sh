#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if version argument is provided
if [ $# -eq 0 ]; then
    print_error "Usage: $0 <version>"
    print_error "Example: $0 0.1.3"
    exit 1
fi

NEW_VERSION="$1"
SCHEMA_DIR="packages/schema"
PACKAGE_JSON="$SCHEMA_DIR/package.json"
JSR_JSON="$SCHEMA_DIR/jsr.json"

# Validate version format (basic semver check)
if ! echo "$NEW_VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$'; then
    print_error "Invalid version format: $NEW_VERSION"
    print_error "Expected format: X.Y.Z (semver)"
    exit 1
fi

print_status "Bumping schema package version to $NEW_VERSION"

# Check if we're in the right directory
if [ ! -f "$PACKAGE_JSON" ]; then
    print_error "package.json not found at $PACKAGE_JSON"
    print_error "Make sure you're running this from the anode root directory"
    exit 1
fi

if [ ! -f "$JSR_JSON" ]; then
    print_error "jsr.json not found at $JSR_JSON"
    exit 1
fi

# Get current versions
CURRENT_PACKAGE_VERSION=$(node -p "require('./$PACKAGE_JSON').version" 2>/dev/null || echo "unknown")
CURRENT_JSR_VERSION=$(node -p "require('./$JSR_JSON').version" 2>/dev/null || echo "unknown")

print_status "Current package.json version: $CURRENT_PACKAGE_VERSION"
print_status "Current jsr.json version: $CURRENT_JSR_VERSION"

# Check if versions are currently in sync
if [ "$CURRENT_PACKAGE_VERSION" != "$CURRENT_JSR_VERSION" ]; then
    print_warning "Current versions are out of sync!"
fi

# Update package.json
print_status "Updating $PACKAGE_JSON..."
if command -v jq >/dev/null 2>&1; then
    # Use jq if available (preferred)
    jq ".version = \"$NEW_VERSION\"" "$PACKAGE_JSON" > "${PACKAGE_JSON}.tmp" && mv "${PACKAGE_JSON}.tmp" "$PACKAGE_JSON"
else
    # Fallback to sed
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" "$PACKAGE_JSON"
    else
        # Linux
        sed -i "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" "$PACKAGE_JSON"
    fi
fi

# Update jsr.json
print_status "Updating $JSR_JSON..."
if command -v jq >/dev/null 2>&1; then
    # Use jq if available (preferred)
    jq ".version = \"$NEW_VERSION\"" "$JSR_JSON" > "${JSR_JSON}.tmp" && mv "${JSR_JSON}.tmp" "$JSR_JSON"
else
    # Fallback to sed
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" "$JSR_JSON"
    else
        # Linux
        sed -i "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" "$JSR_JSON"
    fi
fi

# Verify the changes
UPDATED_PACKAGE_VERSION=$(node -p "require('./$PACKAGE_JSON').version")
UPDATED_JSR_VERSION=$(node -p "require('./$JSR_JSON').version")

if [ "$UPDATED_PACKAGE_VERSION" != "$NEW_VERSION" ] || [ "$UPDATED_JSR_VERSION" != "$NEW_VERSION" ]; then
    print_error "Failed to update versions correctly"
    print_error "package.json: $UPDATED_PACKAGE_VERSION"
    print_error "jsr.json: $UPDATED_JSR_VERSION"
    exit 1
fi

print_success "Successfully updated both files to version $NEW_VERSION"

# Stage the changes
if git status >/dev/null 2>&1; then
    print_status "Staging changes..."
    git add "$PACKAGE_JSON" "$JSR_JSON"

    print_status "Changes staged. You can now commit with:"
    echo "git commit -m \"Bump schema version to v$NEW_VERSION\""
    echo "git tag v$NEW_VERSION"
    echo "git push origin HEAD --tags"
    print_warning "Remember: Pushing the tag will trigger the publish workflow!"
else
    print_warning "Not in a git repository. Changes made but not staged."
fi

# Show what changed
print_status "Summary of changes:"
echo "  $PACKAGE_JSON: $CURRENT_PACKAGE_VERSION → $NEW_VERSION"
echo "  $JSR_JSON: $CURRENT_JSR_VERSION → $NEW_VERSION"

print_success "Version bump complete!"
