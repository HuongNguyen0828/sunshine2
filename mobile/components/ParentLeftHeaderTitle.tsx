// This component is used in the Parent tab navigator to show the name of the first child and the count of additional children in the header.

import { useEffect, useMemo, useState } from "react";
import { subscribeMyChildren } from "@/lib/query";
import { Menu, Button } from "react-native-paper"; // Ui with dropdown menu

export default function ParentLeftHeaderTitle() {
  const [kids, setKids] = useState<any[] | null>(null);
  const [selectedChild, setSelectedChild] = useState<any | null>(null);
  const [visible, setVisible] = useState(false); // For menu visibility

  // Subscribe to the parent's children on mount
  useEffect(() => {
    const off = subscribeMyChildren((children) => {
      // Update the list of kids whenever it changes
      setKids(children);
      // If no child is selected, select the first one by default
      if (children.length > 0 && !selectedChild) {
        setSelectedChild(children[0]); // default select first child
      }
    });
    return () => off();
  }, []);

  // If kids is null, we are still loading
  if (!kids) {
    return <Button>Loading...</Button>;
  }

  // If no kids, show a message; CANNOT happen in practice for a parent --> for testing only
  if (kids.length === 0) return <Button>No Children</Button>;

  // Compute the title to display based on the kids array
  const title = useMemo(() => {
    // Determine the title based on the number of kids
    // if kids is null, we are still loading
    if (!kids) return "Loading...";
    // Cannot have 0 kids as a parent, but just in case
    if (kids.length === 0) return "No Children";
    // If only one kid, show their name
    // If multiple kids, show the first name and the count of additional kids
    if (kids.length === 1) return kids[0]?.name || "Child";
    const first = kids[0]?.name || "Child";
    return `${first} (+${kids.length - 1})`;
  }, [kids]);

  return (
    // <Text numberOfLines={1} style={{ fontSize: 18, fontWeight: "700" }}>
    //   {title}
    // </Text>

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
