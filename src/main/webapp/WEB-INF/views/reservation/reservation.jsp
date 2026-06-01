<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>

<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>EV 충전 예약</title>
<link rel="stylesheet" href="${pageContext.request.contextPath}/css/common.css">
<link rel="stylesheet" href="${pageContext.request.contextPath}/css/reservation.css">
<script src="${pageContext.request.contextPath}/js/reservation.js" defer></script>
</head>

<c:if test="${selectedStationId != null}">
<script>
window.addEventListener("DOMContentLoaded", async function() {
    var targetStationId = '${selectedStationId}';
    var targetMetro = '${selectedMetro}';
    var targetCity = '${selectedCity}';

    // initRegionFilters 완료 대기
    await initRegionFilters();

    // 시/도 세팅
    if (targetMetro) {
        var sidoSelect = document.getElementById('filterSido');
        if (sidoSelect) {
            sidoSelect.value = targetMetro;

            // 시/군/구 로드 완료 후 세팅
            await loadSigunguBySido(targetMetro);
            if (targetCity) {
                var sigunguSelect = document.getElementById('filterSigungu');
                if (sigunguSelect) {
                    sigunguSelect.value = targetCity;
                }
            }

            // 필터 적용해서 충전소 목록 갱신
            await fetchFilteredStations();
        }
    }

    var observer = new MutationObserver(function() {
        var cards = document.querySelectorAll('#stationListContainer .station-card');
        if (cards.length > 0) {
            setTimeout(function() {
                var cards2 = document.querySelectorAll('#stationListContainer .station-card');
                cards2.forEach(function(card) {
                    var onclick = card.getAttribute('onclick') || '';
                    if (onclick.includes("'" + targetStationId + "'")) {
                        card.classList.add('active');
                        loadChargers(targetStationId, card);
                        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        observer.disconnect();
                    }
                });
            }, 500);
        }
    });

    observer.observe(document.getElementById('stationListContainer'), { childList: true });
});
</script>
</c:if>

</head>

<body> 
<body> 
<jsp:include page="/WEB-INF/views/layout/header.jsp" />
    <main class="ev-reservation-wrapper">
    
	    <div class="ev-container ev-reservation-container">
	        <div class="ev-reservation-header">
	            <h1 class="ev-reservation-title">충전 예약</h1>
	            <p class="ev-reservation-subtitle">원하는 충전소와 시간을 선택하여 예약하세요</p>
	        </div>
	        
	        <div class="ev-step-container w-full"></div>
	
	        <div class="ev-step-wrapper">
	            <div class="ev-step-indicator">
	                <div id="ev-step-1" class="ev-step ev-step-on">
	                    <div class="ev-step-num">1</div>
	                    <span>충전소/충전기 선택</span>
	                </div>
	                <div class="ev-step-line"></div>
	                
	                <div id="ev-step-2" class="ev-step">
	                    <div class="ev-step-num">2</div>
	                    <span>예약 설정</span>
	                </div>
	                <div class="ev-step-line"></div>
	                
	                <div id="ev-step-3" class="ev-step">
	                    <div class="ev-step-num">3</div>
	                    <span>예약 확인</span>
	                </div>
	            </div>
	        </div>
	
	        <form id="reservationForm" action="/reservation/create" method="post">
	            <input type="hidden" name="chargerId" id="chargerId">
	            <input type="hidden" name="reservationType" id="reservationType" value="TIME">
	            <input type="hidden" name="startTime" id="startTime">
	            <input type="hidden" name="endTime" id="endTime">
	            <input type="hidden" id="userBatteryCapacity" value="${primaryVehicle.batteryCapacity != null ? primaryVehicle.batteryCapacity : 70.0}">
				<input type="hidden" id="userConnectorType" value="${primaryVehicle.connectorType}">
				<input type="hidden" id="carBatteryCapacity" value="${myVehicle.batteryCapacity}">
	
	            <div id="ev-page-1" class="ev-page">
                
                <div class="ev-reservation-filter-box" style="background: white; border-radius: 1rem; border: 1px solid #e5e7eb; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                    <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: flex-end;">
                        <div style="flex: 1; min-width: 140px;">
                            <label for="filterSido" style="display: block; font-size: 0.875rem; font-weight: 600; color: #374151; margin-bottom: 0.5rem;">시/도</label>
                            <select id="filterSido" class="ev-input" style="width: 100%; cursor: pointer;">
                                <option value="">전체 시/도</option>
                            </select>
                        </div>
                        
                        <div style="flex: 1; min-width: 140px;">
                            <label for="filterSigungu" style="display: block; font-size: 0.875rem; font-weight: 600; color: #374151; margin-bottom: 0.5rem;">시/군/구</label>
                            <select id="filterSigungu" class="ev-input" disabled style="width: 100%; cursor: pointer;">
                                <option value="">시/도를 먼저 선택</option>
                            </select>
                        </div>
                        
                        <div style="flex: 1; min-width: 140px;">
                            <label for="filterSpeed" style="display: block; font-size: 0.875rem; font-weight: 600; color: #374151; margin-bottom: 0.5rem;">충전속도</label>
                            <select id="filterSpeed" class="ev-input" style="width: 100%; cursor: pointer;">
                                <option value="ALL">전체 (급속 + 완속)</option>
                                <option value="RAPID">급속</option>
                                <option value="SLOW">완속</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="ev-panel-layout">
                    <div class="ev-panel ev-panel-side">
                        <h2 class="ev-panel-title">충전소 선택</h2>
                        <div class="ev-station-list" id="stationListContainer">
                            <div style="text-align: center; padding: 3rem 1rem; color: #9ca3af; font-weight: 500;">필터를 선택하여 충전소를 조회하세요.</div>
                        </div>
                    </div>
                    
                    <div class="ev-panel ev-panel-main">
                        <h2 class="ev-panel-title">충전기 선택</h2>
                        <div id="chargerListContainer" class="ev-charger-grid">
                            <div class="charger-empty">충전소를 선택해주세요.</div>
                        </div>
                    </div>
                </div>

            </div>

	            <div id="ev-page-2" class="ev-page hidden ev-page-wrapper">
	                <h2 class="ev-section-title">예약 세부 설정</h2>
	                
	                <div class="ev-box mb-box">
	                    <label class="ev-label">예약 날짜</label>
	                    <input type="date" id="reservationDate" value="${today}" class="ev-input">
	                </div>
	                
	                <div class="ev-btn-grid mb-box">
	                    <button type="button" id="btnTime" class="ev-res-type-btn active" onclick="selectReservationType('TIME')">시간 지정 예약</button>
	                    <button type="button" id="btnTarget" class="ev-res-type-btn" onclick="selectReservationType('TARGET')">목표 충전량 설정</button>
	                </div>
	                
	                <div id="timeBox" class="ev-box">
	                    <h3 class="ev-box-title">타임 슬롯 선택</h3>
	                    <div class="time-slot-grid">
	                        <div class="ev-time-btn" data-time="00:30" onclick="selectTime(this, '00:30')">00:30</div>
	                        <div class="ev-time-btn" data-time="01:00" onclick="selectTime(this, '01:00')">01:00</div>
	                        <div class="ev-time-btn" data-time="01:30" onclick="selectTime(this, '01:30')">01:30</div>
	                        <div class="ev-time-btn" data-time="02:00" onclick="selectTime(this, '02:00')">02:00</div>
	                        <div class="ev-time-btn" data-time="02:30" onclick="selectTime(this, '02:30')">02:30</div>
	                        <div class="ev-time-btn" data-time="03:00" onclick="selectTime(this, '03:00')">03:00</div>
	                        <div class="ev-time-btn" data-time="03:30" onclick="selectTime(this, '03:30')">03:30</div>
	                        <div class="ev-time-btn" data-time="04:00" onclick="selectTime(this, '04:00')">04:00</div>
	                        <div class="ev-time-btn" data-time="04:30" onclick="selectTime(this, '04:30')">04:30</div>
	                        <div class="ev-time-btn" data-time="05:00" onclick="selectTime(this, '05:00')">05:00</div>
	                        <div class="ev-time-btn" data-time="05:30" onclick="selectTime(this, '05:30')">05:30</div>
	                        <div class="ev-time-btn" data-time="06:00" onclick="selectTime(this, '06:00')">06:00</div>
	                        <div class="ev-time-btn" data-time="06:30" onclick="selectTime(this, '06:30')">06:30</div>
	                        <div class="ev-time-btn" data-time="07:00" onclick="selectTime(this, '07:00')">07:00</div>
	                        <div class="ev-time-btn" data-time="07:30" onclick="selectTime(this, '07:30')">07:30</div>
	                        <div class="ev-time-btn" data-time="08:00" onclick="selectTime(this, '08:00')">08:00</div>
	                        <div class="ev-time-btn" data-time="08:30" onclick="selectTime(this, '08:30')">08:30</div>
	                        <div class="ev-time-btn" data-time="09:00" onclick="selectTime(this, '09:00')">09:00</div>
	                        <div class="ev-time-btn" data-time="09:30" onclick="selectTime(this, '09:30')">09:30</div>
	                        <div class="ev-time-btn" data-time="10:00" onclick="selectTime(this, '10:00')">10:00</div>
	                        <div class="ev-time-btn" data-time="10:30" onclick="selectTime(this, '10:30')">10:30</div>
	                        <div class="ev-time-btn" data-time="11:00" onclick="selectTime(this, '11:00')">11:00</div>
	                        <div class="ev-time-btn" data-time="11:30" onclick="selectTime(this, '11:30')">11:30</div>
	                        <div class="ev-time-btn" data-time="12:00" onclick="selectTime(this, '12:00')">12:00</div>
	                        <div class="ev-time-btn" data-time="12:30" onclick="selectTime(this, '12:30')">12:30</div>
	                        <div class="ev-time-btn" data-time="13:00" onclick="selectTime(this, '13:00')">13:00</div>
	                        <div class="ev-time-btn" data-time="13:30" onclick="selectTime(this, '13:30')">13:30</div>
	                        <div class="ev-time-btn" data-time="14:00" onclick="selectTime(this, '14:00')">14:00</div>
	                        <div class="ev-time-btn" data-time="14:30" onclick="selectTime(this, '14:30')">14:30</div>
	                        <div class="ev-time-btn" data-time="15:00" onclick="selectTime(this, '15:00')">15:00</div>
	                        <div class="ev-time-btn" data-time="15:30" onclick="selectTime(this, '15:30')">15:30</div>
	                        <div class="ev-time-btn" data-time="16:00" onclick="selectTime(this, '16:00')">16:00</div>
	                        <div class="ev-time-btn" data-time="16:30" onclick="selectTime(this, '16:30')">16:30</div>
	                        <div class="ev-time-btn" data-time="17:00" onclick="selectTime(this, '17:00')">17:00</div>
	                        <div class="ev-time-btn" data-time="17:30" onclick="selectTime(this, '17:30')">17:30</div>
	                        <div class="ev-time-btn" data-time="18:00" onclick="selectTime(this, '18:00')">18:00</div>
	                        <div class="ev-time-btn" data-time="18:30" onclick="selectTime(this, '18:30')">18:30</div>
	                        <div class="ev-time-btn" data-time="19:00" onclick="selectTime(this, '19:00')">19:00</div>
	                        <div class="ev-time-btn" data-time="19:30" onclick="selectTime(this, '19:30')">19:30</div>
	                        <div class="ev-time-btn" data-time="20:00" onclick="selectTime(this, '20:00')">20:00</div>
	                        <div class="ev-time-btn" data-time="20:30" onclick="selectTime(this, '20:30')">20:30</div>
	                        <div class="ev-time-btn" data-time="21:00" onclick="selectTime(this, '21:00')">21:00</div>
	                        <div class="ev-time-btn" data-time="21:30" onclick="selectTime(this, '21:30')">21:30</div>
	                        <div class="ev-time-btn" data-time="22:00" onclick="selectTime(this, '22:00')">22:00</div>
	                        <div class="ev-time-btn" data-time="22:30" onclick="selectTime(this, '22:30')">22:30</div>
	                        <div class="ev-time-btn" data-time="23:00" onclick="selectTime(this, '23:00')">23:00</div>
	                        <div class="ev-time-btn" data-time="23:30" onclick="selectTime(this, '23:30')">23:30</div>
	                        <div class="ev-time-btn" data-time="24:00" onclick="selectTime(this, '24:00')">24:00</div>
	                    </div>
	                </div>
	
	                <div id="targetBox" class="ev-box mt-box hidden">
	                    <h3 class="ev-box-title">목표 충전량 설정</h3>
	                    <div class="mb-3">
	                        <div class="target-header">
	                            <span class="target-label">목표 충전 범위</span>
	                            <span id="targetPercentText" class="target-value">20%</span>
	                        </div>
	                        <input type="range" id="targetPercent" name="targetPercent" min="0" max="100" step="5" value="20" class="ev-range-slider">
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
	
	                <div class="ev-nav-buttons">
	                    <button type="button" onclick="moveStep(1)" class="btn-prev">이전 단계</button>
	                    <button type="button" onclick="moveStep(3)" class="btn-next">다음 단계</button>
	                </div>
	            </div>
	
	            <div id="ev-page-3" class="ev-page hidden ev-page-wrapper-sm">
	                <h2 class="ev-section-title">최종 예약 내용 확인</h2>
	                <div class="summary-table-container">
	                    <table class="summary-table">
	                        <tr>
	                            <td class="th-style">선택 충전기</td>
	                            <td class="td-style" id="summaryCharger">-</td>
	                        </tr>
	                        <tr>
	                            <td class="th-style">예약 날짜</td>
	                            <td class="td-style" id="summaryDate">-</td>
	                        </tr>
	                        <tr>
	                            <td class="th-style">지정 시간</td>
	                            <td class="td-style val-time" id="summaryTime">-</td>
	                        </tr>
	                        <tr>
	                            <td class="th-style">목표 충전량</td>
	                            <td class="td-style val-target" id="summaryTarget">-</td>
	                        </tr>
	                    </table>
	                </div>
	                <div class="ev-nav-buttons">
	                    <button type="button" onclick="moveStep(2)" class="btn-prev">이전 단계</button>
	                    <button type="button" onclick="submitReservation()" class="btn-next">예약 확정</button>
	                </div>
	            </div>
	        </form>
	    </div>
    </main>
</body>
</html>