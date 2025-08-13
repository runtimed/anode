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

echo "Successfully set extension to $PACKAGE_NAME@$VERSION"
echo "extension_overrides.ts has been updated"
