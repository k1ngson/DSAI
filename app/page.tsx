import { redirect } from 'next/navigation';

export default function Home() {
  // 自動導向到登入頁面
  redirect('/login');
}