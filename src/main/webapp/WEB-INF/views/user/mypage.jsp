<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>

<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>마이페이지 - EV 충전소</title>
    <script src="https://tailwindcss.com"></script>
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/common.css">
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/mypage.css">
</head>
<body class="bg-gray-50">
    <jsp:include page="/WEB-INF/views/layout/header.jsp" />

    <main class="ev-mp-main">
        <div class="ev-mp-container">
            <h1 class="text-2xl font-extrabold tracking-tight mb-6">마이페이지</h1>
            
            <!-- 🌟 핵심: 가로 2단 분할 레이아웃 컨테이너 시작 -->
            <div class="ev-mp-layout">
                
                <!-- 👈 [좌측] 프로필 패널 영역 -->
                <div class="space-y-4">
                    <div class="ev-mp-profile-box">
                        <div class="ev-mp-avatar-container">
                            <div class="ev-mp-avatar-circle">
                                ${fn:substring(myPageDto.name, 0, 1)}
                            </div>
                            <h2 class="ev-mp-user-name">${myPageDto.name}</h2>
                            <p class="ev-mp-user-email">${myPageDto.email}</p>
                            <!-- 🎯 DB의 role 컬럼 값(ADMIN / USER)을 기반으로 한 동적 권한 뱃지 분기 처리 -->
							<c:choose>
							    <c:when test="${myPageDto.role eq 'ADMIN'}">
							        <span class="mt-2 text-xs px-2 py-0.5 bg-[oklch(0.52_0.13_180_/_0.15)] text-[var(--ev-accent)] border border-[oklch(0.52_0.13_180_/_0.3)] rounded-md font-semibold">
							            관리자
							        </span>
							    </c:when>
							    <c:otherwise>
							        <span class="mt-2 text-xs px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-md font-semibold">
							            일반 회원
							        </span>
							    </c:otherwise>
							</c:choose>
                        </div>
                        
                        <div class="h-[1px] bg-[var(--ev-border)] my-4"></div>
                        
                        <!-- 세부 기본정보 연동 라인 -->
                        <div class="space-y-3 mb-6">
                            <div class="ev-mp-info-row">
                                <span class="ev-mp-info-label">📞 전화번호</span>
                                <span class="font-medium">${myPageDto.phone}</span>
                            </div>
                            <div class="ev-mp-info-row">
                                <span class="ev-mp-info-label">📅 가입일</span>
                                <span class="font-medium">${fn:substring(myPageDto.createdAt, 0, 10)}</span>
                            </div>
                        </div>
                        
                        <a href="${pageContext.request.contextPath}/mypage/edit" class="ev-btn ev-btn-outline w-full justify-center py-2 text-sm font-medium">
                            ✏️ 정보 수정
                        </a>
                    </div>
                    
                    <!-- 시안 맞춤형 충전 통계 박스 추가 결합 -->
                    <div class="ev-mp-profile-box p-6">
                        <h3 class="text-sm font-bold mb-4 border-b border-[var(--ev-border)] pb-2">📊 충전 통계</h3>
                        <div class="space-y-3 text-sm">
                            <div class="ev-mp-info-row">
                                <span class="ev-mp-info-label">총 충전 횟수</span>
                                <span class="font-bold text-[var(--ev-primary)]">${myPageDto.totalChargeCount}회</span>
                            </div>
                            <div class="ev-mp-info-row">
                                <span class="ev-mp-info-label">총 충전량</span>
                                <span class="font-bold text-[var(--ev-primary)]">${myPageDto.totalChargeKw} kWh</span>
                            </div>
                            <div class="ev-mp-info-row">
                                <span class="ev-mp-info-label">절약한 탄소</span>
                                <span class="font-bold text-green-600">${myPageDto.savedCarbon} kg</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 👉 [우측] 예약 제어 및 내역 콘텐츠 영역 (가로로 넓게 확장) -->
                <div class="ev-mp-content-area">
                    <!-- 상단 필터 탭 바 -->
                    <div class="ev-mp-tab-bar">
                        <a href="${pageContext.request.contextPath}/mypage?tab=upcoming" class="ev-mp-tab-link ${currentTab eq 'past' ? 'ev-mp-tab-inactive' : 'ev-mp-tab-active'}">
                            예정 예약 <span class="ml-1 px-1.5 py-0.2 bg-white/20 text-xs rounded-full">2</span>
                        </a>
                        <a href="${pageContext.request.contextPath}/mypage?tab=past" class="ev-mp-tab-link ${currentTab eq 'past' ? 'ev-mp-tab-active' : 'ev-mp-tab-inactive'}">
                            지난 예약
                        </a>
                    </div>

                    <!-- 동적 내역 출력부 -->
                    <div class="space-y-4">
                        <c:choose>
                            <c:when test="${not empty reservationList}">
                                <c:forEach var="res" items="${reservationList}">
                                    <div class="ev-mp-history-card">
                                        <div class="ev-mp-card-header">
                                            <div>
                                                <h4 class="font-bold text-gray-900">${res.stationName}</h4>
                                                <p class="text-xs text-gray-400">예약번호: R${res.reservationId}</p>
                                            </div>
                                            <span class="text-xs px-2 py-0.5 bg-[oklch(0.38_0.18_258_/_0.08)] text-[var(--ev-primary)] border border-[oklch(0.38_0.18_258_/_0.2)] rounded-md font-semibold">
                                                ${res.status eq 'RESERVED' ? '예약 확정' : res.status}
                                            </span>
                                        </div>
                                        
                                        <div class="text-sm text-gray-600 mb-4">
                                            <c:choose>
                                                <c:when test="${res.reservationType eq 'TIME'}">
                                                    <p>일시: <fmt:formatDate value="${res.startTime}" pattern="yyyy-MM-dd HH:mm"/> ~ <fmt:formatDate value="${res.endTime}" pattern="HH:mm"/></p>
                                                </c:when>
                                                <c:otherwise>
                                                    <p>목표 충전량: ${res.targetAmount} kWh</p>
                                                </c:otherwise>
                                            </c:choose>
                                            <p class="text-xs mt-1 text-gray-400">🔌 충전기 기종: ${res.connectorType}</p>
                                        </div>
										
										<c:if test="${res.status eq 'RESERVED'}">
										    <div class="flex gap-2">
										        <a href="${pageContext.request.contextPath}/mypage/reservation/edit?id=${res.reservationId}" 
										           class="ev-btn ev-btn-outline text-xs py-1.5 px-3 bg-blue-50 text-blue-600 border-blue-200">예약 수정</a>
										        
										        <form action="${pageContext.request.contextPath}/mypage/reservation/cancel" method="post" onsubmit="return confirm('취소하시겠습니까?');" class="inline">
                                                    <input type="hidden" name="${_csrf.parameterName}" value="${_csrf.token}" />
										            <input type="hidden" name="reservationId" value="${res.reservationId}">
										            <button type="submit" class="ev-btn ev-btn-outline text-xs py-1.5 px-3 bg-red-50 text-red-600 border-red-200">예약 취소</button>
										        </form>
										    </div>
										</c:if>
                                    </div>
                                </c:forEach>
                            </c:when>
                            
                            <%-- 🌟 핵심 보완: 예약 내역이 비어있을 때 팀원들 리액트 시안 일치화 (아이콘 + 안내문구 + 파란색 이동 버튼) ── --%>
                            <c:otherwise>
                                <div class="bg-white rounded-xl border border-[var(--ev-border)] ev-mp-empty-box shadow-sm">
                                    <!-- 중앙 달력 큰 이모지 아이콘 -->
                                    <span class="text-4xl mb-3 opacity-60">📅</span>
                                    <p class="text-gray-500 font-medium mb-5">예정된 예약이 없습니다.</p>
                                    <!-- 시안 속 파란색 액션 버튼 매핑 -->
                                    <a href="${pageContext.request.contextPath}/map">
                                        <button class="ev-btn ev-btn-primary text-xs py-2 px-5 shadow-sm">
                                            충전 예약하기 &gt;
                                        </button>
                                    </a>
                                </div>
                            </c:otherwise>
                        </c:choose>
                    </div>
                </div> <!-- [우측] 끝 -->
                
            </div> <!-- .ev-mp-layout 끝 -->
        </div>
    </main>

    <script>
        window.onload = function() {
            <c:if test="${not empty message}">alert("${message}");</c:if>
            <c:if test="${not empty error}">alert("${error}");</c:if>
        };
    </script>
</body>
</html>