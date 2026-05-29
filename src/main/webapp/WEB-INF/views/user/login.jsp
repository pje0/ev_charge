<%@ page language="java" contentType="text/html; charset=UTF-8"
	pageEncoding="UTF-8"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core"%>
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>로그인 - EV 충전소</title>
<link
	href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;800&display=swap"
	rel="stylesheet">
<link rel="stylesheet" href="/css/common.css">
<link rel="stylesheet" href="/css/auth.css">
</head>
<body class="ev-auth-page">

	<jsp:include page="/WEB-INF/views/layout/header.jsp" />

	<main class="ev-auth-main">
		<div class="ev-auth-wrap">

			<!-- 탭 -->
			<div class="ev-auth-tabs">
				<button type="button" class="ev-auth-tab active"
					onclick="switchTab('login')">로그인</button>
				<button type="button" class="ev-auth-tab"
					onclick="switchTab('signup')">회원가입</button>
			</div>

			<!-- 에러/성공 -->
			<c:if test="${not empty error}">
				<div class="ev-auth-error">${error}</div>
			</c:if>
			<c:if test="${not empty message}">
				<div class="ev-auth-success">${message}</div>
			</c:if>

			<!-- 로그인 -->
			<div class="ev-auth-tab-content active" id="tab-login">
				<div class="ev-auth-title">로그인</div>
				<form method="POST" action="/login-process" class="ev-auth-form">

					<div class="ev-auth-form-group">
						<div class="ev-auth-input-wrap">
							<input type="text" name="loginId" class="ev-auth-input"
								placeholder="아이디를 입력하세요">
						</div>
					</div>
					<div class="ev-auth-form-group">
						<div class="ev-auth-input-wrap">
							<input type="password" name="password" id="login-pw"
								class="ev-auth-input ev-auth-input-pw" placeholder="비밀번호를 입력하세요">
							<button type="button" class="ev-auth-pw-toggle"
								onclick="togglePw('login-pw', this)">
								<svg viewBox="0 0 24 24">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
            </svg>
							</button>
						</div>
					</div>
					<button type="submit" class="ev-auth-submit">로그인</button>

				</form>

				<div class="ev-auth-links">
					<a href="#">아이디 찾기</a>
					<div class="ev-auth-links-divider"></div>
					<a href="#">비밀번호 찾기</a>
					<div class="ev-auth-links-divider"></div>
					<a href="#" onclick="switchTab('signup'); return false;">회원가입</a>
				</div>

				<!-- SNS 로그인 -->
				<div class="ev-auth-sns-wrap">
					<div class="ev-auth-sns-title">SNS 로그인</div>
					<div class="ev-auth-sns-btns">
						<a href="/oauth2/authorization/google" class="ev-auth-sns-btn">
							<svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4"
									d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853"
									d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05"
									d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335"
									d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg> Google
						</a> <a href="/oauth2/authorization/kakao"
							class="ev-auth-sns-btn ev-auth-sns-btn-kakao"> <svg
								width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path
									d="M12 3C6.48 3 2 6.48 2 10.8c0 2.7 1.6 5.08 4.03 6.5L5 21l4.27-2.3c.88.2 1.79.3 2.73.3 5.52 0 10-3.48 10-7.8S17.52 3 12 3z" />
              </svg> Kakao
						</a> <a href="/oauth2/authorization/naver"
							class="ev-auth-sns-btn ev-auth-sns-btn-naver"> <span
							style="font-weight: 800; font-size: 15px">N</span> Naver
						</a>
					</div>
				</div>
			</div>

			<!-- 회원가입 -->
			<div class="ev-auth-tab-content" id="tab-signup">
				<div class="ev-auth-title">회원가입</div>
				<form method="POST" action="/signup" class="ev-auth-form">
					<div class="ev-auth-form-row">
						<div class="ev-auth-form-group">
							<label class="ev-auth-label">이름<span
								class="ev-auth-label-required">*</span></label> <input type="text"
								name="name" class="ev-auth-input" placeholder="홍길동" required>
						</div>
						<div class="ev-auth-form-group">
							<label class="ev-auth-label">전화번호<span
								class="ev-auth-label-required">*</span></label> <input type="text"
								name="phone" class="ev-auth-input" placeholder="010-0000-0000"
								required>
						</div>
					</div>
					<div class="ev-auth-form-group">
						<label class="ev-auth-label">아이디<span
							class="ev-auth-label-required">*</span></label> <input type="text"
							name="loginId" class="ev-auth-input" placeholder="아이디를 입력하세요"
							required>
					</div>
					<div class="ev-auth-form-group">
						<label class="ev-auth-label">이메일</label> <input type="email"
							name="email" class="ev-auth-input"
							placeholder="example@email.com">
					</div>
					<div class="ev-auth-form-group">
						<label class="ev-auth-label">비밀번호<span
							class="ev-auth-label-required">*</span></label>
						<div class="ev-auth-input-wrap">
							<input type="password" name="password" id="signup-pw"
								class="ev-auth-input ev-auth-input-pw" placeholder="8자 이상 입력"
								required>
							<button type="button" class="ev-auth-pw-toggle"
								onclick="togglePw('signup-pw', this)">
								<svg viewBox="0 0 24 24">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
							</button>
						</div>
					</div>
					<div class="ev-auth-form-row">
						<div class="ev-auth-form-group">
							<label class="ev-auth-label">차량 모델</label> <select name="modelId"
								class="ev-auth-input">
								<option value="">선택 안함</option>
								<c:forEach var="car" items="${evModels}">
									<option value="${car.modelId}">${car.manufacturer}
										${car.modelName}</option>
								</c:forEach>
							</select>
						</div>
						<div class="ev-auth-form-group">
							<label class="ev-auth-label">차량 번호</label> <input type="text"
								name="carNumber" class="ev-auth-input" placeholder="12가 3456">
						</div>
					</div>
					<button type="submit" class="ev-auth-submit">회원가입</button>
				</form>
				<div class="ev-auth-links">
					<a href="#" onclick="switchTab('login'); return false;">이미 계정이
						있으신가요? 로그인</a>
				</div>
			</div>

		</div>
	</main>

	<script>
    function switchTab(tab) {
      document.querySelectorAll('.ev-auth-tab').forEach((t, i) => {
        t.classList.toggle('active', (tab === 'login' && i === 0) || (tab === 'signup' && i === 1));
      });
      document.querySelectorAll('.ev-auth-tab-content').forEach(c => c.classList.remove('active'));
      document.getElementById('tab-' + tab).classList.add('active');
    }

    function togglePw(inputId, btn) {
      const input = document.getElementById(inputId);
      const isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      btn.querySelector('svg').innerHTML = isHidden
        ? '<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>'
        : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
    }
  </script>

</body>
</html>