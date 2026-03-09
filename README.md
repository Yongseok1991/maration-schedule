# Maraton

마라톤 일정을 자동 수집해서 GitHub Pages로 보여주는 PWA 프로젝트입니다.

## Stack

- Frontend: Vite + React + Tailwind CSS
- Scraper: Node.js + axios + cheerio + iconv-lite
- Deploy: GitHub Pages + GitHub Actions

## Local run

```bash
npm install
npm run scrape
npm run dev
```

## Data file

- 수집 결과: `public/data/races.json`
- 사이트: `http://www.roadrun.co.kr/schedule/list.php`

## Workflows

- `deploy-pages.yml`: `main` push 시 Pages 배포
- `scrape-data.yml`: 하루 3회 자동 수집(UTC 00:00, 08:00, 16:00 / KST 09:00, 17:00, 01:00) + JSON 커밋

## Notes

- 원본 사이트는 `euc-kr` 인코딩이므로 `iconv-lite` 디코딩이 필요합니다.
- 상세 페이지 구조가 바뀌면 `scripts/scrape.js` 라벨 매핑을 조정해야 합니다.
