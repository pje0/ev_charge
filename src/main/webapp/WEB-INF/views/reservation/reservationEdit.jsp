<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>

<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>EV 충전 예약 수정</title>
<link rel="stylesheet" href="${pageContext.request.contextPath}/css/common.css">
<link rel="stylesheet" href="${pageContext.request.contextPath}/css/reservation.css">
<script src="${pageContext.request.contextPath}/js/reservationEdit.js" defer></script>
</head>
<body class="bg-gray-50 text-sm"> 
    <jsp:include page="/WEB-INF/views/layout/header.jsp" />

    <main class="ev-reservation-wrapper">
        <div class="ev-container ev-reservation-container">
            <div class="ev-reservation-header">
                <h1 class="ev-reservation-title">예약 시간 변경</h1>
                <p class="ev-reservation-subtitle">기존에 예약하신 일정을 변경하실 수 있습니다.</p>
            </div>

            <form id="reservationEditForm">
                <input type="hidden" name="id" id="editReservationId" value="${res.id}">
                <input type="hidden" name="chargerId" id="chargerId" value="${res.chargerId}">
                <input type="hidden" name="stationId" id="stationId" value="${res.stationId}">
                
                <input type="hidden" name="reservationType" id="reservationType" value="${res.reservationType}">
                <input type="hidden" name="startTime" id="startTime" value="<fmt:formatDate value='${res.startTime}' pattern='yyyy-MM-dd HH:mm:00'/>">
                <input type="hidden" name="endTime" id="endTime" value="<fmt:formatDate value='${res.endTime}' pattern='yyyy-MM-dd HH:mm:00'/>">
                <input type="hidden" id="initialTargetPercent" value="${res.targetPercent != null ? res.targetPercent : 0}">
                
                <input type="hidden" id="chargerKwHidden" value="${res.powerKw != null ? res.powerKw : 50.0}">

                <div class="ev-page-wrapper">
                    <div class="ev-box mb-box" style="background-color: #f8fafc; border-color: #cbd5e1;">
                        <h3 class="ev-box-title" style="margin-bottom: 4px;">예약 충전기 정보</h3>
                        <p style="font-size: 14px; font-weight: 700; margin: 0; color: #334155;">
                            ${res.stationName} - ${res.connectorType}
                        </p>
                    </div>

                    <div class="ev-box mb-box">
                        <label class="ev-label">변경할 날짜</label>
                        <input type="date" id="reservationDate" 
                               value="<fmt:formatDate value='${res.startTime}' pattern='yyyy-MM-dd'/>" 
                               min="${today}" class="ev-input">
                    </div>
                    
                    <div class="ev-btn-grid mb-box">
                        <button type="button" id="btnTime" class="ev-res-type-btn ${res.reservationType == 'TIME' ? 'active' : ''}" onclick="selectReservationType('TIME')">시간 지정 예약</button>
                        <button type="button" id="btnTarget" class="ev-res-type-btn ${res.reservationType == 'TARGET' ? 'active' : ''}" onclick="selectReservationType('TARGET')">목표 충전량 설정</button>
                    </div>
                    
                    <div id="timeBox" class="ev-box ${res.reservationType == 'TARGET' ? 'hidden' : ''}">
                        <h3 class="ev-box-title">타임 슬롯 선택</h3>
                        <div class="time-slot-grid" id="editTimeSlotGrid">
                            </div>
                    </div>

                    <div id="targetBox" class="ev-box mt-box ${res.reservationType == 'TIME' ? 'hidden' : ''}">
                        <h3 class="ev-box-title">목표 충전량 설정</h3>
                        <div class="mb-3">
                            <div class="target-header">
                                <span class="target-label">목표 충전 범위</span>
                                <span id="targetPercentText" class="target-value">
                                    ${res.targetPercent != null ? res.targetPercent : 0}%
                                </span>
                            </div>
                            <input type="range" id="targetPercent" min="0" max="100" step="5" 
                                   value="${res.targetPercent != null ? res.targetPercent : 0}" class="ev-range-slider">
                        </div>
                        <div>
                            <div class="quick-target-grid">
                                <button type="button" onclick="quickTarget(20)" class="btn-quick-target">20%</button>
                                <button type="button" onclick="quickTarget(40)" class="btn-quick-target">40%</button>
                                <button type="button" onclick="quickTarget(60)" class="btn-quick-target">60%</button>
                                <button type="button" onclick="quickTarget(80)" class="btn-quick-target">80%</button>
                                <button type="button" onclick="quickTarget(100)" class="btn-quick-target">100%</button>
                            </div>
                        </div>
                    </div>

                    <div class="ev-nav-buttons" style="margin-top: 24px;">
                        <button type="button" onclick="location.href='/mypage'" class="btn-prev">수정 취소</button>
                        <button type="button" onclick="submitReservationEdit()" class="btn-next">변경사항 저장</button>
                    </div>
                </div>
            </form>
        </div>
    </main>
</body>
</html>