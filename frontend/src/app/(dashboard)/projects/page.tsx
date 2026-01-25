import Link from "next/link"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const projects = [
    {
        id: "1",
        title: "고요한 메아리",
        description: "1920년대 런던을 배경으로 한 미스터리 소설.",
        lastEdited: "2시간 전",
        status: "집필 중",
        words: "12,450 단어",
    },
    {
        id: "2",
        title: "네온 지평선",
        description: "탈주 AI를 쫓는 사이버펑크 스릴러.",
        lastEdited: "1일 전",
        status: "초안 작성",
        words: "45,200 단어",
    },
    {
        id: "3",
        title: "잃어버린 이야기들",
        description: "짧은 판타지 단편집.",
        lastEdited: "5일 전",
        status: "기획",
        words: "3,100 단어",
    },
]

export default function ProjectsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">프로젝트</h2>
                    <p className="text-muted-foreground">
                        스토리와 집필 프로젝트를 관리하세요.
                    </p>
                </div>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> 새 프로젝트
                </Button>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
                    <Link key={project.id} href={`/${project.id}`} className="block group">
                        <Card className="h-full transition-all group-hover:border-primary/50 group-hover:shadow-md">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="truncate">{project.title}</CardTitle>
                                    <Badge variant="secondary">{project.status}</Badge>
                                </div>
                                <CardDescription className="line-clamp-2">
                                    {project.description}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <span className="font-medium text-foreground">{project.words}</span>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="text-xs text-muted-foreground">
                                마지막 수정 {project.lastEdited}
                            </CardFooter>
                        </Card>
                    </Link>
                ))}

                {/* 새 프로젝트 플레이스홀더 카드 */}
                <button className="flex h-full min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed bg-muted/50 transition-colors hover:bg-muted/80 hover:border-primary/50">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background border shadow-sm">
                        <Plus className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <span className="mt-4 text-sm font-medium text-muted-foreground">새 프로젝트 만들기</span>
                </button>
            </div>
        </div>
    )
}
