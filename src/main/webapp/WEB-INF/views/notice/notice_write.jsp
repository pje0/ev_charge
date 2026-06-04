<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>새 공지사항 작성</title>
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/common.css">
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/notice.css">
    <script src="${pageContext.request.contextPath}/js/jquery.js"></script>
</head>

<body class="ev-background">
<jsp:include page="/WEB-INF/views/layout/header.jsp" />
<div class="ev-container" style="max-width: 800px; margin-top: 100px;">
    <div class="ev-admin-card">
        <header class="ev-notice-header" style="margin-bottom: 30px; border-bottom: 1px solid var(--ev-border); padding-bottom: 20px;">
            <h1 class="ev-notice-title">새 공지사항 작성</h1>
            <p class="ev-notice-subtitle">사용자에게 전달할 새로운 소식을 입력하세요.</p>
        </header>

        <form id="notice_write_form">
            <%-- 작성자 ID는 현재 관리자(1)로 고정 --%>
            <input type="hidden" name="writerId" value="1">

            <div style="margin-bottom: 20px;">
                <label class="ev-header-logo-bold" style="display:block; margin-bottom:8px;">카테고리</label>
                <select name="category" class="ev-search-input" style="width: 100%;">
                    <option value="공지">일반 공지</option>
                    <option value="이벤트">이벤트</option>
                    <option value="점검">시스템 점검</option>
                    <option value="안내">이용 안내</option>
                </select>
            </div>

            <div style="margin-bottom: 20px;">
                <label class="ev-header-logo-bold" style="display:block; margin-bottom:8px;">제목</label>
                <input type="text" name="title" class="ev-search-input" style="width: 100%;" placeholder="공지사항 제목을 입력하세요" required>
            </div>

            <div style="margin-bottom: 20px;">
                <label class="ev-header-logo-bold" style="display:block; margin-bottom:8px;">내용</label>
                <textarea name="content" class="ev-search-input" style="width: 100%; height: 300px; resize: none; line-height: 1.6;" placeholder="상세 내용을 입력하세요" required></textarea>
            </div>

            <div style="margin-bottom: 30px; display: flex; align-items: center; gap: 10px;">
                <input type="checkbox" name="pinned" id="is_pinned" style="width: 18px; height: 18px; cursor: pointer;">
                <label for="is_pinned" style="font-weight: 600; cursor: pointer; color: var(--ev-primary);">이 게시글을 상단에 고정합니다.</label>
            </div>

            <div style="display: flex; gap: 12px; justify-content: flex-end;">
                <button type="button" class="ev-btn ev-btn-outline" onclick="history.back()">취소</button>
                <button type="button" class="ev-btn ev-btn-primary" onclick="fn_submit_notice()">공지 등록하기</button>
            </div>
        </form>
    </div>
</div>

<script>
function fn_submit_notice() {
    // 간단한 유효성 검사
    let title = $('input[name="title"]').val().trim();
    const content = $('textarea[name="content"]').val();
    const category = $('select[name="category"]').val();
    const isPinned = $('#is_pinned').is(':checked'); // 상단 고정 체크 여부 (true/false)

    if(!title || !content) {
        alert("제목과 내용을 모두 입력해주세요.");
        return;
    }

    /* 📌 1. [추가] 상단 고정 선택 시 [중요] 태그 자동 처리 */
    if (isPinned) {
        const importantPrefix = "[중요]";
        // 사용자가 직접 [중요]를 타이핑한 경우 중복 방지
        if (!title.startsWith(importantPrefix)) {
            title = importantPrefix + " " + title;
        }
    }

    /* 📌 2. 카테고리 태그 자동 처리 로직 (일반 공지가 아닐 때만) */
    if (category !== "공지") {
        const categoryPrefix = "[" + category + "]";
        
        // 사용자가 직접 [점검] 등을 타이핑한 경우 중복 방지
        // 만약 상단 고정되어 앞에 [중요]가 붙었더라도, 전체 문자열에 카테고리 태그가 없으면 추가합니다.
        if (!title.includes(categoryPrefix)) {
            // [중요]가 맨 앞에 있다면 [중요] [점검] 제목 순서로 오도록 가공
            if (title.startsWith("[중요]")) {
                title = title.replace("[중요]", "[중요] " + categoryPrefix);
            } else {
                title = categoryPrefix + " " + title;
            }
        }
    }

    // 데이터 조립 (최종 가공된 title 값이 반영됩니다)
    const formData = {
        category: category,
        title: title,
        content: content,
        writerId: $('input[name="writerId"]').val(),
        pinned: isPinned
    };

    // AJAX 전송
    $.ajax({
        url: '${pageContext.request.contextPath}/admin/notice/write',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(formData),
        success: function(res) {
            if(res) {
                alert("공지사항이 성공적으로 등록되었습니다.");
                location.href = "${pageContext.request.contextPath}/admin/adminpage?tab=notice";
            } else {
                alert("등록에 실패했습니다. 다시 시도해주세요.");
            }
        },
        error: function() {
            alert("서버 통신 중 오류가 발생했습니다.");
        }
    });
}
</script>

</body>
</html>