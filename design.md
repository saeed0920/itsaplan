# Plan UI extensions

## Multiple issue assignees

Existing issue editor, create dialog, table and timeline use searchable member multi-selection with checkmarks; selected members remain visible after each toggle. Reuse PopoverPick, Avatar, Pill and translations. Escape closes picker, keyboard search/Enter toggles. Read-only shares show values only; reduced shares hide all assignees. Keep existing tokens, typography, responsive breakpoints and logical RTL spacing. No redesign or new dependency.

First selected member remains primary for legacy single-assignee automation, templates, analytics and board grouping. All selected members match assignment filters/My Work and receive existing assignment notifications. Empty selection clears assignments. Test create/edit/reload/clear, legacy compatibility, desktop/mobile/Persian RTL and failed writes. Show multiple avatars on cards and table/timeline cells without horizontal overflow.

## Workspace creation UI

Extension of [DESIGN.md](DESIGN.md), not a visual redesign. Audience: existing Plan workspace owners. Reuse current Inter typography, semantic grayscale colors, 8px spacing, focus rings and existing responsive/RTL layout.

- Keep tile and row variants of the workspace rail action; replace edition notice with real creation.
- Show creation only when authenticated capability endpoint permits it. Preserve personal-workspace policy and bot restrictions.
- Reuse shared Modal, Label, Input, Button; one workspace-name field, 60-character maximum, reject whitespace-only names. No new dependency, color, animation or layout system.
- Keyboard: labeled field, initial focus, Enter submits, Escape/close cancels except while saving. Reuse modal focus trap/return and reduced-motion behavior.
- Pending: prevent duplicate submission. Failure: existing mutation error toast; keep dialog/name. Success: existing success toast, refresh workspace list, navigate to created workspace.
- Verify desktop/mobile and Persian RTL; no overflow, accessible button labels, visible focus, pending/error states. Existing app breakpoints and Modal sizing remain unchanged.
