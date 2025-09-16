import { View, Text, Pressable, ActivityIndicator, ScrollView } from "react-native";
import { useEffect, useState } from "react"
import { EntryCard} from "@/components/parent/entries"
import { Entry } from "@/features/types"
import {colors} from "@/constants/color"



export default function ParentDashboard() {

  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true)


  // Mock fetching (replaced with API later on)
  useEffect(() => {
    setTimeout(() => {
      const demoData: Entry[] = [
          {
          id: "1",
          type: "Attendance",
          subtype: "Check in",
          staffId: "101",
          childId: "201",
          createdAt: "10:10",
        },
        {
          id: "2",
          type: "Food",
          subtype: "Breakfast",
          staffId: "102",
          childId: "201",
          detail: "Eat all - oatmeal & fruit",
          createdAt: "11:20",
        },
        {
          id: "3",
          type: "Sleep",
          staffId: "103",
          childId: "201",
          detail: "Nap from 1:00 PM to 2:15 PM",
          createdAt: '3:10',
        },
      {
        id: "4",
        type: "Toilet",
        staffId: "104",
        childId: "201",
        detail: "Toilet break at 10:20 AM",
        createdAt: "10:20",
      },
      {
        id: "5",
        type: "Photo",
        staffId: "101",
        childId: "201",
        detail: "Playing with blocks",
        createdAt: "11:45",
        photoUrl: "https://picsum.photos/200/300",
      },
      {
        id: "6",
        type: "Schedule_note",
        staffId: "105",
        childId: "201",
        detail: "Reminder: Field trip tomorrow",
        createdAt: "15:30",
      },
      {
        id: "7",
        type: "Supply Request",
        staffId: "106",
        childId: "201",
        detail: "Please bring extra diapers",
        createdAt: "16:00",
      },
      {
        id: "8",
        type: "Food",
        staffId: "102",
        childId: "201",
        detail: "Lunch - Rice, chicken, vegetables",
        createdAt: "12:05",
      },
      {
        id: "9",
        type: "Attendance",
        staffId: "101",
        childId: "201",
        detail: "Checked out at 5:15 PM",
        createdAt: "17:15",
      },

      ]

      // Set demoData to entries
      setEntries(demoData)
      setLoading(false)
    }, 1500)
  }, [])

  if(loading) {
    return (
      <View>
        <ActivityIndicator size="large" color={colors.activityIndicator}/>
      </View>
    )
  }
  return (
    <ScrollView>
      {entries.map((entry) => (
        <EntryCard key={entry.id} entry={entry}/>
      ))}
    </ScrollView>
  );
}
