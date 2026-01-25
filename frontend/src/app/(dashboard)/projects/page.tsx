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
        title: "The Silent Echo",
        description: "A mystery novel set in 1920s London.",
        lastEdited: "2 hours ago",
        status: "In Progress",
        words: "12,450 words",
    },
    {
        id: "2",
        title: "Neon Horizon",
        description: "Cyberpunk thriller about a rogue AI.",
        lastEdited: "1 day ago",
        status: "Drafting",
        words: "45,200 words",
    },
    {
        id: "3",
        title: "Tales of the Lost",
        description: "Collection of short fantasy stories.",
        lastEdited: "5 days ago",
        status: "Planning",
        words: "3,100 words",
    },
]

export default function ProjectsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Projects</h2>
                    <p className="text-muted-foreground">
                        Manage your stories and writing projects.
                    </p>
                </div>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> New Project
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
                                Last edited {project.lastEdited}
                            </CardFooter>
                        </Card>
                    </Link>
                ))}

                {/* New Project Placeholder Card */}
                <button className="flex h-full min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed bg-muted/50 transition-colors hover:bg-muted/80 hover:border-primary/50">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background border shadow-sm">
                        <Plus className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <span className="mt-4 text-sm font-medium text-muted-foreground">Create New Project</span>
                </button>
            </div>
        </div>
    )
}
