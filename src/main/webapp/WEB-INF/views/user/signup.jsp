<%@ page language="java" contentType="text/html; charset=UTF-8"
	pageEncoding="UTF-8"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core"%>
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>회원가입 - EV 충전소</title>
<link
	href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;800&display=swap"
	rel="stylesheet">
<link rel="stylesheet" href="/css/common.css">
<link rel="stylesheet" href="/css/auth.css">
</head>
<body class="ev-auth-body">
	<div class="ev-auth-card">
		<div class="ev-auth-logo">
			<div class="ev-auth-logo-icon">⚡</div>
			<div class="ev-auth-logo-title">회원가입</div>
		</div>

		<c:if test="${not empty error}">
			<div class="ev-auth-error">${error}</div>
		</c:if>

		<form method="POST" action="/signup" class="ev-auth-form">
			<div class="ev-auth-form-group">
				<label class="ev-auth-label">이름</label> <input type="text"
					name="name" class="ev-auth-input" placeholder="이름을 입력하세요" required>
			</div>
			<div class="ev-auth-form-group">
				<label class="ev-auth-label">아이디</label> <input type="text"
					name="loginId" class="ev-auth-input" placeholder="아이디를 입력하세요"
					required>
			</div>
			<div class="ev-auth-form-group">
				<label class="ev-auth-label">이메일</label> <input type="email"
					name="email" class="ev-auth-input" placeholder="이메일을 입력하세요">
			</div>
			<div class="ev-auth-form-group">
				<label class="ev-auth-label">비밀번호</label> <input type="password"
					name="password" class="ev-auth-input" placeholder="비밀번호를 입력하세요"
					required>
			</div>
			<div class="ev-auth-form-group">
				<label class="ev-auth-label">비밀번호 확인</label> <input type="password"
					name="passwordConfirm" class="ev-auth-input"
					placeholder="비밀번호를 다시 입력하세요" required>
			</div>
			<button type="submit" class="ev-auth-submit">회원가입</button>
		</form>

		<div class="ev-auth-footer">
			이미 계정이 있으신가요? <a href="/login">로그인</a>
		</div>
	</div>
</body>
</html>