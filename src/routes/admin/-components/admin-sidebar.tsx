import {
  Activity,
  ArrowLeft,
  Blocks,
  LayoutDashboard,
  MessageSquarePlus,
  SparklesIcon,
  SquareLibrary,
  UsersRound,
  Video
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { XTwitterIcon } from '~/components/icon/x-twitter'
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
} from '~/components/ui/sidebar'
import { getAdminPendingSubmissionCountQueryOpts } from '~/routes/admin/-lib/queries'

type AdminSidebarProps = React.ComponentProps<typeof Sidebar>

export const AdminSidebar = ({ ...props }: AdminSidebarProps) => {
  const pendingCountQuery = useQuery(getAdminPendingSubmissionCountQueryOpts())
  const pendingCount = pendingCountQuery.data ?? 0

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton render={<Link to="/" />}>
              <ArrowLeft />
              Retour au site
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
                <SidebarMenuButton render={<Link to="/admin" />}>
                  <LayoutDashboard />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link to="/admin/activity" />}>
                  <Activity />
                  <span>Activité</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link to="/admin/library" />}>
                  <Video />
                  <span>Librairie</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link to="/admin/categories" />}>
                  <SquareLibrary />
                  <span>Catégories</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link to="/admin/submissions" />}>
                  <MessageSquarePlus />
                  <span>Soumissions</span>
                </SidebarMenuButton>
                {pendingCount > 0 ? (
                  <SidebarMenuBadge className="bg-warning text-warning-foreground font-medium">
                    {pendingCount}
                  </SidebarMenuBadge>
                ) : null}
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link to="/admin/ai-search" />}>
                  <SparklesIcon />
                  <span>Recherche IA</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link to="/admin/users" />}>
                  <UsersRound />
                  <span>Utilisateurs</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link to="/admin/downloader" />}>
                  <XTwitterIcon />
                  <span>Téléchargeur Twitter</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link to="/admin/services" />}>
                  <Blocks />
                  <span>Services</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
