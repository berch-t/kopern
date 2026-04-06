"use client";

import { SharedNavbar } from "@/components/layout/SharedNavbar";
import { MobileSidebar } from "@/components/layout/Sidebar";

export function Header() {
  return (
    <div className="flex items-center border-b border-border/60">
      <div className="md:hidden">
        <MobileSidebar />
      </div>
      <div className="flex-1">
        <SharedNavbar variant="dashboard" />
      </div>
    </div>
  );
}
