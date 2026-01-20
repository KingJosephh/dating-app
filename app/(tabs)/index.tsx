import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Button, StyleSheet, Text, View } from 'react-native';
import Swiper from 'react-native-deck-swiper';
import Card from '../../components/Card'; // 請確認路徑是否正確
import { supabase } from '../../lib/supabase'; // 請確認路徑是否正確

// 定義資料型別
type Profile = {
  id: string;
  username: string;
  age: number;
  bio: string;
  image: string;
};

export default function HomeScreen() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const swiperRef = useRef<Swiper<any>>(null);

  // 用來強制重置 Swiper 的金鑰 (關鍵)
  const [stackKey, setStackKey] = useState(0);

  // 1. 初始化：取得 Session 並撈取資料
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfiles(session.user.id);
    });
  }, []);

  // 2. 核心功能：撈取卡片資料 (排除已滑過 + 補回抓照片邏輯)
  const fetchProfiles = async (userId: string) => {
    setLoading(true);
    try {
      // A. 先找出我已經滑過哪些人的 ID
      const { data: swipedData, error: swipeError } = await supabase
        .from('swipes')
        .select('target_id')
        .eq('user_id', userId);

      if (swipeError) throw swipeError;

      const swipedIds = swipedData?.map(item => item.target_id) || [];
      
      // 把「我自己」也加進排除名單，避免滑到自己
      const excludeIds = [userId, ...swipedIds];

      console.log(`準備撈取資料，已排除 ${excludeIds.length} 人`);

      // 👇👇👇 修正重點：手動組合成 Supabase 看得懂的字串格式 👇👇👇
      // 格式必須是： ("id1","id2","id3")，包含括號和雙引號
      const filterString = `(${excludeIds.map(id => `"${id}"`).join(',')})`;
      console.log('排除字串:', filterString);

      // B. 撈取資料 (改用 .filter 搭配手動字串，這是解決 PGRST100 最穩的方法)
      const { data: users, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .filter('id', 'not.in', filterString) // ✅ 修正這裡
        .limit(10);

      if (profileError) throw profileError;

      if (!users || users.length === 0) {
        console.log('真的沒人了');
        setProfiles([]);
      } else {
        console.log(`撈到 ${users.length} 位新用戶`);

        // C. 去 Storage 找照片 (並行處理)
        const profilesWithPhotos = await Promise.all(
          users.map(async (user) => {
            // 預設圖片
            let imageUrl = 'https://via.placeholder.com/400x600.png?text=No+Photo';
            
            // 嘗試抓取 Avatar
            const { data: files } = await supabase.storage
              .from('avatars')
              .list(user.id + '/', { limit: 1, sortBy: { column: 'created_at', order: 'desc' } });

            if (files && files.length > 0) {
              const { data } = supabase.storage
                .from('avatars')
                .getPublicUrl(`${user.id}/${files[0].name}`);
              imageUrl = data.publicUrl;
            }

            return { 
              id: user.id,
              username: user.username || '神秘用戶', 
              age: 25, // 假設資料庫沒存年齡，暫時寫死
              bio: user.bio || '這個人很懶，什麼都沒寫...', 
              image: imageUrl 
            };
          })
        );

        // 隨機排序並更新狀態
        setProfiles(profilesWithPhotos.sort(() => Math.random() - 0.5));
        setStackKey(prev => prev + 1); // 強制 Swiper 重繪
      }

    } catch (error: any) {
      console.error('Fetch Error:', error);
      Alert.alert('讀取錯誤', error.message || '無法獲取資料');
    } finally {
      setLoading(false);
    }
  };

  // 3. 處理滑動邏輯 (Like / Pass)
  const handleSwipe = async (index: number, isLike: boolean) => {
    if (!session || !profiles[index]) return;

    const targetUser = profiles[index];
    console.log(`${isLike ? '❤️ Like' : '❌ Pass'}: ${targetUser.username}`);

    try {
      // 3.1 寫入滑動紀錄
      const { error } = await supabase.from('swipes').insert({
        user_id: session.user.id,
        target_id: targetUser.id,
        is_like: isLike,
      });

      if (error) {
        console.error('Swipe Insert Error:', error);
        return;
      }

      // 3.2 如果是 Like，檢查是否配對 (Check Match)
      if (isLike) {
        // 呼叫後端 SQL 函數
        const { data: isMatch, error: matchError } = await supabase
          .rpc('check_match', { 
            current_user_id: session.user.id, 
            target_user_id: targetUser.id 
          });

        if (matchError) {
          console.error('Match Check Error:', matchError);
        } else if (isMatch) {
          // 🎉 配對成功！
          Alert.alert(
            '🎉 配對成功！', 
            `你和 ${targetUser.username} 互相喜歡！\n聊天室已自動建立。`,
            [{ text: '太棒了', onPress: () => console.log('OK') }]
          );
        }
      }

    } catch (err) {
      console.error('Handle Swipe Error:', err);
    }
  };

  // 4. 重置測試功能 (對接後端 RPC)
  const resetTest = async () => {
    if (!session) return;
    setLoading(true);
    try {
      // ✅ 呼叫 SQL 裡的 reset_my_test 函數
      const { error } = await supabase.rpc('reset_my_test');
      
      if (error) throw error;
      
      Alert.alert('重置成功', '滑動紀錄與配對已清空，您可以重新開始滑了！');
      
      // 清空前端狀態並重新撈取
      setProfiles([]);
      fetchProfiles(session.user.id);
      
    } catch (e: any) {
      console.error('Reset Error:', e);
      Alert.alert('重置失敗', e.message);
      setLoading(false);
    }
  };

  // 渲染畫面
  if (loading && profiles.length === 0) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#E94057" /></View>;
  }

  return (
    <View style={styles.container}>
      {profiles.length > 0 ? (
        <View style={styles.swiperContainer}>
          <Swiper
            key={stackKey} // 👈 關鍵：改變 key 強制重新渲染組件
            ref={swiperRef}
            cards={profiles}
            stackSize={3}
            cardIndex={0}
            verticalSwipe={false} // 禁止上下滑
            animateCardOpacity
            backgroundColor={'transparent'}
            // 傳遞資料給 Card 組件
            renderCard={(card) => (card ? <Card item={card} /> : <View />)}
            // 事件處理
            onSwipedLeft={(index) => handleSwipe(index, false)}
            onSwipedRight={(index) => handleSwipe(index, true)}
            onSwipedAll={() => setProfiles([])} // 滑完清空
            overlayLabels={{
              left: {
                title: 'NOPE',
                style: {
                  label: { borderColor: 'red', color: 'red', borderWidth: 1 },
                  wrapper: { flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-start', marginTop: 30, marginLeft: -30 }
                }
              },
              right: {
                title: 'LIKE',
                style: {
                  label: { borderColor: '#4DED30', color: '#4DED30', borderWidth: 1 },
                  wrapper: { flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', marginTop: 30, marginLeft: 30 }
                }
              }
            }}
          />
        </View>
      ) : (
        <View style={styles.center}>
          <Text style={styles.noDataText}>附近沒有人了...</Text>
          <Text style={styles.subText}>請稍後再來，或是重置測試</Text>
          
          <View style={{ height: 20 }} />

          <Button title="🔄 重新整理" onPress={() => session && fetchProfiles(session.user.id)} />
          
          <View style={{ height: 20 }} />

          <Button color="red" title="🗑️ 重置測試 (清空紀錄)" onPress={resetTest} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  swiperContainer: { flex: 1, marginTop: -20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  noDataText: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  subText: { fontSize: 16, color: 'gray', marginBottom: 30 },
});