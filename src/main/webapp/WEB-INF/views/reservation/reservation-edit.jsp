<%@ page language="java" contentType="text/html; charset=UTF-8"
    pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Insert title here</title>
</head>
<body>
	<form action="/mypage/reservation/modify" method="post" class="bg-white p-6 rounded-2xl border shadow-sm">
	    <input type="hidden" name="reservationId" value="${reservation.reservationId}">
	    
	    <h3 class="font-bold mb-4">예약 수정</h3>
	    
	    <c:if test="${reservation.reservationType eq 'TIME'}">
	        <label>시작 시간</label>
	        <input type="datetime-local" name="startTime" value="${reservation.startTime}" class="w-full border p-2 mb-4">
	    </c:if>
	    
	    <label>충전 목표량(kWh)</label>
	    <input type="number" name="targetAmount" value="${reservation.targetAmount}" class="w-full border p-2 mb-4">
	
	    <button type="submit" class="w-full bg-blue-600 text-white py-2 rounded-xl">변경 저장</button>
	</form>
</body>
</html>