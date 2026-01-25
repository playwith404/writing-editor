import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">페이지를 찾을 수 없습니다.</h1>
        <p className="text-muted-foreground">요청하신 페이지가 존재하지 않습니다.</p>
        <Link href="/projects" className="text-sm font-medium text-primary hover:underline">
          프로젝트로 돌아가기
        </Link>
      </div>
    </div>
  );
}
