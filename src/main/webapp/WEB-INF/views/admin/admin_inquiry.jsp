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
                    <div class="room-item ${room.id == currentRoomId ? 'active' : ''}" 
                         onclick="loadChatDetail(${room.id}, '${room.userName}')" id="room-${room.id}">
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

            <%-- 실제 대화창 (기본 display:none 처리 권장) --%>
            <div id="chatRoomArea" style="display: none;">
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

    // [공통] 스크롤 하단 고정
    function scrollToBottom() {
        setTimeout(function() {
            const area = document.getElementById('adminChatArea');
            if (area) area.scrollTop = area.scrollHeight;
        }, 50);
    }

    // 1. 유저 클릭 시 상세 조회 (수정됨)
    function loadChatDetail(roomId, userName) {
        currentRoomId = roomId;
        $("#chatWelcome").hide();
        $("#chatRoomArea").css("display", "flex"); 
        $("#targetUserName").text(userName);
        $(".room-item").removeClass("active");
        $("#room-" + roomId).addClass("active");

        // ✅ [추가] 관리자가 클릭했을 때만 서버에 "읽음 처리" 요청
        $.ajax({
            url: "${pageContext.request.contextPath}/admin/inquiry/markRead",
            type: "POST",
            data: { roomId: roomId }
        });

        // 채팅 내역 조회 (이제 서비스에서 읽음 처리가 빠져서 안전함)
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

    // 2. 메시지 렌더링
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

    // 3. 답변 전송
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

    // 4. 문의 종료
    function closeInquiry() {
        if(!confirm("문의를 종료하시겠습니까?")) return;
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

    // 5. 통합 실시간 폴링 (리스트 + 채팅창)
    setInterval(function() {
        // [A] 리스트 폴링 (이제 마지막 메시지를 긁어와도 유저 화면의 '읽지 않음'이 유지됨)
        $.ajax({
            url: "${pageContext.request.contextPath}/admin/inquiry/listData",
            type: "GET",
            dataType: "json",
            success: function(rooms) {
                if (rooms && rooms.length > 0) {
                    let listHtml = "";
                    rooms.forEach(room => {
                        const isActive = (room.id === currentRoomId) ? "active" : "";
                        const lastMsg = room.lastMessage || '대화 내역이 없습니다.';
                        
                        // ✅ 안 읽은 개수가 있으면 강조 표시 가능
                        const unreadTag = room.unreadCount > 0 ? ' <span style="color:red; font-weight:bold;">[' + room.unreadCount + ']</span>' : '';

                        listHtml += '<div class="room-item ' + isActive + '" onclick="loadChatDetail(' + room.id + ', \'' + room.userName + '\')" id="room-' + room.id + '">';
                        listHtml += '    <div class="room-info">';
                        listHtml += '        <span class="user-name">' + room.userName + unreadTag + '</span>';
                        listHtml += '        <p class="last-msg">' + lastMsg + '</p>';
                        listHtml += '    </div>';
                        listHtml += '</div>';
                    });
                    $(".list-wrapper").html(listHtml);
                }
            }
        });
        
        // [B] 현재 열린 채팅창 폴링 (단순 조회 API이므로 읽음 처리가 안 일어남)
        if (currentRoomId) {
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
        }
    }, 3000);
</script>
</body>
</html>