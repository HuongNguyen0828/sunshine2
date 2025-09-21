// app/(teacher)/(tabs)/dashboard.tsx
import { View, Text, Pressable, ActivityIndicator, ScrollView } from "react-native";
import { useEffect, useMemo, useState } from "react";
import { colors } from "@/constants/color";
import { useRouter } from "expo-router";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { teacherReportsStyles as s } from "@/styles/screens/teacherReports";

type Child = {
  id: string;
  name: string;
  classroomId?: string;
  status?: string;
};

export default function TeacherReports() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Live subscription to `children` (enrolled only)
  useEffect(() => {
    const q = query(collection(db, "children"), where("status", "==", "enrolled"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: Child[] = snap.docs.map((d) => {
          const x = d.data() as any;
          return {
            id: d.id,
            name: x.name ?? "(no name)",
            classroomId: x.classroomId,
            status: x.status,
          };
        });
        rows.sort((a, b) => a.name.localeCompare(b.name));
        setChildren(rows);
        setLoading(false);
      },
      () => {
        setChildren([]);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Group by classroom id
  const grouped = useMemo(() => {
    const map = new Map<string, Child[]>();
    for (const c of children) {
      const key = c.classroomId ? String(c.classroomId) : "Unassigned";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    const arr = Array.from(map.entries());
    arr.sort((a, b) => a[0].localeCompare(b[0]));
    return arr;
  }, [children]);

  if (loading) {
    return (
      <View style={[s.loadingWrap, { flex: 1, backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.activityIndicator} />
        <Text style={s.loadingText}>Loading children...</Text>
      </View>
    );
  }

  return (
    // Root background fills behind the tab bar as well
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={s.container}
      >
        <Text style={s.title}>Dashboard</Text>

        {grouped.map(([classId, kids]) => (
          <View key={classId} style={s.group}>
            <View style={s.groupHeader}>
              <Text style={s.groupHeaderText}>
                {classId === "Unassigned" ? "Unassigned" : `Class ${classId}`}
              </Text>
            </View>

            {kids.map((child) => (
              <Pressable
                key={child.id}
                onPress={() => router.push(`/(teacher)/report/${child.id}`)}
                style={s.card}
              >
                <View style={s.row}>
                  <Text style={s.name}>{child.name}</Text>
                  {!!child.classroomId && <Text style={s.classBadge}>{/* reserved */}</Text>}
                </View>
              </Pressable>
            ))}
          </View>
        ))}

        {children.length === 0 && (
          <View style={s.emptyWrap}>
            <Text style={s.emptyText}>No children</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
