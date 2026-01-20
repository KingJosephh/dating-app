import { decode } from 'base64-arraybuffer'
import * as ImagePicker from 'expo-image-picker'
import { useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Button, Image, StyleSheet, Text, View } from 'react-native'
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist'
// 👇 這裡使用 gesture-handler 的 TouchableOpacity 以確保在滑動列表中手勢正常
import { GestureHandlerRootView, TouchableOpacity } from 'react-native-gesture-handler'
import { supabase } from '../../lib/supabase'

type Photo = {
  id: string
  url: string
  rank: number
}

export default function ProfileScreen() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(false)
  const [username, setUsername] = useState('')
  const [session, setSession] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        fetchProfile(session.user.id)
        fetchPhotos(session.user.id)
      }
    })
  }, [])

  async function fetchProfile(userId: string) {
    const { data } = await supabase.from('profiles').select('username').eq('id', userId).single()
    if (data) setUsername(data.username)
  }

  async function fetchPhotos(userId: string) {
    setLoading(true)
    const { data, error } = await supabase
      .from('profile_photos')
      .select('*')
      .eq('user_id', userId)
      .order('rank', { ascending: true })

    if (error) Alert.alert('Error', error.message)
    if (data) setPhotos(data)
    setLoading(false)
  }

  async function uploadPhoto() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      })

      if (result.canceled || !result.assets[0].base64) return
      setLoading(true)

      const image = result.assets[0]
      const filePath = `${session.user.id}/${new Date().getTime()}.jpg`

      if (!image.base64) {
        console.error('錯誤：找不到圖片的 base64 資料');
        return;
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(
          filePath,
          decode(image.base64),
          { contentType: 'image/jpeg' }
        )

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)

      const newRank = photos.length
      const { error: dbError } = await supabase.from('profile_photos').insert({
        user_id: session.user.id,
        url: publicUrl,
        rank: newRank
      })

      if (dbError) throw dbError
      fetchPhotos(session.user.id)

    } catch (error) {
      Alert.alert('上傳失敗', (error as any).message)
    } finally {
      setLoading(false)
    }
  }

  async function saveOrder(newPhotos: Photo[]) {
    setPhotos(newPhotos)
    const updates = newPhotos.map((photo, index) => ({
      id: photo.id,
      user_id: session.user.id,
      url: photo.url,
      rank: index,
    }))

    try {
      const { error } = await supabase.from('profile_photos').upsert(updates)
      if (error) throw error
    } catch (error) {
      Alert.alert('儲存排序失敗', (error as any).message)
      fetchPhotos(session.user.id)
    }
  }

  // 👇 修改後的登出功能：加入 Alert 確認 + 正確的路由跳轉
  const handleSignOut = async () => {
    Alert.alert('登出', '確定要登出嗎？', [
      { text: '取消', style: 'cancel' },
      {
        text: '確定登出',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.auth.signOut()
          if (!error) {
            // ✅ 強制跳轉回登入頁面
            router.replace('/(auth)/login')
          } else {
            console.error('登出錯誤:', error)
          }
        },
      },
    ])
  }

  const renderItem = ({ item, drag, isActive }: RenderItemParams<Photo>) => {
    return (
      <ScaleDecorator>
        <TouchableOpacity
          onLongPress={drag}
          disabled={isActive}
          delayLongPress={100}
          style={[styles.rowItem, { backgroundColor: isActive ? '#f0f0f0' : '#fff' }]}
        >
          <Image source={{ uri: item.url }} style={styles.image} />
          <View style={styles.infoText}>
            <Text style={styles.rankText}>
              {item.rank === 0 ? '👑 主大頭貼' : `順位 ${item.rank + 1}`}
            </Text>
            <Text style={{ color: '#999', fontSize: 12 }}>長按拖曳可排序</Text>
          </View>
          <Text style={{ fontSize: 24, color: '#ccc' }}>☰</Text>
        </TouchableOpacity>
      </ScaleDecorator>
    )
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>編輯照片 ({photos.length}/6)</Text>
          <Button title="新增" onPress={uploadPhoto} disabled={loading} />
        </View>

        {loading && photos.length === 0 ? (
          <ActivityIndicator />
        ) : (
          <DraggableFlatList
            data={photos}
            onDragEnd={({ data }) => saveOrder(data)}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 50 }}
            // 👇 關鍵：把新的登出按鈕放在這裡
            ListFooterComponent={
              <View style={styles.footer}>
                <TouchableOpacity
                  onPress={handleSignOut}
                  style={styles.signOutButton} // 套用新樣式
                >
                  <Text style={styles.signOutText}>登出</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </View>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 60 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20
  },
  title: { fontSize: 24, fontWeight: 'bold' },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 15,
  },
  infoText: { flex: 1 },
  rankText: { fontWeight: 'bold', fontSize: 16, marginBottom: 5 },
  footer: {
    padding: 20,
    paddingBottom: 50,
  },
  // 👇 新增的登出按鈕樣式
  signOutButton: {
    alignSelf: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  signOutText: {
    fontSize: 16,
    color: '#999',
    textDecorationLine: 'underline',
  }
})