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

print_step() {
    echo ""
    echo -e "${BLUE}=================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}=================================${NC}"
}

# Check if we're in the right directory
if [ ! -f "packages/schema/package.json" ]; then
    print_error "packages/schema/package.json not found"
    print_error "Make sure you're running this from the anode root directory"
    exit 1
fi

print_step "Testing Schema Package Publish Process"

# Step 1: Validate version consistency
print_step "1. Validating Version Consistency"

PACKAGE_VERSION=$(node -p "require('./packages/schema/package.json').version")
JSR_VERSION=$(node -p "require('./packages/schema/jsr.json').version")

print_status "package.json version: $PACKAGE_VERSION"
print_status "jsr.json version: $JSR_VERSION"

if [ "$PACKAGE_VERSION" != "$JSR_VERSION" ]; then
    print_error "❌ Version mismatch: package.json ($PACKAGE_VERSION) != jsr.json ($JSR_VERSION)"
    print_error "Run: pnpm bump-schema $PACKAGE_VERSION (or desired version)"
    exit 1
fi

print_success "✅ Versions match: $PACKAGE_VERSION"

# Step 2: Install dependencies if needed
print_step "2. Checking Dependencies"

if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    pnpm install --frozen-lockfile
else
    print_success "Dependencies already installed"
fi

# Step 3: Type check
print_step "3. Running Type Check"

if pnpm --filter schema type-check; then
    print_success "✅ Type check passed"
else
    print_error "❌ Type check failed"
    exit 1
fi

# Step 4: Lint check
print_step "4. Running Lint Check"

if pnpm --filter schema lint:check; then
    print_success "✅ Lint check passed"
else
    print_error "❌ Lint check failed"
    exit 1
fi

# Step 5: Format check
print_step "5. Running Format Check"

if pnpm --filter schema format:check; then
    print_success "✅ Format check passed"
else
    print_error "❌ Format check failed"
    exit 1
fi

# Step 6: Test JSR publish (dry run)
print_step "6. Testing JSR Publish (Dry Run)"

# Check if jsr CLI is available
if ! command -v jsr >/dev/null 2>&1; then
    print_warning "jsr CLI not found, attempting to install globally..."
    if ! npm install -g jsr; then
        print_error "Failed to install jsr CLI"
        print_error "Please install manually: npm install -g jsr"
        exit 1
    fi
fi

if pnpm --filter schema exec jsr publish --dry-run --allow-slow-types --allow-dirty; then
    print_success "✅ JSR dry run successful"
else
    print_error "❌ JSR dry run failed"
    exit 1
fi

# Step 7: Test npm publish (dry run)
print_step "7. Testing npm Publish (Dry Run)"

# Note: npm publish --dry-run requires being in the package directory
cd packages/schema

if npm publish --dry-run --access public; then
    print_success "✅ npm dry run successful"
else
    print_error "❌ npm dry run failed"
    exit 1
fi

cd ../..

# Step 8: Show what would be published
print_step "8. Summary"

print_success "All checks passed! ✅"
print_status "Package @runtimed/schema v$PACKAGE_VERSION is ready for publishing"
print_status ""
print_status "To publish for real:"
print_status "1. Create and push a git tag:"
print_status "   git tag v$PACKAGE_VERSION"
print_status "   git push origin v$PACKAGE_VERSION"
print_status ""
print_status "2. Or publish manually:"
print_status "   npm: pnpm --filter schema publish --access public"
print_status "   jsr: pnpm --filter schema exec jsr publish --allow-slow-types"
print_status ""
print_warning "⚠️  Make sure you have NPM_TOKEN and JSR_TOKEN configured for manual publishing"

print_step "Test Complete"
