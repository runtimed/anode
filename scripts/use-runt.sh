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
  VERSION=$(curl -s https://api.jsr.io/scopes/runt/packages/schema/versions | jq -r '.[0].version')
  echo "Using @runt/schema from production JSR package: $VERSION"
  jq --arg version "$VERSION" '.dependencies["@runt/schema"] = "jsr:^\($version)"' package.json > package.json.tmp && mv package.json.tmp package.json
  echo "Updated package.json to use @runt/schema version jsr:^$VERSION"
  # Update lockfile
  pnpm install
fi