# PR7: Execute State-First Conversion to FeltDB

## Overview

PR7 implements the execution engine for converting existing applications to FeltDB using the approved ConversionPlan from PR5 and the FeltDB configuration from PR6.

The key innovation is that this is **not an analyzer** - it consumes the existing plan and executes it with built-in safety guarantees:

1. **Approval is a hard boundary** - Only PENDING_APPROVAL → APPROVED → EXECUTING transitions are allowed
2. **Git checkpoints** - Pre-conversion state is recorded for recovery
3. **Durable workspace** - All execution metadata is stored in `.feltdb/conversion/`
4. **No re-analysis** - The plan is executed as-is without re-analyzing the application

## Architecture

### Components

#### 1. Conversion Execution Types (`src/ipc/types/conversion-execution.ts`)

Defines type-safe contracts for all execution operations:

- `ConversionExecutionStatus`: Status enum (PENDING_APPROVAL, APPROVED, EXECUTING, COMPLETED, FAILED, ROLLED_BACK)
- `GitCheckpoint`: Pre-conversion Git state snapshot
- `ConversionExecutionRecord`: Full execution metadata
- IPC Contracts: Define invoke channels and schemas

#### 2. Conversion Executor (`src/main/conversion_executor.ts`)

Orchestrates the conversion process:

```typescript
class ConversionExecutor {
  approvePlan(plan); // Validates PENDING_APPROVAL state
  createCheckpoint(); // Records pre-conversion Git state
  executeConversion(plan); // Runs the actual conversion
  rollbackConversion(); // Restores from checkpoint
}
```

#### 3. Git Checkpoint Manager (`src/ipc/utils/conversion_checkpoint.ts`)

Manages Git state snapshots:

- Stores commit SHA, branch, working tree state
- Enables precise rollback to pre-conversion state
- Records at `${workspaceDir}/checkpoints/{checkpointId}/`

#### 4. Conversion Workspace Manager (`src/main/conversion_workspace.ts`)

Manages durable execution records:

- Location: `.feltdb/conversion/`
- Tracks execution metadata
- Provides logging infrastructure
- Enables recovery and audit trails

#### 5. IPC Handlers (`src/ipc/handlers/conversion_execution_handlers.ts`)

Exposes execution operations to the renderer:

- `approve-conversion`: Approve a plan
- `execute-conversion`: Start conversion
- `get-conversion-execution`: Check status
- `rollback-conversion`: Restore from checkpoint

#### 6. React Hooks (`src/hooks/useConversionExecution.ts`)

Provides type-safe React integration:

```typescript
useApproveConversion(); // Approve a plan
useExecuteConversion(); // Execute conversion
useConversionExecutionStatus(); // Get execution status
useRollbackConversion(); // Rollback to checkpoint
```

## Workflow

### Approval Flow

```
ConversionPlan (PENDING_APPROVAL)
  ↓
User approves via UI
  ↓
[ConversionExecutionStatus: APPROVED]
  ↓
User initiates execution
  ↓
```

### Execution Flow

```
Execution Start (EXECUTING)
  ↓
Create Git Checkpoint
  ↓
Record checkpoint at ${workspace}/checkpoints/{id}/
  ↓
Execute conversion (apply changes)
  ↓
Completion (COMPLETED or FAILED)
  ↓
All metadata persisted to ${workspace}/executions/{id}/
```

### Rollback Flow

```
Failed Conversion (FAILED)
  ↓
User initiates rollback with checkpoint ID
  ↓
Git checkout to checkpoint commit SHA
  ↓
Status: ROLLED_BACK
  ↓
Full recovery to pre-conversion state
```

## Safety Guarantees

### 1. Approval Boundary Enforcement

```typescript
// Cannot execute without approval
if (plan.status !== "APPROVED") {
  throw new Error("Plan must be APPROVED to execute");
}
```

### 2. Git Checkpoint Creation

Before ANY modifications:

- Capture current commit SHA
- Record current branch
- Detect working tree state
- Store checkpoint metadata for rollback

### 3. Durable Workspace

All execution data persists in `.feltdb/conversion/`:

```
.feltdb/
  conversion/
    executions/
      {conversionId}/
        execution.json        # Full execution record
    checkpoints/
      {checkpointId}/
        checkpoint.json       # Checkpoint metadata
        git-state.json        # Git state snapshot
    logs/
      {conversionId}.log      # Execution logs
```

### 4. No Re-analysis

The executor uses the plan as provided:

- Doesn't re-analyze the application
- Doesn't re-detect the framework
- Doesn't re-identify state sources
- Executes exactly what was approved

## IPC API

### approve-conversion

```typescript
Input:  { appId: number }
Output: { success: boolean, message: string }
```

### execute-conversion

```typescript
Input: {
  appId: number;
}
Output: {
  conversionId: string;
  status: ConversionExecutionStatus;
  checkpointId: string;
  workspaceDirectory: string;
  message: string;
}
```

### get-conversion-execution

```typescript
Input: {
  appId: number;
}
Output: ConversionExecutionRecord | undefined;
```

### rollback-conversion

```typescript
Input:  {
  conversionId: string
  checkpointId: string
}
Output: {
  success: boolean
  message: string
  commitSha?: string
}
```

## React Hooks Usage

```typescript
// Approve a conversion
const approve = useApproveConversion();
await approve.mutateAsync(appId);

// Execute conversion
const execute = useExecuteConversion();
const result = await execute.mutateAsync(appId);

// Monitor status
const { data: execution } = useConversionExecutionStatus(appId);

// Rollback if needed
const rollback = useRollbackConversion();
await rollback.mutateAsync({
  conversionId: execution.conversionId,
  checkpointId: execution.checkpoint.checkpointId,
});
```

## File Structure

```
New Files (PR7):
├── src/ipc/types/conversion-execution.ts
├── src/main/conversion_executor.ts
├── src/main/conversion_workspace.ts
├── src/ipc/utils/conversion_checkpoint.ts
├── src/ipc/handlers/conversion_execution_handlers.ts
├── src/hooks/useConversionExecution.ts
└── e2e-tests/conversion_execution_workflow.spec.ts

Modified Files (PR7):
├── src/ipc/ipc_host.ts
├── src/ipc/preload/channels.ts
└── src/ipc/types/index.ts
```

## Testing

### E2E Tests

Run conversion execution workflow:

```bash
PLAYWRIGHT_HTML_OPEN=never npm run e2e -- conversion_execution_workflow.spec.ts
```

Tests cover:

- Approval boundary enforcement
- Execution with checkpoint creation
- Rollback to pre-conversion state
- Git state preservation

### Manual Testing

1. Create/import an app
2. Analyze it (PR5)
3. Configure FeltDB (PR6)
4. View conversion plan
5. Approve conversion
6. Execute conversion
7. Verify checkpoint and workspace
8. Test rollback

## Next Steps

1. **UI Components** - Build approval confirmation and progress tracking
2. **Data Migration** - Implement actual data transformation logic
3. **Validation** - Add post-conversion verification
4. **Monitoring** - Add execution metrics and diagnostics
5. **Production Ready** - OAuth integration, error recovery, retry logic

## Error Handling

### Approval Errors

- Plan not in PENDING_APPROVAL state
- Plan not found
- App not found

### Execution Errors

- Plan not APPROVED
- FeltDB runtime not healthy
- Git errors during checkpoint
- Workspace initialization failure

### Rollback Errors

- Checkpoint not found
- Git checkout failure
- Invalid checkpoint ID
- Execution record not found

All errors include descriptive messages and are logged for audit trails.

## Architecture Principles

1. **No Duplicate Infrastructure** - Reuses existing Git, IPC, and credential systems
2. **Type Safety** - All operations have Zod schemas and full TypeScript coverage
3. **Error Clarity** - Descriptive error messages for troubleshooting
4. **Audit Trail** - All execution logged to `.feltdb/conversion/logs/`
5. **Recovery** - Git checkpoints enable full rollback capability
6. **Isolation** - Per-project workspaces prevent cross-app interference
