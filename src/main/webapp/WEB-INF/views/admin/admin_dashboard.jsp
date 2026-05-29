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
<div class="admin-dashboard-wrap">

    <!-- 대시보드 헤더 -->
    <div class="dashboard-header">
        <div>
            <h2>관리자 대시보드</h2>
            <p>EV 충전소 서비스 운영 현황</p>
        </div>

        <div class="dashboard-refresh">
            <span id="dashboardUpdateTime">
                마지막 갱신 : 방금 전
            </span>
        </div>
    </div>

    <!-- 카드 영역 -->
    <div class="dashboard-grid">

        <!-- 전체 회원 -->
        <div class="dashboard-card">
            <div class="card-title">전체 회원</div>
            <div class="card-value" id="totalUsers">
                ${dashboard.totalUsers}
            </div>
            <div class="card-desc">가입된 회원 수</div>
        </div>

        <!-- 전체 예약 -->
        <div class="dashboard-card">
            <div class="card-title">전체 예약</div>
            <div class="card-value" id="totalReservations">
                ${dashboard.totalReservations}
            </div>
            <div class="card-desc">누적 예약 건수</div>
        </div>

        <!-- 예약 대기 -->
        <div class="dashboard-card">
            <div class="card-title">예약 대기</div>
            <div class="card-value waiting" id="reservedCount">
                ${dashboard.reservedCount}
            </div>
            <div class="card-desc">RESERVED 상태</div>
        </div>

        <!-- 충전 진행 -->
        <div class="dashboard-card">
            <div class="card-title">충전 진행</div>
            <div class="card-value charging" id="chargingCount">
                ${dashboard.chargingCount}
            </div>
            <div class="card-desc">CHARGING 상태</div>
        </div>

        <!-- 열린 문의 -->
        <div class="dashboard-card">
            <div class="card-title">열린 문의</div>
            <div class="card-value inquiry" id="openInquiryCount">
                ${dashboard.openInquiryCount}
            </div>
            <div class="card-desc">진행중 문의방</div>
        </div>

        <!-- 공지사항 -->
        <div class="dashboard-card">
            <div class="card-title">공지사항</div>
            <div class="card-value notice" id="noticeCount">
                ${dashboard.noticeCount}
            </div>
            <div class="card-desc">등록된 공지 수</div>
        </div>

    </div>
</div>

<script>

    // Dashboard polling
    function refreshDashboard() {

        $.ajax({
            url: "${pageContext.request.contextPath}/admin/dashboard/summary",
            type: "GET",
            dataType: "json",

            success: function(data) {

                $("#totalUsers").text(data.totalUsers);
                $("#totalReservations").text(data.totalReservations);
                $("#reservedCount").text(data.reservedCount);
                $("#chargingCount").text(data.chargingCount);
                $("#openInquiryCount").text(data.openInquiryCount);
                $("#noticeCount").text(data.noticeCount);

                const now = new Date().toLocaleTimeString();

                $("#dashboardUpdateTime").text(
                    "마지막 갱신 : " + now
                );
            },

            error: function() {
                console.log("Dashboard polling error");
            }
        });
    }

    // 10초 주기 전체 카드 polling
    setInterval(refreshDashboard, 10000);

</script>
</body>
</html>