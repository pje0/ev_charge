<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core"%>
<%@ taglib prefix="sec" uri="http://www.springframework.org/security/tags"%>
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>충전소 지도 - EV 충전소</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/common.css">
  <link rel="stylesheet" href="/css/map.css">
  <script type="text/javascript" src="//dapi.kakao.com/v2/maps/sdk.js?appkey=d5fdc4f5945a067850cad3bbd4d6308a&libraries=services"></script>
</head>
<body class="ev-map-page">

  <jsp:include page="/WEB-INF/views/layout/header.jsp" />

  <div class="ev-map-wrap">

    <!-- 사이드바 -->
    <div class="ev-map-sidebar" id="sidebar">
      <div class="ev-map-sidebar-header">
        <h2 class="ev-map-sidebar-title">충전소 목록</h2>

        <!-- 위치 버튼 -->
        <div class="ev-map-location-btns">
          <button class="ev-map-btn-primary" onclick="getMyLocation()">
            📍 내 위치
          </button>
          <button class="ev-map-btn-outline" onclick="findNearest()" id="nearestBtn" disabled>
            🔍 가장 가까운
          </button>
        </div>

        <!-- 검색 -->
        <div class="ev-map-search-wrap">
          <input type="text" id="searchInput" class="ev-map-search-input"
            placeholder="충전소 이름 또는 주소 검색"
            oninput="filterStations()">
        </div>

        <!-- 필터 -->
        <div class="ev-map-filter-btns">
          <button class="ev-map-filter-btn active" onclick="setFilter('all', this)">전체</button>
          <button class="ev-map-filter-btn available" onclick="setFilter('AVAILABLE', this)">가능</button>
          <button class="ev-map-filter-btn inuse" onclick="setFilter('IN_USE', this)">사용중</button>
          <button class="ev-map-filter-btn error" onclick="setFilter('OUT_OF_SERVICE', this)">점검</button>
        </div>
      </div>

      <!-- 충전소 목록 -->
      <div class="ev-map-station-list" id="stationList">
        <div class="ev-map-loading">충전소 정보를 불러오는 중...</div>
      </div>
    </div>

    <!-- 지도 -->
    <div class="ev-map-container">
      <div id="kakaoMap" class="ev-map-kakao"></div>

      <!-- 범례 -->
      <div class="ev-map-legend">
        <p class="ev-map-legend-title">범례</p>
        <div class="ev-map-legend-item">
          <div class="ev-map-legend-dot" style="background:#16a34a"></div>
          <span>사용 가능</span>
        </div>
        <div class="ev-map-legend-item">
          <div class="ev-map-legend-dot" style="background:#d97706"></div>
          <span>사용 중</span>
        </div>
        <div class="ev-map-legend-item">
          <div class="ev-map-legend-dot" style="background:#dc2626"></div>
          <span>점검 중</span>
        </div>
      </div>

      <!-- 충전소 상세 패널 -->
      <div class="ev-map-detail" id="detailPanel" style="display:none">
        <div class="ev-map-detail-header">
          <div>
            <h3 class="ev-map-detail-name" id="detailName"></h3>
            <p class="ev-map-detail-addr" id="detailAddr"></p>
          </div>
          <button class="ev-map-detail-close" onclick="closeDetail()">✕</button>
        </div>
        <div class="ev-map-detail-body">
          <div class="ev-map-detail-grid">
            <div class="ev-map-detail-card">
              <span class="ev-map-detail-card-label">⚡ 가용</span>
              <span class="ev-map-detail-card-value" id="detailAvail"></span>
            </div>
            <div class="ev-map-detail-card">
              <span class="ev-map-detail-card-label">🔌 급속</span>
              <span class="ev-map-detail-card-value" id="detailRapid"></span>
            </div>
            <div class="ev-map-detail-card">
              <span class="ev-map-detail-card-label">🔋 완속</span>
              <span class="ev-map-detail-card-value" id="detailSlow"></span>
            </div>
            <div class="ev-map-detail-card">
              <span class="ev-map-detail-card-label">🚗 지원차종</span>
              <span class="ev-map-detail-card-value ev-map-detail-car" id="detailCar"></span>
            </div>
          </div>
        </div>
        <div class="ev-map-detail-footer">
          <sec:authorize access="isAuthenticated()">
            <a href="/reservation" class="ev-map-reserve-btn">예약하기 →</a>
          </sec:authorize>
          <sec:authorize access="isAnonymous()">
            <a href="/login" class="ev-map-reserve-btn">로그인 후 예약하기 →</a>
          </sec:authorize>
        </div>
      </div>
    </div>
  </div>

  <script>
    // 지도 초기화
    var map;
    var markers = [];
    var stations = [];
    var currentFilter = 'all';
    var userLocation = null;
    var userMarker = null;

    kakao.maps.load(function() {
      var container = document.getElementById('kakaoMap');
      var options = {
        center: new kakao.maps.LatLng(37.5326, 127.0246),
        level: 10
      };
      map = new kakao.maps.Map(container, options);
      loadStations();
    });

    // 충전소 데이터 로드 (한전 API 또는 DB)
    function loadStations() {
      // TODO: 실제 API 연동 시 fetch('/api/stations') 로 변경
      // 지금은 더미 데이터
      stations = [];
      renderStationList();
    }

    // 마커 색상
    function getMarkerColor(station) {
      if (!station.chargers || station.chargers.length === 0) return '#d97706';
      var available = station.chargers.filter(function(c) { return c.status === 'AVAILABLE'; }).length;
      var error = station.chargers.every(function(c) { return c.status === 'OUT_OF_SERVICE'; });
      if (error) return '#dc2626';
      if (available > 0) return '#16a34a';
      return '#d97706';
    }

    // 마커 SVG
    function getMarkerSVG(color) {
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="48" viewBox="0 0 40 48">' +
        '<path d="M20 2C11.163 2 4 9.163 4 18c0 12 16 28 16 28s16-16 16-28C36 9.163 28.837 2 20 2z" fill="' + color + '"/>' +
        '<circle cx="20" cy="18" r="9" fill="white" opacity="0.95"/>' +
        '<text x="20" y="23" text-anchor="middle" font-size="14" fill="' + color + '" font-weight="bold">⚡</text>' +
        '</svg>'
      );
    }

    // 마커 추가
    function addMarker(station) {
      var color = getMarkerColor(station);
      var markerImage = new kakao.maps.MarkerImage(
        getMarkerSVG(color),
        new kakao.maps.Size(40, 48),
        { offset: new kakao.maps.Point(20, 48) }
      );
      var marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(station.lat, station.lng),
        map: map,
        image: markerImage,
        title: station.name
      });
      kakao.maps.event.addListener(marker, 'click', function() {
        showDetail(station);
        map.setCenter(new kakao.maps.LatLng(station.lat, station.lng));
      });
      markers.push(marker);
    }

    // 마커 전체 제거
    function clearMarkers() {
      markers.forEach(function(m) { m.setMap(null); });
      markers = [];
    }

    // 충전소 목록 렌더링
    function renderStationList() {
      var query = document.getElementById('searchInput').value;
      var list = stations.filter(function(s) {
        var matchSearch = s.name.includes(query) || s.address.includes(query);
        var matchFilter = currentFilter === 'all' ||
          (s.chargers && s.chargers.some(function(c) { return c.status === currentFilter; }));
        return matchSearch && matchFilter;
      });

      clearMarkers();
      var html = '';
      if (list.length === 0) {
        html = '<div class="ev-map-empty">검색 결과가 없습니다</div>';
      } else {
        list.forEach(function(s) {
          var available = s.chargers ? s.chargers.filter(function(c) { return c.status === 'AVAILABLE'; }).length : 0;
          var total = s.chargers ? s.chargers.length : 0;
          var dist = userLocation ? calcDistance(userLocation.lat, userLocation.lng, s.lat, s.lng) : null;
          html += '<div class="ev-map-station-item" onclick="moveToStation(' + JSON.stringify(s).replace(/"/g, '&quot;') + ')">' +
            '<div class="ev-map-station-item-top">' +
              '<span class="ev-map-station-item-name">' + s.name + '</span>' +
              '<span class="ev-map-station-item-avail">' + available + '/' + total + ' 가용</span>' +
            '</div>' +
            '<p class="ev-map-station-item-addr">📍 ' + s.address + '</p>' +
            (dist !== null ? '<p class="ev-map-station-item-dist">' + dist.toFixed(1) + 'km</p>' : '') +
          '</div>';
          addMarker(s);
        });
      }
      document.getElementById('stationList').innerHTML = html;
    }

    // 충전소 이동
    function moveToStation(station) {
      showDetail(station);
      map.setCenter(new kakao.maps.LatLng(station.lat, station.lng));
      map.setLevel(4);
    }

    // 상세 패널
    function showDetail(station) {
      document.getElementById('detailName').textContent = station.name;
      document.getElementById('detailAddr').textContent = station.address;
      var available = station.chargers ? station.chargers.filter(function(c) { return c.status === 'AVAILABLE'; }).length : 0;
      var total = station.chargers ? station.chargers.length : 0;
      document.getElementById('detailAvail').textContent = available + '/' + total;
      document.getElementById('detailRapid').textContent = (station.rapidCnt || 0) + '대';
      document.getElementById('detailSlow').textContent = (station.slowCnt || 0) + '대';
      document.getElementById('detailCar').textContent = station.carType || '-';
      document.getElementById('detailPanel').style.display = 'flex';
    }

    function closeDetail() {
      document.getElementById('detailPanel').style.display = 'none';
    }

    // 필터
    function setFilter(filter, btn) {
      currentFilter = filter;
      document.querySelectorAll('.ev-map-filter-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      renderStationList();
    }

    // 검색
    function filterStations() {
      renderStationList();
    }

    // 거리 계산 (Haversine)
    function calcDistance(lat1, lng1, lat2, lng2) {
      var R = 6371;
      var dLat = (lat2 - lat1) * Math.PI / 180;
      var dLng = (lng2 - lng1) * Math.PI / 180;
      var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng/2) * Math.sin(dLng/2);
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }

    // 내 위치
    function getMyLocation() {
      if (!navigator.geolocation) {
        alert('위치 정보를 지원하지 않는 브라우저입니다.');
        return;
      }
      navigator.geolocation.getCurrentPosition(function(pos) {
        userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        map.setCenter(new kakao.maps.LatLng(userLocation.lat, userLocation.lng));
        map.setLevel(8);

        if (userMarker) userMarker.setMap(null);
        userMarker = new kakao.maps.Marker({
          position: new kakao.maps.LatLng(userLocation.lat, userLocation.lng),
          map: map,
          title: '내 위치'
        });
        document.getElementById('nearestBtn').disabled = false;
        renderStationList();
      }, function() {
        alert('위치 정보를 가져올 수 없습니다.');
      });
    }

    // 가장 가까운 충전소
    function findNearest() {
      if (!userLocation || stations.length === 0) return;
      var nearest = null;
      var minDist = Infinity;
      stations.forEach(function(s) {
        var d = calcDistance(userLocation.lat, userLocation.lng, s.lat, s.lng);
        if (d < minDist) { minDist = d; nearest = s; }
      });
      if (nearest) moveToStation(nearest);
    }
  </script>

</body>
</html>