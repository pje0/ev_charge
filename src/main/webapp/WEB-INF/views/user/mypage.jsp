<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>

<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>마이페이지 - EV 충전소</title>
    <script src="https://cdn.tailwindcss.com"></script>
	<link rel="stylesheet" href="/css/common.css">
</head>
<body class="bg-gray-50">
    <jsp:include page="/WEB-INF/views/layout/header.jsp" />

    <main class="pt-24 pb-16">
        <div class="container mx-auto px-4 max-w-3xl">
            <h1 class="text-3xl font-bold text-gray-900 mb-8">마이페이지</h1>
            
            <div class="bg-white rounded-2xl border border-gray-200 p-8 mb-6 shadow-sm">
                <div class="flex flex-col items-center mb-6">
                    <div class="w-16 h-16 bg-blue-900 text-white font-bold text-xl rounded-full flex items-center justify-center mb-4">
                        ${fn:substring(myPageDto.name, 0, 1)}
                    </div>
                    <h2 class="text-xl font-bold">${myPageDto.name}</h2>
                    <p class="text-gray-500 text-sm">${myPageDto.email}</p>
                </div>
                <div class="text-sm space-y-3">
                    <div class="flex justify-between">
                        <span class="text-gray-500">가입일</span>
                        <span class="font-medium">${fn:substring(myPageDto.createdAt, 0, 10)}</span>
                    </div>
                </div>
                <a href="/mypage/edit" class="block w-full mt-6 py-2.5 text-center border rounded-xl text-sm font-medium hover:bg-gray-50">정보 수정</a>
            </div>

            <div class="flex gap-2 mb-4">
                <a href="/mypage?tab=upcoming" class="px-4 py-1.5 text-sm font-medium rounded-full ${currentTab eq 'past' ? 'bg-gray-100 text-gray-600' : 'bg-blue-600 text-white'}">예정 예약</a>
                <a href="/mypage?tab=past" class="px-4 py-1.5 text-sm font-medium rounded-full ${currentTab eq 'past' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}">지난 예약</a>
            </div>

            <div class="space-y-4">
                <c:choose>
                    <c:when test="${not empty reservationList}">
                        <c:forEach var="res" items="${reservationList}">
                            <div class="bg-white rounded-2xl border p-5 shadow-sm">
                                <div class="flex justify-between items-start mb-3">
                                    <div>
                                        <h4 class="font-bold text-gray-900">${res.stationName}</h4>
                                        <p class="text-xs text-gray-400">예약번호: R${res.reservationId}</p>
                                    </div>
                                    <span class="text-xs px-2 py-1 rounded-full border ${res.status eq 'RESERVED' ? 'text-blue-600 bg-blue-50' : 'text-gray-500 bg-gray-100'}">
                                        ${res.status}
                                    </span>
                                </div>
                                
                                <div class="text-sm text-gray-600">
                                    <c:choose>
                                        <c:when test="${res.reservationType eq 'TIME'}">
                                            <p>일시: <fmt:formatDate value="${res.startTime}" pattern="yyyy-MM-dd HH:mm"/> ~ <fmt:formatDate value="${res.endTime}" pattern="HH:mm"/></p>
                                        </c:when>
                                        <c:otherwise>
                                            <p>목표 충전량: ${res.targetAmount} kWh</p>
                                        </c:otherwise>
                                    </c:choose>
                                    <p class="text-xs mt-1 text-gray-400">충전기: ${res.connectorType}</p>
                                </div>
								
								<c:if test="${res.status eq 'RESERVED'}">
								    <div class="mt-4 flex gap-2">
								        <a href="/mypage/reservation/edit?id=${res.reservationId}" 
								           class="px-3 py-1.5 text-xs bg-blue-50 text-blue-600 rounded-lg">예약 수정</a>
								        
								        <form action="/mypage/reservation/cancel" method="post" onsubmit="return confirm('취소하시겠습니까?');">
								            <input type="hidden" name="reservationId" value="${res.reservationId}">
								            <button type="submit" class="px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg">예약 취소</button>
								        </form>
								    </div>
								</c:if>
                            </div>
                        </c:forEach>
                    </c:when>
                    <c:otherwise>
                        <div class="text-center py-12 text-gray-400 text-sm">예약 내역이 없습니다.</div>
                    </c:otherwise>
                </c:choose>
            </div>
        </div>
    </main>
</body>
</html>