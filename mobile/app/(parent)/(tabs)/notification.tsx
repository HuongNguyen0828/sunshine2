import registerNNPushToken from 'native-notify';
import * as Notifications from 'expo-notifications';
import * as Permissions from 'expo-permissions';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  SectionList,
  ScrollView,
  FlatList,
} from "react-native";
import { useState, useMemo, memo, useCallback, useEffect, useContext } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Search,
  Filter,
  ChevronDown,
  Activity,
  Loader,
  CheckCircle,
  X,
} from "lucide-react-native";
// import { generateMockEntries, mockClasses, mockChildren } from "../../../src/data/mockData";
// import { EntryDoc } from "@sunshine/src/types/type";
import { useAppContext } from "@/contexts/AppContext";
import { EventByMonth, Event, ScheduleDate } from "./calendar";
import { fetchSchedulesForParent, processAndSplitSchedules } from "@/services/useScheduleAPI";

// Memoized Entry Card Component for better performance
const ActivityCard = memo(({ activity }: { activity: Partial<Event> }) => {
  const todayString = new Date().toLocaleDateString('en-CA').split('T')[0];
  const date = activity.date;
  let tommorow = new Date();
  tommorow.setDate(tommorow.getDate() + 1);
  const tommorowString = tommorow.toISOString().split('T')[0];

  return (
    <Pressable
      style={styles.entryCard}
      onPress={() => alert(activity.description)}
    >
      <View style={[styles.entryIconContainer, { backgroundColor: "#EDE9FE" }]}>
        <Activity size={20} strokeWidth={2} />
      </View>
      <View style={styles.entryContent}>
        <View style={styles.entryHeader}>
          <Text style={styles.entryTitle}>{activity.title}</Text>
          <Text style={styles.entryTime}>{activity.classes?.[0]}</Text>
        </View>
        <Text style={styles.entryType}>
          {/* {entry.type} */}
          {/* {entry.subtype && ` - ${entry.subtype}`} */}
          {date === todayString ? "Today" : date === tommorowString ? "Tommorow" : date}
        </Text>
        {activity.description && <Text style={styles.entryDetail}>{activity.description.trim().slice(0, 50)}</Text>}
        {/* <Text style={styles.entryClass}>{entry.className}</Text> */}
      </View>
    </Pressable>
  );
});

// EntryCard.displayName = "EntryCard";

export default function ParentActivity() {

  // Register appId and appToken: Source: https://app.nativenotify.com/in-app
  registerNNPushToken(32829, 'yZd8BljhFJZ6TXUxUWJPfq');

  // For testing a sigle notification
  useEffect(() => {
    const registerForPushNotificationsAsync = async () => {
      // Asking permission in Iphone
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        alert('Failed to get push token for push notifications!');
        return;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync();
      console.log('Push token:', tokenData.data);
      // You can send tokenData.data to your backend to save it. No we have it already as the data itself
    };

    registerForPushNotificationsAsync();
  }, []);



  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [showClassModal, setShowClassModal] = useState(false);
  const [currentDate, setDate] = useState<Date>(new Date()) // 2025-12-18

  const [showMore, setShowMore] = useState<boolean>(true); // for user scrolling more Activity
  const [isLoadingShowMore, setIsLoadingShowMore] = useState<boolean>(true); // for WHILE await fetching data when user scrolling more Activity

  const { sharedData } = useAppContext();
  const classesContext = sharedData['classes'] as string[];
  // Activities is pre-load from sharedData context
  const initialActivities = sharedData['dailyActivity'] as EventByMonth;
  const [activities, setActivities] = useState<EventByMonth>(initialActivities);
  const [isEndReached, setIsEndReached] = useState<boolean>(false);
  const email = sharedData["email"] as string;


  // Loading Activity for scrolling down: go month
  useEffect(() => {
    if (!showMore) return;

    const fetchSchedulesData = async () => {
      const targetDate = currentDate;
      // Increasing month if still showMore (as length < 10 (full Screen))
      if (showMore) targetDate.setMonth(targetDate.getMonth() + 1);
      let monthString = targetDate.toISOString().split('T')[0];
      // console.log("MONTH" + currentMonthString); // "2025-01-18"

      // 1. Fetching 
      try {
        if (showMore) setIsLoadingShowMore(true);
        const schedules = await fetchSchedulesForParent(monthString);
        // Split data: today's events vs all events
        const { dailyActivities, allCalendarEvents } = processAndSplitSchedules(schedules, classesContext);
        // Merge pre-load (initial) activities with newly loaded
        setActivities((prev) => ({ ...dailyActivities, ...prev }));
        // console.log(results);

        // Check if DATA REACHED the end: schedules =[];
        if (schedules.length === 0) setIsEndReached(true);
        else setIsEndReached(false);
      } catch (error) {
        console.error('Error fetching schedules:', error);
      } finally {
        setIsLoadingShowMore(false);
      }
    }
    fetchSchedulesData();
  }, [currentDate, showMore]); // Only depend on the month itself, not the current day

  // Debounce search text with 300ms delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchText]);

  // Memoize handlers to prevent re-renders
  const handleSearchChange = useCallback((text: string) => {
    setSearchText(text);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchText("");
    setDebouncedSearchText("");
  }, []);


  // Filter entries based on selections
  const filteredActivities = useMemo(() => {
    // console.log("All Daily: ", entries);
    let listAfterRemoveDate = Object.values(activities ?? {}); //DEFAULT to empty object// Make a list of all [Event[], Event[], ...]
    let filtered = listAfterRemoveDate.reduce((acc, eventList) => { //Un-pack filtered into just Event[]
      return [...acc, ...eventList];
    }, []);
    // console.log("DEBUG: filtered: ", filtered);
    // Filter by search text (using debounced value)
    if (debouncedSearchText) {
      filtered = filtered.filter(actitivy =>
        actitivy.description?.toLowerCase().includes(debouncedSearchText.toLowerCase()) ||
        actitivy.title.toLowerCase().includes(debouncedSearchText.toLowerCase())
      );
    }

    // Filter by class
    if (selectedClass) {
      const selectedClassName = classesContext.find(cls => cls === selectedClass);
      if (!selectedClassName) return filtered;
      filtered = filtered.filter(entry => entry.classes.includes(selectedClassName));
    }
    // console.log(filtered.length);
    // console.log(selectedClass);

    // At the end, if still not full screen, load and show more.......
    (filtered.length < 10) ? setShowMore(true) : setShowMore(false);
    return filtered.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    })

  }, [activities, debouncedSearchText, selectedClass]);

  // Group entries by date for SectionList
  const sections = useMemo(() => {
    // If showMore: running funtion fetching more from backend
    return filteredActivities;
  }, [filteredActivities]);




  // Memoize the header component to prevent re-renders and focus loss
  const ListHeader = useMemo(() => {
    return (
      <>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.new}>{3}</Text>
        </View>

        {/* Search and Filters */}
        <View style={styles.searchContainer}>
          {/* Search Bar */}
          <View style={styles.searchBar}>
            <Search size={20} color="#64748B" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by child, activity, or details..."
              value={searchText}
              onChangeText={handleSearchChange}
              placeholderTextColor="#94A3B8"
              autoCorrect={false}
              autoCapitalize="none"
            />
            {searchText.length > 0 && (
              <Pressable onPress={handleClearSearch}>
                <X size={20} color="#64748B" />
              </Pressable>
            )}
          </View>

          {/* Filter Buttons */}
          <View style={styles.filterScroll}>
            <Pressable
              style={[styles.filterButton, selectedClass && styles.filterButtonActive]}
              onPress={() => setShowClassModal(true)}
            >
              <ChevronDown size={16} color={selectedClass ? "#FFFFFF" : "#475569"} />
            </Pressable>
          </View>
        </View>
      </>
    );
  }, [insets.top, filteredActivities.length, searchText, handleSearchChange, handleClearSearch]);


  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#E0E7FF", "#F0F4FF", "#FFFFFF"]}
        style={styles.gradientBackground}
      />
      <FlatList
        data={sections}
        renderItem={({ item }) => <ActivityCard activity={item} />} // the activity
        keyExtractor={item => item.date + item.classes[0]} // the date + class (Unique) AS only could be duplicate with other class
        ListHeaderComponent={ListHeader}
        initialNumToRender={10} // Items to render in the initial batch
        ListEmptyComponent={() => ( // when return list is empty
          <View style={styles.emptyState}>
            <Filter size={48} color="#CBD5E1" strokeWidth={1.5} />
            <Text style={styles.emptyStateTitle}>No Activity found</Text>
            <Text style={styles.emptyStateText}>
              Try adjusting your filters or search terms
            </Text>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={true}
        scrollEnabled={true}
        onEndReached={() => { setShowMore(true) }} // Triggers when user scrolls near the end
        onEndReachedThreshold={0.1} // How close to the end before onEndReached is called
        // stickyHeaderIndices={[0]} // Make the first item (header) sticky
        ListFooterComponent={ // When still load more OR reach the End
          isEndReached ? (
            <View style={styles.endOfList}>
              {/* End Reached  */}
              <CheckCircle size={24} color="#10B981" />
              <Text style={styles.endOfListText}>You've reached the end</Text>
            </View>
          ) : ( // Loading more
            <View style={{ margin: "auto" }}>
              <Loader size={20} strokeWidth={2} />
            </View>
          )
        }
      />

      {/* {isLoadingShowMore &&
        <View style={{ margin: "auto" }}>
          <Loader size={20} strokeWidth={2} />
        </View>
      } */}


    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  gradientBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "40%",
  },
  listContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
    position: "fixed",
    flexDirection: "row",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1E293B",
    letterSpacing: -0.5,
  },
  new: {
    backgroundColor: "#EF4444", // red badge
    color: "white",
    fontSize: 20,
    fontWeight: "700",
    paddingHorizontal: 10,
    paddingVertical: 2,
    minWidth: 20,
    textAlign: "center",
    justifyContent: "center",
    borderRadius: 60, // makes it round
    overflow: "hidden",
    marginLeft: 6,
    marginBottom: 10
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 4,
  },
  searchContainer: {
    backgroundColor: "transparent",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: "#1E293B",
  },
  filterScroll: {
    flexDirection: "row",
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginRight: 8,
    minWidth: 110,
    justifyContent: "center",
  },
  filterButtonActive: {
    backgroundColor: "#6366F1",
    borderColor: "#6366F1",
  },
  filterButtonText: {
    fontSize: 14,
    color: "#475569",
    marginRight: 4,
  },
  filterButtonTextActive: {
    color: "#FFFFFF",
  },
  dateHeader: {
    fontSize: 16,
    fontWeight: "600",
    color: "#475569",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "transparent",
  },
  entryCard: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  entryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  entryContent: {
    flex: 1,
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  entryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
  },
  entryTime: {
    fontSize: 12,
    color: "#64748B",
  },
  entryType: {
    fontSize: 14,
    color: "#6366F1",
    fontWeight: "500",
    marginBottom: 4,
  },
  entryDetail: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 4,
    lineHeight: 18,
  },
  entryClass: {
    fontSize: 12,
    color: "#94A3B8",
    fontStyle: "italic",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#475569",
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#94A3B8",
    marginTop: 8,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "70%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 20,
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalOption: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalOptionSelected: {
    backgroundColor: "#EEF2FF",
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  modalOptionWithIcon: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalOptionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  modalOptionText: {
    fontSize: 16,
    color: "#1E293B",
  },
  modalOptionSubtext: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  endOfList: {
    margin: "auto",
    display: "flex",
    flexDirection: "row",
    gap: 2
  },
  endOfListText: {

  }
});