import "./globals.css";

export const metadata = {
  title: "VaaniRAG — Voice-Enabled RAG",
  description:
    "Speak your question, get a grounded answer retrieved from real passages — end to end in under 200ms.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
