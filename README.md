# MARIE LOOP STUDIO ♡ v2.0

**포근한 파스텔 음악 작업실 테마 + YouTube 무한 반복 / A–B 구간 반복**

기존 v1의 반복재생, 구간 북마크, 메모, 공유 링크 기능을 그대로 유지하며 화면만 더 귀엽게 개선한 정적 사이트입니다. 기본 테마는 라이트이며 기존 브라우저의 테마 설정은 존중합니다.

## 새 디자인

- `assets/cozy-studio.webp`: 직접 제작한 아기자기한 파스텔 스튜디오 배경
- `assets/marie-mascot.webp`: 오리지널 헤드셋 메이드 마스코트 (투명 배경)
- `assets/music-stickers.webp`: 음악 / 재생 / 반복 스티커
- 이미지 3종을 **WebP**로 최적화 (총 약 55KB). 필요한 에셋을 프로젝트에 동봉해 외부 이미지 호스팅 의존성을 없앴습니다.
- 320px부터 큰 PC 화면까지 반응형으로 구성. 라이트/다크 테마 및 키보드 접근성 유지.
- 기존 로컬 저장 키 `marie-loop-studio-v1`을 보존하여 저장된 프리셋과 메모를 이어 사용할 수 있습니다.



## 1. 실행 방법 (Windows Chrome 권장)

1. ZIP 파일을 해제합니다.
2. `start.bat`를 더블클릭합니다. (Node.js 또는 Python 설치 필요)
3. Chrome에서 `http://localhost:4173/`가 열립니다. 자동으로 열리지 않으면 직접 주소를 입력하세요.
4. 유튜브 주소 또는 11글자 영상 ID를 입력하고 **영상 불러오기**를 누릅니다.
5. 재생 버튼을 누릅니다. 원하는 장면의 **현재 시점 지정 A / B**를 순서대로 클릭하거나, 시간을 직접 입력하세요.
6. `전체 무한 반복` 또는 `A–B 구간 반복`을 선택하면 됩니다.

> 이 프로젝트는 빌드 / npm install / API 키 / 유료 서버가 필요 없는 정적 사이트입니다. 단, YouTube 영상과 YouTube IFrame API 로드에는 인터넷 연결이 필요합니다. 로컬 서버는 **페이지를 인터넷에 공개하지 않고 내 PC에서만 제공**합니다.

**중요:** `index.html` 파일을 직접 더블클릭해 열면 `file://` 주소가 되어, YouTube가 보안 정책상 Referer가 없다고 판단하여 **오류 153**을 표시할 수 있습니다. 이런 경우 꼭 `start.bat`를 사용하세요. 정적 호스팅을 통한 **HTTPS 배포**도 지원합니다.

## 2. 기능

- 전체 영상 무한 반복, 반복 끄기, A–B 구간 무한 반복
- 타임라인과 정확한 구간 시각화, A/B 현재 위치 캡처
- 시간 직접 입력: `00:30`, `1:02.350`, `1:30:05`, `1m20s`, `90`(초)
- 5초 건너뛰기, 재생/일시정지, 볼륨, 0.25~2.0배속 선택(YouTube가 제공하는 배속만 적용)
- 반복 프리셋 최대 100개 저장·불러오기·삭제 (localStorage)
- 영상별 자동 저장 메모 (localStorage)
- URL의 `v`, `a`, `b`, `mode`, `rate` 매개변수로 현재 반복 구간 공유
- 마지막 동영상 자동 다시 불러오기
- 다크/라이트 테마, PC/태블릿/모바일 반응형 레이아웃
- 외부 JS/CSS 라이브러리 없음, 외부 폰트 없음

## 3. 단축키

| 키 | 동작 |
| --- | --- |
| Space | 재생 / 일시정지 |
| A, B | 현재 위치를 A / B로 기록 |
| L | 반복 끄기 / 마지막 반복 모드로 복구 |
| 1 / 2 / 0 | 전체 / 구간 / 끔 |
| ← / → | 5초 뒤로 / 앞으로 |
| - / + | 배속 내리기 / 올리기 |

입력칸과 메모창에서는 오작동하지 않도록 단축키가 적용되지 않습니다. 브라우저가 주소창/인쇄에 사용하는 Ctrl+L, Ctrl+P는 가로채지 않습니다.

## 4. 유튜브 링크 형식

- `https://www.youtube.com/watch?v=XXXXXXXXXXX`
- `https://youtu.be/XXXXXXXXXXX?t=90`
- `https://www.youtube.com/shorts/XXXXXXXXXXX`
- `https://www.youtube.com/live/XXXXXXXXXXX`
- `https://music.youtube.com/watch?v=XXXXXXXXXXX`
- 11글자 동영상 ID

재생목록 전체를 순서대로 반복하는 기능은 구현하지 않았습니다(단일 동영상 반복 전용).

## 5. 정적 웹사이트 배포

GitHub Pages, Netlify, Cloudflare Pages 또는 일반 정적 웹서버에 `index.html`, `styles.css`, `js/`, `assets/`를 그대로 업로드하면 됩니다. Node 서버 파일과 시작 스크립트는 배포에 필요하지 않습니다.

- HTTPS 사용 권장
- 리퍼러 정책 `strict-origin-when-cross-origin` 유지 (이 파일의 HTML 메타태그와 런타임 iframe 설정에 반영)
- 보안 설정/리버스 프록시에서 `Referrer-Policy: no-referrer`나 `same-origin` 강제 설정 금지
- `youtube.com`, `youtube-nocookie.com`, `i.ytimg.com`, Google 관련 YouTube 스트리밍 도메인을 차단하면 재생되지 않을 수 있음

## 6. 구현 원리

- **공식 YouTube IFrame Player API:** `https://www.youtube.com/iframe_api`를 불러와 `new YT.Player()`를 생성합니다. 동영상 MP4를 스크래핑/다운로드하지 않습니다.
- **전체 반복:** `onStateChange`에서 `ENDED` 수신 시 `seekTo(0, true)`와 `playVideo()`를 실행합니다.
- **A–B 반복:** 120ms 주기로 `getCurrentTime()`을 확인하다가 B 부근에 도달하면 `seekTo(A,true)`와 `playVideo()`를 실행합니다. `ENDED` 이벤트도 보완합니다.
- **정밀도:** 브라우저 타이머, 스트리밍 네트워크, YouTube 영상 키프레임 탓에 프레임 단위 / 음향 샘플 단위의 끊김 없는 루프는 보장하지 않습니다.
- **자율 정보 저장:** 영상 메모와 프리셋은 각 브라우저의 `localStorage`에 저장됩니다. 서버로 업로드되지 않습니다.
- **안전한 링크 파싱:** 신뢰할 수 있는 YouTube 도메인과 11자리 영상 ID만 허용합니다. 사용자 입력을 HTML에 직접 삽입하지 않습니다.

## 7. 제한 및 오류 해결

- **153번 오류:** 출처 확인용 HTTP Referer 관련. `file://` 대신 `start.bat` 또는 정상 HTTPS 도메인을 쓰고, 프록시의 Referrer-Policy 확인.
- **101 / 150:** 업로더가 외부 삽입을 차단한 영상입니다. 유튜브에서 직접 시청해야 합니다.
- **100:** 존재하지 않거나 비공개/삭제된 영상입니다.
- **자동 재생이 안 됨:** Chrome 정책에 따라 최초 재생은 사용자가 클릭해야 할 수 있습니다.
- **라이브:** DVR·길이 정보가 일정하지 않아 A–B 반복이 제한될 수 있습니다.
- **배속:** 0.25~2.0 중 YouTube가 해당 동영상에 지원하는 값만 실제 적용됩니다.
- **보안망/내부망:** YouTube 접속이 차단된 내부망에서는 재생할 수 없습니다.
- **공유 링크:** 메모와 저장 목록은 포함하지 않습니다. 호스트가 `localhost`인 URL은 다른 PC에서 그대로 열 수 없습니다. 웹사이트로 배포한 HTTPS 주소를 사용하세요.
- **프리셋:** 브라우저 데이터 제거, 시크릿 창 종료 시 사라질 수 있습니다.

## 8. 파일 구조

```
MarieLoopStudio/
├── index.html           # 페이지 구성
├── styles.css           # 반응형 스타일
├── js/
│   ├── app.js           # 플레이어, 메모, 프리셋 UI
│   └── core.mjs         # 시간/링크 파싱과 공유 로직
├── assets/favicon.svg   # 자체 제작 SVG 아이콘
├── server.mjs           # Node.js 무의존 로컬 HTTP 서버
├── start.bat            # Windows 실행
├── start.sh             # Linux/macOS 실행
├── tests/core.test.mjs  # Node 테스트
└── README.md
```

## 9. 참조 자료

- LoopTube (기능 검토): https://looptube.io/
- YouTube IFrame API: https://developers.google.com/youtube/iframe_api_reference
- YouTube embed parameters: https://developers.google.com/youtube/player_parameters
- Required functionality / Referer: https://developers.google.com/youtube/terms/required-minimum-functionality

이 앱은 유사한 기능을 독립 구현한 것이며 LoopTube의 원본 소스코드, 상표, 디자인 에셋을 복제하지 않았습니다. YouTube 공식 서비스도 아닙니다.

## 10. 이번 패키지 검증 범위

- Node.js 순수 로직 테스트 9개: 통과
- 데스크톱 1440px, 모바일 390px/320px 브라우저 렌더링: 가로 넘침 없음
- 모의 YouTube 플레이어 기반: 전체 종료 후 반복, A–B 도달 시 이동, 끄기 모드, 배속, 프리셋 저장, 메모 자동 저장 검사 통과
- 로컬 Node 서버의 HTML 및 JavaScript GET/HEAD 응답과 Referer 정책 헤더 확인
- **미검증:** 외부 실제 YouTube 영상으로의 네트워크 스트리밍, 실제 계정/연령 제한/삽입 제한별 동작, iOS 실기기. 실제 YouTube 정책 변화에 따라 제한이 발생할 수 있습니다.

## 8. GitHub Public 배포 및 보안

- 정적 사이트: API 키, 비밀키, 사용자 인증값, 서버 환경변수를 **필요로 하지 않습니다**.
- 개인 메모/프리셋은 브라우저 로컬 저장소에만 남습니다. GitHub에 업로드되는 프로젝트 파일에 메모 데이터는 포함되지 않습니다.
- `.gitignore`에 `.env`, 인증서, `secrets/`, `credentials/` 등을 차단했습니다. 단, **이미 추적 중인 파일이나 수동으로 강제 추가한 파일은 차단할 수 없으므로** Public 커밋 전에 `git diff --cached --name-only`를 확인하세요.
- GitHub Pages: 이 저장소가 Public이며 파일이 `main` 루트에 올라간 뒤 **Settings → Pages → Build and deployment → Deploy from a branch → main / (root)**로 설정할 수 있습니다.
- Pages 주소는 일반적으로 `https://teamprotofelix.github.io/Loop_Studio/`이며, GitHub Pages 설정이 활성화되기 전에는 작동하지 않습니다.
- 저장소 내용을 GitHub에 공개할 경우 반드시 `MarieLoopStudio` 폴더 **안의 파일들을 저장소 루트**에 업로드하세요.
- 로컬 실행 `start.bat`, `server.mjs`, 테스트 폴더, README는 호스팅에 영향을 주지 않습니다.
- `npm test` 또는 `node --test tests/*.test.mjs`로 자동 테스트를 실행할 수 있습니다. (Node 20+ 권장)

## 9. 품질 검증 및 알려진 한계

- 순수 JS 단위 테스트, URL 검증, 공유 링크 라운드트립, 구간 종료 판단, 에셋 무결성 검사.
- 브라우저 모의 YouTube Player로 화면 동작(테마, 영상 불러오기, A/B, 반복 점프, 프리셋, 메모)을 검증.
- PC 1440px / 태블릿 768px / 모바일 390px, 320px에서 가로 넘침이 없는 정적 화면 확인.
- 실제 YouTube 스트리밍, 임베드 제한 영상, 모바일 실기기, 실제 인터넷 배포는 테스트 환경에서 검증하지 못했습니다. 배포 후 실제 공개 YouTube 영상으로 확인하세요.
- YouTube 콘텐츠의 사용·저작권·영상 삽입 정책을 준수하세요. 비공개 또는 임베드 차단 영상은 우회할 수 없습니다.

## License / Artwork

MARIE LOOP STUDIO는 YouTube 및 LoopTube의 공식 서비스가 아닙니다. 앱에 포함된 스튜디오, 마스코트, 스티커 이미지는 이 프로젝트를 위해 새로 제작한 오리지널 벡터 일러스트의 WebP 렌더링입니다. 타 서비스의 로고/화면을 복제하지 않았습니다.
