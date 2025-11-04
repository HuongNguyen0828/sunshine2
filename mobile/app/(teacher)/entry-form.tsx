// mobile/app/(teacher)/entry-form.tsx
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
import { useSafeAreaInsets, SafeAreaView } from "react-native-safe-area-context";
import { bulkCreateEntries } from "@/services/useEntriesAPI";
import { pickAndUploadImage } from "@/lib/uploadImage";
import type {
  EntryType,
  EntryCreateInput,
  AttendanceSubtype,
  FoodSubtype,
  SleepSubtype,
  ToiletKind,
} from "../../../shared/types/type";

// subtype options
const ATTENDANCE_SUBTYPES: AttendanceSubtype[] = ["Check in", "Check out"];
const FOOD_SUBTYPES: FoodSubtype[] = ["Breakfast", "Lunch", "Snack"];
const SLEEP_SUBTYPES: SleepSubtype[] = ["Started", "Woke up"];

// ISO helper
const nowIso = () => new Date().toISOString();

export default function EntryForm() {
  const router = useRouter();
  // we expect: type, classId?, childIds (JSON array string)
  const p = useLocalSearchParams<{ type: EntryType; classId?: string; childIds: string }>();

  const type = p.type as EntryType;
  const classId = p.classId && String(p.classId).trim() ? String(p.classId) : null;
  const childIds = useMemo(
    () => JSON.parse(String(params.childIds || "[]")) as string[],
    [params.childIds]
  );

  // local form state
  const [subtype, setSubtype] = useState<string | undefined>();
  const [detail, setDetail] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [toiletKind, setToiletKind] = useState<ToiletKind | undefined>();
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // subtype options only for Attendance / Food / Sleep
  const subtypeOptions = useMemo(() => {
    if (type === "Attendance") return ATTENDANCE_SUBTYPES;
    if (type === "Food") return FOOD_SUBTYPES;
    if (type === "Sleep") return SLEEP_SUBTYPES;
    return [];
  }, [type]);

  // dynamic flags
  const needsSubtype = ["Attendance", "Food", "Sleep"].includes(type);
  const needsToiletKind = type === "Toilet";
  // food도 간단한 설명 필드가 필요하다고 했으니 여기 포함
  const needsDetail = ["Activity", "Note", "Health", "Food"].includes(type);
  const isPhoto = type === "Photo";

  async function handlePickPhoto() {
    try {
      setUploadingPhoto(true);
      const url = await pickAndUploadImage();
      if (url) {
        setPhotoUrl(url);
      } else {
        Alert.alert("Upload cancelled", "No image selected.");
      }
    } catch (e: any) {
      Alert.alert("Upload failed", String(e?.message || e));
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function onSubmit() {
    if (!childIds.length) {
      return Alert.alert("Please select children first.");
    }

    if (needsSubtype && !subtype) {
      return Alert.alert("Please choose a subtype.");
    }

    if (needsToiletKind && !toiletKind) {
      return Alert.alert("Please select urine or bm.");
    }

    if (isPhoto && !photoUrl.trim()) {
      return Alert.alert("Please upload a photo.");
    }

    if (needsDetail && !detail.trim()) {
      // Food 포함해서 여기로 옴
      return Alert.alert("Detail is required.");
    }

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
      // subtype + 메뉴/설명(detail)
      payload = {
        type,
        subtype: subtype as FoodSubtype,
        childIds,
        classId,
        detail, // required now
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
        toiletKind: toiletKind!, // "urine" | "bm"
      };
    } else if (type === "Photo") {
      payload = {
        type,
        childIds,
        classId,
        photoUrl,
        detail: detail || undefined, // optional caption
        occurredAt,
      };
    } else if (type === "Activity") {
      payload = {
        type,
        childIds,
        classId,
        detail,
        occurredAt,
      };
    } else if (type === "Note") {
      payload = {
        type,
        childIds,
        classId,
        detail,
        occurredAt,
      };
    } else if (type === "Health") {
      payload = {
        type,
        childIds,
        classId,
        detail,
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
    }

    try {
      setSaving(true);
      const res = await bulkCreateEntries([payload]);
      if (!res.ok) throw new Error(res.reason || "Failed to save");
      router.back();
    } catch (e: any) {
      Alert.alert("Save failed", String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      {/* Back to dashboard */}
      <Pressable
        onPress={() => router.back()}
        style={{
          alignSelf: "flex-start",
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 999,
          backgroundColor: "#E2E8F0",
          marginBottom: 4,
        }}
      >
        <Text style={{ color: "#0F172A", fontWeight: "500" }}>← Back</Text>
      </Pressable>

      <Text style={{ fontSize: 22, fontWeight: "700" }}>{type}</Text>
      <Text style={{ color: "#64748B" }}>
        {childIds.length === 1 ? "1 child selected" : `${childIds.length} children selected`}
      </Text>

      {needsSubtype ? (
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
                <Text style={{ color: subtype === opt ? "white" : "#111827" }}>{opt}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {needsToiletKind ? (
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
                <Text style={{ color: toiletKind === k ? "white" : "#111827" }}>
                  {k === "urine" ? "Urine" : "BM"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {/* Detail / Description */}
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
              backgroundColor: saving || uploadingPhoto ? "#A5B4FC" : "#6366F1",
              padding: 14,
              borderRadius: 12,
              alignItems: "center",
              marginTop: 8,
            }}
            multiline
          />
        </View>
      )}

      {/* Photo picker for Photo type */}
      {isPhoto ? (
        <View style={{ gap: 8 }}>
          <Text style={{ fontWeight: "600" }}>Photo</Text>
          <Pressable
            onPress={handlePickPhoto}
            disabled={uploadingPhoto}
            style={{
              backgroundColor: uploadingPhoto ? "#CBD5F5" : "#6366F1",
              padding: 12,
              borderRadius: 12,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {uploadingPhoto ? (
              <>
                <ActivityIndicator color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "600" }}>Uploading…</Text>
              </>
            ) : (
              <Text style={{ color: "#fff", fontWeight: "600" }}>Pick from gallery</Text>
            )}
          </Pressable>

          {photoUrl ? (
            <View
              style={{
                borderWidth: 1,
                borderColor: "#E2E8F0",
                borderRadius: 12,
                overflow: "hidden",
                marginTop: 4,
              }}
            >
              <Image source={{ uri: photoUrl }} style={{ width: "100%", height: 180 }} />
              <Text
                style={{
                  padding: 8,
                  fontSize: 12,
                  color: "#475569",
                }}
              >
                {photoUrl}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <Pressable
        disabled={saving}
        onPress={onSubmit}
        style={{
          backgroundColor: saving ? "#A5B4FC" : "#6366F1",
          padding: 14,
          borderRadius: 12,
          alignItems: "center",
          marginTop: 8,
          marginBottom: 16,
        }}
      >
        <Text style={{ color: "white", fontWeight: "700" }}>
          {saving ? "Saving..." : "Save"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
