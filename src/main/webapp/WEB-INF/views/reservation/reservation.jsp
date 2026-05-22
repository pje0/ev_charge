<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>예약하기 - EV 충전소</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="/css/common.css">
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { font-family: 'Noto Sans KR', sans-serif; }
        .ev-step-active { color: #1e40af; font-weight: 700; }
        .ev-step-active .ev-step-num { background-color: #1e40af; color: white; }
        .ev-step-complete .ev-step-num { background-color: #10b981; color: white; }
    </style>
    <script src="<c:url value='/js/reservation.js' />"></script>
</head>
<body class="bg-gray-50 text-gray-800">

    <jsp:include page="/WEB-INF/views/layout/header.jsp" />

    <main class="ev-reservation-main pt-24 pb-16 min-h-screen">
        <div class="container mx-auto px-4 max-w-6xl">
            
            <div id="ev-reservation-header" class="mb-6">
                <h1 class="text-3xl font-bold text-gray-900 mb-2">충전 예약</h1>
                <p class="text-gray-500">원하는 충전소와 시간을 선택하여 예약하세요.</p>
            </div>

            <div id="ev-reservation-step-bar" class="flex items-center gap-4 text-sm text-gray-400 mb-8 bg-white p-4 rounded-xl border border-gray-100 shadow-sm max-w-3xl">
                <div id="ev-step-ind-1" class="flex items-center gap-2 ev-step-active">
                    <span class="ev-step-num w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 text-xs text-gray-600">1</span>
                    <span>충전소 선택</span>
                </div>
                <div class="h-px bg-gray-200 flex-1"></div>
                <div id="ev-step-ind-2" class="flex items-center gap-2">
                    <span class="ev-step-num w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 text-xs text-gray-600">2</span>
                    <span>충전기 선택</span>
                </div>
                <div class="h-px bg-gray-200 flex-1"></div>
                <div id="ev-step-ind-3" class="flex items-center gap-2">
                    <span class="ev-step-num w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 text-xs text-gray-600">3</span>
                    <span>예약 설정</span>
                </div>
                <div class="h-px bg-gray-200 flex-1"></div>
                <div id="ev-step-ind-4" class="flex items-center gap-2">
                    <span class="ev-step-num w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 text-xs text-gray-600">4</span>
                    <span>예약 확인</span>
                </div>
            </div>

            <div id="ev-reservation-body-grid" class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                <div class="lg:col-span-2 space-y-6">
                    
                    <form id="ev-reservation-form" action="/reservation/create" method="POST" onsubmit="return false;">
                        <input type="hidden" name="chargerId" id="ev-submit-charger-id">
                        <input type="hidden" name="reservationType" id="ev-submit-res-type" value="TIME">
                        <input type="hidden" name="startTime" id="ev-submit-start-time">
                        <input type="hidden" name="endTime" id="ev-submit-end-time">
                        <input type="hidden" name="targetKwh" id="ev-submit-target-kwh">

                        <div id="ev-page-step-1" class="ev-step-page space-y-4">
                            <h3 class="text-lg font-bold flex items-center gap-2 text-gray-900 mb-2">
                                <span class="text-blue-600">📍</span> 충전소 선택
                            </h3>
                            
                            <div id="btn-station-gangnam" class="ev-station-card bg-white border-2 border-transparent hover:border-blue-500 rounded-2xl p-5 shadow-sm cursor-pointer transition flex justify-between items-center group" 
                                 data-name="강남 테헤란로 충전소" data-id="1">
                                <div class="space-y-2">
                                    <div class="flex items-center gap-2">
                                        <h4 class="text-base font-bold text-gray-900">강남 테헤란로 충전소</h4>
                                        <span class="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">2기 가용</span>
                                    </div>
                                    <p class="text-sm text-gray-400">📍 서울특별시 강남구 테헤란로 152</p>
                                    <div class="flex gap-1.5 text-xs text-gray-500 pt-1">
                                        <span class="bg-gray-100 px-2 py-1 rounded">DC콤보</span>
                                        <span class="bg-gray-100 px-2 py-1 rounded">AC완속</span>
                                    </div>
                                </div>
                                <span class="text-gray-300 group-hover:text-blue-500 font-bold text-xl">❯</span>
                            </div>

                            <div id="btn-station-seocho" class="ev-station-card bg-white border-2 border-transparent hover:border-blue-500 rounded-2xl p-5 shadow-sm cursor-pointer transition flex justify-between items-center group" 
                                 data-name="서초 반포대로 충전소" data-id="2">
                                <div class="space-y-2">
                                    <div class="flex items-center gap-2">
                                        <h4 class="text-base font-bold text-gray-900">서초 반포대로 충전소</h4>
                                        <span class="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">2기 가용</span>
                                    </div>
                                    <p class="text-sm text-gray-400">📍 서울특별시 서초구 반포대로 58</p>
                                    <div class="flex gap-1.5 text-xs text-gray-500 pt-1">
                                        <span class="bg-gray-100 px-2 py-1 rounded">DC콤보</span>
                                        <span class="bg-gray-100 px-2 py-1 rounded">AC완속</span>
                                    </div>
                                </div>
                                <span class="text-gray-300 group-hover:text-blue-500 font-bold text-xl">❯</span>
                            </div>
                        </div>

                        <div id="ev-page-step-2" class="ev-step-page space-y-4 hidden">
                            <div class="flex items-center gap-2 mb-2 text-sm text-gray-500 cursor-pointer" onclick="goBack(1)">
                                <span>❮ 돌아가기</span> <strong class="text-gray-900 text-base font-bold">⚡ 충전기 선택</strong>
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div class="ev-charger-card bg-white border-2 border-transparent hover:border-blue-500 p-5 rounded-2xl shadow-sm cursor-pointer transition relative"
                                     data-name="DC콤보 (100kW)" data-id="1">
                                    <span class="absolute top-4 right-4 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">사용 가능</span>
                                    <div class="text-blue-500 text-2xl mb-2">⚡</div>
                                    <h4 class="font-bold text-gray-900">DC콤보</h4>
                                    <p class="text-sm text-gray-400">100kW 급속</p>
                                </div>
                                <div class="bg-white p-5 rounded-2xl shadow-sm opacity-60 relative cursor-not-allowed">
                                    <span class="absolute top-4 right-4 bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full">사용 중</span>
                                    <div class="text-gray-400 text-2xl mb-2">⚡</div>
                                    <h4 class="font-bold text-gray-700">DC콤보</h4>
                                    <p class="text-sm text-gray-400">100kW 급속 (사용불가)</p>
                                </div>
                            </div>
                        </div>

                        <div id="ev-page-step-3" class="ev-step-page space-y-6 hidden">
                            <div class="flex items-center gap-2 text-sm text-gray-500 cursor-pointer" onclick="goBack(2)">
                                <span>❮ 돌아가기</span> <strong class="text-gray-900 text-base font-bold">📅 예약 설정</strong>
                            </div>
                            
                            <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <label class="block text-sm font-bold text-gray-900 mb-2">날짜 선택</label>
                                <input type="date"
									   id="ev-reservation-date"
									   value="2026-05-23"
									   class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-700 focus:outline-none focus:border-blue-500">
                            </div>

                            <div class="bg-gray-200/60 p-1 rounded-xl grid grid-cols-2 text-center text-sm font-medium">
                                <button type="button" id="ev-tab-time" onclick="switchSubMethod('TIME')"
                                		class="py-2.5 rounded-lg bg-white text-gray-900 shadow-sm">
                                		🕒 시간대 예약
                             	</button>
                                <button type="button" id="ev-tab-target" onclick="switchSubMethod('TARGET')"
                                		class="py-2.5 rounded-lg text-gray-500 hover:text-gray-900">
                                		🎯 목표 충전량 예약
                                </button>
                            </div>

                            <div id="ev-sub-form-time" class="bg-white p-6 rounded-2xl shadow-sm space-y-4">
                                <p class="text-xs text-gray-400">시작 시간과 종료 시간을 차례대로 선택하세요.</p>
                                <div id="ev-time-tile-container" class="grid grid-cols-6 gap-2 text-center text-xs font-medium">
                                    <div class="ev-time-tile border border-gray-200 rounded-lg py-2 cursor-pointer hover:bg-gray-50"
									     data-time="07:00">07:00</div>
									<div class="ev-time-tile border border-gray-200 rounded-lg py-2 cursor-pointer hover:bg-gray-50"
									     data-time="08:00">08:00</div>
									<div class="ev-time-tile border border-gray-200 rounded-lg py-2 cursor-pointer hover:bg-gray-50"
									     data-time="09:00">09:00</div>
									<div class="ev-time-tile border border-gray-200 rounded-lg py-2 cursor-pointer hover:bg-gray-50"
									     data-time="10:00">10:00</div>
									<div class="ev-time-tile border border-gray-200 rounded-lg py-2 cursor-pointer hover:bg-gray-50"
									     data-time="11:00">11:00</div>
									<div class="ev-time-tile border border-gray-200 rounded-lg py-2 cursor-pointer hover:bg-gray-50"
									     data-time="12:00">12:00</div>
                                </div>
                                <div class="text-sm text-blue-600 font-medium pt-2" id="ev-time-selection-txt">선택: 미선택</div>
                            </div>

                            <div id="ev-sub-form-target" class="bg-white p-6 rounded-2xl shadow-sm space-y-6 hidden">
                                <div class="space-y-2">
                                    <div class="flex justify-between font-bold text-sm">
                                        <span>목표 충전량</span>
                                        <span class="text-blue-600" id="ev-slider-val">30 kWh</span>
                                    </div>
                                    <input type="range" min="5" max="100" value="30" oninput="updateSlider(this.value)" class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer">
                                </div>
                            </div>

                            <button type="button" onclick="goNext(4)" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition shadow-lg text-center block">다음 단계 ❯</button>
                        </div>

                        <div id="ev-page-step-4" class="ev-step-page space-y-6 hidden">
                            <div class="flex items-center gap-2 text-sm text-gray-500 cursor-pointer" onclick="goBack(3)">
                                <span>❮ 돌아가기</span> <strong class="text-gray-900 text-base font-bold">👀 예약 확인</strong>
                            </div>
                            
                            <div class="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                                <table class="w-full text-sm">
                                    <tr class="border-b border-gray-100"><td class="p-4 font-medium text-gray-400">📍 충전소</td><td class="p-4 font-bold text-right text-gray-900" id="ev-final-station">강남 테헤란로 충전소</td></tr>
                                    <tr class="border-b border-gray-100"><td class="p-4 font-medium text-gray-400">⚡ 충전기</td><td class="p-4 font-bold text-right text-gray-900" id="ev-final-charger">DC콤보 (100kW)</td></tr>
                                    <tr class="border-b border-gray-100"><td class="p-4 font-medium text-gray-400">🕒 시간 / 목표</td><td class="p-4 font-bold text-right text-gray-900" id="ev-final-target">-</td></tr>
                                </table>
                            </div>

                            <button type="button" onclick="submitFinalBooking()" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition shadow-lg flex items-center justify-center gap-2">
                                ✓ 예약 확정
                            </button>
                        </div>
                    </form>
                </div>

                <div class="space-y-6">
                    <div class="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
                        <h4 class="font-bold text-gray-900 text-base">예약 요약</h4>
                        <ul class="space-y-3 text-sm font-medium">
                            <li class="flex items-center gap-3">
                                <span id="ev-summary-badge-1" class="w-5 h-5 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 text-xs">1</span>
                                <span id="ev-summary-txt-1" class="text-gray-900 font-bold">충전소 미선택</span>
                            </li>
                            <li class="flex items-center gap-3">
                                <span id="ev-summary-badge-2" class="w-5 h-5 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 text-xs">2</span>
                                <span id="ev-summary-txt-2" class="text-gray-400">충전기 미선택</span>
                            </li>
                            <li class="flex items-center gap-3">
                                <span id="ev-summary-badge-3" class="w-5 h-5 flex items-center justify-center rounded-full bg-gray-100 text-gray-400 text-xs">3</span>
                                <span id="ev-summary-txt-3" class="text-gray-400">예약 설정 미완료</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            <div id="ev-success-modal" class="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 hidden">
                <div class="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl text-center space-y-6">
                    <div class="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mx-auto font-bold">✓</div>
                    <h2 class="text-2xl font-black text-gray-900">예약 완료!</h2>
                    <div class="bg-gray-50 rounded-2xl p-4 text-left text-xs space-y-3 font-medium border border-gray-100">
                        <div class="flex justify-between"><span>충전소</span><span class="text-gray-900 font-bold" id="ev-pop-station">-</span></div>
                        <div class="flex justify-between"><span>충전기</span><span class="text-gray-900 font-bold" id="ev-pop-charger">-</span></div>
                        <div class="flex justify-between"><span>예약 내역</span><span class="text-gray-900 font-bold" id="ev-pop-time">-</span></div>
                    </div>
                    <div class="grid grid-cols-2 gap-3 text-sm font-bold">
                        <button type="button" onclick="location.reload()" class="border border-gray-200 py-3 rounded-xl">새 예약</button>
                        <button type="button" onclick="location.href='/reservation/my'" class="bg-blue-600 text-white py-3 rounded-xl">내 예약 확인</button>
                    </div>
                </div>
            </div>

        </div>
    </main>
</body>
</html>