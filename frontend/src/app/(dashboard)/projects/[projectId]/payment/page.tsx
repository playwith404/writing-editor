"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CreditCard } from "lucide-react"
import Link from "next/link"

export default function PaymentPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">결제 및 구독</h2>
                <p className="text-muted-foreground">프로젝트 관련 결제 내역을 확인합니다.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>구독 정보</CardTitle>
                    <CardDescription>현재 이용 중인 플랜 정보입니다.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-primary/10 rounded-full">
                                <CreditCard className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <p className="font-medium">Free Plan</p>
                                <p className="text-sm text-muted-foreground">무료 이용 중</p>
                            </div>
                        </div>
                        <Button variant="outline" asChild>
                            <Link href="/settings/billing">플랜 변경</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>결제 내역</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-sm text-muted-foreground text-center py-8">
                        최근 결제 내역이 없습니다.
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
