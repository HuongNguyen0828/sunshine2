// mobile/lib/uploadImage.ts
import * as ImagePicker from "expo-image-picker";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebase";

/**
 * Pick an image from the device and upload it to Firebase Storage.
 * Returns download URL, or null if user cancelled.
 */
export async function pickAndUploadImage(
  pathPrefix: string = "entry-photos"
): Promise<string | null> {
  // 1. permission
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new Error("Photo permission not granted");
  }

  // 2. open picker 
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.85,
    allowsEditing: false,
  });

  if (result.canceled) return null;

  const asset = result.assets?.[0];
  if (!asset?.uri) {
    throw new Error("No image selected");
  }

  // 3. uri → blob
  const resp = await fetch(asset.uri);
  const blob = await resp.blob();

  // 4. upload
  const fileId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const storagePath = `${pathPrefix}/${fileId}.jpg`;
  const storageRef = ref(storage, storagePath);

  await uploadBytes(storageRef, blob, {
    contentType: blob.type || "image/jpeg",
  });

  // 5. get url
  const downloadUrl = await getDownloadURL(storageRef);
  return downloadUrl;
}
