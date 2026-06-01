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

				<!-- 추가: 알림 벨 및 알림센터 (유저 메뉴 왼쪽에 클래스 기반 배치) -->
				<div class="ev-header-bell-wrap">
				<button type="button" class="ev-header-bell" onclick="fn_toggle_notification_center()">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
						<path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
					</svg>
					<!-- 🔴 수정: 단순 점(Dot)에서 안 읽은 실시간 알림 개수 숫자가 찍히는 카운트 뱃지로 변경 -->
					<span id="globalBellCount" class="ev-header-bell-badge">0</span>
				</button>
				
				<div id="evNotiCenter" class="ev-noti-center-box">
					<div class="ev-noti-center-header">
						<span class="ev-noti-center-title">알림센터</span>
					</div>
					<div id="evNotiListArea" class="ev-noti-scroll-area">
						<div class="ev-noti-empty-state">알림 내역을 가져오는 중입니다...</div>
					</div>
				</div>
			</div>

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
//[토글 함수] 종 모양 버튼 클릭 시 알림센터 레이어를 열고 닫음
function fn_toggle_notification_center() {
 const $centerBox = $('#evNotiCenter');
 if($centerBox.is(':visible')) {
     $centerBox.hide();
 } else {
     $centerBox.show();
     fn_load_notification_history(); 
 }
}

// [리스트 로드] DB 내역을 비동기로 호출하여 타임라인 카드로 빌드 (현재 코드 완벽 유지)
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
             if(item.type === "CHARGE_START") iconSymbol = "⚡";
             if(item.type === "RESERVATION_BEFORE") iconSymbol = "🚗";
             if(item.type === "INQUIRY_REPLIED") iconSymbol = "💬";
             
             htmlStr += `
                 <div class="ev-noti-item-card \${unreadClass}" onclick="fn_click_read_notification('\${item.id}', '\${item.referenceId}', '\${item.referenceType}', '\${item.type}')">
                     <div class="ev-noti-item-meta">
                         <span class="ev-noti-item-icon">\${iconSymbol}</span>
                         <span>\${item.title}</span>
                     </div>
                     <div class="ev-noti-item-body">
                         \${item.content}
                     </div>
                 </div>
             `;
         });
         
         $listArea.append(htmlStr);
         
         // 💡 비주얼 동기화: 사용자가 알림 팝업창을 직접 열어서 확인했으므로 화면상 숫자 배지만 즉시 숨김 처리
         $('#globalBellCount').text('0').hide();
     },
     error: function() {
         $listArea.html('<div class="ev-noti-empty-state" style="color:var(--ev-destructive);">알림을 불러오지 못했습니다.</div>');
     }
 });
}

// [전체 읽음] 개수 뱃지를 끄고 서버 테이블의 모든 상태를 'Y'로 업데이트
function fn_mark_all_notifications_as_read() {
 $.ajax({
     url: "${pageContext.request.contextPath}/api/notification/read-all",
     type: "POST"
 });
}

// [개별 읽음 & 이동] 알림 카드 클릭 시 개별 읽음 처리 후 관련 비즈니스 페이지로 이동
function fn_click_read_notification(id, refId, refType, alarmType) {
 // 💡 [시점 2 규격 보장]: 충전 진행 중(CHARGE_START) 알림은 알람을 창에 계속 남겨두기 위해 DB 완전 파기(DELETE)를 건너뛰고 마이페이지로 즉시 이동
 if (refType === "CHARGE" && alarmType === "CHARGE_START") {
     location.href = "${pageContext.request.contextPath}/mypage";
     return;
 }

 // 💡 [시점 1, 4 및 공통 규격 보장]: 충전 중 알림이 아닌 경우, 클릭 즉시 DB에서 알림 데이터를 영구 삭제(DELETE) 처리하는 백엔드 API 작동
 $.ajax({
     url: "${pageContext.request.contextPath}/api/notification/delete/" + id, // 👈 기존 read에서 완전 삭제용 delete API 엔드포인트로 전환
     type: "POST",
     success: function() {
         // [수정]: 15분 전 차량 입고 안내를 포함한 모든 예약 알림은 마이페이지로 이동 처리
         if (refType === "RESERVATION") {
             location.href = "${pageContext.request.contextPath}/mypage";
             return;
         }
         // [추가]: 충전 완료(CHARGE_COMPLETE) 클릭 시 종합 통계 및 지난 내역 확인을 위해 마이페이지로 이동 (확인 즉시 소멸 완료)
         if (refType === "CHARGE") {
             location.href = "${pageContext.request.contextPath}/mypage";
             return;
         }
         if (refType === "INQUIRY" && refId && refId !== "null" && refId !== "") {
             location.href = "${pageContext.request.contextPath}/user/inquiry/chat?roomId=" + refId;
             return;
         }
         fn_load_notification_history();
     },
     error: function() {
         console.error("알림 처리 중 통신 오류가 발생했습니다.");
         // 💡 네트워크 일시적 예외 발생 시에도 유저 경험을 위해 원래 기획된 주소로의 리다이렉트는 강제 보장합니다.
         if (refType === "RESERVATION") location.href = "${pageContext.request.contextPath}/mypage";
         if (refType === "CHARGE") location.href = "${pageContext.request.contextPath}/mypage";
         if (refType === "INQUIRY" && refId && refId !== "null" && refId !== "") {
             location.href = "${pageContext.request.contextPath}/user/inquiry/chat?roomId=" + refId;
         }
     }
 });
}

// [바탕 클릭 예외] 알림창 외의 구역 누르면 자연스럽게 닫히도록 튜닝
$(document).mouseup(function (e) {
 const container = $(".ev-header-bell-wrap");
 if (!container.is(e.target) && container.has(e.target).length === 0) {
     $("#evNotiCenter").hide();
 }
});
</script>