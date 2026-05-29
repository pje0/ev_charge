<%@ page language="java" contentType="text/html; charset=UTF-8"
	pageEncoding="UTF-8"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core"%>
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>EV 충전소 - 스마트 충전 예약 시스템</title>
<link
	href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;800&display=swap"
	rel="stylesheet">
<link rel="stylesheet" href="/css/common.css">
<link rel="stylesheet" href="/css/main.css">
</head>
<body>

	<jsp:include page="/WEB-INF/views/layout/header.jsp" />

	<!-- 히어로 -->
	<section class="ev-main-hero">
		<div class="ev-main-hero-bg"></div>
		<div class="ev-main-hero-overlay"></div>
		<div class="ev-container">
			<div class="ev-main-hero-content">
				<div class="ev-main-hero-badge">⚡ 스마트 EV 충전 플랫폼</div>
				<h1 class="ev-main-hero-title">
					언제 어디서나<br> <span class="ev-main-hero-title-accent">스마트하게</span><br>
					충전하세요
				</h1>
				<p class="ev-main-hero-desc">전국 EV 충전소를 실시간으로 확인하고 미리 예약하세요. 
				대기 없는 스마트 충전 경험을 제공합니다.</p>
				<div class="ev-main-hero-btns">
					<a href="/map" class="ev-main-hero-btn-primary">충전소 찾기</a> <a
						href="/reservation" class="ev-main-hero-btn-outline">예약하기</a>
				</div>
			</div>
		</div>
	</section>

	<!-- 통계 바 -->
	<section class="ev-main-stats-bar">
		<div class="ev-container">
			<div class="ev-main-stats-grid">
				<div class="ev-main-stats-item">
					<div class="ev-main-stats-icon">📍</div>
					<div class="ev-main-stats-value">6개소</div>
					<div class="ev-main-stats-label">전국 충전소</div>
				</div>
				<div class="ev-main-stats-item">
					<div class="ev-main-stats-icon">⚡</div>
					<div class="ev-main-stats-value">21기</div>
					<div class="ev-main-stats-label">총 충전기</div>
				</div>
				<div class="ev-main-stats-item">
					<div class="ev-main-stats-icon">📅</div>
					<div class="ev-main-stats-value">1,284건</div>
					<div class="ev-main-stats-label">이번 달 예약</div>
				</div>
				<div class="ev-main-stats-item">
					<div class="ev-main-stats-icon">👤</div>
					<div class="ev-main-stats-value">3,842명</div>
					<div class="ev-main-stats-label">누적 회원</div>
				</div>
			</div>
		</div>
	</section>

	<!-- 핵심 기능 -->
	<section class="ev-main-section">
		<div class="ev-container">
			<div class="ev-main-section-header">
				<span class="ev-main-section-badge">핵심 기능</span>
				<h2 class="ev-main-section-title">더 스마트한 충전 경험</h2>
				<p class="ev-main-section-desc">실시간 현황 조회부터 간편 예약까지, 전기차 충전의 모든
					것을 한 곳에서</p>
			</div>
			<div class="ev-main-features-grid">
				<a href="/map" class="ev-main-feature-card">
					<div class="ev-main-feature-icon-wrap ev-main-feature-icon-blue">🗺️</div>
					<h3 class="ev-main-feature-title">실시간 지도 조회</h3>
					<p class="ev-main-feature-desc">카카오맵으로 주변 충전소를 한눈에 확인하고 실시간 가용
						현황을 파악하세요.</p> <span
					class="ev-main-feature-link ev-main-feature-link-blue">바로가기
						→</span>
				</a> <a href="/reservation" class="ev-main-feature-card">
					<div class="ev-main-feature-icon-wrap ev-main-feature-icon-teal">📅</div>
					<h3 class="ev-main-feature-title">간편 예약 시스템</h3>
					<p class="ev-main-feature-desc">원하는 시간대 또는 목표 충전량으로 미리 예약하고 대기
						없이 충전하세요.</p> <span
					class="ev-main-feature-link ev-main-feature-link-teal">바로가기
						→</span>
				</a> <a href="/status" class="ev-main-feature-card">
					<div class="ev-main-feature-icon-wrap ev-main-feature-icon-green">⚡</div>
					<h3 class="ev-main-feature-title">실시간 충전 현황</h3>
					<p class="ev-main-feature-desc">충전기 상태를 실시간으로 확인하고 최적 충전소를
						선택하세요.</p> <span
					class="ev-main-feature-link ev-main-feature-link-green">바로가기
						→</span>
				</a>
			</div>
		</div>
	</section>

	<!-- CTA -->
	<section class="ev-main-section">
		<div class="ev-container">
			<div class="ev-main-cta-inner">
				<div class="ev-main-cta-bg"></div>
				<div class="ev-main-cta-overlay"></div>
				<div class="ev-main-cta-content">
					<h2 class="ev-main-cta-title">지금 바로 시작하세요</h2>
					<p class="ev-main-cta-desc">가까운 충전소를 간편하게 예약할 수 있습니다.<br>
						스마트한 EV 충전 라이프를 경험해보세요.</p>
					<a href="/signup" class="ev-main-cta-btn">⚡ 지금 시작하기</a>
				</div>
			</div>
		</div>
	</section>

	<!-- 푸터 -->
	<footer class="ev-footer">
		<div class="ev-container">
			<div class="ev-footer-inner">
				<div class="ev-footer-logo">
					<div class="ev-header-logo-icon">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none"
							stroke="white" stroke-width="2.5" stroke-linecap="round"
							stroke-linejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
					</div>
					<span class="ev-footer-logo-text">EV 충전소</span>
				</div>
				<div class="ev-footer-links">
					<span>이용약관</span> <span>개인정보처리방침</span> <span>고객센터:
						1588-0000</span>
				</div>
			</div>
			<div class="ev-footer-copy">© 2026 EV 충전소 예약 시스템. All rights
				reserved.</div>
		</div>
	</footer>

</body>
</html>