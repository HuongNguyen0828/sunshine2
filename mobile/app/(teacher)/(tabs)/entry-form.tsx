import { View, Text, Pressable, TextInput, Alert, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { createEntries } from "@/services/useEntriesAPI";
import type {
  EntryType,
  EntryCreateInput,
  AttendanceSubtype,
  FoodSubtype,
  SleepSubtype,
  ToiletSubtype,
} from "../../../../shared/types/type";

const ATTENDANCE_SUBTYPES: AttendanceSubtype[] = ["Check in", "Check out"];
const FOOD_SUBTYPES: FoodSubtype[] = ["Breakfast", "Lunch", "Snack"];
const SLEEP_SUBTYPES: SleepSubtype[] = ["Started", "Woke up"];
const TOILET_SUBTYPES: ToiletSubtype[] = ["Wet", "BM", "Dry"];

export default function EntryForm() {
  const router = useRouter();
  const p = useLocalSearchParams<{ type: EntryType; classId?: string; childIds: string }>();

  const type = p.type as EntryType;
  const classId = p.classId && String(p.classId) ? String(p.classId) : null;
  const childIds = useMemo(
    () => JSON.parse(String(p.childIds || "[]")) as string[],
    [p.childIds]
  );

  const [subtype, setSubtype] = useState<string | undefined>();
  const [detail, setDetail] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const subtypeOptions = useMemo(() => {
    if (type === "Attendance") return ATTENDANCE_SUBTYPES;
    if (type === "Food") return FOOD_SUBTYPES;
    if (type === "Sleep") return SLEEP_SUBTYPES;
    if (type === "Toilet") return TOILET_SUBTYPES;
    return [];
  }, [type]);

  const needsSubtype = ["Attendance", "Food", "Sleep", "Toilet"].includes(type);
  const needsPhoto = type === "Photo";
  const needsDetail = type === "Schedule_note" || type === "Supply Request" || type === "Photo";

  async function onSubmit() {
    if (!childIds.length) return Alert.alert("Please select children first.");
    if (needsSubtype && !subtype) return Alert.alert("Please choose a subtype.");
    if (type === "Photo" && !photoUrl.trim()) return Alert.alert("Photo URL is required.");
    if ((type === "Schedule_note" || type === "Supply Request") && !detail.trim())
      return Alert.alert("Detail is required.");

    let payload: EntryCreateInput;
    if (type === "Attendance") {
      payload = { type, subtype: subtype as AttendanceSubtype, childIds, classId, detail };
    } else if (type === "Food") {
      payload = { type, subtype: subtype as FoodSubtype, childIds, classId, detail };
    } else if (type === "Sleep") {
      payload = { type, subtype: subtype as SleepSubtype, childIds, classId, detail };
    } else if (type === "Toilet") {
      payload = { type, subtype: subtype as ToiletSubtype, childIds, classId, detail };
    } else if (type === "Photo") {
      payload = { type, childIds, classId, detail, photoUrl };
    } else if (type === "Schedule_note") {
      payload = { type, childIds, classId, detail };
    } else {
      payload = { type: "Supply Request", childIds, classId, detail };
    }

    try {
      setSaving(true);
      const res = await createEntries([payload]);
      if (!res.ok) throw new Error(res.reason || "Failed to save");
      router.back();
    } catch (e: any) {
      Alert.alert("Save failed", String(e.message || e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>{type}</Text>
      <Text style={{ color: "#64748B" }}>{childIds.length} children selected</Text>

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

      {needsDetail ? (
        <View style={{ gap: 8 }}>
          <Text style={{ fontWeight: "600" }}>Note</Text>
          <TextInput
            placeholder="Add a note..."
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
      ) : null}

      {needsPhoto ? (
        <View style={{ gap: 8 }}>
          <Text style={{ fontWeight: "600" }}>Photo URL</Text>
          <TextInput
            placeholder="https://..."
            value={photoUrl}
            onChangeText={setPhotoUrl}
            autoCapitalize="none"
            style={{ borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, padding: 12 }}
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
        <Text style={{ color: "white", fontWeight: "700" }}>{saving ? "Saving..." : "Save"}</Text>
      </Pressable>
    </ScrollView>
  );
}
