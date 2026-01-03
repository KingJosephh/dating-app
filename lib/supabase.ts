import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import { AppState, AppStateStatus } from 'react-native'
import 'react-native-url-polyfill/auto'

// 你的 URL 和 Key
const supabaseUrl = 'https://lmxbkjsefjliwkmkpxtg.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxteGJranNlZmpsaXdrbWtweHRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0OTc1MDIsImV4cCI6MjA4MjA3MzUwMn0.zHWdy1XaIAs-Gz9TGtydD_mYFWfRqTpNrvKFlj7MWzU'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        // 👇 修改這裡：加上 "as any" 告訴 TS 不要檢查這一行的型別
        storage: AsyncStorage as any,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
    })

    AppState.addEventListener('change', (state: AppStateStatus) => {
    if (state === 'active') {
        supabase.auth.startAutoRefresh()
    } else {
        supabase.auth.stopAutoRefresh()
    }
})