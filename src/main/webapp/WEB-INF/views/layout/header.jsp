<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core"%>

<link rel="stylesheet" href="/static/css/common.css">

<header class="ev-header">
  <div class="ev-container ev-header-inner">
    <a href="/" class="ev-header-logo">
      <div class="ev-header-logo-icon">⚡</div>
      <div>
        <span class="ev-header-logo-bold">EV</span>
        <span class="ev-header-logo-light">충전소</span>
      </div>
    </a>

    <nav class="ev-header-nav">
      <a href="/map" class="ev-header-nav-link ${pageContext.request.requestURI.contains('/map') ? 'active' : ''}">충전소 지도</a>
      <a href="/reservation" class="ev-header-nav-link ${pageContext.request.requestURI.contains('/reservation') ? 'active' : ''}">예약하기</a>
      <a href="/status" class="ev-header-nav-link ${pageContext.request.requestURI.contains('/status') ? 'active' : ''}">충전 현황</a>
      <a href="/notices" class="ev-header-nav-link ${pageContext.request.requestURI.contains('/notices') ? 'active' : ''}">공지사항</a>
      <c:if test="${sessionScope.loginUser.role == 'ADMIN'}">
        <a href="/admin" class="ev-header-nav-link ev-header-nav-link-admin">관리자</a>
      </c:if>
    </nav>

    <div class="ev-header-actions">
      <c:choose>
        <c:when test="${not empty sessionScope.loginUser}">
          <button class="ev-header-bell">
            🔔
            <span class="ev-header-bell-dot"></span>
          </button>
          <div class="ev-header-user-menu">
            <button class="ev-header-user-btn">
              <div class="ev-header-user-avatar">${sessionScope.loginUser.name.substring(0,1)}</div>
              <span>${sessionScope.loginUser.name}</span>
              <c:if test="${sessionScope.loginUser.role == 'ADMIN'}">
                <span class="ev-header-user-badge-admin">관리자</span>
              </c:if>
              ▾
            </button>
            <div class="ev-header-dropdown">
              <div class="ev-header-dropdown-header">
                <div class="ev-header-dropdown-name">${sessionScope.loginUser.name}</div>
                <div class="ev-header-dropdown-email">${sessionScope.loginUser.email}</div>
              </div>
              <div class="ev-header-dropdown-divider"></div>
              <a href="/mypage" class="ev-header-dropdown-item">👤 마이페이지</a>
              <c:if test="${sessionScope.loginUser.role == 'ADMIN'}">
                <a href="/admin" class="ev-header-dropdown-item">📊 관리자 대시보드</a>
              </c:if>
              <div class="ev-header-dropdown-divider"></div>
              <a href="/logout" class="ev-header-dropdown-item ev-header-dropdown-item-logout">🚪 로그아웃</a>
            </div>
          </div>
        </c:when>
        <c:otherwise>
          <a href="/login" class="ev-btn ev-btn-ghost">로그인</a>
          <a href="/signup" class="ev-btn ev-btn-primary">회원가입</a>
        </c:otherwise>
      </c:choose>
    </div>
  </div>
</header>