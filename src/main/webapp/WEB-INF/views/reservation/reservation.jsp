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

<link rel="stylesheet" href="/css/common.css">

<style>
	.ev-step-on {
		color: #2563eb;
		font-weight: 700;
	}

	.ev-step-on .ev-step-num {
		background-color: #2563eb;
		color: white;
	}

	.ev-time-btn.active {
		background-color: #2563eb;
		color: white;
		border-color: #2563eb;
	}
	
	.ev-time-btn.in-range {
		background-color: #dbeafe;
		color: #1d4ed8;
		border-color: #93c5fd;
	}

	.ev-res-type-btn.active {
		background-color: #2563eb;
		color: white;
	}
	
	.ev-time-btn.disabled {
		background-color: #e5e7eb;
		color: #9ca3af;
		border-color: #d1d5db;
		cursor: not-allowed;
		pointer-events: none;
		opacity: 0.7;
	}
	
	.ev-time-btn.disabled:hover {
		background-color: #e5e7eb;
	}
	
	.ev-time-btn.disabled.active {
		background-color: #e5e7eb !important;
		color: #9ca3af !important;
	}
</style>

<script>

	let selectedChargerId = null;
	let selectedChargerName = null;

	let reservationType = "TIME";
	let startTime = null;
	let endTime = null;

	// 현재 STEP 이동
	function moveStep(step) {
	
	    document.querySelectorAll(".ev-page").forEach(page => {
	        page.classList.add("hidden");
	    });
	
	    document.getElementById("ev-page-" + step).classList.remove("hidden");
	
	    document.querySelectorAll(".ev-step").forEach(stepEl => {
	        stepEl.classList.remove("ev-step-on");
	    });
	
	    for (let i = 1; i <= step; i++) {
	        document.getElementById("ev-step-" + i).classList.add("ev-step-on");
	    }
	
	    if (step === 2) {
	        loadReservedTimes();
	    }
	}

	// 이전 STEP
	function prevStep(step) {
		moveStep(step);
	}

	// 충전기 선택
	function selectCharger(element, chargerId, chargerName) {

	    document.querySelectorAll(".ev-charge-card")
	        .forEach(card => card.classList.remove("active"));
	
	    element.classList.add("active");
	
	    selectedChargerId = Number(chargerId); // 🔥 타입 고정
	
	    selectedChargerName = chargerName;
	
	    document.getElementById("chargerId").value = chargerId;
	
	    document.getElementById("summaryCharger").innerText = chargerName;
	
	    moveStep(2);
	
	    // 🔥 step 렌더 이후 1회만 실행
	    setTimeout(() => {
	        loadReservedTimes();
	    }, 50);
	}

	// 예약 타입 선택
	function selectReservationType(type) {

		reservationType = type;

		document.getElementById("reservationType").value = type;

		document.querySelectorAll(".ev-res-type-btn").forEach(btn => {
			btn.classList.remove("active", "in-range");
		});

		if(type === "TIME") {

			document.getElementById("btnTime").classList.add("active");

			document.getElementById("timeBox").classList.remove("hidden");
			document.getElementById("targetBox").classList.add("hidden");

		} else {

			document.getElementById("btnTarget").classList.add("active");

			document.getElementById("timeBox").classList.add("hidden");
			document.getElementById("targetBox").classList.remove("hidden");
		}
	}

	// 시간 선택
	function selectTime(element, time) {
	    // 이미 disabled된 버튼이면 아무 동작도 하지 않음
	    if (element.classList.contains("disabled")) return;
	
	    if (startTime !== null && endTime !== null) {
	        startTime = null;
	        endTime = null;
	        document.querySelectorAll(".ev-time-btn")
	            .forEach(btn => btn.classList.remove("active", "in-range"));
	    }
	
	    if (startTime === null) {
	        startTime = time;
	        element.classList.add("active");
	        document.getElementById("summaryReserve").innerText = "시작 시간: " + startTime;
	        return;
	    }
	
	    if (startTime === time) {
	        startTime = null;
	        element.classList.remove("active");
	        document.getElementById("summaryReserve").innerText = "-";
	        return;
	    }
	
	    let tempStart = startTime;
	    let tempEnd = time;
	
	    if (time < startTime) {
	        tempEnd = startTime;
	        tempStart = time;
	    }
	
	    // 🔥 시작 시간과 종료 시간 사이에 이미 예약된(disabled) 버튼이 있는지 체크
	    let hasDisabledSlot = false;
	    document.querySelectorAll(".ev-time-btn").forEach(btn => {
	        const t = btn.dataset.time;
	        if (t >= tempStart && t <= tempEnd && btn.classList.contains("disabled")) {
	            hasDisabledSlot = true;
	        }
	    });
	
	    if (hasDisabledSlot) {
	        alert("선택하신 구간 사이에 이미 예약된 시간이 포함되어 있습니다.");
	        return; // 진행을 막음
	    }
	
	    // 검증을 통과하면 최종 적용
	    startTime = tempStart;
	    endTime = tempEnd;
	
	    document.querySelectorAll(".ev-time-btn").forEach(btn => {
	        const t = btn.dataset.time;
	        
	        // disabled 상태가 아닌 버튼들만 스타일 핸들링
	        if (!btn.classList.contains("disabled")) {
	            btn.classList.remove("active", "in-range");
	
	            if (t === startTime || t === endTime) {
	                btn.classList.add("active");
	            }
	            if (t > startTime && t < endTime) {
	                btn.classList.add("in-range");
	            }
	        }
	    });
	
	    const date = document.getElementById("reservationDate").value;
	    document.getElementById("startTime").value = date + " " + startTime + ":00";
	    document.getElementById("endTime").value = date + " " + endTime + ":00";
	
	    document.getElementById("summaryReserve").innerText = startTime + " ~ " + endTime;
	}	

	// 예약 제출
	function submitReservation() {

		// 시간 예약
		if(reservationType === "TIME") {
			if(startTime == null || endTime == null) {
				alert("예약 시간을 선택하세요.");
				return;
			}
		} else {
			document.getElementById("startTime").disabled = true;
			document.getElementById("endTime").disabled = true;
		}
	
		document.getElementById("reservationForm").submit();
	}
	
	// 목표 충전량 슬라이더 변경
	function changeTargetPercent(value) {
		document.getElementById("targetPercentText").innerText = value + "%";
		document.getElementById("summaryReserve").innerText = "목표 충전량 " + value + "%";
	}

	// 빠른 선택 버튼
	function quickTarget(value) {
		document.getElementById("targetPercent").value = value;
		changeTargetPercent(value);
	}
	
	// 충전기 선택 건너뛰기
	function skipCharger() {

	    selectedChargerId = null;
	    selectedChargerName = "미선택";

	    // 선택 스타일 제거
	    document.querySelectorAll(".ev-charge-card").forEach(card => {
	        card.classList.remove("border-blue-600", "bg-blue-50");
	    });

	    // hidden input 초기화
	    document.getElementById("chargerId").value = "";

	    // 요약 변경
	    document.getElementById("summaryCharger").innerText = "충전기 미선택";

	    // STEP1 숨김 / STEP2 표시
	    document.getElementById("ev-page-1").classList.add("hidden");
	    document.getElementById("ev-page-2").classList.remove("hidden");

	    // ===== 🌟 상단 STEP 표시 변경 통일 =====
	    document.querySelectorAll(".ev-step").forEach(stepEl => {
	        stepEl.classList.remove("ev-step-on");
	    });

	    for (let i = 1; i <= 2; i++) {
	        document.getElementById("ev-step-" + i)?.classList.add("ev-step-on");
	    }
	}
	
	// 예약된 시간 조회 + UI 차단
	async function loadReservedTimes() {
	    const chargerId = selectedChargerId;
	    const date = document.getElementById("reservationDate")?.value;

	    console.log("chargerId:", chargerId);
	    console.log("date:", date);

	    // 1. 초기값 방어
	    if (!chargerId || chargerId === "" || !date) {
	        console.warn("early return");
	        return;
	    }

	    // 2. 다른 날짜/충전기 선택 시를 위해 기존disabled 및 이벤트 제거된 상태 초기화
	    document.querySelectorAll(".ev-time-btn").forEach(btn => {
	        btn.classList.remove("disabled");
	        btn.onclick = function() { selectTime(this, this.dataset.time); }; 
	    });

	    try {
	        const url = "/reservation/reserved-times?chargerId=" + chargerId + "&date=" + date;
	        const response = await fetch(url);

	        if (!response.ok) {
	            throw new Error(`서버 에러 발생 (Status: ${response.status})`);
	        }

	        const reservedList = await response.json();

	        if (!Array.isArray(reservedList)) {
	            console.error("서버에서 받은 데이터가 배열 형식이 아닙니다.", reservedList);
	            return;
	        }

	        // 3. 예약된 시간 버튼 비활성화 처리
	        reservedList.forEach(r => {
	            const start = r.startTime.substring(11, 16); 
	            const end = r.endTime.substring(11, 16);

	            document.querySelectorAll(".ev-time-btn").forEach(btn => {
	                const t = btn.dataset.time;

	                if (t >= start && t < end) {
	                    btn.classList.add("disabled");
	                    btn.classList.remove("active", "in-range"); 
	                    btn.onclick = null; 
	                }
	            });
	        });
	        
	    	// 과거 시간 차단 로직
	    	const todayStr = new Date().toISOString().split('T')[0];

	    	if (date === todayStr) {
	    	    const now = new Date();
	    	    const currentHours = now.getHours();
	    	    const currentMinutes = now.getMinutes();

	    	    document.querySelectorAll(".ev-time-btn").forEach(btn => {
	    	        const t = btn.dataset.time; 
	    	        const [h, m] = t.split(":").map(Number);

	    	        if (h < currentHours || (h === currentHours && m < currentMinutes)) {
	    	            btn.classList.add("disabled");
	    	            btn.classList.remove("active", "in-range");
	    	            btn.onclick = null;
	    	        }
	    	    });
	    	}

	    } catch (error) {
	        console.error("예약 시간 로드 중 오류 발생:", error);
	        alert("예약 데이터를 불러오는 중 오류가 발생했습니다. 백엔드 로그를 확인하세요.");
	    }
	}

	// 날짜 변경 시 예약 시간 조회
	window.addEventListener("DOMContentLoaded", () => {
	    const reservationDate = document.getElementById("reservationDate");
	    if (reservationDate) {
	        reservationDate.addEventListener("change", loadReservedTimes);
	    }
	});
	
	function toMinutes(t) {
	    const [h, m] = t.split(":").map(Number);
	    return h * 60 + m;
	}

	function isReservedSlot(time, reservedList) {
	    const t = toMinutes(time);
	    return reservedList.some(r => {
	        const start = toMinutes(r.startTime);
	        const end = toMinutes(r.endTime);
	        return t >= start && t < end;
	    });
	}
</script>

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