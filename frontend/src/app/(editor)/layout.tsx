import { AuthGuard } from "@/components/auth/auth-guard"

export default function EditorLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <AuthGuard>
            <div className="min-h-screen bg-background text-foreground">
                {children}
            </div>
        </AuthGuard>
    )
}
