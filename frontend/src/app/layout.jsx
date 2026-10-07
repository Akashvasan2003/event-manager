import '../styles/globals.css';

export const metadata = {
  title: 'GoPratle — Post an Event Requirement',
  description: 'Find planners, performers, and crew for your event.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
