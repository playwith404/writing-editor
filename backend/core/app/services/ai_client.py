# app/services/ai_client.py

import httpx
import logging
from typing import Any, Dict, Optional

from app.core.config import settings

logger = logging.getLogger("gleey.ai_client")

class AIClient:
    def __init__(self):
        self.timeout = httpx.Timeout(30.0, connect=5.0) # LLM 응답 대기를 위해 넉넉히 설정
        self.base_url = settings.AI_SERVICE_URL.rstrip("/")

    async def post_internal(self, path: str, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        AI 서비스의 내부 엔드포인트(/internal/...)를 호출합니다.
        """
        normalized_path = path if path.startswith("/") else f"/{path}"
        url = f"{self.base_url}{normalized_path}"
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(url, json=payload)
                
                # 🌟 수정됨: 에러 상태코드(4xx, 5xx)여도 JSON 응답이면 그대로 파싱해서 리턴!
                if not response.is_success:
                    try:
                        return response.json() # AI의 에러 메세지를 살림
                    except:
                        response.raise_for_status() # JSON이 아니면 그냥 예외 발생
                
                return response.json()
            except httpx.HTTPError as exc:
                logger.error(f"AI 서비스 통신 오류 (URL: {url}): {exc}")
                return None

# 싱글톤 인스턴스 생성
ai_client = AIClient()
