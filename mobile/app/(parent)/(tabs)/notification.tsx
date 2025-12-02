import { View, Text } from "react-native";
import registerNNPushToken from 'native-notify';

export default function ParentActivity() {
  // Register appId and appToken: Source: https://app.nativenotify.com/in-app
  registerNNPushToken(32817, 'BS7xPMJTUeP2i57MJ2uGl8');

  return <View></View>;
}
