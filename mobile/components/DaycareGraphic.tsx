// Whimsical daycare SVG graphic for auth pages
// Features: friendly blob with eyes, bee, sprout, rainbow, toy ball, and house

import React from 'react';
import { View } from 'react-native';
import Svg, {
  Rect,
  Path,
  Circle,
  Ellipse,
  G,
  Defs,
  LinearGradient,
  Stop,
  Filter,
  FeDropShadow,
} from 'react-native-svg';

interface DaycareGraphicProps {
  width?: number;
  height?: number;
}

export default function DaycareGraphic({ width = 420, height = 300 }: DaycareGraphicProps) {
  return (
    <View style={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={width} height={height} viewBox="0 0 420 300">
        <Defs>
          {/* Gentle drop shadow for a soft, floating feel */}
          <Filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
            <FeDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.10" />
          </Filter>

          {/* Palette */}
          <LinearGradient id="ballShine" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#FFE6A8" />
            <Stop offset="100%" stopColor="#FFC96B" />
          </LinearGradient>
        </Defs>

        <Rect width="100%" height="100%" fill="transparent" />

        {/* ====== Central Friendly Blob ====== */}
        <Path
          filter="url(#softShadow)"
          d="M210,75 c40,-22 92,0 103,36 c12,38 -19,69 -48,79 c-29,10 -44,23 -79,14 c-35,-9 -67,-31 -63,-69 c4,-38 47,-38 87,-60Z"
          fill="#DDEAF7"
          stroke="#C8D9EC"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Eyes */}
        <G>
          <Circle cx="235" cy="135" r="10" fill="#FFFFFF" />
          <Circle cx="235" cy="135" r="4.5" fill="#202020" />
          <Circle cx="200" cy="135" r="10" fill="#FFFFFF" />
          <Circle cx="200" cy="135" r="4.5" fill="#202020" />
          {/* tiny friendly blush dots */}
          <Circle cx="185" cy="152" r="3" fill="#F6C4C4" opacity="0.7" />
          <Circle cx="250" cy="152" r="3" fill="#F6C4C4" opacity="0.7" />
        </G>

        {/* ====== Surrounding Playful Elements ====== */}

        {/* 1) Little Yellow Bee (top-left) */}
        <G transform="translate(95,70) rotate(-10)" strokeLinecap="round" strokeLinejoin="round">
          {/* wings */}
          <Ellipse cx="0" cy="-6" rx="8" ry="6" fill="#EAF6FF" stroke="#C8D9EC" strokeWidth="1.5" />
          <Ellipse cx="8" cy="-6" rx="8" ry="6" fill="#EAF6FF" stroke="#C8D9EC" strokeWidth="1.5" />
          {/* body */}
          <Ellipse cx="6" cy="2" rx="16" ry="12" fill="#FFD54A" stroke="#E5B72E" strokeWidth="2" />
          {/* stripes */}
          <Path d="M-2,2 h16" stroke="#3B3B3B" strokeWidth="2.5" />
          <Path d="M-1,7 h14" stroke="#3B3B3B" strokeWidth="2.5" />
          {/* head + eye */}
          <Circle cx="-6" cy="2" r="6.5" fill="#FFD54A" stroke="#E5B72E" strokeWidth="2" />
          <Circle cx="-7.5" cy="1.5" r="1.5" fill="#202020" />
          {/* feelers */}
          <Path d="M-9,-2 q-4,-6 -9,-6" stroke="#3B3B3B" strokeWidth="1.5" fill="none" />
          <Path d="M-3,-3 q-2,-6 -6,-8" stroke="#3B3B3B" strokeWidth="1.5" fill="none" />
          {/* flight dash */}
          <Path d="M-28,15 q-10,-8 -18,-2" stroke="#C8D9EC" strokeWidth="2" fill="none" opacity="0.7" strokeDasharray="4 6" />
        </G>

        {/* 2) Green Sprout (bottom-left) */}
        <G transform="translate(125,230)" strokeLinecap="round" strokeLinejoin="round">
          <Path d="M0,0 q6,-18 2,-36" stroke="#7EC97D" strokeWidth="4" fill="none" />
          <Path
            d="M2,-32 c16,-10 28,-8 34,0 c-10,10 -26,16 -34,0Z"
            fill="#BDE8B8"
            stroke="#7EC97D"
            strokeWidth="2"
          />
          <Path
            d="M0,-24 c-14,-10 -26,-8 -32,-1 c8,11 23,15 32,1Z"
            fill="#C9F0C5"
            stroke="#7EC97D"
            strokeWidth="2"
          />
        </G>

        {/* 3) Rainbow Arc (top-right) */}
        <G transform="translate(325,70)">
          <Path d="M0,24 a24,24 0 0 1 48,0" fill="none" stroke="#FF7A7A" strokeWidth="8" strokeLinecap="round" />
          <Path d="M6,24 a18,18 0 0 1 36,0" fill="none" stroke="#FFB980" strokeWidth="8" strokeLinecap="round" />
          <Path d="M12,24 a12,12 0 0 1 24,0" fill="none" stroke="#8FD3FF" strokeWidth="8" strokeLinecap="round" />
        </G>

        {/* 4) Soft Toy Ball (bottom-right) */}
        <G transform="translate(315,210)" strokeLinecap="round" strokeLinejoin="round">
          <Circle cx="0" cy="0" r="20" fill="url(#ballShine)" stroke="#E2A44A" strokeWidth="2" filter="url(#softShadow)" />
          {/* simple seam curve */}
          <Path d="M-16,-4 q16,8 32,0" fill="none" stroke="#E2A44A" strokeWidth="2" opacity="0.7" />
        </G>

        {/* 5) Rounded House (upper-middle-right) */}
        <G transform="translate(280,120)" strokeLinecap="round" strokeLinejoin="round">
          {/* body */}
          <Rect x="-18" y="6" rx="6" ry="6" width="36" height="26" fill="#FFE3EC" stroke="#E7AEC0" strokeWidth="2" />
          {/* roof (rounded) */}
          <Path d="M-22,8 q22,-20 44,0" fill="#FFC7D9" stroke="#E7AEC0" strokeWidth="2" />
          {/* door */}
          <Rect x="-3" y="18" width="10" height="14" rx="4" ry="4" fill="#FFFFFF" stroke="#E7AEC0" strokeWidth="2" />
        </G>

        {/* Extra air/lightness with tiny stars/dots */}
        <G fill="#EAF3FB" opacity="0.9">
          <Circle cx="60" cy="110" r="2" />
          <Circle cx="360" cy="155" r="2" />
          <Circle cx="260" cy="55" r="2" />
          <Circle cx="145" cy="60" r="2" />
        </G>
      </Svg>
    </View>
  );
}
