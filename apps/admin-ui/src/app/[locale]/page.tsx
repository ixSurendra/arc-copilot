import { redirect } from 'next/navigation';

export default function LocaleRoot() {
  redirect('admin/dashboard');
}
