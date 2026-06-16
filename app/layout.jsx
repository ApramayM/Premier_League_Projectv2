import './styles.css';

export const metadata = {
  title: 'PuntLite World Cup',
  description: 'World Cup live odds prediction game',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
