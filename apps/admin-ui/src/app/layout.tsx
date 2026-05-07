import './global.css';

export const metadata = {
  title: 'IX Admin',
  description: 'Admin dashboard for IX platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
