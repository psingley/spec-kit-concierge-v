# Feature Specification: Send to JIRA from Review

**Feature Branch**: `017-send-jira-button`

**Created**: 2026-06-02

**Status**: Draft

**Input**: User description: "Add a working 'Send to JIRA' button to the Review step so a user can create a Jira issue hierarchy from the feature's spec.md and tasks.md."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Preview the Jira hierarchy before creation (Priority: P1)

As a signed-in user on the Review step, I want to preview the Jira hierarchy that will be created from the current feature so I can confirm the submission before any tickets are filed.

**Why this priority**: The dry-run preview and explicit confirmation are the core safety gate for JIRA Submission. Without them, users cannot trust what the app is about to create.

**Independent Test**: Open the Review step for a feature that has both `spec.md` and `tasks.md`, click **Send to JIRA**, and confirm that a preview modal shows the full planned Epic, Phase Stories, and Task Subtasks before any Jira issue is created.

**Acceptance Scenarios**:

1. **Given** Atlassian sign-in is valid and the feature has a `tasks.md` artifact, **When** the user opens the Review step, **Then** the Review step offers a **Send to JIRA** action.
2. **Given** an eligible feature, **When** the user clicks **Send to JIRA**, **Then** the app shows a preview modal with the exact Epic, Phase Stories, and Task Subtasks it plans to create, including parent relationships and any already-exists or thin-body warnings.
3. **Given** the preview modal is open, **When** the user closes or cancels it without confirming, **Then** no Jira issues are created.

---

### User Story 2 - Create the hierarchy in one guided flow (Priority: P2)

As a user who confirms the preview, I want the app to create the Jira hierarchy one item at a time and show progress as it goes so I can see what succeeded, what failed, and what issue keys were created.

**Why this priority**: Filing the hierarchy is the main outcome of the feature. Users need visibility into progress and results while the guided flow is running.

**Independent Test**: Confirm the preview for a feature with multiple phases and tasks, then observe the flow create the Epic, Phase Stories, and Task Subtasks sequentially while displaying progress and created issue keys.

**Acceptance Scenarios**:

1. **Given** the preview has been confirmed, **When** submission starts, **Then** the app creates planned Jira items in a deterministic parent-first order and displays in-progress, succeeded, and halted states as each item is processed.
2. **Given** a Jira item is created or adopted successfully, **When** the app advances to the next planned item, **Then** the user can see the created issue key and destination link for the completed item.
3. **Given** submission halts before the hierarchy is complete, **When** the flow stops, **Then** the user can see which items were created, which item failed or halted, and which items remain uncreated.

---

### User Story 3 - Resume safely after interruption or partial failure (Priority: P3)

As a user whose Jira submission was interrupted or only partially completed, I want to rerun the flow without creating duplicate tickets so I can finish the hierarchy safely.

**Why this priority**: JIRA Submission is the terminal Review-step action. Users need confidence that interruptions, relaunches, or partial failures do not force manual cleanup.

**Independent Test**: Interrupt a submission after some Jira items have been verified, relaunch or rerun the flow, and confirm that already-created items are skipped while only the remaining items are processed.

**Acceptance Scenarios**:

1. **Given** some planned Jira items already have verified or duplicate submission records, **When** the user reruns submission, **Then** the app skips those items and continues with only the remaining work.
2. **Given** an earlier attempt created a Jira issue but local progress was interrupted, **When** submission resumes, **Then** the app adopts the existing matching issue instead of creating a duplicate.
3. **Given** submission restarts after the app was closed mid-run, **When** the user returns to the Review step, **Then** the app can show prior results and continue from persisted submission state.

### Edge Cases

- Atlassian sign-in becomes unavailable after the Review step is opened but before the user confirms submission.
- The feature has `spec.md` but no `tasks.md`, so JIRA Submission cannot start.
- The preview detects that one or more planned Jira items already exist or have thin descriptions and must warn the user before confirmation.
- A parent issue is created successfully but a later child issue fails, leaving the hierarchy only partially created.
- The app closes or crashes after a Jira issue is created but before the flow finishes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide **Send to JIRA** as the terminal Review-step action for a feature when Atlassian sign-in is valid and a `tasks.md` artifact exists for that feature.
- **FR-002**: The system MUST keep JIRA Submission unavailable until both prerequisites are true: Atlassian sign-in is valid and the feature has a `tasks.md` artifact.
- **FR-003**: Activating **Send to JIRA** MUST open a dry-run preview before any Jira issue is created.
- **FR-004**: The dry-run preview MUST show the exact hierarchy the system plans to create: one Epic, the Phase Stories under that Epic, and the Task Subtasks under their parent Phase Story.
- **FR-005**: The dry-run preview MUST surface parent relationships and any already-exists or thin-body warnings for planned Jira items.
- **FR-006**: The system MUST require explicit user confirmation from the preview before the first Jira create action is attempted.
- **FR-007**: After confirmation, the system MUST create Jira items in deterministic parent-first order so no child is created before the parent it depends on.
- **FR-005a**: The dry-run preview MUST flag a planned Jira item as thin-body when its deterministic description is under 240 characters or lacks any required section for that issue type.
- **FR-008**: The system MUST render ticket summaries and descriptions deterministically from the feature's `spec.md` and `tasks.md`. Epic descriptions include feature summary, user stories, functional requirements, and success criteria. Phase Story descriptions include the source phase/story heading, goal or independent test when present, and child task summary. Task Subtask descriptions include task ID, task text, referenced source file paths, and parent relationship; if a task has no file path context, the description records `File context: not available`.
- **FR-009**: Every Jira create action MUST be performed through a single bounded Bound CLI turn delegated to the customized concierge-jira extension-agent contract from a Concierge-supplied payload, and the Concierge App MUST make no direct Atlassian calls.
- **FR-010**: After each Jira create attempt, the system MUST read that item's persisted submission record and advance only when the record shows a verified or duplicate outcome, a matching payload hash, and a fetchable issue key.
- **FR-011**: The system MUST preserve the intended hierarchy in Jira, including native Task Subtask under Phase Story parenting.
- **FR-012**: The system MUST assign each planned Jira item one canonical idempotency label in the format `<project_key>-idem-<hash12>`.
- **FR-013**: The system MUST use persisted submission records and canonical idempotency labels to adopt existing matching Jira items during resume or orphan recovery instead of creating duplicates.
- **FR-014**: The system MUST show submission progress and per-item outcomes while the guided flow is running.
- **FR-015**: If submission stops before completion, the system MUST show which Jira items succeeded, which failed or halted, and which remain uncreated.
- **FR-016**: Re-running a partial or interrupted submission MUST skip Jira items already verified or adopted as duplicates and continue with only the remaining planned items.
- **FR-017**: The preview and submission-progress experiences MUST use the app's standard overlay modal experience.
- **FR-018**: When submission completes or halts, the system MUST surface the created or adopted Jira issue keys and destination links for all completed items.
- **FR-019**: Version 1 of this feature MUST be create-only and MUST NOT update Jira issue status, sync task completion back to Jira, or add status-sync controls to the Review step.

### Key Entities *(include if feature involves data)*

- **JIRA Submission Preview**: The dry-run representation of the Jira hierarchy the app plans to create, including the Epic, Phase Stories, Task Subtasks, parent relationships, and warnings the user must review before confirming.
- **Submission Node**: One planned Jira item in the hierarchy, including its level in the hierarchy, summary, description, parent relationship, and idempotency label.
- **Submission Record**: The persisted evidence for one submission node, including the attempted payload identity, current verification outcome, and any fetchable Jira issue key used for resume or duplicate adoption.
- **Submission Run**: One user-confirmed attempt to create the Jira hierarchy, including overall progress and the visible outcomes for completed, failed, halted, and remaining nodes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In acceptance testing, 100% of eligible Review-step sessions show a **Send to JIRA** action and 0 ineligible sessions allow submission to start.
- **SC-002**: In preview testing, 100% of submission attempts show the full planned hierarchy and require an explicit confirm action before any Jira issue is created.
- **SC-003**: In cancellation testing, 0 Jira issues are created when the user closes or cancels the preview without confirming.
- **SC-004**: In representative hierarchy-creation tests, 100% of created Task Subtasks appear under the intended Phase Story and 100% of completed items expose their issue key to the user.
- **SC-005**: In interruption and rerun tests, 0 duplicate Jira issues are created for nodes already verified or adopted from matching existing issues.
- **SC-006**: Submission audit evidence shows that 100% of Jira create actions flow through the Bound CLI and 0 direct Concierge-App-to-Atlassian calls occur.
- **SC-007**: In version 1 acceptance testing, 0 Jira status-sync actions are available from the Review step.

## Assumptions

- The feature's `spec.md` and `tasks.md` artifacts already exist before the user reaches the Review step.
- Existing Atlassian sign-in status and project configuration are reused as-is for this feature.
- The Review step remains the terminal human-driven step in the workflow.
- Existing submission protocol pieces already available in the project remain authoritative for dry-run preflight, hierarchy parsing, persisted submission records, idempotency labels, orphan recovery, and verification.
- Version 1 scope ends with creating the Jira hierarchy and reporting the result; downstream status synchronization is intentionally out of scope.
- The retired per-ticket `file-ticket` LLM filer remains out of scope; the customized per-node Bound CLI contract is limited to one `createJiraIssue` MCP call from an app-rendered payload plus a disk state record write.
