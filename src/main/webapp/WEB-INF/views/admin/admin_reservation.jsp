<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>

<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>예약 관리</title>
    
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/common.css"> 
</head>
<body>

<div class="ev-reservation-list-wrap" style="background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
    
    <!-- 타이틀 영역 -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h3 style="margin: 0; font-size: 1.25rem; font-weight: bold; color: #333;">전체 회원 예약 내역</h3>
        <span style="font-size: 13px; color: #666;">검색 결과: <strong style="color: #2196F3;">${reservationList.size()}</strong>건</span>
    </div>
    
    <!-- 1. 검색 및 필터 컨트롤러 영역 -->
    <form id="searchForm" method="get" action="${pageContext.request.contextPath}/admin/adminpage" style="margin-bottom: 20px; background: #f8f9fa; padding: 15px; border-radius: 6px;">
        <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
            
            <!-- 상태 필터 (상태유지 포함) -->
            <select name="searchStatus" class="ev-input" style="padding: 8px; border: 1px solid #ccc; border-radius: 4px; min-width: 120px;">
                <option value="">전체 상태</option>
                <option value="RESERVED" ${searchStatus == 'RESERVED' ? 'selected' : ''}>RESERVED (예약완료)</option>
                <option value="CHARGING" ${searchStatus == 'CHARGING' ? 'selected' : ''}>CHARGING (충전중)</option>
                <option value="COMPLETED" ${searchStatus == 'COMPLETED' ? 'selected' : ''}>COMPLETED (종료)</option>
                <option value="CANCELED" ${searchStatus == 'CANCELED' ? 'selected' : ''}>CANCELED (취소)</option>
                <option value="EXPIRED" ${searchStatus == 'EXPIRED' ? 'selected' : ''}>EXPIRED (만료)</option>
            </select>
            
            <!-- 검색 조건 (상태유지 포함) -->
            <select name="searchType" class="ev-input" style="padding: 8px; border: 1px solid #ccc; border-radius: 4px; min-width: 120px;">
                <option value="all" ${searchType == 'all' ? 'selected' : ''}>전체 검색</option>
                <option value="name" ${searchType == 'name' ? 'selected' : ''}>회원명</option>
                <option value="loginId" ${searchType == 'loginId' ? 'selected' : ''}>아이디</option>
                <option value="station" ${searchType == 'station' ? 'selected' : ''}>충전소명</option>
            </select>
            
            <!-- 검색어 입력 (상태유지 포함) -->
            <input type="text" name="searchKeyword" class="ev-input" value="${searchKeyword}" placeholder="검색어를 입력하세요..." style="padding: 8px; border: 1px solid #ccc; border-radius: 4px; flex: 1; min-width: 200px;">
            
            <!-- 버튼 그룹 -->
            <button type="submit" class="ev-btn ev-btn-primary" style="padding: 8px 16px;">검색</button>
            <button type="button" class="ev-btn ev-btn-outline" style="padding: 8px 16px; background: #fff;" onclick="location.href='${pageContext.request.contextPath}/admin/adminpage'">초기화</button>
        </div>
    </form>
    
    <!-- 2. 예약 내역 테이블 영역 -->
    <div style="overflow-x: auto;">
        <table class="ev-table" style="width: 100%; border-collapse: collapse; text-align: left; min-width: 900px;">
            <thead>
                <tr style="border-bottom: 2px solid #ddd; background-color: #f1f3f5; font-size: 14px; color: #495057;">
                    <th style="padding: 12px 10px; text-align: center; width: 60px;">ID</th>
                    <th style="padding: 12px 10px; width: 150px;">예약자 (ID)</th>
                    <th style="padding: 12px 10px;">충전소 / 충전기 유형</th>
                    <th style="padding: 12px 10px; width: 130px;">예약 종류 / 차종</th>
                    <th style="padding: 12px 10px; width: 180px;">예약 시간 (시작~종료)</th>
                    <th style="padding: 12px 10px; text-align: center; width: 110px;">목표량 / 제한시간</th>
                    <th style="padding: 12px 10px; text-align: center; width: 100px;">상태</th>
                    <th style="padding: 12px 10px; text-align: center; width: 130px;">관리</th>
                </tr>
            </thead>
            <tbody>
                <c:choose>
                    <c:when test="${empty reservationList}">
                        <tr>
                            <td colspan="8" style="padding: 50px; text-align: center; color: #999; font-size: 14px;">조회된 회원 예약 내역이 존재하지 않습니다.</td>
                        </tr>
                    </c:when>
                    <c:otherwise>
                        <c:forEach var="rsv" items="${reservationList}">
                            <tr style="border-bottom: 1px solid #eee; font-size: 14px;" class="rsv-row">
                                <td style="padding: 14px 10px; text-align: center; font-weight: bold; color: #666;">${rsv.id}</td>
                                <td style="padding: 14px 10px;">
                                    <span style="font-weight: 500;">${rsv.userName}</span><br>
                                    <span style="color:#888; font-size:12px;">(${rsv.loginId})</span>
                                </td>
                                <td style="padding: 14px 10px;">
                                    <div style="font-weight: 500; color: #333;">${rsv.stationName != null ? rsv.stationName : '건너뛰기(충전소 미지정)'}</div>
                                    <c:if test="${rsv.chargerId != null}">
                                        <span style="font-size: 12px; color: #00c853; background: #e8f5e9; padding: 2px 6px; border-radius: 4px;">${rsv.chargerId}번 충전기 (${rsv.connectorType})</span>
                                    </c:if>
                                </td>
                                <td style="padding: 14px 10px;">
                                    <span style="font-size: 12px; color: #fff; background: ${rsv.reservationType == 'TIME' ? '#2196F3' : '#9c27b0'}; padding: 2px 5px; border-radius: 3px; font-weight: bold;">${rsv.reservationType}</span>
                                    <div style="font-size: 13px; margin-top: 4px;">${rsv.carType}</div>
                                </td>
                                <td style="padding: 14px 10px; line-height: 1.4;">
                                    <c:choose>
                                        <c:when test="${rsv.reservationType == 'TIME'}">
                                            <span style="color: #2196F3; font-weight: 500;"><fmt:formatDate value="${rsv.startTime}" pattern="yyyy-MM-dd HH:mm"/></span><br>
                                            <span style="color: #e53935; font-weight: 500;"><fmt:formatDate value="${rsv.endTime}" pattern="yyyy-MM-dd HH:mm"/></span>
                                        </c:when>
                                        <c:otherwise>
                                            <span style="color: #666;">- (목표량 제어 방식)</span>
                                        </c:otherwise>
                                    </c:choose>
                                </td>
                                <td style="padding: 14px 10px; text-align: center; font-weight: 500; color: #444;">
                                    <c:choose>
                                        <c:when test="${rsv.reservationType == 'TARGET'}">
                                            ${rsv.targetKwh} kWh<br><span style="font-size: 11px; color: #777;">(최대 ${rsv.maxMinutes}분)</span>
                                        </c:when>
                                        <c:otherwise>
                                            <span style="color: #ccc;">-</span>
                                        </c:otherwise>
                                    </c:choose>
                                </td>
                                <td style="padding: 14px 10px; text-align: center;">
                                    <c:choose>
                                        <c:when test="${rsv.status == 'RESERVED'}"><span style="padding: 4px 8px; background-color: #e3f2fd; color: #0d47a1; border-radius: 4px; font-weight: bold; font-size: 11px;">RESERVED</span></c:when>
                                        <c:when test="${rsv.status == 'CHARGING'}"><span style="padding: 4px 8px; background-color: #e8f5e9; color: #1b5e20; border-radius: 4px; font-weight: bold; font-size: 11px;">CHARGING</span></c:when>
                                        <c:when test="${rsv.status == 'COMPLETED'}"><span style="padding: 4px 8px; background-color: #e8eaed; color: #3c4043; border-radius: 4px; font-weight: bold; font-size: 11px;">COMPLETED</span></c:when>
                                        <c:when test="${rsv.status == 'CANCELED'}"><span style="padding: 4px 8px; background-color: #fce8e6; color: #c5221f; border-radius: 4px; font-weight: bold; font-size: 11px;">CANCELED</span></c:when>
                                        <c:otherwise><span style="padding: 4px 8px; background-color: #fef7e0; color: #b06000; border-radius: 4px; font-weight: bold; font-size: 11px;">EXPIRED</span></c:otherwise>
                                    </c:choose>
                                </td>
                                <td style="padding: 14px 10px; text-align: center;">
                                    <!-- [수정] 버튼 -->
                                    <button type="button" class="ev-btn" style="padding: 5px 10px; font-size: 12px; background: #f1f3f5; border: 1px solid #ced4da; border-radius: 4px; cursor: pointer; margin-right: 2px;" onclick="fn_edit_reservation(${rsv.id})">수정</button>
                                    
                                    <!-- [삭제] 버튼 -->
                                    <button type="button" class="ev-btn" style="padding: 5px 10px; font-size: 12px; background: #fff5f5; border: 1px solid #ffa8a8; color: #e03131; border-radius: 4px; cursor: pointer;" onclick="fn_delete_reservation(${rsv.id})">삭제</button>
                                </td>
                            </tr>
                        </c:forEach>
                    </c:otherwise>
                </c:choose>
            </tbody>
        </table>
    </div>
</div>

<!-- 스크립트 영역 -->
<script src="${pageContext.request.contextPath}/js/jquery.js"></script>
<script>
    // [수정] 이벤트 핸들러
    function fn_edit_reservation(rsvId) {
        alert("예약 ID [" + rsvId + "]번 수정 창을 호출합니다.\n(수정 페이지 양식 개발 시 대입구간)");
    }

    // [삭제] 이벤트 핸들러 (AdminPageController 비동기 매핑)
    function fn_delete_reservation(rsvId) {
        if(confirm("정말로 " + rsvId + "번 예약 건을 즉시 파기하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.")) {
            $.ajax({
                url: '${pageContext.request.contextPath}/admin/reservation/delete',
                type: 'POST',
                data: { id: rsvId },
                dataType: 'json',
                success: function(res) {
                    if(res.result === 'success') {
                        alert('해당 예약 데이터가 성공적으로 삭제되었습니다.');
                        location.reload();
                    } else {
                        alert('삭제 처리 실패: ' + res.message);
                    }
                },
                error: function() {
                    alert('서버 통신 중 장애가 발생했습니다. 관리자 세션을 확인해 주세요.');
                }
            });
        }
    }
</script>
</body>
</html>