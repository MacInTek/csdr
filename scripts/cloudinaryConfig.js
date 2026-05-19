/**
 * Cloudinary configuration for unsigned browser uploads.
 *
 * SETUP REQUIRED (if you haven't done this yet):
 *   1. Log in to https://cloudinary.com/console
 *   2. Go to Settings → Upload → Upload presets
 *   3. Click "Add upload preset"
 *   4. Set Signing Mode to "Unsigned"
 *   5. Set the preset name to exactly: csltiv_unsigned
 *      (or change CLOUDINARY_UPLOAD_PRESET below to match whatever name you use)
 *   6. Save the preset
 *
 * Common cause of "Failed to add case":
 *   - The upload preset does not exist or is set to "Signed" instead of "Unsigned"
 *   - The cloud name is wrong
 */

export const CLOUDINARY_CLOUD_NAME = "";

// Must match an UNSIGNED upload preset in your Cloudinary dashboard
export const CLOUDINARY_UPLOAD_PRESET = "csltiv_unsigned";

export const CLOUDINARY_UPLOAD_URL =
  `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;
