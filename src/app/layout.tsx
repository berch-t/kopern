import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kopern — AI Agent Builder & Grader",
  description:
    "Create custom business AI agents and validate them through deterministic grading pipelines.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
