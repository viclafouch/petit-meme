import {
  ArrowLeft,
  Blocks,
  LayoutDashboard,
  MessageSquarePlus,
  SquareLibrary,
  Twitter,
  Users2,
  Video
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'
import { getAdminPendingSubmissionCountQueryOpts } from '@admin/-lib/queries'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'

export const AdminSidebar = ({
  ...props
}: React.ComponentProps<typeof Sidebar>) => {
  const pendingCountQuery = useQuery(getAdminPendingSubmissionCountQueryOpts())
  const pendingCount = pendingCountQuery.data ?? 0

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/">
                <ArrowLeft />
                Retour au site
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Administration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/admin">
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/admin/library">
                    <Video />
                    <span>Librairie</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/admin/categories">
                    <SquareLibrary />
                    <span>Catégories</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/admin/submissions">
                    <MessageSquarePlus />
                    <span>Soumissions</span>
                  </Link>
                </SidebarMenuButton>
                {pendingCount > 0 ? (
                  <SidebarMenuBadge className="bg-warning text-warning-foreground font-medium">
                    {pendingCount}
                  </SidebarMenuBadge>
                ) : null}
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/admin/users">
                    <Users2 />
                    <span>Utilisateurs</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/admin/downloader">
                    <Twitter />
                    <span>Téléchargeur Twitter</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/admin/services">
                    <Blocks />
                    <span>Services</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
