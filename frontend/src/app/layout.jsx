import '../styles/globals.css';

export const metadata = {
  title: 'GoPratle | Event Workspace',
  description: 'Organize event requirements, schedules, and planning requests with GoPratle.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
