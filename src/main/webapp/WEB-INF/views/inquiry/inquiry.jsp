<%@ page language="java" contentType="text/html; charset=UTF-8"
    pageEncoding="UTF-8"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>1:1 문의 관리</title>
    <!-- 아까 가져온 common.css 연결 (경로 확인 필수!) -->
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/common.css">
    <style>
        /* 문의 게시판 전용 추가 스타일 */
        .qna-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .qna-table th, .qna-table td { border: 1px solid #ddd; padding: 10px; text-align: center; }
    </style>
</head>
<body>

    <div class="container"> <!-- common.css에 container 클래스가 있다고 가정 -->
        <h1>1:1 문의 목록</h1>
        
        <table class="qna-table">
            <thead>
                <tr>
                    <th>번호</th>
                    <th>제목</th>
                    <th>작성자</th>
                    <th>등록일</th>
                    <th>상태</th>
                </tr>
            </thead>
            <tbody>
                <c:forEach var="qna" items="${qnaList}">
                    <tr>
                        <td>${qna.id}</td>
                        <td><a href="detail?id=${qna.id}">${qna.title}</a></td>
                        <td>${qna.writer}</td>
                        <td>${qna.regDate}</td>
                        <td>${qna.status == 'Y' ? '답변완료' : '미답변'}</td>
                    </tr>
                </c:forEach>
            </tbody>
        </table>
    </div>

</body>
</html>