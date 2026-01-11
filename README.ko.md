<p align="center">
  <img src="assets/icons/logo.png" alt="OpenWorship" width="120">
</p>

<h1 align="center">OpenWorship</h1>

<p align="center">
  <strong>교회를 위한 무료 오픈소스 예배 프레젠테이션 소프트웨어</strong>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/Platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey.svg" alt="Platform">
  <a href="https://electronjs.org"><img src="https://img.shields.io/badge/Electron-35-47848F.svg?logo=electron&logoColor=white" alt="Electron"></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/React-19-61DAFB.svg?logo=react&logoColor=white" alt="React"></a>
</p>

<p align="center">
  <em>예배 중 찬양 가사를 아름답게 송출하세요.</em><br>
  <em>심플하고 강력한 교회 전용 프로그램입니다.</em>
</p>

<p align="center">
  <a href="./README.md">English Documentation</a>
</p>

<br>

---

<br>

## 프로젝트 후원

OpenWorship은 전 세계 교회를 위해 사랑으로 만들어진 무료 오픈소스 소프트웨어입니다. 이 소프트웨어가 사역에 도움이 되셨다면, 지속적인 개발을 후원해 주세요.

<p>
  <a href="https://github.com/sponsors/jaycho1214">
    <img src="https://img.shields.io/badge/GitHub%20Sponsors-후원하기-ea4aaa?style=for-the-badge&logo=githubsponsors&logoColor=white" alt="GitHub Sponsors">
  </a>
  &nbsp;
  <a href="https://buymeacoffee.com/jaycho1214">
    <img src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-후원하기-FFDD00?style=for-the-badge&logo=buymeacoffee&logoColor=black" alt="Buy Me a Coffee">
  </a>
</p>

후원은 다음에 사용됩니다:
- 지속적인 개발과 새로운 기능
- 버그 수정 및 유지보수
- 더 많은 언어와 플랫폼 지원

<br>

---

<br>

## 주요 기능

<table>
<tr>
<td width="50%">

**듀얼 윈도우 시스템**

노트북에서 조작하면서 프로젝터에 송출합니다. 실시간 미리보기로 성도들이 보는 화면을 정확히 확인하세요.

</td>
<td width="50%">

**스마트 라이브러리**

영구적인 찬양 컬렉션을 구축하세요. 검색하고, 정리하고, 세션에 드래그하여 즉시 추가하세요.

</td>
</tr>
<tr>
<td width="50%">

**OCR 가져오기**

AI를 사용하여 이미지와 PDF에서 가사를 자동 추출합니다. 더 이상 악보를 보고 타이핑할 필요가 없습니다.

</td>
<td width="50%">

**비디오 배경**

아름다운 모션 배경이 기본 제공됩니다. 직접 비디오를 추가하여 전문적인 예배 분위기를 연출하세요.

</td>
</tr>
<tr>
<td width="50%">

**커스텀 타이포그래피**

원하는 폰트를 가져오세요. 크기, 굵기, 그림자, 위치를 세밀하게 조절하여 교회 스타일에 맞추세요.

</td>
<td width="50%">

**키보드 단축키**

방향키로 이동, B키로 검은 화면, 마우스 없이 모든 것을 조작하세요.

</td>
</tr>
</table>

<br>

---

<br>

## 빠른 시작

```
1. 세션 만들기        →  예배용 셋리스트
2. 곡 추가하기        →  라이브러리, 직접 입력, OCR 가져오기
3. 송출 화면 열기     →  프로젝터/스크린에 표시
4. 방향키 사용        →  슬라이드 이동
```

이게 전부입니다. 바로 송출하세요.

<br>

---

<br>

## 설치

사용하는 플랫폼에 맞는 최신 버전을 다운로드하세요:

| 플랫폼 | 다운로드 |
|--------|----------|
| macOS | [OpenWorship.dmg](#) |
| Windows | [OpenWorship-Setup.exe](#) |
| Linux | [OpenWorship.AppImage](#) |

또는 소스에서 빌드:

```bash
git clone https://github.com/jljm-christian/openworship.git
cd openworship
npm install
npm start
```

<br>

---

<br>

## 사용 가이드

### 세션

**세션**은 예배 셋리스트입니다. 각 예배마다 하나씩 만드세요.

| 동작 | 방법 |
|------|------|
| 세션 만들기 | 헤더에서 **"새 세션"** 클릭 |
| 세션 전환 | 헤더의 드롭다운 사용 |
| 세션 이름 변경 | 세션 이름 우클릭 |
| 세션 삭제 | 우클릭 → 삭제 |

세션은 자동으로 저장됩니다.

<br>

### 곡 추가하기

#### 직접 입력

1. **"+ 추가"** 클릭
2. 제목과 가사 입력
3. 저장

**가사 형식:**
```
첫 번째 절 첫째 줄
첫 번째 절 둘째 줄

두 번째 절 첫째 줄
두 번째 절 둘째 줄
```

> 빈 줄이 새 슬라이드를 만듭니다

<br>

#### 라이브러리에서

라이브러리는 영구적인 찬양 모음집입니다.

- 라이브러리 사이드바 열기 (왼쪽 가장자리)
- 곡 검색
- 세션으로 **드래그**
- 또는 우클릭 → "세션에 추가"

<br>

#### OCR 가져오기 (이미지/PDF)

사진이나 문서에서 가사를 자동으로 추출합니다.

1. **"+ 추가"** → **"이미지 가져오기"** 클릭
2. 파일을 드래그하거나 클릭해서 선택
3. AI가 가사 추출
4. 검토, 편집, 저장

> **설정 필요:** 설정 → API에서 OpenAI API 키 추가

<br>

### 송출하기

#### 키보드 조작

| 키 | 동작 |
|----|------|
| `←` `→` | 이전 / 다음 슬라이드 |
| `↑` `↓` | 이전 / 다음 슬라이드 |
| `Page Up` | 이전 곡 |
| `Page Down` | 다음 곡 |
| `Home` | 첫 슬라이드 |
| `End` | 마지막 슬라이드 |
| `B` | 검은 화면 |
| `V` | 절 표시 토글 |
| `Esc` | 송출 닫기 |

<br>

#### 라이브 미리보기

미리보기 패널은 화면에 표시되는 것을 그대로 보여줍니다. 슬라이드를 클릭하면 바로 이동합니다.

<br>

### 커스터마이징

#### 폰트

1. 설정 → 외관
2. **"폰트 추가"**로 커스텀 폰트 가져오기
3. 드롭다운에서 선택
4. 크기, 굵기 조정

지원 형식: `.ttf` `.otf` `.woff` `.woff2`

<br>

#### 비디오 배경

1. 설정 → 디스플레이
2. **"비디오 추가"** 또는 기본 배경 사용
3. 비디오 선택
4. 셔플 활성화로 다양하게

지원 형식: `.mp4` `.webm` `.mov`

<br>

#### 텍스트 스타일링

설정 → 디스플레이에서:

- **폰트 크기** — 24px ~ 200px
- **폰트 굵기** — 얇게 ~ 굵게
- **텍스트 그림자** — 그림자 강도
- **위치** — 수직 배치
- **줄 높이** — 줄 간격

<br>

---

<br>

## 팁

<details>
<summary><strong>주일 준비하기</strong></summary>
<br>

1. 주중에 미리 세션 만들기
2. 예배 순서대로 곡 추가
3. 슬라이드 구분 확인
4. 실제 디스플레이에서 테스트
5. 예배 전에 준비 완료

</details>

<details>
<summary><strong>최적의 슬라이드</strong></summary>
<br>

- 슬라이드당 2-4줄
- 자연스러운 노래 구절에 맞추기
- 한 줄 슬라이드 피하기 (너무 빠름)
- 6줄 이상 피하기 (너무 빽빽함)

</details>

<details>
<summary><strong>다중 모니터 설정</strong></summary>
<br>

1. 프로젝터를 확장 디스플레이로 연결
2. 메인 모니터에서 OpenWorship 열기
3. "송출 열기" 클릭
4. 송출이 보조 디스플레이로 이동
5. 메인에서 조작, 프로젝터에 표시

</details>

<br>

---

<br>

## 개발

### 명령어

| 명령어 | 설명 |
|--------|------|
| `npm start` | 개발 모드 |
| `npm run build` | 프로덕션 빌드 |
| `npm run package` | 설치 파일 생성 |
| `npm run lint` | 코드 검사 |

### 아키텍처

```
src/
├── main/              # Electron 메인 프로세스
│   ├── main.ts        # 앱 라이프사이클
│   ├── windows/       # 윈도우 관리
│   ├── ipc/           # IPC 핸들러
│   └── services/      # 데이터베이스, 설정 등
├── renderer/          # React UI
│   ├── control/       # 컨트롤 윈도우
│   ├── projection/    # 송출 윈도우
│   └── components/    # 공용 UI
└── shared/            # 공용 타입
```

### 기술 스택

| 기술 | 버전 |
|------|------|
| Electron | 35 |
| React | 19 |
| TypeScript | 5.8 |
| Tailwind CSS | 4 |
| shadcn/ui | 최신 |
| better-sqlite3 | 최신 |
| OpenAI API | GPT-5.2 |

### 데이터 위치

| 플랫폼 | 경로 |
|--------|------|
| macOS | `~/Library/Application Support/OpenWorship/` |
| Windows | `%APPDATA%/OpenWorship/` |
| Linux | `~/.config/OpenWorship/` |

<br>

---

<br>

## 기여하기

기여를 환영합니다! Pull Request를 자유롭게 제출해 주세요.

1. 저장소 포크
2. 기능 브랜치 생성 (`git checkout -b feature/amazing-feature`)
3. 변경사항 커밋 (`git commit -m 'Add amazing feature'`)
4. 브랜치에 푸시 (`git push origin feature/amazing-feature`)
5. Pull Request 열기

<br>

---

<br>

## 라이선스

MIT 라이선스 — 교회나 사역에서 자유롭게 사용하세요.

<br>

---

<br>

<p align="center">
  <em>"호흡이 있는 자마다 여호와를 찬양할지어다 할렐루야"</em><br>
  <strong>— 시편 150:6</strong>
</p>

<br>

<p align="center">
  <sub>전 세계 교회를 위해 믿음으로 만들었습니다</sub>
</p>
