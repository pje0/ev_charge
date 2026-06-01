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
// =================================================================
// [추가] 페이지 로드 완료 시 초기 구동 및 10초 주기 실시간 자동 갱신
// =================================================================
$(document).ready(function() {
    // 1. 페이지가 처음 켜졌을 때 안 읽은 개수를 즉시 가져와 배지에 반영
    fn_update_notification_count();
    
    // 2. 가만히 있어도 10초마다 백엔드를 감시해 새 알림이 오면 숫자를 실시간으로 올림 (10000ms = 10초)
    setInterval(fn_update_notification_count, 10000);
});

// =================================================================
// [추가] 실시간으로 안 읽은 알림 개수를 받아와 배지에 동기화하는 함수
// =================================================================
function fn_update_notification_count() {
    // 유저가 현재 알림창(레이어)을 열어서 확인 중인 상태라면 실시간 개수 갱신을 잠시 건너뜁니다.
    if($('#evNotiCenter').is(':visible')) {
        return;
    }

    $.ajax({
        url: "${pageContext.request.contextPath}/api/notification/list",
        type: "GET",
        dataType: "json",
        success: function(list) {
            if(!list || list.length === 0) {
                $('#globalBellCount').text('0').hide();
                return;
            }
            
            // 전체 알림 리스트 중에서 아직 안 읽은(isRead === 'N') 알림의 개수만 필터링하여 계산
            const unreadCount = list.filter(item => item.isRead === 'N').length;
            
            const $badge = $('#globalBellCount');
            if(unreadCount > 0) {
                $badge.text(unreadCount).show(); // 💡 드디어 숫자가 실시간으로 올라감!
            } else {
                $badge.text('0').hide();
            }
        },
        error: function() {
            console.error("실시간 알림 개수 갱신 실패");
        }
    });
}

// [토글 함수] 종 모양 버튼 클릭 시 알림센터 레이어를 열고 닫음
function fn_toggle_notification_center() {
 const $centerBox = $('#evNotiCenter');
 if($centerBox.is(':visible')) {
     $centerBox.hide();
     // 창을 닫을 때 다시 실시간 개수 배지를 최신화하여 동기화
     fn_update_notification_count();
 } else {
     $centerBox.show();
     fn_load_notification_history(); 
 }
}

// [리스트 로드] DB 내역을 비동기로 호출하여 타임라인 카드로 빌드
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
             $('#globalBellCount').text('0').hide();
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
         
         // 💡 [수정] 무작정 숫자를 0으로 지우는 대신, 목록을 확인했으므로 서버에 전체 읽음 신호를 보내 동기화합니다.
         fn_mark_all_notifications_as_read(); 
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
 if (refType === "CHARGE" && alarmType === "CHARGE_START") {
     location.href = "${pageContext.request.contextPath}/mypage";
     return;
 }

 $.ajax({
     url: "${pageContext.request.contextPath}/api/notification/delete/" + id, 
     type: "POST",
     success: function() {
         if (refType === "RESERVATION") {
             location.href = "${pageContext.request.contextPath}/mypage";
             return;
         }
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
     fn_update_notification_count(); // 💡 창이 닫힐 때 실시간 개수 배지 상태 재조회
 }
});
</script>