# ⛳ KLPGA 소속선수 브리핑

삼천리그룹 소속 KLPGA 선수들의 주간 경기 결과를 자동 요약하는 웹앱입니다.

---

## 배포 방법 (GitHub + Vercel)

### 1단계. GitHub 레포 생성 및 업로드

```bash
# 이 폴더에서 실행
git init
git add .
git commit -m "init: KLPGA briefing app"

# GitHub에서 새 레포 만들고 (예: klpga-briefing)
git remote add origin https://github.com/YOUR_USERNAME/klpga-briefing.git
git push -u origin main
```

### 2단계. Vercel 배포

1. [vercel.com](https://vercel.com) 접속 → GitHub으로 로그인
2. **Add New Project** → `klpga-briefing` 레포 선택
3. **Deploy** 클릭 (설정 변경 없이 바로)

### 3단계. API 키 환경변수 설정 (중요!)

Vercel 대시보드 → 프로젝트 → **Settings** → **Environment Variables**

| Name | Value |
|------|-------|
| `ANTHROPIC_API_KEY` | `sk-ant-...` (Anthropic Console에서 복사) |

추가 후 **Redeploy** 한 번 해주면 완료.

---

## 사용법

1. 소속 선수 이름 입력 후 **+ 추가** (여러 명 가능)
2. 조회할 날짜 선택 (주로 토요일)
3. **결과 가져오기** 클릭
4. 생성된 카카오톡 텍스트 **복사 → 단톡방 붙여넣기**

---

## 파일 구조

```
klpga-briefing/
├── index.html        # 프론트엔드
├── api/
│   └── search.js     # Vercel 서버리스 함수 (Anthropic API 호출)
├── vercel.json       # Vercel 설정
├── package.json
└── .gitignore
```
