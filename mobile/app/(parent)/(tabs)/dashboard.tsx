// app/(parent)/(tabs)/dashboard.tsx
import { View, Text, ActivityIndicator, ScrollView } from "react-native";
import { useEffect, useMemo, useState } from "react";
import { colors } from "@/constants/color";
import { fontSize } from "@/constants/typography";
import {
  parentDashboardStyles as s,
  pillStyles as p,
} from "@/styles/screens/parentDashboard";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
} from "firebase/firestore";

// Firestore entry shape used in UI
type Entry = {
  id: string;
  type: "Attendance" | "Food" | "Sleep" | "Toilet" | "Note" | string;
  subtype?: string;
  detail?: any;
  childId: string;
  createdAt?: any; // Firestore Timestamp
};

type ChildRow = { id: string; name: string };

export default function ParentDashboard() {
  const [children, setChildren] = useState<ChildRow[]>([]);
  // Map childId -> today's entries (ordered desc by createdAt)
  const [entriesByChild, setEntriesByChild] = useState<
    Record<string, Entry[]>
  >({});
  const [loading, setLoading] = useState(true);

  // Build today's window (local) + formatted label (e.g. "Sep 20, 2025")
  const { startTs, endTs, todayLabel } = useMemo(() => {
    const now = new Date();
    const start = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0
    );
    const end = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999
    );
    const label = now.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return { startTs: start, endTs: end, todayLabel: label };
  }, []);

  // Subscribe to each child's entries for today (children는 한 번 읽고 고정)
  useEffect(() => {
    let entryUnsubs: Array<() => void> = [];

    (async () => {
      const user = auth.currentUser;
      if (!user) {
        setChildren([]);
        setEntriesByChild({});
        setLoading(false);
        return;
      }

      setLoading(true);

      // 1) users 컬렉션에서 authUid == uid 인 문서 찾기
      const qUser = query(
        collection(db, "users"),
        where("authUid", "==", user.uid)
      );
      const userSnap = await getDocs(qUser);
      const userDoc = userSnap.docs[0];
      if (!userDoc) {
        setChildren([]);
        setEntriesByChild({});
        setLoading(false);
        return;
      }

      const userData = userDoc.data() as any;
      const rels: Array<{ childId: string }> = Array.isArray(
        userData.childRelationships
      )
        ? userData.childRelationships
        : [];

      const childIds = rels.map((r) => r.childId).filter(Boolean);
      if (childIds.length === 0) {
        setChildren([]);
        setEntriesByChild({});
        setLoading(false);
        return;
      }

      // 2) children 컬렉션에서 이름 가져오기
      const kids: ChildRow[] = [];
      for (const cid of childIds) {
        const cSnap = await getDoc(doc(db, "children", cid));
        if (cSnap.exists()) {
          const c = cSnap.data() as any;
          const fullName =
            `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() ||
            c.name ||
            cid;
          kids.push({ id: cid, name: fullName });
        } else {
          kids.push({ id: cid, name: cid });
        }
      }
      kids.sort((a, b) => a.name.localeCompare(b.name));
      setChildren(kids);

      // 3) 기존 entry 리스너 정리
      entryUnsubs.forEach((u) => u());
      entryUnsubs = [];
      setEntriesByChild({});

      // 4) 각 child에 대해 오늘자 entries 구독
      kids.forEach((k) => {
        const qEnt = query(
          collection(db, "entries"),
          where("childId", "==", k.id),
          where("createdAt", ">=", startTs),
          where("createdAt", "<=", endTs),
          orderBy("createdAt", "desc")
        );

        const u = onSnapshot(
          qEnt,
          (esnap) => {
            const rows: Entry[] = esnap.docs.map((d) => ({
              id: d.id,
              ...(d.data() as any),
            }));
            setEntriesByChild((prev) => ({ ...prev, [k.id]: rows }));
            setLoading(false);
          },
          () => {
            setEntriesByChild((prev) => ({ ...prev, [k.id]: [] }));
            setLoading(false);
          }
        );

        entryUnsubs.push(u);
      });

      if (kids.length === 0) setLoading(false);
    })();

    return () => {
      entryUnsubs.forEach((u) => u());
    };
  }, [startTs, endTs]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator
          size="large"
          color={colors.activityIndicator}
        />
        <Text
          style={{
            marginTop: 8,
            color: colors.textDim,
            fontSize: fontSize.md,
            lineHeight: 22,
          }}
        >
          Loading...
        </Text>
      </View>
    );
  }

  return (
    // Root background stretches behind the tab bar
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={s.container}
      >
        {children.length === 0 ? (
          <View style={{ alignItems: "center", marginTop: 28 }}>
            <Text
              style={{
                color: colors.textDim,
                fontSize: fontSize.md,
                lineHeight: 22,
              }}
            >
              No children
            </Text>
          </View>
        ) : (
          children.map((k) => {
            const list = entriesByChild[k.id] ?? [];

            return (
              <View key={k.id} style={s.card}>
                {/* Child header with date */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "baseline",
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  <Text style={s.childName}>{k.name}</Text>
                  <Text
                    style={{
                      color: colors.textDim,
                      fontSize: fontSize.md,
                    }}
                  >
                    {todayLabel}
                  </Text>
                </View>

                {/* Today entries as pills (newest -> oldest) */}
                <View style={s.pillRow}>
                  {list.length === 0 ? (
                    <View style={[p.container, p.placeholder]}>
                      <Text style={p.meta}>No entries today</Text>
                    </View>
                  ) : (
                    list.map((e) => {
                      const emoji = iconFor(e);
                      const title = titleFor(e);
                      const detail = detailFor(e);
                      const time = toHM(e.createdAt);

                      return (
                        <View key={e.id} style={p.container}>
                          <Text style={p.emoji}>{emoji}</Text>
                          <Text style={p.title}>{title}</Text>
                          {!!detail && (
                            <Text style={p.meta}>{` • ${detail}`}</Text>
                          )}
                          {!!time && (
                            <Text style={p.meta}>{` • ${time}`}</Text>
                          )}
                        </View>
                      );
                    })
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

/* ----------------- helpers ----------------- */

// Emoji by entry type
function iconFor(e: Entry): string {
  switch (e.type) {
    case "Attendance":
      return e.subtype?.toLowerCase().includes("in") ? "✅" : "🚪";
    case "Food":
      return "🍽️";
    case "Sleep":
      return "😴";
    case "Toilet":
      return "🚽";
    case "Note":
      return "📝";
    default:
      return "🧩";
  }
}

// Short title per entry
function titleFor(e: Entry): string {
  switch (e.type) {
    case "Attendance":
      return "Attendance";
    case "Food":
      return "Meal";
    case "Sleep":
      return "Nap";
    case "Toilet":
      return "Toilet";
    case "Note":
      return "Note";
    default:
      return e.type || "Entry";
  }
}

// Detail text per entry
function detailFor(e: Entry): string | undefined {
  switch (e.type) {
    case "Attendance":
      return e.subtype || undefined;
    case "Food":
      if (Array.isArray(e.detail?.menu)) return e.detail.menu.join(", ");
      return typeof e.detail === "string" ? e.detail : undefined;
    case "Sleep":
      if (typeof e.detail?.duration_min === "number")
        return `${e.detail.duration_min} min`;
      return typeof e.detail === "string" ? e.detail : undefined;
    case "Toilet":
      return (
        e.detail?.note ||
        (typeof e.detail === "string" ? e.detail : undefined)
      );
    case "Note":
      return (
        e.detail?.text ||
        (typeof e.detail === "string" ? e.detail : undefined)
      );
    default:
      return typeof e.detail === "string" ? e.detail : undefined;
  }
}

// Firestore Timestamp -> "HH:MM" local time
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
