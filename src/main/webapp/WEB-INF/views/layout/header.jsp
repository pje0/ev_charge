<%@ page language="java" contentType="text/html; charset=UTF-8"
	pageEncoding="UTF-8"%>

<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core"%>

<%@ taglib prefix="sec"
	uri="http://www.springframework.org/security/tags"%>

<link rel="stylesheet" href="/css/common.css">

<header class="ev-header">

	<div class="ev-container ev-header-inner">

		<a href="/" class="ev-header-logo">

			<div class="ev-header-logo-icon">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none"
					stroke="white" stroke-width="2.5" stroke-linecap="round"
					stroke-linejoin="round">

					<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />

				</svg>
			</div>

			<div>
				<span class="ev-header-logo-bold">EV</span> <span
					class="ev-header-logo-light">충전소</span>
			</div>

		</a>

		<nav class="ev-header-nav">

			<a href="/map" class="ev-header-nav-link"> 충전소 지도 </a> <a
				href="/reservation" class="ev-header-nav-link"> 예약하기 </a> <a
				href="/calculator" class="ev-header-nav-link"> 충전 요금 계산기 </a> <a
				href="/status" class="ev-header-nav-link"> 1:1 문의 </a> <a
				href="/notices" class="ev-header-nav-link"> 공지사항 </a>

			<sec:authorize access="hasRole('ADMIN')">

				<a href="/admin" class="ev-header-nav-link ev-header-nav-link-admin">

					관리자 </a>

			</sec:authorize>

		</nav>

		<div class="ev-header-actions">

			<!-- 로그인 상태 -->
			<sec:authorize access="isAuthenticated()">

				<div class="ev-header-user-menu">

					<button class="ev-header-user-btn">

						<div class="ev-header-user-avatar">

							<sec:authentication property="principal.username" />

						</div>

						<span> <sec:authentication property="principal.username" />

						</span>

					</button>

					<div class="ev-header-dropdown">

						<a href="/mypage" class="ev-header-dropdown-item"> 마이페이지 </a>

						<sec:authorize access="hasRole('ADMIN')">

							<a href="/admin" class="ev-header-dropdown-item"> 관리자 페이지 </a>

						</sec:authorize>

						<form action="/logout" method="post">

							<button type="submit"
								class="ev-header-dropdown-item ev-header-dropdown-item-logout">

								로그아웃</button>

						</form>

					</div>

				</div>

			</sec:authorize>

			<!-- 비로그인 상태 -->
			<sec:authorize access="isAnonymous()">

				<a href="/login" class="ev-btn ev-btn-ghost"> 로그인 </a>

				<a href="/signup" class="ev-btn ev-btn-primary"> 회원가입 </a>

			</sec:authorize>

		</div>

	</div>

</header>