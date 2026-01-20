// 檔案路徑： app/_layout.tsx
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  return (
    // 1. 這行是用來讓 Swiper (滑動卡片) 在 Android 也能正常運作的關鍵
    <GestureHandlerRootView style={{ flex: 1 }}>
      
      <Stack screenOptions={{ headerShown: false }}>
        
        {/* 2. 這是你的主畫面 (包含配對與聊天列表) */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        
        {/* 3. 這是登入/註冊頁面 (如果你還沒做 (auth) 資料夾，這行留著也沒關係) */}
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />

        {/* 4. ★ 重要：這是聊天室頁面，設定為 modal (從下方彈出) */}
        <Stack.Screen 
          name="modal" 
          options={{ 
            presentation: 'modal',
            headerShown: true, // 聊天室通常需要標題列 (顯示對方名字)
            title: '聊天室'    // 預設標題
          }} 
        />

      </Stack>
    </GestureHandlerRootView>
  );
}
