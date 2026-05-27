<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>정보 수정 - EV 충전소</title>
    <script src="https://cdn.tailwindcss.com"></script>
	<link rel="stylesheet" href="/css/common.css">
</head>
<body class="bg-gray-50">
    <main class="pt-20 pb-12">
        <div class="container mx-auto px-4 max-w-lg">
            <h2 class="text-2xl font-bold mb-8">회원 정보 수정</h2>

            <form action="/mypage/update" method="post" class="bg-white p-8 rounded-2xl shadow-sm border">
                <input type="hidden" name="userId" value="${myPageDto.userId}">

                <div class="space-y-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">이름</label>
                        <input type="text" name="name" value="${myPageDto.name}" required 
                               class="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">이메일</label>
                        <input type="email" name="email" value="${myPageDto.email}" required 
                               class="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">
                    </div>

                    <hr class="my-6">

                    <p class="text-xs text-gray-400 mb-4">* 비밀번호를 변경하시려면 아래 정보를 모두 입력하세요.</p>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">현재 비밀번호</label>
                        <input type="password" name="currentPassword" placeholder="기존 비밀번호 입력"
                               class="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">새 비밀번호</label>
                        <input type="password" name="password" placeholder="새 비밀번호 입력"
                               class="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">
                    </div>
                </div>

                <div class="mt-8 flex gap-3">
                    <button type="button" onclick="history.back()" 
                            class="flex-1 py-3 border rounded-xl font-medium text-gray-600 hover:bg-gray-50">취소</button>
                    <button type="submit" 
                            class="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700">저장하기</button>
                </div>
            </form>
        </div>
    </main>
</body>
</html>