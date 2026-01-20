import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: Platform.select({
          ios: {
            // iOS 上使用透明背景以顯示模糊效果
            position: 'absolute',
          },
          default: {},
        }),
      }}>
      
      {/* 第一個分頁：首頁 (滑動配對) */}
      <Tabs.Screen
        name="index"
        options={{
          title: '配對',
          // 這裡用 house.fill 代表首頁
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />

      {/* 第二個分頁：聊天列表 (Matches) */}
      <Tabs.Screen
        name="matches" // ⚠️ 這裡非常重要！必須對應你的檔案名稱 matches.tsx
        options={{
          title: '聊天',
          // 這裡用 paperplane.fill 代表傳訊 (或是你可以試試 'bubble.left.fill')
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
        }}
      />
      
      {/* 如果你之後不需要 explore 了，這一段就不用加回來 */}
    </Tabs>
  );
}
