<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>공지사항</title>
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/common.css">
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/notice.css">
</head>
<body>

    <!-- 공통 헤더 영역 (common.css 적용됨) -->
    <header class="ev-header">
        <div class="ev-container ev-header-inner">
            <a href="/" class="ev-header-logo">
                <div class="ev-header-logo-icon">E</div>
                <div><span class="ev-header-logo-bold">EV</span><span class="ev-header-logo-light">충전소</span></div>
            </a>
            <nav class="ev-header-nav">
                <a href="/notice/list" class="ev-header-nav-link active">공지사항</a>
                <a href="/admin/notice/main" class="ev-header-nav-link ev-header-nav-link-admin">관리자</a>
            </nav>
        </div>
    </header>

    <main class="ev-notice-wrapper">
        <div class="ev-container">
            
            <section class="ev-notice-header">
                <h1 class="ev-notice-title">공지사항</h1>
                <p class="ev-notice-subtitle">서비스 점검 및 이벤트 소식을 전해드립니다.</p>
            </section>

            <!-- 검색 및 필터 -->
            <section class="ev-notice-filter-bar">
                <form action="/notice/list" method="get" class="ev-search-group">
                    <input type="text" name="searchKeyword" class="ev-search-input" placeholder="검색어를 입력하세요" value="${param.searchKeyword}">
                    <button type="submit" class="ev-btn ev-btn-primary">검색</button>
                </form>

                <div class="ev-filter-tabs">
                    <c:forEach var="cat" items="${['전체', '공지', '이벤트', '점검', '안내']}">
                        <a href="?category=${cat}" class="ev-btn ${ (param.category == cat || (empty param.category && cat == '전체')) ? 'ev-btn-primary' : 'ev-btn-outline' }">
                            ${cat}
                        </a>
                    </c:forEach>
                </div>
            </section>

            <!-- 리스트 -->
            <div class="ev-notice-list">
                <c:set var="pin_count" value="0" />
                <c:forEach var="n" items="${noticeList}">
                    <c:choose>
                        <c:when test="${n.pinned && pin_count < 3}">
                            <c:set var="pin_count" value="${pin_count + 1}" />
                            <div class="ev-notice-card pinned" onclick="fn_show_detail('${n.id}')">
                                <div class="ev-card-content">
                                    <div class="ev-card-top">
                                        <span class="ev-badge-pin">중요</span>
                                        <span class="ev-category-text">${n.category}</span>
                                    </div>
                                    <h3 class="ev-card-title">${n.title}</h3>
                                    <div class="ev-card-meta">
                                        <span>${n.writerName}</span>
                                        <span>${n.createdAt}</span>
                                        <span>조회 ${n.views}</span>
                                    </div>
                                </div>
                            </div>
                        </c:when>
                        <c:otherwise>
                            <div class="ev-notice-card" onclick="fn_show_detail('${n.id}')">
                                <div class="ev-card-content">
                                    <div class="ev-card-top"><span class="ev-category-text">${n.category}</span></div>
                                    <h3 class="ev-card-title">${n.title}</h3>
                                    <div class="ev-card-meta">
                                        <span>${n.writerName}</span>
                                        <span>${n.createdAt}</span>
                                        <span>조회 ${n.views}</span>
                                    </div>
                                </div>
                            </div>
                        </c:otherwise>
                    </c:choose>
                </c:forEach>
            </div>
        </div>
    </main>

    <!-- 상세보기 모달 -->
    <div id="notice_modal" class="ev-modal-overlay">
        <div class="ev-modal-window">
            <div class="ev-modal-header">
                <div>
                    <span id="m_category" class="ev-category-text"></span>
                    <h2 id="m_title" class="ev-notice-title" style="margin-top:8px;"></h2>
                </div>
                <button class="ev-btn ev-btn-ghost" onclick="fn_close_modal()">닫기</button>
            </div>
            <div id="m_content" class="ev-modal-body"></div>
        </div>
    </div>

    <script>
        function fn_show_detail(id) {
            fetch('${pageContext.request.contextPath}/notice/detail/' + id)
                .then(res => res.json())
                .then(data => {
                    document.getElementById('m_category').innerText = '[' + data.category + ']';
                    document.getElementById('m_title').innerText = data.title;
                    document.getElementById('m_content').innerText = data.content;
                    document.getElementById('notice_modal').style.display = 'flex';
                });
        }

        function fn_close_modal() {
            document.getElementById('notice_modal').style.display = 'none';
        }
    </script>
</body>
</html>