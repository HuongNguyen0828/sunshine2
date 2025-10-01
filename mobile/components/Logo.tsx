// components/Logo.tsx
import { Image, ImageProps } from "react-native";

export default function Logo(props: Omit<ImageProps, "source">) {
  return (
    <Image
      // NOTE: adjust this path if your folder is "asset" not "assets"
      source={require("@/assets/images/logo.png")}
      style={[{ width: 120, height: 28, resizeMode: "contain" }, props.style]}
      accessibilityLabel="App Logo"
    />
  );
}
