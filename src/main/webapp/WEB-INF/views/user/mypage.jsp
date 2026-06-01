<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>

<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>마이페이지 - EV 충전소</title>
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/common.css">
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/mypage.css">
    <script src="${pageContext.request.contextPath}/js/mypage.js" defer></script>
</head>
<body class="ev-mypage-body">
    <jsp:include page="/WEB-INF/views/layout/header.jsp" />

    <main class="ev-mypage-main">
        <div class="ev-mypage-container">
            <h1 class="ev-mypage-title">마이페이지</h1>
            
            <div class="ev-mypage-layout">
                
                <div class="ev-mypage-sidebar">
                    <div class="ev-mypage-profile-box">
                        <div class="ev-mypage-avatar-container">
                            <div class="ev-mypage-avatar-circle">
                                ${fn:substring(myPageDto.name, 0, 1)}
                            </div>
                            <h2 class="ev-mypage-user-name">${myPageDto.name}</h2>
                            <p class="ev-mypage-user-email">${myPageDto.email}</p>
                            <c:choose>
                                <c:when test="${myPageDto.role eq 'ADMIN'}">
                                    <span class="ev-mypage-badge ev-mypage-badge-admin">관리자</span>
                                </c:when>
                                <c:otherwise>
                                    <span class="ev-mypage-badge ev-mypage-badge-user">일반 회원</span>
                                </c:otherwise>
                            </c:choose>
                        </div>
                        
                        <div class="ev-mypage-divider"></div>
                        
                        <div class="ev-mypage-info-group">
                            <div class="ev-mypage-info-row">
                                <span class="ev-mypage-info-label">📞 전화번호</span>
                                <span class="ev-mypage-info-value">${myPageDto.phone}</span>
                            </div>
                            <div class="ev-mypage-info-row">
                                <span class="ev-mypage-info-label">📅 가입일</span>
                                <span class="ev-mypage-info-value">${fn:substring(myPageDto.createdAt, 0, 10)}</span>
                            </div>
                        </div>
                        
                        <a href="${pageContext.request.contextPath}/mypage/edit" class="ev-btn ev-btn-outline ev-mypage-edit-btn">
                            ✏️ 정보 수정
                        </a>
                    </div>
                    
                    <div class="ev-mypage-profile-box ev-mypage-stats-box">
                        <h3 class="ev-mypage-stats-title">📊 충전 통계</h3>
                        <div class="ev-mypage-stats-group">
                            <div class="ev-mypage-info-row">
                                <span class="ev-mypage-info-label">총 충전 횟수</span>
                                <span class="ev-mypage-stats-value">${myPageDto.totalChargeCount}회</span>
                            </div>
                            <div class="ev-mypage-info-row">
                                <span class="ev-mypage-info-label">총 충전량</span>
                                <span class="ev-mypage-stats-value">${myPageDto.totalChargeKw} kWh</span>
                            </div>
                            <div class="ev-mypage-info-row">
                                <span class="ev-mypage-info-label">절약한 탄소</span>
                                <span class="ev-mypage-stats-carbon">${myPageDto.savedCarbon} kg</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="ev-mypage-content-area">
                    
                    <div class="ev-mypage-tab-header">
                        
                        <div class="ev-mypage-tab-bar">
                            <a href="${pageContext.request.contextPath}/mypage?tab=upcoming" class="ev-mypage-tab-link ${param.tab eq 'vehicle' || currentTab eq 'past' ? 'ev-mypage-tab-inactive' : 'ev-mypage-tab-active'}">
                                예정 예약 
                                <c:if test="${upcomingCount > 0}">
                                    <span class="ev-mypage-tab-count">${upcomingCount}</span>
                                </c:if>
                            </a>
                            <a href="${pageContext.request.contextPath}/mypage?tab=past" class="ev-mypage-tab-link ${currentTab eq 'past' ? 'ev-mypage-tab-active' : 'ev-mypage-tab-inactive'}">
                                지난 예약
                            </a>
                            <a href="${pageContext.request.contextPath}/mypage?tab=vehicle" class="ev-mypage-tab-link ${param.tab eq 'vehicle' ? 'ev-mypage-tab-active' : 'ev-mypage-tab-inactive'}">
                                🚘 차량 관리
                            </a>
                        </div>

                        <c:if test="${param.tab eq 'vehicle'}">
                            <button type="button" class="ev-btn ev-btn-primary ev-vehicle-top-btn" onclick="openVehicleModal()">+ 새 차량 등록</button>
                        </c:if>
                        
                    </div> 
                    
                    <div class="ev-mypage-dynamic-body">
                        <c:choose>
                            <%-- 🟢 1. 차량 관리 탭 --%>
                            <c:when test="${param.tab eq 'vehicle'}">
                                <div id="vehicleListContainer" class="ev-vehicle-grid">
                                    <div class="ev-mypage-empty-box" style="grid-column: 1 / -1;">
                                        <span class="ev-mypage-empty-icon">🚗</span>
                                        <p class="ev-mypage-empty-text">보유하신 차량 정보를 불러오는 중입니다...</p>
                                    </div>
                                </div>
                            </c:when>

                            <%-- 🟢 2. 예약 내역 탭 --%>
                            <c:otherwise>
                                <div class="ev-mypage-history-list">
                                    <c:choose>
                                        <c:when test="${not empty reservationList}">
                                            <c:forEach var="res" items="${reservationList}">
                                                <div class="ev-mypage-history-card">
                                                    
                                                    <div class="ev-mypage-card-header">
                                                        <div>
                                                            <h4 class="ev-mypage-station-name">${res.stationName}</h4>
                                                            <p class="ev-mypage-res-number">예약번호: R${res.reservationId}</p>
                                                        </div>
                                                        
                                                        <span class="ev-mypage-status-badge">
                                                            <c:choose>
                                                                <c:when test="${res.status eq 'RESERVED' and currentTab eq 'past'}">
                                                                    <span style="color: #ef4444;">기간 만료</span>
                                                                </c:when>
                                                                <c:when test="${res.status eq 'RESERVED'}">
                                                                    예약 확정
                                                                </c:when>
                                                                <c:otherwise>
                                                                    ${res.status}
                                                                </c:otherwise>
                                                            </c:choose>
                                                        </span>
                                                    </div>
                                                    
                                                    <div class="ev-mypage-card-details">
                                                        <c:choose>
                                                            <c:when test="${res.reservationType eq 'TIME'}">
                                                                <p>일시: <fmt:formatDate value="${res.startTime}" pattern="yyyy-MM-dd HH:mm"/> ~ <fmt:formatDate value="${res.endTime}" pattern="HH:mm"/></p>
                                                            </c:when>
                                                            <c:otherwise>
                                                                <p>목표 충전량: ${res.targetAmount} kWh</p>
                                                                <p>예상 일시: <fmt:formatDate value="${res.startTime}" pattern="yyyy-MM-dd HH:mm"/> ~ <fmt:formatDate value="${res.endTime}" pattern="HH:mm"/></p>
                                                            </c:otherwise>
                                                        </c:choose>
                                                        
                                                        <p class="ev-mypage-charger-type" style="display: flex; align-items: center; margin-top: 4px;">
                                                            <span style="margin-right: 6px;">🔌 충전기 기종:</span>
                                                            <c:choose>
                                                                <c:when test="${res.connectorType == 'DC_COMBO' || res.connectorType == 'CHAdemo' || res.connectorType == 'AC_3PHASE' || res.connectorType == 'RAPID'}">
                                                                    <span style="background-color: #dbeafe; color: #1d4ed8; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 700; margin-right: 6px;">급속</span>
                                                                </c:when>
                                                                <c:otherwise>
                                                                    <span style="background-color: #f3e8ff; color: #7e22ce; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 700; margin-right: 6px;">완속</span>
                                                                </c:otherwise>
                                                            </c:choose>
                                                            <span style="font-weight: 500;">${res.connectorType}</span>
                                                        </p>
                                                    </div>
                                                    
                                                    <c:if test="${res.status eq 'RESERVED' and currentTab ne 'past'}">
                                                        <div class="ev-mypage-action-btns">
                                                            <a href="${pageContext.request.contextPath}/mypage/reservation/edit?id=${res.reservationId}" 
                                                               class="ev-mypage-action-btn ev-mypage-btn-edit">예약 수정</a>
                                                            
                                                            <form action="${pageContext.request.contextPath}/mypage/reservation/cancel" method="post" onsubmit="return confirm('취소하시겠습니까?');" class="ev-mypage-cancel-form">
                                                                <input type="hidden" name="${_csrf.parameterName}" value="${_csrf.token}" />
                                                                <input type="hidden" name="reservationId" value="${res.reservationId}">
                                                                <button type="submit" class="ev-mypage-action-btn ev-mypage-btn-cancel">예약 취소</button>
                                                            </form>
                                                        </div>
                                                    </c:if>
                                                    
                                                </div>
                                            </c:forEach>
                                        </c:when>
                                        <c:otherwise>
                                            <div class="ev-mypage-empty-box">
                                                <span class="ev-mypage-empty-icon">📅</span>
                                                <p class="ev-mypage-empty-text">예정된 예약이 없습니다.</p>
                                                <a href="${pageContext.request.contextPath}/map">
                                                    <button class="ev-btn ev-btn-primary ev-mypage-empty-btn">충전 예약하기 &gt;</button>
                                                </a>
                                            </div>
                                        </c:otherwise>
                                    </c:choose>
                                </div>
                            </c:otherwise>
                        </c:choose>
                    </div>
                </div> 
            </div>
        </div>
    </main>

    <div id="vehicleModal" class="ev-vehicle-modal hidden">
        <div class="ev-vehicle-modal-backdrop" onclick="closeVehicleModal()"></div>
        <div class="ev-vehicle-modal-content">
            <div class="ev-vehicle-modal-header">
                <h2 class="ev-vehicle-modal-title">새 차량 등록</h2>
                <button type="button" class="ev-vehicle-modal-close" onclick="closeVehicleModal()">✕</button>
            </div>
            
            <form id="vehicleRegForm" class="ev-vehicle-form">
                <input type="hidden" name="${_csrf.parameterName}" value="${_csrf.token}" id="csrfToken"/>
                
                <div class="ev-vehicle-form-group">
                    <label class="ev-vehicle-label">제조사 및 모델 선택 <span style="color: #ef4444;">*</span></label>
                    <select id="modelSelect" name="modelId" required class="ev-vehicle-input">
                        <option value="" disabled selected>차량을 선택해 주세요</option>
                    </select>
                </div>

                <div class="ev-vehicle-form-group">
                    <label class="ev-vehicle-label">차량 번호</label>
                    <input type="text" id="carNumber" name="carNumber" placeholder="예) 123가 4567" class="ev-vehicle-input">
                </div>

                <div class="ev-vehicle-form-group">
                    <label class="ev-vehicle-label">차량 별명</label>
                    <input type="text" id="nickname" name="nickname" placeholder="예) 내 붕붕이" class="ev-vehicle-input">
                </div>

                <div class="ev-vehicle-modal-footer">
                    <button type="button" class="ev-btn ev-btn-outline" onclick="closeVehicleModal()">취소</button>
                    <button type="button" class="ev-btn ev-btn-primary" onclick="submitVehicleRegistration()">등록하기</button>
                </div>
            </form>
        </div>
    </div>

    <script>
        window.onload = function() {
            // 알림 메시지 처리
            <c:if test="${not empty message}">alert("${message}");</c:if>
            <c:if test="${not empty error}">alert("${error}");</c:if>
            
            // 🟢 백엔드에서 날아온 통계 데이터 강제 콘솔 출력
            console.log("=== 📊 서버에서 넘어온 통계 데이터 확인 ===");
            console.log("총 횟수: ${myPageDto.totalChargeCount}");
            console.log("총 충전량: ${myPageDto.totalChargeKw}");
            console.log("절약 탄소: ${myPageDto.savedCarbon}");
        };
    </script>
</body>
</html>