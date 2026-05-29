import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { api } from "@/convex/_generated/api";
import { SquarePenIcon } from "lucide-react";
import Link from "next/link";
import { NavUser } from "@/components/nav-user";
import { ChatHistory } from "@/components/chat-history";
import { preloadAuthQuery } from "@/lib/auth-server";

export async function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const preloadedChats = await preloadAuthQuery(api.chat.getChats, {});

  return (
    <Sidebar {...props}>
      <SidebarHeader className={`h-16 flex flex-col gap-2 `}>
        <Link href="/" className="font-semibold p-2">
          Agent Template
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a href="/">
                    <SquarePenIcon />
                    <span>New Chat</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <ChatHistory preloadedChats={preloadedChats} />
      </SidebarContent>
      <SidebarFooter className="border-t">
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
