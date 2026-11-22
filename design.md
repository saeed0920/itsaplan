# Plan UI extensions

## Fork color palettes

Puzzley uses the site's `#155dfc` blue on white content and mist-blue navigation. Choosing
Puzzley selects light mode; the theme picker can still switch it to dark. Charbug uses the
resolver's charcoal surfaces and `#93c5fd` accent in dark mode. Its light mode pairs warm-gray
surfaces and charcoal text with a deep-blue action color and soft-blue selection.
Both use the existing account palette picker, theme mode,
semantic colors, and focus states. Keep the default palette and layout unchanged. Verify
light and dark rendering, text contrast and palette persistence after reload.

## Search and calendar issue details

Search results show status, cycle and due date below the title, omitting unset values.
Calendar month, week, day and unscheduled cards show identifier, full title and the same
metadata in the existing tooltip on hover or keyboard focus. Keep click-to-open, context
menus and drag scheduling. Hide previews while dragging. Reuse current fonts, semantic
colors, spacing, calendar-aware dates and responsive breakpoints. User text uses automatic
direction; identifiers stay LTR. No extra per-result requests or new dependencies.
Verify populated/empty metadata, long titles, keyboard selection, focus/Escape, dragging,
mobile width and Persian RTL. Touch users open the existing issue detail.

## Named issue archives

Add a fixed Archive tab beside All and saved views, visible on mobile too. Reuse existing tab styling, cards, modal inputs, select controls and ListPager. Project members with work-item edit permission create/rename collections and manually archive or restore any status. Search and collection filters reset paging; existing and automatic archives use Unfiled. Archived cards open issue details and expose Restore and Move actions without draggable board behavior. Preserve subtasks confirmation, loading/error/empty states, translated labels, keyboard access and logical RTL spacing. Keep current fonts, semantic colors, spacing and breakpoints. Verify create/rename, single/bulk moves, cross-project refusal, restore, archived count, mobile and Persian RTL. No automatic monthly rules or deletion of collections in this scope.

## Calendar preferences

Reuse existing account preference rows, workspace settings sections and shadcn selects. Personal calendar selection is independent of interface language; workspace managers choose Saturday, Sunday or Monday as week start. Existing explicit calendar-view choices stay selectable, with a workspace-default option. Keep typography, semantic colors, spacing and responsive breakpoints unchanged. New labels use logical RTL alignment, accessible names and existing pending/success/error feedback. Compose generated calendar through DateCalendar; do not edit generated primitives. Verify Persian RTL and English desktop/mobile, keyboard month navigation, Nowruz, Esfand leap years and unchanged ISO dates.

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
