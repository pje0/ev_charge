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
    <main class="ev-notice-wrapper">
        <div class="ev-container">
            
            <section class="ev-notice-header">
                <h1 class="ev-notice-title">공지사항</h1>
                <p class="ev-notice-subtitle">서비스 점검 및 이벤트 소식을 전해드립니다.</p>
            </section>

            <!-- 1. 검색 및 필터 -->
            <section class="ev-notice-filter-bar">
                <form action="/notice/list" method="get" class="ev-search-group">
                    <input type="text" name="searchKeyword" class="ev-search-input" placeholder="검색어를 입력하세요" value="${cri.searchKeyword}">
                    <button type="submit" class="ev-btn ev-btn-primary">검색</button>
                </form>

                <div class="ev-filter-tabs">
                    <c:forEach var="cat" items="${['전체', '공지', '이벤트', '점검', '안내']}">
                        <a href="?category=${cat}" class="ev-btn ${ (cri.category == cat || (empty cri.category && cat == '전체')) ? 'ev-btn-primary' : 'ev-btn-outline' }">
                            ${cat}
                        </a>
                    </c:forEach>
                </div>
            </section>

            <!-- 2. [상단 고정 공지 전용 영역] 최대 3개까지만 출력 -->
            <div class="ev-notice-pinned-section" style="margin-bottom: 30px;">
                <c:set var="pin_limit" value="0" />
                <c:forEach var="n" items="${noticeList}">
                    <c:if test="${n.pinned && pin_limit < 3}">
                        <c:set var="pin_limit" value="${pin_limit + 1}" />
                        <div class="ev-notice-card pinned" onclick="fn_show_detail('${n.id}')" style="margin-bottom: 12px; border-left: 4px solid var(--ev-primary); background: oklch(0.38 0.18 258 / 0.03);">
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
                    </c:if>
                </c:forEach>
            </div>

            <!-- 구분선 (디자인 요소) -->
            <div style="height: 1px; background: var(--ev-border); margin: 40px 0;"></div>

            <!-- 3. [전체 공지 리스트 영역] 고정글 포함 모든 데이터를 날짜순으로 출력 -->
            <div class="ev-notice-list">
                <c:forEach var="n" items="${noticeList}">
                    <div class="ev-notice-card" onclick="fn_show_detail('${n.id}')">
                        <div class="ev-card-content">
                            <div class="ev-card-top">
                                <%-- 전체 목록에서도 고정글인 경우 아이콘이나 뱃지로 살짝 표시 --%>
                                <c:if test="${n.pinned}"><i style="color:var(--ev-primary); margin-right:5px;">📌</i></c:if>
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
                </c:forEach>
                
                <c:if test="${empty noticeList}">
                    <div style="text-align: center; padding: 100px 0; color: var(--ev-muted-foreground);">
                        등록된 공지사항이 없습니다.
                    </div>
                </c:if>
            </div>

            <!-- 4. 페이징 영역 -->
            <div class="ev-pagination">
                <c:if test="${cri.page > 1}">
                    <a href="?page=${cri.page - 1}&category=${cri.category}&searchKeyword=${cri.searchKeyword}" class="ev-page-btn">&lt;</a>
                </c:if>

                <c:forEach var="i" begin="1" end="${totalPages}">
                    <a href="?page=${i}&category=${cri.category}&searchKeyword=${cri.searchKeyword}" 
                       class="ev-page-btn ${cri.page == i ? 'active' : ''}">${i}</a>
                </c:forEach>

                <c:if test="${cri.page < totalPages}">
                    <a href="?page=${cri.page + 1}&category=${cri.category}&searchKeyword=${cri.searchKeyword}" class="ev-page-btn">&gt;</a>
                </c:if>
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