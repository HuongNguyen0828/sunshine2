import { View, Text, Image } from "react-native";
import { colors } from "@/constants/color";

type Props = {
  title: string;
  logoWidth?: number;
  logoHeight?: number;
  edgeOffset?: number;     // left offset for the logo (use negative to pull to edge)
  contentOffsetY?: number; // vertical offset to move BOTH logo and title down
};

export default function HeaderWithLogo({
  title,
  logoWidth = 150,
  logoHeight = 36,
  edgeOffset = 0,
  contentOffsetY = 0, 
}: Props) {

  return (
    <View
      // header container
      style={{
        height: 80,                           
        backgroundColor: colors.palette.neutral100,
        justifyContent: "flex-start",         
        paddingTop: contentOffsetY 
      }}
    >

      <Image
        source={require("@/assets/images/logo.png")} // adjust to "@/asset/…" if needed
        style={{
          position: "absolute",
          left: edgeOffset,
          top: 20,
          width: logoWidth,
          height: logoHeight,
          resizeMode: "contain",
        }}
      />

      {/* centered title (also moved down via paddingTop above) */}
      <Text
        style={{
          textAlign: "center",
          color: colors.text,
          fontSize: 17,
          fontWeight: "700",
        }}
        numberOfLines={1}
      >
        {title}
      </Text>
    </View>
  );
}
