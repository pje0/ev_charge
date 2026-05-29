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
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/reservationEdit.css">
    <script src="${pageContext.request.contextPath}/js/reservationEdit.js" defer></script>
</head>
<body class="bg-gray-50 text-sm"> 
    <jsp:include page="/WEB-INF/views/layout/header.jsp" />

    <main class="ev-reservationEdit-wrapper">
        <div class="ev-container ev-reservationEdit-container">
            
            <div class="ev-reservationEdit-header">
                <h1 class="ev-reservationEdit-title">예약 시간 변경</h1>
                <p class="ev-reservationEdit-subtitle">기존에 예약하신 일정을 변경하실 수 있습니다.</p>
            </div>

            <form id="reservationEditForm">
                <input type="hidden" name="reservationId" id="editReservationId" value="${reservation.reservationId}">
                <input type="hidden" name="chargerId" id="chargerId" value="${reservation.chargerId}">
                <input type="hidden" name="stationId" id="stationId" value="${reservation.stationId}">
                <input type="hidden" name="reservationType" id="reservationType" value="${reservation.reservationType}">
                
                <input type="hidden" id="chargerConnector" value="${reservation.connectorType}">
                <input type="hidden" id="carConnector" value="${reservation.carConnectorType}">
                
                <input type="hidden" name="editStartTime" id="startTime" value="<fmt:formatDate value='${reservation.startTime}' pattern='yyyy-MM-dd HH:mm:00'/>">
                <input type="hidden" name="editEndTime" id="endTime" value="<fmt:formatDate value='${reservation.endTime}' pattern='yyyy-MM-dd HH:mm:00'/>">
                
                <input type="hidden" id="carBatteryCapacity" value="${reservation.batteryCapacity != null ? reservation.batteryCapacity : 70.0}">
                
                <input type="hidden" id="initialTargetPercent" value="<fmt:formatNumber value='${reservation.targetAmount != null && reservation.batteryCapacity != null ? (reservation.targetAmount * 100 / reservation.batteryCapacity) : 0}' maxFractionDigits='0'/>">
                <input type="hidden" id="chargerKwHidden" value="${reservation.powerKw != null ? reservation.powerKw : 50.0}">

                <div class="ev-page-wrapper">
                    
                    <div class="ev-box mb-box ev-reservationEdit-info-box">
                        <div class="ev-reservationEdit-info-header">
                            <h3 class="ev-box-title ev-reservationEdit-info-title">📋 기존 예약 정보</h3>
                            <span class="ev-reservationEdit-info-badge">
                                예약번호: R${reservation.reservationId}
                            </span>
                        </div>
                        
                        <div class="ev-reservationEdit-info-grid">
                            <div class="ev-reservationEdit-info-item">
                                <span class="ev-reservationEdit-info-label">📍 충전소 및 기종</span>
                                <span class="ev-reservationEdit-info-value">${reservation.stationName} (${reservation.connectorType})</span>
                            </div>
                            
                            <div class="ev-reservationEdit-info-item">
                                <span class="ev-reservationEdit-info-label">🕒 예약 시간</span>
                                <span class="ev-reservationEdit-info-value">
                                    <fmt:formatDate value="${reservation.startTime}" pattern="yyyy-MM-dd HH:mm"/> ~ <fmt:formatDate value="${reservation.endTime}" pattern="HH:mm"/>
                                </span>
                            </div>
                            
                            <c:if test="${reservation.reservationType == 'TARGET'}">
                                <div class="ev-reservationEdit-info-target">
                                    <span class="ev-reservationEdit-info-target-label">⚡ 목표 충전량:</span>
                                    <span class="ev-reservationEdit-info-target-value">${reservation.targetAmount} kWh</span>
                                </div>
                            </c:if>
                        </div>
                    </div>

                    <div class="ev-box mb-box">
                        <label class="ev-label">변경할 날짜</label>
                        <input type="date" id="reservationDate" 
                               value="<fmt:formatDate value='${reservation.startTime}' pattern='yyyy-MM-dd'/>" 
                               min="${today}" class="ev-input">
                    </div>
                    
                    <div class="ev-btn-grid mb-box">
                        <button type="button" id="btnTime" class="ev-res-type-btn ${reservation.reservationType == 'TIME' ? 'active' : ''}" onclick="selectReservationType('TIME')">시간 지정 예약</button>
                        <button type="button" id="btnTarget" class="ev-res-type-btn ${reservation.reservationType == 'TARGET' ? 'active' : ''}" onclick="selectReservationType('TARGET')">목표 충전량 설정</button>
                    </div>
                    
                    <div id="timeBox" class="ev-box">
                        <h3 class="ev-box-title">타임 슬롯 선택</h3>
                        <div class="time-slot-grid" id="editTimeSlotGrid">
                        </div>
                    </div>

                    <div id="targetBox" class="ev-box mt-box ${reservation.reservationType == 'TIME' ? 'hidden' : ''}">
                        <h3 class="ev-box-title">목표 충전량 설정</h3>
                        <div class="mb-3">
                            <div class="target-header">
                                <span class="target-label">목표 충전 범위</span>
                                <span id="targetPercentText" class="target-value">
                                    0% 
                                </span>
                            </div>
                            <input type="range" id="targetPercent" min="0" max="100" step="5" value="0" class="ev-range-slider">
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

                    <div class="ev-nav-buttons" style="margin-top: 24px; gap: 8px;">
                        <button type="button" onclick="goBackWithCheck()" class="btn-prev" style="margin-right: auto;">수정 취소</button>
                        <button type="button" onclick="resetFormToInitial()" class="btn-prev" style="background-color: #f1f5f9;">🔄 초기화</button>
                        <button type="button" onclick="submitReservationEdit()" class="btn-next">변경사항 저장</button>
                    </div>
                    
                </div>
            </form>
        </div>
    </main>
</body>
</html>