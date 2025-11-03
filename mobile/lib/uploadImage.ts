// mobile/lib/uploadImage.ts
import * as ImagePicker from "expo-image-picker";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebase";

/**
 * Pick an image from the device and upload it to Firebase Storage.
 *
 * @param pathPrefix storage path prefix, e.g. "entry-photos" → entry-photos/1234.jpg
 * @returns download URL string, or null if user cancelled
 * @throws Error when permission denied or upload failed
 */
export async function pickAndUploadImage(
  pathPrefix: string = "entry-photos"
): Promise<string | null> {
  // 1. ask permission
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new Error("Photo permission not granted");
  }

  // 2. open image picker
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
  });

  // user cancelled
  if (result.canceled) {
    return null;
  }

  const asset = result.assets[0];
  if (!asset?.uri) {
    throw new Error("No image selected");
  }

  // 3. uri → blob
  const response = await fetch(asset.uri);
  const blob = await response.blob();

  // 4. upload to storage
  const filename = `${pathPrefix}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.jpg`;
  const storageRef = ref(storage, filename);

  await uploadBytes(storageRef, blob);

  // 5. get public download url
  const downloadUrl = await getDownloadURL(storageRef);
  return downloadUrl;
}
