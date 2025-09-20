// app/(parent)/(tabs)/dashboard.tsx
import { View, Text, ActivityIndicator, ScrollView } from "react-native";
import { useEffect, useState } from "react";
import { colors } from "@/constants/color";
import { fontSize } from "@/constants/typography";
import { parentDashboardStyles as s, pillStyles as p } from "@/styles/screens/parentDashboard";
import { auth, db } from "@/lib/firebase";
import { collection, onSnapshot, query, where, doc } from "firebase/firestore";

type StatusDoc = {
  attendance?: { state?: "In" | "Out"; at?: any };
  meal?: { menu?: string[]; at?: any };
  nap?: { duration_min?: number; at?: any };
  toilet?: { note?: string; at?: any };
};

type ChildRow = { id: string; name: string };

export default function ParentDashboard() {
  const [children, setChildren] = useState<ChildRow[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, StatusDoc>>({});
  const [loading, setLoading] = useState(true);

  // Subscribe to children and then subscribe to each child's status doc
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setChildren([]);
      setStatusMap({});
      setLoading(false);
      return;
    }

    const childrenQ = query(collection(db, "children"), where("guardianUids", "array-contains", uid));
    let statusUnsubs: Array<() => void> = [];

    const unsubChildren = onSnapshot(
      childrenQ,
      (snap) => {
        const kids = snap.docs.map((d) => ({
          id: d.id,
          name: (d.data() as any).name ?? "(no name)",
        }));
        setChildren(kids);

        // Reset previous status listeners
        statusUnsubs.forEach((u) => u());
        statusUnsubs = [];
        setLoading(true);

        // Subscribe to status/{childId} for each kid
        kids.forEach((k) => {
          const u = onSnapshot(
            doc(db, "status", k.id),
            (s) => {
              setStatusMap((prev) => ({ ...prev, [k.id]: (s.data() as any) ?? {} }));
              setLoading(false);
            },
            () => setLoading(false)
          );
          statusUnsubs.push(u);
        });

        if (kids.length === 0) setLoading(false);
      },
      () => {
        setChildren([]);
        setStatusMap({});
        setLoading(false);
      }
    );

    return () => {
      unsubChildren();
      statusUnsubs.forEach((u) => u());
    };
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={colors.activityIndicator} />
        <Text style={{ marginTop: 8, color: colors.textDim, fontSize: fontSize.md, lineHeight: 22 }}>
          Loading...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.container}>
      {children.length === 0 ? (
        <View style={{ alignItems: "center", marginTop: 28 }}>
          <Text style={{ color: colors.textDim, fontSize: fontSize.md, lineHeight: 22 }}>No children</Text>
        </View>
      ) : (
        children.map((k) => {
          const sdoc = statusMap[k.id] ?? {};
          const pills = [
            buildAttendancePill(sdoc.attendance),
            buildMealPill(sdoc.meal),
            buildNapPill(sdoc.nap),
            buildToiletPill(sdoc.toilet),
          ];

          return (
            <View key={k.id} style={s.card}>
              {/* Child name */}
              <Text style={s.childName}>{k.name}</Text>

              {/* Pills row */}
              <View style={s.pillRow}>
                {pills.map((pd, idx) =>
                  pd ? (
                    <View key={idx} style={p.container}>
                      <Text style={p.emoji}>{pd.emoji}</Text>
                      <Text style={p.title}>{pd.title}</Text>
                      {pd.detail ? <Text style={p.meta}>{` • ${pd.detail}`}</Text> : null}
                      {pd.time ? <Text style={p.meta}>{` • ${pd.time}`}</Text> : null}
                    </View>
                  ) : (
                    <View key={`placeholder-${idx}`} style={[p.container, p.placeholder]}>
                      <Text style={p.meta}>-</Text>
                    </View>
                  )
                )}
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

/* ----------------- helpers ----------------- */

function buildAttendancePill(a?: { state?: "In" | "Out"; at?: any }) {
  if (!a?.state && !a?.at) return null;
  const emoji = a?.state === "In" ? "✅" : "🚪";
  const title = "Attendance";
  const detail = a?.state ?? undefined;
  const time = toHM(a?.at);
  return { emoji, title, detail, time };
}

function buildMealPill(m?: { menu?: string[]; at?: any }) {
  if (!m?.menu?.length && !m?.at) return null;
  const emoji = "🍽️";
  const title = "Meal";
  const detail = (m?.menu ?? []).join(", ") || undefined;
  const time = toHM(m?.at);
  return { emoji, title, detail, time };
}

function buildNapPill(n?: { duration_min?: number; at?: any }) {
  if (typeof n?.duration_min !== "number" && !n?.at) return null;
  const emoji = "😴";
  const title = "Nap";
  const detail = typeof n?.duration_min === "number" ? `${n.duration_min} min` : undefined;
  const time = toHM(n?.at);
  return { emoji, title, detail, time };
}

function buildToiletPill(t?: { note?: string; at?: any }) {
  if (!t?.note && !t?.at) return null;
  const emoji = "🚽";
  const title = "Toilet";
  const detail = t?.note || undefined;
  const time = toHM(t?.at);
  return { emoji, title, detail, time };
}

// Format Firestore Timestamp -> "HH:MM" local time
function toHM(v: any): string | undefined {
  if (!v) return undefined;
  if (typeof v === "object" && typeof v.seconds === "number") {
    const ms = v.seconds * 1000 + Math.floor((v.nanoseconds || 0) / 1e6);
    const d = new Date(ms);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }
  return undefined;
}
