import { auth, db } from "../scripts/firebaseConfig.js";
import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import { updateProfile } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { darkModeCSS } from "../scripts/darkMode.js";

class ProfileSetup extends HTMLElement {
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
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
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
            .profile-content { padding: 24px; animation: fadeIn 0.6s ease-in-out; }
            .content { max-width: 800px; margin: auto; }
            .profile-header { text-align: center; margin-bottom: 32px; }
            .profile-header h1 { font-size: 2.5rem; color: #0c6d38; margin-bottom: 8px; font-weight: 700; }
            .profile-header p { color: #666; font-size: 1.1rem; font-weight: 500; }
            .profile-card {
                background: #fff;
                border-radius: 16px;
                padding: 32px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.12);
                text-align: center;
                transition: all 0.3s ease;
            }
            .profile-card:hover { box-shadow: 0 15px 40px rgba(0,0,0,0.15); }
            .profile-card img {
                width: 140px; height: 140px; border-radius: 50%;
                margin-bottom: 20px; border: 4px solid #0c6d38;
                cursor: pointer; transition: all 0.3s ease; object-fit: cover;
            }
            .profile-card img:hover { transform: scale(1.08); box-shadow: 0 8px 20px rgba(12,109,56,0.3); }
            .profile-card img:active { transform: scale(0.95); }
            .upload-text {
                font-size: 14px;
                color: #666;
                margin: 8px 0 0 0;
                font-weight: 500;
                cursor: pointer;
            }
            .photo-status { font-size: 12px; color: #0c6d38; min-height: 16px; margin-top: -12px; margin-bottom: 8px; font-weight: 500; }
            .photo-status.error { color: #dc3545; }
            .profile-card h2 { font-size: 1rem; margin-bottom: 12px; color: #1a1a1a; font-weight: 700; }
            .profile-card p { color: #666; font-size: 1rem; margin: 6px 0; }
            .profile-card i.profile-position { font-style: italic; color: #0c6d38; font-weight: 600; font-size: 1.05rem; }
            .profile-edit {
                margin-top: 24px; padding-top: 24px; border-top: 2px solid #f0f0f0;
                display: flex; flex-direction: column; gap: 18px; align-items: center;
            }
            .username-edit, .position-edit { display: flex; flex-direction: column; gap: 8px; align-items: center; width: 100%; }
            .username-edit label, .position-edit label {
                font-weight: 700; color: #0c6d38; font-size: 0.95rem;
                text-transform: uppercase; letter-spacing: 0.5px;
            }
            .username-edit input, .position-edit input {
                padding: 12px 14px; border-radius: 10px; border: 2px solid #e0e0e0;
                font-size: 14px; width: 100%; max-width: 300px; text-align: center;
                transition: all 0.3s ease; background: #fafafa;
            }
            .username-edit input:focus, .position-edit input:focus {
                outline: none; border-color: #0c6d38; background: #fff;
                box-shadow: 0 0 0 3px rgba(12,109,56,0.1); transform: translateY(-2px);
            }
            .profile-edit button {
                padding: 11px 24px; border-radius: 25px; border: none;
                background: #0c6d38; color: white; font-weight: 700; cursor: pointer;
                font-size: 14px; transition: all 0.3s ease; min-width: 160px;
                box-shadow: 0 4px 12px rgba(12,109,56,0.2);
            }
            .profile-edit button:hover { background: #095a2e; box-shadow: 0 6px 20px rgba(12,109,56,0.3); transform: translateY(-2px); }
            .profile-edit button:active { transform: translateY(0); }
            .profile-edit button:disabled { background: #ccc; cursor: not-allowed; box-shadow: none; transform: none; }
            .username-status, .position-status { min-height: 20px; font-size: 13px; color: #555; font-weight: 500; }
            .username-status.success, .position-status.success { color: #28a745; }
            .username-status.error, .position-status.error { color: #dc3545; }
            ${darkModeCSS}
        </style>

        <div class="profile-content">
            <div class="content">
                <div class="profile-header">
                    <h1>Complete Your Profile</h1>
                    <p>Set up your username and position to get started</p>
                </div>

                <div class="profile-card">
                    <img id="profilePhoto" src="../assets/profiles/NoPhoto.png" alt="Profile Photo" />
                    <input id="photoInput" type="file" accept="image/*" hidden />
                    <p id="uploadText" class="upload-text">Upload your profile picture</p>
                    <div id="photoUploadStatus" class="photo-status"></div>
                    <h2 id="profileName">User Name</h2>
                    <i id="profilePosition" class="profile-position">No Position</i>
                    <p id="profileEmail"></p>

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
                </div>
            </div>
        </div>
        `;

        this.loadUserInfo();

        this.shadowRoot.getElementById("saveProfileBtn")
            .addEventListener("click", () => this.saveProfile());

        // Photo upload
        const photoEl   = this.shadowRoot.getElementById("profilePhoto");
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
    }

    async _uploadPhoto(file) {
        const CLOUD_NAME    = "dogzc58b2";
        const UPLOAD_PRESET = "csltiv_profiles";
        const statusEl = this.shadowRoot.getElementById("photoUploadStatus");
        const photoEl  = this.shadowRoot.getElementById("profilePhoto");

        if (statusEl) { statusEl.textContent = "⏳ Uploading..."; statusEl.className = "photo-status"; }

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("upload_preset", UPLOAD_PRESET);
            formData.append("folder", "csltiv/profiles");

            const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
                method: "POST", body: formData
            });
            if (!res.ok) throw new Error("Upload failed");
            const data = await res.json();
            const url = data.secure_url;

            const user = auth.currentUser;
            if (user) {
                await updateProfile(user, { photoURL: url });
                await setDoc(doc(db, "users", user.uid), { photoURL: url }, { merge: true });
            }

            if (photoEl) photoEl.src = url;
            if (statusEl) { statusEl.textContent = "✓ Photo updated."; statusEl.className = "photo-status"; }
            this.dispatchEvent(new CustomEvent("profile-updated", { detail: { photoURL: url }, bubbles: true, composed: true }));
            setTimeout(() => { if (statusEl) statusEl.textContent = ""; }, 3000);
        } catch (err) {
            console.error("Photo upload failed:", err);
            if (statusEl) { statusEl.textContent = "❌ Upload failed."; statusEl.className = "photo-status error"; }
        }
    }

    async loadUserInfo() {
        const user = auth.currentUser;
        const sr = this.shadowRoot;
        const nameEl        = sr.getElementById("profileName");
        const emailEl       = sr.getElementById("profileEmail");
        const photoEl       = sr.getElementById("profilePhoto");
        const inputEl       = sr.getElementById("usernameInput");
        const positionEl    = sr.getElementById("positionInput");
        const positionDispEl = sr.getElementById("profilePosition");

        if (!user) return;

        if (emailEl) emailEl.textContent = user.email || "";
        if (photoEl) photoEl.src = user.photoURL || "../assets/profiles/NoPhoto.png";

        let username = (user.displayName || "").trim() || user.email?.split("@")[0] || "User Name";
        let position = "";

        try {
            const snap = await getDoc(doc(db, "users", user.uid));
            if (snap.exists()) {
                const d = snap.data();
                if (d.username) username = d.username;
                if (d.position) position = d.position;
                if (d.photoURL && photoEl) photoEl.src = d.photoURL;
            }
        } catch (err) {
            console.error("Failed to load profile:", err);
        }

        if (nameEl) nameEl.textContent = username;
        if (inputEl) inputEl.value = username;
        if (positionEl) positionEl.value = position;
        if (positionDispEl) positionDispEl.textContent = position || "No Position";
    }

    async saveProfile() {
        const user = auth.currentUser;
        const sr = this.shadowRoot;
        if (!user) return;

        const usernameInput  = sr.getElementById("usernameInput");
        const usernameStatus = sr.getElementById("usernameStatus");
        const positionInput  = sr.getElementById("positionInput");
        const positionStatus = sr.getElementById("positionStatus");
        const saveBtn        = sr.getElementById("saveProfileBtn");
        const nameEl         = sr.getElementById("profileName");
        const positionDispEl = sr.getElementById("profilePosition");

        usernameStatus.textContent = ""; usernameStatus.className = "username-status";
        positionStatus.textContent = ""; positionStatus.className = "position-status";

        const newUsername = usernameInput.value.trim();
        const newPosition = positionInput.value.trim();
        let valid = true;

        if (!newUsername || newUsername.length < 3) {
            usernameStatus.textContent = "❌ Username must be at least 3 characters.";
            usernameStatus.classList.add("error"); valid = false;
        }
        if (!newPosition) {
            positionStatus.textContent = "❌ Position cannot be empty.";
            positionStatus.classList.add("error"); valid = false;
        }
        if (!valid) return;

        usernameStatus.textContent = "⏳ Saving...";
        positionStatus.textContent = "⏳ Saving...";
        saveBtn.disabled = true;

        try {
            const userDocRef = doc(db, "users", user.uid);
            const existingDoc = await getDoc(userDocRef);
            const userData = {
                username: newUsername,
                position: newPosition,
                email: user.email || "",
                updatedAt: serverTimestamp()
            };
            if (!existingDoc.exists() || !existingDoc.data()?.createdAt) {
                userData.createdAt = serverTimestamp();
            }

            await setDoc(userDocRef, userData, { merge: true });

            try { await updateProfile(user, { displayName: newUsername }); } catch (_) {}

            if (nameEl) nameEl.textContent = newUsername;
            if (positionDispEl) positionDispEl.textContent = newPosition;

            usernameStatus.textContent = "✓ Saved."; usernameStatus.classList.add("success");
            positionStatus.textContent = "✓ Saved."; positionStatus.classList.add("success");

            this.dispatchEvent(new CustomEvent("profile-updated", {
                detail: { username: newUsername, position: newPosition },
                bubbles: true, composed: true
            }));
        } catch (err) {
            console.error("Save failed:", err);
            usernameStatus.textContent = "❌ Failed. Try again."; usernameStatus.classList.add("error");
            positionStatus.textContent = "❌ Failed. Try again."; positionStatus.classList.add("error");
        } finally {
            saveBtn.disabled = false;
        }
    }
}

customElements.define("profile-setup", ProfileSetup);
