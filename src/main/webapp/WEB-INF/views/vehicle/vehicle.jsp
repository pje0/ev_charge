<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>내 차량 관리 - EV 충전소</title>
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/common.css">
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/vehicle.css">
    <script src="${pageContext.request.contextPath}/js/vehicle.js" defer></script>
</head>
<body class="ev-vehicle-body">
    <jsp:include page="/WEB-INF/views/layout/header.jsp" />

    <main class="ev-vehicle-main">
        <div class="ev-container ev-vehicle-container">
            <div class="ev-vehicle-header">
                <h1 class="ev-vehicle-title">내 차량 관리</h1>
                <p class="ev-vehicle-subtitle">보유하신 전기차를 등록하고 관리하세요.</p>
            </div>

            <div class="ev-vehicle-action-bar">
                <button type="button" class="ev-vehicle-btn ev-vehicle-btn-primary" onclick="openVehicleModal()">
                    + 새 차량 등록하기
                </button>
            </div>

            <div id="vehicleListContainer" class="ev-vehicle-grid">
                <div class="ev-vehicle-empty">
                    <span class="ev-vehicle-empty-icon">🚗</span>
                    <p>등록된 차량 정보를 불러오는 중입니다...</p>
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
                    <button type="button" class="ev-vehicle-btn ev-vehicle-btn-outline" onclick="closeVehicleModal()">취소</button>
                    <button type="button" class="ev-vehicle-btn ev-vehicle-btn-primary" onclick="submitVehicleRegistration()">등록하기</button>
                </div>
            </form>
        </div>
    </div>
</body>
</html> 