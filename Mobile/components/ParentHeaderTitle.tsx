import { useEffect, useMemo, useState } from "react";
import { Text } from "react-native";
import { subscribeMyChildren } from "@/lib/query";

export default function ParentHeaderTitle() {
  const [kids, setKids] = useState<any[] | null>(null);

  useEffect(() => {
    const off = subscribeMyChildren(setKids);
    return () => off();
  }, []);

  const title = useMemo(() => {
    if (kids === null) return " ";
    if (kids.length === 0) return "Parent";
    if (kids.length === 1) return kids[0]?.name || "Child";
    const first = kids[0]?.name || "Child";
    return `${first} (+${kids.length - 1})`;
  }, [kids]);

  return (
    <Text numberOfLines={1} style={{ fontSize: 18, fontWeight: "700" }}>
      {title}
    </Text>
  );
}
