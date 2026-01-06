import Card from '@/components/Card'; // 確認路徑
import { supabase } from '@/lib/supabase'; // 確認路徑
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Button, Dimensions, StyleSheet, Text, View } from 'react-native'
import Swiper from 'react-native-deck-swiper'

const { width } = Dimensions.get('window')

export default function HomeScreen() {
  // ------------------------------------------------------
  // 1. 狀態變數區 (State)
  // ------------------------------------------------------
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // 👇 用來判斷是否「全部滑完」的開關
  const [isSwipedAll, setIsSwipedAll] = useState(false)
  
  // 👇 用來強制重置 Swiper 的鑰匙
  const [stackKey, setStackKey] = useState(0)

  // ------------------------------------------------------
  // 2. 生命週期 (Effect)
  // ------------------------------------------------------
  useEffect(() => {
    fetchProfiles()
  }, [])

  // ------------------------------------------------------
  // 3. 核心功能函式
  // ------------------------------------------------------
  const fetchProfiles = async () => {
    setLoading(true)
    // 重置滑動狀態：告訴程式「現在有新卡片了，還沒滑完喔」
    setIsSwipedAll(false) 

    try {
      // A. 確認身分
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // B. 抓取其他使用者資料
      const { data: users, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', session.user.id) // 排除自己
        .limit(10)

      if (error) throw error

      if (users && users.length > 0) {
        // C. 幫每個人找照片 (這段就是你問的，必須保留！)
        const profilesWithPhotos = await Promise.all(
          users.map(async (user) => {
            // 去 Storage 查資料夾
            const { data: files } = await supabase.storage
              .from('avatars')
              .list(user.id + '/', {
                limit: 1, 
                sortBy: { column: 'created_at', order: 'desc' }
              })

            let imageUrl = 'https://via.placeholder.com/400x600.png?text=No+Photo'
            
            // 👇 這段是用來取得真實照片網址的，不能刪！
            if (files && files.length > 0) {
              const { data: publicUrlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(`${user.id}/${files[0].name}`)
              imageUrl = publicUrlData.publicUrl
            }

            return {
              ...user,
              image: imageUrl, // 塞入照片
              name: user.username || '神秘用戶',
              age: 25,
              bio: user.bio || '這個人很懶...'
            }
          })
        )

        // D. 更新資料並重置 Swiper
        setProfiles(profilesWithPhotos)
        setStackKey(prev => prev + 1) // 讓 Swiper 重新投胎
      } else {
        // 如果資料庫真的沒人了
        setProfiles([])
      }

    } catch (error) {
      Alert.alert('讀取失敗', (error as any).message)
    } finally {
      setLoading(false)
    }
  }

  // 滑動邏輯
  const onSwipedLeft = (cardIndex: number) => {
    // 未來可在這寫入資料庫: Pass
    console.log('Pass')
  }

  const onSwipedRight = (cardIndex: number) => {
    // 未來可在這寫入資料庫: Like
    console.log('Like')
  }

  // 當全部卡片都滑完時觸發
  const onSwipedAll = () => {
    console.log('沒卡片了！')
    setIsSwipedAll(true) // 把開關打開，畫面就會切換到「重新整理」
  }

  // ------------------------------------------------------
  // 4. 畫面渲染 (Render)
  // ------------------------------------------------------
  if (loading && profiles.length === 0) {
    return (
        <View style={styles.center}>
            <ActivityIndicator size="large" />
            <Text style={{marginTop: 10, color: '#888'}}>尋找緣分中...</Text>
        </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* 條件：有資料 且 還沒滑完 -> 顯示卡片 */}
      {profiles.length > 0 && !isSwipedAll ? (
        <View style={styles.swiperContainer}>
          <Swiper
            key={stackKey} // 綁定這把鑰匙
            cards={profiles}
            renderCard={(card) => (card ? <Card item={card} /> : <View />)}
            onSwipedLeft={onSwipedLeft}
            onSwipedRight={onSwipedRight}
            onSwipedAll={onSwipedAll}
            cardIndex={0}
            backgroundColor={'transparent'}
            stackSize={3}
            cardVerticalMargin={0}
            overlayOpacityHorizontalThreshold={width / 4}
            overlayLabels={{
              left: {
                title: 'NOPE',
                style: {
                  label: { backgroundColor: 'red', borderColor: 'red', color: 'white', borderWidth: 1, fontSize: 32, fontWeight: '800' },
                  wrapper: { flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-start', marginTop: 30, marginLeft: -30, zIndex: 999, elevation: 999 }
                }
              },
              right: {
                title: 'LIKE',
                style: {
                  label: { backgroundColor: 'green', borderColor: 'green', color: 'white', borderWidth: 1, fontSize: 32, fontWeight: '800' },
                  wrapper: { flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', marginTop: 30, marginLeft: 30, zIndex: 999, elevation: 999 }
                }
              }
            }}
          />
        </View>
      ) : (
        // 條件：沒資料 或 滑完了 -> 顯示重新整理
        <View style={styles.center}>
          <Text style={{ fontSize: 18, color: 'gray', marginBottom: 20 }}>
            {loading ? '正在讀取...' : '附近沒有人了...'}
          </Text>
          <Button title="🔄 重新搜尋" onPress={fetchProfiles} disabled={loading} />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  swiperContainer: {
    flex: 1,
    marginTop: -20, 
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
})