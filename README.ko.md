<p align="center">
  <img src="assets/icons/logo.png" alt="OpenWorship" width="80">
</p>

<h1 align="center">OpenWorship</h1>

<p align="center">
  <strong>교회를 위한 무료 오픈소스 예배 프레젠테이션 소프트웨어</strong>
</p>

<p align="center">
  <a href="https://github.com/jaycho1214/openworship/releases/"><img src="https://img.shields.io/github/v/release/jaycho1214/openworship?style=flat-square&color=4a90a4" alt="Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-4a90a4?style=flat-square" alt="License"></a>
  <img src="https://img.shields.io/badge/platform-macOS%20·%20Windows%20·%20Linux-4a90a4?style=flat-square" alt="Platform">
</p>

<p align="center">
  <a href="./README.md">English</a>
</p>

<br>

> **후원** — OpenWorship은 무료 오픈소스입니다. 사역에 도움이 되셨다면, 지속적인 개발을 후원해 주세요.
>
> <a href="https://github.com/sponsors/jaycho1214"><img src="https://img.shields.io/badge/GitHub%20Sponsors-ea4aaa?style=for-the-badge&logo=githubsponsors&logoColor=white" alt="GitHub Sponsors"></a>&nbsp;<a href="https://buymeacoffee.com/jaycho1214"><img src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-FFDD00?style=for-the-badge&logo=buymeacoffee&logoColor=black" alt="Buy Me a Coffee"></a>

<br>

<p align="center">
  <img src="assets/preview.png" alt="OpenWorship 미리보기" width="100%">
</p>

<p align="center">
  <a href="https://github.com/jaycho1214/openworship/releases/">
    <img src="https://img.shields.io/badge/다운로드-최신%20버전-4a90a4?style=for-the-badge" alt="다운로드">
  </a>
</p>

<br>

## 주요 기능

|                            |                                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------ |
| **듀얼 윈도우 시스템**     | 노트북에서 조작하면서 프로젝터에 송출합니다. 실시간 미리보기로 성도들이 보는 화면을 정확히 확인하세요. |
| **찬양 & 스마트 라이브러리** | 영구적인 찬양 컬렉션을 구축하세요. 검색하고, 정리하고, 세션에 드래그하여 즉시 추가하세요.            |
| **성경 말씀**              | 내장 번역본(KJV, ASV 등)으로 성경 구절을 표시합니다. 책, 장, 절로 검색하세요.                         |
| **공지 & 알림**            | 공지사항, 예배 순서, 자유 텍스트를 슬라이드 또는 오버레이 배너로 표시합니다.                           |
| **OCR 가져오기**           | AI를 사용하여 이미지와 PDF에서 가사를 자동 추출합니다. 더 이상 악보를 보고 타이핑할 필요가 없습니다.   |
| **비디오 & 이미지 배경**   | 아름다운 모션 배경과 커스텀 이미지. 가독성을 위한 배경 어둡기 조절.                                    |
| **커스텀 프레임**          | 슬라이드에 장식 테두리를 추가하세요 — 이미지 기반(9-slice) 또는 CSS 스타일(둥글기, 그림자, 색상).      |
| **광고**                   | 텍스트 또는 이미지 광고를 전체 화면 슬라이드나 배너 오버레이로 자동 순환 표시합니다.                   |
| **가져오기 / 내보내기**    | 곡, 세션, 전체 라이브러리를 `.oworship` 파일로 공유. 중복 충돌 자동 처리.                              |
| **커스텀 타이포그래피**    | 원하는 폰트를 가져오세요. 크기, 색상, 그림자, 외곽선, 콘텐츠별 스타일을 세밀하게 조절하세요.          |
| **슬라이드 애니메이션**    | 슬라이드 간 부드러운 전환 — 페이드, 위로 슬라이드, 왼쪽으로 슬라이드.                                 |
| **키보드 단축키**          | 완전한 키보드 조작 — 슬라이드 이동, 섹션 점프, 검은 화면, 실행 취소/다시 실행 등.                     |
| **다국어**                 | 한국어와 영어 인터페이스를 완벽 지원합니다.                                                           |

<br>

## 빠른 시작

```
1. 세션 만들기        →  예배용 셋리스트
2. 콘텐츠 추가        →  곡, 성경 구절, 공지사항
3. 송출 화면 열기     →  프로젝터/스크린에 표시
4. 방향키 사용        →  슬라이드 이동
```

<br>

## 설치

| 플랫폼  | 파일        |
| ------- | ----------- |
| macOS   | `.dmg`      |
| Windows | `.exe`      |
| Linux   | `.AppImage` |

<p>
  <a href="https://github.com/jaycho1214/openworship/releases/">
    <img src="https://img.shields.io/badge/다운로드-최신%20버전-4a90a4?style=for-the-badge" alt="다운로드">
  </a>
</p>

<details>
<summary>소스에서 빌드</summary>

<br>

```bash
git clone https://github.com/jaycho1214/openworship.git
cd openworship
npm install
npm start
```

</details>

<br>

## 사용 가이드

### 세션

**세션**은 예배 셋리스트입니다. 각 예배마다 하나씩 만드세요.

| 동작           | 방법                        |
| -------------- | --------------------------- |
| 세션 만들기    | 헤더에서 **"새 세션"** 클릭 |
| 세션 전환      | 헤더의 드롭다운 사용        |
| 세션 이름 변경 | 세션 이름 우클릭            |
| 세션 삭제      | 우클릭 → 삭제               |

세션은 자동으로 저장됩니다.

### 콘텐츠 추가하기

**"+ 추가"**를 클릭하여 세션에 콘텐츠를 삽입하세요. 세 가지 콘텐츠 유형을 지원합니다:

**곡**

1. 제목과 가사를 입력하세요 (또는 라이브러리에서 검색)
2. 빈 줄로 슬라이드를 구분합니다:

```
첫 번째 절 첫째 줄
첫 번째 절 둘째 줄

두 번째 절 첫째 줄
두 번째 절 둘째 줄
```

3. `[Verse]`, `[Chorus]`, `[Bridge]` 같은 섹션 마커를 사용하면 예배 중 빠르게 이동할 수 있습니다

**성경 구절**

1. 번역본 선택 (KJV, ASV, BBE 등 다운로드 가능)
2. 책, 장, 절 범위 선택
3. 표시 모드 선택 — 절마다 한 슬라이드 또는 전체 범위를 한 슬라이드에

**공지 / 알림**

1. 공지사항, 예배 순서, 낭독 등 자유 텍스트 입력
2. 전체 슬라이드 또는 오버레이 배너(상단/하단)로 표시 선택

**라이브러리에서**

- 라이브러리 사이드바 열기 (왼쪽 가장자리)
- 곡 검색
- 세션으로 드래그

**OCR 가져오기**

1. **"+ 추가"** → **"이미지 가져오기"** 클릭
2. 이미지나 PDF를 드래그 — AI가 가사 추출
3. 검토, 편집, 저장

> 설정 → API에서 OpenAI API 키 필요

**파일에서 가져오기**

1. **"+ 추가"** → **"가져오기"** 클릭
2. `.oworship` 파일 선택
3. 내용 미리보기 후 중복 처리 방법 선택 (건너뛰기, 덮어쓰기, 사본 생성)

### 키보드 조작

| 키                     | 동작                        |
| ---------------------- | --------------------------- |
| `Space` 또는 `→`       | 다음 슬라이드               |
| `←`                    | 이전 슬라이드               |
| `↓`                    | 다음 곡 / 항목              |
| `↑`                    | 이전 곡 / 항목              |
| `Tab`                  | 다음 섹션                   |
| `Shift+Tab`            | 이전 섹션                   |
| `Home`                 | 첫 슬라이드                 |
| `End`                  | 마지막 슬라이드             |
| `1` – `9`              | 섹션(또는 슬라이드)으로 점프 |
| `B`                    | 검은 화면 토글              |
| `V`                    | 절 표시 토글                |
| `.` 또는 `Esc`         | 검은 화면 토글              |
| `Cmd/Ctrl+Z`           | 실행 취소                   |
| `Cmd/Ctrl+Shift+Z`     | 다시 실행                   |

### 커스터마이징

**폰트** — 설정 → 외관. `.ttf` `.otf` `.woff` `.woff2` 지원

**비디오 & 이미지 배경** — 설정 → 디스플레이. 비디오(`.mp4` `.webm` `.mov`)와 이미지(`.png` `.jpg` `.gif` `.webp`). 배경 어둡기 조절 가능.

**텍스트 스타일링** — 콘텐츠 유형별 폰트 크기, 색상, 그림자, 외곽선, 정렬, 패딩, 줄 간격 설정. 성경 구절은 별도의 참조 텍스트 스타일링 지원.

**프레임** — 설정 → 프레임. 9-slice 이미지 또는 CSS 스타일(테두리, 둥글기, 그림자, 배경)로 장식 테두리 추가. 콘텐츠 유형별 다른 프레임 지정 가능.

**슬라이드 애니메이션** — 설정 → 디스플레이. 없음, 페이드, 위로 슬라이드, 왼쪽으로 슬라이드 중 선택.

**테마** — 설정 → 외관. 라이트, 다크, 시스템 테마.

<br>

## 팁

<details>
<summary>주일 준비하기</summary>

<br>

1. 주중에 미리 세션 만들기
2. 예배 순서대로 곡, 성경 봉독, 공지사항 추가
3. 슬라이드 구분 확인
4. 실제 디스플레이에서 테스트
5. 예배 전에 준비 완료

</details>

<details>
<summary>최적의 슬라이드</summary>

<br>

- 슬라이드당 2-4줄
- 자연스러운 노래 구절에 맞추기
- 한 줄 슬라이드 피하기 (너무 빠름)
- 6줄 이상 피하기 (너무 빽빽함)
- 섹션 마커(`[Verse]`, `[Chorus]`)를 사용하면 예배 중 빠르게 이동 가능

</details>

<details>
<summary>다중 모니터 설정</summary>

<br>

1. 프로젝터를 확장 디스플레이로 연결
2. 메인 모니터에서 OpenWorship 열기
3. "송출 열기" 클릭
4. 송출이 보조 디스플레이로 이동
5. 메인에서 조작, 프로젝터에 표시

</details>

<details>
<summary>콘텐츠 공유하기</summary>

<br>

- 개별 곡, 전체 세션, 전체 라이브러리를 `.oworship` 파일로 내보내기
- 다른 예배팀과 공유하거나 컬렉션 백업
- 가져오기 시 중복 처리 — 건너뛰기, 덮어쓰기, 사본 생성

</details>

<br>

## 개발

| 명령어            | 설명           |
| ----------------- | -------------- |
| `npm start`       | 개발 모드      |
| `npm run build`   | 프로덕션 빌드  |
| `npm run package` | 설치 파일 생성 |
| `npm run lint`    | 코드 검사      |
| `npm test`        | 테스트 실행    |

<details>
<summary>아키텍처</summary>

<br>

```
src/
├── main/              # Electron 메인 프로세스
│   ├── ipc/           # IPC 핸들러 (곡, 세션, 성경, 프레임 등)
│   └── services/      # 데이터베이스, 미디어, 내보내기, 성경, 광고
├── renderer/
│   ├── control/       # 컨트롤 윈도우 (에디터, 라이브러리, 설정)
│   ├── projection/    # 송출 윈도우 (전체 화면 가사 표시)
│   └── shared/        # i18n, 유틸리티, 공용 컴포넌트
└── shared/            # 프로세스 간 공유 TypeScript 타입
```

**기술 스택** — Electron 35 · React 19 · TypeScript 5.8 · Tailwind CSS 4 · shadcn/ui · better-sqlite3 · OpenAI API

</details>

<br>

## 기여하기

기여를 환영합니다! 포크하고, 기능 브랜치를 만들고, Pull Request를 제출해 주세요.

## 라이선스

MIT 라이선스 — 교회나 사역에서 자유롭게 사용하세요.

<br>

---

<p align="center">
  <em>"호흡이 있는 자마다 여호와를 찬양할지어다"</em><br>
  <strong>시편 150:6</strong>
</p>

<p align="center">
  <sub>전 세계 교회를 위해 믿음으로 만들었습니다</sub>
</p>
