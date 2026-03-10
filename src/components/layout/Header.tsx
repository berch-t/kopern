"use client";

import { useAuth } from "@/hooks/useAuth";
import { signOut } from "@/lib/firebase/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Github, LogOut, User } from "lucide-react";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
import { MobileSidebar } from "@/components/layout/Sidebar";
import { BugReportDialog } from "@/components/feedback/BugReportDialog";
import { useDictionary } from "@/providers/LocaleProvider";

export function Header() {
  const { user } = useAuth();
  const t = useDictionary();

  return (
    <header className="flex h-14 items-center justify-between border-b border-border/60 px-4 md:px-6">
      <div>
        <MobileSidebar />
      </div>
      <div className="flex items-center gap-2">
        <BugReportDialog />
        <a
          href="https://github.com/berch-t/kopern"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground">
            <Github className="h-4 w-4" />
          </Button>
        </a>
        <LocaleSwitcher />

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {user.photoURL ? (
                <button className="h-8 w-8 rounded-full overflow-hidden border hover:ring-2 hover:ring-primary/40 transition-all">
                  <img
                    src={user.photoURL}
                    alt={user.displayName || "Profile"}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </button>
              ) : (
                <Button variant="ghost" size="icon">
                  <User className="h-4 w-4" />
                </Button>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled>
                <span className="text-xs text-muted-foreground">{user.email}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => signOut()}>
                <LogOut className="mr-2 h-4 w-4" />
                {t.common.signOut}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
