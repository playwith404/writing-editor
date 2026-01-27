"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { api, ApiError } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileDown, Book, FileText } from "lucide-react"

export default function PublishingPage() {
    const params = useParams<{ projectId: string }>()
    const projectId = params?.projectId
    const [downloading, setDownloading] = useState<string | null>(null)
    const [message, setMessage] = useState<string | null>(null)

    const handleExport = async (format: string) => {
        if (!projectId) return
        setDownloading(format)
        setMessage(null)
        try {
            // Note: The API currently supports only one export type or we simulate it via format
            // In a real scenario, we might call create() then download()
            // For now, we'll assume a direct download endpoint or simulated flow
            // Since api.publishing.create takes format, we use that.

            const exportJob = await api.publishing.create({ projectId, format })

            // If it returns a job, we might need to poll. 
            // If it returns immediate content or URL, handle it.
            // Assuming simplified flow for demo:
            if (exportJob?.id) {
                // Trigger download
                const blob = await api.publishing.download(exportJob.id)
                // Handle blob download in browser...
                // This part requires handling Blob response in API client properly.
                setMessage("내보내기 요청이 완료되었습니다.")
            } else {
                setMessage("내보내기가 시작되었습니다.")
            }

        } catch (e) {
            if (e instanceof ApiError) setMessage(`오류: ${e.message}`)
            else setMessage("내보내기 실패")
        } finally {
            setDownloading(null)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">퍼블리싱</h2>
                <p className="text-muted-foreground">원고를 다양한 형식으로 내보냅니다.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Book className="h-5 w-5" /> EPUB
                        </CardTitle>
                        <CardDescription>전자책 표준 포맷입니다.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            className="w-full"
                            variant="outline"
                            disabled={!!downloading}
                            onClick={() => handleExport("epub")}
                        >
                            <FileDown className="mr-2 h-4 w-4" />
                            {downloading === "epub" ? "변환 중..." : "EPUB 내보내기"}
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" /> PDF
                        </CardTitle>
                        <CardDescription>인쇄 및 배포용 포맷입니다.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            className="w-full"
                            variant="outline"
                            disabled={!!downloading}
                            onClick={() => handleExport("pdf")}
                        >
                            <FileDown className="mr-2 h-4 w-4" />
                            {downloading === "pdf" ? "변환 중..." : "PDF 내보내기"}
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" /> 텍스트
                        </CardTitle>
                        <CardDescription>순수 텍스트 파일입니다.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            className="w-full"
                            variant="outline"
                            disabled={!!downloading}
                            onClick={() => handleExport("txt")}
                        >
                            <FileDown className="mr-2 h-4 w-4" />
                            {downloading === "txt" ? "추출 중..." : "TXT 내보내기"}
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
