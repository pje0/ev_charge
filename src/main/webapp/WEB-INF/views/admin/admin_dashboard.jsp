<%@ page language="java" contentType="text/html; charset=UTF-8"
	pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>관리자 대시보드</title>
<link rel="stylesheet"
	href="${pageContext.request.contextPath}/css/common.css">
<link rel="stylesheet"
	href="${pageContext.request.contextPath}/css/admin_dashboard.css">
<script src="${pageContext.request.contextPath}/js/jquery.js"></script>
</head>
<body>

	<!-- common.css의 ev-container를 사용하여 하단 본문과 너비를 완벽히 일치시킴 -->
	<div class="ev-container">
		<div class="dashboard-wrap">

			<!-- 슬림 헤더 -->
			<div class="dashboard-header">
				<h2>운영 현황</h2>
				<p>실시간 서비스 지표 요약</p>
			</div>

			<!-- 슬림 그리드 -->
			<div class="dashboard-grid">
				<!-- 전체 회원 -->
				<div class="dashboard-card">
					<div class="dash-label">
						<svg width="13" height="13" viewBox="0 0 24 24" fill="none"
							stroke="currentColor" stroke-width="2">
							<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
							
							<circle cx="9" cy="7" r="4" />
							
							<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
							
							<path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
						전체 회원
					</div>
					<strong class="dash-value" id="userCount">${dashboard.userCount}</strong>
					<div class="dash-meta">
						<span class="dash-trend neutral">↔ 안정적</span>
					</div>
				</div>

				<!-- 오늘 예약 -->
				<div class="dashboard-card">
					<div class="dash-label">
						<svg width="13" height="13" viewBox="0 0 24 24" fill="none"
							stroke="currentColor" stroke-width="2">
							<rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
							<line x1="16" y1="2" x2="16" y2="6" />
							<line x1="8" y1="2" x2="8" y2="6" />
							<line x1="3" y1="10" x2="21" y2="10" /></svg>
						오늘 예약
					</div>
					<strong class="dash-value" id="todayReservationCount">${dashboard.todayReservationCount}</strong>
					<div class="dash-meta">
						<span class="dash-trend up">↑ 활성</span>
					</div>
				</div>

				<!-- 충전중 -->
				<div class="dashboard-card dashboard-warning">
					<div class="dash-label">
						<svg width="13" height="13" viewBox="0 0 24 24" fill="none"
							stroke="currentColor" stroke-width="2">
							<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
						충전중
					</div>
					<strong class="dash-value" id="chargingCount">${dashboard.chargingCount}</strong>
					<div class="dash-meta">
						<span class="dash-trend neutral">진행 중</span>
					</div>
				</div>

				<!-- 예약대기 -->
				<div class="dashboard-card">
					<div class="dash-label">
						<svg width="13" height="13" viewBox="0 0 24 24" fill="none"
							stroke="currentColor" stroke-width="2">
							<circle cx="12" cy="12" r="10" />
							<polyline points="12 6 12 12 16 14" /></svg>
						예약대기
					</div>
					<strong class="dash-value" id="reservedCount">${dashboard.reservedCount}</strong>
					<div class="dash-meta">
						<span class="dash-trend neutral">대기 중</span>
					</div>
				</div>

				<!-- 미확인 문의 -->
				<div class="dashboard-card dashboard-alert">
					<div class="dash-label">
						<svg width="13" height="13" viewBox="0 0 24 24" fill="none"
							stroke="currentColor" stroke-width="2">
							<path
								d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
							<line x1="12" y1="9" x2="12" y2="13" />
							<line x1="12" y1="17" x2="12.01" y2="17" /></svg>
						미확인 문의
					</div>
					<strong class="dash-value" id="unreadInquiryCount">${dashboard.unreadInquiryCount}</strong>
					<div class="dash-meta">
						<span class="dash-trend down">주의 필요</span>
					</div>
				</div>

				<!-- 공지 -->
				<div class="dashboard-card">
					<div class="dash-label">
						<svg width="13" height="13" viewBox="0 0 24 24" fill="none"
							stroke="currentColor" stroke-width="2">
							<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
							<path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
						공지사항
					</div>
					<strong class="dash-value" id="noticeCount">${dashboard.noticeCount}</strong>
					<div class="dash-meta">
						<span class="dash-trend neutral">정상 운영</span>
					</div>
				</div>
			</div>
		</div>
	</div>

	<script>
		function refreshDashboard() {
			$
					.ajax({
						url : "${pageContext.request.contextPath}/admin/dashboard/summary",
						type : "GET",
						dataType : "json",
						success : function(data) {
							$("#userCount").text(data.userCount);
							$("#todayReservationCount").text(
									data.todayReservationCount);
							$("#chargingCount").text(data.chargingCount);
							$("#reservedCount").text(data.reservedCount);
							$("#unreadInquiryCount").text(
									data.unreadInquiryCount);
							$("#noticeCount").text(data.noticeCount);
						}
					});
		}
		setInterval(refreshDashboard, 10000);
	</script>

</body>
</html>
