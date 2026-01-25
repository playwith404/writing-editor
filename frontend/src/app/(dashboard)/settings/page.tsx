import { Separator } from "@/components/ui/separator"

export default function SettingsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Settings</h3>
                <p className="text-sm text-muted-foreground">
                    Manage your account settings and preferences.
                </p>
            </div>
            <Separator />
            <div className="flex flex-col gap-4 p-4 border rounded-lg bg-card text-card-foreground">
                <p className="text-sm text-muted-foreground">Settings configuration will appear here.</p>
            </div>
        </div>
    )
}
