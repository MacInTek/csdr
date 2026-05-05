/**
 * darkMode.js
 * Shared dark-mode CSS injected into every Shadow DOM component.
 * Uses :host-context(body.dark-mode) to pierce the shadow boundary.
 */

export const darkModeCSS = `

/* ═══════════════════════════════════════════════════════════
   HOST BACKGROUND
═══════════════════════════════════════════════════════════ */
:host-context(body.dark-mode):host {
  background: #1a1a1a !important;
  color: #e0e0e0 !important;
}

/* ═══════════════════════════════════════════════════════════
   CARDS & PANELS
═══════════════════════════════════════════════════════════ */
:host-context(body.dark-mode) .card,
:host-context(body.dark-mode) .modal-content,
:host-context(body.dark-mode) .notify-box,
:host-context(body.dark-mode) .loading-box,
:host-context(body.dark-mode) .details-modal-content,
:host-context(body.dark-mode) .map-modal-content,
:host-context(body.dark-mode) .setup-card,
:host-context(body.dark-mode) .profile-card,
:host-context(body.dark-mode) .approval-card,
:host-context(body.dark-mode) .cabinet-card,
:host-context(body.dark-mode) .dashboard-card,
:host-context(body.dark-mode) .stat-card {
  background: #1e1e1e !important;
  color: #e0e0e0 !important;
  box-shadow: 0 4px 20px rgba(0,0,0,0.5) !important;
}

:host-context(body.dark-mode) .user-card {
  background: #242424 !important;
  color: #e0e0e0 !important;
  box-shadow: 0 2px 10px rgba(0,0,0,0.4) !important;
}

/* Party sections */
:host-context(body.dark-mode) .party-section {
  background: #242424 !important;
  border-color: #3a3a3a !important;
}
:host-context(body.dark-mode) .party-section.active {
  background: #1a2e22 !important;
  border-color: #0c6d38 !important;
}
:host-context(body.dark-mode) .party-section:hover {
  border-color: #0c6d38 !important;
}
:host-context(body.dark-mode) .party-header {
  border-bottom-color: #3a3a3a !important;
}

/* ═══════════════════════════════════════════════════════════
   ALL PLAIN TEXT ELEMENTS
═══════════════════════════════════════════════════════════ */
:host-context(body.dark-mode) p,
:host-context(body.dark-mode) span:not(.Pending):not(.Resolved):not(.Closed):not(.status):not(.badge):not(.role-admin-badge):not(.role-personnel-badge):not(.admin-badge),
:host-context(body.dark-mode) div:not(.Pending):not(.Resolved):not(.Closed),
:host-context(body.dark-mode) li,
:host-context(body.dark-mode) strong,
:host-context(body.dark-mode) em,
:host-context(body.dark-mode) small {
  color: #d0d0d0 !important;
}

/* Headings */
:host-context(body.dark-mode) h1,
:host-context(body.dark-mode) h2,
:host-context(body.dark-mode) h3,
:host-context(body.dark-mode) h4,
:host-context(body.dark-mode) h5 {
  color: #e0e0e0 !important;
}
/* Brand-green h2 → lighter green for dark bg */
:host-context(body.dark-mode) h2 {
  color: #4ade80 !important;
}
:host-context(body.dark-mode) .modal-title {
  color: #4ade80 !important;
}
:host-context(body.dark-mode) .details-modal-header h2 {
  color: #4ade80 !important;
}

/* Labels */
:host-context(body.dark-mode) label {
  color: #c0c0c0 !important;
}

/* Table cells */
:host-context(body.dark-mode) td {
  color: #d0d0d0 !important;
  border-top-color: #2e2e2e !important;
  border-bottom-color: #2e2e2e !important;
}
:host-context(body.dark-mode) th {
  color: #e0e0e0 !important;
}

/* ═══════════════════════════════════════════════════════════
   INPUTS / TEXTAREAS / SELECTS
═══════════════════════════════════════════════════════════ */
:host-context(body.dark-mode) input:not([type="radio"]):not([type="checkbox"]):not([type="file"]),
:host-context(body.dark-mode) textarea,
:host-context(body.dark-mode) select,
:host-context(body.dark-mode) .party-name-input,
:host-context(body.dark-mode) .search-input {
  background: #2a2a2a !important;
  color: #e0e0e0 !important;
  border-color: #3a3a3a !important;
}
:host-context(body.dark-mode) input::placeholder,
:host-context(body.dark-mode) textarea::placeholder {
  color: #666 !important;
}
:host-context(body.dark-mode) input:focus,
:host-context(body.dark-mode) textarea:focus,
:host-context(body.dark-mode) select:focus {
  border-color: #0c6d38 !important;
  box-shadow: 0 0 0 2px rgba(12,109,56,0.25) !important;
}
:host-context(body.dark-mode) input:disabled,
:host-context(body.dark-mode) select:disabled,
:host-context(body.dark-mode) textarea:disabled {
  background: #222 !important;
  color: #555 !important;
  border-color: #2e2e2e !important;
}

/* ═══════════════════════════════════════════════════════════
   TABLE
═══════════════════════════════════════════════════════════ */
:host-context(body.dark-mode) table {
  background: #1e1e1e !important;
}
:host-context(body.dark-mode) thead tr,
:host-context(body.dark-mode) thead th {
  background: #0a3d20 !important;
  color: #e0e0e0 !important;
  border-color: #0a3d20 !important;
}
:host-context(body.dark-mode) tbody tr {
  background: #1e1e1e !important;
}
:host-context(body.dark-mode) tbody tr:hover,
:host-context(body.dark-mode) tbody tr:hover td {
  background: #2a2a2a !important;
}

/* ═══════════════════════════════════════════════════════════
   CASE DETAILS MODAL (double-click)
═══════════════════════════════════════════════════════════ */
:host-context(body.dark-mode) .details-modal-content {
  background: #1e1e1e !important;
}
:host-context(body.dark-mode) .details-modal-header {
  border-bottom-color: #3a3a3a !important;
}
:host-context(body.dark-mode) .details-modal-close {
  color: #aaa !important;
  background: transparent !important;
}
:host-context(body.dark-mode) .details-modal-close:hover {
  background: #2e2e2e !important;
  color: #e0e0e0 !important;
}
:host-context(body.dark-mode) .detail-label {
  color: #888 !important;
}
:host-context(body.dark-mode) .detail-value {
  color: #d0d0d0 !important;
}

/* ═══════════════════════════════════════════════════════════
   MODALS
═══════════════════════════════════════════════════════════ */
:host-context(body.dark-mode) .modal-content {
  background: #1e1e1e !important;
}
:host-context(body.dark-mode) .modal-header {
  border-bottom-color: #3a3a3a !important;
}
:host-context(body.dark-mode) .modal-close,
:host-context(body.dark-mode) .close,
:host-context(body.dark-mode) .close-btn {
  color: #aaa !important;
  background: transparent !important;
}
:host-context(body.dark-mode) .close.cancel-btn {
  background: #2a2a2a !important;
  color: #c0c0c0 !important;
  border-color: #3a3a3a !important;
}
:host-context(body.dark-mode) .close.cancel-btn:hover {
  background: #333 !important;
  color: #e0e0e0 !important;
}
:host-context(body.dark-mode) .modal-body label {
  color: #c0c0c0 !important;
}
:host-context(body.dark-mode) .modal-body input {
  background: #2a2a2a !important;
  color: #e0e0e0 !important;
  border-color: #3a3a3a !important;
}
:host-context(body.dark-mode) .notify-box .msg {
  color: #e0e0e0 !important;
}
:host-context(body.dark-mode) .loading-text {
  color: #e0e0e0 !important;
}
:host-context(body.dark-mode) .cancel-btn {
  background: #2a2a2a !important;
  color: #c0c0c0 !important;
}

/* ═══════════════════════════════════════════════════════════
   USER CARDS (adminUserManage)
═══════════════════════════════════════════════════════════ */
:host-context(body.dark-mode) .user-name {
  color: #e0e0e0 !important;
}
:host-context(body.dark-mode) .user-email {
  color: #888 !important;
}
:host-context(body.dark-mode) .user-position {
  color: #4ade80 !important;
}
:host-context(body.dark-mode) .user-joined {
  color: #666 !important;
}
:host-context(body.dark-mode) .avatar {
  background: #1a3a28 !important;
  color: #4ade80 !important;
}
:host-context(body.dark-mode) .user-card.role-admin .avatar {
  background: #2a1f4a !important;
  color: #a78bfa !important;
}
:host-context(body.dark-mode) .role-admin-badge {
  background: #2a1f4a !important;
  color: #a78bfa !important;
}
:host-context(body.dark-mode) .role-personnel-badge {
  background: #1a3a28 !important;
  color: #4ade80 !important;
}
:host-context(body.dark-mode) .user-count-pill {
  background: #1a3a28 !important;
  color: #4ade80 !important;
  border-color: #2e6040 !important;
}
:host-context(body.dark-mode) .user-count-pill.active {
  background: #0c6d38 !important;
  color: #fff !important;
}
:host-context(body.dark-mode) .edit-btn {
  background: #1e1e1e !important;
  color: #4ade80 !important;
  border-color: #0c6d38 !important;
}
:host-context(body.dark-mode) .edit-btn:hover {
  background: #0c6d38 !important;
  color: #fff !important;
}

/* ═══════════════════════════════════════════════════════════
   STATUS BADGES
═══════════════════════════════════════════════════════════ */
:host-context(body.dark-mode) .Pending {
  background: #3d2e00 !important;
  color: #fbbf24 !important;
}
:host-context(body.dark-mode) .Resolved {
  background: #0a2e18 !important;
  color: #4ade80 !important;
}
:host-context(body.dark-mode) .Closed {
  background: #2e0a0a !important;
  color: #f87171 !important;
}

/* Status badge inside case details modal (inline-styled span) */
/* Pending — yellow background (#fff3cd) → dark amber */
:host-context(body.dark-mode) .detail-value span[style*="background:#fff3cd"],
:host-context(body.dark-mode) .detail-value span[style*="background: #fff3cd"],
:host-context(body.dark-mode) .modal-body span[style*="background:#fff3cd"],
:host-context(body.dark-mode) .modal-body span[style*="background: #fff3cd"] {
  background: #3d2e00 !important;
  color: #fbbf24 !important;
}
/* Resolved — green background (#d4edda) → dark green */
:host-context(body.dark-mode) .detail-value span[style*="background:#d4edda"],
:host-context(body.dark-mode) .detail-value span[style*="background: #d4edda"],
:host-context(body.dark-mode) .modal-body span[style*="background:#d4edda"],
:host-context(body.dark-mode) .modal-body span[style*="background: #d4edda"] {
  background: #0a2e18 !important;
  color: #4ade80 !important;
}
/* Closed — red background (#f8d7da) → dark red */
:host-context(body.dark-mode) .detail-value span[style*="background:#f8d7da"],
:host-context(body.dark-mode) .detail-value span[style*="background: #f8d7da"],
:host-context(body.dark-mode) .modal-body span[style*="background:#f8d7da"],
:host-context(body.dark-mode) .modal-body span[style*="background: #f8d7da"] {
  background: #2e0a0a !important;
  color: #f87171 !important;
}

/* ═══════════════════════════════════════════════════════════
   FILTER CHIPS & SORT
═══════════════════════════════════════════════════════════ */
:host-context(body.dark-mode) .filter-chip {
  background: #2a2a2a !important;
  color: #c0c0c0 !important;
  border-color: #3a3a3a !important;
}
:host-context(body.dark-mode) .filter-chip:hover {
  background: #1a3a28 !important;
  color: #4ade80 !important;
  border-color: #0c6d38 !important;
}
:host-context(body.dark-mode) .filter-chip.active {
  background: #0c6d38 !important;
  color: #fff !important;
  border-color: #0c6d38 !important;
}
:host-context(body.dark-mode) .sort-label {
  color: #c0c0c0 !important;
}
:host-context(body.dark-mode) .sort-icon-btn {
  background: #2a2a2a !important;
  color: #4ade80 !important;
  border-color: #0c6d38 !important;
}
:host-context(body.dark-mode) .sort-drop-menu {
  background: #1e1e1e !important;
  border-color: #3a3a3a !important;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5) !important;
}
:host-context(body.dark-mode) .sort-drop-opt {
  color: #c0c0c0 !important;
  background: transparent !important;
}
:host-context(body.dark-mode) .sort-drop-opt:hover {
  background: #1a3a28 !important;
  color: #4ade80 !important;
}
:host-context(body.dark-mode) .sort-drop-opt.selected {
  color: #4ade80 !important;
}

/* ═══════════════════════════════════════════════════════════
   SEARCH BAR
═══════════════════════════════════════════════════════════ */
:host-context(body.dark-mode) .search-input {
  background: #2a2a2a !important;
  color: #e0e0e0 !important;
  border-color: #3a3a3a !important;
}
:host-context(body.dark-mode) .search-clear {
  color: #888 !important;
}
:host-context(body.dark-mode) .search-clear:hover {
  color: #e0e0e0 !important;
  background: rgba(255,255,255,0.08) !important;
}
:host-context(body.dark-mode) .search-help {
  color: #777 !important;
}

/* ═══════════════════════════════════════════════════════════
   FILTER BAR
═══════════════════════════════════════════════════════════ */
:host-context(body.dark-mode) .filter-bar input,
:host-context(body.dark-mode) .filter-bar select {
  background: #2a2a2a !important;
  color: #e0e0e0 !important;
  border-color: #3a3a3a !important;
}

/* ═══════════════════════════════════════════════════════════
   PAGINATION
═══════════════════════════════════════════════════════════ */
:host-context(body.dark-mode) .pagination-btn {
  background: #2a2a2a !important;
  color: #c0c0c0 !important;
  border-color: #3a3a3a !important;
}
:host-context(body.dark-mode) .pagination-btn:hover:not(:disabled) {
  background: #0c6d38 !important;
  color: #fff !important;
  border-color: #0c6d38 !important;
}
:host-context(body.dark-mode) .pagination-btn.active {
  background: #0c6d38 !important;
  color: #fff !important;
  border-color: #0c6d38 !important;
}
:host-context(body.dark-mode) .pagination-btn:disabled {
  background: #222 !important;
  color: #444 !important;
}
:host-context(body.dark-mode) .pagination-info,
:host-context(body.dark-mode) #paginationInfo {
  color: #888 !important;
}
:host-context(body.dark-mode) .items-per-page select {
  background: #2a2a2a !important;
  color: #e0e0e0 !important;
  border-color: #3a3a3a !important;
}

/* ═══════════════════════════════════════════════════════════
   ATTACHMENT CHIPS & LINKS
═══════════════════════════════════════════════════════════ */
:host-context(body.dark-mode) .attachment-label {
  background: #1a3a28 !important;
  border-color: #0c6d38 !important;
  color: #4ade80 !important;
}
:host-context(body.dark-mode) .attachment-chip {
  background: #1a3a28 !important;
  border-color: #2e6040 !important;
  color: #4ade80 !important;
}
:host-context(body.dark-mode) .attachment-chip span {
  color: #4ade80 !important;
}
:host-context(body.dark-mode) .attachment-link {
  background: #1a3a28 !important;
  border-color: #2e6040 !important;
  color: #4ade80 !important;
}
:host-context(body.dark-mode) .attach-card {
  background: #242424 !important;
  border-color: #2e6040 !important;
}
:host-context(body.dark-mode) .attach-card:hover {
  background: #1a3a28 !important;
  border-color: #0c6d38 !important;
}
:host-context(body.dark-mode) .attach-card .attach-name {
  color: #d0d0d0 !important;
}
:host-context(body.dark-mode) .attach-card .attach-type {
  color: #888 !important;
}

/* ═══════════════════════════════════════════════════════════
   LOCATION DROPDOWN
═══════════════════════════════════════════════════════════ */
:host-context(body.dark-mode) .location-dropdown {
  background: #1e1e1e !important;
  border-color: #3a3a3a !important;
}
:host-context(body.dark-mode) .loc-opt {
  color: #c0c0c0 !important;
}
:host-context(body.dark-mode) .loc-opt:hover,
:host-context(body.dark-mode) .loc-opt.active {
  background: #1a3a28 !important;
  color: #4ade80 !important;
}
:host-context(body.dark-mode) .loc-empty {
  color: #666 !important;
}

/* ═══════════════════════════════════════════════════════════
   ROLE CHECKBOX GROUPS
═══════════════════════════════════════════════════════════ */
:host-context(body.dark-mode) .role-checkbox-group {
  background: #2a2a2a !important;
  border-color: #3a3a3a !important;
}
:host-context(body.dark-mode) .role-checkbox-group:hover {
  background: #1a3a28 !important;
  border-color: #0c6d38 !important;
}
:host-context(body.dark-mode) .role-checkbox-group label {
  color: #c0c0c0 !important;
}
:host-context(body.dark-mode) .role-checkbox-group input[type="radio"]:checked + label {
  color: #4ade80 !important;
}

/* ═══════════════════════════════════════════════════════════
   INVENTORY
═══════════════════════════════════════════════════════════ */

/* Cabinet card border & background */
:host-context(body.dark-mode) .cabinet-card {
  background: #1e1e1e !important;
  border-color: #3a3a3a !important;
}
:host-context(body.dark-mode) .cabinet-card:hover {
  border-color: #0c6d38 !important;
  box-shadow: 0 6px 20px rgba(12,109,56,0.2) !important;
}

/* Drawer rows */
:host-context(body.dark-mode) .drawer-row {
  background: #252525 !important;
  border-color: #3a3a3a !important;
}
:host-context(body.dark-mode) .drawer-label {
  color: #d0d0d0 !important;
}
:host-context(body.dark-mode) .drawer-count {
  color: #888 !important;
}
:host-context(body.dark-mode) .drawer-count.full {
  color: #f87171 !important;
}

/* Progress bar track */
:host-context(body.dark-mode) .bar-wrap {
  background: #3a3a3a !important;
}

/* Legacy class names */
:host-context(body.dark-mode) .drawer-item {
  background: #252525 !important;
  border-color: #2e2e2e !important;
  color: #d0d0d0 !important;
}
:host-context(body.dark-mode) .drawer-item:hover {
  background: #2e2e2e !important;
}
:host-context(body.dark-mode) .capacity-bar {
  background: #2e2e2e !important;
}

/* View / Rename text buttons */
:host-context(body.dark-mode) .text-btn {
  background: #1a3a28 !important;
  color: #4ade80 !important;
  border-color: #2e6040 !important;
}
:host-context(body.dark-mode) .text-btn:hover {
  background: #0c6d38 !important;
  color: #fff !important;
}

/* Capacity / drawer-count settings row */
:host-context(body.dark-mode) .capacity-row {
  background: #1a2e22 !important;
  border-color: #2e6040 !important;
}
:host-context(body.dark-mode) .capacity-label {
  color: #c0c0c0 !important;
}
:host-context(body.dark-mode) .capacity-hint {
  color: #888 !important;
}
:host-context(body.dark-mode) .capacity-input {
  background: #2a2a2a !important;
  color: #e0e0e0 !important;
  border-color: #3a3a3a !important;
}
:host-context(body.dark-mode) .reset-cap-btn {
  background: #2a2a2a !important;
  color: #c0c0c0 !important;
}
:host-context(body.dark-mode) .reset-cap-btn:hover {
  background: #333 !important;
  color: #e0e0e0 !important;
}

/* Subtitle / hint text */
:host-context(body.dark-mode) .subtitle {
  color: #888 !important;
}
:host-context(body.dark-mode) .hint {
  color: #666 !important;
}
:host-context(body.dark-mode) .empty-msg {
  color: #666 !important;
}
:host-context(body.dark-mode) .modal-count {
  color: #888 !important;
}
:host-context(body.dark-mode) .search-result-count {
  color: #888 !important;
}

/* Drawer modal (inventory) */
:host-context(body.dark-mode) .drawer-modal-content {
  background: #1e1e1e !important;
  box-shadow: 0 20px 60px rgba(0,0,0,0.6) !important;
}
:host-context(body.dark-mode) .drawer-modal-header {
  border-bottom-color: #3a3a3a !important;
}
:host-context(body.dark-mode) .drawer-modal-header h3 {
  color: #4ade80 !important;
}
:host-context(body.dark-mode) .modal-close-btn {
  color: #aaa !important;
  background: transparent !important;
}
:host-context(body.dark-mode) .modal-close-btn:hover {
  background: #2e2e2e !important;
  color: #e0e0e0 !important;
}

/* Rename modal (adminInventory) */
:host-context(body.dark-mode) .rename-modal-content,
:host-context(body.dark-mode) .drawer-rename-modal-content {
  background: #1e1e1e !important;
  box-shadow: 0 20px 60px rgba(0,0,0,0.6) !important;
}
:host-context(body.dark-mode) .rename-modal-header,
:host-context(body.dark-mode) .drawer-rename-modal-header {
  border-bottom-color: #3a3a3a !important;
}
:host-context(body.dark-mode) .rename-modal-header h3,
:host-context(body.dark-mode) .drawer-rename-modal-header h3 {
  color: #4ade80 !important;
}
:host-context(body.dark-mode) .rename-modal-body label,
:host-context(body.dark-mode) .drawer-rename-modal-body label {
  color: #c0c0c0 !important;
}
:host-context(body.dark-mode) .rename-modal-body input,
:host-context(body.dark-mode) .drawer-rename-modal-body input {
  background: #2a2a2a !important;
  color: #e0e0e0 !important;
  border-color: #3a3a3a !important;
}

/* Notify modal */
:host-context(body.dark-mode) .notify-box {
  background: #1e1e1e !important;
  border-left-color: #0c6d38 !important;
}
:host-context(body.dark-mode) .notify-box p {
  color: #e0e0e0 !important;
}

/* Cases table inside drawer modal */
:host-context(body.dark-mode) .cases-table {
  background: #1e1e1e !important;
}
:host-context(body.dark-mode) .cases-table th {
  background: #0a3d20 !important;
  color: #e0e0e0 !important;
}
:host-context(body.dark-mode) .cases-table td {
  color: #d0d0d0 !important;
  border-bottom-color: #2e2e2e !important;
}
:host-context(body.dark-mode) .cases-table tbody tr:hover td {
  background: #252525 !important;
}

/* Drawer case search input (personnelInventory modal) */
:host-context(body.dark-mode) .drawer-search-input {
  background: #2a2a2a !important;
  color: #e0e0e0 !important;
  border-color: #3a3a3a !important;
}
:host-context(body.dark-mode) .drawer-search-input::placeholder {
  color: #666 !important;
}
:host-context(body.dark-mode) .drawer-search-icon {
  color: #888 !important;
}

/* Highlight mark (search match) */
:host-context(body.dark-mode) mark {
  background: #3d3200 !important;
  color: #fbbf24 !important;
}

/* ═══════════════════════════════════════════════════════════
   DASHBOARD
═══════════════════════════════════════════════════════════ */
:host-context(body.dark-mode) .stat-number,
:host-context(body.dark-mode) .stat-value {
  color: #4ade80 !important;
}
:host-context(body.dark-mode) .stat-label {
  color: #888 !important;
}
:host-context(body.dark-mode) .welcome-section h1 {
  color: #e0e0e0 !important;
}
:host-context(body.dark-mode) .welcome-section p {
  color: #888 !important;
}

/* ═══════════════════════════════════════════════════════════
   PROFILE / SETUP
═══════════════════════════════════════════════════════════ */
:host-context(body.dark-mode) .upload-area,
:host-context(body.dark-mode) .photo-upload-area {
  background: #2a2a2a !important;
  border-color: #3a3a3a !important;
  color: #888 !important;
}
:host-context(body.dark-mode) .upload-text {
  color: #888 !important;
}

/* ═══════════════════════════════════════════════════════════
   HR / DIVIDERS
═══════════════════════════════════════════════════════════ */
:host-context(body.dark-mode) hr {
  border-color: #2e2e2e !important;
}

/* ═══════════════════════════════════════════════════════════
   ZOOM CONTROLS
═══════════════════════════════════════════════════════════ */
:host-context(body.dark-mode) .zoom-controls button {
  background: #2a2a2a !important;
  color: #c0c0c0 !important;
  border-color: #3a3a3a !important;
}
:host-context(body.dark-mode) .zoom-controls button:hover {
  background: #0c6d38 !important;
  color: #fff !important;
}

/* ═══════════════════════════════════════════════════════════
   MAP MODAL
═══════════════════════════════════════════════════════════ */
:host-context(body.dark-mode) .map-modal-content {
  background: #1e1e1e !important;
}
:host-context(body.dark-mode) .map-location-badge {
  background: #242424 !important;
  color: #c0c0c0 !important;
  border-top-color: #3a3a3a !important;
}

/* ═══════════════════════════════════════════════════════════
   EMPTY / LOADING STATES
═══════════════════════════════════════════════════════════ */
:host-context(body.dark-mode) .empty,
:host-context(body.dark-mode) .loading {
  color: #666 !important;
}

/* ═══════════════════════════════════════════════════════════
   INLINE STYLE OVERRIDES
   Catch elements with hardcoded style="color:#xxx"
═══════════════════════════════════════════════════════════ */
:host-context(body.dark-mode) [style*="color:#2c3e50"],
:host-context(body.dark-mode) [style*="color: #2c3e50"],
:host-context(body.dark-mode) [style*="color:#333"],
:host-context(body.dark-mode) [style*="color: #333"],
:host-context(body.dark-mode) [style*="color:#444"],
:host-context(body.dark-mode) [style*="color: #444"],
:host-context(body.dark-mode) [style*="color:#555"],
:host-context(body.dark-mode) [style*="color: #555"],
:host-context(body.dark-mode) [style*="color:#666"],
:host-context(body.dark-mode) [style*="color: #666"],
:host-context(body.dark-mode) [style*="color:#777"],
:host-context(body.dark-mode) [style*="color: #777"],
:host-context(body.dark-mode) [style*="color:#1a1a1a"],
:host-context(body.dark-mode) [style*="color:black"],
:host-context(body.dark-mode) [style*="color: black"] {
  color: #d0d0d0 !important;
}

:host-context(body.dark-mode) [style*="background:#fff"]:not(thead):not(th),
:host-context(body.dark-mode) [style*="background: #fff"]:not(thead):not(th),
:host-context(body.dark-mode) [style*="background:white"]:not(thead):not(th),
:host-context(body.dark-mode) [style*="background: white"]:not(thead):not(th),
:host-context(body.dark-mode) [style*="background-color:#fff"]:not(thead):not(th),
:host-context(body.dark-mode) [style*="background-color: #fff"]:not(thead):not(th),
:host-context(body.dark-mode) [style*="background-color:white"]:not(thead):not(th),
:host-context(body.dark-mode) [style*="background:#f4f6f9"],
:host-context(body.dark-mode) [style*="background:#f9fafb"],
:host-context(body.dark-mode) [style*="background:#fafafa"] {
  background: #1e1e1e !important;
}
`;
