import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import "./material-theme.css";
import "./command-shell.css";
import "./command-center.css";
import "./green-workspace.css";
import "./energy-workspace.css";
import "./overview-dashboard.css";
import "./overview-shell.css";
import "./simulation-dashboard.css";
import "./decision-dashboard.css";
import "./decision-interaction.css";
import "./evidence-drawer.css";
import "./realtime-units.css";
import "./motion-units.css";
import "./motion-workspaces.css";
import "./motion-simulation.css";
import "./quick-navigation.css";
import "./evidence-audit.css";
import "./event-experience.css";
import "./motion-enhanced.css";
import "./demo-motion.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);
  return {
    metadataBase,
    title: "核衡智枢 · 核能协同智能决策平台",
    description: "面向核能安全、绿色增效与新能源协同的人在回路智能决策平台。",
    openGraph: {
      title: "核衡智枢 · 核能协同智能决策平台",
      description: "一个平台、三个专业智能体、一个始终由人确认的决策闭环。",
    },
    twitter: {
      card: "summary",
      title: "核衡智枢 · 核能协同智能决策平台",
      description: "核能安全、绿色增效与新能源协同智能决策。",
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
