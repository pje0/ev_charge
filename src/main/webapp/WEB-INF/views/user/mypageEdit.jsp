<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title>회원정보수정</title>
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/common.css">
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/mypageEdit.css">
    <script src="${pageContext.request.contextPath}/js/mypageEdit.js" defer></script>
</head>
<body class="ev-mypageEdit-body">
    <jsp:include page="/WEB-INF/views/layout/header.jsp" />
    
    <main class="ev-mypageEdit-main">
        <div class="ev-container ev-mypageEdit-container">
            <h2 class="ev-mypageEdit-title">회원 정보 수정</h2>

            <form id="editForm" action="/mypage/update" method="post" class="ev-mypageEdit-form">
                <input type="hidden" name="userId" value="${myPageDto.userId}">
                <input type="hidden" name="${_csrf.parameterName}" value="${_csrf.token}" />

                <div class="ev-mypageEdit-form-body">
                    <div class="ev-mypageEdit-form-group">
                        <label class="ev-mypageEdit-label">이름</label>
                        <input type="text" name="name" value="${myPageDto.name}" required class="ev-mypageEdit-input">
                    </div>

                    <div class="ev-mypageEdit-form-group">
                        <label class="ev-mypageEdit-label">이메일</label>
                        <input type="email" name="email" value="${myPageDto.email}" required class="ev-mypageEdit-input">
                    </div>

                    <div class="ev-mypageEdit-form-group">
                        <label class="ev-mypageEdit-label">전화번호</label>
                        <input type="text" name="phone" value="${myPageDto.phone}" placeholder="010-0000-0000" class="ev-mypageEdit-input">
                    </div>

                    <hr class="ev-mypageEdit-divider">

                    <p class="ev-mypageEdit-notice">* 비밀번호를 변경하시려면 아래 정보를 모두 입력하세요.</p>
                    
                    <div class="ev-mypageEdit-form-group">
                        <label class="ev-mypageEdit-label">현재 비밀번호</label>
                        <input type="password" id="currentPassword" name="currentPassword" placeholder="기존 비밀번호 입력" class="ev-mypageEdit-input">
                    </div>
                    
                    <div class="ev-mypageEdit-form-group">
                        <label class="ev-mypageEdit-label">새 비밀번호</label>
                        <input type="password" id="password" name="password" placeholder="새 비밀번호 입력" class="ev-mypageEdit-input">
                    </div>

                    <div class="ev-mypageEdit-form-group">
                        <label class="ev-mypageEdit-label">새 비밀번호 확인</label>
                        <input type="password" id="passwordConfirm" placeholder="새 비밀번호 다시 입력" class="ev-mypageEdit-input">
                    </div>
                </div>

                <div class="ev-mypageEdit-btn-group">
                    <button type="button" onclick="history.back()" class="ev-mypageEdit-btn ev-mypageEdit-btn-cancel">취소</button>
                    <button type="submit" class="ev-mypageEdit-btn ev-mypageEdit-btn-submit">저장하기</button>
                </div>
            </form>
        </div>
    </main>
</body>
</html>