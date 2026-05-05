import { auth, db } from "../scripts/firebaseConfig.js";
import {
    doc,
    getDoc,
    setDoc,
    deleteDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import { updateProfile, deleteUser } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { darkModeCSS } from "../scripts/darkMode.js";

class profileComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }
    connectedCallback() {
        this.render();
    }
    render() {
        this.shadowRoot.innerHTML = `
        <style>
            :root {
                --gilroy-font: 'Gilroy-Bold', sans-serif;
            }

            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }
            @keyframes slideDown {
                from { opacity: 0; max-height: 0; }
                to { opacity: 1; max-height: 100px; }
            }
            @keyframes success {
                0% { background-color: #d4edda; }
                100% { background-color: transparent; }
            }
            :host {
                display: block;
                background: linear-gradient(135deg, #f5f9f7 0%, #f9f9f9 100%);
                min-height: 100vh;
                font-family: "Segoe UI", Arial, sans-serif;
            }
            .profile-content {
                padding: 24px;
                animation: fadeIn 0.6s ease-in-out;
            }
            .content {
                max-width: 800px;
                margin: auto;
            }
            .profile-header {
                text-align: center;
                margin-bottom: 32px;
            }
            .profile-header h1 {
                font-size: 2.5rem;
                color: #0c6d38;
                margin-bottom: 8px;
                font-weight: 700;
            }
            .profile-header p {
                color: #666;
                font-size: 1.1rem;
                font-weight: 500;
            }
            .profile-card {
                background: #ffffff;
                border-radius: 16px;
                padding: 32px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
                text-align: center;
                transition: all 0.3s ease;
            }
            .profile-card:hover {
                box-shadow: 0 15px 40px rgba(0, 0, 0, 0.15);
            }
            .profile-card img {
                width: 140px;
                height: 140px;
                border-radius: 50%;
                margin-bottom: 20px;
                border: 4px solid #0c6d38;
                cursor: pointer;
                transition: all 0.3s ease;
                object-fit: cover;
            }
            .profile-card img:hover {
                transform: scale(1.08);
                box-shadow: 0 8px 20px rgba(12, 109, 56, 0.3);
            }
            .profile-card img:active {
                transform: scale(0.95);
            }
            .upload-text {
                font-size: 14px;
                color: #666;
                margin: 8px 0 0 0;
                font-weight: 500;
                cursor: pointer;
            }
            .photo-status {
                font-size: 12px;
                color: #0c6d38;
                min-height: 16px;
                margin-top: -12px;
                margin-bottom: 8px;
                font-weight: 500;
            }
            .photo-status.error { color: #dc3545; }
            .profile-card h2 {
                font-size: 1rem;
                margin-bottom: 12px;
                color: #1a1a1a;
                font-weight: 700;
            }
            .profile-card p {
                color: #666;
                font-size: 1rem;
                margin: 6px 0;
                
            }
            .profile-edit {
                margin-top: 24px;
                padding-top: 24px;
                border-top: 2px solid #f0f0f0;
                display: flex;
                flex-direction: column;
                gap: 18px;
                align-items: center;
                animation: slideDown 0.3s ease;
            }
            .username-edit, .position-edit {
                display: flex;
                flex-direction: column;
                gap: 8px;
                align-items: center;
                width: 100%;
            }
            .username-edit label, .position-edit label {
                font-weight: 700;
                color: #0c6d38;
                font-size: 0.95rem;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .username-edit input, .position-edit input {
                padding: 12px 14px;
                border-radius: 10px;
                border: 2px solid #e0e0e0;
                font-size: 14px;
                width: 100%;
                max-width: 300px;
                text-align: center;
                transition: all 0.3s ease;
                background: #fafafa;
            }
            .username-edit input:focus, .position-edit input:focus {
                outline: none;
                border-color: #0c6d38;
                background: #ffffff;
                box-shadow: 0 0 0 3px rgba(12, 109, 56, 0.1);
                transform: translateY(-2px);
            }
            .username-edit input:hover, .position-edit input:hover {
                border-color: #0c6d38;
                background: #ffffff;
            }
            .profile-edit button {
                padding: 11px 24px;
                border-radius: 25px;
                border: none;
                background: #0c6d38;
                color: white;
                font-weight: 700;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.3s ease;
                min-width: 160px;
                box-shadow: 0 4px 12px rgba(12, 109, 56, 0.2);
            }
            .profile-edit button:hover {
                background: #095a2e;
                box-shadow: 0 6px 20px rgba(12, 109, 56, 0.3);
                transform: translateY(-2px);
            }
            .profile-edit button:active {
                transform: translateY(0);
                box-shadow: 0 2px 8px rgba(12, 109, 56, 0.2);
            }
            .profile-edit button:disabled {
                background: #ccc;
                cursor: not-allowed;
                box-shadow: none;
                transform: none;
            }
            .username-status, .position-status {
                min-height: 20px;
                font-size: 13px;
                color: #555;
                font-weight: 500;
                animation: slideDown 0.3s ease;
            }
            .username-status.success, .position-status.success {
                color: #28a745;
                animation: success 2s ease-out forwards;
            }
            .username-status.error, .position-status.error {
                color: #dc3545;
            }

            .profile-card i.profile-position {
                font-style: italic;
                color: #0c6d38;
                font-weight: 600;
                font-size: 1.05rem;
                font-family: var(--gilroy-font);
            }

            /* Delete Account Button Container */
            .delete-account-container {
                margin-top: 32px;
                bottom: 24px;
                right: 24px;
            }

            .delete-account-btn {
                padding: 10px 18px;
                border-radius: 10px;
                border: 2px solid #dc3545;
                background: white;
                color: #dc3545;
                font-weight: 600;
                cursor: pointer;
                font-size: 13px;
                transition: all 0.3s ease;
                display: inline-flex;
                align-items: center;
                gap: 6px;
            }

            .delete-account-btn:hover {
                background: #dc3545;
                color: white;
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(220, 53, 69, 0.2);
            }

            .delete-account-btn:active {
                transform: translateY(0);
            }

            .delete-account-btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }

            /* Modal Overlay */
            .modal-overlay {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 1000;
                animation: fadeIn 0.3s ease;
            }

            .modal-overlay.active {
                display: flex;
                align-items: center;
                justify-content: center;
            }

            /* Modal Dialog */
            .delete-modal {
                background: white;
                border-radius: 16px;
                padding: 40px;
                max-width: 450px;
                width: 90%;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                animation: slideUp 0.3s ease;
                text-align: center;
            }

            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateY(30px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .modal-header {
                margin-bottom: 24px;
            }

            .modal-icon {
                font-size: 48px;
                margin-bottom: 16px;
            }

            .delete-modal h2 {
                font-size: 1.6rem;
                color: #1a1a1a;
                margin: 0 0 12px 0;
                font-weight: 700;
            }

            .delete-modal p {
                color: #666;
                font-size: 0.95rem;
                line-height: 1.6;
                margin: 0 0 20px 0;
            }

            .warning-box {
                background: #fff3cd;
                border-left: 4px solid #ffc107;
                padding: 14px 16px;
                margin-bottom: 24px;
                border-radius: 8px;
                color: #856404;
                font-weight: 500;
                font-size: 0.9rem;
                text-align: left;
                line-height: 1.5;
            }

            .confirm-input {
                width: 100%;
                padding: 12px 14px;
                border: 2px solid #e0e0e0;
                border-radius: 10px;
                font-size: 14px;
                margin-bottom: 24px;
                box-sizing: border-box;
                text-align: center;
                transition: all 0.3s ease;
                background: #fafafa;
            }

            .confirm-input:focus {
                outline: none;
                border-color: #dc3545;
                background: #ffffff;
                box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.1);
            }

            .modal-buttons {
                display: flex;
                gap: 12px;
                justify-content: center;
            }

            .modal-buttons button {
                flex: 1;
                padding: 12px 16px;
                border: none;
                border-radius: 10px;
                font-weight: 600;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.3s ease;
            }

            .modal-buttons .cancel-btn {
                background: #e8e8e8;
                color: #333;
                border: 2px solid transparent;
            }

            .modal-buttons .cancel-btn:hover {
                background: #d8d8d8;
                transform: translateY(-2px);
            }

            .modal-buttons .delete-confirm-btn {
                background: #dc3545;
                color: white;
                box-shadow: 0 4px 12px rgba(220, 53, 69, 0.2);
            }

            .modal-buttons .delete-confirm-btn:hover:not(:disabled) {
                background: #c82333;
                box-shadow: 0 6px 20px rgba(220, 53, 69, 0.3);
                transform: translateY(-2px);
            }

            .modal-buttons .delete-confirm-btn:disabled {
                background: #ccc;
                cursor: not-allowed;
                transform: none;
                box-shadow: none;
            }

            .profile-content {
                position: relative;
            }

            @media (max-width: 600px) {
                .delete-account-container {
                    bottom: 16px;
                    right: 16px;
                }

                .delete-modal {
                    padding: 30px;
                    width: 95%;
                }

                .delete-modal h2 {
                    font-size: 1.3rem;
                }

                .delete-account-btn {
                    font-size: 12px;
                    padding: 8px 14px;
                }
            }

            ${darkModeCSS}
        </style>
        
        <div class="profile-content">
            <div class="content">
                <div class="profile-header">
                    <h1>My Profile</h1>
                    <p>Manage your personal information</p>
                </div>
                
                <div class="profile-card">
                    <img id="profilePhoto" src="../assets/profiles/NoPhoto.png" alt="Profile Photo">
                    <input id="photoInput" type="file" accept="image/*" hidden />
                    <p id="uploadText" class="upload-text">Upload your profile picture</p>
                    <div id="photoUploadStatus" class="photo-status"></div>
                    <h2 id="profileName">User Name</h2>
                    <i id="profilePosition" class="profile-position">No Position</i>
                    <p id="profileEmail">user@example.com</p>

                    <div class="profile-edit">
                        <div class="username-edit">
                            <label for="usernameInput">Username</label>
                            <input id="usernameInput" type="text" placeholder="Enter username" />
                            <div id="usernameStatus" class="username-status"></div>
                        </div>
                        <div class="position-edit">
                            <label for="positionInput">DAR Position</label>
                            <input id="positionInput" type="text" placeholder="Enter position" />
                            <div id="positionStatus" class="position-status"></div>
                        </div>
                        <button id="saveProfileBtn" type="button">Save Profile</button>
                    </div>

                    <div class="delete-account-container">
                        <button id="deleteAccountBtn" class="delete-account-btn" title="Delete your account">
                            🗑️ Delete Account
                        </button>
                    </div>
                </div>

                

            </div>
        </div>

        <!-- Delete Confirmation Modal -->
        <div id="deleteModal" class="modal-overlay">
            <div class="delete-modal">
                <div class="modal-header">
                    <div class="modal-icon">⚠️</div>
                    <h2>Delete Account?</h2>
                    <p>This action cannot be undone.</p>
                </div>
                <p>Your account and all associated data will be permanently deleted from the system.</p>
                <div class="warning-box">
                    Type <strong>DELETE</strong> in the field below to confirm the permanent deletion of your account.
                </div>
                <input id="deleteConfirmInput" class="confirm-input" type="text" placeholder="Type DELETE to confirm" />
                <div class="modal-buttons">
                    <button class="cancel-btn" id="cancelDeleteBtn">Cancel</button>
                    <button class="delete-confirm-btn" id="confirmDeleteBtn" disabled>Delete Account</button>
                </div>
            </div>
        </div>
        `;
        this.loadUserInfo();
        const saveBtn = this.shadowRoot.getElementById("saveProfileBtn");
        if (saveBtn) {
            saveBtn.addEventListener("click", () => this.saveProfile());
        }

        // Photo upload via Cloudinary
        const photoEl  = this.shadowRoot.getElementById("profilePhoto");
        const photoInput = this.shadowRoot.getElementById("photoInput");
        if (photoEl && photoInput) {
            photoEl.addEventListener("click", () => photoInput.click());
            photoInput.addEventListener("change", (e) => {
                const file = e.target.files[0];
                if (file) this._uploadPhoto(file);
            });
        }
        // Make upload text clickable too
        const uploadText = this.shadowRoot.getElementById("uploadText");
        if (uploadText && photoInput) {
            uploadText.addEventListener("click", () => photoInput.click());
        }
        // Delete Account Modal
        const deleteBtn = this.shadowRoot.getElementById("deleteAccountBtn");
        const deleteModal = this.shadowRoot.getElementById("deleteModal");
        const cancelDeleteBtn = this.shadowRoot.getElementById("cancelDeleteBtn");
        const confirmDeleteBtn = this.shadowRoot.getElementById("confirmDeleteBtn");
        const confirmInput = this.shadowRoot.getElementById("deleteConfirmInput");

        if (deleteBtn) {
            deleteBtn.addEventListener("click", () => {
                deleteModal.classList.add("active");
                confirmInput.value = "";
                confirmDeleteBtn.disabled = true;
                confirmInput.focus();
            });
        }

        if (cancelDeleteBtn) {
            cancelDeleteBtn.addEventListener("click", () => {
                deleteModal.classList.remove("active");
                confirmInput.value = "";
                confirmDeleteBtn.disabled = true;
            });
        }

        if (confirmInput) {
            confirmInput.addEventListener("input", (e) => {
                confirmDeleteBtn.disabled = e.target.value !== "DELETE";
            });

            confirmInput.addEventListener("keypress", (e) => {
                if (e.key === "Enter" && confirmInput.value === "DELETE" && !confirmDeleteBtn.disabled) {
                    this.deleteAccount();
                }
            });
        }

        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener("click", () => this.deleteAccount());
        }

        // Close modal when clicking outside
        if (deleteModal) {
            deleteModal.addEventListener("click", (e) => {
                if (e.target === deleteModal) {
                    deleteModal.classList.remove("active");
                    confirmInput.value = "";
                    confirmDeleteBtn.disabled = true;
                }
            });
        }
    }

    async _uploadPhoto(file) {
        const CLOUD_NAME   = "dogzc58b2";
        const UPLOAD_PRESET = "csltiv_profiles"; // create this unsigned preset in your Cloudinary dashboard

        const statusEl = this.shadowRoot.getElementById("photoUploadStatus");
        const photoEl  = this.shadowRoot.getElementById("profilePhoto");

        if (statusEl) { statusEl.textContent = "⏳ Uploading..."; statusEl.className = "photo-status"; }

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("upload_preset", UPLOAD_PRESET);
            formData.append("folder", "csltiv/profiles");

            const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
                method: "POST",
                body: formData
            });

            if (!res.ok) throw new Error("Upload failed");
            const data = await res.json();
            const url = data.secure_url;

            // Update Firebase Auth profile photo
            const user = auth.currentUser;
            if (user) {
                await updateProfile(user, { photoURL: url });
                // Save to Firestore too
                await setDoc(doc(db, "users", user.uid), { photoURL: url }, { merge: true });
            }

            if (photoEl) photoEl.src = url;
            if (statusEl) { statusEl.textContent = "✓ Photo updated."; statusEl.className = "photo-status"; }

            // Notify navbar to update avatar
            this.dispatchEvent(new CustomEvent("profile-updated", {
                detail: { photoURL: url },
                bubbles: true,
                composed: true
            }));

            setTimeout(() => { if (statusEl) statusEl.textContent = ""; }, 3000);
        } catch (err) {
            console.error("Photo upload failed:", err);
            if (statusEl) { statusEl.textContent = "❌ Upload failed. Try again."; statusEl.className = "photo-status error"; }
        }
    }

    async loadUserInfo() {
        const user = auth.currentUser;
        const nameEl = this.shadowRoot.getElementById("profileName");
        const emailEl = this.shadowRoot.getElementById("profileEmail");
        const photoEl = this.shadowRoot.getElementById("profilePhoto");
        const inputEl = this.shadowRoot.getElementById("usernameInput");
        const statusEl = this.shadowRoot.getElementById("usernameStatus");
        const positionEl = this.shadowRoot.getElementById("positionInput");
        const positionStatusEl = this.shadowRoot.getElementById("positionStatus");
        const positionDisplayEl = this.shadowRoot.getElementById("profilePosition");

        if (!user) {
            if (nameEl) nameEl.textContent = "User Name";
            if (emailEl) emailEl.textContent = "";
            if (photoEl) photoEl.src = "../assets/profiles/NoPhoto.png";
            if (inputEl) inputEl.value = "";
            if (statusEl) statusEl.textContent = "You are not logged in.";
            if (positionEl) positionEl.value = "";
            if (positionDisplayEl) positionDisplayEl.textContent = "No Position";
            
            return;
        }

        if (emailEl) emailEl.textContent = user.email || "";
        if (photoEl) photoEl.src = user.photoURL || "../assets/profiles/NoPhoto.png";

        // Default username fallback (new users): strip @gmail.com if email is from Gmail
        let username = (user.displayName || "").trim();
        if (!username && user.email) {
            const cleanedEmail = user.email.trim();
            if (cleanedEmail.toLowerCase().endsWith("@gmail.com")) {
                username = cleanedEmail.slice(0, -"@gmail.com".length);
            } else {
                username = cleanedEmail;
            }
        }
        if (!username) {
            username = "User Name";
        }

        let position = "";

        // Try to load from Firestore
        try {
            const userDocRef = doc(db, "users", user.uid);
            const snap = await getDoc(userDocRef);
            if (snap.exists()) {
                const data = snap.data();
                if (data.username) {
                    username = data.username;
                }
                if (data.position) {
                    position = data.position;
                }
                // Prefer Firestore photoURL over Auth (more reliable after upload)
                if (data.photoURL && photoEl) {
                    photoEl.src = data.photoURL;
                }
            }
        } catch (err) {
            console.error("Failed to load user profile from Firestore:", err);
        }

        if (nameEl) nameEl.textContent = username;
        if (inputEl) inputEl.value = username;
        if (statusEl) statusEl.textContent = "";
        if (positionEl) positionEl.value = position;
        if (positionStatusEl) positionStatusEl.textContent = "";
        if (positionDisplayEl) positionDisplayEl.textContent = position || "No Position";
    }

    async saveProfile() {
        const user = auth.currentUser;
        const usernameInputEl = this.shadowRoot.getElementById("usernameInput");
        const usernameStatusEl = this.shadowRoot.getElementById("usernameStatus");
        const positionInputEl = this.shadowRoot.getElementById("positionInput");
        const positionStatusEl = this.shadowRoot.getElementById("positionStatus");
        const buttonEl = this.shadowRoot.getElementById("saveProfileBtn");
        const nameEl = this.shadowRoot.getElementById("profileName");
        const positionDisplayEl = this.shadowRoot.getElementById("profilePosition");

        if (!user || !usernameInputEl || !positionInputEl) return;

        // Clear previous messages
        usernameStatusEl.textContent = "";
        usernameStatusEl.classList.remove("error", "success");
        positionStatusEl.textContent = "";
        positionStatusEl.classList.remove("error", "success");

        // Validate username
        const newUsername = usernameInputEl.value.trim();
        let usernameValid = true;
        if (!newUsername) {
            usernameStatusEl.textContent = "❌ Username cannot be empty.";
            usernameStatusEl.classList.add("error");
            usernameValid = false;
        } else if (newUsername.length < 3) {
            usernameStatusEl.textContent = "❌ Username must be at least 3 characters.";
            usernameStatusEl.classList.add("error");
            usernameValid = false;
        }

        // Validate position
        const newPosition = positionInputEl.value.trim();
        let positionValid = true;
        if (!newPosition) {
            positionStatusEl.textContent = "❌ Position cannot be empty.";
            positionStatusEl.classList.add("error");
            positionValid = false;
        }

        // If validation fails, don't proceed
        if (!usernameValid || !positionValid) return;

        usernameStatusEl.textContent = "⏳ Saving...";
        positionStatusEl.textContent = "⏳ Saving...";
        if (buttonEl) buttonEl.disabled = true;

        try {
            const userDocRef = doc(db, "users", user.uid);
            const existingDoc = await getDoc(userDocRef);
            const dataToSave = {
                username: newUsername,
                position: newPosition,
                email: user.email || "",
                updatedAt: serverTimestamp()
            };
            if (!existingDoc.exists() || !existingDoc.data()?.createdAt) {
                dataToSave.createdAt = serverTimestamp();
            }

            await setDoc(userDocRef, dataToSave, { merge: true });

            try {
                await updateProfile(user, { displayName: newUsername });
            } catch (err) {
                console.error("Failed to update auth displayName:", err);
            }

            if (nameEl) nameEl.textContent = newUsername;
            if (positionDisplayEl) positionDisplayEl.textContent = newPosition;

            usernameStatusEl.textContent = "✓ Username updated successfully.";
            usernameStatusEl.classList.add("success");
            usernameStatusEl.classList.remove("error");

            positionStatusEl.textContent = "✓ Position updated successfully.";
            positionStatusEl.classList.add("success");
            positionStatusEl.classList.remove("error");

            if (buttonEl) buttonEl.disabled = false;
            
            // Dispatch events for other components/pages to listen
            this.dispatchEvent(new CustomEvent("profile-updated", {
                detail: { username: newUsername, position: newPosition },
                bubbles: true,
                composed: true
            }));
        } catch (err) {
            console.error("Failed to update profile in Firestore:", err);
            usernameStatusEl.textContent = "❌ Failed to update. Please try again.";
            usernameStatusEl.classList.add("error");
            usernameStatusEl.classList.remove("success");
            positionStatusEl.textContent = "❌ Failed to update. Please try again.";
            positionStatusEl.classList.add("error");
            positionStatusEl.classList.remove("success");
            if (buttonEl) buttonEl.disabled = false;
        }
    }

    async deleteAccount() {
        const user = auth.currentUser;
        const deleteModal = this.shadowRoot.getElementById("deleteModal");
        const confirmDeleteBtn = this.shadowRoot.getElementById("confirmDeleteBtn");
        const confirmInput = this.shadowRoot.getElementById("deleteConfirmInput");

        if (!user) {
            alert("You are not logged in.");
            return;
        }

        confirmDeleteBtn.disabled = true;
        confirmDeleteBtn.textContent = "Deleting...";

        try {
            // Delete user document from Firestore database
            const userDocRef = doc(db, "users", user.uid);
            await deleteDoc(userDocRef);
            
            // Delete user account from Firebase Auth
            await deleteUser(user);
            
            // Close modal and redirect
            deleteModal.classList.remove("active");
            
            // Redirect to login page after 1 second
            setTimeout(() => {
                window.location.href = "/login_page.html";
            }, 1000);
        } catch (err) {
            console.error("Failed to delete account:", err);
            
            let errorMessage = "Failed to delete account. Please try again.";
            
            // Handle specific Firebase errors
            if (err.code === "auth/requires-recent-login") {
                errorMessage = "For security reasons, please log out and log in again before deleting your account.";
            } else if (err.code === "auth/user-mismatch") {
                errorMessage = "There was a mismatch. Please try again.";
            }
            
            alert("❌ " + errorMessage);
            confirmDeleteBtn.disabled = false;
            confirmDeleteBtn.textContent = "Delete Account";
            confirmInput.value = "";
        }
    }

}

customElements.define("profile-component", profileComponent);