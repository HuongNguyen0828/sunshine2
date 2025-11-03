// mobile/app/(teacher)/entry-form.tsx
import { View, Text, Pressable, TextInput, Alert, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { bulkCreateEntries } from "@/services/useEntriesAPI";
import type {
  EntryType,
  EntryCreateInput,
  AttendanceSubtype,
  FoodSubtype,
  SleepSubtype,
} from "../../../shared/types/type";

// subtype options
const ATTENDANCE_SUBTYPES: AttendanceSubtype[] = ["Check in", "Check out"];
const FOOD_SUBTYPES: FoodSubtype[] = ["Breakfast", "Lunch", "Snack"];
const SLEEP_SUBTYPES: SleepSubtype[] = ["Started", "Woke up"];

// toilet kind is not in shared types (backend expects "urine" | "bm")
type ToiletKind = "urine" | "bm";

// ISO helper
const nowIso = () => new Date().toISOString();

export default function EntryForm() {
  const router = useRouter();
  // we expect: type, classId?, childIds (JSON array string)
  const p = useLocalSearchParams<{ type: EntryType; classId?: string; childIds: string }>();

  const type = p.type as EntryType;
  // empty string → null
  const classId = p.classId && String(p.classId).trim() ? String(p.classId) : null;
  const childIds = useMemo(
    () => JSON.parse(String(p.childIds || "[]")) as string[],
    [p.childIds]
  );

  // local form state
  const [subtype, setSubtype] = useState<string | undefined>();
  const [detail, setDetail] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [toiletKind, setToiletKind] = useState<ToiletKind | undefined>();
  const [saving, setSaving] = useState(false);

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
  const needsPhoto = type === "Photo";
  const needsDetail = ["Activity", "Note", "Health"].includes(type);

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

    if (needsPhoto && !photoUrl.trim()) {
      return Alert.alert("Photo URL is required.");
    }

    if (needsDetail && !detail.trim()) {
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
      payload = {
        type,
        subtype: subtype as FoodSubtype,
        childIds,
        classId,
        detail: detail || undefined,
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
      // backend expects toiletKind, occurredAt, and childIds
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
        detail: detail || undefined,
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
      return Alert.alert("Unsupported type");
    }

    try {
      setSaving(true);
      // we always send only the selected children (no class fan-out here)
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
        {childIds.length === 1
          ? "1 child selected"
          : `${childIds.length} children selected`}
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
                <Text style={{ color: subtype === opt ? "white" : "#111827" }}>
                  {opt}
                </Text>
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

      {(needsDetail || type === "Photo") && (
        <View style={{ gap: 8 }}>
          <Text style={{ fontWeight: "600" }}>
            {type === "Photo" ? "Caption (optional)" : "Note"}
          </Text>
          <TextInput
            placeholder={type === "Photo" ? "Add a caption..." : "Add a note..."}
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

      {needsPhoto ? (
        <View style={{ gap: 8 }}>
          <Text style={{ fontWeight: "600" }}>Photo URL</Text>
          <TextInput
            placeholder="https://..."
            value={photoUrl}
            onChangeText={setPhotoUrl}
            autoCapitalize="none"
            style={{
              borderWidth: 1,
              borderColor: "#E5E7EB",
              borderRadius: 12,
              padding: 12,
            }}
          />
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
        }}
      >
        <Text style={{ color: "white", fontWeight: "700" }}>
          {saving ? "Saving..." : "Save"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
