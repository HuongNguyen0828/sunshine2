// mobile/app/(teacher)/entry-form.tsx
import React, { useMemo, useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ChildRow } from "./(tabs)/dashboard";
import { sendNotificationsToTheirParents } from "@/services/sendNotficationService";

import {
  View,
  Text,
  Pressable,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  useSafeAreaInsets,
  SafeAreaView,
} from "react-native-safe-area-context";
import { bulkCreateEntries } from "@/services/useEntriesAPI";
import { pickAndUploadImage } from "@/lib/uploadImage";
import type {
  EntryType,
  EntryCreateInput,
  AttendanceSubtype,
  FoodSubtype,
  SleepSubtype,
} from "../../../shared/types/type";

import { useAppContext } from "@/contexts/AppContext";

type ToiletKind = "urine" | "bm";

import {
  ATTENDANCE_SUBTYPES,
  FOOD_SUBTYPES,
  SLEEP_SUBTYPES,
} from "@/services/sendNotficationService";

const nowIso = () => new Date().toISOString();

export default function EntryForm() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { sharedData } = useAppContext();

  // params: type, classId?, childIds(JSON)
  const params = useLocalSearchParams<{
    type: EntryType;
    classId?: string;
    childIds: string;
  }>();
  const type = params.type as EntryType;
  const classId =
    params.classId && params.classId.trim() ? params.classId.trim() : null;
  const childIds = useMemo(
    () => JSON.parse(String(params.childIds || "[]")) as string[],
    [params.childIds]
  );

  const [subtype, setSubtype] = useState<string | undefined>();
  const [detail, setDetail] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [toiletKind, setToiletKind] = useState<ToiletKind | undefined>();
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // force-remount counter (after picker close)
  const [rev, setRev] = useState(0);

  const subtypeOptions = useMemo(() => {
    if (type === "Attendance") return ATTENDANCE_SUBTYPES;
    if (type === "Food") return FOOD_SUBTYPES;
    if (type === "Sleep") return SLEEP_SUBTYPES;
    return [];
  }, [type]);

  const needsSubtype = ["Attendance", "Food", "Sleep"].includes(type);
  const needsToiletKind = type === "Toilet";
  const needsDetail = ["Activity", "Note", "Health", "Food"].includes(type);
  const isPhoto = type === "Photo";

  async function handlePickPhoto() {
    try {
      setUploadingPhoto(true);
      const url = await pickAndUploadImage("entry-photos");
      if (url) {
        setPhotoUrl(url);
      }
    } catch (e: any) {
      Alert.alert("Upload failed", String(e?.message || e));
    } finally {
      // make sure UI re-measures after picker closes
      setUploadingPhoto(false);
      setRev((r) => r + 1);
    }
  }

  async function onSubmit() {
    if (!childIds.length) return Alert.alert("Please select children first.");
    if (needsSubtype && !subtype)
      return Alert.alert("Please choose a subtype.");
    if (needsToiletKind && !toiletKind)
      return Alert.alert("Please select urine or bm.");
    if (isPhoto && !photoUrl.trim())
      return Alert.alert("Please upload a photo.");
    if (needsDetail && !detail.trim())
      return Alert.alert("Detail is required.");

    const occurredAt = nowIso();
    let payload: EntryCreateInput;

    if (type === "Attendance") {
      payload = {
        type,
        subtype: subtype as AttendanceSubtype,
        childIds,
        classId,
        detail: detail || undefined,
        occurredAt,
      };
    } else if (type === "Food") {
      payload = {
        type,
        subtype: subtype as FoodSubtype,
        childIds,
        classId,
        detail, // required
        occurredAt,
      };
    } else if (type === "Sleep") {
      payload = {
        type,
        subtype: subtype as SleepSubtype,
        childIds,
        classId,
        detail: detail || undefined,
        occurredAt,
      };
    } else if (type === "Toilet") {
      payload = {
        type,
        childIds,
        classId,
        detail: detail || undefined,
        occurredAt,
        toiletKind: toiletKind!,
      };
    } else if (type === "Photo") {
      payload = {
        type,
        childIds,
        classId,
        photoUrl,
        detail: detail || undefined,
        occurredAt,
      };
    } else {
      // Activity / Note / Health
      payload = {
        type,
        childIds,
        classId,
        detail,
        occurredAt,
      };
      console.log("Payload", payload);
    }

    try {
      setSaving(true);
      const res = await bulkCreateEntries([payload]);
      console.log("Reached entry");
      // inside onSubmit after bulkCreateEntries and only when type === "Attendance"
      // if (type === "Attendance") {
      const title = type;
      const detail = payload.detail ?? subtype; // Either details or subtype is detail
      const childrenContext = sharedData["children"] as ChildRow[];

      // 1) collect parentIds (unique)
      const parentIds = childIds.flatMap((childId) => {
        const child = childrenContext.find((c: ChildRow) => c.id === childId);
        return child?.parentIds ?? [];
      });
      const uniqueParentIds = Array.from(new Set(parentIds));

      // 2) resolve parent subIDs (emails or specific subID field)
      const parentSubIDs: string[] = [];
      for (const parentId of uniqueParentIds) {
        try {
          const parentRef = doc(db, "users", parentId);
          const snapshot = await getDoc(parentRef);
          if (snapshot.exists()) {
            const data = snapshot.data() as any;
            // choose the field you used when you registered the parent with native-notify:
            // likely data.email OR data.userId (whatever you used as subID)
            const subID = data.email ?? data.userId ?? null;
            if (subID) parentSubIDs.push(String(subID));
          }
        } catch (err) {
          console.warn("Failed to fetch parent doc", parentId, err);
        }
      }

      if (parentSubIDs.length > 0) {
        // 3) send Indie push — one request per subID
        sendNotificationsToTheirParents(title, detail, parentSubIDs);
        // }

        // 4) Save notifications in Firestore per parent
        for (const subID of parentSubIDs) {
          try {
            await setDoc(doc(db, "notifications", subID, "logs", occurredAt), {
              title,
              detail,
              date: occurredAt,
              read: false,
            });
          } catch (err) {
            console.warn(`Failed to save notification for ${subID}`, err);
          }
        }
      }

      if (!res.ok) throw new Error(res.reason || "Failed to save");
      router.back();
    } catch (e: any) {
      Alert.alert("Save failed", String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <View key={rev} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 16,
            paddingTop: 56, // space for floating back button
            gap: 12,
          }}
        >
          <Text style={{ fontSize: 22, fontWeight: "700" }}>{type}</Text>
          <Text style={{ color: "#64748B" }}>
            {childIds.length === 1
              ? "1 child selected"
              : `${childIds.length} children selected`}
          </Text>

          {needsSubtype && (
            <View style={{ gap: 8 }}>
              <Text style={{ fontWeight: "600" }}>Subtype</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {subtypeOptions.map((opt) => (
                  <Pressable
                    key={opt}
                    onPress={() => setSubtype(opt)}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      borderRadius: 12,
                      backgroundColor: subtype === opt ? "#6366F1" : "#E5E7EB",
                    }}
                  >
                    <Text
                      style={{ color: subtype === opt ? "white" : "#111827" }}
                    >
                      {opt}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {needsToiletKind && (
            <View style={{ gap: 8 }}>
              <Text style={{ fontWeight: "600" }}>Toilet</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {(["urine", "bm"] as ToiletKind[]).map((k) => (
                  <Pressable
                    key={k}
                    onPress={() => setToiletKind(k)}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      borderRadius: 12,
                      backgroundColor: toiletKind === k ? "#6366F1" : "#E5E7EB",
                    }}
                  >
                    <Text
                      style={{ color: toiletKind === k ? "white" : "#111827" }}
                    >
                      {k === "urine" ? "Urine" : "BM"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {(needsDetail || isPhoto) && (
            <View style={{ gap: 8 }}>
              <Text style={{ fontWeight: "600" }}>
                {type === "Food"
                  ? "Menu / Description"
                  : type === "Photo"
                    ? "Caption (optional)"
                    : "Note"}
              </Text>
              <TextInput
                placeholder={
                  type === "Food"
                    ? "e.g. Chicken soup, apple slices…"
                    : type === "Photo"
                      ? "Add a caption..."
                      : "Add a note..."
                }
                value={detail}
                onChangeText={setDetail}
                style={{
                  borderWidth: 1,
                  borderColor: "#E5E7EB",
                  borderRadius: 12,
                  padding: 12,
                  minHeight: 80,
                }}
                multiline
              />
            </View>
          )}

          {isPhoto && (
            <View style={{ gap: 8 }}>
              <Text style={{ fontWeight: "600" }}>Photo</Text>
              <Pressable
                onPress={uploadingPhoto ? undefined : handlePickPhoto}
                style={{
                  backgroundColor: uploadingPhoto ? "#CBD5F5" : "#6366F1",
                  padding: 12,
                  borderRadius: 12,
                  alignItems: "center",
                }}
              >
                {uploadingPhoto ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: "#fff", fontWeight: "600" }}>
                    Pick from gallery
                  </Text>
                )}
              </Pressable>

              {photoUrl ? (
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: "#E2E8F0",
                    borderRadius: 12,
                    overflow: "hidden",
                  }}
                >
                  <Image
                    source={{ uri: photoUrl }}
                    style={{ width: "100%", height: 180 }}
                  />
                  <Text
                    style={{ padding: 8, fontSize: 12, color: "#475569" }}
                    numberOfLines={1}
                  >
                    {photoUrl}
                  </Text>
                </View>
              ) : null}
            </View>
          )}

          <Pressable
            disabled={saving || uploadingPhoto}
            onPress={onSubmit}
            style={{
              backgroundColor: saving || uploadingPhoto ? "#A5B4FC" : "#6366F1",
              padding: 14,
              borderRadius: 12,
              alignItems: "center",
              marginTop: 8,
            }}
          >
            <Text style={{ color: "white", fontWeight: "700" }}>
              {saving ? "Saving..." : "Save"}
            </Text>
          </Pressable>
        </ScrollView>

        {/* floating back button */}
        <View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            top: insets.top + 8,
            left: 12,
            zIndex: 100,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: "#E2E8F0",
            }}
          >
            <Text style={{ color: "#0F172A", fontWeight: "500" }}>← Back</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
