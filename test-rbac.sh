#!/bin/bash

# RBAC Manual Testing Script
# This script demonstrates the RBAC functionality for Anode notebooks

echo "🔐 RBAC Manual Testing Guide for Anode"
echo "======================================"
echo ""

echo "Prerequisites:"
echo "1. Anode development server running: pnpm dev"
echo "2. Google OAuth configured or local auth enabled"
echo "3. Two different user accounts for testing"
echo ""

echo "Test Scenarios:"
echo ""

echo "📝 Scenario 1: Create New Notebook"
echo "1. Open browser to http://localhost:5173"
echo "2. Sign in with User A"
echo "3. Click '+ Notebook' to create new notebook"
echo "4. Note the notebook URL (e.g., ?notebook=notebook-1234567890123-abc123)"
echo "5. Verify User A can edit cells and see content"
echo "Expected: User A automatically becomes owner"
echo ""

echo "👥 Scenario 2: Share Notebook"
echo "1. As User A (owner), click Share button (Share2 icon) in top navigation"
echo "2. Permission Manager modal should open"
echo "3. Click 'Add User' button"
echo "4. Enter User B's Google ID or email"
echo "5. Select 'Editor' role"
echo "6. Click 'Grant Access'"
echo "Expected: User B now appears in permissions list"
echo ""

echo "🔒 Scenario 3: Test Access Control"
echo "1. Copy the notebook URL from Scenario 1"
echo "2. Open new incognito window or different browser"
echo "3. Sign in with User B"
echo "4. Navigate to the notebook URL"
echo "Expected: User B can access and edit the notebook"
echo ""

echo "🚫 Scenario 4: Test Access Denial"
echo "1. Copy the notebook URL from Scenario 1"
echo "2. Open new incognito window"
echo "3. Sign in with User C (different from A and B)"
echo "4. Navigate to the notebook URL"
echo "Expected: User C gets 'Permission Denied' error and cannot access notebook"
echo ""

echo "👑 Scenario 5: Permission Management"
echo "1. As User A (owner), open Share dialog"
echo "2. Try to revoke User B's access by clicking trash icon"
echo "3. Confirm revocation"
echo "4. User B should lose access (test by refreshing their browser)"
echo "Expected: User B can no longer access the notebook"
echo ""

echo "🔧 Scenario 6: Owner Protection"
echo "1. As User A (owner), open Share dialog"
echo "2. Try to revoke your own access"
echo "Expected: System prevents self-revocation with error message"
echo ""

echo "🤖 Scenario 7: Runtime Agent Access"
echo "1. Start a runtime agent with: NOTEBOOK_ID=<notebook-id> pnpm dev:runtime"
echo "2. Runtime should connect successfully regardless of permissions"
echo "Expected: Runtime agents bypass permission checks"
echo ""

echo "API Testing Commands:"
echo "===================="
echo ""

echo "# Check permission (replace TOKEN and NOTEBOOK_ID)"
echo 'curl -H "Authorization: Bearer YOUR_TOKEN" \\'
echo '  "http://localhost:8787/api/permissions/check?notebookId=NOTEBOOK_ID"'
echo ""

echo "# Grant permission (owners only)"
echo 'curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \\'
echo '  -H "Content-Type: application/json" \\'
echo '  -d '"'"'{"notebookId":"NOTEBOOK_ID","userId":"USER_EMAIL","role":"editor"}'"'"' \\'
echo '  "http://localhost:8787/api/permissions/grant"'
echo ""

echo "# List permissions (owners only)"
echo 'curl -H "Authorization: Bearer YOUR_TOKEN" \\'
echo '  "http://localhost:8787/api/permissions/list?notebookId=NOTEBOOK_ID"'
echo ""

echo "# Revoke permission (owners only)"
echo 'curl -X DELETE -H "Authorization: Bearer YOUR_TOKEN" \\'
echo '  -H "Content-Type: application/json" \\'
echo '  -d '"'"'{"notebookId":"NOTEBOOK_ID","userId":"USER_EMAIL"}'"'"' \\'
echo '  "http://localhost:8787/api/permissions/revoke"'
echo ""

echo "Debug Information:"
echo "=================="
echo "- Check browser console for permission validation logs"
echo "- Backend logs show detailed permission check results"
echo "- D1 database can be inspected with: pnpm wrangler d1 execute DB --command=\"SELECT * FROM notebook_permissions\""
echo ""

echo "Expected Behaviors:"
echo "==================="
echo "✅ New notebooks auto-grant ownership to creators"
echo "✅ Only owners can manage permissions"
echo "✅ Editors can read/write notebook content"
echo "✅ Non-permitted users get access denied"
echo "✅ Runtime agents bypass all permission checks"
echo "✅ Anonymous users bypass permission checks (local dev)"
echo "✅ Share button only visible to authenticated users"
echo "✅ Permission manager only accessible to owners"
echo ""

echo "To run this test:"
echo "1. Start development server: pnpm dev"
echo "2. Follow each scenario step by step"
echo "3. Verify expected behaviors"
echo "4. Test API endpoints with curl commands"