import { useEffect, useMemo, useState } from "react";
import { subscribeMyChildren } from "@/lib/query";
import { Menu, Button } from "react-native-paper";

export default function ParentLeftHeaderTitle() {
  const [kids, setKids] = useState<any[] | null>(null);
  const [selectedChild, setSelectedChild] = useState<any | null>(null);
  const [visible, setVisible] = useState(false);

  // Subscribe to the parent's children on mount
  useEffect(() => {
    const off = subscribeMyChildren((children) => {
      setKids(children);
      if (children.length > 0 && !selectedChild) {
        setSelectedChild(children[0]);
      }
    });
    return () => off();
  }, []);

  // Compute the title to display based on the kids array
  const title = useMemo(() => {
    if (!kids) return "Loading...";
    if (kids.length === 0) return "No Children";
    if (kids.length === 1) return kids[0]?.name || "Child";
    const first = kids[0]?.name || "Child";
    return `${first} (+${kids.length - 1})`;
  }, [kids]);

  // Render loading state
  if (!kids) {
    return <Button>Loading...</Button>;
  }

  // Render no children state
  if (kids.length === 0) {
    return <Button>No Children</Button>;
  }

  return (
    <Menu
      visible={visible}
      onDismiss={() => setVisible(false)}
      anchor={
        <Button onPress={() => setVisible(true)}>
          {selectedChild?.name || "Select Child"}
        </Button>
      }
    >
      {kids.map((kid) => (
        <Menu.Item
          key={kid.id}
          onPress={() => {
            setSelectedChild(kid);
            setVisible(false);
          }}
          title={kid.name}
        />
      ))}
    </Menu>
  );
}