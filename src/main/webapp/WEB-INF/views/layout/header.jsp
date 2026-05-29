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
<script>
//🔔 알림센터(보관함) 실시간 수신 및 UI 제어 공통 JavaScript

$(document).ready(function() {
 let currentLoginId = "";
 
 <sec:authorize access="isAuthenticated()">
     currentLoginId = "<sec:authentication property='principal.username' />";
 </sec:authorize>
 
 if (currentLoginId && currentLoginId.trim() !== "") {
     const sseUrl = "${pageContext.request.contextPath}/api/notification/subscribe/" + encodeURIComponent(currentLoginId);
     const eventSource = new EventSource(sseUrl);

     // [실시간 수신] 백엔드에서 실시간 알림이 도달하면 실행
     eventSource.addEventListener("alarm", function(event) {
         try {
             // 1. 종(🔔) 모양 아이콘 위에 즉시 빨간 점 활성화
             $('#globalBellDot').show();
             
             // 2. 만약 알림센터 보관함 레이어가 열려있다면 화면 깜빡임 없이 즉시 리스트 새로고침
             if($('#evNotiCenter').is(':visible')) {
                 fn_load_notification_history();
             }
         } catch(e) {
             console.error("실시간 푸시 연동 에러:", e);
         }
     });

     eventSource.onerror = function() {
         console.warn("실시간 알림 스트림 연결이 해제되어 재연결을 시도합니다.");
     };

     // [최초 로드] 로그인 유저의 안 읽은 알림이 DB에 남아있는지 확인하여 빨간 점 표시 결정
     $.ajax({
         url: "${pageContext.request.contextPath}/api/notification/unread-count",
         type: "GET",
         success: function(count) {
             if(parseInt(count) > 0) $('#globalBellDot').show();
         }
     });
 }
});

//[토글 함수] 종 모양 버튼 클릭 시 알림센터 레이어를 열고 닫음
function fn_toggle_notification_center() {
 const $centerBox = $('#evNotiCenter');
 if($centerBox.is(':visible')) {
     $centerBox.hide();
 } else {
     $centerBox.show();
     fn_load_notification_history(); // 창이 열리는 즉시 역사 내역 로드
 }
}

//[리스트 로드] DB 내역을 비동기로 호출하여 타임라인 카드로 빌드 (현재 코드 완벽 유지)
function fn_load_notification_history() {
 const $listArea = $('#evNotiListArea');
 
 $.ajax({
     url: "${pageContext.request.contextPath}/api/notification/list",
     type: "GET",
     dataType: "json",
     success: function(list) {
         $listArea.empty();
         
         if(!list || list.length === 0) {
             $listArea.append('<div class="ev-noti-empty-state">받은 알림이 없습니다.</div>');
             return;
         }
         
         let htmlStr = '<div class="ev-noti-section-title">최근 받은 알림</div>';
         
         $.each(list, function(idx, item) {
             const unreadClass = item.isRead === 'N' ? 'unread' : '';
             
             let iconSymbol = "🔔";
             if(item.type === "CHARGE_COMPLETE") iconSymbol = "⚡";
             if(item.type === "CHARGE_ERROR") iconSymbol = "⚠️";
             
             htmlStr += `
                 <div class="ev-noti-item-card ${unreadClass}" onclick="fn_click_read_notification('${item.id}', '${item.referenceId}', '${item.referenceType}')">
                     <div class="ev-noti-item-meta">
                         <span class="ev-noti-item-icon">${iconSymbol}</span>
                         <span>${item.title}</span>
                     </div>
                     <div class="ev-noti-item-body">
                         ${item.content}
                     </div>
                 </div>
             `;
         });
         
         $listArea.append(htmlStr);
         
         // 리스트 드로잉이 끝난 후 전체 읽음 및 빨간 점 제거 호출
         fn_mark_all_notifications_as_read();
     },
     error: function() {
         $listArea.html('<div class="ev-noti-empty-state" style="color:var(--ev-destructive);">알림을 불러오지 못했습니다.</div>');
     }
 });
}

//[전체 읽음] 빨간 배지를 끄고 서버 테이블의 모든 상태를 'Y'로 업데이트
function fn_mark_all_notifications_as_read() {
 $('#globalBellDot').hide();
 $.ajax({
     url: "${pageContext.request.contextPath}/api/notification/read-all",
     type: "POST"
 });
}

//[개별 읽음 & 이동] 알림 카드 클릭 시 개별 읽음 처리 후 관련 비즈니스 페이지로 이동
function fn_click_read_notification(id, refId, refType) {
 $.ajax({
     url: "${pageContext.request.contextPath}/api/notification/read/" + id,
     type: "POST",
     success: function() {
         if (refType === "RESERVATION" && refId && refId !== "null" && refId !== "") {
             location.href = "${pageContext.request.contextPath}/reservation/detail?id=" + refId;
             return;
         }
         if (refType === "INQUIRY" && refId && refId !== "null" && refId !== "") {
             location.href = "${pageContext.request.contextPath}/user/inquiry/chat?roomId=" + refId;
             return;
         }
         fn_load_notification_history();
     },
     error: function() {
         console.error("알림 읽음 처리 중 통신 오류가 발생했습니다.");
         if (refType === "RESERVATION") location.href = "${pageContext.request.contextPath}/reservation/detail?id=" + refId;
         if (refType === "INQUIRY") location.href = "${pageContext.request.contextPath}/user/inquiry/chat?roomId=" + refId;
     }
 });
}

//[바탕 클릭 예외] 알림창 외의 구역 누르면 자연스럽게 닫히도록 튜닝
$(document).mouseup(function (e) {
 const container = $(".ev-header-bell-wrap");
 if (!container.is(e.target) && container.has(e.target).length === 0) {
     $("#evNotiCenter").hide();
 }
});
</script>