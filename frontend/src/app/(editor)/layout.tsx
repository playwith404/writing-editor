import { AuthGuard } from "@/components/auth/auth-guard"

export default function EditorLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <AuthGuard>
            <div className="h-[100dvh] overflow-hidden bg-background text-foreground">
                {children}
            </div>
        </AuthGuard>
    )
}
