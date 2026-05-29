<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>회원정보수정</title>
    <script src="https://cdn.tailwindcss.com"></script>
	<link rel="stylesheet" href="${pageContext.request.contextPath}/css/common.css">
</head>
<body class="bg-gray-50">
    <main class="pt-20 pb-12">
        <div class="container mx-auto px-4 max-w-lg">
            <h2 class="text-2xl font-bold mb-8">회원 정보 수정</h2>

            <!-- 🌟 id="editForm" 추가하여 JS에서 이벤트를 가로챌 수 있도록 설정 -->
            <form id="editForm" action="/mypage/update" method="post" class="bg-white p-8 rounded-2xl shadow-sm border">
                <input type="hidden" name="userId" value="${myPageDto.userId}">
                <!-- 🌟 Spring Security 필수: CSRF 토큰 누락 시 403 에러 방지용 -->
                <input type="hidden" name="${_csrf.parameterName}" value="${_csrf.token}" />

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

                    <!-- 🌟 추가: 전화번호 입력 필드 (MyPageDto의 phone 변수명과 일치) -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">전화번호</label>
                        <input type="tel" name="phone" value="${myPageDto.phone}" placeholder="010-0000-0000"
                               class="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">
                    </div>

                    <hr class="my-6">

                    <p class="text-xs text-gray-400 mb-4">* 비밀번호를 변경하시려면 아래 정보를 모두 입력하세요.</p>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">현재 비밀번호</label>
                        <input type="password" id="currentPassword" name="currentPassword" placeholder="기존 비밀번호 입력"
                               class="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">새 비밀번호</label>
                        <input type="password" id="password" name="password" placeholder="새 비밀번호 입력"
                               class="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">
                    </div>

                    <!-- 🌟 1차 반복 검증용: 새 비밀번호 확인 필드 추가 (DTO 전송 불필요하므로 name 생략) -->
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">새 비밀번호 확인</label>
                        <input type="password" id="passwordConfirm" placeholder="새 비밀번호 다시 입력"
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

    <!-- 🌟 JS 1차 유효성 검증 스크립트 추가 -->
    <script>
        document.getElementById('editForm').addEventListener('submit', function(e) {
            const currentPassword = document.getElementById('currentPassword').value.trim();
            const password = document.getElementById('password').value.trim();
            const passwordConfirm = document.getElementById('passwordConfirm').value.trim();

            // 사례 1: 사용자가 비밀번호를 입력하려고 한 흔적이 있는 경우 세 필드가 모두 채워져야 함
            if (currentPassword !== '' || password !== '' || passwordConfirm !== '') {
                if (currentPassword === '') {
                    alert('현재 비밀번호를 입력해 주세요.');
                    document.getElementById('currentPassword').focus();
                    e.preventDefault(); // 서버 전송 중단
                    return;
                }
                if (password === '') {
                    alert('새 비밀번호를 입력해 주세요.');
                    document.getElementById('password').focus();
                    e.preventDefault();
                    return;
                }
                if (passwordConfirm === '') {
                    alert('새 비밀번호 확인란을 입력해 주세요.');
                    document.getElementById('passwordConfirm').focus();
                    e.preventDefault();
                    return;
                }
                // 1차 반복 검증: 새 비밀번호 불일치 체크
                if (password !== passwordConfirm) {
                    alert('새 비밀번호와 새 비밀번호 확인이 일치하지 않습니다.');
                    document.getElementById('passwordConfirm').focus();
                    e.preventDefault();
                    return;
                }
            }
        });
    </script>
</body>
</html>