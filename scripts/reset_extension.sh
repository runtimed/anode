#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.." || exit 1

echo "Resetting extension configuration..."

# Find the value (not key) from extension_overrides.ts
# This extracts the value after "@runtimed/extension_impl":
CURRENT_PACKAGE=$(awk -F'"' '/@runtimed\/extension_impl/ {print $4}' extension_overrides.ts)

if [ -n "$CURRENT_PACKAGE" ]; then
    echo "Uninstalling $CURRENT_PACKAGE..."
    pnpm uninstall "$CURRENT_PACKAGE"
    
    if [ $? -ne 0 ]; then
        echo "Failed to uninstall $CURRENT_PACKAGE"
        exit 1
    fi
else
    echo "No package currently installed"
fi

echo "Resetting extension_overrides.ts..."
cat > extension_overrides.ts << EOF
export default {} as Record<string, string>;
EOF

echo "Resetting tsconfig.json..."
# Use jq to reset the @runtimed/extension_impl path mapping
jq '.compilerOptions.paths."@runtimed/extension_impl" = ["./REPLACE_ME_WITH_EXTENSION_PATH", "./backend/local_extension/index.ts"]' tsconfig.json > tsconfig.json.tmp && mv tsconfig.json.tmp tsconfig.json

echo "Successfully reset extension configuration"
