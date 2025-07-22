# Tool Approval System

The tool approval system provides user control over AI tool calls, allowing users to approve, deny, or set blanket permissions for AI tools.

## Overview

When an AI agent attempts to use a tool (like `create_cell`, `modify_cell`, or `execute_cell`), the system can require user approval before the tool is executed. This adds a security layer to prevent unwanted actions.

## Architecture

### Backend (runt)

The tool approval system is implemented in the runt backend:

#### Schema Changes

**New Table: `toolApprovals`**

- `toolCallId`: Unique identifier for the tool call
- `cellId`: The cell where the tool call was initiated
- `toolName`: Name of the tool being called
- `status`: One of `pending`, `approved_once`, `approved_always`, `denied`
- `approvedBy`: User who approved/denied the request
- `requestedAt`: When approval was requested
- `respondedAt`: When user responded (nullable)

**New Events:**

- `toolApprovalRequested`: Emitted when a tool needs approval
- `toolApprovalResponded`: Emitted when user responds to approval request

#### Tool Handling Logic

Modified `handleToolCallWithResult` in `tool-registry.ts`:

1. **Check if approval required**: All tools require approval
2. **Look for existing approval**: Check for specific approval or blanket "always" approval
3. **Request approval if needed**: Emit `toolApprovalRequested` event
4. **Wait for response**: Poll for approval status with 60-second timeout
5. **Execute or deny**: Proceed with tool execution or throw error based on response

### Frontend (anode)

The frontend provides the user interface for approvals:

#### Components

**`useToolApprovals` hook** (`src/hooks/useToolApprovals.ts`)

- Monitors pending approval requests
- Provides function to respond to approvals

**`ToolApprovalDialog` component** (`src/components/auth/ToolApprovalDialog.tsx`)

- Shows approval dialog with three buttons:
  - **Approve Once**: Allow this specific tool call
  - **Always Allow This Tool**: Allow all future calls to this tool
  - **Deny**: Reject this tool call

**`ToolApprovalManager` component** (`src/components/auth/ToolApprovalManager.tsx`)

- Manages the queue of approval requests
- Shows one dialog at a time

## Usage

### For Users

When an AI agent attempts to use a tool, a dialog will appear with:

- The name of the tool being requested
- A description of what the tool does
- Three response options

### For Developers

#### Adding New Tools

New tools automatically require approval. All tools now require approval by default.

#### Configuring Tool Policies

You can modify the approval requirements in `handleToolCallWithResult`:

```typescript
// Example: Make create_cell not require approval (if needed)
const requiresApproval = name !== "create_cell";
```

#### Testing

Use the test utilities in `test/tool-approval.test.ts` to verify approval workflows.

## Security Considerations

- **Default deny**: All new tools require approval by default
- **Timeout protection**: Approval requests timeout after 60 seconds
- **User attribution**: All approvals/denials are attributed to the acting user
- **Granular control**: Users can approve once or set blanket permissions

## Future Enhancements

- **Risk-based approval**: Automatic approval for low-risk operations
- **Approval policies**: Organization-level policies for tool usage
- **Audit logging**: Enhanced logging of tool usage and approvals
- **Tool arguments display**: Show tool arguments in approval dialog
- **Batch approvals**: Handle multiple tool calls at once
