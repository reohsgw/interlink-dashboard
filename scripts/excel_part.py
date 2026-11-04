
# ---------- Excel workbook (same numbers as the dashboard) ----------
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.chart import BarChart, LineChart, Reference

KO = {'Builder': '건축가', 'Fighter': '전투가', 'Explorer': '탐험가', 'Short visit': '잠깐 들른 사람'}
KINDS = ['Hub', 'Personal world', 'Dungeon', 'Mars', 'Library', 'Other']
KIND_KO = {'Hub': '허브', 'Personal world': '개인 월드', 'Dungeon': '던전', 'Mars': '화성(mars)', 'Library': '도서관(library)', 'Other': '기타'}
HEAD = PatternFill('solid', fgColor='1F3A5F'); HFONT = Font(bold=True, color='FFFFFF')
NOTE = Font(italic=True, color='666666'); TITLE = Font(bold=True, size=14)
thin = Side(style='thin', color='D0D7E2')

wb = Workbook()

def sheet(name, title, note, header, rows, widths=None, fmt=None, first=False):
    ws = wb.active if first else wb.create_sheet()
    ws.title = name
    ws['A1'] = title; ws['A1'].font = TITLE
    ws['A2'] = note; ws['A2'].font = NOTE
    r0 = 4
    for j, h in enumerate(header, 1):
        c = ws.cell(r0, j, h); c.fill = HEAD; c.font = HFONT; c.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
    for i, row in enumerate(rows, r0 + 1):
        for j, v in enumerate(row, 1):
            c = ws.cell(i, j, v); c.border = Border(bottom=thin)
            if fmt and j - 1 < len(fmt) and fmt[j - 1]: c.number_format = fmt[j - 1]
    ws.freeze_panes = ws.cell(r0 + 1, 2)
    if rows: ws.auto_filter.ref = f'A{r0}:{get_column_letter(len(header))}{r0 + len(rows)}'
    ws.row_dimensions[r0].height = 32
    for j in range(1, len(header) + 1):
        ws.column_dimensions[get_column_letter(j)].width = (widths[j - 1] if widths else 14)
    return ws, r0

dates = [(D0 + datetime.timedelta(days=i)) for i in range(11)]
dlabel = [f'{x.month}/{x.day}' for x in dates]
byType = {t: [p for p in P if p['type'] == t] for t in TYPES}
tot_min = sum(p['minutes'] for p in P)

# 1. summary
ws = wb.active; ws.title = '요약'
ws['A1'] = 'INTERLINK · Akkadia 베타 로그 분석'; ws['A1'].font = Font(bold=True, size=16)
ws['A2'] = '베타 데이터만 사용 (알파 7월 로그는 쓰지 않음). 대시보드와 같은 숫자입니다.'; ws['A2'].font = NOTE
info = [
    ('기간 (KST)', f"{out['meta']['start']} → {out['meta']['end']}  (하루 전체가 있는 날: 10/13–10/21)"),
    ('원본 파일', 'Archive.zip, Archive 2.zip, Archive 3.zip, Archive 4.zip (telemetry*.zip 3개는 10/12–10/14 일부만 담긴 이전 사본이라 쓰지 않음)'),
    ('원본 행 수', out['meta']['rows']),
    ('제거한 중복 행', out['meta']['dups']),
    ('분석에 쓴 행 수', out['meta']['rows'] - out['meta']['dups']),
    ('플레이어 수', len(P)),
    ('개인 월드 / 던전 수', f"{out['meta']['personal']} / {out['meta']['dungeons']}"),
    ('손으로 놓은 블록', out['meta']['placed']),
    ('퀘스트 분석 시작', out['meta']['qstart'] + ' (그 전 퀘스트 행은 내용이 비어 있음)'),
]
for i, (k, v) in enumerate(info, 4):
    ws.cell(i, 1, k).font = Font(bold=True); c = ws.cell(i, 2, v)
    if isinstance(v, int): c.number_format = '#,##0'; c.alignment = Alignment(horizontal='left')
r = 4 + len(info) + 1
ws.cell(r, 1, '유형별 인원').font = Font(bold=True, size=12); r += 1
for j, h in enumerate(['유형', '인원', '비율', '플레이 시간(분)', '시간 비율'], 1):
    c = ws.cell(r, j, h); c.fill = HEAD; c.font = HFONT
for t in TYPES:
    r += 1; g = byType[t]; m = sum(p['minutes'] for p in g)
    for j, (v, f) in enumerate([(KO[t], None), (len(g), '#,##0'), (len(g) / len(P), '0%'), (m, '#,##0'), (m / tot_min, '0%')], 1):
        c = ws.cell(r, j, v)
        if f: c.number_format = f
r += 2
ws.cell(r, 1, '시트 안내').font = Font(bold=True, size=12)
guide = [('날짜별', '날짜마다 원본 행, 중복, 접속자 수(유형별)'), ('유형 요약', '유형마다 평균 플레이 시간, 블록, 공격, 퀘스트'),
         ('유형×월드', '유형이 어느 월드 종류에서 시간을 보냈는지 (Sankey와 같은 숫자)'), ('블록 Top10', '유형마다 많이 놓은 블록'),
         ('퀘스트', '유형별 퀘스트 완료율과 종류'), ('월드', '월드마다 방문자와 플레이 시간'), ('플레이어', '플레이어 140명 한 줄씩 전체 기록'),
         ('정의', '각 숫자를 어떻게 만들었는지')]
for k, v in guide:
    r += 1; ws.cell(r, 1, k).font = Font(bold=True, color='1F3A5F'); ws.cell(r, 2, v)
ws.column_dimensions['A'].width = 22; ws.column_dimensions['B'].width = 26
for col in 'CDE': ws.column_dimensions[col].width = 16

# 2. daily
dayrows = {dn: (rw, dp) for dn, rw, dp in d['DAYS']}
rows = []
for i, x in enumerate(dates):
    key = x.strftime('%Y_%m_%d'); rw, dp = dayrows.get(key, (0, 0))
    by = [daily[k][i] for k in range(len(TYPES))]
    rows.append([dlabel[i] + (' (일부)' if i in (0, 10) else ''), rw, dp, rw - dp, sum(by)] + by)
ws, r0 = sheet('날짜별', '날짜별 데이터와 접속자', '접속자 = 그날 이벤트를 한 번이라도 보낸 플레이어 수. 10/12와 10/22는 하루 전체가 아님. 중복은 10/15–10/16에만 있음.',
               ['날짜', '원본 행', '중복 행', '분석 행', '접속자'] + [KO[t] for t in TYPES], rows,
               [12, 14, 11, 14, 10, 10, 10, 10, 14], [None, '#,##0', '#,##0', '#,##0', '#,##0', '0', '0', '0', '0'])
ch = BarChart(); ch.type = 'col'; ch.grouping = 'stacked'; ch.overlap = 100; ch.title = '날짜별 접속자 (유형별)'; ch.height = 8; ch.width = 20
ch.add_data(Reference(ws, min_col=6, max_col=9, min_row=r0, max_row=r0 + len(rows)), titles_from_data=True)
ch.set_categories(Reference(ws, min_col=1, min_row=r0 + 1, max_row=r0 + len(rows)))
ws.add_chart(ch, f'A{r0 + len(rows) + 3}')

# 3. type summary
qa_by = {t: [p for p in byType[t] if p['questActive']] for t in TYPES}
rows = []
for t in TYPES:
    g = byType[t]; n = len(g); qa = qa_by[t]; done = [p for p in qa if p['quests'] > 0]
    rows.append([KO[t], n, sum(p['minutes'] for p in g) / n, sum(p['days'] for p in g) / n, sum(p['zones'] for p in g) / n,
                 sum(p['placed'] for p in g) / n, sum(p['dug'] for p in g) / n, sum(p['attacks'] for p in g) / n,
                 sum(p['kills'] for p in g) / n, sum(p['crafts'] for p in g) / n, len(done) / len(qa) if qa else 0])
ws, r0 = sheet('유형 요약', '유형별 1인 평균', '모든 값은 그 유형 1명당 평균. 퀘스트 완료율 = 10/15 이후 접속한 사람 중 퀘스트를 1개 이상 완료한 비율.',
               ['유형', '인원', '플레이 시간(분)', '접속 일수', '다닌 구역', '놓은 블록', '캔 블록', '공격', '처치', '제작', '퀘스트 완료율'], rows,
               [16, 8, 14, 11, 11, 11, 11, 11, 10, 10, 13], [None, '0', '#,##0', '0.0', '#,##0', '#,##0', '#,##0', '#,##0', '#,##0', '#,##0', '0%'])
ch = BarChart(); ch.type = 'bar'; ch.title = '1인 평균 플레이 시간(분)'; ch.height = 7; ch.width = 16; ch.legend = None
ch.add_data(Reference(ws, min_col=3, min_row=r0, max_row=r0 + 4), titles_from_data=True)
ch.set_categories(Reference(ws, min_col=1, min_row=r0 + 1, max_row=r0 + 4))
ws.add_chart(ch, f'A{r0 + 8}')

# 4. type x world kind
rows = []
for t in TYPES:
    vals = [sank.get((t, k), 0) for k in KINDS]; s = sum(vals)
    rows.append([KO[t]] + vals + [s] + [v / s if s else 0 for v in vals])
ws, r0 = sheet('유형×월드', '유형 → 월드 종류 (플레이 시간, 분)', '대시보드 Sankey와 같은 숫자. 오른쪽 % 칸은 그 유형의 전체 시간 중 각 월드 종류의 비율.',
               ['유형'] + [KIND_KO[k] for k in KINDS] + ['합계'] + [KIND_KO[k] + ' %' for k in KINDS], rows,
               [16] + [12] * 6 + [12] + [12] * 6, [None] + ['#,##0'] * 7 + ['0%'] * 6)

# 5. blocks
rows = []
for t in TYPES:
    bt_tot = btop[t]['total']
    for i, (b, c) in enumerate(btop[t]['top'], 1):
        rows.append([KO[t], i, blocks[b]['name'], b, c, c / bt_tot if bt_tot else 0])
ws, r0 = sheet('블록 Top10', '유형마다 많이 놓은 블록 Top 10', '% = 그 유형이 손으로 놓은 블록 전체 중 비율. 베타에는 설계도(blueprint) 배치 기록이 없음.',
               ['유형', '순위', '블록 이름', '블록 ID', '놓은 수', '비율'], rows, [16, 7, 24, 10, 11, 9], [None, '0', None, '0', '#,##0', '0.0%'])
r = r0 + len(rows) + 2
for j, h in enumerate(['유형', '블록을 놓은 사람', '1인 평균 블록 종류', '놓은 블록 합계'], 1):
    c = ws.cell(r, j, h); c.fill = HEAD; c.font = HFONT
for t in TYPES:
    r += 1
    for j, v in enumerate([KO[t], btop[t]['placers'], btop[t]['distinct'], btop[t]['total']], 1): ws.cell(r, j, v).number_format = '#,##0.#' if j == 3 else '#,##0'

# 6. quests
GL = list(GROUP.values())
rows = []
for t in TYPES:
    qa = qa_by[t]; done = [p for p in qa if p['quests'] > 0]; nq = sum(p['quests'] for p in done)
    rows.append([KO[t], len(qa), len(done), len(done) / len(qa) if qa else 0, nq / len(done) if done else 0] + [qgt[t].get(g, 0) for g in GL])
ws, r0 = sheet('퀘스트', '유형별 퀘스트 참여 (10/15 18:06부터)', '퀘스트 묶음 이름은 퀘스트 ID 머리글자로 추정한 것(예: journey_r_… = 채집). 회사 퀘스트 표로 확인 필요.',
               ['유형', '10/15 이후 접속', '1개 이상 완료', '완료율', '완료자 1인 평균 완료 수'] + GL, rows,
               [16, 13, 13, 9, 14] + [12] * len(GL), [None, '0', '0', '0%', '0.0'] + ['#,##0'] * len(GL))

# 7. worlds
wp = collections.defaultdict(set)
for (a, w) in M: wp[w].add(a)
rows = [[w.split(':', 1)[1], KIND_KO[kind(w)], len(wp[w]), wmin[w]] for w in sorted(wmin, key=lambda w: -wmin[w]) if not w.startswith('dungeon:')]
dung = [w for w in wmin if w.startswith('dungeon:')]
rows.append(['던전 전체 (' + str(len(dung)) + '회 입장)', KIND_KO['Dungeon'], len({a for w in dung for a in wp[w]}), sum(wmin[w] for w in dung)])
ws, r0 = sheet('월드', '월드별 방문자와 플레이 시간', '개인 월드 이름은 베타에서 personal-world-N으로 익명화됨. 던전은 입장마다 새 월드라 한 줄로 합침.',
               ['월드', '종류', '방문자', '플레이 시간(분)'], rows, [34, 16, 10, 16], [None, None, '#,##0', '#,##0'])

# 8. players
rows = []
for p in P:
    k = p['kinds']
    rows.append([p['id'], KO[p['type']], p['minutes'], p['days'], p['zones'], p['placed'], p['dug'], p['attacks'], p['kills'], p['crafts'], p['deaths'],
                 p['quests'], '예' if p['questActive'] else '아니오'] + [k.get(x, 0) for x in KINDS])
sheet('플레이어', '플레이어별 기록 (140명)', 'P001–P140은 플레이 시간 순으로 붙인 익명 번호. 관리자 계정은 베타 로그로 구분할 수 없어 포함되어 있음.',
      ['플레이어', '유형', '플레이 시간(분)', '접속 일수', '다닌 구역', '놓은 블록', '캔 블록', '공격', '처치', '제작', '사망', '완료 퀘스트', '10/15 이후 접속']
      + [KIND_KO[x] + '(분)' for x in KINDS], rows,
      [10, 14, 13, 10, 10, 10, 10, 10, 9, 9, 9, 11, 12] + [12] * 6, [None, None] + ['#,##0'] * 10 + [None] + ['#,##0'] * 6)

# 9. definitions
defs = [('플레이 시간', '플레이어가 그 월드에서 이벤트를 보낸 서로 다른 분(minute)의 수'),
        ('잠깐 들른 사람', '전체 플레이 시간 30분 미만'),
        ('건축가 / 전투가 / 탐험가', '30분 이상인 사람 중: 블록 수정(놓은+캔 블록)이 1분에 0.2개 미만이고 처치가 1분에 0.1회 미만이면 탐험가(허브 체류형). 그 외에는 건축 점수 = (놓은+캔 블록) ÷ 분 ÷ 3, 전투 점수 = 몬스터 처치 ÷ 분 ÷ 0.6 을 비교해 건축 점수 ≥ 전투 점수이면 건축가, 아니면 전투가'),
        ('다닌 구역', 'move 좌표를 16×16 블록 칸으로 나눈 (월드, 칸)의 개수'),
        ('놓은 블록', 'client block_place 이벤트'),
        ('캔 블록', '서버 block_change_resolved 중 승인되고 blockPacked=0(블록 제거)인 것'),
        ('퀘스트 완료', 'worker quest_changed 중 completed=true인 (questId, 기간)의 수'),
        ('중복 제거', '같은 eventId가 두 번 나오면 한 번만 셈. 이동(move)을 포함한 모든 이벤트에 적용. 중복은 Archive 2.zip의 10/15–10/16에만 있었음'),
        ('제외한 데이터', '알파(7월) 로그와 telemetry*.zip 3개. 블록 이름과 그림은 아이템 카탈로그(akkadia-items, akkadia-blocks)에서 가져옴')]
sheet('정의', '숫자를 만든 방법', '', ['항목', '설명'], defs, [26, 110])

wb.save('interlink-beta-analysis.xlsx')
print('xlsx saved')
