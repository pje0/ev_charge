<%@ page language="java" contentType="text/html; charset=UTF-8" pageEncoding="UTF-8"%>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core"%>
<%@ taglib prefix="sec" uri="http://www.springframework.org/security/tags"%>
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>충전 요금 계산기 - EV 충전소</title>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/common.css">
  <link rel="stylesheet" href="/css/calculator.css">
</head>
<body>
  <jsp:include page="/WEB-INF/views/layout/header.jsp" />

  <main class="ev-calc-main">
    <div class="ev-container">
      <h1 class="ev-calc-title">충전 요금 계산기</h1>
      <p class="ev-calc-desc">희망하는 충전량을 입력하여 요금을 미리 계산하고 사업자별로 비교해보세요 (2026.5.22 기준)</p>

      <!-- 입력 폼 -->
      <div class="ev-calc-form">
        <div class="ev-calc-form-group">
          <label class="ev-calc-label">충전 속도</label>
          <div class="ev-calc-radio-group">
            <button type="button" class="ev-calc-radio active" onclick="setType('rapid', this)">급속</button>
            <button type="button" class="ev-calc-radio" onclick="setType('slow', this)">완속</button>
          </div>
        </div>
        <div class="ev-calc-form-group">
          <label class="ev-calc-label">회원 여부</label>
          <div class="ev-calc-radio-group">
            <button type="button" class="ev-calc-radio active" onclick="setMembership('member', this)">회원</button>
            <button type="button" class="ev-calc-radio" onclick="setMembership('nonMember', this)">비회원</button>
          </div>
        </div>
        <div class="ev-calc-form-group">
          <label class="ev-calc-label">충전량 (kWh)</label>
          <div class="ev-calc-kwh-wrap">
            <input type="number" id="kwhInput" class="ev-calc-kwh-input" value="30" min="1" max="200" oninput="calculate()">
            <span class="ev-calc-kwh-unit">kWh</span>
          </div>
        </div>
        <button type="button" class="ev-calc-btn" onclick="calculate()">계산하기</button>
        <button type="button" class="ev-calc-btn-reset" onclick="reset()">다시설정</button>
      </div>

      <!-- 결과 -->
      <div class="ev-calc-result" id="resultSection" style="display:none">
        <h2 class="ev-calc-result-title" id="resultTitle"></h2>
        <div class="ev-calc-result-grid" id="resultGrid"></div>
      </div>
    </div>
  </main>

  <script>
    var chargeType = 'rapid';
    var membership = 'member';

    var operators = [
        { name: "기후에너지환경부", slow: { member: null, nonMember: null }, rapid: { member: 324.4, nonMember: 324.4 } },
        { name: "E1", slow: { member: 301.4, nonMember: 301.4 }, rapid: { member: 313.1, nonMember: 313.1 } },
        { name: "GS차지비", slow: { member: 319.0, nonMember: 470.0 }, rapid: { member: 335.0, nonMember: 470.0 } },
        { name: "KH에너지", slow: { member: null, nonMember: null }, rapid: { member: 347.0, nonMember: 347.0 } },
        { name: "LG유플러스 볼트업", slow: { member: 318.0, nonMember: 450.0 }, rapid: { member: 350.0, nonMember: 450.0 } },
        { name: "NICE인프라", slow: { member: 324.0, nonMember: 324.0 }, rapid: { member: 350.0, nonMember: 350.0 } },
        { name: "SG생활안전", slow: { member: 315.0, nonMember: 450.0 }, rapid: { member: 350.0, nonMember: 450.0 } },
        { name: "SK렌터카", slow: { member: 310.0, nonMember: 310.0 }, rapid: { member: 350.0, nonMember: 350.0 } },
        { name: "SK시그넷", slow: { member: null, nonMember: null }, rapid: { member: 395.0, nonMember: 395.0 } },
        { name: "SK에너지", slow: { member: 286.0, nonMember: 286.0 }, rapid: { member: 347.2, nonMember: 450.0 } },
        { name: "SK일렉링크", slow: { member: 295.0, nonMember: 590.0 }, rapid: { member: 391.0, nonMember: 590.0 } },
        { name: "가온건설", slow: { member: 324.4, nonMember: 324.4 }, rapid: { member: 347.2, nonMember: 347.2 } },
        { name: "광성계측기", slow: { member: 240.0, nonMember: 240.0 }, rapid: { member: 320.0, nonMember: 320.0 } },
        { name: "그리드위즈", slow: { member: 280.0, nonMember: 280.0 }, rapid: { member: 340.0, nonMember: 340.0 } },
        { name: "그린전력", slow: { member: 324.4, nonMember: 324.4 }, rapid: { member: 347.2, nonMember: 347.2 } },
        { name: "넥씽", slow: { member: 300.0, nonMember: 400.0 }, rapid: { member: 350.0, nonMember: 400.0 } },
        { name: "농협경제지주 신재생에너지센터", slow: { member: 274.0, nonMember: 385.0 }, rapid: { member: 287.0, nonMember: 385.0 } },
        { name: "뉴로모빌리티", slow: { member: 280.0, nonMember: 280.0 }, rapid: { member: 324.0, nonMember: 324.0 } },
        { name: "뉴텍솔루션", slow: { member: 270.0, nonMember: 370.0 }, rapid: { member: 280.0, nonMember: 440.0 } },
        { name: "대도엘앤씨", slow: { member: 320.0, nonMember: 350.0 }, rapid: { member: null, nonMember: null } },
        { name: "대성물류건설", slow: { member: 280.0, nonMember: 500.0 }, rapid: { member: null, nonMember: null } },
        { name: "대한송유관공사", slow: { member: null, nonMember: null }, rapid: { member: 324.4, nonMember: 324.4 } },
        { name: "동양이엔피", slow: { member: 280.0, nonMember: 280.0 }, rapid: { member: 350.0, nonMember: 350.0 } },
        { name: "두루스코이브이", slow: { member: 250.0, nonMember: 350.0 }, rapid: { member: 340.0, nonMember: 400.0 } },
        { name: "딜라이브", slow: { member: 279.0, nonMember: 279.0 }, rapid: { member: null, nonMember: null } },
        { name: "레드이엔지", slow: { member: 260.0, nonMember: 400.0 }, rapid: { member: 400.0, nonMember: 500.0 } },
        { name: "롯데이노베이트", slow: { member: null, nonMember: null }, rapid: { member: 360.0, nonMember: 500.0 } },
        { name: "리셀파워", slow: { member: 294.4, nonMember: 324.4 }, rapid: { member: 306.3, nonMember: 336.3 } },
        { name: "매니지온", slow: { member: 230.0, nonMember: 400.0 }, rapid: { member: 324.4, nonMember: 400.0 } },
        { name: "메가볼트", slow: { member: 324.4, nonMember: 324.4 }, rapid: { member: 347.2, nonMember: 347.2 } },
        { name: "모던텍", slow: { member: 324.7, nonMember: 380.0 }, rapid: { member: 324.7, nonMember: 380.0 } },
        { name: "모트렉스이브이", slow: { member: 250.0, nonMember: 295.0 }, rapid: { member: 300.0, nonMember: 345.0 } },
        { name: "보타리에너지", slow: { member: 286.7, nonMember: 286.7 }, rapid: { member: 324.4, nonMember: 324.4 } },
        { name: "브라이트에너지파트너스", slow: { member: 295.0, nonMember: 295.0 }, rapid: { member: null, nonMember: null } },
        { name: "블루네트웍스", slow: { member: 324.4, nonMember: 324.4 }, rapid: { member: 347.2, nonMember: 347.2 } },
        { name: "서울시", slow: { member: 324.4, nonMember: 324.4 }, rapid: { member: 324.4, nonMember: 324.4 } },
        { name: "서울씨엔지", slow: { member: 315.0, nonMember: 450.0 }, rapid: { member: 350.0, nonMember: 450.0 } },
        { name: "서현에너지", slow: { member: 324.4, nonMember: 324.4 }, rapid: { member: null, nonMember: null } },
        { name: "선광시스템", slow: { member: 324.4, nonMember: 324.4 }, rapid: { member: 347.2, nonMember: 347.2 } },
        { name: "소프트베리", slow: { member: 297.0, nonMember: 297.0 }, rapid: { member: null, nonMember: null } },
        { name: "스칼라데이터", slow: { member: 320.0, nonMember: 320.0 }, rapid: { member: null, nonMember: null } },
        { name: "스타코프", slow: { member: 318.0, nonMember: 318.0 }, rapid: { member: 340.0, nonMember: 340.0 } },
        { name: "신세계아이앤씨", slow: { member: 269.0, nonMember: 455.0 }, rapid: { member: 324.0, nonMember: 455.0 } },
        { name: "아론", slow: { member: 290.0, nonMember: 290.0 }, rapid: { member: 340.0, nonMember: 340.0 } },
        { name: "아마노코리아", slow: { member: 276.0, nonMember: 440.0 }, rapid: { member: 330.0, nonMember: 440.0 } },
        { name: "아우토크립트", slow: { member: null, nonMember: null }, rapid: { member: 320.0, nonMember: 347.2 } },
        { name: "아이마켓코리아", slow: { member: 242.0, nonMember: 242.0 }, rapid: { member: 330.0, nonMember: 330.0 } },
        { name: "아이파킹", slow: { member: 299.0, nonMember: 400.0 }, rapid: { member: 345.0, nonMember: 450.0 } },
        { name: "아하", slow: { member: 260.0, nonMember: 350.0 }, rapid: { member: 300.0, nonMember: 360.0 } },
        { name: "에바", slow: { member: 260.0, nonMember: 260.0 }, rapid: { member: 319.0, nonMember: 319.0 } },
        { name: "에버온", slow: { member: 296.0, nonMember: 380.0 }, rapid: { member: 296.0, nonMember: 380.0 } },
        { name: "에스에스기전", slow: { member: 280.0, nonMember: 400.0 }, rapid: { member: 300.0, nonMember: 400.0 } },
        { name: "에스이랩", slow: { member: 230.0, nonMember: 340.0 }, rapid: { member: null, nonMember: null } },
        { name: "엔비플러스", slow: { member: 324.4, nonMember: 324.4 }, rapid: { member: 347.2, nonMember: 347.2 } },
        { name: "엘에스이링크", slow: { member: null, nonMember: null }, rapid: { member: 319.0, nonMember: 319.0 } },
        { name: "온스테이션", slow: { member: 320.0, nonMember: 420.0 }, rapid: { member: null, nonMember: null } },
        { name: "유플러스아이티", slow: { member: 290.0, nonMember: 400.0 }, rapid: { member: 320.0, nonMember: 400.0 } },
        { name: "이브이루씨", slow: { member: 292.0, nonMember: 300.0 }, rapid: { member: 340.0, nonMember: 450.0 } },
        { name: "이브이모드코리아", slow: { member: 290.0, nonMember: 400.0 }, rapid: { member: null, nonMember: null } },
        { name: "이브이시스", slow: { member: 310.0, nonMember: 550.0 }, rapid: { member: 324.0, nonMember: 550.0 } },
        { name: "이브이씨코리아", slow: { member: 324.0, nonMember: 324.0 }, rapid: { member: null, nonMember: null } },
        { name: "이브이파트너스", slow: { member: 270.0, nonMember: 350.0 }, rapid: { member: 330.0, nonMember: 450.0 } },
        { name: "이앤에이치에너지", slow: { member: 319.0, nonMember: 370.0 }, rapid: { member: 324.4, nonMember: 370.0 } },
        { name: "이에스앤에이치", slow: { member: 330.0, nonMember: 430.0 }, rapid: { member: 350.0, nonMember: 450.0 } },
        { name: "이엘일렉트릭", slow: { member: 260.0, nonMember: 480.0 }, rapid: { member: 320.0, nonMember: 480.0 } },
        { name: "이웨이브", slow: { member: 250.0, nonMember: 430.0 }, rapid: { member: 347.2, nonMember: 430.0 } },
        { name: "이지차저", slow: { member: 289.0, nonMember: 450.0 }, rapid: { member: 289.0, nonMember: 450.0 } },
        { name: "이카플러그", slow: { member: 275.0, nonMember: 275.0 }, rapid: { member: null, nonMember: null } },
        { name: "인큐버스", slow: { member: null, nonMember: null }, rapid: { member: 347.2, nonMember: 347.2 } },
        { name: "일렉트리", slow: { member: 324.4, nonMember: 324.4 }, rapid: { member: 347.2, nonMember: 347.2 } },
        { name: "임팩트연구소", slow: { member: 320.0, nonMember: 320.0 }, rapid: { member: null, nonMember: null } },
        { name: "제주전기자동차서비스", slow: { member: 280.0, nonMember: 480.0 }, rapid: { member: 320.0, nonMember: 480.0 } },
        { name: "차밥스", slow: { member: 280.0, nonMember: 324.4 }, rapid: { member: 400.0, nonMember: 400.0 } },
        { name: "채비", slow: { member: 275.0, nonMember: 590.0 }, rapid: { member: 315.0, nonMember: 590.0 } },
        { name: "캐스트프로", slow: { member: 324.4, nonMember: 324.4 }, rapid: { member: null, nonMember: null } },
        { name: "쿨사인", slow: { member: 324.4, nonMember: 324.4 }, rapid: { member: 347.2, nonMember: 347.2 } },
        { name: "크로커스", slow: { member: 242.0, nonMember: 430.0 }, rapid: { member: 330.0, nonMember: 450.0 } },
        { name: "클린일렉스", slow: { member: 295.0, nonMember: 590.0 }, rapid: { member: 370.0, nonMember: 590.0 } },
        { name: "타디스테크놀로지", slow: { member: 317.0, nonMember: 324.0 }, rapid: { member: 324.0, nonMember: 430.0 } },
        { name: "태성콘텍", slow: { member: 250.0, nonMember: 460.0 }, rapid: { member: 324.4, nonMember: 460.0 } },
        { name: "파워큐브", slow: { member: 319.0, nonMember: 319.0 }, rapid: { member: null, nonMember: null } },
        { name: "펌프킨", slow: { member: 324.15, nonMember: 407.0 }, rapid: { member: 347.13, nonMember: 400.0 } },
        { name: "플러그링크", slow: { member: 324.4, nonMember: 324.4 }, rapid: { member: 324.4, nonMember: 324.4 } },
        { name: "피라인모터스", slow: { member: 250.0, nonMember: 250.0 }, rapid: { member: 300.0, nonMember: 320.0 } },
        { name: "한국EV충전서비스센터", slow: { member: 400.0, nonMember: 400.0 }, rapid: { member: 400.0, nonMember: 400.0 } },
        { name: "한국자동차환경협회", slow: { member: 324.4, nonMember: 324.4 }, rapid: { member: 347.2, nonMember: 347.2 } },
        { name: "한국전기차인프라기술", slow: { member: 288.0, nonMember: 380.0 }, rapid: { member: 324.4, nonMember: 380.0 } },
        { name: "한국전기차충전서비스", slow: { member: 298.0, nonMember: 500.0 }, rapid: { member: 398.0, nonMember: 500.0 } },
        { name: "한국전력공사", slow: { member: 324.4, nonMember: 324.4 }, rapid: { member: 324.4, nonMember: 324.4 } },
        { name: "한마음장애인복지회", slow: { member: 324.4, nonMember: 324.4 }, rapid: { member: 347.2, nonMember: 347.2 } },
        { name: "한화솔루션", slow: { member: 283.0, nonMember: 341.0 }, rapid: { member: 352.0, nonMember: 504.0 } },
        { name: "해피차지", slow: { member: 315.0, nonMember: 500.0 }, rapid: { member: 337.0, nonMember: 550.0 } },
        { name: "현대엔지니어링", slow: { member: 292.0, nonMember: 450.0 }, rapid: { member: 368.0, nonMember: 500.0 } },
        { name: "현대자동차", slow: { member: null, nonMember: null }, rapid: { member: 325.0, nonMember: 530.0 } },
        { name: "휴맥스이브이", slow: { member: 280.0, nonMember: 480.0 }, rapid: { member: 320.0, nonMember: 480.0 } },
    ];
    
    function setType(type, btn) {
      chargeType = type;
      document.querySelectorAll('.ev-calc-radio-group').item(0)
        .querySelectorAll('.ev-calc-radio').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      calculate();
    }

    function setMembership(type, btn) {
      membership = type;
      document.querySelectorAll('.ev-calc-radio-group').item(1)
        .querySelectorAll('.ev-calc-radio').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      calculate();
    }

    function calculate() {
      var kwh = parseFloat(document.getElementById('kwhInput').value);
      if (!kwh || kwh <= 0) return;

      var results = [];
      operators.forEach(function(op) {
        var price = op[chargeType][membership];
        if (price === null) return;
        var total = Math.round(price * kwh);
        results.push({ name: op.name, price: price, total: total });
      });

      // 가격 오름차순 정렬
      results.sort(function(a, b) { return a.total - b.total; });

      var typeLabel = chargeType === 'rapid' ? '급속' : '완속';
      var memberLabel = membership === 'member' ? '회원' : '비회원';
      document.getElementById('resultTitle').textContent =
        kwh + 'kWh 충전 예상 요금 (' + typeLabel + ' / ' + memberLabel + ')';

      var html = '';
      results.forEach(function(r, idx) {
        var badge = idx === 0 ? '<span class="ev-calc-badge-best">최저가</span>' : '';
        html += '<div class="ev-calc-result-item' + (idx === 0 ? ' best' : '') + '">' +
          '<div class="ev-calc-result-name">' + r.name + badge + '</div>' +
          '<div class="ev-calc-result-rate">' + r.price + '원/kWh</div>' +
          '<div class="ev-calc-result-total">₩' + r.total.toLocaleString() + '</div>' +
        '</div>';
      });

      document.getElementById('resultGrid').innerHTML = html;
      document.getElementById('resultSection').style.display = 'block';
    }

    function reset() {
      document.getElementById('kwhInput').value = 30;
      chargeType = 'rapid';
      membership = 'member';
      document.querySelectorAll('.ev-calc-radio').forEach(function(b) { b.classList.remove('active'); });
      document.querySelectorAll('.ev-calc-radio-group').forEach(function(g) {
        g.querySelectorAll('.ev-calc-radio')[0].classList.add('active');
      });
      document.getElementById('resultSection').style.display = 'none';
    }

    // 페이지 로드시 자동 계산
    window.onload = function() { calculate(); };
  </script>
</body>
</html>