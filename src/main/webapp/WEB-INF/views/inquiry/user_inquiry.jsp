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
			            <%-- 초기 로드 시에도 읽음 상태 표시 추가 --%>
			            <c:if test="${msg.senderRole == 'USER'}">
			                <span class="read-status ${msg.isRead == 'N' ? 'unread' : ''}">
			                    ${msg.isRead == 'Y' ? '읽음' : '읽지 않음'}
			                </span>
			            </c:if>
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
    let currentRoomId = "${roomId}"; // 방 번호 저장
    let lastMessageCount = ${messages.size()}; // 초기 메시지 개수 저장 (JSTL로 주입)
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
    $(document).ready(function() {
        scrollToBottom(); // 초기 로드 시 하단 이동

        // 3초마다 새 메시지 체크
        setInterval(function() {
            $.ajax({
                url: "${pageContext.request.contextPath}/user/inquiry/messages",
                type: "GET",
                data: { roomId: "${roomId}" },
                success: function(list) {
                    let html = "";
                    
                    list.forEach(msg => {
                        const isMe = (msg.senderRole === 'USER');
                        // 1. 읽음 상태 값 판별 (DB 컬럼명 확인 필수)
                        const isRead = (msg.isRead === 'Y' || msg.is_read === 'Y');
                        const statusText = isRead ? "읽음" : "읽지 않음";
                        const statusClass = isRead ? "" : "unread";

                        html += '<div class="msg ' + (isMe ? 'me' : 'admin') + '">';
                        
                        // 2. [추가] 내가 보낸 메시지일 때만 상태 텍스트 삽입
                        if (isMe) {
                            html += '<span class="read-status ' + statusClass + '">' + statusText + '</span>';
                        }
                        
                        html += '    <span class="txt">' + (msg.message || msg.Message) + '</span>';
                        html += '</div>';
                    });
                    
                    // 3. [핵심] 전체를 다시 그려야 기존 '읽지 않음'이 '읽음'으로 업데이트됨
                    $("#chatArea").html(html);
                    
                    // 4. 메시지 개수가 늘어났을 때만 스크롤 하단 이동
                    if (list.length > lastMessageCount) {
                        scrollToBottom();
                        lastMessageCount = list.length;
                    }
                }
            });
        }, 3000);
    });
	</script>
</body>
</html>