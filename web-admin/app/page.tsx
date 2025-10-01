// app/page.tsx (server component)
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/login'); // always send to /login
}
