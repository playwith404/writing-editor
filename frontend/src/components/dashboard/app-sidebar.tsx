"use client"

import Link from "next/link"
import { usePathname, useParams } from "next/navigation"
import { BookOpen, Settings, Home, LayoutDashboard, Map, BarChart, Share, CreditCard, Archive, PenTool } from "lucide-react"

import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarHeader,
} from "@/components/ui/sidebar"
import { LogoutButton } from "@/components/auth/logout-button"

const items = [
    {
        title: "프로젝트",
        url: "/projects",
        icon: BookOpen,
    },
    {
        title: "설정",
        url: "/settings",
        icon: Settings,
    },
]

export function AppSidebar() {
    const pathname = usePathname()
    const params = useParams<{ projectId: string }>()
    const projectId = params?.projectId

    const projectItems = projectId ? [
        {
            title: "대시보드",
            url: `/projects/${projectId}`,
            icon: LayoutDashboard,
        },
        {
            title: "기획실",
            url: `/projects/${projectId}/planning`,
            icon: Map,
        },
        {
            title: "스탯",
            url: `/projects/${projectId}/stats`,
            icon: BarChart,
        },
        {
            title: "퍼블리싱",
            url: `/projects/${projectId}/publishing`,
            icon: Share,
        },
        {
            title: "결제",
            url: `/projects/${projectId}/payment`,
            icon: CreditCard,
        },
        {
            title: "백업",
            url: `/projects/${projectId}/backup`,
            icon: Archive,
        },
    ] : []

    return (
        <Sidebar>
            <SidebarHeader>
                <div className="flex items-center gap-2 px-4 py-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                        <Home className="h-4 w-4" />
                    </div>
                    <span className="font-bold text-lg">Gleey</span>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>메뉴</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {items.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild isActive={pathname === item.url}>
                                        <Link href={item.url}>
                                            <item.icon />
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                {projectId && (
                    <SidebarGroup>
                        <SidebarGroupLabel>현재 프로젝트</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {projectItems.map((item) => (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton asChild isActive={pathname === item.url}>
                                            <Link href={item.url}>
                                                <item.icon />
                                                <span>{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                                <SidebarMenuItem>
                                    <SidebarMenuButton asChild>
                                        <Link href={`/${projectId}`} target="_blank">
                                            <PenTool />
                                            <span>집필실 (에디터)</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                )}

                <SidebarGroup>
                    <SidebarGroupLabel>계정</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <LogoutButton />
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
        </Sidebar>
    )
}
