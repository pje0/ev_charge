<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>1:1 문의</title>
    <%-- 1. 공통 CSS 및 전용 CSS --%>
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/common.css">
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/user_inquiry.css">
    
    <%-- 2. jQuery (static 폴더 경로 규칙 적용) --%>
    <script src="${pageContext.request.contextPath}/js/jquery.js"></script>
</head>
<body>

    <div class="ev-container">
        <div class="chat-window">
            
            <%-- 대화 내역 --%>
            <div id="chatArea" class="chat-content">
                <c:forEach var="msg" items="${messages}">
                    <div class="msg ${msg.senderRole == 'USER' ? 'me' : 'admin'}">
                        <span class="txt">${msg.message}</span>
                    </div>
                </c:forEach>
            </div>

            <%-- 입력란 --%>
            <div class="chat-input-wrap">
                <input type="text" id="msgInput" placeholder="메시지 입력..." onkeypress="if(event.keyCode==13) send()">
                <button type="button" class="ev-btn ev-btn-primary" onclick="send()">전송</button>
            </div>
            
        </div>
    </div>

    <script>
    // 1. 스크롤을 맨 아래로 내리는 공통 함수
    function scrollToBottom() {
        const area = document.getElementById('chatArea');
        if (area) {
            area.scrollTop = area.scrollHeight;
        }
    }

    // 2. 페이지 로드 시 실행 (이전 대화가 많을 경우 대비)
    $(document).ready(function() {
        scrollToBottom();
    });

    // 3. 메시지 전송 함수
    function send() {
	        const content = $("#msgInput").val().trim();
	        if(!content) return;
	
	        $.ajax({
	            url: "${pageContext.request.contextPath}/user/inquiry/send",
	            type: "POST",
	            data: { content: content },
	            success: function(res) {
	                if(res === "ok") {
	                    // 메시지 추가
	                    $("#chatArea").append('<div class="msg me"><span class="txt">' + content + '</span></div>');
	                    // 입력창 비우기
	                    $("#msgInput").val("");
	                    // 스크롤 아래로!
	                    scrollToBottom();
	                }
	            }
	        });
	    }
	</script>
</body>
</html>