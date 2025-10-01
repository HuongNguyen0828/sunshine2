import { View, Text } from "react-native";
import { Entry } from "../features/types";

export default function EntryCard({ entry }: { entry: Entry }) {
  return (
    <View style={{ padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 }}>
      <Text style={{ fontWeight: "600" }}>{entry.type} {entry.subtype ? `• ${entry.subtype}` : ""}</Text>
      {entry.note ? <Text>{entry.note}</Text> : null}
      {entry.photoUrl ? <Text> photo</Text> : null}
      <Text style={{ opacity: 0.6 }}>{new Date(entry.createdAt).toLocaleTimeString()}</Text>
    </View>
  );
}