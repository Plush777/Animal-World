<img src="/public/images/logo/logo-intro.svg" alt="logo" />

<h1 align="center">🐱 Animal World! 🐱</h1>
<div align="center">description....</div>

## 📝 Reference

### 🎨 color

- https://tailwindcss.com/docs/colors

### 🔴 loading

- https://cssloaders.github.io/

### 🌏 Models

#### 🖼️ background object

- https://skfb.ly/oJYSS (Starry night sky HDRi background photosphere)
- https://skfb.ly/oIINq (FREE - SkyBox In The Cloud)
- https://skfb.ly/6uNHF (Low Poly Medieval Island)
- https://skfb.ly/oAJJu (Low-Poly Floating Island)
- https://skfb.ly/o78uK (Floating Fox)
- https://skfb.ly/oDSIM ((FREE) Low Poly Game Assets)
- https://skfb.ly/HIBy (Low Poly Trees)
- https://skfb.ly/6VnJ9 (Lowpoly Trees)
- Lighthouse by Jarlan Perez [CC-BY] (https://creativecommons.org/licenses/by/3.0/) via Poly Pizza (https://poly.pizza/m/d4j9R8L8xpE)

#### 🐶 avatar

- https://skfb.ly/oFEPp (Cat - PS1 Low Poly (Rigged))
- Hamster by Poly by Google [CC-BY] (https://creativecommons.org/licenses/by/3.0/) via Poly Pizza (https://poly.pizza/m/3YtzEQ5TVUP)
- https://skfb.ly/6UnCF (Low Poly Dog)
- https://skfb.ly/opQpx (low poly fox)
- Wolf by jeremy [CC-BY] (https://creativecommons.org/licenses/by/3.0/) via Poly Pizza (https://poly.pizza/m/2PDe5PSncTC)

#### 🔗 site

- https://choochooworld.com/
- https://madbox.io/
- https://www.kodeclubs.com/
- https://coastalworld.com/
- https://www.choonsikdiary.com/
- https://v0.app/community/habbo-hotel-like-multiplayer-chatroom-using-gpt-5-EYN85i0FdYV

#### 🤯 Troubleshooting

- https://euni8917.tistory.com/575
- https://woorii-kye.tistory.com/227
- https://mycodings.fly.dev/blog/2025-01-01-nextjs-supabase-tutorial-2-login-with-google-id-oauth
- https://velog.io/@chay140/%EC%95%84%EC%9B%83%EC%86%8C%EC%8B%B1-%ED%8C%80-%ED%94%84%EB%A1%9C%EC%A0%9D%ED%8A%B8-supabase-single-%EC%9D%B4%EC%8A%88 (supabase 406: single => maybesingle)

## 🚀 채팅 시스템 API

### 서버 실행

```bash
npm run dev:server
```

### API 엔드포인트

#### 1. 전체 통계 조회

```http
GET /stats
```

**응답:**

```json
{
  "totalRooms": 2,
  "totalUsers": 15,
  "maxUsersPerRoom": 50
}
```

#### 2. 방 목록 조회

```http
GET /rooms
```

**응답:**

```json
{
  "rooms": [
    { "roomId": "room_1", "userCount": 10 },
    { "roomId": "room_2", "userCount": 5 }
  ],
  "maxUsersPerRoom": 50
}
```

#### 3. 상세 상태 조회

```http
GET /status
```

**응답:**

```json
{
  "totalRooms": 2,
  "totalUsers": 15,
  "maxUsersPerRoom": 50,
  "rooms": [
    { "roomId": "room_1", "userCount": 10 },
    { "roomId": "room_2", "userCount": 5 }
  ]
}
```

### 방 관리 시스템

- **최대 인원**: 각 방당 50명
- **자동 방 생성**: 모든 방이 가득 찰 때만 새 방 생성
- **방 재사용**: 사용자가 나간 방은 다른 사용자가 재사용 가능
- **빈 방 삭제**: 모든 사용자가 나간 방은 자동 삭제

### 테스트 도구

`test-api.html` 파일을 브라우저에서 열어 서버 상태를 실시간으로 확인할 수 있습니다.
