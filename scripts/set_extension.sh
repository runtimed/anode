#!/bin/bash

if [ $# -ne 2 ]; then
    echo "Usage: $0 <package_name> <version>"
    echo "Example: $0 @runtimed/anaconda 0.1.0"
    exit 1
fi

PACKAGE_NAME="$1"
VERSION="$2"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$SCRIPT_DIR/.." || exit 1

echo "Installing $PACKAGE_NAME@$VERSION..."
pnpm install "$PACKAGE_NAME@$VERSION"

if [ $? -ne 0 ]; then
    echo "Failed to install $PACKAGE_NAME@$VERSION"
    exit 1
fi

echo "Updating extension_overrides.ts..."

cat > extension_overrides.ts << EOF
export default { "@runtimed/extension_impl": "$PACKAGE_NAME" } as Record<string, string>;
EOF

echo "Determining types path for $PACKAGE_NAME..."

# Read the package.json to determine the types path
PACKAGE_JSON_PATH="node_modules/$PACKAGE_NAME/package.json"

if [ ! -f "$PACKAGE_JSON_PATH" ]; then
    echo "Error: package.json not found at $PACKAGE_JSON_PATH"
    exit 1
fi

# Extract the types path using jq
TYPES_PATH=""

# First check if there's a "types" field
TYPES_FIELD=$(jq -r '.types // empty' "$PACKAGE_JSON_PATH")
if [ -n "$TYPES_FIELD" ] && [ "$TYPES_FIELD" != "null" ]; then
    # Use the types field, get the directory
    TYPES_PATH=$(dirname "$TYPES_FIELD")
else
    # Check exports field
    EXPORTS_MAIN=$(jq -r '.exports."." // empty' "$PACKAGE_JSON_PATH")
    if [ -n "$EXPORTS_MAIN" ] && [ "$EXPORTS_MAIN" != "null" ]; then
        # Check if exports is an object with types
        EXPORTS_TYPES=$(jq -r '.exports.".".types // empty' "$PACKAGE_JSON_PATH")
        if [ -n "$EXPORTS_TYPES" ] && [ "$EXPORTS_TYPES" != "null" ]; then
            TYPES_PATH=$(dirname "$EXPORTS_TYPES")
        else
            # Check if exports is a string and contains "dist"
            if [[ "$EXPORTS_MAIN" == *"dist"* ]]; then
                TYPES_PATH="dist"
            else
                TYPES_PATH=$(dirname "$EXPORTS_MAIN")
            fi
        fi
    else
        # Fall back to main field
        MAIN_FIELD=$(jq -r '.main // empty' "$PACKAGE_JSON_PATH")
        if [ -n "$MAIN_FIELD" ] && [ "$MAIN_FIELD" != "null" ]; then
            TYPES_PATH=$(dirname "$MAIN_FIELD")
        else
            echo "Error: Could not determine types path from package.json"
            exit 1
        fi
    fi
fi

# Clean up the path - remove leading ./ if present
TYPES_PATH=$(echo "$TYPES_PATH" | sed 's|^\./||')

# Construct the full path
FULL_TYPES_PATH="./node_modules/$PACKAGE_NAME/$TYPES_PATH"

echo "Types path determined: $FULL_TYPES_PATH"

echo "Updating tsconfig.json..."

# Use sed to replace the placeholder with the actual path
# Handle both Linux (GNU sed) and macOS (BSD sed)
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS - BSD sed requires an extension for backup
    sed -i.bak "s|./REPLACE_ME_WITH_EXTENSION_PATH|$FULL_TYPES_PATH|g" tsconfig.json
    rm -f tsconfig.json.bak
else
    # Linux - GNU sed
    sed -i "s|./REPLACE_ME_WITH_EXTENSION_PATH|$FULL_TYPES_PATH|g" tsconfig.json
fi

echo "Successfully set extension to $PACKAGE_NAME@$VERSION"
echo "extension_overrides.ts has been updated"
echo "tsconfig.json has been updated with types path: $FULL_TYPES_PATH"
