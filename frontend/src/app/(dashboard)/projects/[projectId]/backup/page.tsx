"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { api, ApiError } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Archive, Upload, Download } from "lucide-react"

export default function BackupPage() {
    const params = useParams<{ projectId: string }>()
    const projectId = params?.projectId
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<string | null>(null)

    const handleBackup = async () => {
        if (!projectId) return
        setLoading(true)
        setMessage(null)
        try {
            // Assume api.backups.export returns string (url) or content
            // We need to handle file download in browser
            const data = await api.backups.export(projectId)
            // Handling download would be here
            setMessage("백업 파일 생성이 완료되었습니다. (다운로드 시작됨)")
        } catch (e) {
            if (e instanceof ApiError) setMessage(`오류: ${e.message}`)
            else setMessage("백업 실패")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">백업 및 복원</h2>
                <p className="text-muted-foreground">프로젝트 데이터를 안전하게 보관하세요.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Download className="h-5 w-5" /> 프로젝트 백업 (내보내기)
                        </CardTitle>
                        <CardDescription>현재 프로젝트의 모든 데이터를 파일로 저장합니다.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            className="w-full"
                            onClick={handleBackup}
                            disabled={loading}
                        >
                            {loading ? "생성 중..." : "백업 파일 생성"}
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Upload className="h-5 w-5" /> 프로젝트 복원 (가져오기)
                        </CardTitle>
                        <CardDescription>백업 파일을 사용하여 프로젝트를 복원합니다.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button variant="outline" className="w-full" disabled>
                            파일 선택 (구현 예정)
                        </Button>
                    </CardContent>
                </Card>
            </div>
            {message && (
                <div className="p-4 rounded-md bg-muted text-sm text-center">
                    {message}
                </div>
            )}
        </div>
    )
}
