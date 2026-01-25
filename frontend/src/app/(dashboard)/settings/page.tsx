import { Separator } from "@/components/ui/separator"

export default function SettingsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">설정</h3>
                <p className="text-sm text-muted-foreground">
                    계정 설정과 환경설정을 관리하세요.
                </p>
            </div>
            <Separator />
            <div className="flex flex-col gap-4 p-4 border rounded-lg bg-card text-card-foreground">
                <p className="text-sm text-muted-foreground">설정 항목이 여기에 표시됩니다.</p>
            </div>
        </div>
    )
}
