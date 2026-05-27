<%@ page language="java" contentType="text/html; charset=UTF-8"
	pageEncoding="UTF-8"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>예약 완료</title>

<script src="https://cdn.tailwindcss.com"></script>

<style>
body {
	background: #f3f4f6;
}
</style>

</head>

<body class="min-h-screen flex items-center justify-center">

	<div class="bg-white w-full max-w-xl rounded-3xl shadow-lg p-10">

		<!-- 완료 아이콘 -->
		<div class="flex justify-center mb-6">

			<div
				class="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">

				<span class="text-4xl text-green-600">
					✓
				</span>

			</div>

		</div>

		<!-- 제목 -->
		<h1 class="text-4xl font-bold text-center mb-4">
			예약 완료!
		</h1>

		<p class="text-center text-gray-500 mb-8">
			예약이 성공적으로 등록되었습니다.
		</p>

		<!-- 예약 정보 -->
		<div class="bg-gray-50 rounded-2xl p-6 space-y-4">

			<div class="flex justify-between">
				<span class="text-gray-500">예약 번호</span>

				<span class="font-bold text-blue-600">
					R${reservation.id}
				</span>
			</div>

			<div class="flex justify-between">
				<span class="text-gray-500">충전기 ID</span>

				<span class="font-semibold">
					${reservation.chargerId}
				</span>
			</div>

			<div class="flex justify-between">
				<span class="text-gray-500">예약 타입</span>

				<span class="font-semibold">
					${reservation.reservationType}
				</span>
			</div>

			<!-- TIME 예약 -->
			<c:if test="${reservation.reservationType eq 'TIME'}">

				<div class="flex justify-between">
					<span class="text-gray-500">예약 시간</span>

					<span class="font-semibold">
						${fn:substring(reservation.startTime, 0, 16)}
						~
						${fn:substring(reservation.endTime, 0, 16)}
					</span>
				</div>

			</c:if>

			<!-- TARGET 예약 -->
			<c:if test="${reservation.reservationType eq 'TARGET'}">

				<div class="flex justify-between">
					<span class="text-gray-500">목표 충전량</span>

					<span class="font-semibold">
						${reservation.targetKwh}%
					</span>
				</div>

			</c:if>

		</div>

		<!-- 버튼 -->
		<div class="grid grid-cols-2 gap-4 mt-8">

			<button
				type="button"
				onclick="location.href='/reservation'"
				class="border border-gray-300 rounded-xl py-4 font-semibold hover:bg-gray-100 transition">

				새 예약

			</button>

			<button
				type="button"
				onclick="location.href='/reservation/my'"
				class="bg-blue-600 text-white rounded-xl py-4 font-semibold hover:bg-blue-700 transition">

				내 예약 확인

			</button>

		</div>

	</div>

</body>
</html>