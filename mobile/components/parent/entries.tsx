// mobile/components/parent/entries.tsx
import { FC, useMemo } from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { colors } from "@/constants/color";
import { fontSize, fontWeight } from "@/constants/typography";
import { emojiCollection } from "@/components/emoji";
import { ParentFeedEntry } from "../../../shared/types/type";

export const EntryCard: FC<{ entry: ParentFeedEntry; childName?: string }> = ({
  entry,
  childName,
}) => {
  const entryKey = entry.type ? entry.type.toLowerCase() : "";
  const emoji = (emojiCollection as any)[entryKey] || "❓";

  const detailText = useMemo(() => {
    if (!entry.detail) return "";
    if (typeof entry.detail === "string") return entry.detail;
    if (Array.isArray((entry.detail as any)?.menu))
      return (entry.detail as any).menu.join(", ");
    if (typeof (entry.detail as any)?.text === "string")
      return (entry.detail as any).text;
    return "";
  }, [entry.detail]);

  return (
    <View style={styles.card}>
      <Text style={styles.entryType}>
        {emoji} {entry.type}
      </Text>

      {!!childName && <Text style={styles.childName}>{childName}</Text>}

      {!!entry.subtype && <Text style={styles.subType}>{entry.subtype}</Text>}

      {!!detailText && <Text style={styles.detail}>{detailText}</Text>}

      {!!entry.photoUrl && (
        <Image source={{ uri: entry.photoUrl }} style={styles.photo} resizeMode="cover" />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFF",
    padding: 12,
    borderRadius: 10,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: 4,
  },
  entryType: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.heading,
  },
  childName: {
    fontSize: fontSize.sm,
    color: colors.textDim,
  },
  subType: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  detail: {
    fontSize: fontSize.md,
    color: "#333",
  },
  photo: {
    width: "100%",
    height: 160,
    borderRadius: 8,
    marginTop: 6,
    backgroundColor: "#E2E8F0",
  },
});
