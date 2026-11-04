# INTERLINK Beta Dashboard

Akkadia 베타 행동 로그(KST 2026-10-12 18:39 → 10-22 15:51)로 만든 대시보드입니다.
**누가(유저 유형), 어떤 블록을, 어느 월드에서** 쓰는지 보여 줍니다.

## 폴더 구조

| 경로 | 언어 | 내용 |
|---|---|---|
| `index.html` | HTML | 화면 구조 (섹션, 카드, 차트 자리) |
| `css/style.css` | CSS | 디자인 (색, 글꼴, 레이아웃, 다크 모드) |
| `js/app.js` | JavaScript | 차트 그리기, 유형 필터, 클릭하면 열리는 표 |
| `data/data.js` | JavaScript (데이터) | 대시보드가 읽는 데이터 `const DATA = {...}` |
| `data/interlink_data.json` | JSON | 같은 데이터의 JSON 버전 (다른 도구에서 쓸 때) |
| `scripts/agg_interlink.py` | Python | 원본 로그(Archive 1–4.zip)를 읽어 중복 제거 후 집계 → `interlink.pkl` |
| `scripts/build_interlink.py` | Python | 집계 결과로 유형 분류·차트 데이터 생성 → `interlink_data.json` |
| `scripts/excel_part.py` | Python | 같은 숫자로 엑셀 파일 생성 (`build_interlink.py` 뒤에 붙여 실행) |
| `scripts/make_web_data.py` | Python | `interlink_data.json` → `data/data.js` |

- 차트 라이브러리: ECharts 5.5.0 (CDN)
- 디자인을 바꿀 때는 보통 `css/style.css`만, 화면 배치를 바꿀 때는 `index.html`을 고치면 됩니다.

## 실행 방법

- 가장 간단하게: `index.html`을 브라우저로 열기 (인터넷 연결 필요, ECharts·글꼴을 CDN에서 받음)
- 로컬 서버: `python -m http.server` 후 http://localhost:8000
- GitHub Pages: 저장소 Settings → Pages → 브랜치 선택 → 루트(`/`) 폴더

## 데이터 다시 만들기 (선택)

원본 로그는 용량이 커서 저장소에 넣지 않습니다(`.gitignore`).

```bash
python scripts/agg_interlink.py <Archive zip이 있는 폴더> interlink.pkl
cat scripts/build_interlink.py scripts/excel_part.py > build_all.py && python build_all.py   # interlink.pkl, akkadia-items, akkadia-blocks 가 있는 폴더에서
python scripts/make_web_data.py interlink_data.json
```

## 유형 기준

```
활동 시간(분) < 30                               → 잠깐 들른 사람
블록 수정/분 < 0.2  그리고  처치/분 < 0.1        → 탐험가 (허브 체류형)
그 외: 건축 점수 = (놓은 블록 + 캔 블록) ÷ 분 ÷ 3
       전투 점수 = 몬스터 처치 ÷ 분 ÷ 0.6
       건축 점수 ≥ 전투 점수 → 건축가, 아니면 전투가
```

## 데이터 주의

- 플레이어는 P001–P140 별칭만 들어 있고, 원래 계정 ID는 없습니다.
- 관리자·테스트 계정은 로그로 구분할 수 없어 포함되어 있습니다.
