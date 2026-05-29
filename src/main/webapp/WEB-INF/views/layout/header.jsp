<%@ page language="java" contentType="text/html; charset=UTF-8"
	pageEncoding="UTF-8"%>

<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core"%>

<%@ taglib prefix="sec"
	uri="http://www.springframework.org/security/tags"%>

<link rel="stylesheet" href="/css/common.css">
<script src="${pageContext.request.contextPath}/js/jquery.js"></script>

<header class="ev-header">

	<div class="ev-container ev-header-inner">

		<a href="/" class="ev-header-logo">

			<div class="ev-header-logo-icon">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none"
					stroke="white" stroke-width="2.5" stroke-linecap="round"
					stroke-linejoin="round">

					<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />

				</svg>
			</div>

			<div>
				<span class="ev-header-logo-bold">EV</span> <span
					class="ev-header-logo-light">충전소</span>
			</div>

		</a>

		<nav class="ev-header-nav">

			<a href="/map" class="ev-header-nav-link"> 충전소 지도 </a> <a
				href="/reservation" class="ev-header-nav-link"> 예약하기 </a> <a
				href="/calculator" class="ev-header-nav-link"> 충전 요금 계산기 </a> <a
				href="/user/inquiry/chat" class="ev-header-nav-link"> 1:1 문의 </a> <a
				href="/notice/list" class="ev-header-nav-link"> 공지사항 </a>

			<sec:authorize access="hasRole('ADMIN')">

				<a href="/admin/adminpage" class="ev-header-nav-link ev-header-nav-link-admin">

					관리자 </a>

			</sec:authorize>

		</nav>

		<div class="ev-header-actions">

			<!-- 로그인 상태 -->
			<sec:authorize access="isAuthenticated()">

				<div class="ev-header-user-menu">

					<button class="ev-header-user-btn">

						<div class="ev-header-user-avatar">

							<div class="ev-header-user-avatar">
							    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
							        <circle cx="12" cy="7" r="4"/>
							    </svg>
							</div>

						</div>

						<span> <sec:authentication property="name" />

						</span>

					</button>

					<div class="ev-header-dropdown">

						<a href="/mypage" class="ev-header-dropdown-item"> 마이페이지 </a>

						<sec:authorize access="hasRole('ADMIN')">

							<a href="/admin/adminpage" class="ev-header-dropdown-item"> 관리자 페이지 </a>

						</sec:authorize>

						<form action="/logout" method="post">

							<button type="submit"
								class="ev-header-dropdown-item ev-header-dropdown-item-logout">

								로그아웃</button>

						</form>

					</div>

				</div>

			</sec:authorize>

			<!-- 비로그인 상태 -->
			<sec:authorize access="isAnonymous()">

				<a href="/login" class="ev-btn ev-btn-ghost"> 로그인 </a>

				<a href="/signup" class="ev-btn ev-btn-primary"> 회원가입 </a>

			</sec:authorize>

		</div>

	</div>
	<div id="globalToastContainer"></div>
</header>
<!-- 실시간 푸시 수신 및 토스트 핸들러 스크립트 -->
<script>
$(document).ready(function() {
    // 1. Spring Security 인증 여부를 체크하고 로그인 아이디를 안전하게 자바스크립트 변수로 바인딩합니다.
    let currentLoginId = "";
    
    <sec:authorize access="isAuthenticated()">
        // 시큐리티에 인증된 Principal의 고유 Name(보통 로그인 ID 또는 회원 PK)을 가져옵니다.
        currentLoginId = "<sec:authentication property='principal.username' />";
    </sec:authorize>
    
    // 2. 사용자가 로그인한 상태일 때만 SSE 스트림 연결 파이프라인을 가동합니다.
    if (currentLoginId && currentLoginId.trim() !== "") {
        // 백엔드 Spring Boot 구독 Controller API 호출 (인코딩 처리 포함)
        const sseUrl = "${pageContext.request.contextPath}/api/notification/subscribe/" + encodeURIComponent(currentLoginId);
        const eventSource = new EventSource(sseUrl);

        // 3. 백엔드 전송 스레드가 'alarm' 채널로 실시간 객체를 밀어내면 수신
        eventSource.addEventListener("alarm", function(event) {
            try {
                const notiData = JSON.parse(event.data);
                // 공통 팝업 함수 실행
                fn_trigger_global_toast(notiData.title, notiData.content);
            } catch(e) {
                console.error("실시간 알림 데이터 분석 실패:", e);
            }
        });

        // 예기치 않은 네트워크 해제 발생 시 브라우저 내장 자동 복구 백오프 기동
        eventSource.onerror = function() {
            console.warn("실시간 알림 서버 채널과의 스트림 연결이 해제되었습니다. 원격 재연결 프로세스를 가동합니다.");
        };
    }
});

// 동적으로 알림 모듈을 생성하여 우측 하단 컨테이너에 사출하는 공통 자바스크립트
function fn_trigger_global_toast(title, content) {
    // 다중 푸시 유입 시 HTML 엘리먼트 ID 중복을 철저하게 방지하기 위한 랜덤 타임스탬프 결합 키
    const uniqueElementId = 'toast_' + new Date().getTime() + Math.floor(Math.random() * 1000);
    
    const toastTemplateHtml = `
        <div id="${uniqueElementId}" class="ev-global-toast">
            <div class="ev-global-toast-header">
                <span>⚡ ${title}</span>
                <button class="ev-global-toast-close" onclick="fn_remove_global_toast('${uniqueElementId}')">&times;</button>
            </div>
            <div class="ev-global-toast-body">
                ${content}
            </div>
        </div>
    `;
    
    // 글로벌 컨테이너 하단에 주입
    $('#globalToastContainer').append(toastTemplateHtml);
    
    // 리액트처럼 3.5초 라이프사이클 유지 후 자동 디졸브 처리
    setTimeout(function() {
        fn_remove_global_toast(uniqueElementId);
    }, 3500);
}

// 부드러운 애니메이션 스케일링 후 노드(DOM)를 완벽하게 파괴하는 삭제 로직
function fn_remove_global_toast(targetNodeId) {
    const $targetNode = $('#' + targetNodeId);
    
    if($targetNode.length === 0 || $targetNode.hasClass('fade-out')) return;
    
    // common.css에 정의된 퇴출 애니메이션 기동
    $targetNode.addClass('fade-out');
    
    // 애니메이션 프레임 타임 확보 후 영구 소멸
    setTimeout(function() {
        $targetNode.remove();
    }, 300);
}
</script>