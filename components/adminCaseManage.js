import { db } from "../scripts/firebaseConfig.js";
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { darkModeCSS } from "../scripts/darkMode.js";

class AdminCaseManage extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.pendingDeleteId = null;
    this._notificationTimer = null;
    this.allCases = []; // Store all cases for filtering
    this.currentPage = 1;
    this.itemsPerPage = 10;
    this.sortOrder = "newest"; // "newest", "oldest", "dateFilled-asc", "dateFilled-desc"
    this.searchColumn = "all";
    this.zoomLevel = 1; // Add zoom level
  }

  connectedCallback() {
    this.render();
    this.loadCases();
  }


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
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 8px 24px rgba(0,0,0,.08);
        }

        h2 { color: #0c6d38; margin-bottom: 20px; }

        form { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px; }

        .field { display:flex; flex-direction:column; gap:6px; }

        label { font-size:13px; font-weight:600; color:#444; }

        input, textarea, select {
          padding:10px 12px;
          border-radius:8px;
          border:1px solid #ccc;
          font-size:14px;
          transition: border-color .2s, box-shadow .2s;
        }

        input:focus, textarea:focus, select:focus {
          outline:none; border-color:#0c6d38; box-shadow:0 0 0 2px rgba(12,109,56,.15);
        }

        textarea { resize: vertical; min-height:70px; max-height:150px; }

        select {
          appearance:none;
          background-image:
            linear-gradient(45deg, transparent 50%, #555 50%),
            linear-gradient(135deg, #555 50%, transparent 50%);
          background-position:
            calc(100% - 20px) calc(50% - 4px),
            calc(100% - 15px) calc(50% - 4px);
          background-size:5px 5px;
          background-repeat:no-repeat;
        }

        /* Parties Section */
        .parties-container {
          grid-column: 1 / -1;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
        }

        .party-section {
          border: 2px solid #e0e0e0;
          border-radius: 12px;
          padding: 16px;
          background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%);
          transition: all 0.3s ease;
        }

        .party-section:hover {
          border-color: #0c6d38;
          box-shadow: 0 4px 12px rgba(12,109,56,0.1);
          transform: translateY(-2px);
        }

        .party-section.active {
          border-color: #0c6d38;
          background: linear-gradient(180deg, #f0f9f4 0%, #ffffff 100%);
          box-shadow: 0 4px 16px rgba(12,109,56,0.15);
        }

        .party-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          padding-bottom: 10px;
          border-bottom: 2px solid #e8e8e8;
        }

        .party-header label {
          font-size: 14px;
          font-weight: 700;
          color: #0c6d38;
          margin: 0;
          flex: 1;
        }

        .party-icon {
          font-size: 18px;
        }

        .party-name-input {
          width: 100%;
          padding: 10px 12px;
          border-radius: 8px;
          border: 2px solid #ddd;
          font-size: 14px;
          transition: all 0.2s;
          margin-bottom: 12px;
        }

        .party-name-input:focus {
          outline: none;
          border-color: #0c6d38;
          box-shadow: 0 0 0 3px rgba(12,109,56,.1);
          background: #fff;
        }

        .party-roles {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 10px;
        }

        .role-checkbox-group {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          background: white;
          border-radius: 6px;
          border: 1px solid #e0e0e0;
          transition: all 0.2s;
          cursor: pointer;
        }

        .role-checkbox-group:hover {
          background: #f8f9fa;
          border-color: #0c6d38;
        }

        .role-checkbox-group input[type="radio"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: #0c6d38;
          flex-shrink: 0;
        }

        .role-checkbox-group input[type="radio"]:checked + label {
          color: #0c6d38;
          font-weight: 600;
        }

        .role-checkbox-group label {
          font-size: 13px;
          font-weight: 500;
          color: #555;
          cursor: pointer;
          margin: 0;
          flex: 1;
          user-select: none;
        }

        .add-btn {
          background:#0c6d38;
          color:white;
          border:none;
          border-radius:10px;
          padding:12px;
          cursor:pointer;
          font-weight:600;
          grid-column:1 / -1;
        }


        .add-btn:hover { 
          // background:#095a2e;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          transform: translateY(-3px);
          background: linear-gradient(180deg,#f8fff8,#eef9ef);
          color: #0c6d38;
          border: 1px solid #0c6d38;
          transition: 0.3s ease-in-out;
        }

        /* Sticky side scroll buttons */
        .table-scroll-wrap {
          position: relative;
          padding: 0 20px;
        }
        .table-wrapper { overflow-x: auto; }

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

        thead { background:#0c6d38; color:white; text-align:center; color: white;  font-size: 14px;  font-weight: 900; }

        th, td { 
          padding:12px; 
          // border-bottom:1px solid #eee; 
          borrder-top:1px solid #eee;
          font-size:14px; 
          text-align: left;
          vertical-align: middle;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        /* Set specific widths for columns to prevent overflow */
        th:nth-child(1), td:nth-child(1) { width: 120px; } /* Case No */
        th:nth-child(2), td:nth-child(2) { width: 200px; max-width: 200px; } /* Nature - fixed width */
        th:nth-child(3), td:nth-child(3) { width: 120px; } /* Tax Dec */
        th:nth-child(4), td:nth-child(4) { width: 150px; } /* Belonging Party */
        th:nth-child(5), td:nth-child(5) { width: 150px; } /* Opposing Party */
        th:nth-child(6), td:nth-child(6) { width: 120px; } /* Location */
        th:nth-child(7), td:nth-child(7) { width: 110px; } /* Date Filed */
        th:nth-child(8), td:nth-child(8) { width: 110px; } /* Date of Decision */
        th:nth-child(9), td:nth-child(9) { width: 110px; } /* MR Date Received */
        th:nth-child(10), td:nth-child(10) { width: 110px; } /* MR Date Resolution */
        th:nth-child(11), td:nth-child(11) { width: 110px; } /* Date of Appeal */
        th:nth-child(12), td:nth-child(12) { width: 110px; } /* Date of Finality */
        th:nth-child(13), td:nth-child(13) { width: 120px; } /* Winning Party */
        th:nth-child(14), td:nth-child(14) { width: 100px; } /* Status */
        th:nth-child(15), td:nth-child(15) { width: 130px; } /* Created By */
        th:nth-child(16), td:nth-child(16) { width: 130px; } /* Updated By */
        th:nth-child(17), td:nth-child(17) { width: 140px; text-align: center; } /* Actions */

        tbody tr { position: relative; }

        tbody tr td {
          // border-bottom: 1px solid #eee;
          border-top: 1px solid #eee;
        }

        tbody tr:hover { 
          background: rgba(12,109,56,.08); 
          cursor: pointer;
        }
        
        tbody tr:hover td { background: rgba(12,109,56,.08); }

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

        .actions { 
          display:flex; 
          gap:6px; 
          justify-content: center; 
          align-items: center;  
          text-align: center; 
          height: 100%;
          min-height: 40px;
        }

        .edit-btn { background: #007BFF;}
        .delete-btn { background: #a11111; }

        .actions button { color:white; border:none; border-radius:6px; padding:6px 10px; cursor:pointer; font-size:12px; transition: all 0.2s; }
        .actions button:hover { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
        
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

        /* ================= MODAL ================= */
        .modal {
          display:none;
          position:fixed;
          inset:0;
          background:rgba(0,0,0,.5);
          z-index:1000;
          align-items:center;
          justify-content:center;
        }
        .modal-content {
          background:white;
          border-radius:16px;
          padding:20px;
          width:90%;
          max-width:600px;
          max-height:90vh;
          overflow-y:auto;
        }
        .modal-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
        .close { cursor:pointer; font-size:24px; padding:6px; border-radius:6px; transition: transform .12s ease, background .12s ease; }
        .close:hover { transform: scale(1.08); background: rgba(0,0,0,0.04); }
        .close:focus { outline: 3px solid rgba(12,109,56,0.12); }
        .close.cancel-btn {
          font-size: 14px;
          padding: 10px 20px;
          background: linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%);
          color: #495057;
          border: 1.5px solid #dee2e6;
          font-weight: 600;
          border-radius: 8px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .close.cancel-btn:hover {
          background: linear-gradient(180deg, #f8f9fa 0%, #e9ecef 100%);
          border-color: #adb5bd;
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.12);
          color: #212529;
        }
        .close.cancel-btn:active {
          transform: translateY(0) scale(0.98);
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .close.cancel-btn:focus {
          outline: none;
          border-color: #0c6d38;
          box-shadow: 0 0 0 3px rgba(12,109,56,0.15);
        }

        .modal-body .field { margin-bottom:12px; }
        /* case number row */
        .case-input-row { display:flex; gap:8px; align-items:center; }
        .case-prefix { width:140px; max-width:40%; }
        .case-input { flex:1; }

        .save-btn {
          background: linear-gradient(180deg, #0c6d38 0%, #095a2e 100%);
          color:white;
          width:100%;
          padding:12px;
          border-radius:8px;
          border:none;
          cursor:pointer;
          font-weight: 600;
          font-size: 15px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 6px rgba(12,109,56,0.2);
        }
        .save-btn:hover {
          background: linear-gradient(180deg, #0e7d42 0%, #0c6d38 100%);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(12,109,56,0.3);
        }
        .save-btn:active {
          transform: translateY(0) scale(0.98);
          box-shadow: 0 1px 4px rgba(12,109,56,0.2);
        }
        .save-btn:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(12,109,56,0.3);
        }

        /* Delete confirmation modal styles (reused) */
        #confirmDeleteModal { display:none; position:fixed; inset:0; background:rgba(0,0,0,.7); z-index:1001; align-items:center; justify-content:center; }
        #confirmDeleteModal .modal-content { background:#fff; border-radius:12px; padding:24px; width:90%; max-width:400px; text-align:center; }
        #confirmDeleteModal .modal-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; }
        #confirmDeleteModal .close { cursor:pointer; font-size:20px; }
        #confirmDeleteModal .close.cancel-btn {
          font-size: 14px;
          padding: 10px 20px;
          background: linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%);
          color: #495057;
          border: 1.5px solid #dee2e6;
          font-weight: 600;
          border-radius: 8px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        #confirmDeleteModal .close.cancel-btn:hover {
          background: linear-gradient(180deg, #f8f9fa 0%, #e9ecef 100%);
          border-color: #adb5bd;
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.12);
          color: #212529;
        }
        #confirmDeleteModal .close.cancel-btn:active {
          transform: translateY(0) scale(0.98);
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        #confirmDeleteModal .close.cancel-btn:focus {
          outline: none;
          border-color: #0c6d38;
          box-shadow: 0 0 0 3px rgba(12,109,56,0.15);
        }
        #confirmDeleteModal .modal-body { margin-bottom:20px; color:#333; }
        #confirmDeleteModal button { padding:10px 16px; border-radius:8px; border:none; cursor:pointer; font-size:14px; transition:all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
        #confirmDeleteModal #cancelDeleteBtn { 
          background: linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%);
          color: #495057;
          flex:1;
          padding:12px;
          border-radius:8px;
          border:1.5px solid #dee2e6;
          font-weight: 600;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        #confirmDeleteModal #cancelDeleteBtn:hover { 
          background: linear-gradient(180deg, #f8f9fa 0%, #e9ecef 100%);
          border-color: #adb5bd;
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.12);
          color: #212529;
        }
        #confirmDeleteModal #cancelDeleteBtn:active { 
          transform: translateY(0) scale(0.98);
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        #confirmDeleteModal #cancelDeleteBtn:focus { 
          outline: none;
          border-color: #0c6d38;
          box-shadow: 0 0 0 3px rgba(12,109,56,0.15);
        }
        #confirmDeleteModal #confirmDeleteBtn { 
          background: linear-gradient(180deg, #dc3545 0%, #c82333 100%);
          color:white;
          flex:1;
          padding:12px;
          border-radius:8px;
          font-weight: 600;
          box-shadow: 0 2px 6px rgba(220,53,69,0.3);
        }
        #confirmDeleteModal #confirmDeleteBtn:hover { 
          background: linear-gradient(180deg, #e04655 0%, #dc3545 100%);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(220,53,69,0.4);
        }
        #confirmDeleteModal #confirmDeleteBtn:active {
          transform: translateY(0) scale(0.98);
          box-shadow: 0 1px 4px rgba(220,53,69,0.3);
        }
        #confirmDeleteModal #confirmDeleteBtn:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(220,53,69,0.3);
        }

        /* Notification modal */
        .notify-modal {
          display:none;
          position:fixed;
          inset:0;
          background: rgba(0,0,0,0.3);
          z-index:1100;
          align-items:center;
          justify-content:center;
        }
        .notify-modal .notify-box {
          background: #fff;
          padding: 18px 20px;
          border-radius: 12px;
          box-shadow: 0 14px 50px rgba(2,6,23,0.18);
          min-width: 260px;
          max-width: 92%;
          text-align: center;
        }
        .notify-box.success { border-left: 6px solid #0c6d38; }
        .notify-box .msg { font-weight:600; color:#0f172a; margin-bottom:10px; }
        .notify-box .ok { background:#0c6d38; color:#fff; padding:8px 12px; border-radius:8px; border:none; cursor:pointer; }

        /* Loading modal */
        .loading-modal {
          display:none;
          position:fixed;
          inset:0;
          background: rgba(0,0,0,0.35);
          z-index:1150;
          align-items:center;
          justify-content:center;
        }
        .loading-box {
          background: #fff;
          padding: 18px 22px;
          border-radius: 12px;
          box-shadow: 0 14px 50px rgba(2,6,23,0.18);
          display:flex;
          gap:12px;
          align-items:center;
        }
        .spinner {
          width:36px;
          height:36px;
          border-radius:50%;
          border:4px solid #eee;
          border-top-color: var(--primary-green, #0c6d38);
          animation: spin 1s linear infinite;
        }
        

        /* Search bar styles */
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
          transition: all 0.18s;
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
          box-shadow: 0 2px 6px rgba(12,109,56,0.25);
        }

        /* Sort Controls */
        .sort-controls {
          margin-bottom: 20px;
          margin-top: 20px;
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .sort-controls .zoom-controls { margin-left: auto; margin-bottom: 0; margin-top: 0; }

        .sort-label { font-weight:600; color:#333; font-size:14px; }

        /* Sort dropdown */
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

        /* Zoom Controls */
        .zoom-controls { display:flex; align-items:center; gap:6px; font-size:14px; }
        .zoom-controls label { font-weight:600; color:#333; font-size:13px; }
        .zoom-value { font-size:13px; font-weight:700; color:#0c6d38; min-width:36px; text-align:center; }
        .zoom-btn {
          width:32px; height:32px; border:1.5px solid #0c6d38; background:#fff; color:#0c6d38;
          border-radius:8px; cursor:pointer; font-size:16px; font-weight:700;
          display:flex; align-items:center; justify-content:center; transition:all .15s; flex-shrink:0;
        }
        .zoom-btn:hover { background:#0c6d38; color:#fff; }
        .zoom-btn:active { transform:scale(.92); }
        .zoom-reset-btn {
          padding:5px 10px; border:1.5px solid #ccc; background:#fff; color:#555;
          border-radius:8px; cursor:pointer; font-size:12px; font-weight:600; transition:all .15s;
        }
        .zoom-reset-btn:hover { border-color:#0c6d38; color:#0c6d38; }
        @media(max-width:768px) { .zoom-controls { display:none !important; } }

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
        #belongingPartyName, #opposingPartyName {
          width: 90%;
        }

       
        @keyframes spin { to { transform: rotate(360deg); } }
        .loading-text { font-weight:600; color:#0f172a; }

        .input-error {
          min-height: 16px;
          font-size: 12px;
          color: #b91c1c;
          margin-bottom: 4px;
        }

        /* Custom location autocomplete */
        .location-wrap { position: relative; }
        .location-dropdown {
          display: none;
          position: absolute;
          top: calc(100% + 4px);
          left: 0; right: 0;
          background: #fff;
          border: 1px solid #ccc;
          border-radius: 10px;
          box-shadow: 0 8px 24px rgba(0,0,0,.12);
          z-index: 600;
          max-height: 220px;
          overflow-y: auto;
        }
        .location-dropdown.open { display: block; }
        .loc-opt {
          padding: 9px 14px;
          font-size: 13px;
          cursor: pointer;
          color: #333;
          transition: background .12s;
        }
        .loc-opt:hover, .loc-opt.active { background: #f0f9f4; color: #0c6d38; font-weight: 600; }
        .loc-opt mark { background: none; color: #0c6d38; font-weight: 700; }
        .loc-empty { padding: 10px 14px; font-size: 13px; color: #999; }

        /* Case Details Modal */
        .details-modal {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          z-index: 999;
          align-items: center;
          justify-content: center;
        }

        .details-modal.active {
          display: flex;
        }

        .details-modal-content {
          background: white;
          border-radius: 16px;
          padding: 30px;
          width: 90%;
          max-width: 800px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }

        .details-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          padding-bottom: 12px;
          border-bottom: 2px solid #eee;
        }

        .details-modal-header h2 {
          margin: 0;
          color: #0c6d38;
          font-size: 22px;
        }

        .details-modal-close {
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

        .details-modal-close:hover {
          background: #f0f0f0;
          color: #333;
        }

        .details-modal-body {
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
          z-index: 1300;
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
          z-index: 1400;
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

        @media (max-width:600px) { 
          .details-modal-content {
            width: 95%;
            padding: 20px;
          }
          .details-modal-body {
            grid-template-columns: 1fr;
          }
          .detail-full-width {
            grid-column: 1;
          }
          table { min-width:700px; } 
          .pagination-container {
            flex-direction: column;
            align-items: stretch;
          }
          .pagination-controls {
            justify-content: center;
            flex-wrap: wrap;
          }
          .party-item {
            grid-template-columns: 1fr;
            gap: 8px;
          }
          .party-roles {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
          .parties-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
          .add-party-btn {
            width: 100%;
          }
        }
        ${darkModeCSS}
      </style>

      <div class="card">
        <h2>🛠 Admin Case Management</h2>

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
          <div class="zoom-controls">
            <label>Zoom:</label>
            <button class="zoom-btn" id="zoomOut" title="Zoom out">−</button>
            <span class="zoom-value" id="zoomValue">100%</span>
            <button class="zoom-btn" id="zoomIn" title="Zoom in">+</button>
            <button class="zoom-reset-btn" id="zoomReset">Reset</button>
          </div>
        </div>

        <div class="table-scroll-wrap">
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="caseTableBody"></tbody>
          </table>
          </div><!-- end table-wrapper -->
        </div><!-- end table-scroll-wrap -->

        <!-- Pagination -->
        <div class="pagination-container" id="paginationContainer" style="display: none;">
          <div class="pagination-info">
            <span id="paginationInfo">Showing 0-0 of 0</span>
            <div class="items-per-page">
              <label for="itemsPerPage">Items per page:</label>
              <select id="itemsPerPage">
                <option value="5">5</option>
                <option value="10" selected>10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>
          <div class="pagination-controls" id="paginationControls"></div>
        </div>
      </div>

      <!-- Delete confirmation modal -->
      <div class="modal" id="confirmDeleteModal" aria-hidden="true" style="display:none;align-items:center;justify-content:center;">
        <div class="modal-content" style="max-width:420px;">
          <div class="modal-header">
            <h3>Confirm Delete</h3>
            <button class="close cancel-btn" id="closeConfirmDelete" type="button" role="button" tabindex="0" aria-label="Cancel delete">Close</button>
          </div>
          <div class="modal-body" id="confirmDeleteBody" style="color:#333;">
            Are you sure you want to delete this case?
          </div>
          <div style="display:flex;gap:8px;margin-top:14px;">
            <button id="cancelDeleteBtn" type="button" aria-label="Cancel delete">Cancel</button>
            <button id="confirmDeleteBtn" type="button" aria-label="Confirm delete">Delete</button>
          </div>
        </div>
      </div>
    
      <!-- Notification modal -->
      <div class="notify-modal" id="notificationModal" aria-hidden="true">
        <div class="notify-box success" id="notifyBox">
          <div class="msg" id="notifyMsg">Success</div>
          <button class="ok" id="notifyOk">OK</button>
        </div>
      </div>

      <!-- Loading modal -->
      <div class="loading-modal" id="loadingModal" aria-hidden="true">
        <div class="loading-box">
          <div class="spinner" aria-hidden="true"></div>
          <div class="loading-text" id="loadingText">Processing...</div>
        </div>
      </div>

      <!-- Case Details Modal -->
      <div class="details-modal" id="caseDetailsModal">
        <div class="details-modal-content">
          <div class="details-modal-header">
            <h2 id="detailsModalCaseNo">Case Details</h2>
            <button class="details-modal-close" id="detailsModalClose">&times;</button>
          </div>
          <div class="details-modal-body" id="detailsModalBody">
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

    // Details modal event handlers
    const detailsModal = this.shadowRoot.getElementById("caseDetailsModal");
    const detailsModalClose = this.shadowRoot.getElementById("detailsModalClose");
    
    if (detailsModalClose) {
      detailsModalClose.addEventListener("click", () => this.closeDetailsModal());
    }

    // Close details modal when clicking outside
    if (detailsModal) {
      detailsModal.addEventListener("click", (e) => {
        if (e.target === detailsModal) {
          this.closeDetailsModal();
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

    // wire delete-confirmation modal buttons
    const cancelBtn = this.shadowRoot.getElementById("cancelDeleteBtn");
    const confirmBtn = this.shadowRoot.getElementById("confirmDeleteBtn");
    const closeConfirm = this.shadowRoot.getElementById("closeConfirmDelete");
    if (cancelBtn) cancelBtn.addEventListener("click", () => this._hideConfirmDelete());
    if (closeConfirm) closeConfirm.addEventListener("click", () => this._hideConfirmDelete());
    if (confirmBtn) confirmBtn.addEventListener("click", async () => {
      if (!this.pendingDeleteId) return this._hideConfirmDelete();
      try {
        await deleteDoc(doc(db, "cases", this.pendingDeleteId));
        this._hideConfirmDelete();
        await this.loadCases();
        this._showNotification("Case deleted successfully");
      } catch (err) {
        console.error("Delete failed:", err);
        this._showNotification("Delete failed");
      } finally {
        this.pendingDeleteId = null;
      }
    });

    // notification modal handlers
    const notifyOk = this.shadowRoot.getElementById("notifyOk");
    if (notifyOk) notifyOk.addEventListener("click", () => this._hideNotification());

    // search bar handlers
    const searchInput = this.shadowRoot.getElementById("searchInput");
    const searchClear = this.shadowRoot.getElementById("searchClear");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => this.filterCases(e.target.value));
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
        this.currentPage = 1;
        const term = searchInput ? searchInput.value : "";
        this._renderCases(this.allCases, term);
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

    // Zoom controls
    const zoomValue  = this.shadowRoot.getElementById("zoomValue");
    const zoomOut    = this.shadowRoot.getElementById("zoomOut");
    const zoomIn     = this.shadowRoot.getElementById("zoomIn");
    const zoomReset  = this.shadowRoot.getElementById("zoomReset");
    const updateZoom = (level) => {
      this.zoomLevel = Math.min(2, Math.max(0.5, Math.round(level * 10) / 10));
      this.setZoom(this.zoomLevel);
      if (zoomValue) zoomValue.textContent = Math.round(this.zoomLevel * 100) + "%";
    };
    if (zoomOut)   zoomOut.addEventListener("click",   () => updateZoom(this.zoomLevel - 0.1));
    if (zoomIn)    zoomIn.addEventListener("click",    () => updateZoom(this.zoomLevel + 0.1));
    if (zoomReset) zoomReset.addEventListener("click", () => updateZoom(1));

    // pagination handlers
    const itemsPerPageSelect = this.shadowRoot.getElementById("itemsPerPage");
    if (itemsPerPageSelect) {
      itemsPerPageSelect.value = this.itemsPerPage.toString(); // Sync with current value
      itemsPerPageSelect.addEventListener("change", (e) => {
        this.itemsPerPage = parseInt(e.target.value);
        this.currentPage = 1; // Reset to first page
        const searchInput = this.shadowRoot.getElementById("searchInput");
        const searchTerm = searchInput ? searchInput.value : "";
        this._renderCases(this.allCases, searchTerm);
      });
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
    const searchInput = sr.getElementById("searchInput");
    const searchTerm = searchInput ? searchInput.value : "";
    this._renderCases(this.allCases, searchTerm);
  }

  sortCases(cases) {
    // Create a copy to avoid mutating the original array
    const sorted = [...cases];
    
    sorted.sort((a, b) => {
      if (this.sortOrder === "dateFilled-asc" || this.sortOrder === "dateFilled-desc") {
        const dA = a.data.dateFilled ? new Date(a.data.dateFilled) : new Date(0);
        const dB = b.data.dateFilled ? new Date(b.data.dateFilled) : new Date(0);
        return this.sortOrder === "dateFilled-asc" ? dA - dB : dB - dA;
      }
      const dateA = a.data.createdAt?.toDate?.() || new Date(0);
      const dateB = b.data.createdAt?.toDate?.() || new Date(0);
      return this.sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });
    
    return sorted;
  }

  async loadCases() {
    const body = this.shadowRoot.getElementById("caseTableBody");
      body.innerHTML = `<tr><td colspan="14" class="loading">Loading cases...</td></tr>`;

    const snap = await getDocs(collection(db, "cases"));

    // Store all cases for filtering
    this.allCases = [];
    snap.forEach(d => {
      this.allCases.push({
        id: d.id,
        data: d.data()
      });
    });

    // Apply current search filter if any
    const searchInput = this.shadowRoot.getElementById("searchInput");
    const searchTerm = searchInput ? searchInput.value : "";
    this._renderCases(this.allCases, searchTerm);
  }

  filterCases(searchTerm) {
    // Update clear button visibility
    const searchClear = this.shadowRoot.getElementById("searchClear");
    if (searchClear) {
      if (searchTerm.trim()) {
        searchClear.classList.add("visible");
      } else {
        searchClear.classList.remove("visible");
      }
    }

    // Reset to first page when filtering
    this.currentPage = 1;
    this._renderCases(this.allCases, searchTerm);
  }

  _fmtDate(dateStr) {
    if (!dateStr) return "-";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts;
    return `${m}/${d}/${y}`;
  }

  formatPartyDisplay(party) {
    if (!party || !party.name) return "-";
    // Handle both new format (role) and old format (roles array) for backward compatibility
    let role = "";
    if (party.role) {
      role = ` (${party.role})`;
    } else if (party.roles && Array.isArray(party.roles) && party.roles.length > 0) {
      role = ` (${party.roles[0]})`; // Use first role for backward compatibility
    }
    return `${party.name}${role}`;
  }

  _renderCases(cases, searchTerm = "") {
    const body = this.shadowRoot.getElementById("caseTableBody");
    if (!body) return;

    // Sort cases first
    let sortedCases = this.sortCases(cases);

    // Filter cases if search term exists
    let filteredCases = sortedCases;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      const getFormattedDate = (value) => {
        if (!value) return "";
        const formatted = this._fmtDate(value);
        return formatted.toLowerCase();
      };

      filteredCases = sortedCases.filter(({ data: c }) => {
        const fieldValue = (field) => {
          if (!field) return "";
          return field.toString().toLowerCase();
        };

        const lookup = {
          caseNo:          fieldValue(c.caseNo),
          nature:          fieldValue(c.nature),
          taxDec:          fieldValue(c.taxDec),
          belongingParty:  fieldValue(c.belongingParty?.name),
          opposingParty:   fieldValue(c.opposingParty?.name),
          location:        fieldValue(c.location),
          dateFilled:      fieldValue(c.dateFilled) + " " + getFormattedDate(c.dateFilled),
          dateDecided:     fieldValue(c.dateDecided) + " " + getFormattedDate(c.dateDecided),
          mrDateReceived:  fieldValue(c.mrDateReceived) + " " + getFormattedDate(c.mrDateReceived),
          mrDateResolution:fieldValue(c.mrDateResolution) + " " + getFormattedDate(c.mrDateResolution),
          dateOfAppeal:    fieldValue(c.dateOfAppeal) + " " + getFormattedDate(c.dateOfAppeal),
          dateOfFinality:  fieldValue(c.dateOfFinality) + " " + getFormattedDate(c.dateOfFinality),
          winningParty:    fieldValue(c.winningParty),
          status:          fieldValue(c.status),
          createdBy:       fieldValue(c.createdBy) || fieldValue(c.createdByEmail),
          updatedBy:       fieldValue(c.updatedBy) || fieldValue(c.updatedByEmail),
        };

        if (this.searchColumn && this.searchColumn !== "all") {
          return lookup[this.searchColumn]?.includes(term);
        }

        const searchableFields = [
          lookup.caseNo,
          lookup.nature,
          lookup.taxDec,
          lookup.belongingParty,
          lookup.opposingParty,
          lookup.location,
          lookup.dateFilled,
          lookup.dateDecided,
          lookup.mrDateReceived,
          lookup.mrDateResolution,
          lookup.dateOfAppeal,
          lookup.dateOfFinality,
          lookup.winningParty,
          lookup.status,
          lookup.createdBy,
          lookup.updatedBy,
        ];

        return searchableFields.some(field => field.includes(term));
      });
    }

    const totalCases = filteredCases.length;
    const totalPages = Math.max(1, Math.ceil(totalCases / this.itemsPerPage));
    
    // Ensure current page is valid
    if (this.currentPage > totalPages) {
      this.currentPage = totalPages;
    }
    if (this.currentPage < 1) {
      this.currentPage = 1;
    }

    if (totalCases === 0) {
      const emptyMessage = searchTerm.trim() 
        ? `No cases found matching "${searchTerm}"`
        : "No cases";
      body.innerHTML = `<tr><td colspan="14" class="empty">${emptyMessage}</td></tr>`;
      this._renderPagination(0, 0, 0);
      return;
    }

    // Calculate pagination
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = Math.min(startIndex + this.itemsPerPage, totalCases);
    const paginatedCases = filteredCases.slice(startIndex, endIndex);

    body.innerHTML = "";

    paginatedCases.forEach(({ id, data: c }) => {
      const row = document.createElement("tr");
      
      row.innerHTML = `
        <td>${c.caseNo || ""}</td>
        <td>${c.nature || ""}</td>
        <td>${c.taxDec || "-"}</td>
        <td>${this.formatPartyDisplay(c.belongingParty || {})}</td>
        <td>${this.formatPartyDisplay(c.opposingParty || {})}</td>
        <td>${c.location || "-"}</td>
        <td>${this._fmtDate(c.dateFilled)}</td>
        <td>${this._fmtDate(c.dateDecided)}</td>
        <td>${this._fmtDate(c.mrDateReceived)}</td>
        <td>${this._fmtDate(c.mrDateResolution)}</td>
        <td>${this._fmtDate(c.dateOfAppeal)}</td>
        <td>${this._fmtDate(c.dateOfFinality)}</td>
        <td>${c.winningParty || "-"}</td>
        <td><span class="status ${c.status || ""}">${c.status || ""}</span></td>
        <td>${c.createdBy || '-'}</td>
        <td>${c.updatedBy || '-'}</td>
        <td class="actions">
          <button class="delete-btn">Delete</button>
        </td>
      `;

      // Add tooltip
      const tooltip = document.createElement("div");
      tooltip.className = "row-tooltip";
      tooltip.textContent = "Double click to view the case";
      row.appendChild(tooltip);

      row.querySelector(".delete-btn").onclick = () => this.deleteCase(id, c.caseNo);
      row.addEventListener("dblclick", () => this.showCaseDetails(c));

      body.appendChild(row);
    });

    // Render pagination controls
    this._renderPagination(startIndex + 1, endIndex, totalCases, totalPages);
  }

  setZoom(zoom) {
    const table = this.shadowRoot.querySelector('table');
    const wrapper = this.shadowRoot.querySelector('.table-wrapper');
    if (table) {
      table.style.transform = `scale(${zoom})`;
      table.style.transformOrigin = 'top left';
      // Adjust wrapper height so content isn't clipped on mobile
      if (wrapper) {
        if (zoom !== 1) {
          const naturalHeight = table.scrollHeight * zoom;
          wrapper.style.height = naturalHeight + 'px';
          wrapper.style.overflowX = 'auto';
          wrapper.style.overflowY = 'hidden';
        } else {
          wrapper.style.height = '';
          wrapper.style.overflowX = 'auto';
          wrapper.style.overflowY = '';
        }
      }
    }
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
        const searchInput = this.shadowRoot.getElementById("searchInput");
        const searchTerm = searchInput ? searchInput.value : "";
        this._renderCases(this.allCases, searchTerm);
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
        const searchInput = this.shadowRoot.getElementById("searchInput");
        const searchTerm = searchInput ? searchInput.value : "";
        this._renderCases(this.allCases, searchTerm);
        // Scroll to top of table
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
          const searchInput = this.shadowRoot.getElementById("searchInput");
          const searchTerm = searchInput ? searchInput.value : "";
          this._renderCases(this.allCases, searchTerm);
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
        const searchInput = this.shadowRoot.getElementById("searchInput");
        const searchTerm = searchInput ? searchInput.value : "";
        this._renderCases(this.allCases, searchTerm);
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
        const searchInput = this.shadowRoot.getElementById("searchInput");
        const searchTerm = searchInput ? searchInput.value : "";
        this._renderCases(this.allCases, searchTerm);
        const tableWrapper = this.shadowRoot.querySelector(".table-wrapper");
        if (tableWrapper) tableWrapper.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
    controls.appendChild(nextBtn);
  }

  // show confirmation modal (actual deletion performed on confirm)
  async deleteCase(id, caseNo) {
    this.pendingDeleteId = id;
    const modal = this.shadowRoot.getElementById("confirmDeleteModal");
    const body = this.shadowRoot.getElementById("confirmDeleteBody");
    if (body) body.textContent = `Delete case "${caseNo || id}"? Are you sure you want to delete this case?`;
    if (modal) modal.style.display = "flex";
    // Listen for confirm
    const confirmBtn = this.shadowRoot.getElementById("confirmDeleteBtn");
    if (confirmBtn) {
      const handler = async () => {
        try {
          await deleteDoc(doc(db, "cases", this.pendingDeleteId));
          this._hideConfirmDelete();
          await this.loadCases();
          window.dispatchEvent(new CustomEvent('cases-changed'));
          this._showNotification("Case deleted successfully");
        } catch (err) {
          console.error("Delete failed:", err);
          this._showNotification("Delete failed");
        } finally {
          this.pendingDeleteId = null;
          confirmBtn.removeEventListener('click', handler);
        }
      };
      confirmBtn.addEventListener('click', handler);
    }
  }

  _hideConfirmDelete() {
    const modal = this.shadowRoot.getElementById("confirmDeleteModal");
    if (modal) modal.style.display = "none";
    this.pendingDeleteId = null;
  }

  _initLocationAutocomplete(input, dropdown) {
    if (!input || !dropdown) return;

    const LOCATIONS = [
      "Masbate City","Aroroy","Baleno","Balud","Batuan","Cataingan",
      "Cawayan","Claveria","Dimasalang","Esperanza","Mandaon","Milagros",
      "Mobo","Monreal","Placer","Pio V. Corpuz","Palanas","San Fernando",
      "San Jacinto","San Pascual","Uson"
    ];

    let activeIdx = -1;

    const show = (items, term) => {
      activeIdx = -1;
      if (!items.length) {
        dropdown.innerHTML = `<div class="loc-empty">No matches found</div>`;
      } else {
        dropdown.innerHTML = items.map((loc, i) => {
          const re = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
          const highlighted = loc.replace(re, "<mark>$1</mark>");
          return `<div class="loc-opt" data-idx="${i}" data-val="${loc}">${highlighted}</div>`;
        }).join("");
        dropdown.querySelectorAll(".loc-opt").forEach(opt => {
          opt.addEventListener("mousedown", e => {
            e.preventDefault();
            input.value = opt.dataset.val;
            dropdown.classList.remove("open");
          });
        });
      }
      dropdown.classList.add("open");
    };

    const close = () => { dropdown.classList.remove("open"); activeIdx = -1; };

    input.addEventListener("input", () => {
      const term = input.value.trim();
      if (!term) { close(); return; }
      const matches = LOCATIONS.filter(l => l.toLowerCase().includes(term.toLowerCase()));
      show(matches, term);
    });

    input.addEventListener("focus", () => {
      const term = input.value.trim();
      const matches = term
        ? LOCATIONS.filter(l => l.toLowerCase().includes(term.toLowerCase()))
        : LOCATIONS;
      show(matches, term);
    });

    input.addEventListener("keydown", e => {
      const opts = [...dropdown.querySelectorAll(".loc-opt")];
      if (!opts.length) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        activeIdx = Math.min(activeIdx + 1, opts.length - 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        activeIdx = Math.max(activeIdx - 1, 0);
      } else if (e.key === "Enter" && activeIdx >= 0) {
        e.preventDefault();
        input.value = opts[activeIdx].dataset.val;
        close();
        return;
      } else if (e.key === "Escape") {
        close(); return;
      }
      opts.forEach((o, i) => o.classList.toggle("active", i === activeIdx));
      if (activeIdx >= 0) opts[activeIdx].scrollIntoView({ block: "nearest" });
    });

    document.addEventListener("click", e => {
      if (!input.contains(e.target) && !dropdown.contains(e.target)) close();
    });
  }

  showCaseDetails(caseData) {
    const modal = this.shadowRoot.getElementById("caseDetailsModal");
    const modalCaseNo = this.shadowRoot.getElementById("detailsModalCaseNo");
    const modalBody = this.shadowRoot.getElementById("detailsModalBody");

    if (!modal || !modalBody) return;

    modalCaseNo.textContent = `Case #${caseData.caseNo || "N/A"}`;

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
      { label: "Date Filed",        value: this._fmtDate(caseData.dateFilled),
        attachments: caseData.dateFilledAttachments },
      { label: "Date of Decision",  value: this._fmtDate(caseData.dateDecided),      attachments: caseData.dateDecidedAttachments },
      { label: "MR Date Received",  value: this._fmtDate(caseData.mrDateReceived),   attachments: caseData.mrDateReceivedAttachments },
      { label: "MR Date Resolution",value: this._fmtDate(caseData.mrDateResolution), attachments: caseData.mrDateResolutionAttachments },
      { label: "Date of Appeal",    value: this._fmtDate(caseData.dateOfAppeal),     attachments: caseData.dateOfAppealAttachments },
      { label: "Date of Finality",  value: this._fmtDate(caseData.dateOfFinality),   attachments: caseData.dateOfFinalityAttachments },
      { label: "Winning Party",     value: caseData.winningParty || "N/A" },
      { label: "Status",            value: statusBadge, raw: true },
      { label: "Created By",        value: caseData.createdBy || caseData.createdByEmail || "N/A" },
      { label: "Updated By",        value: caseData.updatedBy || caseData.updatedByEmail || "N/A" },
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
    const modal       = this.shadowRoot.getElementById("fileViewerModal");
    const titleEl     = this.shadowRoot.getElementById("fileViewerTitle");
    const bodyEl      = this.shadowRoot.getElementById("fileViewerBody");
    const openBtn     = this.shadowRoot.getElementById("fileViewerOpenBtn");
    const downloadBtn = this.shadowRoot.getElementById("fileViewerDownloadBtn");
    if (!modal || !bodyEl) { window.open(url, "_blank", "noopener,noreferrer"); return; }

    const isImage = ["jpg","jpeg","png","gif","webp","svg"].includes(ext);
    const isPdf   = ext === "pdf";
    const isDoc   = ["doc","docx"].includes(ext);

    if (titleEl)     titleEl.textContent = name;
    if (openBtn)     openBtn.href = url;
    if (downloadBtn) { downloadBtn.href = url; downloadBtn.setAttribute("download", name); }

    if (isImage) {
      bodyEl.innerHTML = `<img src="${url}" alt="${name}" />`;
    } else if (isPdf) {
      bodyEl.innerHTML = `<iframe src="${url}" title="${name}"></iframe>`;
    } else if (isDoc) {
      const gUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
      bodyEl.innerHTML = `<iframe src="${gUrl}" title="${name}"></iframe>`;
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

  closeDetailsModal() {
    const modal = this.shadowRoot.getElementById("caseDetailsModal");
    if (modal) modal.classList.remove("active");
  }

  _showNotification(message = "Done") {
    const modal = this.shadowRoot.getElementById("notificationModal");
    const msg = this.shadowRoot.getElementById("notifyMsg");
    if (!modal || !msg) return;
    msg.textContent = message;
    modal.style.display = "flex";
    modal.setAttribute("aria-hidden", "false");
    clearTimeout(this._notificationTimer);
    this._notificationTimer = setTimeout(() => this._hideNotification(), 2500);
  }

  _hideNotification() {
    const modal = this.shadowRoot.getElementById("notificationModal");
    if (!modal) return;
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
    clearTimeout(this._notificationTimer);
  }

}


customElements.define("admin-case-manage", AdminCaseManage);
