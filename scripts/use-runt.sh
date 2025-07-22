echo "$1"

if [ -z "$1" ]; then
  echo "Usage: $0 <mode>"
  echo "Available modes:"
  echo "  main   - Use the main branch schema (GitHub ref)"
  echo "  local  - Use local schema (file link)"
  echo "  prod   - Use production schema (JSR package)"
  exit 1
fi

if [ "$1" = "main" ]; then
  RUNT_COMMIT=$(git ls-remote https://github.com/runtimed/runt.git refs/heads/main | awk '{print $1}')
  if [ -z "$RUNT_COMMIT" ]; then
    echo "Failed to fetch main branch commit from runtimed/runt"
    exit 1
  fi
  echo "Using @runt/schema from main branch commit: $RUNT_COMMIT"
  pnpm i "github:runtimed/runt#${RUNT_COMMIT}&path:/packages/schema"
fi


if [ "$1" = "local" ]; then
  echo "Using @runt/schema from local file: ../runt/packages/schema"
  pnpm i "file:../runt/packages/schema"
fi

if [ "$1" = "prod" ]; then
  PNPM_VERSION=$(pnpm --version)
  PNPM_MAJOR=$(echo "$PNPM_VERSION" | cut -d. -f1)
  PNPM_MINOR=$(echo "$PNPM_VERSION" | cut -d. -f2)
  if [ "$PNPM_MAJOR" -lt 10 ] || { [ "$PNPM_MAJOR" -eq 10 ] && [ "$PNPM_MINOR" -lt 9 ]; }; then
    echo "Error: pnpm v10.9.0 or higher is required. Detected version: $PNPM_VERSION"
    exit 1
  fi

  pnpm add jsr:@runt/schema
fi

if [ "$1" != "main" ] && [ "$1" != "local" ] && [ "$1" != "prod" ]; then
  echo "Unsupported mode: $1"
  echo "Supported modes are: main, local, prod"
  exit 1
fi
