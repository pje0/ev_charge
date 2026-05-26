<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core"%>
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>관리자 문의 관리</title>
    <%-- 1. 공통 스타일 및 관리자 전용 스타일 로드 --%>
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/common.css">
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/admin_inquiry.css">
    
    <%-- 2. jQuery 로드 --%>
    <script src="${pageContext.request.contextPath}/js/jquery.js"></script>
</head>
<body class="ev-admin-body">

    <div class="admin-inquiry-layout">
        
        <%-- [좌측] 문의 목록 리스트 --%>
        <div class="inquiry-side-list">
            <div class="side-header">
                <h3>1:1 문의 목록</h3>
                <span class="count" id="totalCount">전체 ${rooms.size()}건</span>
            </div>
            <div class="list-wrapper">
                <c:forEach var="room" items="${rooms}">
                    <div class="room-item" onclick="loadChatDetail(${room.id}, '${room.userName}')" id="room-${room.id}">
                        <div class="room-info">
                            <span class="user-name">${room.userName}</span>
                            <p class="last-msg">${room.lastMessage != null ? room.lastMessage : '대화 내역이 없습니다.'}</p>
                        </div>
                    </div>
                </c:forEach>
            </div>
        </div>

        <%-- [우측] 채팅 상세 및 입력 영역 --%>
        <div class="inquiry-chat-main">
            <%-- 초기 화면 --%>
            <div id="chatWelcome" class="empty-view" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #bbb;">
                <div class="icon" style="font-size: 40px; margin-bottom: 10px;">💬</div>
                <p>목록에서 유저를 선택하여 상담을 시작하세요.</p>
            </div>

            <%-- 실제 대화창 --%>
            <div id="chatRoomArea">
                <div class="chat-header">
                    <div><span id="targetUserName">유저명</span>님과의 대화</div>
                    <button class="ev-btn ev-btn-outline ev-btn-sm" onclick="closeInquiry()">문의 종료</button>
                </div>
                
                <div id="adminChatArea" class="chat-content">
                    <%-- AJAX 메시지 --%>
                </div>

                <div class="chat-input-wrap">
                    <input type="text" id="adminMsgInput" placeholder="답변을 입력하세요..." onkeypress="if(event.keyCode==13) sendReply()">
                    <button type="button" class="ev-btn ev-btn-primary" onclick="sendReply()">전송</button>
                </div>
            </div>
        </div>
    </div>

    <script>
        let currentRoomId = null;

        function scrollToBottom() {
            setTimeout(function() {
                const area = document.getElementById('adminChatArea');
                if (area) area.scrollTop = area.scrollHeight;
            }, 50);
        }

        function loadChatDetail(roomId, userName) {
            currentRoomId = roomId;
            $("#chatWelcome").hide();
            // ⭐ 레이아웃 유지를 위해 flex로 노출
            $("#chatRoomArea").css("display", "flex"); 
            $("#targetUserName").text(userName);
            $(".room-item").removeClass("active");
            $("#room-" + roomId).addClass("active");

            $.ajax({
                url: "${pageContext.request.contextPath}/admin/inquiry/detail",
                type: "GET",
                data: { roomId: roomId },
                success: function(list) {
                    renderMessages(list);
                    scrollToBottom();
                }
            });
        }

        function renderMessages(list) {
            let html = "";
            list.forEach(msg => {
                const isMe = (msg.senderRole === 'ADMIN');
                html += '<div class="msg ' + (isMe ? 'me' : 'admin') + '">';
                html += '    <span class="txt">' + (msg.message || "") + '</span>';
                html += '</div>';
            });
            $("#adminChatArea").html(html);
        }

        function sendReply() {
            const content = $("#adminMsgInput").val().trim();
            if(!content || !currentRoomId) return;

            $.ajax({
                url: "${pageContext.request.contextPath}/admin/inquiry/reply",
                type: "POST",
                data: { roomId: currentRoomId, content: content },
                success: function(res) {
                    if(res === "ok") {
                        $("#adminChatArea").append('<div class="msg me"><span class="txt">' + content + '</span></div>');
                        $("#adminMsgInput").val("").focus();
                        scrollToBottom();
                        $("#room-" + currentRoomId + " .last-msg").text(content);
                    }
                }
            });
        }

        function closeInquiry() {
            if(!confirm("문의를 종료하시겠습니까? 목록에서 제거됩니다.")) return;
            $.ajax({
                url: "${pageContext.request.contextPath}/admin/inquiry/close",
                type: "POST",
                data: { roomId: currentRoomId },
                success: function(res) {
                    if(res === "ok") {
                        $("#room-" + currentRoomId).remove();
                        $("#chatRoomArea").hide();
                        $("#chatWelcome").show();
                        currentRoomId = null;
                    }
                }
            });
        }

        setInterval(function() {
            if (!currentRoomId) return;
            $.ajax({
                url: "${pageContext.request.contextPath}/admin/inquiry/detail",
                type: "GET",
                data: { roomId: currentRoomId },
                success: function(list) {
                    const currentCount = $("#adminChatArea .msg").length;
                    if (list.length > currentCount) {
                        renderMessages(list);
                        scrollToBottom(); 
                    }
                }
            });
        }, 3000);
    </script>
</body>
</html>