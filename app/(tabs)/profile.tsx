import { decode } from 'base64-arraybuffer'
import * as ImagePicker from 'expo-image-picker'
import { useEffect, useState } from 'react'
import { Alert, Button, Image, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { supabase } from '../../lib/supabase'

// 接下來要做改上傳照片功能

export default function ProfileScreen() {
    const [loading, setLoading] = useState(true)
    const [username, setUsername] = useState('')
    const [bio, setBio] = useState('')
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
    const [session, setSession] = useState<any>(null)

    // 1. 取得目前登入的使用者資訊
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session)
        if (session) getProfile(session)
        })
    }, [])

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

    // 3. 更新文字資料 (暱稱、自介)
    async function updateProfile({
        username,
        bio,
        avatar_url,
    }: {
        username: string
        bio: string
        avatar_url: string | null
    }) {
        try {
        setLoading(true)
        if (!session?.user) throw new Error('No user on the session!')

        const updates = {
            id: session.user.id,
            username,
            bio,
            avatar_url,
            updated_at: new Date(),
        }

        const { error } = await supabase.from('profiles').upsert(updates)

        if (error) throw error
        Alert.alert('成功', '個人檔案已更新！')
        } catch (error) {
        if (error instanceof Error) Alert.alert(error.message)
        } finally {
        setLoading(false)
        }
    }

    // 4. 上傳照片的功能
    async function uploadAvatar() {
        try {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1], // 正方形裁切
            quality: 0.5, // 壓縮圖片品質 (0~1)
            base64: true,
        })

        if (result.canceled || !result.assets || result.assets.length === 0) {
            return
        }

        const image = result.assets[0]
        setLoading(true)

        if (!image.base64) throw new Error('圖片讀取失敗')

        // 檔案路徑：avatars/user_id/時間戳記.png
        // 修改這兩行
        const filePath = `${session.user.id}/${new Date().getTime()}.jpg` // 改成 .jpg
        const contentType = 'image/jpeg' // 改成 image/jpeg

        const { error } = await supabase.storage
            .from('avatars')
            .upload(
                        filePath,                 // 第一個參數：路徑
                        decode(image.base64),     // 第二個參數：檔案本體 (用 decode 函式把 base64 字串轉成二進位)
                        {                         // 第三個參數：設定選項
                        contentType: 'image/jpeg', // 建議直接指定，或檢查 image.type
                        upsert: true
                        }
                    )

        if (error) throw error

        // 取得公開網址
        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
        
        setAvatarUrl(data.publicUrl) // 更新畫面上的預覽
        updateProfile({ username, bio, avatar_url: data.publicUrl }) // 順便更新資料庫
        
        } catch (error) {
        if (error instanceof Error) Alert.alert('上傳失敗', error.message)
        } finally {
        setLoading(false)
        }
    }

    return (
        <ScrollView style={styles.container}>
        <View style={styles.headerContainer}>
            <Text style={styles.headerTitle}>編輯個人檔案</Text>
        </View>

        <View style={{ alignItems: 'center', marginBottom: 20 }}>
            {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
            <View style={[styles.avatar, { backgroundColor: '#ccc', justifyContent: 'center', alignItems: 'center' }]}>
                <Text>無照片</Text>
            </View>
            )}
            <View style={{ marginTop: 10 }}>
                <Button title="更換大頭貼" onPress={uploadAvatar} disabled={loading} />
            </View>
        </View>

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
            <Button title={loading ? '儲存中...' : '儲存檔案'} onPress={() => updateProfile({ username, bio, avatar_url: avatarUrl })} disabled={loading} />
        </View>
        
        <View style={[styles.verticallySpaced, { marginTop: 20 }]}>
            <Button title="登出" color="red" onPress={() => supabase.auth.signOut()} />
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