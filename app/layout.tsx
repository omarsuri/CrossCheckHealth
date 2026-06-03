import "../styles/globals.css";

export const metadata = {
  title: "CrossCheckHealth",
  description: "Preventive healthcare tools for family health decisions."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
