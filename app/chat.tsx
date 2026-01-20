import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList, KeyboardAvoidingView, Platform,
  StyleSheet,
  Text,
  TextInput, TouchableOpacity,
  View
} from 'react-native';
// 記得改回正確的路徑 '../lib/supabase'
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

// 定義訊息格式
type Message = {
  id: string
  content: string
  sender_id: string
  created_at: string
  room_id: number
}

export default function ChatScreen() {
  const router = useRouter(); 
  const params = useLocalSearchParams();
  const roomId = Array.isArray(params.roomId) ? params.roomId[0] : params.roomId;
  const title = params.otherUserName || '聊天室';

  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const flatListRef = useRef<FlatList>(null)

  useEffect(() => {
    if (!roomId) return;

    supabase.auth.getSession().then((response) => {
      const session = response.data.session;
      if (session) {
        setCurrentUserId(session.user.id)
        fetchMessages() 
        subscribeToRealtime(Number(roomId)) 
      }
    })

    return () => {
      supabase.channel(`room_${roomId}`).unsubscribe()
    }
  }, [roomId])

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })

    if (data) setMessages(data)
  }

  const subscribeToRealtime = (targetRoomId: number) => {
    if (!targetRoomId) return;

    supabase
      .channel(`room_${targetRoomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${targetRoomId}`,
        },
        (payload: any) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => {
            if (prev.find(m => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
      )
      .subscribe();
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !currentUserId || !roomId) return
    const content = inputText.trim()
    setInputText('') 

    const { error } = await supabase.from('messages').insert({
      content: content,
      sender_id: currentUserId,
      room_id: Number(roomId),
    })

    if (error) {
      alert('發送失敗: ' + error.message)
      setInputText(content) 
    }
  }

  const renderItem = ({ item }: { item: Message }) => {
    const isMyMessage = item.sender_id === currentUserId
    return (
      <View style={[
        styles.messageBubble,
        isMyMessage ? styles.myBubble : styles.partnerBubble
      ]}>
        <Text style={isMyMessage ? styles.myText : styles.partnerText}>
          {item.content}
        </Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom', 'left', 'right']}>
      
      {/* 👇 1. 這裡改成 false，隱藏系統原本的標題 */}
      <Stack.Screen options={{ headerShown: false }} />

      {/* 👇 2. 這就是我們「自製」的標題列 (Header) */}
      <View style={styles.customHeader}>
        {/* 返回按鈕 */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>{'< 返回'}</Text>
        </TouchableOpacity>
        
        {/* 標題 */}
        <Text style={styles.headerTitle}>{title}</Text>
        
        {/* 右邊佔位，為了讓標題置中 (可選) */}
        <View style={{ width: 60 }} />
      </View>

      {/* 訊息列表 */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 10, paddingBottom: 20 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="輸入訊息..."
            placeholderTextColor="#999"
          />
          <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
            <Text style={styles.sendButtonText}>傳送</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  // 👇 自製標題列的樣式
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
    height: 50, // 固定高度
  },
  backButton: {
    padding: 5,
    width: 60, // 設定寬度方便按
  },
  backButtonText: {
    fontSize: 18,
    color: '#007AFF', // iOS 藍色
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },

  // ... 以下是原本的樣式 ...
  messageBubble: {
    padding: 10,
    borderRadius: 15,
    marginBottom: 10,
    maxWidth: '80%',
  },
  myBubble: {
    backgroundColor: '#FF5A5F',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 2,
  },
  partnerBubble: {
    backgroundColor: '#F0F0F0',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 2,
  },
  myText: { color: 'white', fontSize: 16 },
  partnerText: { color: '#333', fontSize: 16 },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  sendButtonText: {
    color: '#FF5A5F',
    fontWeight: 'bold',
    fontSize: 16,
  },
})