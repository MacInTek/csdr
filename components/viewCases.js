import { db } from "../scripts/firebaseConfig.js";
import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { darkModeCSS } from "../scripts/darkMode.js";

class ViewCases extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    this.casesData = [];
    this.filteredData = [];
    this.searchTimeout = null;
    this.currentPage = 1;
    this.pageSize = 10;
    this.pageSizes = [5, 10, 25, 50, 100];
    this.totalPages = 1;
    this.sortOrder = "newest"; // "newest", "oldest", "dateFilled-asc", "dateFilled-desc"
    this.searchColumn = "all";
  }

  connectedCallback() {
    this.render();
    this.loadCases();
  }

  /* =====================
     TEMPLATE
  ===================== */
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          padding: 20px;
          background: #f4f6f9;
          font-family: "Segoe UI", Arial, sans-serif;
        }

        .card {
          background: #fff;
          border-radius: 14px;
          padding: 20px;
          box-shadow: 0 8px 20px rgba(0,0,0,0.08);
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 12px;
        }

        .header h2 {
          margin: 0;
          color: #0c6d38;
        }

        .count {
          font-size: 14px;
          color: #555;
        }

        .search-container {
          margin-bottom: 20px;
          position: relative;
        }
        .search-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .search-icon {
          position: absolute;
          left: 12px;
          font-size: 18px;
          color: #666;
          pointer-events: none;
        }
        .search-input {
          width: 100%;
          padding: 12px 12px 12px 40px;
          border-radius: 10px;
          border: 1px solid #ccc;
          font-size: 14px;
          transition: border-color .2s, box-shadow .2s;
        }
        .search-input:focus {
          outline: none;
          border-color: #0c6d38;
          box-shadow: 0 0 0 2px rgba(12,109,56,.15);
        }
        .search-input::placeholder {
          color: #999;
        }
        .search-clear {
          position: absolute;
          right: 12px;
          background: transparent;
          border: none;
          color: #666;
          cursor: pointer;
          font-size: 18px;
          padding: 4px 8px;
          border-radius: 4px;
          display: none;
          align-items: center;
          justify-content: center;
          transition: background .2s, color .2s;
        }
        .search-clear:hover {
          background: rgba(0,0,0,0.05);
          color: #333;
        }
        .search-clear.visible {
          display: flex;
        }
        .search-help {
          margin-top: 8px;
          font-size: 12px;
          color: #555;
          line-height: 1.4;
          max-width: 680px;
        }
        .filter-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 10px;
        }
        .filter-chip {
          padding: 4px 12px;
          border-radius: 20px;
          border: 1.5px solid #ccc;
          background: #fff;
          color: #555;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all .18s;
          white-space: nowrap;
          user-select: none;
        }
        .filter-chip:hover {
          border-color: #0c6d38;
          color: #0c6d38;
          background: #f0f9f4;
        }
        .filter-chip.active {
          background: #0c6d38;
          color: white;
          border-color: #0c6d38;
          box-shadow: 0 2px 6px rgba(12,109,56,.25);
        }

        /* Sort Controls */
        .sort-controls {
          margin-bottom: 20px;
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .sort-label { font-weight:600; color:#333; font-size:14px; }
        .sort-dropdown-wrap { position:relative; }
        .sort-icon-btn {
          padding:7px 12px; border:1.5px solid #0c6d38; background:#fff; color:#0c6d38;
          border-radius:8px; cursor:pointer; font-size:13px; font-weight:600;
          display:inline-flex; align-items:center; gap:6px; transition:all .2s;
        }
        .sort-icon-btn:hover { background:#f0f9f4; }
        .sort-icon-btn.active-newest::after { content:" ↓ Newest"; }
        .sort-icon-btn.active-oldest::after  { content:" ↑ Oldest"; }
        .sort-icon-btn.active-dateFilled-asc::after  { content:" ↑ Date Filled"; }
        .sort-icon-btn.active-dateFilled-desc::after { content:" ↓ Date Filled"; }
        .sort-drop-menu {
          display:none; position:absolute; top:calc(100% + 6px); left:0;
          background:#fff; border:1px solid #ddd; border-radius:10px;
          box-shadow:0 8px 24px rgba(0,0,0,.12); z-index:500; min-width:150px; overflow:hidden;
        }
        .sort-drop-menu.open { display:block; }
        .sort-drop-opt {
          display:flex; align-items:center; gap:8px;
          width:100%; padding:10px 14px; background:none; border:none;
          text-align:left; font-size:13px; color:#333; cursor:pointer; transition:background .15s;
        }
        .sort-drop-opt:hover { background:#f0f9f4; color:#0c6d38; font-weight:600; }
        .sort-drop-opt.selected { color:#0c6d38; font-weight:700; }

        .table-wrapper {
          overflow-x: auto;
          margin-top: 10px;
        }

        /* Pagination styles */
        .pagination-container {
          margin-top: 20px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 16px 0;
        }
        .pagination-info {
          color: #666;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .pagination-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .pagination-btn {
          padding: 8px 12px;
          border: 1px solid #ccc;
          background: #fff;
          color: #333;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
          min-width: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .pagination-btn:hover:not(:disabled) {
          background: #0c6d38;
          color: white;
          border-color: #0c6d38;
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .pagination-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background: #f5f5f5;
        }
        .pagination-btn.active {
          background: #0c6d38;
          color: white;
          border-color: #0c6d38;
        }
        .items-per-page {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .items-per-page label {
          font-size: 14px;
          color: #666;
          font-weight: 500;
        }
        .items-per-page select {
          padding: 6px 10px;
          border: 1px solid #ccc;
          border-radius: 6px;
          font-size: 14px;
          background: white;
          cursor: pointer;
        }
        .items-per-page select:focus {
          outline: none;
          border-color: #0c6d38;
          box-shadow: 0 0 0 2px rgba(12,109,56,.15);
        }

        table { 
          width:100%; 
          min-width:990px; 
          border-collapse:separate; 
          border-spacing: 0;
          border-radius:12px; 
          overflow:hidden; 
          box-shadow: 0 4px 12px rgba(0,0,0,0.1); 
          font-family: 'Gilroy-Bold', sans-serif;
          table-layout: fixed;
        }

        thead { 
          background:#0c6d38; 
          color:white; 
          text-align:center; 
          font-size: 14px;  
          font-weight: 900; 
        }

        th, td { 
          padding:12px; 
          border-bottom:1px solid #eee; 
          font-size:14px; 
          text-align: left;
          vertical-align: middle;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        /* Set specific widths for columns to prevent overflow */
        th:nth-child(1), td:nth-child(1) { width: 120px; } /* Case No */
        th:nth-child(2), td:nth-child(2) { width: 200px; max-width: 200px; } /* Nature */
        th:nth-child(3), td:nth-child(3) { width: 120px; } /* Tax Dec */
        th:nth-child(4), td:nth-child(4) { width: 150px; } /* Belonging Party */
        th:nth-child(5), td:nth-child(5) { width: 150px; } /* Opposing Party */
        th:nth-child(6), td:nth-child(6) { width: 120px; } /* Location */
        th:nth-child(7), td:nth-child(7) { width: 110px; } /* Date Filed */
        th:nth-child(8), td:nth-child(8) { width: 110px; } /* Date of Decision */
        th:nth-child(9), td:nth-child(9) { width: 110px; } /* MR Date Received */
        th:nth-child(10), td:nth-child(10) { width: 110px; } /* MR Date Resolution */
        th:nth-child(11), td:nth-child(11) { width: 110px; } /* Date of Appeal */
        th:nth-child(12), td:nth-child(12) { width: 110px; } /* Date Decided */
        th:nth-child(13), td:nth-child(13) { width: 110px; } /* Date of Finality */
        th:nth-child(14), td:nth-child(14) { width: 100px; } /* Status */
        th:nth-child(15), td:nth-child(15) { width: 130px; } /* Created By */
        th:nth-child(16), td:nth-child(16) { width: 130px; } /* Updated By */

        tbody tr {
          position: relative;
        }

        tbody tr td {
          border-bottom: 1px solid #eee;
        }

        tbody tr:hover { 
          background: rgba(12,109,56,.08);
          
          cursor: pointer;
        }
        
        tbody tr:hover td { 
          background: rgba(12,109,56,.08); 
          // border-top: 1px solid #0c6d38;  
          // border-bottom: 1px solid #0c6d38;
        }

        /* Tooltip styles */
        .row-tooltip {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%) translateY(-8px);
          background: rgba(0, 0, 0, 0.85);
          color: white;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          white-space: nowrap;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.2s ease;
          z-index: 1000;
          font-weight: 500;
        }

        .row-tooltip::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border: 5px solid transparent;
          border-top-color: rgba(0, 0, 0, 0.85);
        }

        tbody tr:hover .row-tooltip {
          opacity: 1;
        }

        .loading,
        .empty {
          text-align: center;
          padding: 20px;
          color: #777;
          font-size: 14px;
        }

        /* STATUS BADGE */
        .status {
          padding:4px 10px;
          border-radius:999px;
          font-size:12px;
          font-weight:600;
          text-align:center;
          width:fit-content;
        }
        .Pending { background:#fff3cd; color:#856404; }
        .Resolved { background:#d4edda; color:#155724; }
        .Closed { background:#f8d7da; color:#721c24; }

        .status-filter {
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid #ccc;
          font-size: 14px;
        }
        .header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .print-dropdown-wrapper {
          position: relative;
        }
        .print-btn {
          padding: 8px 16px;
          background: #0c6d38;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .print-btn:hover {
          background: #095a2e;
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(12,109,56,0.3);
        }
        .print-menu {
          display: none;
          position: absolute;
          top: calc(100% + 6px);
          right: 0;
          background: white;
          border: 1px solid #ddd;
          border-radius: 10px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
          z-index: 500;
          min-width: 170px;
          overflow: hidden;
        }
        .print-menu.open { display: block; }
        .print-option {
          display: block;
          width: 100%;
          padding: 10px 16px;
          background: none;
          border: none;
          text-align: left;
          font-size: 14px;
          color: #333;
          cursor: pointer;
          transition: background 0.15s;
        }
        .print-option:hover {
          background: #f0f9f4;
          color: #0c6d38;
          font-weight: 600;
        }
        .print-section-label {
          padding: 8px 16px 4px;
          font-size: 11px;
          font-weight: 700;
          color: #999;
          text-transform: uppercase;
          letter-spacing: .5px;
        }
        .print-divider { height: 1px; background: #eee; margin: 4px 0; }
        .print-paper-options {
          padding: 6px 16px 10px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .paper-radio {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #333;
          cursor: pointer;
        }
        .paper-radio input { accent-color: #0c6d38; cursor: pointer; }
        .modal {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          z-index: 2000;
          align-items: center;
          justify-content: center;
        }

        .modal.active {
          display: flex;
        }

        .modal-content {
          background: white;
          border-radius: 16px;
          padding: 30px;
          width: 90%;
          max-width: 800px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          padding-bottom: 12px;
          border-bottom: 2px solid #eee;
        }

        .modal-header h2 {
          margin: 0;
          color: #0c6d38;
          font-size: 22px;
        }

        .modal-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .print-single-btn {
          padding: 8px 16px;
          background: #0c6d38;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .print-single-btn:hover {
          background: #095a2e;
          transform: translateY(-1px);
          box-shadow: 0 4px 10px rgba(12,109,56,0.3);
        }

        /* Print format picker */
        .print-format-wrap { position:relative; display:inline-block; }
        .print-format-menu {
          display:none; position:absolute; top:calc(100% + 6px); right:0;
          background:#fff; border:1px solid #ddd; border-radius:10px;
          box-shadow:0 8px 24px rgba(0,0,0,.12); z-index:3000; min-width:180px; overflow:hidden;
        }
        .print-format-menu.open { display:block; }
        .pf-label { padding:8px 14px 4px; font-size:10px; font-weight:700; color:#999; text-transform:uppercase; letter-spacing:.5px; }
        .pf-option {
          display:flex; align-items:center; gap:10px;
          width:100%; padding:10px 14px; background:none; border:none;
          text-align:left; font-size:13px; color:#333; cursor:pointer; transition:background .15s;
        }
        .pf-option:hover { background:#f0f9f4; color:#0c6d38; font-weight:600; }
        .pf-option i { font-size:15px; width:18px; text-align:center; }

        .modal-close {
          background: none;
          border: none;
          font-size: 28px;
          cursor: pointer;
          color: #666;
          padding: 0;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .modal-close:hover {
          background: #f0f0f0;
          color: #333;
        }

        .modal-body {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .detail-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .detail-label {
          font-size: 13px;
          font-weight: 600;
          color: #555;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .detail-value {
          font-size: 14px;
          color: #333;
          word-break: break-word;
          padding: 8px 0;
        }

        .detail-full-width {
          grid-column: 1 / -1;
        }

        /* File Viewer Modal */
        .file-viewer-modal {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.75);
          z-index: 3000;
          align-items: center;
          justify-content: center;
        }
        .file-viewer-modal.active { display: flex; }
        .file-viewer-content {
          background: #1a1a2e;
          border-radius: 14px;
          width: 94%;
          max-width: 960px;
          max-height: 92vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        }
        .file-viewer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 18px;
          background: #16213e;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          gap: 12px;
          flex-shrink: 0;
        }
        .file-viewer-title {
          font-size: 13px;
          font-weight: 600;
          color: #e0e0e0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
        }
        .file-viewer-actions { display: flex; gap: 8px; flex-shrink: 0; }
        .file-viewer-btn {
          padding: 6px 14px;
          border-radius: 7px;
          border: none;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .file-viewer-btn.open-btn { background: #0c6d38; color: white; }
        .file-viewer-btn.open-btn:hover { background: #0e7d42; }
        .file-viewer-btn.download-btn { background: #6f42c1; color: white; }
        .file-viewer-btn.download-btn:hover { background: #5a32a3; }
        .file-viewer-btn.close-btn { background: rgba(255,255,255,0.1); color: #ccc; }
        .file-viewer-btn.close-btn:hover { background: rgba(255,255,255,0.2); color: white; }
        .file-viewer-body {
          flex: 1;
          overflow: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          min-height: 300px;
        }
        .file-viewer-body img {
          max-width: 100%;
          max-height: calc(92vh - 80px);
          object-fit: contain;
          border-radius: 8px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.4);
        }
        .file-viewer-body iframe {
          width: 100%;
          height: calc(92vh - 80px);
          border: none;
          border-radius: 8px;
          background: white;
        }

        /* Map Modal */
        .map-modal {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          z-index: 3100;
          align-items: center;
          justify-content: center;
        }
        .map-modal.active { display: flex; }
        .map-modal-content {
          background: white;
          border-radius: 14px;
          width: 92%;
          max-width: 780px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0,0,0,0.35);
          display: flex;
          flex-direction: column;
        }
        .map-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          background: #0c6d38;
          gap: 10px;
        }
        .map-modal-title {
          font-size: 15px;
          font-weight: 700;
          color: white;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .map-modal-close {
          background: rgba(255,255,255,0.15);
          border: none;
          color: white;
          font-size: 18px;
          width: 32px;
          height: 32px;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }
        .map-modal-close:hover { background: rgba(255,255,255,0.3); }
        .map-location-badge {
          padding: 10px 16px;
          background: #f4f6f9;
          font-size: 13px;
          color: #444;
          border-top: 1px solid #e0e0e0;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .location-map-btn {
          margin-top: 6px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: #f0f9f4;
          border: 1.5px solid #0c6d38;
          border-radius: 8px;
          color: #0c6d38;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          user-select: none;
        }
        .location-map-btn:hover { background: #0c6d38; color: white; }

        @media (max-width: 600px) {
          input[type="text"] {
            max-width: 100%;
          }
          .pagination-container {
            flex-direction: column;
            align-items: stretch;
          }
          .pagination-controls {
            justify-content: center;
            flex-wrap: wrap;
          }
          .modal-content {
            width: 95%;
            padding: 20px;
          }
          .modal-body {
            grid-template-columns: 1fr;
          }
          .detail-full-width {
            grid-column: 1;
          }
        }
        ${darkModeCSS}
      </style>

      <div class="card">
        <div class="header">
          <h2>📂 Case Records</h2>
          <span class="count" id="caseCount">0 cases</span>
          <div class="header-actions">
            <select class="status-filter" id="statusFilter">
              <option value="all">All Cases</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <div class="print-dropdown-wrapper">
              <button class="print-btn" id="printMenuBtn">🖨️ Print</button>
              <div class="print-menu" id="printMenu">
                <div class="print-section-label">Filter by Status</div>
                <button class="print-option" data-status="all">All Cases</button>
                <button class="print-option" data-status="Pending">Pending Cases</button>
                <button class="print-option" data-status="Resolved">Resolved Cases</button>
                <button class="print-option" data-status="Closed">Closed Cases</button>
                <div class="print-divider"></div>
                <div class="print-section-label">Paper Size</div>
                <div class="print-paper-options">
                  <label class="paper-radio"><input type="radio" name="paperSize" value="legal" checked /> Long (8.5×13)</label>
                  <label class="paper-radio"><input type="radio" name="paperSize" value="letter" /> Short (8.5×11)</label>
                  <label class="paper-radio"><input type="radio" name="paperSize" value="a4" /> A4</label>
                </div>
                <div class="print-divider"></div>
                <div class="print-section-label">Print Mode</div>
                <div class="print-paper-options">
                  <label class="paper-radio"><input type="checkbox" id="bwModeCheck" /> Black &amp; White</label>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="search-container">
          <div class="search-wrapper">
            <span class="search-icon">🔍</span>
            <input 
              type="text" 
              id="searchInput" 
              class="search-input" 
              placeholder="Search cases..."
            />
            <button class="search-clear" id="searchClear" aria-label="Clear search">×</button>
          </div>
          <div class="search-help" id="searchHelp">Tip: enter text or dates to search. For date fields, use MM-DD-YYYY or MM/DD/YYYY (for example, 05-04-2026).</div>
          <div class="filter-chips" id="filterChips">
            <button class="filter-chip active" data-col="all">All Fields</button>
            <button class="filter-chip" data-col="caseNo">Case No</button>
            <button class="filter-chip" data-col="nature">Nature of Case</button>
            <button class="filter-chip" data-col="taxDec">Title / Tax Dec</button>
            <button class="filter-chip" data-col="belongingParty">Belonging Party</button>
            <button class="filter-chip" data-col="opposingParty">Opposing Party</button>
            <button class="filter-chip" data-col="location">Location</button>
            <button class="filter-chip" data-col="dateFilled">Date Filed</button>
            <button class="filter-chip" data-col="dateDecided">Date of Decision</button>
            <button class="filter-chip" data-col="mrDateReceived">MR Date Received</button>
            <button class="filter-chip" data-col="mrDateResolution">MR Date Resolution</button>
            <button class="filter-chip" data-col="dateOfAppeal">Date of Appeal</button>
            <button class="filter-chip" data-col="dateOfFinality">Date of Finality</button>
            <button class="filter-chip" data-col="winningParty">Winning Party</button>
            <button class="filter-chip" data-col="createdBy">Created By</button>
            <button class="filter-chip" data-col="updatedBy">Updated By</button>
          </div>
        </div>

        <!-- Sort Controls -->
        <div class="sort-controls">
          <span class="sort-label">Sort:</span>
          <div class="sort-dropdown-wrap">
            <button class="sort-icon-btn active-newest" id="sortIconBtn">⇅</button>
            <div class="sort-drop-menu" id="sortDropMenu">
              <button class="sort-drop-opt selected" id="sortNewestBtn">↓ Newest First</button>
              <button class="sort-drop-opt" id="sortOldestBtn">↑ Oldest First</button>
              <button class="sort-drop-opt" id="sortDateFilledAscBtn">↑ Date Filled (Oldest)</button>
              <button class="sort-drop-opt" id="sortDateFilledDescBtn">↓ Date Filled (Newest)</button>
            </div>
          </div>
        </div>

        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Case No</th>
                <th>Nature of the Case</th>
                <th>Title / Tax Dec</th>
                <th>Belonging / Filing Party</th>
                <th>Opposing / Defending Party</th>
                <th>Location</th>
                <th>Date Filed</th>
                <th>Date of Decision</th>
                <th>MR Date Received</th>
                <th>MR Date Resolution</th>
                <th>Date of Appeal</th>
                <th>Date of Finality</th>
                <th>Winning Party</th>
                <th>Status</th>
                <th>Created By</th>
                <th>Updated By</th>
              </tr>
            </thead>
            <tbody id="caseTableBody">
              <tr>
                <td colspan="14" class="loading">Loading cases...</td>
              </tr>
            </tbody>
          </table>
        </div>
      
        <!-- Pagination -->
        <div class="pagination-container" id="paginationContainer" style="display: none;">
          <div class="pagination-info">
            <span id="paginationInfo">Showing 0-0 of 0</span>
            <div class="items-per-page">
              <label for="pageSizeSelect">Items per page:</label>
              <select id="pageSizeSelect">
                ${this.pageSizes.map(s=>`<option value="${s}" ${s===this.pageSize? 'selected':''}>${s}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="pagination-controls" id="paginationControls"></div>
        </div>

      </div>

      <!-- Case Details Modal -->
      <div class="modal" id="caseDetailsModal">
        <div class="modal-content">
          <div class="modal-header">
            <h2 id="modalCaseNo">Case Details</h2>
            <div class="modal-actions">
              <div class="print-format-wrap">
                <button class="print-single-btn" id="printSingleBtn">🖨️ Print ▾</button>
                <div class="print-format-menu" id="printFormatMenu">
                  <div class="pf-label">Print Format</div>
                  <button class="pf-option" id="printTableFmt">
                    <i class="fas fa-table"></i> Table Format
                  </button>
                  <button class="pf-option" id="printDocFmt">
                    <i class="fas fa-file-alt"></i> Document Format
                  </button>
                  <div style="height:1px;background:#eee;margin:4px 0;"></div>
                  <div style="padding:6px 14px 10px;display:flex;flex-direction:column;gap:6px;">
                    <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:#555;cursor:pointer;font-weight:600;text-transform:uppercase;letter-spacing:.4px;">
                      <input type="checkbox" id="singleBwCheck" style="accent-color:#0c6d38;cursor:pointer;" /> Black &amp; White
                    </label>
                  </div>
                </div>
              </div>
              <button class="modal-close" id="modalClose">&times;</button>
            </div>
          </div>
          <div class="modal-body" id="modalBody">
            <!-- Populated dynamically -->
          </div>
        </div>
      </div>

      <!-- File Viewer Modal -->
      <div class="file-viewer-modal" id="fileViewerModal">
        <div class="file-viewer-content">
          <div class="file-viewer-header">
            <span class="file-viewer-title" id="fileViewerTitle">File</span>
            <div class="file-viewer-actions">
              <a class="file-viewer-btn open-btn" id="fileViewerOpenBtn" target="_blank" rel="noopener noreferrer">↗ Open</a>
              <a class="file-viewer-btn download-btn" id="fileViewerDownloadBtn" download>⬇ Download</a>
              <button class="file-viewer-btn close-btn" id="fileViewerClose">✕ Close</button>
            </div>
          </div>
          <div class="file-viewer-body" id="fileViewerBody"></div>
        </div>
      </div>

      <!-- Map Modal -->
      <div class="map-modal" id="caseMapModal">
        <div class="map-modal-content">
          <div class="map-modal-header">
            <span class="map-modal-title">📍 <span id="caseMapTitle">Location</span></span>
            <button class="map-modal-close" id="caseMapClose">✕</button>
          </div>
          <div id="caseMapContainer" style="width:100%;height:420px;"></div>
          <div class="map-location-badge">📍 <span id="caseMapBadge"></span></div>
        </div>
      </div>
    `;

    this.shadowRoot
      .getElementById("searchInput")
      .addEventListener("input", (e) => this.debouncedFilter(e.target.value));
  
    this.shadowRoot
      .getElementById("statusFilter")
      .addEventListener("change", (e) => this.filterByStatus(e.target.value));

    // Pagination controls
    const pageSizeSelect = this.shadowRoot.getElementById('pageSizeSelect');
    if (pageSizeSelect) {
      pageSizeSelect.value = this.pageSize.toString(); // Sync with current value
      pageSizeSelect.addEventListener('change', (e) => { 
        this.changePageSize(parseInt(e.target.value, 10)); 
      });
    }

    // Search bar event handlers
    const searchInput = this.shadowRoot.getElementById("searchInput");
    const searchClear = this.shadowRoot.getElementById("searchClear");
    if (searchInput) {
      searchInput.addEventListener("keyup", (e) => {
        if (e.key === "Escape") {
          e.target.value = "";
          this.filterCases("");
        }
      });
    }
    if (searchClear) {
      searchClear.addEventListener("click", () => {
        if (searchInput) {
          searchInput.value = "";
          this.filterCases("");
          searchInput.focus();
        }
      });
    }

    const filterChips = this.shadowRoot.getElementById("filterChips");
    if (filterChips) {
      filterChips.addEventListener("click", (e) => {
        const chip = e.target.closest(".filter-chip");
        if (!chip) return;
        filterChips.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        this.searchColumn = chip.dataset.col;
        const label = chip.textContent.trim();
        const isDateField = ["dateFilled", "dateDecided", "mrDateReceived", "mrDateResolution", "dateOfAppeal", "dateOfFinality"].includes(this.searchColumn);
        if (searchInput) {
          searchInput.placeholder = this.searchColumn === "all"
            ? "Search cases..."
            : isDateField
              ? `Search by ${label} (MM-DD-YYYY or MM/DD/YYYY)...`
              : `Search by ${label}...`;
        }
        const searchHelp = this.shadowRoot.getElementById("searchHelp");
        if (searchHelp) {
          if (this.searchColumn === "all") {
            searchHelp.textContent = "Tip: enter text or dates to search. For date fields, use MM-DD-YYYY or MM/DD/YYYY (for example, 05-04-2026).";
          } else if (isDateField) {
            searchHelp.textContent = `Searching ${label}. Enter a date in MM-DD-YYYY or MM/DD/YYYY format, for example 05-04-2026.`;
          } else {
            searchHelp.textContent = `Searching ${label}. Type any text or keyword to filter results.`;
          }
        }
        if (searchInput) {
          this.filterCases(searchInput.value);
        }
      });
    }

    // Sort button handlers
    const sortNewestBtn = this.shadowRoot.getElementById("sortNewestBtn");
    const sortOldestBtn = this.shadowRoot.getElementById("sortOldestBtn");
    const sortIconBtn   = this.shadowRoot.getElementById("sortIconBtn");
    const sortDropMenu  = this.shadowRoot.getElementById("sortDropMenu");
    if (sortIconBtn && sortDropMenu) {
      sortIconBtn.addEventListener("click", e => { e.stopPropagation(); sortDropMenu.classList.toggle("open"); });
      this.shadowRoot.addEventListener("click", () => sortDropMenu.classList.remove("open"));
    }
    if (sortNewestBtn) sortNewestBtn.addEventListener("click", () => this.setSortOrder("newest"));
    if (sortOldestBtn) sortOldestBtn.addEventListener("click", () => this.setSortOrder("oldest"));

    const sortDateFilledAscBtn  = this.shadowRoot.getElementById("sortDateFilledAscBtn");
    const sortDateFilledDescBtn = this.shadowRoot.getElementById("sortDateFilledDescBtn");
    if (sortDateFilledAscBtn)  sortDateFilledAscBtn.addEventListener("click",  () => this.setSortOrder("dateFilled-asc"));
    if (sortDateFilledDescBtn) sortDateFilledDescBtn.addEventListener("click", () => this.setSortOrder("dateFilled-desc"));

    // Print format dropdown
    const printSingleBtn  = this.shadowRoot.getElementById("printSingleBtn");
    const printFormatMenu = this.shadowRoot.getElementById("printFormatMenu");
    printSingleBtn.addEventListener("click", e => { e.stopPropagation(); printFormatMenu.classList.toggle("open"); });
    this.shadowRoot.addEventListener("click", () => printFormatMenu.classList.remove("open"));
    this.shadowRoot.getElementById("printTableFmt").addEventListener("click", () => {
      printFormatMenu.classList.remove("open");
      const bw = this.shadowRoot.getElementById("singleBwCheck")?.checked || false;
      if (this._currentCase) this.printSingleCase(this._currentCase, "legal", "table", bw);
    });
    this.shadowRoot.getElementById("printDocFmt").addEventListener("click", () => {
      printFormatMenu.classList.remove("open");
      const bw = this.shadowRoot.getElementById("singleBwCheck")?.checked || false;
      if (this._currentCase) this.printSingleCase(this._currentCase, "legal", "document", bw);
    });

    // Modal event handlers
    const modal = this.shadowRoot.getElementById("caseDetailsModal");
    const modalClose = this.shadowRoot.getElementById("modalClose");
    
    if (modalClose) {
      modalClose.addEventListener("click", () => this.closeModal());
    }

    // Close modal when clicking outside
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          this.closeModal();
        }
      });
    }

    // File viewer modal handlers
    const fileViewerClose = this.shadowRoot.getElementById("fileViewerClose");
    const fileViewerModal = this.shadowRoot.getElementById("fileViewerModal");
    if (fileViewerClose) {
      fileViewerClose.addEventListener("click", () => this._closeFileViewer());
    }
    if (fileViewerModal) {
      fileViewerModal.addEventListener("click", (e) => {
        if (e.target === fileViewerModal) this._closeFileViewer();
      });
    }

    // Map modal handlers
    const caseMapClose = this.shadowRoot.getElementById("caseMapClose");
    const caseMapModal = this.shadowRoot.getElementById("caseMapModal");
    if (caseMapClose) {
      caseMapClose.addEventListener("click", () => this._closeMapModal());
    }
    if (caseMapModal) {
      caseMapModal.addEventListener("click", (e) => {
        if (e.target === caseMapModal) this._closeMapModal();
      });
    }

    // Print menu
    const printMenuBtn = this.shadowRoot.getElementById("printMenuBtn");
    const printMenu = this.shadowRoot.getElementById("printMenu");
    if (printMenuBtn && printMenu) {
      printMenuBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        printMenu.classList.toggle("open");
      });
      this.shadowRoot.addEventListener("click", () => printMenu.classList.remove("open"));
      printMenu.querySelectorAll(".print-option").forEach(btn => {
        btn.addEventListener("click", () => {
          const paperSize = printMenu.querySelector('input[name="paperSize"]:checked')?.value || "legal";
          const bw = printMenu.querySelector('#bwModeCheck')?.checked || false;
          printMenu.classList.remove("open");
          this.printCases(btn.dataset.status, paperSize, bw);
        });
      });
    }
  }

  /* =====================
     FIRESTORE FETCH
  ===================== */
  async loadCases() {
    const body = this.shadowRoot.getElementById("caseTableBody");
    body.innerHTML = `<tr><td colspan="9" class="loading">Loading cases...</td></tr>`;

    try {
      const snapshot = await getDocs(collection(db, "cases"));
      this.casesData = snapshot.docs.map(doc => doc.data());
      this.filteredData = [...this.casesData];

      this.displayCases(this.filteredData);
    } catch (err) {
      console.error("Error fetching cases:", err);
      body.innerHTML = `<tr><td colspan="9" class="empty">Failed to load cases</td></tr>`;
    }
  }

  setSortOrder(order) {
    this.sortOrder = order;
    this.currentPage = 1;
    const sr = this.shadowRoot;
    const btn  = sr.getElementById("sortIconBtn");
    const menu = sr.getElementById("sortDropMenu");
    if (btn) btn.className = `sort-icon-btn active-${order}`;
    sr.querySelectorAll(".sort-drop-opt").forEach(o => o.classList.remove("selected"));
    const selectedBtnId = {
      newest: "sortNewestBtn",
      oldest: "sortOldestBtn",
      "dateFilled-asc":  "sortDateFilledAscBtn",
      "dateFilled-desc": "sortDateFilledDescBtn",
    }[order] || "sortNewestBtn";
    sr.getElementById(selectedBtnId)?.classList.add("selected");
    if (menu) menu.classList.remove("open");
    this.displayCases(this.filteredData);
  }

  sortCases(cases) {
    // Create a copy to avoid mutating the original array
    const sorted = [...cases];
    
    sorted.sort((a, b) => {
      if (this.sortOrder === "dateFilled-asc" || this.sortOrder === "dateFilled-desc") {
        const dA = a.dateFilled || a.dateFiled ? new Date(a.dateFilled || a.dateFiled) : new Date(0);
        const dB = b.dateFilled || b.dateFiled ? new Date(b.dateFilled || b.dateFiled) : new Date(0);
        return this.sortOrder === "dateFilled-asc" ? dA - dB : dB - dA;
      }
      const dateA = a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(0);
      return this.sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });
    
    return sorted;
  }

  /* =====================
     RENDER TABLE
  ===================== */
  displayCases(data) {
    // Sort cases first
    let sortedData = this.sortCases(data);

    const body = this.shadowRoot.getElementById("caseTableBody");
    const count = this.shadowRoot.getElementById("caseCount");
    body.innerHTML = "";


    if (!sortedData.length) {
      body.innerHTML = `<tr><td colspan="14" class="empty">No cases found</td></tr>`;
      count.textContent = "0 cases";
      this._renderPagination(0, 0, 0);
      return;
    }

    // compute pagination
    this.totalPages = Math.max(1, Math.ceil(sortedData.length / this.pageSize));
    if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
    if (this.currentPage < 1) this.currentPage = 1;

    const start = (this.currentPage - 1) * this.pageSize;
    const end = Math.min(start + this.pageSize, sortedData.length);
    const pageData = sortedData.slice(start, end);

    pageData.forEach(c => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${c.caseNo || "-"}</td>
        <td>${c.nature || "-"}</td>
        <td>${c.taxDec || "-"}</td>
        <td>${c.belongingParty?.name || "-"} (${c.belongingParty?.roles?.join(", ") || c.belongingParty?.role || "-"})</td>
        <td>${c.opposingParty?.name || "-"} (${c.opposingParty?.roles?.join(", ") || c.opposingParty?.role || "-"})</td>
        <td>${c.location || "-"}</td>
        <td>${this._fmtDate(c.dateFilled || c.dateFiled)}</td>
        <td>${this._fmtDate(c.dateDecided)}</td>
        <td>${this._fmtDate(c.mrDateReceived)}</td>
        <td>${this._fmtDate(c.mrDateResolution)}</td>
        <td>${this._fmtDate(c.dateOfAppeal)}</td>
        <td>${this._fmtDate(c.dateOfFinality)}</td>
        <td>${c.winningParty || "-"}</td>
        <td><span class="status ${c.status || ""}">${c.status || ""}</span></td>
        <td>${c.createdBy || "-"}</td>
        <td>${c.updatedBy || "-"}</td>
      `;

      // Add tooltip
      const tooltip = document.createElement("div");
      tooltip.className = "row-tooltip";
      tooltip.textContent = "Double click to view the case";
      row.appendChild(tooltip);

      row.addEventListener("dblclick", () => this.showCaseDetails(c));
      body.appendChild(row);
    });

    // update counters
    count.textContent = `${data.length} case${data.length > 1 ? "s" : ""}`;

    // Render pagination controls
    this._renderPagination(start + 1, end, data.length, this.totalPages);
  }

  _renderPagination(start, end, total, totalPages = 1) {
    const container = this.shadowRoot.getElementById("paginationContainer");
    const info = this.shadowRoot.getElementById("paginationInfo");
    const controls = this.shadowRoot.getElementById("paginationControls");
    
    if (!container || !info || !controls) return;

    if (total === 0) {
      container.style.display = "none";
      return;
    }

    container.style.display = "flex";
    info.textContent = `Showing ${start}-${end} of ${total}`;

    // Clear previous controls
    controls.innerHTML = "";

    // Previous button
    const prevBtn = document.createElement("button");
    prevBtn.className = "pagination-btn";
    prevBtn.textContent = "Previous";
    prevBtn.disabled = this.currentPage === 1;
    prevBtn.addEventListener("click", () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.displayCases(this.filteredData);
        // Scroll to top of table
        const tableWrapper = this.shadowRoot.querySelector(".table-wrapper");
        if (tableWrapper) tableWrapper.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
    controls.appendChild(prevBtn);

    // Page number buttons
    const maxVisiblePages = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Adjust start page if we're near the end
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // First page
    if (startPage > 1) {
      const firstBtn = document.createElement("button");
      firstBtn.className = "pagination-btn";
      firstBtn.textContent = "1";
      firstBtn.addEventListener("click", () => {
        this.currentPage = 1;
        this.displayCases(this.filteredData);
        const tableWrapper = this.shadowRoot.querySelector(".table-wrapper");
        if (tableWrapper) tableWrapper.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      controls.appendChild(firstBtn);

      if (startPage > 2) {
        const ellipsis = document.createElement("span");
        ellipsis.textContent = "...";
        ellipsis.style.padding = "0 8px";
        ellipsis.style.color = "#666";
        controls.appendChild(ellipsis);
      }
    }

    // Page number buttons
    for (let i = startPage; i <= endPage; i++) {
      const pageBtn = document.createElement("button");
      pageBtn.className = `pagination-btn ${i === this.currentPage ? "active" : ""}`;
      pageBtn.textContent = i.toString();
      if (i !== this.currentPage) {
        pageBtn.addEventListener("click", () => {
          this.currentPage = i;
          this.displayCases(this.filteredData);
          const tableWrapper = this.shadowRoot.querySelector(".table-wrapper");
          if (tableWrapper) tableWrapper.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
      controls.appendChild(pageBtn);
    }

    // Last page
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        const ellipsis = document.createElement("span");
        ellipsis.textContent = "...";
        ellipsis.style.padding = "0 8px";
        ellipsis.style.color = "#666";
        controls.appendChild(ellipsis);
      }

      const lastBtn = document.createElement("button");
      lastBtn.className = "pagination-btn";
      lastBtn.textContent = totalPages.toString();
      lastBtn.addEventListener("click", () => {
        this.currentPage = totalPages;
        this.displayCases(this.filteredData);
        const tableWrapper = this.shadowRoot.querySelector(".table-wrapper");
        if (tableWrapper) tableWrapper.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      controls.appendChild(lastBtn);
    }

    // Next button
    const nextBtn = document.createElement("button");
    nextBtn.className = "pagination-btn";
    nextBtn.textContent = "Next";
    nextBtn.disabled = this.currentPage === totalPages;
    nextBtn.addEventListener("click", () => {
      if (this.currentPage < totalPages) {
        this.currentPage++;
        this.displayCases(this.filteredData);
        const tableWrapper = this.shadowRoot.querySelector(".table-wrapper");
        if (tableWrapper) tableWrapper.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
    controls.appendChild(nextBtn);
  }

  changePageSize(size) {
    this.pageSize = size;
    this.currentPage = 1;
    this.displayCases(this.filteredData);
  }

  /* =====================
     FILTER BY STATUS
  ===================== */
  filterByStatus(status) {
    if (status === "all") {
      this.filteredData = [...this.casesData];
    } else {
      this.filteredData = this.casesData.filter(c => 
        (c.status || "").toLowerCase() === status.toLowerCase()
      );
    }
    this.currentPage = 1;
    this.displayCases(this.filteredData);
  }
  

  /* =====================
     SEARCH (DEBOUNCED)
  ===================== */
  debouncedFilter(value) {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.filterCases(value);
    }, 250);
  }

  filterCases(term) {
    const searchClear = this.shadowRoot.getElementById("searchClear");
    if (searchClear) {
      searchClear.classList.toggle("visible", !!term.trim());
    }

    const t = term.toLowerCase().trim();
    const formatDate = (value) => {
      if (!value) return "";
      return `${(value || "").toString().toLowerCase()} ${this._fmtDate(value).toLowerCase()}`.trim();
    };
    const formatParty = (party) => (party?.name || "").toLowerCase();

    this.filteredData = this.casesData.filter(c => {
      const lookup = {
        caseNo:          (c.caseNo || "").toLowerCase(),
        nature:          (c.nature || c.titleDec || "").toLowerCase(),
        taxDec:          (c.taxDec || "").toLowerCase(),
        belongingParty:  formatParty(c.belongingParty),
        opposingParty:   formatParty(c.opposingParty),
        location:        (c.location || "").toLowerCase(),
        dateFilled:      formatDate(c.dateFilled || c.dateFiled),
        dateDecided:     formatDate(c.dateDecided),
        mrDateReceived:  formatDate(c.mrDateReceived),
        mrDateResolution:formatDate(c.mrDateResolution),
        dateOfAppeal:    formatDate(c.dateOfAppeal),
        dateOfFinality:  formatDate(c.dateOfFinality),
        winningParty:    (c.winningParty || "").toLowerCase(),
        createdBy:       (c.createdBy || "").toLowerCase(),
        updatedBy:       (c.updatedBy || "").toLowerCase(),
      };

      if (this.searchColumn && this.searchColumn !== "all") {
        return lookup[this.searchColumn]?.includes(t);
      }
      return Object.values(lookup).some(value => value.includes(t));
    });

    this.currentPage = 1;
    this.displayCases(this.filteredData);
  }

  /* =====================
     PRINT
  ===================== */
  printCases(status, paperSize = "legal", bw = false) {
    let data = [...this.casesData];
    const label = status === "all" ? "All Cases" : `${status} Cases`;

    if (status !== "all") {
      data = data.filter(c => (c.status || "").toLowerCase() === status.toLowerCase());
    }

    data.sort((a, b) => {
      const dA = a.createdAt?.toDate?.() || new Date(0);
      const dB = b.createdAt?.toDate?.() || new Date(0);
      return this.sortOrder === "newest" ? dB - dA : dA - dB;
    });

    const pageSizeCSS   = { legal: "8.5in 13in",      letter: "8.5in 11in",     a4: "210mm 297mm" };
    const pageSizeLabel = { legal: "Long (8.5×13)",    letter: "Short (8.5×11)", a4: "A4" };
    const cssSize = pageSizeCSS[paperSize] || pageSizeCSS.legal;

    const statusBg    = { Pending: "#fff3cd", Resolved: "#d4edda", Closed: "#f8d7da" };
    const statusColor = { Pending: "#856404", Resolved: "#155724", Closed: "#721c24" };

    // Escape HTML to prevent broken cells
    const esc = v => (v == null ? "-" : String(v))
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const rows = data.map((c, i) => {
      const s    = c.status || "";
      const bg   = i % 2 === 0 ? "#ffffff" : "#f5f5f5";
      const sBg  = statusBg[s]    || "transparent";
      const sClr = statusColor[s] || "#333";
      const bp   = c.belongingParty;
      const op   = c.opposingParty;
      const bRole = bp?.role || bp?.roles?.join(", ") || "";
      const oRole = op?.role || op?.roles?.join(", ") || "";
      return `<tr style="background:${bg};-webkit-print-color-adjust:exact;print-color-adjust:exact">
        <td>${esc(c.caseNo)}</td>
        <td>${esc(c.nature)}</td>
        <td>${esc(c.taxDec)}</td>
        <td>${esc(bp?.name)}${bRole ? `<br><span class="sub">(${esc(bRole)})</span>` : ""}</td>
        <td>${esc(op?.name)}${oRole ? `<br><span class="sub">(${esc(oRole)})</span>` : ""}</td>
        <td>${esc(c.location)}</td>
        <td>${esc(this._fmtDate(c.dateFilled || c.dateFiled))}</td>
        <td>${esc(this._fmtDate(c.dateDecided))}</td>
        <td>${esc(this._fmtDate(c.dateOfAppeal))}</td>
        <td>${esc(this._fmtDate(c.mrDateResolution))}</td>
        <td>${esc(this._fmtDate(c.mrDateReceived))}</td>
        <td>${esc(this._fmtDate(c.dateOfFinality))}</td>
        <td>${esc(c.winningParty)}</td>
        <td><span style="display:inline-block;background:${sBg};color:${sClr};padding:1px 5px;border-radius:8px;font-weight:700;font-size:7px;white-space:nowrap;-webkit-print-color-adjust:exact;print-color-adjust:exact">${esc(s) || "-"}</span></td>
      </tr>`;
    }).join("");

    const win = window.open("", "_blank");
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>CSLTVS &mdash; ${label}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: "Segoe UI", Arial, sans-serif;
      font-size: 8px;
      color: #111;
      padding: 8mm;
    }

    .hdr { margin-bottom: 6px; }
    .hdr h2 { font-size: 12px; color: #0c6d38; margin-bottom: 2px; text-align: center; }
    .hdr p  { font-size: 7.5px; color: #555; }

    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: experimental; /* Enable CSS Grid layout for table */
    }

    /* Percentage widths — must total 100% */
    col.c1  { width: 3%;   }  /* Case No */
    col.c2  { width: 13%;  }  /* Nature */
    col.c3  { width: 3%;   }  /* Tax Dec */
    col.c4  { width: 5%;   }  /* Belonging Party */
    col.c5  { width: 5%;   }  /* Opposing Party */
    col.c6  { width: 5%;   }  /* Location */
    col.c7  { width: 4%; }  /* Date Filled */
    col.c8  { width: 4%; }  /* Date Decided */
    col.c9  { width: 4%; }  /* Date of Appeal */
    col.c10 { width: 4%;   }  /* MR Date Resolution */
    col.c11 { width: 4%;   }  /* MR Date Received */
    col.c12 { width: 4%;   }  /* Date of Finality */
    col.c13 { width: 5%;   }  /* Winning Party */
    col.c14 { width: 5%;   }  /* Status */

    thead tr {
      background: ${bw ? "transparent" : "#0c6d38"};
      color: ${bw ? "#111" : "#fff"};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    th {
      padding: 4px 3px;
      font-size: 7.5px;
      font-weight: 700;
      text-align: center;
      border: ${bw ? "1px solid #ccc" : "1px solid #0a5a2e"};
      border-top: ${bw ? "2.5px solid #111" : "1px solid #0a5a2e"};
      border-bottom: ${bw ? "2.5px solid #111" : "1px solid #0a5a2e"};
      vertical-align: middle;
      line-height: 1.2;
      word-break: break-word;
      overflow-wrap: break-word;
    }

    td {
      padding: 3px 4px;
      font-size: 7.5px;
      border: 1px solid #ccc;
      vertical-align: top;
      line-height: 1.3;
      word-break: break-word;
      overflow-wrap: break-word;
      hyphens: auto;
    }

    .sub { font-size: 7px; color: #555; }

    .sig-wrap {
      display: flex;
      justify-content: space-around;
      margin-top: 16mm;
    }
    .sig-block {
      width: 180px;
      text-align: center;
    }
    .sig-line {
      border-top: 1px solid #111;
      margin-bottom: 3px;
    }
    .sig-label {
      font-size: 8px;
      font-weight: 700;
      color: #111;
    }
    .sig-sub {
      font-size: 7.5px;
      color: #444;
      margin-top: 2px;
    }

    @page { size: ${cssSize} landscape; margin: 8mm; }

    @media print {
      body { padding: 0; }
      thead { display: table-header-group; }
      tbody tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="hdr">
    <h2>CSLTVS Case Records &mdash; ${label}</h2>
    <p>
      Total: <strong>${data.length}</strong> case${data.length !== 1 ? "s" : ""}
      &nbsp;&bull;&nbsp; Paper: ${pageSizeLabel[paperSize] || pageSizeLabel.legal}
      &nbsp;&bull;&nbsp; Printed: ${new Date().toLocaleString()}
    </p>
  </div>

  <table>
    <colgroup>
      <col class="c1"/><col class="c2"/><col class="c3"/><col class="c4"/>
      <col class="c5"/><col class="c6"/><col class="c7"/><col class="c8"/>
      <col class="c9"/><col class="c10"/><col class="c11"/><col class="c12"/>
      <col class="c13"/><col class="c14"/>
    </colgroup>
    <thead>
      <tr>
        <th>Case No</th>
        <th>Nature of Case</th>
        <th>Title/Tax Dec</th>
        <th>Belonging / Filing Party</th>
        <th>Opposing / Defending Party</th>
        <th>Location</th>
        <th>Date Filled</th>
        <th>Date Decided</th>
        <th>Date of Appeal</th>
        <th>MR Date Resolution</th>
        <th>MR Date Received</th>
        <th>Date of Finality</th>
        <th>Winning Party</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="sig-wrap">
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-label">Signature over Printed Name</div>
      <div class="sig-sub">Prepared by</div>
    </div>
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-label">Signature over Printed Name</div>
      <div class="sig-sub">Approved by</div>
    </div>
  </div>

  <script>window.onload = () => window.print();<\/script>
</body>
</html>`);
    win.document.close();
  }

  printSingleCase(caseData, paperSize = "legal", format = "table", bw = false) {
    const win = window.open("", "_blank");
    const html = format === "document"
      ? this._buildDocumentHTML(caseData, paperSize, bw)
      : this._buildSingleTableHTML(caseData, paperSize, bw);
    win.document.write(html);
    win.document.close();
  }

  _buildSingleTableHTML(caseData, paperSize = "legal", bw = false) {
    // Reuse the bulk print HTML builder with a single case
    const label = `Case #${caseData.caseNo || "N/A"}`;
    const pageSizeCSS   = { legal:"8.5in 13in", letter:"8.5in 11in", a4:"210mm 297mm" };
    const pageSizeLabel = { legal:"Long (8.5×13)", letter:"Short (8.5×11)", a4:"A4" };
    const cssSize = pageSizeCSS[paperSize] || pageSizeCSS.legal;
    const statusBg    = { Pending:"#fff3cd", Resolved:"#d4edda", Closed:"#f8d7da" };
    const statusColor = { Pending:"#856404", Resolved:"#155724", Closed:"#721c24" };
    const esc = v => (v == null ? "-" : String(v)).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    const c = caseData;
    const s = c.status || "";
    const bp = c.belongingParty; const op = c.opposingParty;
    const bRole = bp?.role || bp?.roles?.join(", ") || "";
    const oRole = op?.role || op?.roles?.join(", ") || "";
    const sBg  = statusBg[s]  || "transparent";
    const sClr = statusColor[s] || "#333";
    const row = `<tr style="background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact">
      <td>${esc(c.caseNo)}</td><td>${esc(c.nature)}</td><td>${esc(c.taxDec)}</td>
      <td>${esc(bp?.name)}${bRole?`<br><span class="sub">(${esc(bRole)})</span>`:""}</td>
      <td>${esc(op?.name)}${oRole?`<br><span class="sub">(${esc(oRole)})</span>`:""}</td>
      <td>${esc(c.location)}</td><td>${esc(this._fmtDate(c.dateFilled||c.dateFiled))}</td>
      <td>${esc(this._fmtDate(c.dateDecided))}</td><td>${esc(this._fmtDate(c.dateOfAppeal))}</td>
      <td>${esc(this._fmtDate(c.mrDateResolution))}</td><td>${esc(this._fmtDate(c.mrDateReceived))}</td>
      <td>${esc(this._fmtDate(c.dateOfFinality))}</td><td>${esc(c.winningParty)}</td>
      <td><span style="display:inline-block;background:${sBg};color:${sClr};padding:1px 5px;border-radius:8px;font-weight:700;font-size:7px;white-space:nowrap;-webkit-print-color-adjust:exact;print-color-adjust:exact">${esc(s)||"-"}</span></td>
    </tr>`;
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>CSLTVS — ${label}</title>
<style>*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}body{font-family:"Segoe UI",Arial,sans-serif;font-size:8px;color:#111;padding:8mm}.hdr{margin-bottom:6px}.hdr h2{font-size:12px;color:#0c6d38;margin-bottom:2px}.hdr p{font-size:7.5px;color:#555}table{width:100%;border-collapse:collapse;table-layout:fixed}col.c1{width:3%}col.c2{width:13%}col.c3{width:3%}col.c4{width:5%}col.c5{width:5%}col.c6{width:5%}col.c7{width:4%}col.c8{width:4%}col.c9{width:4%}col.c10{width:4%}col.c11{width:4%}col.c12{width:4%}col.c13{width:5%}col.c14{width:5%}thead tr{background:${bw?"transparent":"#0c6d38"};color:${bw?"#111":"#fff"};-webkit-print-color-adjust:exact;print-color-adjust:exact}th{padding:4px 3px;font-size:7.5px;font-weight:700;text-align:center;border:${bw?"1px solid #ccc":"1px solid #0a5a2e"};border-top:${bw?"2.5px solid #111":"1px solid #0a5a2e"};border-bottom:${bw?"2.5px solid #111":"1px solid #0a5a2e"};vertical-align:middle;line-height:1.2;word-break:break-word}td{padding:3px 4px;font-size:7.5px;border:1px solid #ccc;vertical-align:top;line-height:1.3;word-break:break-word;hyphens:auto}.sub{font-size:7px;color:#555}.sig-wrap{display:flex;justify-content:space-around;margin-top:16mm}.sig-block{width:180px;text-align:center}.sig-line{border-top:1px solid #111;margin-bottom:3px}.sig-label{font-size:8px;font-weight:700;color:#111}.sig-sub{font-size:7.5px;color:#444;margin-top:2px}@page{size:${cssSize} landscape;margin:8mm}@media print{body{padding:0}thead{display:table-header-group}tbody tr{page-break-inside:avoid}}</style>
</head><body>
<div class="hdr"><h2>CSLTVS Case Details — ${label}</h2><p>Paper: ${pageSizeLabel[paperSize]||pageSizeLabel.legal} &bull; Printed: ${new Date().toLocaleString()}</p></div>
<table><colgroup><col class="c1"/><col class="c2"/><col class="c3"/><col class="c4"/><col class="c5"/><col class="c6"/><col class="c7"/><col class="c8"/><col class="c9"/><col class="c10"/><col class="c11"/><col class="c12"/><col class="c13"/><col class="c14"/></colgroup>
<thead><tr><th>Case No</th><th>Nature of Case</th><th>Title/Tax Dec</th><th>Belonging / Filing Party</th><th>Opposing / Defending Party</th><th>Location</th><th>Date Filled</th><th>Date Decided</th><th>Date of Appeal</th><th>MR Date Resolution</th><th>MR Date Received</th><th>Date of Finality</th><th>Winning Party</th><th>Status</th></tr></thead>
<tbody>${row}</tbody></table>
<div class="sig-wrap">
  <div class="sig-block"><div class="sig-line"></div><div class="sig-label">Signature over Printed Name</div><div class="sig-sub">Prepared by</div></div>
  <div class="sig-block"><div class="sig-line"></div><div class="sig-label">Signature over Printed Name</div><div class="sig-sub">Approved by</div></div>
</div>
<script>window.onload=()=>window.print();<\/script></body></html>`;
  }

  _buildDocumentHTML(c, paperSize = "legal", bw = false) {
    const pageSizeCSS   = { legal:"8.5in 13in", letter:"8.5in 11in", a4:"210mm 297mm" };
    const pageSizeLabel = { legal:"Long (8.5×13)", letter:"Short (8.5×11)", a4:"A4" };
    const cssSize = pageSizeCSS[paperSize] || pageSizeCSS.legal;
    const esc = v => (v == null ? "—" : String(v)).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    const bp = c.belongingParty; const op = c.opposingParty;
    const bRole = bp?.role || bp?.roles?.join(", ") || "";
    const oRole = op?.role || op?.roles?.join(", ") || "";
    const statusColors = { Pending:"#856404", Resolved:"#155724", Closed:"#721c24" };
    const statusBgs    = { Pending:"#fff3cd", Resolved:"#d4edda", Closed:"#f8d7da" };
    const s = c.status || "";
    const accentColor = bw ? "#111" : "#0c6d38";
    const row = (label, value) => value && value !== "—"
      ? `<tr><td class="lbl">${label}</td><td class="val">${esc(value)}</td></tr>` : "";

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<title>Case #${esc(c.caseNo)} — CSLTVS</title>
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{font-family:"Segoe UI",Arial,sans-serif;font-size:11px;color:#111;padding:16mm 20mm;}
  .doc-header{text-align:center;margin-bottom:20px;border-bottom:2px solid ${accentColor};padding-bottom:12px;}
  .doc-header h1{font-size:16px;color:${accentColor};margin-bottom:4px;}
  .doc-header p{font-size:10px;color:#666;}
  .case-no{font-size:22px;font-weight:900;color:${accentColor};text-align:center;margin:12px 0 4px;}
  .status-badge{display:inline-block;padding:3px 14px;border-radius:999px;font-size:11px;font-weight:700;
    background:${bw?"transparent":statusBgs[s]||"#eee"};color:${bw?"#111":statusColors[s]||"#333"};
    border:${bw?"1.5px solid #111":"none"};
    -webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .status-wrap{text-align:center;margin-bottom:20px;}
  .section-title{font-size:11px;font-weight:700;color:${accentColor};text-transform:uppercase;
    letter-spacing:.5px;margin:16px 0 6px;border-bottom:${bw?"2px solid #111":"1px solid #e0e0e0"};padding-bottom:4px;}
  table{width:100%;border-collapse:collapse;margin-bottom:8px;}
  .lbl{width:38%;font-weight:700;color:#555;padding:5px 8px;vertical-align:top;font-size:10px;text-transform:uppercase;letter-spacing:.3px;}
  .val{padding:5px 8px;color:#111;font-size:11px;vertical-align:top;}
  tr:nth-child(even){background:${bw?"transparent":"#f9f9f9"};-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .party-box{border:1px solid ${bw?"#111":"#e0e0e0"};border-radius:6px;padding:10px 12px;margin-bottom:8px;}
  .party-title{font-size:10px;font-weight:700;color:${accentColor};margin-bottom:4px;text-transform:uppercase;}
  .party-name{font-size:13px;font-weight:700;color:#1a1a1a;}
  .party-role{font-size:10px;color:#666;margin-top:2px;}
  .sig-wrap{display:flex;justify-content:space-around;margin-top:24mm;}
  .sig-block{width:200px;text-align:center;}
  .sig-line{border-top:1px solid #111;margin-bottom:4px;}
  .sig-label{font-size:10px;font-weight:700;}
  .sig-sub{font-size:9px;color:#555;margin-top:2px;}
  .footer{text-align:center;font-size:9px;color:#aaa;margin-top:16px;}
  @page{size:${cssSize} portrait;margin:16mm 20mm;}
  @media print{body{padding:0}tr{page-break-inside:avoid}}
</style></head><body>
<div class="doc-header">
  <h1>CSLTVS — Case Record</h1>
  <p>Department of Agrarian Reform Adjudication Board</p>
</div>
<div class="case-no">Case No. ${esc(c.caseNo)}</div>
<div class="status-wrap"><span class="status-badge">${esc(s)||"—"}</span></div>
<div class="section-title">Case Information</div>
<table>${row("Nature of Case",c.nature)}${row("Title / Tax Declaration",c.taxDec)}${row("Location",c.location)}</table>
<div class="section-title">Parties Involved</div>
${bp?.name?`<div class="party-box"><div class="party-title">Belonging / Filing Party</div><div class="party-name">${esc(bp.name)}</div>${bRole?`<div class="party-role">${esc(bRole)}</div>`:""}</div>`:""}
${op?.name?`<div class="party-box"><div class="party-title">Opposing / Defending Party</div><div class="party-name">${esc(op.name)}</div>${oRole?`<div class="party-role">${esc(oRole)}</div>`:""}</div>`:""}
<div class="section-title">Key Dates</div>
<table>${row("Date Filed", this._fmtDate(c.dateFilled||c.dateFiled))}${row("Date of Decision", this._fmtDate(c.dateDecided))}${row("Date of Appeal", this._fmtDate(c.dateOfAppeal))}${row("MR Date Resolution", this._fmtDate(c.mrDateResolution))}${row("MR Date Received", this._fmtDate(c.mrDateReceived))}${row("Date of Finality", this._fmtDate(c.dateOfFinality))}</table>
<div class="section-title">Outcome</div>
<table>${row("Winning Party",c.winningParty)}</table>
<div class="section-title">Record Details</div>
<table>${row("Created By",c.createdBy)}${row("Updated By",c.updatedBy)}</table>
<div class="sig-wrap"><div class="sig-block">
  <div class="sig-line"></div>
  <div class="sig-label">Signature over Printed Name</div>
  <div class="sig-sub">Prepared by</div>
</div><div class="sig-block">
  <div class="sig-line"></div>
  <div class="sig-label">Signature over Printed Name</div>
  <div class="sig-sub">Approved by</div>
</div></div>
<div class="footer">Printed: ${new Date().toLocaleString()} &bull; ${pageSizeLabel[paperSize]||pageSizeLabel.legal}</div>
<script>window.onload=()=>window.print();<\/script>
</body></html>`;
  }
  /* =====================
     MODAL FUNCTIONS
  ===================== */
  _fmtDate(dateStr) {
    if (!dateStr) return "-";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts;
    return `${m}/${d}/${y}`;
  }

  showCaseDetails(caseData) {
    const modal = this.shadowRoot.getElementById("caseDetailsModal");
    const modalCaseNo = this.shadowRoot.getElementById("modalCaseNo");
    const modalBody = this.shadowRoot.getElementById("modalBody");

    if (!modal || !modalBody) return;

    modalCaseNo.textContent = `Case #${caseData.caseNo || "N/A"}`;
    this._currentCase = caseData;

    // Status badge colors
    const statusBg    = { Pending: "#fff3cd", Resolved: "#d4edda", Closed: "#f8d7da" };
    const statusColor = { Pending: "#856404", Resolved: "#155724", Closed: "#721c24" };
    const s = caseData.status || "";
    const statusBadge = s
      ? `<span style="display:inline-block;padding:3px 12px;border-radius:999px;font-size:12px;font-weight:700;
           background:${statusBg[s] || "#eee"};color:${statusColor[s] || "#333"};">${s}</span>`
      : "N/A";

    // Attachment cards helper
    const renderAttachmentCards = (attachments) => {
      if (!Array.isArray(attachments) || !attachments.length) return "";
      const cards = attachments.map(a => {
        const ext     = (a.name || "").split(".").pop().toLowerCase();
        const isImage = ["jpg","jpeg","png","gif","webp","svg"].includes(ext);
        const isPdf   = ext === "pdf";
        const isDoc   = ["doc","docx"].includes(ext);
        let icon = "📄";
        if (isPdf) icon = "📕";
        if (isDoc) icon = "📘";
        const preview = isImage
          ? `<img src="${a.url}" alt="${a.name}" loading="lazy"
               style="width:100px;height:72px;object-fit:cover;border-radius:6px;border:1px solid #e0e0e0;" />`
          : `<span style="font-size:38px;line-height:1;">${icon}</span>`;
        const safeUrl  = encodeURIComponent(a.url);
        const safeName = encodeURIComponent(a.name);
        return `
          <div style="display:flex;flex-direction:column;align-items:center;gap:6px;width:120px;
               border:1.5px solid #d1e7dd;border-radius:10px;padding:8px;background:#f8fffe;
               transition:all .2s;cursor:pointer;overflow:hidden;">
            ${preview}
            <span style="font-size:11px;color:#333;font-weight:600;text-align:center;word-break:break-all;
                  max-width:100%;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;"
                  title="${a.name}">${a.name}</span>
            <span style="font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.5px;">${ext}</span>
            <button class="attach-view-btn"
              data-url="${safeUrl}" data-name="${safeName}" data-ext="${ext}"
              type="button"
              style="width:100%;padding:5px 0;background:#0c6d38;color:white;border:none;border-radius:6px;
                     font-size:11px;font-weight:700;cursor:pointer;letter-spacing:.3px;">
              👁 View
            </button>
          </div>`;
      }).join("");
      return `<div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:10px;">${cards}</div>`;
    };

    const details = [
      { label: "Case No",           value: caseData.caseNo   || "N/A" },
      { label: "Nature of the Case",value: caseData.nature   || "N/A", fullWidth: true },
      { label: "Title / Tax Dec",   value: caseData.taxDec   || "N/A" },
      {
        label: "Belonging / Filing Party",
        value: caseData.belongingParty
          ? `${caseData.belongingParty.name} (${caseData.belongingParty.role || caseData.belongingParty.roles?.join(", ") || "N/A"})`
          : "N/A",
        fullWidth: true
      },
      {
        label: "Opposing / Defending Party",
        value: caseData.opposingParty
          ? `${caseData.opposingParty.name} (${caseData.opposingParty.role || caseData.opposingParty.roles?.join(", ") || "N/A"})`
          : "N/A",
        fullWidth: true
      },
      { label: "Location",          value: caseData.location || "N/A", isLocation: true },
      { label: "Date Filed",        value: this._fmtDate(caseData.dateFilled || caseData.dateFiled),
        attachments: caseData.dateFilledAttachments },
      { label: "Date of Decision",  value: this._fmtDate(caseData.dateDecided),      attachments: caseData.dateDecidedAttachments },
      { label: "MR Date Received",  value: this._fmtDate(caseData.mrDateReceived),   attachments: caseData.mrDateReceivedAttachments },
      { label: "MR Date Resolution",value: this._fmtDate(caseData.mrDateResolution), attachments: caseData.mrDateResolutionAttachments },
      { label: "Date of Appeal",    value: this._fmtDate(caseData.dateOfAppeal),     attachments: caseData.dateOfAppealAttachments },
      { label: "Date of Finality",  value: this._fmtDate(caseData.dateOfFinality),   attachments: caseData.dateOfFinalityAttachments },
      { label: "Winning Party",     value: caseData.winningParty || "N/A" },
      { label: "Status",            value: statusBadge, raw: true },
      { label: "Created By",        value: caseData.createdBy || "N/A" },
      { label: "Updated By",        value: caseData.updatedBy || "N/A" },
    ];

    modalBody.innerHTML = details.map(d => `
      <div class="detail-group ${d.fullWidth ? "detail-full-width" : ""}">
        <div class="detail-label">${d.label}</div>
        <div class="detail-value">
          ${d.raw ? d.value : (d.value || "N/A")}
          ${d.isLocation && d.value !== "N/A"
            ? `<br><button class="location-map-btn detail-map-btn" data-loc="${d.value}" type="button">📍 View on Map</button>`
            : ""}
          ${d.attachments ? renderAttachmentCards(d.attachments) : ""}
        </div>
      </div>
    `).join("");

    // Delegate button clicks inside the modal body
    modalBody.addEventListener("click", (e) => {
      const attachBtn = e.target.closest(".attach-view-btn");
      if (attachBtn) {
        const url  = decodeURIComponent(attachBtn.dataset.url);
        const name = decodeURIComponent(attachBtn.dataset.name);
        const ext  = attachBtn.dataset.ext;
        this._openFileViewer(url, name, ext);
        return;
      }
      const mapBtn = e.target.closest(".detail-map-btn");
      if (mapBtn) this._openMapModal(mapBtn.dataset.loc);
    });

    modal.classList.add("active");
  }

  _openFileViewer(url, name, ext) {
    // Reuse the existing file-viewer modal in the shadow root if present,
    // otherwise fall back to opening in a new tab.
    const modal       = this.shadowRoot.getElementById("fileViewerModal");
    const titleEl     = this.shadowRoot.getElementById("fileViewerTitle");
    const bodyEl      = this.shadowRoot.getElementById("fileViewerBody");
    const openBtn     = this.shadowRoot.getElementById("fileViewerOpenBtn");
    const downloadBtn = this.shadowRoot.getElementById("fileViewerDownloadBtn");

    if (!modal || !bodyEl) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }

    const isImage = ["jpg","jpeg","png","gif","webp","svg"].includes(ext);
    const isPdf   = ext === "pdf";
    const isDoc   = ["doc","docx"].includes(ext);

    if (titleEl)     titleEl.textContent = name;
    if (openBtn)     openBtn.href = url;
    if (downloadBtn) { downloadBtn.href = url; downloadBtn.setAttribute("download", name); }

    if (isImage) {
      bodyEl.innerHTML = `<img src="${url}" alt="${name}"
        style="max-width:100%;max-height:calc(92vh - 80px);object-fit:contain;border-radius:8px;" />`;
    } else if (isPdf) {
      bodyEl.innerHTML = `<iframe src="${url}" title="${name}"
        style="width:100%;height:calc(92vh - 80px);border:none;border-radius:8px;background:white;"></iframe>`;
    } else if (isDoc) {
      const gUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
      bodyEl.innerHTML = `<iframe src="${gUrl}" title="${name}"
        style="width:100%;height:calc(92vh - 80px);border:none;border-radius:8px;background:white;"></iframe>`;
    } else {
      bodyEl.innerHTML = `
        <div style="text-align:center;color:#aaa;padding:40px 20px;">
          <div style="font-size:56px;margin-bottom:12px;">📄</div>
          <p style="font-weight:700;color:#ddd;font-size:15px;word-break:break-all;">${name}</p>
          <p style="font-size:14px;margin:6px 0;">This file type (<strong>.${ext}</strong>) cannot be previewed.</p>
          <p style="font-size:14px;">Use the <strong>Download</strong> or <strong>Open</strong> buttons above.</p>
        </div>`;
    }

    modal.classList.add("active");
  }

  _closeFileViewer() {
    const modal  = this.shadowRoot.getElementById("fileViewerModal");
    const bodyEl = this.shadowRoot.getElementById("fileViewerBody");
    if (modal)  modal.classList.remove("active");
    if (bodyEl) bodyEl.innerHTML = "";
  }

  _ensureLeaflet() {
    return new Promise((resolve, reject) => {
      const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      if (!this.shadowRoot.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
        const link = document.createElement("link");
        link.rel = "stylesheet"; link.href = LEAFLET_CSS;
        this.shadowRoot.appendChild(link);
      }
      if (window.L) { resolve(); return; }
      const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      const existing = document.querySelector(`script[src="${LEAFLET_JS}"]`);
      if (existing) { existing.addEventListener("load", resolve); existing.addEventListener("error", reject); return; }
      const script = document.createElement("script");
      script.src = LEAFLET_JS; script.onload = resolve; script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async _openMapModal(locationStr) {
    if (!locationStr) return;
    const modal     = this.shadowRoot.getElementById("caseMapModal");
    const titleEl   = this.shadowRoot.getElementById("caseMapTitle");
    const badgeEl   = this.shadowRoot.getElementById("caseMapBadge");
    const container = this.shadowRoot.getElementById("caseMapContainer");
    if (!modal || !container) return;
    if (titleEl) titleEl.textContent = locationStr;
    if (badgeEl) badgeEl.textContent = locationStr;
    modal.classList.add("active");
    try { await this._ensureLeaflet(); } catch (err) {
      container.innerHTML = `<div style="padding:20px;text-align:center;color:#c00;">Failed to load map library.</div>`;
      return;
    }
    const L = window.L;
    if (this._leafletMap) { this._leafletMap.remove(); this._leafletMap = null; }
    container.innerHTML = "";
    container.style.height = "420px";
    const map = L.map(container, { center: [12.8797, 121.7740], zoom: 6 });
    this._leafletMap = map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    try {
      const res  = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationStr + ", Masbate, Philippines")}&format=json&limit=1`, { headers: { "Accept-Language": "en" } });
      const data = await res.json();
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const latlng = [parseFloat(lat), parseFloat(lon)];
        map.setView(latlng, 13);
        const greenIcon = L.divIcon({
          className: "",
          html: `<div style="width:32px;height:32px;background:#0c6d38;border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.35);"></div>`,
          iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -36],
        });
        L.marker(latlng, { icon: greenIcon }).addTo(map)
          .bindPopup(`<strong>${locationStr}</strong><br><small>${display_name}</small>`).openPopup();
        if (badgeEl) badgeEl.textContent = display_name || locationStr;
      }
    } catch (err) { console.warn("Geocoding failed:", err); }
    setTimeout(() => map.invalidateSize(), 100);
  }

  _closeMapModal() {
    const modal = this.shadowRoot.getElementById("caseMapModal");
    if (modal) modal.classList.remove("active");
    if (this._leafletMap) { this._leafletMap.remove(); this._leafletMap = null; }
  }

  closeModal() {
    const modal = this.shadowRoot.getElementById("caseDetailsModal");
    if (modal) modal.classList.remove("active");
  }
}

customElements.define("view-cases", ViewCases);
