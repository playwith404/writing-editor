export type GlossaryTerm = {
  id: string
  term: string
  summary: string
  definition: string
  origin: string
  example: string
  related: string[]
  category: string
  updatedAt: string
}

export const glossaryTerms: GlossaryTerm[] = [
  {
    id: "bap-jwi",
    term: "밥 쥐",
    summary: "밥을 달라는 뜻으로 쓰는 일상 신호어.",
    definition: "식사를 요청하거나 식사 시간이 되었음을 알릴 때 쓰는 표현이다.",
    origin: "초기 공동체 시절, 짧고 명확한 전달을 위해 만들어졌다.",
    example: "“밥 쥐!”라고 외치면 주방에서 배식을 시작한다.",
    related: ["맘마 쥐", "식량 규약"],
    category: "생활 용어",
    updatedAt: "2분 전",
  },
  {
    id: "mamma-jwi",
    term: "맘마 쥐",
    summary: "배고픔의 정도를 강조하는 표현.",
    definition: "즉시 식사가 필요하다는 긴급 신호로 사용된다.",
    origin: "어린 구성원 중심의 구어 표현에서 시작해 공식 용어로 정착했다.",
    example: "전투 직후 “맘마 쥐” 신호가 나오면 우선 보급을 진행한다.",
    related: ["밥 쥐", "긴급 보급"],
    category: "생활 용어",
    updatedAt: "7분 전",
  },
  {
    id: "myeonryang-cheongin",
    term: "면량 청인",
    summary: "작중 핵심 기업 집단을 지칭하는 용어.",
    definition: "도시의 외곽 관리와 대형 시설 유지보수를 독점한 세력이다.",
    origin: "초기 행정조직의 이름이 민영화 이후 기업명으로 남았다.",
    example: "마길초는 면량 청인의 외벽 관리팀에 배치됐다.",
    related: ["고층 외벽조", "작업 규약 12조"],
    category: "조직 용어",
    updatedAt: "18분 전",
  },
  {
    id: "yucheon-maek",
    term: "유천 맥",
    summary: "마력 흐름의 방향을 뜻하는 세계관 기술 용어.",
    definition: "지역마다 다른 마력 순환축을 수치화한 지도 체계다.",
    origin: "고대 마도학자들의 지층 연구에서 파생되었다.",
    example: "유천 맥이 붕괴한 지역은 주문 성공률이 급감한다.",
    related: ["마력 포화", "봉인층"],
    category: "마법 용어",
    updatedAt: "31분 전",
  },
]
