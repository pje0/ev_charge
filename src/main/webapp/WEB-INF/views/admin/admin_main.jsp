<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>관리자 페이지</title>
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/common.css">
    <script src="${pageContext.request.contextPath}/js/jquery.js"></script>
    <style>
        .admin-tab-content { display: none; }
        .admin-tab-content.active { display: block; }
    </style>
</head>
<body>
    <div class="ev-admin-main ev-container" style="padding: 20px;">
        <!-- 1. 탭 메뉴 -->
        <div class="ev-filter-tabs" style="margin-top: 30px; margin-bottom: 20px;">
            <button id="btn_notice" class="ev-btn ev-btn-primary" onclick="fn_switch_tab('notice')">공지 관리</button>
            <button id="btn_inquiry" class="ev-btn ev-btn-outline" onclick="fn_switch_tab('inquiry')">1:1 문의 관리</button>
        </div>

        <!-- 2. 공지 관리 탭 (인클루드) -->
        <section id="tab_notice" class="admin-tab-content active">
            <jsp:include page="admin_notice.jsp" />
        </section>

        <!-- 3. 문의 관리 탭 (인클루드) -->
        <section id="tab_inquiry" class="admin-tab-content">
            <jsp:include page="admin_inquiry.jsp" />
        </section>
    </div>

    <script>
        function fn_switch_tab(type) {
            $('.admin-tab-content').hide().removeClass('active');
            $('#tab_' + type).show().addClass('active');
            $('.ev-filter-tabs .ev-btn').removeClass('ev-btn-primary').addClass('ev-btn-outline');
            $('#btn_' + type).removeClass('ev-btn-outline').addClass('ev-btn-primary');
            
            if(type === 'inquiry' && typeof scrollToBottom === 'function') scrollToBottom();
        }
    </script>
</body>
</html>