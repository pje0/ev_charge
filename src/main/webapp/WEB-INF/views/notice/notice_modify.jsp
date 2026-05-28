<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>공지사항 수정</title>
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/common.css">
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/notice.css">
    <script src="${pageContext.request.contextPath}/js/jquery.js"></script>
</head>
<body class="ev-background">
<jsp:include page="/WEB-INF/views/layout/header.jsp" />

<div class="ev-container" style="max-width: 800px; margin-top: 50px;">
    <div class="ev-admin-card">
        <header class="ev-notice-header" style="margin-bottom: 30px; border-bottom: 1px solid var(--ev-border); padding-bottom: 20px;">
            <h1 class="ev-notice-title">공지사항 수정</h1>
            <p class="ev-notice-subtitle">기존 공지사항의 내용을 변경합니다.</p>
        </header>

        <form id="notice_modify_form">
            <!-- [중요] 수정에 필요한 ID와 작성자 정보를 숨겨서 전달 -->
            <input type="hidden" name="id" value="${notice.id}">
            <input type="hidden" name="writerId" value="${notice.writerId}">

            <div style="margin-bottom: 20px;">
                <label class="ev-header-logo-bold" style="display:block; margin-bottom:8px;">카테고리</label>
                <select name="category" class="ev-search-input" style="width: 100%;">
                    <option value="공지" ${notice.category == '공지' ? 'selected' : ''}>일반 공지</option>
                    <option value="이벤트" ${notice.category == '이벤트' ? 'selected' : ''}>이벤트</option>
                    <option value="점검" ${notice.category == '점검' ? 'selected' : ''}>시스템 점검</option>
                    <option value="안내" ${notice.category == '안내' ? 'selected' : ''}>이용 안내</option>
                </select>
            </div>

            <div style="margin-bottom: 20px;">
                <label class="ev-header-logo-bold" style="display:block; margin-bottom:8px;">제목</label>
                <input type="text" name="title" class="ev-search-input" style="width: 100%;" value="${notice.title}" required>
            </div>

            <div style="margin-bottom: 20px;">
                <label class="ev-header-logo-bold" style="display:block; margin-bottom:8px;">내용</label>
                <textarea name="content" class="ev-search-input" style="width: 100%; height: 300px; resize: none; line-height: 1.6;" required>${notice.content}</textarea>
            </div>

            <div style="margin-bottom: 30px; display: flex; align-items: center; gap: 10px;">
                <input type="checkbox" name="pinned" id="is_pinned" ${notice.pinned ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;">
                <label for="is_pinned" style="font-weight: 600; cursor: pointer; color: var(--ev-primary);">이 게시글을 상단에 고정합니다.</label>
            </div>

            <div style="display: flex; gap: 12px; justify-content: flex-end;">
                <button type="button" class="ev-btn ev-btn-outline" onclick="history.back()">취소</button>
                <button type="button" class="ev-btn ev-btn-primary" onclick="fn_modify_notice()">수정 완료</button>
            </div>
        </form>
    </div>
</div>

<script>
function fn_modify_notice() {
    const title = $('input[name="title"]').val();
    const content = $('textarea[name="content"]').val();

    if(!title || !content) {
        alert("제목과 내용을 입력해주세요.");
        return;
    }

    const formData = {
        id: $('input[name="id"]').val(),
        category: $('select[name="category"]').val(),
        title: title,
        content: content,
        writerId: $('input[name="writerId"]').val(),
        pinned: $('#is_pinned').is(':checked')
    };

    $.ajax({
        url: '${pageContext.request.contextPath}/admin/notice/update',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(formData),
        success: function(res) {
            if(res) {
                alert("성공적으로 수정되었습니다.");
                location.href = "${pageContext.request.contextPath}/admin/adminpage";
            } else {
                alert("수정에 실패했습니다.");
            }
        },
        error: function() {
            alert("통신 오류가 발생했습니다.");
        }
    });
}
</script>

</body>
</html>