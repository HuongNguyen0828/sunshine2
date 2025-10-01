// app/(teacher)/report/[childId].tsx
import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { auth, db } from "@/lib/firebase";
import { colors } from "@/constants/color";
import {
  checkIn,
  checkOut,
  addMeal,
  addNap,
  addNote,
  addToilet,
} from "@/features/entries";
import { doc, getDoc } from "firebase/firestore";
import { reportChildStyles as s } from "@/styles/screens/teacherReportChild";

export default function ReportChild() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const router = useRouter();
  const staffId = auth.currentUser?.uid || "anonymous";

  // Child meta
  const [childName, setChildName] = useState("");
  const [childLoading, setChildLoading] = useState(true);

  // Local inputs
  const [meal, setMeal] = useState("");
  const [napMin, setNapMin] = useState("");
  const [note, setNote] = useState("");
  const [toiletNote, setToiletNote] = useState("");

  // Busy label for buttons
  const [busy, setBusy] = useState<string | null>(null);

  // Load child display name
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setChildLoading(true);
        const snap = await getDoc(doc(db, "children", String(childId)));
        if (!alive) return;
        setChildName((snap.data()?.name as string) ?? "(no name)");
      } finally {
        if (alive) setChildLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [childId]);

  // Generic action runner with feedback
  const run = async (label: string, fn: () => Promise<any>, onOk?: () => void) => {
    try {
      setBusy(label);
      await fn();
      onOk?.();
      Alert.alert("Saved", `${label} recorded`);
    } catch {
      Alert.alert("Error", "Failed to save");
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={s.container}>
        {/* Title */}
        <Text style={s.title}>Record</Text>

        {/* Child: Name */}
        <View style={s.childRow}>
          <Text style={s.childLabel}>Child:</Text>
          {childLoading ? (
            <ActivityIndicator size="small" color={colors.activityIndicator} />
          ) : (
            <Text style={s.childName}>{childName}</Text>
          )}
        </View>

        {/* Attendance */}
        <View style={s.actionRow}>
          <Pressable
            onPress={() =>
              run("Check in", () =>
                checkIn({ childId: String(childId), staffId })
              )
            }
            style={s.button}
          >
            {busy === "Check in" ? (
              <ActivityIndicator color={colors.palette.neutral100} />
            ) : (
              <Text style={s.buttonText}>Check in</Text>
            )}
          </Pressable>

          <Pressable
            onPress={() =>
              run("Check out", () =>
                checkOut({ childId: String(childId), staffId })
              )
            }
            style={s.button}
          >
            {busy === "Check out" ? (
              <ActivityIndicator color={colors.palette.neutral100} />
            ) : (
              <Text style={s.buttonText}>Check out</Text>
            )}
          </Pressable>
        </View>

        {/* Meal */}
        <Text style={s.sectionLabel}>Meal</Text>
        <View style={s.inputRow}>
          <TextInput
            value={meal}
            onChangeText={setMeal}
            placeholder="Menu items (comma separated)"
            placeholderTextColor={colors.textDim}
            style={s.input}
          />
          <Pressable
            onPress={() =>
              meal.trim() &&
              run(
                "Meal",
                () =>
                  addMeal({
                    childId: String(childId),
                    staffId,
                    menu: meal
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  }),
                () => setMeal("")
              )
            }
            style={s.button}
          >
            {busy === "Meal" ? (
              <ActivityIndicator color={colors.palette.neutral100} />
            ) : (
              <Text style={s.buttonText}>Save</Text>
            )}
          </Pressable>
        </View>

        {/* Nap */}
        <Text style={s.sectionLabel}>Nap (minutes)</Text>
        <View style={s.inputRow}>
          <TextInput
            value={napMin}
            onChangeText={setNapMin}
            keyboardType="number-pad"
            placeholder="e.g., 45"
            placeholderTextColor={colors.textDim}
            style={s.input}
          />
          <Pressable
            onPress={() => {
              const n = parseInt(napMin, 10);
              if (!Number.isFinite(n) || n <= 0) return;
              run(
                "Nap",
                () => addNap({ childId: String(childId), staffId, minutes: n }),
                () => setNapMin("")
              );
            }}
            style={s.button}
          >
            {busy === "Nap" ? (
              <ActivityIndicator color={colors.palette.neutral100} />
            ) : (
              <Text style={s.buttonText}>Save</Text>
            )}
          </Pressable>
        </View>

        {/* Toilet */}
        <Text style={s.sectionLabel}>Toilet</Text>
        <View style={s.inputRow}>
          <TextInput
            value={toiletNote}
            onChangeText={setToiletNote}
            placeholder="Optional note..."
            placeholderTextColor={colors.textDim}
            style={s.input}
          />
          <Pressable
            onPress={() =>
              run(
                "Toilet",
                () =>
                  addToilet({
                    childId: String(childId),
                    staffId,
                    note: toiletNote.trim() || undefined,
                  }),
                () => setToiletNote("")
              )
            }
            style={s.button}
          >
            {busy === "Toilet" ? (
              <ActivityIndicator color={colors.palette.neutral100} />
            ) : (
              <Text style={s.buttonText}>Save</Text>
            )}
          </Pressable>
        </View>

        {/* Note (optional) */}
        <Text style={s.sectionLabel}>Note</Text>
        <View style={s.inputRow}>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Optional note to parents"
            placeholderTextColor={colors.textDim}
            style={s.input}
            multiline
          />
          <Pressable
            onPress={() =>
              note.trim() &&
              run(
                "Note",
                () => addNote({ childId: String(childId), staffId, text: note.trim() }),
                () => setNote("")
              )
            }
            style={s.button}
          >
            {busy === "Note" ? (
              <ActivityIndicator color={colors.palette.neutral100} />
            ) : (
              <Text style={s.buttonText}>Save</Text>
            )}
          </Pressable>
        </View>

        {/* Back */}
        <Pressable onPress={() => router.back()} style={s.backLink}>
          <Text style={s.backText}>Back</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
