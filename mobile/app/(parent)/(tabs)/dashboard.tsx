// mobile/app/(parent)/(tabs)/dashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  Image,
} from "react-native";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { colors } from "@/constants/color";
import { fontSize } from "@/constants/typography";
import { fetchParentFeed } from "@/services/useParentFeedAPI";
import { ParentFeedEntry } from "../../../../shared/types/type";

type ChildRef = {
  id: string;
  name: string;
};

async function getUserDocId(): Promise<string | null> {
  const u = auth.currentUser;
  if (!u) return null;
  const tok = await u.getIdTokenResult(true);
  const userDocId = (tok.claims as any)?.userDocId as string | undefined;
  return userDocId || null;
}

export default function ParentDashboard() {
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<ChildRef[]>([]);
  const [entries, setEntries] = useState<ParentFeedEntry[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const userDocId = await getUserDocId();
      if (!userDocId) {
        setChildren([]);
        setEntries([]);
        setLoading(false);
        return;
      }

      // 1) load parent user doc → childIds
      const userSnap = await getDoc(doc(db, "users", userDocId));
      const userData = userSnap.exists() ? (userSnap.data() as any) : {};
      const rels: Array<{ childId: string }> = Array.isArray(
        userData.childRelationships
      )
        ? userData.childRelationships
        : [];

      const childIds = rels.map((r) => r.childId).filter(Boolean);
      if (childIds.length === 0) {
        setChildren([]);
        setEntries([]);
        setLoading(false);
        return;
      }

      // 2) resolve child names (still from Firestore)
      const childDocs: ChildRef[] = [];
      for (const cid of childIds) {
        const cSnap = await getDoc(doc(db, "children", cid));
        if (cSnap.exists()) {
          const c = cSnap.data() as any;
          const fullName =
            `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() ||
            c.name ||
            cid;
          childDocs.push({ id: cid, name: fullName });
        } else {
          childDocs.push({ id: cid, name: cid });
        }
      }
      childDocs.sort((a, b) => a.name.localeCompare(b.name));
      setChildren(childDocs);

      // 3) fetch feed from backend (already sorted)
      const feed = await fetchParentFeed();
      setEntries(feed);

      setLoading(false);
    })();
  }, []);

  const childNameById = useMemo(() => {
    const m: Record<string, string> = {};
    children.forEach((c) => {
      m[c.id] = c.name;
    });
    return m;
  }, [children]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color={colors.activityIndicator} />
        <Text
          style={{
            marginTop: 8,
            color: colors.textDim,
            fontSize: fontSize.md,
          }}
        >
          Loading...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 14 }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{
            fontSize: 26,
            fontWeight: "700",
            color: colors.text,
            marginBottom: 6,
          }}
        >
          Activity Feed
        </Text>
        {children.length === 0 ? (
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 14,
              padding: 18,
              alignItems: "center",
            }}
          >
            <Text style={{ color: colors.textDim, fontSize: 15 }}>
              No children linked
            </Text>
          </View>
        ) : entries.length === 0 ? (
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 14,
              padding: 18,
              alignItems: "center",
            }}
          >
            <Text style={{ color: colors.textDim, fontSize: 15 }}>
              No entries yet
            </Text>
          </View>
        ) : (
          entries.map((e) => {
            const childName = childNameById[e.childId] || e.childName || e.childId;
            const emoji = iconFor(e);
            const title = titleFor(e);
            const detail = detailFor(e);
            const time = toHM(e.occurredAt || e.createdAt);
            return (
              <View
                key={e.id}
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 16,
                  padding: 14,
                  flexDirection: "row",
                  gap: 12,
                  alignItems: "flex-start",
                }}
              >
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    backgroundColor: "#EEF2FF",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 20 }}>{emoji}</Text>
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ fontWeight: "600", fontSize: 15 }}>{title}</Text>
                  <Text style={{ color: colors.textDim, fontSize: 13 }}>
                    {childName}
                    {time ? ` • ${time}` : ""}
                  </Text>
                  {!!detail && (
                    <Text style={{ color: colors.text, fontSize: 14 }}>
                      {detail}
                    </Text>
                  )}
                  {e.photoUrl ? (
                    <Image
                      source={{ uri: e.photoUrl }}
                      style={{
                        width: "100%",
                        height: 160,
                        borderRadius: 12,
                        marginTop: 6,
                        backgroundColor: "#E2E8F0",
                      }}
                      resizeMode="cover"
                    />
                  ) : null}
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

function iconFor(e: ParentFeedEntry): string {
  const t = e.type;
  if (t === "Attendance") {
    if (e.subtype && e.subtype.toLowerCase().includes("in")) return "✅";
    if (e.subtype && e.subtype.toLowerCase().includes("out")) return "🚪";
    return "🟣";
  }
  if (t === "Food") return "🍽️";
  if (t === "Sleep") return "😴";
  if (t === "Toilet") return "🚽";
  if (t === "Photo") return "📷";
  if (t === "Activity") return "🎨";
  if (t === "Health") return "❤️";
  return "📝";
}

function titleFor(e: ParentFeedEntry): string {
  const t = e.type;
  if (t === "Attendance") return "Attendance";
  if (t === "Food") return e.subtype ? `Meal • ${e.subtype}` : "Meal";
  if (t === "Sleep") return "Nap";
  if (t === "Toilet") return "Toilet";
  if (t === "Photo") return "Photo";
  if (t === "Activity") return "Activity";
  if (t === "Health") return "Health";
  if (t === "Note") return "Note";
  return t || "Entry";
}

function detailFor(e: ParentFeedEntry): string | undefined {
  if (!e.detail) return undefined;

  // Food can be array-like
  if (e.type === "Food") {
    const anyDetail = e.detail as any;
    if (Array.isArray(anyDetail?.menu)) return anyDetail.menu.join(", ");
    if (typeof anyDetail === "string") return anyDetail;
  }

  // To match Activity / Note / Health structure
  const anyDetail = e.detail as any;
  if (typeof anyDetail?.text === "string") return anyDetail.text;
  if (typeof anyDetail === "string") return anyDetail;

  return undefined;
}

// backend now sends ISO string; still keep Firestore-style fallback
function toHM(v: any): string | undefined {
  if (!v) return undefined;

  // ISO string
  if (typeof v === "string") {
    const d = new Date(v);
    if (isNaN(d.getTime())) return undefined;
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  // Firestore Timestamp (just in case)
  if (typeof v === "object" && typeof v.seconds === "number") {
    const ms = v.seconds * 1000 + Math.floor((v.nanoseconds || 0) / 1e6);
    const d = new Date(ms);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  return undefined;
}
