import { Redirect } from 'expo-router';

export default function HomeScreen() {
  // 暫時強制跳轉到登入頁測試
  return <Redirect href="/(auth)/login" />;
}