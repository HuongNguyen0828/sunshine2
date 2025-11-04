// mobile/lib/uploadImage.ts
import * as ImagePicker from "expo-image-picker";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebase";

/**
 * Opens the gallery, uploads picked image to Firebase Storage,
 * and returns the download URL.
 * Returns null when user cancels.
 */
export async function pickAndUploadImage(
  pathPrefix: string = "entry-photos"
): Promise<string | null> {
  // 0. clear any pending picker result (important on Android)
  try {
    const pending = await ImagePicker.getPendingResultAsync?.();
    // we don't actually need pending, just calling it drains stale overlays
    void pending;
  } catch {
    // older versions might not have this; ignore
  }

  // 1. permission
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new Error("Photo permission not granted");
  }

  // 2. open picker (support both old and new API)
  const pickerOpts: any = {
    quality: 0.85,
    allowsEditing: false,
  };

  // older expo-image-picker: MediaTypeOptions.Images
  // newer expo-image-picker: mediaTypes: [ImagePicker.MediaType.IMAGE]
  if ((ImagePicker as any).MediaType) {
    pickerOpts.mediaTypes = [(ImagePicker as any).MediaType.IMAGE];
  } else {
    pickerOpts.mediaTypes = ImagePicker.MediaTypeOptions.Images;
  }

  const result = await ImagePicker.launchImageLibraryAsync(pickerOpts);

  // user cancelled
  if (result.canceled) {
    return null;
  }

  const asset = result.assets?.[0];
  if (!asset?.uri) {
    throw new Error("No image selected");
  }

  // 3. uri -> blob
  const resp = await fetch(asset.uri);
  const blob = await resp.blob();

  // 4. upload
  const fileId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const storagePath = `${pathPrefix}/${fileId}.jpg`;
  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, blob, {
    contentType: blob.type || "image/jpeg",
  });

  // 5. download url
  const url = await getDownloadURL(storageRef);
  return url;
}
