<%@ page language="java" contentType="text/html; charset=UTF-8"
	pageEncoding="UTF-8"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core"%>
<%@ taglib prefix="sec"
	uri="http://www.springframework.org/security/tags"%>
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>충전소 지도 - EV 충전소</title>
<link
	href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;800&display=swap"
	rel="stylesheet">
<link rel="stylesheet" href="/css/common.css">
<link rel="stylesheet" href="/css/map.css">
<script type="text/javascript"
	src="//dapi.kakao.com/v2/maps/sdk.js?appkey=d5fdc4f5945a067850cad3bbd4d6308a&libraries=services"></script>
</head>
<body class="ev-map-page">

	<jsp:include page="/WEB-INF/views/layout/header.jsp" />

	<div class="ev-map-wrap">

		<!-- 사이드바 -->
		<div class="ev-map-sidebar" id="sidebar">

			<!-- 탭 -->
			<div class="ev-map-tabs">
				<button type="button" class="ev-map-tab active"
					onclick="switchTab('nearby', this)">주변 충전소</button>
				<button type="button" class="ev-map-tab"
					onclick="switchTab('region', this)">지역 충전소</button>
			</div>

			<!-- 주변 충전소 탭 -->
			<div class="ev-map-tab-content active" id="tab-nearby">
				<div class="ev-map-sidebar-header">
					<div class="ev-map-location-btns">
						<button type="button" class="ev-map-btn-primary"
							onclick="getMyLocation()">📍 내 위치</button>
						<button type="button" class="ev-map-btn-outline"
							onclick="findNearest()" id="nearestBtn" disabled>🔍 가장
							가까운</button>
					</div>
					<div class="ev-map-filter-row">
						<button type="button" class="ev-map-filter-btn active"
							onclick="setFilter('all', this)">전체</button>
						<button type="button" class="ev-map-filter-btn"
							onclick="setFilter('AVAILABLE', this)">사용가능</button>
						<button type="button" class="ev-map-filter-btn"
							onclick="setFilter('rapid', this)">급속</button>
						<button type="button" class="ev-map-filter-btn"
							onclick="setFilter('slow', this)">완속</button>
					</div>
				</div>
				<div class="ev-map-station-list" id="nearbyList">
					<div class="ev-map-empty">📍 내 위치 버튼을 눌러주세요</div>
				</div>
			</div>

			<!-- 지역 충전소 탭 -->
			<div class="ev-map-tab-content" id="tab-region">
				<div class="ev-map-sidebar-header">
					<div class="ev-map-select-group">
						<div class="ev-map-select-row">
							<span class="ev-map-select-label">시/도</span> <select
								class="ev-map-select" id="metroCd" onchange="onMetroChange()">
								<option value="">선택</option>
								<option value="11">서울특별시</option>
								<option value="21">부산광역시</option>
								<option value="22">대구광역시</option>
								<option value="23">인천광역시</option>
								<option value="24">광주광역시</option>
								<option value="25">대전광역시</option>
								<option value="26">울산광역시</option>
								<option value="29">세종특별자치시</option>
								<option value="31">경기도</option>
								<option value="32">강원도</option>
								<option value="33">충청북도</option>
								<option value="34">충청남도</option>
								<option value="35">전라북도</option>
								<option value="36">전라남도</option>
								<option value="37">경상북도</option>
								<option value="38">경상남도</option>
								<option value="39">제주특별자치도</option>
							</select>
						</div>
						<div class="ev-map-select-row">
							<span class="ev-map-select-label">시/군/구</span> <select
								class="ev-map-select" id="cityCd"
								onchange="loadRegionStations()" disabled>
								<option value="">전체</option>
							</select>
						</div>
						<div class="ev-map-select-row">
							<span class="ev-map-select-label">충전속도</span> <select
								class="ev-map-select" id="chargeSpeed"
								onchange="loadRegionStations()">
								<option value="all">급속 + 완속</option>
								<option value="rapid">급속만</option>
								<option value="slow">완속만</option>
							</select>
						</div>
					</div>
					<div class="ev-map-region-count" id="regionCount"></div>
				</div>
				<div class="ev-map-station-list" id="regionList">
					<div class="ev-map-empty">시/도를 선택해주세요</div>
				</div>
			</div>

		</div>

		<!-- 지도 -->
		<div class="ev-map-container">
			<div id="kakaoMap" class="ev-map-kakao"></div>

			<!-- 관리자 전용 초기화 버튼 -->
			<sec:authorize access="hasRole('ADMIN')">
				<div class="ev-map-admin-btn">
					<select id="initMetroCd" class="ev-map-select" style="width: 140px">
						<option value="11">서울</option>
						<option value="21">부산</option>
						<option value="22">대구</option>
						<option value="23">인천</option>
						<option value="24">광주</option>
						<option value="25">대전</option>
						<option value="26">울산</option>
						<option value="31">경기</option>
						<option value="32">강원</option>
						<option value="33">충북</option>
						<option value="34">충남</option>
						<option value="35">전북</option>
						<option value="36">전남</option>
						<option value="37">경북</option>
						<option value="38">경남</option>
						<option value="39">제주</option>
					</select>
					<button type="button" class="ev-map-btn-primary"
						onclick="initStationData()" style="width: 100px">DB 초기화</button>
				</div>
			</sec:authorize>

			<!-- 범례 -->
			<div class="ev-map-legend">
				<p class="ev-map-legend-title">범례</p>
				<div class="ev-map-legend-item">
					<div class="ev-map-legend-dot" style="background: #16a34a"></div>
					<span>사용 가능</span>
				</div>
				<div class="ev-map-legend-item">
					<div class="ev-map-legend-dot" style="background: #d97706"></div>
					<span>사용 중</span>
				</div>
				<div class="ev-map-legend-item">
					<div class="ev-map-legend-dot" style="background: #dc2626"></div>
					<span>점검 중</span>
				</div>
			</div>

			<!-- 충전소 상세 패널 -->
			<div class="ev-map-detail" id="detailPanel" style="display: none">
				<div class="ev-map-detail-header">
					<div>
						<h3 class="ev-map-detail-name" id="detailName"></h3>
						<p class="ev-map-detail-addr" id="detailAddr"></p>
					</div>
					<button type="button" class="ev-map-detail-close"
						onclick="closeDetail()">✕</button>
				</div>
				<div class="ev-map-detail-body">
					<div class="ev-map-detail-grid">
						<div class="ev-map-detail-card">
							<span class="ev-map-detail-card-label">⚡ 급속</span> <span
								class="ev-map-detail-card-value" id="detailRapid"></span>
						</div>
						<div class="ev-map-detail-card">
							<span class="ev-map-detail-card-label">🔋 완속</span> <span
								class="ev-map-detail-card-value" id="detailSlow"></span>
						</div>
						<div class="ev-map-detail-card" style="grid-column: span 2">
							<span class="ev-map-detail-card-label">🚗 지원차종</span> <span
								class="ev-map-detail-card-value ev-map-detail-car"
								id="detailCar"></span>
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
    var map;
    var markers = [];
    var stations = [];
    var currentFilter = 'all';
    var userLocation = null;
    var userMarker = null;
    var currentTab = 'nearby';

    // 지도 초기화
    kakao.maps.load(function() {
      var container = document.getElementById('kakaoMap');
      var options = {
        center: new kakao.maps.LatLng(37.5326, 127.0246),
        level: 10
      };
      map = new kakao.maps.Map(container, options);
    });

    // 탭 전환
    function switchTab(tab, btn) {
      currentTab = tab;
      document.querySelectorAll('.ev-map-tab').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      document.querySelectorAll('.ev-map-tab-content').forEach(function(c) { c.classList.remove('active'); });
      document.getElementById('tab-' + tab).classList.add('active');
      clearMarkers();
    }

    // 마커 SVG
    function getMarkerSVG(color) {
      return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44">' +
        '<path d="M18 2C10.268 2 4 8.268 4 16c0 11 14 26 14 26s14-15 14-26C32 8.268 25.732 2 18 2z" fill="' + color + '"/>' +
        '<circle cx="18" cy="16" r="8" fill="white" opacity="0.95"/>' +
        '<text x="18" y="21" text-anchor="middle" font-size="12" fill="' + color + '" font-weight="bold">⚡</text>' +
        '</svg>'
      );
    }

    // 마커 추가
    function addMarker(lat, lng, color, station) {

    lat = parseFloat(lat);
    lng = parseFloat(lng);

    console.log('마커 생성:', station.stnPlace, lat, lng);

    if (isNaN(lat) || isNaN(lng)) {
        console.log('좌표 오류');
        return;
    }

    var markerImage = new kakao.maps.MarkerImage(
        getMarkerSVG(color),
        new kakao.maps.Size(36, 44),
        { offset: new kakao.maps.Point(18, 44) }
    );

    var marker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(lat, lng),
        map: map,
        image: markerImage,
        title: station.stnPlace || station.name
    });

    kakao.maps.event.addListener(marker, 'click', function() {
        showDetail(station);
        map.setCenter(new kakao.maps.LatLng(lat, lng));
    });

    markers.push(marker);
}

    // 마커 전체 제거
    function clearMarkers() {
      markers.forEach(function(m) { m.setMap(null); });
      markers = [];
    }

    // 상세 패널
    function showDetail(station) {
      document.getElementById('detailName').textContent = station.stnPlace || station.name || '-';
      document.getElementById('detailAddr').textContent = station.stnAddr || station.address || '-';
      document.getElementById('detailRapid').textContent = (station.rapidCnt || 0) + '대';
      document.getElementById('detailSlow').textContent = (station.slowCnt || 0) + '대';
      document.getElementById('detailCar').textContent = station.carType || '-';
      document.getElementById('detailPanel').style.display = 'flex';
    }

    function closeDetail() {
      document.getElementById('detailPanel').style.display = 'none';
    }

    // ── 지역 충전소 탭 ──
    // 시/도별 시/군/구 코드
var cityMap = {
  '11': [
    {code:'11110',name:'종로구'},{code:'11140',name:'중구'},{code:'11170',name:'용산구'},
    {code:'11200',name:'성동구'},{code:'11215',name:'광진구'},{code:'11230',name:'동대문구'},
    {code:'11260',name:'중랑구'},{code:'11290',name:'성북구'},{code:'11305',name:'강북구'},
    {code:'11320',name:'도봉구'},{code:'11350',name:'노원구'},{code:'11380',name:'은평구'},
    {code:'11410',name:'서대문구'},{code:'11440',name:'마포구'},{code:'11470',name:'양천구'},
    {code:'11500',name:'강서구'},{code:'11530',name:'구로구'},{code:'11545',name:'금천구'},
    {code:'11560',name:'영등포구'},{code:'11590',name:'동작구'},{code:'11620',name:'관악구'},
    {code:'11650',name:'서초구'},{code:'11680',name:'강남구'},{code:'11710',name:'송파구'},
    {code:'11740',name:'강동구'}
  ],
  '21': [
    {code:'21110',name:'중구'},{code:'21120',name:'서구'},{code:'21130',name:'동구'},
    {code:'21140',name:'영도구'},{code:'21150',name:'부산진구'},{code:'21160',name:'동래구'},
    {code:'21170',name:'남구'},{code:'21180',name:'북구'},{code:'21190',name:'해운대구'},
    {code:'21200',name:'사하구'},{code:'21210',name:'금정구'},{code:'21220',name:'강서구'},
    {code:'21230',name:'연제구'},{code:'21240',name:'수영구'},{code:'21250',name:'사상구'},
    {code:'21310',name:'기장군'}
  ],
  '31': [
    {code:'31110',name:'수원시'},{code:'31150',name:'성남시'},{code:'31170',name:'의정부시'},
    {code:'31180',name:'안양시'},{code:'31190',name:'부천시'},{code:'31200',name:'광명시'},
    {code:'31210',name:'평택시'},{code:'31230',name:'동두천시'},{code:'31250',name:'안산시'},
    {code:'31260',name:'고양시'},{code:'31270',name:'과천시'},{code:'31280',name:'구리시'},
    {code:'31290',name:'남양주시'},{code:'31300',name:'오산시'},{code:'31310',name:'시흥시'},
    {code:'31320',name:'군포시'},{code:'31330',name:'의왕시'},{code:'31340',name:'하남시'},
    {code:'31350',name:'용인시'},{code:'31360',name:'파주시'},{code:'31370',name:'이천시'},
    {code:'31380',name:'안성시'},{code:'31390',name:'김포시'},{code:'31400',name:'화성시'},
    {code:'31410',name:'광주시'},{code:'31420',name:'양주시'},{code:'31430',name:'포천시'},
    {code:'31440',name:'여주시'},{code:'31710',name:'연천군'},{code:'31720',name:'가평군'},
    {code:'31730',name:'양평군'}
  ]
};

function onMetroChange() {
	  var metroCd = document.getElementById('metroCd').value;
	  var cityCdSelect = document.getElementById('cityCd');
	  
	  cityCdSelect.innerHTML = '<option value="">전체</option>';
	  cityCdSelect.disabled = true;
	  
	  if (!metroCd) return;

	  // 먼저 전체 데이터 불러와서 city 목록 추출
	  fetch('/api/stations?metroCd=' + metroCd)
	    .then(function(res) { return res.json(); })
	    .then(function(data) {
	      if (!data || !data.data) return;
	      
	      // city 필드에서 unique 목록 추출
	      var cities = [];
	      data.data.forEach(function(s) {
	        if (s.city && !cities.includes(s.city)) {
	          cities.push(s.city);
	        }
	      });
	      cities.sort();
	      
	      cities.forEach(function(city) {
	        var opt = document.createElement('option');
	        opt.value = city;
	        opt.textContent = city;
	        cityCdSelect.appendChild(opt);
	      });
	      
	      cityCdSelect.disabled = false;
	      
	      // 전체 데이터도 바로 렌더링
	      window._allData = data.data;
	      filterAndRender();
	    });
	}

function loadRegionStations() {
	  if (!window._allData) return;
	  filterAndRender();
	}

	function filterAndRender() {
	  var city = document.getElementById('cityCd').value;
	  var speed = document.getElementById('chargeSpeed').value;
	  
	  var list = window._allData;
	  
	  if (city) list = list.filter(function(s) { return s.city === city; });
	  if (speed === 'rapid') list = list.filter(function(s) { return s.rapidCnt > 0; });
	  if (speed === 'slow') list = list.filter(function(s) { return s.slowCnt > 0; });
	  
	  document.getElementById('regionCount').textContent = list.length + '개 충전소';
	  renderRegionList(list);
	}

    function renderRegionList(list) {
      clearMarkers();
      if (list.length === 0) {
        document.getElementById('regionList').innerHTML = '<div class="ev-map-empty">검색 결과 없음</div>';
        return;
      }

      // 지오코더로 주소 → 좌표 변환 후 마커
      var geocoder = new kakao.maps.services.Geocoder();
      var bounds = new kakao.maps.LatLngBounds();

      var html = '';
      list.forEach(function(s, idx) {
        html += '<div class="ev-map-station-item" onclick="moveToRegionStation(' + idx + ')">' +
          '<div class="ev-map-station-item-top">' +
            '<span class="ev-map-station-item-name">' + (s.stnPlace || '-') + '</span>' +
          '</div>' +
          '<p class="ev-map-station-item-addr">📍 ' + (s.stnAddr || '-') + '</p>' +
          '<div class="ev-map-station-item-bottom">' +
            '<span class="ev-map-station-item-rapid">급속 ' + (s.rapidCnt || 0) + '대</span>' +
            '<span class="ev-map-station-item-slow">완속 ' + (s.slowCnt || 0) + '대</span>' +
          '</div>' +
        '</div>';

        // 주소로 마커 찍기
        geocoder.addressSearch(s.stnAddr, function(result, status) {
          if (status === kakao.maps.services.Status.OK) {
            var lat = parseFloat(result[0].y);
            var lng = parseFloat(result[0].x);
            s.lat = lat;
            s.lng = lng;
            addMarker(lat, lng, '#16a34a', s);
            bounds.extend(new kakao.maps.LatLng(lat, lng));
          }
        });
      });

      document.getElementById('regionList').innerHTML = html;
      window._regionStations = list;

      // 첫번째 주소 기준으로 지도 이동
      if (list[0] && list[0].stnAddr) {
        geocoder.addressSearch(list[0].stnAddr, function(result, status) {
          if (status === kakao.maps.services.Status.OK) {
            map.setCenter(new kakao.maps.LatLng(result[0].y, result[0].x));
            map.setLevel(8);
          }
        });
      }
    }

    function moveToRegionStation(idx) {
      var s = window._regionStations[idx];
      showDetail(s);
      if (s.lat && s.lng) {
        map.setCenter(new kakao.maps.LatLng(s.lat, s.lng));
        map.setLevel(4);
      }
    }

    // ── 주변 충전소 탭 ──
    function setFilter(filter, btn) {
      currentFilter = filter;
      document.querySelectorAll('#tab-nearby .ev-map-filter-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      renderNearbyList();
    }

    function renderNearbyList() {
      if (!userLocation || stations.length === 0) return;
      var list = stations.filter(function(s) {
        if (currentFilter === 'AVAILABLE') return s.availCnt > 0;
        if (currentFilter === 'rapid') return s.rapidCnt > 0;
        if (currentFilter === 'slow') return s.slowCnt > 0;
        return true;
      });

      clearMarkers();
      if (list.length === 0) {
        document.getElementById('nearbyList').innerHTML = '<div class="ev-map-empty">검색 결과 없음</div>';
        return;
      }

      var html = '';
      list.forEach(function(s, idx) {
        var dist = s.dist ? s.dist.toFixed(1) + 'km' : '';
        html += '<div class="ev-map-station-item" onclick="moveToNearbyStation(' + idx + ')">' +
          '<div class="ev-map-station-item-top">' +
            '<span class="ev-map-station-item-name">' + (s.stnPlace || '-') + '</span>' +
            (dist ? '<span class="ev-map-station-item-dist">' + dist + '</span>' : '') +
          '</div>' +
          '<p class="ev-map-station-item-addr">📍 ' + (s.stnAddr || '-') + '</p>' +
          '<div class="ev-map-station-item-bottom">' +
            '<span class="ev-map-station-item-rapid">급속 ' + (s.rapidCnt || 0) + '대</span>' +
            '<span class="ev-map-station-item-slow">완속 ' + (s.slowCnt || 0) + '대</span>' +
          '</div>' +
        '</div>';
        addMarker(s.lat, s.lng, '#16a34a', s);
      });
      document.getElementById('nearbyList').innerHTML = html;
      window._nearbyStations = list;
    }

    function moveToNearbyStation(idx) {
      var s = window._nearbyStations[idx];
      showDetail(s);
      if (s.lat && s.lng) {
        map.setCenter(new kakao.maps.LatLng(s.lat, s.lng));
        map.setLevel(4);
      }
    }

    // 내 위치
   function getMyLocation() {
	  if (!navigator.geolocation) { alert('위치 정보를 지원하지 않는 브라우저입니다.'); return; }
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
	    document.getElementById('nearbyList').innerHTML = '<div class="ev-map-loading">주변 충전소 불러오는 중...</div>';
	
	    var geocoder = new kakao.maps.services.Geocoder();
	    geocoder.coord2RegionCode(userLocation.lng, userLocation.lat, function(result, status) {
	        if (status === kakao.maps.services.Status.OK) {
	            var region = result[0];
	            var metro = region.region_1depth_name; // ex) 경기도
	            var city = region.region_2depth_name;  // ex) 수원시 장안구
	            console.log('metro:', metro, 'city:', city);
	            loadNearbyStationsFromDb(metro, city);
	        }
	    });
	  }, function() {
	    alert('위치 정보를 가져올 수 없습니다.');
	  });
	}
    
   function loadNearbyStationsFromDb(metro, city) {
	    var cityKeyword = city ? city.split(' ')[0] : '';
	    fetch('/api/stations/db?metroCd=' + encodeURIComponent(metro) + '&city=' + encodeURIComponent(cityKeyword))
	        .then(function(res) { return res.json(); })
	        .then(function(data) {
	            if (!data || data.length === 0) {
	                document.getElementById('nearbyList').innerHTML = '<div class="ev-map-empty">주변 충전소 없음</div>';
	                return;
	            }
	            
	            // DB 필드명 맞게 변환
	            stations = data.map(function(s) {

				    s.stnPlace = s.name;
				    s.stnAddr = s.address;
				
				    s.lat = parseFloat(s.latitude);
				    s.lng = parseFloat(s.longitude);
				
				    console.log('DB 좌표:', s.stnPlace, s.lat, s.lng);
				
				    s.dist =
				        !isNaN(s.lat) && !isNaN(s.lng)
				        ? calcDistance(userLocation.lat, userLocation.lng, s.lat, s.lng)
				        : null;
				
				    return s;
				});
	            stations.sort(function(a, b) { return (a.dist || 0) - (b.dist || 0); });

	            clearMarkers();
	            stations.forEach(function(s) {
	            	if (!isNaN(s.lat) && !isNaN(s.lng)) {
	            	    addMarker(s.lat, s.lng, '#16a34a', s);
	            	}
	            });
	            renderNearbyList();
	        });
	}

    function getMetroCd(regionName) {
      var map = {
        '서울': '11', '부산': '21', '대구': '22', '인천': '23',
        '광주': '24', '대전': '25', '울산': '26', '세종': '29',
        '경기': '31', '강원': '32', '충북': '33', '충남': '34',
        '전북': '35', '전남': '36', '경북': '37', '경남': '38', '제주': '39'
      };
      for (var key in map) {
        if (regionName.includes(key)) return map[key];
      }
      return '11';
    }

    function loadNearbyStations(metroCd, userCity) {
    	  fetch('/api/stations?metroCd=' + metroCd)
    	    .then(function(res) { return res.json(); })
    	    .then(function(data) {
    	      if (!data || !data.data) return;

    	      var cityKeyword = userCity ? userCity.split(' ')[0] : '';
    	      var list = data.data.filter(function(s) {
    	        return !cityKeyword || (s.city && s.city.includes(cityKeyword));
    	      });

    	      var geocoder = new kakao.maps.services.Geocoder();
    	      var idx = 0;

    	      function geocodeNext() {
    	        if (idx >= list.length) {
    	          stations = list.filter(function(s) { return s.lat; });
    	          stations.sort(function(a, b) { return (a.dist || 0) - (b.dist || 0); });
    	          renderNearbyList();
    	          return;
    	        }
    	        var s = list[idx];
    	        geocoder.addressSearch(s.stnAddr, function(result, status) {
    	          if (status === kakao.maps.services.Status.OK) {
    	            s.lat = parseFloat(result[0].y);
    	            s.lng = parseFloat(result[0].x);
    	            s.dist = calcDistance(userLocation.lat, userLocation.lng, s.lat, s.lng);
    	            addMarker(s.lat, s.lng, '#16a34a', s);
    	          }
    	          idx++;
    	          setTimeout(geocodeNext, 150);
    	        });
    	      }
    	      geocodeNext();
    	    });
    	}

    // 가장 가까운 충전소
    function findNearest() {
      if (!userLocation || stations.length === 0) return;
      var nearest = stations[0];
      showDetail(nearest);
      if (nearest.lat && nearest.lng) {
        map.setCenter(new kakao.maps.LatLng(nearest.lat, nearest.lng));
        map.setLevel(4);
      }
    }

    // 거리 계산
    function calcDistance(lat1, lng1, lat2, lng2) {
      var R = 6371;
      var dLat = (lat2 - lat1) * Math.PI / 180;
      var dLng = (lng2 - lng1) * Math.PI / 180;
      var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng/2) * Math.sin(dLng/2);
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }
    
    function initStationData() {
    	  var metroCd = document.getElementById('initMetroCd').value;
    	  if (!confirm('해당 지역 충전소 데이터를 DB에 저장할까요?')) return;
    	  
    	  fetch('/api/stations/init?metroCd=' + metroCd)
    	    .then(function(res) { return res.json(); })
    	    .then(function(data) {
    	      if (data.success !== undefined) {
    	        alert(data.total + '개 중 ' + data.success + '개 저장 완료!');
    	      } else {
    	        alert('오류: ' + data.error);
    	      }
    	    });
    	}
  </script>

</body>
</html>