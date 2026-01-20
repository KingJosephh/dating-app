import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../../lib/supabase'; // 請確認路徑

// 定義資料型別
type ChatItem = {
  room_id: number;
  user_id: string;     // 對方的 ID
  username: string;    // 對方的名字
  avatar_url: string;  // 對方的頭像
};

export default function MatchesScreen() {
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  // 1. 撈取聊天列表的函式
  const fetchChats = async () => {
    try {
      // 呼叫我們剛剛在 SQL 寫好的強大函數
      const { data, error } = await supabase.rpc('get_my_chats');

      if (error) throw error;

      console.log('聊天列表:', data);
      setChats(data || []);
    } catch (error: any) {
      console.error('Fetch Chats Error:', error);
      Alert.alert('錯誤', '無法載入聊天列表');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 2. 進入畫面時自動讀取
  useFocusEffect(
    useCallback(() => {
      fetchChats();
    }, [])
  );

  // 3. 下拉重新整理
  const onRefresh = () => {
    setRefreshing(true);
    fetchChats();
  };

  // 4. 點擊進入聊天室
// 4. 點擊進入聊天室
  const handlePressChat = (chat: ChatItem) => {
    console.log('準備跳轉，傳遞參數:', chat); // 👈 建議加這行 Log 檢查

    router.push({
      pathname: '/chat', // ⚠️ 注意：這裡的檔名必須跟你的聊天室檔名一致 (modal.tsx)
      params: { 
        roomId: chat.room_id,         // 👈 絕對不能少這行！
        otherUserId: chat.user_id,    // 也要有這個
        otherUserName: chat.username  // 這個是標題用的
      }
    });
  };

  // 渲染每一個列表項目
  const renderItem = ({ item }: { item: ChatItem }) => (
    <TouchableOpacity 
      style={styles.chatRow} 
      onPress={() => handlePressChat(item)}
    >
      <Image 
        source={{ uri: item.avatar_url || 'https://via.placeholder.com/100' }} 
        style={styles.avatar} 
      />
      <View style={styles.chatInfo}>
        <Text style={styles.username}>{item.username}</Text>
        <Text style={styles.lastMessage}>點擊開始聊天...</Text>
      </View>
      <View style={styles.chevron}>
        <Text style={{color: '#ccc'}}>›</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <View style={styles.center}><ActivityIndicator /></View>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>配對列表</Text>
      
      {chats.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>還沒有配對成功...</Text>
          <Text style={styles.subText}>趕快去滑一滑吧！</Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.room_id.toString()}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white', paddingTop: 50 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerTitle: {
    fontSize: 28, fontWeight: 'bold', paddingHorizontal: 20, marginBottom: 10, color: '#333'
  },
  chatRow: {
    flexDirection: 'row', alignItems: 'center', padding: 15,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  avatar: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: '#eee',
  },
  chatInfo: {
    flex: 1, marginLeft: 15, justifyContent: 'center',
  },
  username: {
    fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14, color: 'gray',
  },
  chevron: {
    padding: 10,
  },
  emptyContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100
  },
  emptyText: {
    fontSize: 20, fontWeight: 'bold', color: '#333'
  },
  subText: {
    marginTop: 10, fontSize: 16, color: 'gray'
  }
});