[README_2차_EV충전예약 (1).md](https://github.com/user-attachments/files/30528923/README_2._EV.1.md)
<div align="center">

# 🔌 EV 충전소 예약 관리 시스템

실시간 충전기 상태 확인과 사전 예약, 위치 기반 충전소 탐색, 소셜 로그인 통합 인증을 제공하는 웹 애플리케이션

`2026.05.20 ~ 2026.06.04`

[![Java](https://img.shields.io/badge/Java-17-007396?logo=openjdk&logoColor=white)](.)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.4.3-6DB33F?logo=springboot&logoColor=white)](.)
[![Spring Security](https://img.shields.io/badge/Spring_Security-6DB33F?logo=springsecurity&logoColor=white)](.)
[![MySQL](https://img.shields.io/badge/MySQL-4479A1?logo=mysql&logoColor=white)](.)
[![Kakao Map](https://img.shields.io/badge/Kakao_Map_API-FFCD00?logo=kakao&logoColor=black)](.)

</div>

---

## 📋 목차

- [소개](#-소개)
- [주요 기능](#-주요-기능)
- [기술 스택](#-기술-스택)
- [아키텍처](#-아키텍처)
- [시작하기](#-시작하기)
- [폴더 구조](#-폴더-구조)
- [팀원](#-팀원)

---

## 📖 소개

- 실시간 충전기 상태 확인 및 사전 예약으로 대기시간 최소화
- 위치 기반 충전소 탐색 및 최단 경로 안내 (카카오맵 + Kakao Mobility)
- 소셜 로그인 통합 인증 (Spring Security + OAuth2)
- 관리자 대시보드 실시간 운영 현황 집계

---

## ✨ 주요 기능

| 기능 | 설명 |
|---|---|
| 소셜 로그인 | Google · Kakao · Naver OAuth2 통합 인증 |
| 충전소 탐색 | 거리순 정렬 및 지도 시각화 |
| 길찾기 | Kakao Mobility 기반 경로 안내 |
| 즐겨찾기 | 자주 이용하는 충전소 등록/해제 |
| 예약 관리 | 실시간 충전기 상태 확인 및 사전 예약 |
| 관리자 대시보드 | 예약 현황 실시간 집계 |

---

## 🛠 기술 스택

**Backend** · Java 17, Spring Boot 3.4.3, Spring Security, OAuth2 Client, MyBatis

**Frontend** · JSP, JSTL, JavaScript, jQuery

**Database** · MySQL

**외부 API** · 카카오맵 JS SDK, 카카오 주소검색, Kakao Mobility, 한전 공공 API

**Infra** · Apache Tomcat 9.0

**Tool** · STS4, DBeaver, Git, Notion

---

## 🏗 아키텍처

### 충전소 데이터 파이프라인
```
한전 공공 API (원본 데이터)
   → 카카오 주소검색 API (지오코딩)
   → 지도 시각화 + 거리순 정렬
   → Kakao Mobility (서버 프록시) 길찾기
```

### 인증 구조
```
Google / Kakao / Naver OAuth2
   → 제공자별 응답 통일 처리
   → 화면은 로그인 방식과 무관하게 동일하게 동작
```

---

## 🚀 시작하기

### 요구 사항
- JDK 17, Gradle
- MySQL
- 카카오 개발자 REST API 키 / OAuth2 Client 정보
- 한전 공공데이터 API 키

### 설치 및 실행

```bash
git clone https://github.com/{your-org}/ev-charge.git
cd ev-charge
```

`src/main/resources/application.yml`에 DB, OAuth2, API 키 정보 입력 후:

```bash
./gradlew bootRun
```

```
http://localhost:8383
```

---

## 📁 폴더 구조

```
ev-charge
├── src/main/java/com/boot/ev_charge
│   ├── auth
│   ├── map
│   ├── reservation
│   ├── admin
│   └── config
├── src/main/resources
│   ├── mybatis-mapper
│   └── application.yml
└── build.gradle
```

