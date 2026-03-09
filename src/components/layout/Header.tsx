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
import { LogOut, User } from "lucide-react";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
import { useDictionary } from "@/providers/LocaleProvider";

export function Header() {
  const { user } = useAuth();
  const t = useDictionary();

  return (
    <header className="flex h-14 items-center justify-between border-b px-6">
      <div />
      <div className="flex items-center gap-2">
        <LocaleSwitcher />

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {user.photoURL ? (
                <button className="h-8 w-8 rounded-full overflow-hidden border hover:ring-2 hover:ring-primary/50 transition-all">
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
