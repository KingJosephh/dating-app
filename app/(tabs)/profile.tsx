import { Session } from '@supabase/supabase-js'
import { decode } from 'base64-arraybuffer'
import * as ImagePicker from 'expo-image-picker'
import { useEffect, useState } from 'react'
import {
    Alert, Button, // 👈 新增：用來做滑動列表
    Dimensions,
    FlatList,
    Image, ScrollView, StyleSheet, Text, TextInput, // 👈 新增：用來抓螢幕寬度
    TouchableOpacity,
    View
} from 'react-native'
import { supabase } from '../../lib/supabase'
// 在檔案最上面的 imports 區，加入 router
import { router } from 'expo-router'

// 接下來要做登入接著跳轉到profile
const { width } = Dimensions.get('window')

export default function ProfileScreen() {
    const [loading, setLoading] = useState(false)
    const [username, setUsername] = useState('')
    const [bio, setBio] = useState('')
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [website, setWebsite] = useState('')

    // 👇👇👇 新增：多張照片的狀態 👇👇👇
    const [photos, setPhotos] = useState<string[]>([])

    // 1. 取得目前登入的使用者資訊
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session)
        })

        supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session)
        })
    }, [])

    useEffect(() => {
    if (session) {
      getProfile(session)      // 抓文字資料
      fetchUserPhotos() // 抓相簿照片
    }
    }, [session])

    // 2. 從資料庫讀取目前的個人檔案
    async function getProfile(currentSession: any) {
        try {
        setLoading(true)
        if (!currentSession?.user) throw new Error('No user on the session!')

        const { data, error, status } = await supabase
            .from('profiles')
            .select(`username, bio, avatar_url`)
            .eq('id', currentSession.user.id)
            .single()

        if (error && status !== 406) {
            throw error
        }

        if (data) {
            setUsername(data.username)
            setBio(data.bio)
            setAvatarUrl(data.avatar_url)
        }
        } catch (error) {
        if (error instanceof Error) Alert.alert(error.message)
        } finally {
        setLoading(false)
        }
    }

    // ✅ 新版 updateProfile (只更新文字資料，不管照片了)
    async function updateProfile({
    username,
    bio,
    }: {
    username: string
    bio: string
    }) {
    try {
        setLoading(true)
        if (!session?.user) throw new Error('No user on the session!')

        const updates = {
        id: session?.user.id,
        username,
        bio, // 這裡只更新暱稱和自我介紹
        updated_at: new Date(),
        }

        const { error } = await supabase.from('profiles').upsert(updates)

        if (error) {
        throw error
        } else {
            Alert.alert('成功', '個人檔案已更新！')
        }
    } catch (error) {
        if (error instanceof Error) {
        Alert.alert(error.message)
        }
    } finally {
        setLoading(false)
    }
    }

    // 4. 上傳照片的功能
    // async function uploadAvatar() {
    //     try {
    //     const result = await ImagePicker.launchImageLibraryAsync({
    //         mediaTypes: ImagePicker.MediaTypeOptions.Images,
    //         allowsEditing: true,
    //         aspect: [1, 1], // 正方形裁切
    //         quality: 0.5, // 壓縮圖片品質 (0~1)
    //         base64: true,
    //     })

    //     if (result.canceled || !result.assets || result.assets.length === 0) {
    //         return
    //     }

    //     const image = result.assets[0]
    //     setLoading(true)

    //     if (!image.base64) throw new Error('圖片讀取失敗')

    //     // 檔案路徑：avatars/user_id/時間戳記.png
    //     // 修改這兩行
    //     const filePath = `${session.user.id}/${new Date().getTime()}.jpg` // 改成 .jpg
    //     const contentType = 'image/jpeg' // 改成 image/jpeg

    //     const { error } = await supabase.storage
    //         .from('avatars')
    //         .upload(
    //                     filePath,                 // 第一個參數：路徑
    //                     decode(image.base64),     // 第二個參數：檔案本體 (用 decode 函式把 base64 字串轉成二進位)
    //                     {                         // 第三個參數：設定選項
    //                     contentType: 'image/jpeg', // 建議直接指定，或檢查 image.type
    //                     upsert: true
    //                     }
    //                 )

    //     if (error) throw error

    //     // 取得公開網址
    //     const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
        
    //     setAvatarUrl(data.publicUrl) // 更新畫面上的預覽
    //     updateProfile({ username, bio, avatar_url: data.publicUrl }) // 順便更新資料庫
        
    //     } catch (error) {
    //     if (error instanceof Error) Alert.alert('上傳失敗', error.message)
    //     } finally {
    //     setLoading(false)
    //     }
    // }
    
    // 👇👇👇 新增：多張照片的狀態 👇👇👇

    // 1. 讀取該使用者的所有照片
    async function fetchUserPhotos() {
        try {
        if (!session?.user) return

        // 列出 storage 裡該使用者資料夾下的所有檔案
        const { data, error } = await supabase.storage
            .from('avatars')
            .list(session.user.id + '/', {
            limit: 10,
            offset: 0,
            sortBy: { column: 'created_at', order: 'desc' },
            })

        if (error) {
            console.log('讀取照片列表失敗', error)
            return
        }

        if (data) {
            // 把檔案名稱轉換成網址
            const urls = data.map((file) => {
            const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(`${session.user.id}/${file.name}`)
            return urlData.publicUrl
            })
            setPhotos(urls)
        }
        } catch (error) {
        console.log('發生錯誤', error)
        }
    }

    // 2. 上傳新照片 (新增模式)
    async function uploadPhoto() {
        // 👇 新增這段：如果 session 是空的，就不要執行，直接結束
        if (!session || !session.user) {
        Alert.alert("錯誤", "找不到使用者資料，請重新登入！");
        return;
        }
        try {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1], // 如果你想讓照片維持正方形，可以留著；想維持原比例就拿掉這行
            quality: 0.5,
            base64: true,
        })

        if (!result.canceled) {
            const image = result.assets[0]
            // 使用時間當檔名，確保不重複
            const fileName = `${new Date().getTime()}.jpg`
            const filePath = `${session.user.id}/${fileName}`

            setLoading(true)
            const { error } = await supabase.storage
            .from('avatars')
            .upload(filePath, decode(image.base64!), {
                contentType: 'image/jpeg',
                upsert: false, // 不覆蓋，直接新增
            })

            setLoading(false)

            if (error) {
            Alert.alert('上傳失敗', error.message)
            } else {
            Alert.alert('成功', '照片已新增')
            fetchUserPhotos() // 重新整理列表
            }
        }
        } catch (e) {
        console.log(e)
        setLoading(false)
        }
    }

    // 3. 刪除照片
    async function deletePhoto(photoUrl: string) {
        try {
            console.log("正在嘗試刪除:", photoUrl) // 1. 印出網址確認
        // 從網址切出路徑： user_id/檔名.jpg
        const path = photoUrl.split('/public/avatars/')[1]
        if (!path) {
            Alert.alert("錯誤", "無法解析檔案路徑，請檢查 console")
            return
        }

        setLoading(true)
        const { error } = await supabase.storage
            .from('avatars')
            .remove([path])
        
        setLoading(false)

        if (error) {
            Alert.alert('刪除失敗', error.message)
        } else {
            fetchUserPhotos() // 重新整理
        }
        } catch (e) {
        console.log(e)
        setLoading(false)
        }
    }

    // 4. 畫面一載入就抓照片
    useEffect(() => {
        if (session) {
            getProfile(session) // 這是你原本抓 username 的函式，保留它
            fetchUserPhotos() // 👈 新增這行
        }
    }, [session])

  // ... (下面是你原本的 getProfile 和 updateProfile 函式，不用動) ...
    return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }}>
        <View style={styles.headerContainer}>
            <Text style={styles.headerTitle}>編輯個人檔案</Text>
        </View>

        {/* 👇👇👇 修改的部分開始：相簿區塊 👇👇👇 */}
        <View style={{ marginBottom: 30 }}>
             {/* 標題 */}
            <Text style={[styles.label, { marginBottom: 10 }]}>個人相簿 ({photos.length} 張)</Text>

            <View style={{ height: 320 }}>
                {photos.length > 0 ? (
                    <FlatList
                        data={photos}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        keyExtractor={(item) => item}
                        // 讓每一頁的寬度等於螢幕寬度扣掉 padding
                        getItemLayout={(data, index) => (
                            {length: width - 40, offset: (width - 40) * index, index}
                        )}
                        renderItem={({ item }) => (
                            <View style={{ width: width - 40, height: 300, alignItems: 'center' }}>
                                <Image
                                    source={{ uri: item }}
                                    style={{ width: '100%', height: '100%', borderRadius: 10, resizeMode: 'cover', backgroundColor: '#eee' }}
                                />
                                <TouchableOpacity
                                    style={{
                                        position: 'absolute',
                                        bottom: 10,
                                        right: 10,
                                        backgroundColor: 'rgba(0,0,0,0.6)',
                                        padding: 8,
                                        borderRadius: 20
                                    }}
                                    onPress={() => deletePhoto(item)}
                                >
                                    <Text style={{ color: 'white', fontWeight: 'bold' }}>🗑️ 刪除</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    />
                ) : (
                    <View style={{ height: 300, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', borderRadius: 10, borderStyle: 'dashed', borderWidth: 1, borderColor: '#ccc' }}>
                        <Text style={{ color: '#666' }}>尚無照片，快來新增第一張！</Text>
                    </View>
                )}
            </View>

            <View style={{ marginTop: 10 }}>
                <Button title="➕ 新增照片" onPress={uploadPhoto} disabled={loading} />
            </View>
        </View>
        {/* 👆👆👆 修改的部分結束 👆👆👆 */}


        <View style={styles.inputContainer}>
            <Text style={styles.label}>暱稱</Text>
            <TextInput style={styles.input} value={username || ''} onChangeText={setUsername} />
        </View>

        <View style={styles.inputContainer}>
            <Text style={styles.label}>自我介紹</Text>
            <TextInput 
                style={[styles.input, { height: 100 }]} 
                multiline 
                value={bio || ''} 
                onChangeText={setBio} 
                textAlignVertical="top"
            />
        </View>

        <View style={[styles.verticallySpaced, { marginTop: 20 }]}>
            {/* 注意：updateProfile 這裡我拿掉了 avatar_url，因為現在照片是獨立管理的，不用存進 profile 表格 */}
            <Button title={loading ? '儲存中...' : '儲存檔案'} onPress={() => updateProfile({ username, bio })} disabled={loading} />
        </View>
        
        <View style={[styles.verticallySpaced, { marginTop: 20 }]}>
            <Button title="登出" color="red" onPress={async () => {
                // 1. 先把 React 畫面上的變數清空 (讓畫面瞬間變白或顯示 Loading，使用者體驗較好)
                setSession(null)
                // 1. 先執行登出
                await supabase.auth.signOut()
            
                // 2. 登出完畢後，強制跳轉回首頁 (或是登入頁)
                // 因為你的 index.tsx 有寫紅綠燈邏輯，跳回 '/' 它就會自動把你踢去登入頁
                router.replace('/(auth)/login')
                
        }} />
        </View>
    </ScrollView>
)
    }

    const styles = StyleSheet.create({
    container: { padding: 20, backgroundColor: '#fff', flex: 1 },
    headerContainer: { marginTop: 40, marginBottom: 20 },
    headerTitle: { fontSize: 24, fontWeight: 'bold' },
    avatar: { width: 150, height: 150, borderRadius: 75, alignSelf: 'center' },
    inputContainer: { marginTop: 15 },
    label: { fontSize: 16, marginBottom: 5, color: '#555' },
    input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 5, padding: 10, fontSize: 16, backgroundColor: '#f9f9f9' },
    verticallySpaced: { paddingTop: 4, paddingBottom: 4, alignSelf: 'stretch' },
})