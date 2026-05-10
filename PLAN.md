# Lists — UI Redesign & Bug Fix Plan

## Critical (breaks usability)

- **Fix the click handler crash on empty container area.**
  `listContainer.addEventListener('click', ...)` calls `e.target.closest('li').dataset.index` without checking whether `.closest('li')` returned null. Clicking the whitespace below the last item throws a TypeError and stops all subsequent click handling until the page reloads. Guard every `closest('li')` call with a null check: `const li = e.target.closest('li'); if (!li) return;`

- **`populateListSelect` shadows the module-level `lists` variable.**
  Inside `populateListSelect`, `const lists = JSON.parse(localStorage.getItem('lists')) || []` creates a *local* variable that shadows the outer `lists` object. This is harmless most of the time but creates subtle ordering bugs: if `saveList` mutates the outer `lists` object and calls `renderLists` before writing to localStorage, the dropdown may briefly show stale data. Delete the local declaration and use the outer `lists` directly.

- **`moveItem` re-checks button visibility on DOM elements that were just destroyed.**
  `loadListItems` replaces the entire `listContainer` innerHTML. The `moveButtonsVisible` check on line 285 queries `.move-up-btn` from the *new* DOM, where buttons are always hidden by default — so reorder mode always turns off after every button-press move. The fix: track reorder-mode state in a boolean variable rather than reading it from the DOM.

- **Drag-and-drop is broken on all iOS devices.**
  iOS Safari and Chrome on iPhone/iPad do not fire the HTML5 `dragstart`/`drop` event sequence on non-image, non-link elements. Every user on an iPhone has a non-functional reorder feature. The button-move path (up/down arrows) works, but only if the reorder-mode bug above is fixed first. Consider this the workaround for mobile until a proper touch-based drag (using `touchstart`/`touchmove`/`touchend`) can be implemented.

- **`updateListOrder` reads item text from the DOM and loses in-flight edits.**
  When a drag-drop completes, `updateListOrder` scrapes `.editable` textContent from the DOM to rebuild the items array. If any item is currently in edit mode (the span has been replaced by an `<input>`), that item's `.editable` span is gone and its text becomes an empty string in storage. Fix by reading from localStorage (the source of truth) and reordering the array by index rather than re-scraping the DOM.

---

## High Priority (materially hurts the mobile experience)

- **Remove the fixed `height: 40px` on list items.**
  `height: 40px` clips any item whose text wraps to a second line — the text overflows the row invisibly. Replace with `min-height: 44px` (no additional padding) so single-line items remain compact and many items stay on screen, while wrapped items expand naturally. 44px also satisfies Apple's minimum recommended tap-target height, which the current 40px does not. Item density is a priority — do not add vertical padding that inflates single-line items.

- **Header buttons are too small for reliable mobile tapping.**
  `padding: 10px 15px` on the action buttons (add, edit, trash, reorder, settings) produces tap targets under 44px tall. Set `min-width: 44px; min-height: 44px` on all header buttons. The current layout already uses flexbox on `.header`, so this will not break the row — it will just give each button sufficient touch area.

- **No visual indication that delete or reorder mode is active.**
  After pressing the trash or reorder button, there is zero UI feedback that a mode is on. The user has no mental model of the current app state. Add an `.active` class to the toggled button that inverts its colors (e.g., white icon on blue background) — a single CSS rule per button. Activating one mode should also deactivate the other (they conflict in the item row layout).

- **Remove `window.confirm()` from individual item deletes; replace with inline confirmation only for bulk actions.**
  Native confirm dialogs block the JS thread, cannot be styled, and on iOS sometimes appear at the wrong Z-level relative to the PWA chrome. For *individual item deletes*, simply remove the `confirm()` call — the user already made two deliberate gestures (toggle delete mode, tap the trash button) which is sufficient intent. Adding a third tap makes deletion laborious. For *bulk actions* (Clear all, Clear completed), replace `window.confirm()` with a two-step inline pattern: first press shifts the button to a "Confirm?" state (red fill, text label) for 3 seconds; a second press executes. Bulk clears are high-stakes enough to warrant one extra tap.

- **Show an empty state when a list has no items.**
  A blank `listContainer` looks like a broken page. When `items.length === 0`, render a centered message in the list area: something like "Nothing here. Add an item below." in muted text. This also signals to new users how the app works.

- **Popups have no backdrop and do not close on outside click.**
  The edit-list and settings popups float over the page with no dim overlay behind them. The page beneath remains fully interactive, which is confusing. Add a full-screen semi-transparent `<div id="overlay">` that appears behind any open popup and closes the popup on click. Also add `keydown` Escape handling to close the active popup.

- **Active list color is invisible in the header.**
  When switching between a red list and a blue list, the header looks identical. Apply the active list's color as a 3px bottom border on the header (or as the background of the `<select>`) so there is immediate visual feedback when switching lists. Update it on every `selectList` call.

---

## Medium Priority (polish and feel)

- **Switch to a system font stack.**
  `font-family: Arial` is a generic fallback. Replace with `font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` to render the platform's native UI font (SF Pro on iOS, Roboto on Android). Zero download cost, immediately feels more native.

- **Make the list color visible in the selector.**
  `<option>` `background-color` is ignored by Chrome on Android and all iOS browsers — the selected list displays with no color identity. Wrap `#listSelect` in a flex container and add a colored `<span>` swatch that updates via JavaScript when the selection changes. This gives color meaning back to lists without relying on broken CSS `option` styling.

- **Edit mode is not discoverable.**
  Tapping item text opens an inline edit input, but there is no visual affordance that this is possible. New users never discover it. Keep tap-to-edit as the primary gesture — it is the most efficient path to editing and must not change. Improve discoverability through visual cues only: set `cursor: text` on `.editable` on desktop, and show a faint `fa-pencil` icon on the trailing edge of the item *on hover only* (never persistently, to keep item rows clean). Do not replace tap-to-edit with long-press — long-press conflicts with scrolling on mobile and adds friction to an action that should be instant.

- **Clean up ~40 lines of commented-out CSS.**
  `styles.css` contains several large commented-out rule blocks: the `#listSelect` normalize attempt (lines 31–44), a duplicate `input[type="checkbox"]` block, the `.list-item span` block, and the `.list-item.completed span` block. These are dead code that add visual noise when reading the file. Delete them.

- **Add a `smooth` transition to item check state.**
  The check/strikethrough state change is instantaneous. Add `transition: color 0.15s ease, opacity 0.15s ease` to `.editable` so the text fades to muted gray when checked. This single line makes the interaction feel tactile without adding complexity.

- **Add `padding: env(safe-area-inset-bottom)` to the add-item container.**
  On iPhone X and later, the home indicator bar sits over content at the very bottom of the viewport. The `.add-item-container` has no bottom padding, so the input and add button are partially occluded on these devices. Add `padding-bottom: max(10px, env(safe-area-inset-bottom))`.

- **Settings popup needs a third action: "Sort completed to bottom."**
  Users naturally want to push finished items down without deleting them. "Sort completed to bottom" fits naturally alongside "Clear completed" and requires only a sort-in-place on the items array. This small addition makes the settings panel actually useful as a management panel rather than a delete-only panel.

---

## Low Priority (quality of life)

- **Show a completion count badge on the list.**
  A small "3 / 7" counter tells the user how much is done at a glance. Place it in the header row (e.g., next to or inside the list selector) — never in a dedicated row above the list, which would permanently consume one visible item slot. Update it on every render. Use muted text so it doesn't compete with item content.

- **Add `<meta name="theme-color">` that tracks the active list.**
  When the app is installed as a PWA, the browser chrome uses the static `#000000` from the webmanifest regardless of which list is active. Update the `theme-color` meta tag dynamically on `selectList`: `document.querySelector('meta[name="theme-color"]').setAttribute('content', lists[listKey].color)`. This is a one-liner that gives the installed PWA a genuinely dynamic feel.

- **Escape key should close the active popup.**
  Currently only the × button closes a popup. `document.addEventListener('keydown', e => { if (e.key === 'Escape') hideActivePopup(); })` is a one-liner addition that meets user expectations for modal dialogs.

- **Add export/import to the settings panel.**
  An "Export JSON" button that downloads the entire `localStorage` state as a `.json` file, and an "Import JSON" file picker that restores it, gives users a simple backup/restore path without cloud sync. This is particularly valuable as a PWA where clearing browser data deletes all lists permanently.

- **Replace `font-awesome` arrows-alt icon on the reorder button.**
  `fa-arrows-alt` (four-directional arrows) is semantically ambiguous — it suggests panning or moving the whole view, not reordering a list. Use `fa-sort` (up/down sort arrows) instead, which communicates the intent clearly.
