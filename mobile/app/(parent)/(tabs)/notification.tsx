import { View, Text } from "react-native";
import registerNNPushToken from 'native-notify';
import { useEffect } from "react";
import * as Notifications from 'expo-notifications';
import * as Permissions from 'expo-permissions';

export default function ParentActivity() {
  // Register appId and appToken: Source: https://app.nativenotify.com/in-app
  registerNNPushToken(32817, 'BS7xPMJTUeP2i57MJ2uGl8');

  // For testing notification
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

  return <View>

    <Text>Hi</Text>
  </View>;
}
