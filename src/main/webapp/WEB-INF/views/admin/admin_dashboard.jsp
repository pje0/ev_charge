<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>관리자 대시보드</title>

    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/common.css">
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/admin_dashboard.css">
    <script src="${pageContext.request.contextPath}/js/jquery.js"></script>
</head>
<body>

<div class="dashboard-wrap">

    <!-- Dashboard Header -->
    <div class="dashboard-header">
        <div>
            <h2>관리자 대시보드</h2>
            <p>서비스 운영 현황 요약</p>
        </div>
    </div>

    <!-- Dashboard Cards -->
    <div class="dashboard-grid">

        <!-- 전체 회원 -->
        <div class="dashboard-card">
            <span class="dash-label">전체 회원</span>
            <strong class="dash-value" id="userCount">
                ${dashboard.userCount}
            </strong>
            <small class="dash-desc">가입된 일반 회원</small>
        </div>

        <!-- 오늘 예약 -->
        <div class="dashboard-card">
            <span class="dash-label">오늘 예약</span>
            <strong class="dash-value" id="todayReservationCount">
                ${dashboard.todayReservationCount}
            </strong>
            <small class="dash-desc">오늘 생성된 예약</small>
        </div>

        <!-- 충전중 -->
        <div class="dashboard-card">
            <span class="dash-label">충전중</span>
            <strong class="dash-value" id="chargingCount">
                ${dashboard.chargingCount}
            </strong>
            <small class="dash-desc">현재 CHARGING 상태</small>
        </div>

        <!-- 예약대기 -->
        <div class="dashboard-card">
            <span class="dash-label">예약대기</span>
            <strong class="dash-value" id="reservedCount">
                ${dashboard.reservedCount}
            </strong>
            <small class="dash-desc">RESERVED 상태</small>
        </div>

        <!-- 미확인 문의 -->
        <div class="dashboard-card dashboard-alert">
            <span class="dash-label">미확인 문의</span>
            <strong class="dash-value" id="unreadInquiryCount">
                ${dashboard.unreadInquiryCount}
            </strong>
            <small class="dash-desc">읽지 않은 사용자 문의</small>
        </div>

        <!-- 공지 -->
        <div class="dashboard-card">
            <span class="dash-label">공지 수</span>
            <strong class="dash-value" id="noticeCount">
                ${dashboard.noticeCount}
            </strong>
            <small class="dash-desc">등록된 공지사항</small>
        </div>

    </div>
</div>

<script>

// Dashboard 전체 카드 10초 폴링
function refreshDashboard() {

    $.ajax({
        url: "${pageContext.request.contextPath}/admin/dashboard/summary",
        type: "GET",
        dataType: "json",

        success: function(data) {

            $("#userCount").text(data.userCount);
            $("#todayReservationCount").text(data.todayReservationCount);
            $("#chargingCount").text(data.chargingCount);
            $("#reservedCount").text(data.reservedCount);
            $("#unreadInquiryCount").text(data.unreadInquiryCount);
            $("#noticeCount").text(data.noticeCount);

            console.log("Dashboard polling success", data);
        },

        error: function(xhr, status, error) {
            console.log("Dashboard polling fail", xhr.status, error);
        }
    });
}

// 10초마다 갱신
setInterval(refreshDashboard, 10000);

</script>

</body>
</html>