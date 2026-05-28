<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core"%>
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>공지사항 관리</title>
    
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/common.css">
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/admin_notice.css">
</head>
<body>

<div class="ev-admin-card" style="background: #fff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); margin: 20px;">
    
    <!-- 1. 헤더 및 필터 영역 -->
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:25px;">
        <div style="display:flex; align-items:center; gap:15px;">
            <h2 style="font-weight:700; font-size: 1.3rem; color: #111; margin:0;">공지사항 관리</h2>
            
            <!-- 카테고리 필터 (Criteria.category와 연동) -->
            <select id="filterCategory" onchange="fn_filter_category(this.value)" 
                    style="padding: 6px 12px; border-radius: 8px; border: 1px solid #ddd; font-size: 14px; color: #555; cursor:pointer; outline:none;">
                <option value="전체" ${cri.category == '전체' ? 'selected' : ''}>전체 카테고리</option>
                <option value="공지" ${cri.category == '공지' ? 'selected' : ''}>공지</option>
                <option value="점검" ${cri.category == '점검' ? 'selected' : ''}>점검</option>
                <option value="이벤트" ${cri.category == '이벤트' ? 'selected' : ''}>이벤트</option>
            </select>
        </div>
        
        <button class="ev-btn ev-btn-primary" 
                onclick="location.href='${pageContext.request.contextPath}/admin/notice/write'">
            + 새 공지 작성
        </button>
    </div>

    <!-- 2. 게시글 테이블 -->
    <table class="ev-table" style="width: 100%; border-collapse: collapse;">
        <thead>
            <tr style="border-top: 1px solid #eee; border-bottom: 1px solid #eee; background: #fcfcfc;">
                <th style="padding: 15px; text-align: left; font-weight: 600; color: #666; width: 100px; font-size: 14px;">카테고리</th>
                <th style="padding: 15px; text-align: left; font-weight: 600; color: #666; font-size: 14px;">제목</th>
                <th style="padding: 15px; text-align: center; font-weight: 600; color: #666; width: 100px; font-size: 14px;">작성자</th>
                <th style="padding: 15px; text-align: center; font-weight: 600; color: #666; width: 130px; font-size: 14px;">작성일</th>
                <th style="padding: 15px; text-align: center; font-weight: 600; color: #666; width: 80px; font-size: 14px;">조회수</th>
                <th style="padding: 15px; text-align: center; font-weight: 600; color: #666; width: 80px; font-size: 14px;">고정</th>
                <th style="padding: 15px; text-align: center; font-weight: 600; color: #666; width: 100px; font-size: 14px;">관리</th>
            </tr>
        </thead>
        <tbody>
            <c:forEach var="n" items="${noticeList}">
                <tr style="border-bottom: 1px solid #f8f8f8; transition: all 0.2s;" onmouseover="this.style.background='#fafafa'" onmouseout="this.style.background='white'">
                    <td style="padding: 15px;">
                        <span style="border: 1px solid #ddd; padding: 3px 10px; border-radius: 20px; font-size: 12px; color: #666; background: #fff;">
                            ${n.category}
                        </span>
                    </td>
                    <td style="padding: 15px;">
                        <a href="${pageContext.request.contextPath}/admin/notice/edit/${n.id}" 
                           style="text-decoration: none; color: #333; font-weight: 600; font-size: 15px; display: block;">
                            ${n.title}
                        </a>
                    </td>
                    <td style="padding: 15px; text-align: center; color: #444; font-size: 14px;">${n.writerName}</td>
                    <td style="padding: 15px; text-align: center; color: #888; font-size: 14px;">${n.createdAt}</td>
                    <td style="padding: 15px; text-align: center; color: #444; font-size: 14px;">${n.views}</td>
                    <td style="padding: 15px; text-align: center;">
                        <c:if test="${n.pinned}">
                            <span style="color: #0033cc; background: #eef2ff; font-weight: 700; font-size: 11px; padding: 3px 7px; border-radius: 4px;">고정</span>
                        </c:if>
                    </td>
                    <td style="padding: 15px; text-align: center;">
                        <button class="ev-btn ev-btn-ghost" 
                                style="color: #ff4444; font-size: 13px; font-weight: 600; padding: 0; border: none; background: none; cursor: pointer;"
                                onclick="fn_remove_notice('${n.id}')">삭제</button>
                    </td>
                </tr>
            </c:forEach>
            
            <c:if test="${empty noticeList}">
                <tr>
                    <td colspan="7" style="padding: 100px; text-align: center; color: #bbb; font-size: 15px;">등록된 공지사항이 없습니다.</td>
                </tr>
            </c:if>
        </tbody>
    </table>

    <%-- 페이징 영역 --%>
    <c:if test="${totalPages > 1}">
        <div style="margin-top: 30px; display: flex; justify-content: center; gap: 5px;">
            <c:forEach var="i" begin="1" end="${totalPages}">
                <%-- class 속성 맨 뒤에 page-btn 추가 --%>
                <button class="ev-btn ${cri.page == i ? 'ev-btn-primary' : 'ev-btn-outline'} page-btn" 
                        style="min-width: 35px; height: 35px; padding: 0;"
                        onclick="location.href='${pageContext.request.contextPath}/admin/adminpage?page=${i}&category=${cri.category}'">
                    ${i}
                </button>
            </c:forEach>
        </div>
    </c:if>
</div>

<script>
    // 카테고리 필터링 (Criteria 연동)
    function fn_filter_category(category) {
        location.href = "${pageContext.request.contextPath}/admin/adminpage?page=1&category=" + encodeURIComponent(category);
    }

    // 공지사항 삭제 (Service 연동)
    function fn_remove_notice(id) {
        if(!confirm("해당 공지사항을 정말로 삭제하시겠습니까?")) return;
        location.href = "${pageContext.request.contextPath}/admin/notice/delete/" + id;
    }
</script>

</body>
</html>