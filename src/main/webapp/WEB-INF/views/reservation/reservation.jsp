<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>

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
<body class="bg-gray-50 text-sm"> <jsp:include page="/WEB-INF/views/layout/header.jsp" />

<main class="max-w-6xl mx-auto pt-20 pb-8 px-4">
    
    <div class="mb-8">
        <h1 class="text-2xl font-bold text-gray-900 tracking-tight">충전 예약</h1>
        <p class="text-gray-400 text-xs mt-1">원하는 충전소와 시간을 선택하여 예약하세요</p>
    </div>

    <div class="mb-10">
        <div class="flex items-center justify-center text-xs gap-3 max-w-2xl mx-auto">
            
            <div id="ev-step-1" class="ev-step ev-step-on flex items-center gap-2">
                <div class="ev-step-num w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-medium text-xs">1</div>
                <span class="font-medium text-gray-900">충전소/충전기 선택</span>
            </div>
            <div class="w-16 h-px bg-gray-200"></div>
            
            <div id="ev-step-2" class="ev-step flex items-center gap-2">
                <div class="ev-step-num w-5 h-5 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center font-medium text-xs">2</div>
                <span class="text-gray-400 font-medium">예약 설정</span>
            </div>
            <div class="w-16 h-px bg-gray-200"></div>
            
            <div id="ev-step-3" class="ev-step flex items-center gap-2">
                <div class="ev-step-num w-5 h-5 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center font-medium text-xs">3</div>
                <span class="text-gray-400 font-medium">예약 확인</span>
            </div>

        </div>
    </div>

    <form id="reservationForm" action="/reservation/create" method="post">
        <input type="hidden" name="chargerId" id="chargerId">
        <input type="hidden" name="reservationType" id="reservationType" value="TIME">
        <input type="hidden" name="startTime" id="startTime">
        <input type="hidden" name="endTime" id="endTime">

		<div id="ev-page-1" class="ev-page grid grid-cols-12 gap-4">
            
            <div class="col-span-12 lg:col-span-4 bg-white p-4 rounded-lg border shadow-sm h-[420px] flex flex-col">
                <h2 class="text-base font-bold mb-3 text-gray-800 border-b pb-1.5 flex-none">충전소 선택</h2>
                
                <div class="space-y-2 overflow-y-auto pr-1 flex-1 h-[340px]">
                    <c:forEach var="station" items="${stationList}">
                        <div class="p-3 border border-gray-200 rounded-md cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition" onclick="loadChargers('${station.id}', this)">
                            <h3 class="font-bold text-gray-900 text-sm">${station.name}</h3>
                            <p class="text-xs text-gray-400 mt-0.5 tracking-tight">${station.address}</p>
                        </div>
                    </c:forEach>
                </div>
            </div>
            
            <div class="col-span-12 lg:col-span-8 bg-white p-4 rounded-lg border shadow-sm h-[420px] flex flex-col relative">
                <h2 class="text-base font-bold mb-3 text-gray-800 border-b pb-1.5 flex-none">충전기 선택</h2>
                
                <div id="chargerListContainer" class="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto pr-1 flex-1 h-[320px] content-start">
                    <div class="col-span-2 text-center py-24 text-gray-400 text-xs">충전소를 선택해주세요.</div>
                </div>
            </div>

        </div>

		<div id="ev-page-2" class="ev-page hidden max-w-3xl mx-auto">
            <h2 class="text-base font-bold mb-3 text-gray-800">예약 세부 설정</h2>
            
            <div class="bg-white rounded-lg border shadow-sm p-4 mb-3">
                <label class="block font-bold mb-1.5 text-gray-700 text-xs">예약 날짜</label>
                <input type="date" id="reservationDate" value="${today}" class="border rounded-md px-3 py-1.5 text-sm w-full focus:outline-none focus:border-blue-500">
            </div>
            
            <div class="grid grid-cols-2 gap-2 mb-3">
                <button type="button" id="btnTime" class="ev-res-type-btn active border rounded-lg py-2 text-sm font-bold transition" onclick="selectReservationType('TIME')">시간 지정 예약</button>
                <button type="button" id="btnTarget" class="ev-res-type-btn border rounded-lg py-2 text-sm font-bold transition" onclick="selectReservationType('TARGET')">목표 충전량 설정</button>
            </div>
            
            <div id="timeBox" class="bg-white rounded-lg border shadow-sm p-4">
                <h3 class="font-bold mb-2.5 text-gray-700 text-xs">타임 슬롯 선택</h3>
                <div class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5">
                    <div class="ev-time-btn border rounded py-1 text-xs text-center cursor-pointer select-none transition" data-time="00:30" onclick="selectTime(this, '00:30')">03:30</div>
                    <div class="ev-time-btn border rounded py-1 text-xs text-center cursor-pointer select-none transition" data-time="01:00" onclick="selectTime(this, '01:00')">04:00</div>
                    <div class="ev-time-btn border rounded py-1 text-xs text-center cursor-pointer select-none transition" data-time="01:30" onclick="selectTime(this, '01:30')">04:30</div>
                    <div class="ev-time-btn border rounded py-1 text-xs text-center cursor-pointer select-none transition" data-time="02:00" onclick="selectTime(this, '02:00')">05:00</div>
                    <div class="ev-time-btn border rounded py-1 text-xs text-center cursor-pointer select-none transition" data-time="02:30" onclick="selectTime(this, '02:30')">05:30</div>
                    <div class="ev-time-btn border rounded py-1 text-xs text-center cursor-pointer select-none transition" data-time="03:00" onclick="selectTime(this, '03:00')">03:00</div>
                    <div class="ev-time-btn border rounded py-1 text-xs text-center cursor-pointer select-none transition" data-time="03:30" onclick="selectTime(this, '03:30')">03:30</div>
                    <div class="ev-time-btn border rounded py-1 text-xs text-center cursor-pointer select-none transition" data-time="04:00" onclick="selectTime(this, '04:00')">04:00</div>
                    <div class="ev-time-btn border rounded py-1 text-xs text-center cursor-pointer select-none transition" data-time="04:30" onclick="selectTime(this, '04:30')">04:30</div>
                    <div class="ev-time-btn border rounded py-1 text-xs text-center cursor-pointer select-none transition" data-time="05:00" onclick="selectTime(this, '05:00')">05:00</div>
                    <div class="ev-time-btn border rounded py-1 text-xs text-center cursor-pointer select-none transition" data-time="05:30" onclick="selectTime(this, '05:30')">05:30</div>
                    <div class="ev-time-btn border rounded py-1 text-xs text-center cursor-pointer select-none transition" data-time="06:00" onclick="selectTime(this, '06:00')">06:00</div>
                    <div class="ev-time-btn border rounded py-1 text-xs text-center cursor-pointer select-none transition" data-time="06:30" onclick="selectTime(this, '06:30')">06:30</div>
                    <div class="ev-time-btn border rounded py-1 text-xs text-center cursor-pointer select-none transition" data-time="07:00" onclick="selectTime(this, '07:00')">07:00</div>
                    <div class="ev-time-btn border rounded py-1 text-xs text-center cursor-pointer select-none transition" data-time="07:30" onclick="selectTime(this, '07:30')">07:30</div>
                    <div class="ev-time-btn border rounded py-1 text-xs text-center cursor-pointer select-none transition" data-time="08:00" onclick="selectTime(this, '08:00')">08:00</div>
                    <div class="ev-time-btn border rounded py-1 text-xs text-center cursor-pointer select-none transition" data-time="08:30" onclick="selectTime(this, '08:30')">08:30</div>
                    <div class="ev-time-btn border rounded py-1 text-xs text-center cursor-pointer select-none transition" data-time="09:00" onclick="selectTime(this, '09:00')">09:00</div>
                    <div class="ev-time-btn border rounded py-1 text-xs text-center cursor-pointer select-none transition" data-time="09:30" onclick="selectTime(this, '09:30')">09:30</div>
                    <div class="ev-time-btn border rounded py-1 text-xs text-center cursor-pointer select-none transition" data-time="10:00" onclick="selectTime(this, '10:00')">10:00</div>
                    <div class="ev-time-btn border rounded py-1 text-xs text-center cursor-pointer select-none transition" data-time="10:30" onclick="selectTime(this, '10:30')">10:30</div>
                    <div class="ev-time-btn border rounded py-1 text-xs text-center cursor-pointer select-none transition" data-time="11:00" onclick="selectTime(this, '11:00')">11:00</div>
                    <div class="ev-time-btn border rounded py-1 text-xs text-center cursor-pointer select-none transition" data-time="11:30" onclick="selectTime(this, '11:30')">11:30</div>
                    <div class="ev-time-btn border rounded py-1 text-xs text-center cursor-pointer select-none transition" data-time="12:00" onclick="selectTime(this, '12:00')">12:00</div>
                    <div class="ev-time-btn border rounded py-1 text-xs text-center cursor-pointer select-none transition" data-time="12:30" onclick="selectTime(this, '12:30')">12:30</div>
                    <div class="ev-time-btn border rounded py-1 text-xs text-center cursor-pointer select-none transition" data-time="13:00" onclick="selectTime(this, '13:00')">13:00</div>
                    <div class="ev-time-btn border rounded py-1 text-xs text-center cursor-pointer select-none transition" data-time="13:30" onclick="selectTime(this, '13:30')">13:30</div>
                    <div class="ev-time-btn border rounded py-1 text-xs text-center cursor-pointer select-none transition" data-time="14:00" onclick="selectTime(this, '14:00')">14:00</div>
                    <div class="ev-time-btn border rounded py-1 text-xs text-center cursor-pointer select-none transition" data-time="14:30" onclick="selectTime(this, '14:30')">14:30</div>
                    <div class="ev-time-btn border rounded py-1 text-xs text-center cursor-pointer select-none transition" data-time="15:00" onclick="selectTime(this, '15:00')">15:00</div>
                    <div class="ev-time-btn border rounded py-1 text-xs text-center cursor-pointer select-none transition" data-time="15:30" onclick="selectTime(this, '15:30')">15:30</div>
                    <div class="ev-time-btn border rounded py-1 text-xs text-center cursor-pointer select-none transition" data-time="16:00" onclick="selectTime(this, '16:00')">16:00</div>
                    <div class="ev-time-btn border rounded py-1 text-xs text-center cursor-pointer select-none transition" data-time="16:30" onclick="selectTime(this, '16:30')">16:30</div>
                    <div class="ev-time-btn border rounded py-1 text-xs text-center cursor-pointer select-none transition" data-time="17:00" onclick="selectTime(this, '17:00')">17:00</div>
                    <div class="ev-time-btn border rounded py-1 text-xs text-center cursor-pointer select-none transition" data-time="17:30" onclick="selectTime(this, '17:30')">17:30</div>
                    <div class="ev-time-btn border rounded py-1 text-xs text-center cursor-pointer select-none transition" data-time="18:00" onclick="selectTime(this, '18:00')">18:00</div>
                    <div class="ev-time-btn border rounded py-1 text-xs text-center cursor-pointer select-none transition" data-time="18:30" onclick="selectTime(this, '18:30')">18:30</div>
                    <div class="ev-time-btn border rounded py-1 text-xs text-center cursor-pointer select-none transition" data-time="19:00" onclick="selectTime(this, '19:00')">19:00</div>
                    <div class="ev-time-btn border rounded py-1 text-xs text-center cursor-pointer select-none transition" data-time="19:30" onclick="selectTime(this, '19:30')">19:30</div>
                    <div class="ev-time-btn border rounded py-1 text-xs text-center cursor-pointer select-none transition" data-time="20:00" onclick="selectTime(this, '20:00')">20:00</div>
                    <div class="ev-time-btn border rounded py-1 text-xs text-center cursor-pointer select-none transition" data-time="20:30" onclick="selectTime(this, '20:30')">20:30</div>
                    <div class="ev-time-btn border rounded py-1 text-xs text-center cursor-pointer select-none transition" data-time="21:00" onclick="selectTime(this, '21:00')">21:00</div>
                    <div class="ev-time-btn border rounded py-1 text-xs text-center cursor-pointer select-none transition" data-time="21:30" onclick="selectTime(this, '21:30')">21:30</div>
                    <div class="ev-time-btn border rounded py-1 text-xs text-center cursor-pointer select-none transition" data-time="22:00" onclick="selectTime(this, '22:00')">22:00</div>
                    <div class="ev-time-btn border rounded py-1 text-xs text-center cursor-pointer select-none transition" data-time="22:30" onclick="selectTime(this, '22:30')">22:30</div>
                    <div class="ev-time-btn border rounded py-1 text-xs text-center cursor-pointer select-none transition" data-time="23:00" onclick="selectTime(this, '23:00')">23:00</div>
                    <div class="ev-time-btn border rounded py-1 text-xs text-center cursor-pointer select-none transition" data-time="23:30" onclick="selectTime(this, '23:30')">23:30</div>
                    <div class="ev-time-btn border rounded py-1 text-xs text-center cursor-pointer select-none transition" data-time="24:00" onclick="selectTime(this, '24:00')">24:00</div>
                </div>
            </div>

			<div id="targetBox" class="bg-white rounded-lg border shadow-sm p-4 mt-4 hidden">
			    <h3 class="font-bold mb-3 text-gray-700 text-xs">목표 충전량 설정</h3>
			    <div class="mb-3">
			        <div class="flex justify-between items-center mb-1">
			            <span class="text-xs text-gray-400">목표 충전 범위</span>
			            <span id="targetPercentText" class="font-bold text-blue-600 text-base">20%</span>
			        </div>
			        
			        <input type="range" id="targetPercent" name="targetPercent" min="0" max="100" step="5" value="20" 
			               class="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer focus:outline-none accent-blue-600 m-0 p-0 block"
			               style="-webkit-appearance: none; box-sizing: border-box;">
			    </div>
			    <div>
			        <div class="grid grid-cols-5 gap-1.5">
			            <button type="button" onclick="quickTarget(20)" class="border rounded py-1.5 text-xs font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition">20%</button>
			            <button type="button" onclick="quickTarget(40)" class="border rounded py-1.5 text-xs font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition">40%</button>
			            <button type="button" onclick="quickTarget(60)" class="border rounded py-1.5 text-xs font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition">60%</button>
			            <button type="button" onclick="quickTarget(80)" class="border rounded py-1.5 text-xs font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition">80%</button>
			            <button type="button" onclick="quickTarget(100)" class="border rounded py-1.5 text-xs font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition">100%</button>
			        </div>
			    </div>
			</div>

            <div class="mt-4 flex justify-between">
                <button type="button" onclick="moveStep(1)" class="border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold text-xs transition">이전 단계</button>
                <button type="button" onclick="moveStep(3)" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-xs transition">다음 단계</button>
            </div>
        </div>

        <div id="ev-page-3" class="ev-page hidden max-w-xl mx-auto">
            <h2 class="text-base font-bold mb-3 text-gray-800">최종 예약 내용 확인</h2>
            <div class="bg-white rounded-lg border shadow-sm overflow-hidden">
                <table class="w-full text-xs">
                    <tr class="border-b border-gray-100">
                        <td class="p-3 font-bold bg-gray-50/75 text-gray-600 w-32 text-center">선택 충전기</td>
                        <td class="p-3 text-gray-900 font-medium" id="summaryCharger">-</td>
                    </tr>
                    <tr class="border-b border-gray-100">
                        <td class="p-3 font-bold bg-gray-50/75 text-gray-600 text-center">예약 날짜</td>
                        <td class="p-3 text-gray-900 font-medium" id="summaryDate">-</td>
                    </tr>
                    <tr class="border-b border-gray-100">
                        <td class="p-3 font-bold bg-gray-50/75 text-gray-600 text-center">지정 시간</td>
                        <td class="p-3 text-blue-600 font-bold" id="summaryTime">-</td>
                    </tr>
                    <tr>
                        <td class="p-3 font-bold bg-gray-50/75 text-gray-600 text-center">목표 충전량</td>
                        <td class="p-3 text-indigo-600 font-bold" id="summaryTarget">-</td>
                    </tr>
                </table>
            </div>
            <div class="mt-4 flex justify-between">
                <button type="button" onclick="moveStep(2)" class="border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-bold text-xs transition">이전 단계</button>
                <button type="button" onclick="submitReservation()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-sm transition">예약 확정</button>
            </div>
        </div>
    </form>
</main>
</body>
</html>