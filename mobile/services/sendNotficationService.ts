export const ATTENDANCE_SUBTYPES: AttendanceSubtype[] = ["Check in", "Check out"];
export const FOOD_SUBTYPES: FoodSubtype[] = ["Breakfast", "Lunch", "Snack"];
import type {
  AttendanceSubtype,
  FoodSubtype,
  SleepSubtype,
} from "../../shared/types/type";
export const SLEEP_SUBTYPES: SleepSubtype[] = ["Started", "Woke up"];


export async function sendNotificationsToTheirParents(
  title: string,
  detail: string | undefined,
  parentSubIDs: string[]
): Promise<void> {
  let message: string | undefined= "";
  const normalizedTitle = title.trim().toLowerCase();

  //// DEBUG if ACtivity is reached
  console.log("DEBUG: Sending notification with title:", title);


  switch (normalizedTitle) {
    case ATTENDANCE_SUBTYPES[0]: // e.g. "Check In"
      message = `Your child Sam has been checked in.`;
      break;

    case ATTENDANCE_SUBTYPES[1]: // e.g. "Check Out"
      message = `Your child Sam has been checked out.`;
      break;

    case "Activity":
      message = detail;
      break;

    default:
      message = detail || title;
      break;
  }

  const sendPromises = parentSubIDs.map(async (subID) => {
    try {
      const resp = await fetch(
        "https://app.nativenotify.com/api/indie/notification",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subID,
            appId: 32829,
            appToken: "yZd8BljhFJZ6TXUxUWJPfq",
            title: normalizedTitle,
            message,
          }),
        }
      );
      if (!resp.ok) {
        const txt = await resp.text();
        console.warn("NativeNotify response not ok", resp.status, txt);
      } else {
        console.log("Notification sent to", subID);
      }
    } catch (err) {
      console.error("Failed to send notification to", subID, err);
    }
  });

  // Call all at once
  await Promise.all(sendPromises);
}
