import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    // 登入功能
    async function signInWithEmail() {
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
        });

        if (error) {
        Alert.alert('登入失敗', error.message);
        } else {
        // 登入成功後，跳轉到主頁 (tabs)
        router.replace('/(tabs)');
        }
        setLoading(false);
    }

    // 註冊功能
    async function signUpWithEmail() {
        // setLoading(true);
        // const { error } = await supabase.auth.signUp({
        // email,
        // password,
        // });

        // if (error) {
        // Alert.alert('註冊失敗', error.message);
        // } else {
        // Alert.alert('註冊成功！', '帳號已建立，請直接點擊登入。');
        // }
        // setLoading(false);
        setLoading(true)
        
        const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password: password,
        })

        // 👇 這是最重要的部分！加上這兩行
        if (error) {
            console.log("❌ 註冊失敗詳細原因：", error.message) // 這行會印在終端機
            Alert.alert("註冊失敗", error.message) // 這行會讓手機跳出具體錯誤
        } else {
            console.log("✅ 註冊成功！", data)
            Alert.alert("成功", "請去信箱收驗證信！")
        }
        
        setLoading(false)
    }

    return (
        <View style={styles.container}>
        {/* 設定頁面標題 */}
        <Stack.Screen options={{ title: '歡迎回來', headerTitleAlign: 'center' }} />
        
        <Text style={styles.header}>交友 App MVP</Text>
        
        <View style={styles.inputContainer}>
            <TextInput
            style={styles.input}
            onChangeText={setEmail}
            value={email}
            placeholder="電子信箱 (Email)"
            autoCapitalize="none"
            />
        </View>
        
        <View style={styles.inputContainer}>
            <TextInput
            style={styles.input}
            onChangeText={setPassword}
            value={password}
            secureTextEntry={true}
            placeholder="密碼"
            autoCapitalize="none"
            />
        </View>

        <View style={styles.buttonContainer}>
            <TouchableOpacity 
            style={[styles.button, styles.loginButton]} 
            onPress={signInWithEmail} 
            disabled={loading}>
            <Text style={styles.buttonText}>登入</Text>
            </TouchableOpacity>

            <TouchableOpacity 
            style={[styles.button, styles.registerButton]} 
            onPress={signUpWithEmail} 
            disabled={loading}>
            <Text style={[styles.buttonText, styles.registerText]}>註冊新帳號</Text>
            </TouchableOpacity>
        </View>

        {loading && <ActivityIndicator style={{marginTop: 20}} size="large" color="#0000ff" />}
        </View>
    );
    }

    const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fff' },
    header: { fontSize: 30, fontWeight: 'bold', textAlign: 'center', marginBottom: 40, color: '#333' },
    inputContainer: { marginBottom: 15, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, backgroundColor: '#f9f9f9' },
    input: { fontSize: 16 },
    buttonContainer: { marginTop: 10, gap: 10 },
    button: { padding: 15, borderRadius: 8, alignItems: 'center' },
    loginButton: { backgroundColor: '#FF5A5F' }, // Tinder 紅
    registerButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#FF5A5F' },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    registerText: { color: '#FF5A5F' },
});