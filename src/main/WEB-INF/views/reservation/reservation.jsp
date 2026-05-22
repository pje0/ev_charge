<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
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
    </style>
</head>
<body class="bg-gray-50">
    <jsp:include page="/WEB-INF/views/layout/header.jsp" />
    <main class="pt-20 pb-12">
        <div class="container mx-auto px-4 max-w-2xl">
            <h1 class="text-4xl font-bold text-gray-900 mb-8">충전 예약</h1>
            
            <div class="bg-white rounded-2xl shadow-lg p-8">
                <!-- 예약 방식 선택 -->
                <div class="mb-8">
                    <h2 class="text-xl font-bold mb-4">예약 방식 선택</h2>
                    <div class="flex gap-4">
                        <label class="flex items-center cursor-pointer">
                            <input type="radio" name="reservationType" value="timeSlot" checked class="w-4 h-4">
                            <span class="ml-2 text-gray-900 font-medium">시간대 예약</span>
                        </label>
                        <label class="flex items-center cursor-pointer">
                            <input type="radio" name="reservationType" value="chargeAmount" class="w-4 h-4">
                            <span class="ml-2 text-gray-900 font-medium">목표 충전량 예약</span>
                        </label>
                    </div>
                </div>

                <!-- 충전소 선택 -->
                <div class="mb-6">
                    <label class="block text-sm font-semibold text-gray-900 mb-2">충전소 선택</label>
                    <select class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option>서울역 충전소 (가용: 3/5 )</option>
                        <option>강남역 충전소 (가용: 6/8)</option>
                        <option>인천공항 충전소 (가용: 10/12)</option>
                    </select>
                </div>

                <!-- 시간대 예약 폼 -->
                <div id="timeSlotForm" class="space-y-4">
                    <div>
                        <label class="block text-sm font-semibold text-gray-900 mb-2">시작 시간</label>
                        <input type="datetime-local" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-900 mb-2">종료 시간</label>
                        <input type="datetime-local" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                </div>

                <!-- 목표 충전량 예약 폼 -->
                <div id="chargeAmountForm" class="space-y-4 hidden">
                    <div>
                        <label class="block text-sm font-semibold text-gray-900 mb-2">목표 충전량 (kWh)</label>
                        <input type="number" min="10" max="100" step="10" placeholder="예: 50" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-900 mb-2">예상 완료 시간</label>
                        <input type="datetime-local" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    </div>
                </div>

                <!-- 예약 버튼 -->
                <button class="w-full mt-8 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition">
                    예약하기
                </button>
            </div>
        </div>
    </main>

    <script>
        document.querySelectorAll('input[name="reservationType"]').forEach(radio => {
            radio.addEventListener('change', function() {
                if (this.value === 'timeSlot') {
                    document.getElementById('timeSlotForm').classList.remove('hidden');
                    document.getElementById('chargeAmountForm').classList.add('hidden');
                } else {
                    document.getElementById('timeSlotForm').classList.add('hidden');
                    document.getElementById('chargeAmountForm').classList.remove('hidden');
                }
            });
        });
    </script>
</body>
</html>