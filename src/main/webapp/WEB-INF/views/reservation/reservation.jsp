<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %> <%-- 🌟 이 줄을 추가하세요 --%>

<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>EV 충전 예약</title>

<script src="https://cdn.tailwindcss.com"></script>
<script src="/js/reservation.js" defer></script>

<link rel="stylesheet" href="/css/common.css">
<link rel="stylesheet" href="/css/reservation.css">
</head>

<body class="bg-gray-100">

<jsp:include page="/WEB-INF/views/layout/header.jsp" />

<main class="max-w-5xl mx-auto pt-24 pb-16 px-4">

	<div class="mb-8">
		<h1 class="text-3xl font-bold text-gray-900">충전 예약</h1>
		<p class="text-gray-500 mt-2">충전기를 선택하고 예약을 진행하세요.</p>
	</div>

	<div class="bg-white rounded-xl shadow-sm border p-5 mb-8">
		<div class="flex items-center gap-5 text-sm">
			<div id="ev-step-1" class="ev-step ev-step-on flex items-center gap-2">
				<div class="ev-step-num w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">1</div>
				<span>충전기 선택</span>
			</div>
			<div class="flex-1 h-px bg-gray-200"></div>
			<div id="ev-step-2" class="ev-step flex items-center gap-2">
				<div class="ev-step-num w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">2</div>
				<span>예약 설정</span>
			</div>
			<div class="flex-1 h-px bg-gray-200"></div>
			<div id="ev-step-3" class="ev-step flex items-center gap-2">
				<div class="ev-step-num w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">3</div>
				<span>예약 확인</span>
			</div>
		</div>
	</div>

	<form id="reservationForm" action="/reservation/create" method="post">
		<input type="hidden" name="chargerId" id="chargerId">
		<input type="hidden" name="reservationType" id="reservationType" value="TIME">
		<input type="hidden" name="startTime" id="startTime">
		<input type="hidden" name="endTime" id="endTime">

		<div id="ev-page-1" class="ev-page">
			<h2 class="text-xl font-bold mb-5">충전기 선택</h2>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
			    <c:forEach var="charger" items="${chargerList}">
				    <%-- 상태값을 소문자로 치환하여 대소문자 문제 완전 방어 --%>
				    <c:set var="statusLower" value="${fn:toLowerCase(charger.status)}" />
				
				    <c:choose>
				        <%-- 🌟 변경: 상태가 'maintenance' 이거나 'out_of_service'인 경우 모두 점검 중(회색) 처리 --%>
				        <c:when test="${statusLower eq 'maintenance' or statusLower eq 'out_of_service'}">
				            <div class="border border-gray-300 bg-gray-100 opacity-60 rounded-xl p-5 select-none pointer-events-none">
				                <div class="flex justify-between items-center mb-3">
				                    <h3 class="font-bold text-lg text-gray-500">${charger.connectorType}</h3>
				                    <span class="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-medium">점검 중</span>
				                </div>
				                <p class="text-gray-400 text-sm">${charger.powerKw}kW 충전</p>
				            </div>
				        </c:when>
				
				        <%-- 2. 사용 가능(available) 또는 사용 중(in_use) 상태일 때만 클릭 활성화 --%>
				        <c:otherwise>
				            <div class="border-2 border-gray-200 bg-white rounded-xl p-5 transition ev-charge-card cursor-pointer hover:border-blue-500"
				                 onclick="selectCharger(this, '${charger.id}', '${charger.connectorType}')">
				                <div class="flex justify-between items-center mb-3">
				                    <h3 class="font-bold text-lg text-gray-900">${charger.connectorType}</h3>
				                    
				                    <c:choose>
				                        <c:when test="${statusLower eq 'available'}">
				                            <span class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-medium">사용 가능</span>
				                        </c:when>
				                        <c:when test="${statusLower eq 'in_use'}">
				                            <span class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">사용 중</span>
				                        </c:when>
				                        <c:otherwise>
				                            <span class="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded font-medium">${charger.status}</span>
				                        </c:otherwise>
				                    </c:choose>
				                </div>
				                <p class="text-gray-500 text-sm">${charger.powerKw}kW 충전</p>
				            </div>
				        </c:otherwise>
				    </c:choose>
				</c:forEach>
			</div>

			<div class="flex justify-end mt-6">
				<button type="button" onclick="skipCharger()" class="text-sm text-gray-500 hover:text-blue-600">
					충전기 선택 건너뛰기 →
				</button>
			</div>
		</div>

		<div id="ev-page-2" class="ev-page hidden">
			<h2 class="text-xl font-bold mb-5">예약 설정</h2>

			<div class="bg-white rounded-xl border shadow-sm p-5 mb-5">
				<label class="block font-bold mb-2">예약 날짜</label>
				<input type="date" id="reservationDate" value="${today}" class="border rounded-lg px-4 py-2 w-full">
			</div>

			<div class="grid grid-cols-2 gap-3 mb-5">
				<button type="button" id="btnTime" class="ev-res-type-btn active border rounded-xl py-3 font-bold" onclick="selectReservationType('TIME')">시간 예약</button>
				<button type="button" id="btnTarget" class="ev-res-type-btn border rounded-xl py-3 font-bold" onclick="selectReservationType('TARGET')">목표 충전량</button>
			</div>

			<div id="timeBox" class="bg-white rounded-xl border shadow-sm p-5">
				<h3 class="font-bold mb-4">시간 선택</h3>
				<div class="grid grid-cols-6 gap-2">
					<div class="ev-time-btn border rounded-lg py-2 text-center cursor-pointer" data-time="09:00" onclick="selectTime(this, '09:00')">09:00</div>
					<div class="ev-time-btn border rounded-lg py-2 text-center cursor-pointer" data-time="09:30" onclick="selectTime(this, '09:30')">09:30</div>
					<div class="ev-time-btn border rounded-lg py-2 text-center cursor-pointer" data-time="10:00" onclick="selectTime(this, '10:00')">10:00</div>
					<div class="ev-time-btn border rounded-lg py-2 text-center cursor-pointer" data-time="10:30" onclick="selectTime(this, '10:30')">10:30</div>
					<div class="ev-time-btn border rounded-lg py-2 text-center cursor-pointer" data-time="11:00" onclick="selectTime(this, '11:00')">11:00</div>
					<div class="ev-time-btn border rounded-lg py-2 text-center cursor-pointer" data-time="11:30" onclick="selectTime(this, '11:30')">11:30</div>
					<div class="ev-time-btn border rounded-lg py-2 text-center cursor-pointer" data-time="12:00" onclick="selectTime(this, '12:00')">12:00</div>
					<div class="ev-time-btn border rounded-lg py-2 text-center cursor-pointer" data-time="12:30" onclick="selectTime(this, '12:30')">12:30</div>
					<div class="ev-time-btn border rounded-lg py-2 text-center cursor-pointer" data-time="13:00" onclick="selectTime(this, '13:00')">13:00</div>
					<div class="ev-time-btn border rounded-lg py-2 text-center cursor-pointer" data-time="13:30" onclick="selectTime(this, '13:30')">13:30</div>
					<div class="ev-time-btn border rounded-lg py-2 text-center cursor-pointer" data-time="14:00" onclick="selectTime(this, '14:00')">14:00</div>
					<div class="ev-time-btn border rounded-lg py-2 text-center cursor-pointer" data-time="14:30" onclick="selectTime(this, '14:30')">14:30</div>
					<div class="ev-time-btn border rounded-lg py-2 text-center cursor-pointer" data-time="15:00" onclick="selectTime(this, '15:00')">15:00</div>
					<div class="ev-time-btn border rounded-lg py-2 text-center cursor-pointer" data-time="15:30" onclick="selectTime(this, '15:30')">15:30</div>
					<div class="ev-time-btn border rounded-lg py-2 text-center cursor-pointer" data-time="16:00" onclick="selectTime(this, '16:00')">16:00</div>
					<div class="ev-time-btn border rounded-lg py-2 text-center cursor-pointer" data-time="16:30" onclick="selectTime(this, '16:30')">16:30</div>
					<div class="ev-time-btn border rounded-lg py-2 text-center cursor-pointer" data-time="17:00" onclick="selectTime(this, '17:00')">17:00</div>
					<div class="ev-time-btn border rounded-lg py-2 text-center cursor-pointer" data-time="17:30" onclick="selectTime(this, '17:30')">17:30</div>
					<div class="ev-time-btn border rounded-lg py-2 text-center cursor-pointer" data-time="18:00" onclick="selectTime(this, '18:00')">18:00</div>
					<div class="ev-time-btn border rounded-lg py-2 text-center cursor-pointer" data-time="18:30" onclick="selectTime(this, '18:30')">18:30</div>
					<div class="ev-time-btn border rounded-lg py-2 text-center cursor-pointer" data-time="19:00" onclick="selectTime(this, '19:00')">19:00</div>
					<div class="ev-time-btn border rounded-lg py-2 text-center cursor-pointer" data-time="19:30" onclick="selectTime(this, '19:30')">19:30</div>
					<div class="ev-time-btn border rounded-lg py-2 text-center cursor-pointer" data-time="20:00" onclick="selectTime(this, '20:00')">20:00</div>
					<div class="ev-time-btn border rounded-lg py-2 text-center cursor-pointer" data-time="20:30" onclick="selectTime(this, '20:30')">20:30</div>
					<div class="ev-time-btn border rounded-lg py-2 text-center cursor-pointer" data-time="21:00" onclick="selectTime(this, '21:00')">21:00</div>
					<div class="ev-time-btn border rounded-lg py-2 text-center cursor-pointer" data-time="21:30" onclick="selectTime(this, '21:30')">21:30</div>
					<div class="ev-time-btn border rounded-lg py-2 text-center cursor-pointer" data-time="22:00" onclick="selectTime(this, '22:00')">22:00</div>
					<div class="ev-time-btn border rounded-lg py-2 text-center cursor-pointer" data-time="22:30" onclick="selectTime(this, '22:30')">22:30</div>
					<div class="ev-time-btn border rounded-lg py-2 text-center cursor-pointer" data-time="23:00" onclick="selectTime(this, '23:00')">23:00</div>
					<div class="ev-time-btn border rounded-lg py-2 text-center cursor-pointer" data-time="23:30" onclick="selectTime(this, '23:30')">23:30</div>
				</div>
			</div>

			<div id="targetBox" class="bg-white rounded-xl border shadow-sm p-5 hidden">
				<h3 class="font-bold mb-5">목표 충전량 설정</h3>
				<div class="mb-4">
					<div class="flex justify-between items-center mb-2">
						<span class="text-sm text-gray-500">목표 충전 퍼센트</span>
						<span id="targetPercentText" class="font-bold text-blue-600 text-lg">50%</span>
					</div>
					<input type="range" id="targetPercent" name="targetKwh" min="5" max="100" step="5" value="50" oninput="changeTargetPercent(this.value)" class="w-full h-2 rounded-lg cursor-pointer">
				</div>
				<div>
					<p class="text-sm text-gray-500 mb-3">빠른 선택</p>
					<div class="grid grid-cols-5 gap-2">
						<button type="button" onclick="quickTarget(20)" class="border rounded-lg py-2 text-sm hover:bg-blue-50">20%</button>
						<button type="button" onclick="quickTarget(40)" class="border rounded-lg py-2 text-sm hover:bg-blue-50">40%</button>
						<button type="button" onclick="quickTarget(60)" class="border rounded-lg py-2 text-sm hover:bg-blue-50">60%</button>
						<button type="button" onclick="quickTarget(80)" class="border rounded-lg py-2 text-sm hover:bg-blue-50">80%</button>
						<button type="button" onclick="quickTarget(100)" class="border rounded-lg py-2 text-sm hover:bg-blue-50">100%</button>
					</div>
				</div>
			</div>

			<div class="mt-6 flex justify-between">
				<button type="button" onclick="prevStep(1)" class="border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-bold">이전 단계</button>
				<button type="button" onclick="moveStep(3)" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold">다음 단계</button>
			</div>
		</div>

		<div id="ev-page-3" class="ev-page hidden">
			<h2 class="text-xl font-bold mb-5">예약 확인</h2>
			<div class="bg-white rounded-xl border shadow-sm overflow-hidden">
				<table class="w-full">
					<tr class="border-b">
						<td class="p-4 font-bold bg-gray-50 w-40">충전기</td>
						<td class="p-4" id="summaryCharger">-</td>
					</tr>
					<tr>
						<td class="p-4 font-bold bg-gray-50">예약 정보</td>
						<td class="p-4" id="summaryReserve">-</td>
					</tr>
				</table>
			</div>

			<div class="mt-6 flex justify-between">
				<button type="button" onclick="prevStep(2)" class="border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-bold">이전 단계</button>
				<button type="button" onclick="submitReservation()" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold">예약 확정</button>
			</div>
		</div>
	</form>
</main>

</body>
</html>