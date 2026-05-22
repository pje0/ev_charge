let selectedData = {
    	    stationName: '',
    	    chargerName: '',
    	    chargerId: null,
    	    resType: 'TIME',
    	    startTime: '',
    	    endTime: '',
    	    targetKwh: 30
    	};

    	let timeSelection = [];

    	console.log("🚀 [EV-Reservation] 매개변수 차단형 무적 엔진 로드 완료", selectedData);

    	// ==========================================
    	// 💡 [핵심 수리] 매개변수를 완전히 없앤 독립형 페이지 전환 함수들
    	// ==========================================

    	// 1단계 -> 2단계 직통 이동 (충전소 -> 충전기)
    	function routeToStep2() {
    	    console.log("\n⚙️ [ROUTER] 1단계 ──> 2단계 강제 맵 변경 실행");
    	    
    	    // 화면 체인지
    	    if(document.getElementById('ev-page-step-1')) document.getElementById('ev-page-step-1').classList.add('hidden');
    	    if(document.getElementById('ev-page-step-2')) document.getElementById('ev-page-step-2').classList.remove('hidden');
    	    
    	    // 상단 인디케이터 바 강제 업데이트 (1번 완료, 2번 활성화)
    	    updateIndicatorStyles(2);
    	}

    	// 2단계 -> 3단계 직통 이동 (충전기 -> 예약설정)
    	function routeToStep3() {
    	    console.log("\n⚙️ [ROUTER] 2단계 ──> 3단계 강제 맵 변경 실행");
    	    
    	    if(document.getElementById('ev-page-step-2')) document.getElementById('ev-page-step-2').classList.add('hidden');
    	    if(document.getElementById('ev-page-step-3')) document.getElementById('ev-page-step-3').classList.remove('hidden');
    	    
    	    updateIndicatorStyles(3);
    	}

    	// 인디케이터 바 디자인 갱신 전용 서브 함수
    	function updateIndicatorStyles(targetStep) {
    	    for (let i = 1; i <= 4; i++) {
    	        const ind = document.getElementById(`ev-step-ind-${i}`);
    	        if (!ind) continue;
    	        
    	        let numTag = ind.querySelector('.ev-step-num');
    	        if (i < targetStep) {
    	            ind.className = "flex items-center gap-2 ev-step-complete text-green-600 font-medium";
    	            if(numTag) {
    	                numTag.className = "ev-step-num w-5 h-5 flex items-center justify-center rounded-full bg-green-500 text-xs text-white font-bold";
    	                numTag.innerText = "✓";
    	            }
    	        } else if (i === targetStep) {
    	            ind.className = "flex items-center gap-2 ev-step-active text-blue-800 font-bold";
    	            if(numTag) {
    	                numTag.className = "ev-step-num w-5 h-5 flex items-center justify-center rounded-full bg-blue-800 text-xs text-white font-bold";
    	                numTag.innerText = i;
    	            }
    	        } else {
    	            ind.className = "flex items-center gap-2 text-gray-400 font-medium";
    	            if(numTag) {
    	                numTag.className = "ev-step-num w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 text-xs text-gray-600 font-normal";
    	                numTag.innerText = i;
    	            }
    	        }
    	    }
    	}

    	// ==========================================
    	// ⚡ DOM 로드 후 이벤트 리스너 안전 바인딩
    	// ==========================================
    	document.addEventListener("DOMContentLoaded", function() {
    	    console.log("🎯 [EV-INIT] 안전 바인딩 프로세스 시작");
    	    
    	 	// 시간 타일 클릭 이벤트
    	    document.querySelectorAll('.ev-time-tile').forEach(function(tile) {

    	        tile.addEventListener('click', function() {

    	            const timeStr = this.dataset.time;

    	            console.log("타일 클릭 =", timeStr);

    	            toggleTimeTile(this, timeStr);
    	        });
    	    });

    	    // [1단계] 강남 카드 클릭
    	    const gangnamBtn = document.getElementById('btn-station-gangnam');
    	    if (gangnamBtn) {
    	        gangnamBtn.addEventListener('click', function(e) {
    	            e.preventDefault(); e.stopPropagation();
    	            console.log("📍 [CLICK_OK] 강남 테헤란로 클릭됨");
    	            
    	            selectedData.stationName = "강남 테헤란로 충전소";
    	            document.getElementById('ev-summary-txt-1').innerText = "강남 테헤란로 충전소";
    	            document.getElementById('ev-summary-badge-1').className = "w-5 h-5 flex items-center justify-center rounded-full bg-green-500 text-white text-xs";
    	            
    	            routeToStep2(); // 매개변수 없는 전용 라우터 호출!
    	        });
    	    }

    	    // [1단계] 서초 카드 클릭
    	    const seochoBtn = document.getElementById('btn-station-seocho');
    	    if (seochoBtn) {
    	        seochoBtn.addEventListener('click', function(e) {
    	            e.preventDefault(); e.stopPropagation();
    	            console.log("📍 [CLICK_OK] 서초 반포대로 클릭됨");
    	            
    	            selectedData.stationName = "서초 반포대로 충전소";
    	            document.getElementById('ev-summary-txt-1').innerText = "서초 반포대로 충전소";
    	            document.getElementById('ev-summary-badge-1').className = "w-5 h-5 flex items-center justify-center rounded-full bg-green-500 text-white text-xs";
    	            
    	            routeToStep2();
    	        });
    	    }

    	    // [2단계] 충전기 카드 클릭
    	    document.querySelectorAll('.ev-charger-card').forEach(function(card) {
    	        card.addEventListener('click', function(e) {
    	            e.preventDefault(); e.stopPropagation();
    	            
    	            let name = this.getAttribute('data-name') || "DC콤보 (100kW)";
    	            let id = this.getAttribute('data-id') || 101;
    	            
    	            console.log(`⚡ [CLICK_OK] 충전기 선택됨 -> ${name}`);
    	            selectedData.chargerName = name;
    	            selectedData.chargerId = id;
    	            
    	            const hiddenInput = document.getElementById('ev-submit-charger-id');
    	            if (hiddenInput) hiddenInput.value = id;

    	            document.getElementById('ev-summary-txt-2').innerText = name;
    	            document.getElementById('ev-summary-badge-2').className = "w-5 h-5 flex items-center justify-center rounded-full bg-green-500 text-white text-xs";

    	            routeToStep3(); // 3단계 예약 설정 페이지로 이동!
    	        });
    	    });

    	    console.log("🎯 [EV-INIT] 안전 바인딩 프로세스 완료");
    	});

    	// ==========================================
    	// [3단계 이상] 서브 폼 및 슬라이더 액션
    	// ==========================================
		function switchSubMethod(type) {
		
		    selectedData.resType = type;
		    document.getElementById('ev-submit-res-type').value = type;
		
		    const tTab = document.getElementById('ev-tab-time');
		    const gTab = document.getElementById('ev-tab-target');
		
		    const tForm = document.getElementById('ev-sub-form-time');
		    const gForm = document.getElementById('ev-sub-form-target');
		
		    if (type === 'TIME') {
		
		        tTab.className =
		            "py-2.5 rounded-lg bg-white text-gray-900 shadow-sm";
		
		        gTab.className =
		            "py-2.5 rounded-lg text-gray-500 hover:text-gray-900";
		
		        tForm.classList.remove('hidden');
		        gForm.classList.add('hidden');
		
		    } else {
		
		        gTab.className =
		            "py-2.5 rounded-lg bg-white text-gray-900 shadow-sm";
		
		        tTab.className =
		            "py-2.5 rounded-lg text-gray-500 hover:text-gray-900";
		
		        gForm.classList.remove('hidden');
		        tForm.classList.add('hidden');
		
		        updateSlider(selectedData.targetKwh);
		    }
		}

		function toggleTimeTile(element, timeStr) {

		    console.log("클릭 시간 =", timeStr);

		    // 이미 선택한 시간 다시 누르면 무시
		    if (timeSelection.includes(timeStr)) {
		        return;
		    }

		    // 두 개 이미 선택했으면 초기화
		    if (timeSelection.length >= 2) {
		        clearTimeTiles();
		    }

		    // 선택 저장
		    timeSelection.push(timeStr);

		    // 정렬
		    timeSelection.sort((a, b) => a.localeCompare(b));

		    // 스타일 적용
		    element.classList.remove(
		        "border-gray-200",
		        "hover:bg-gray-50"
		    );

		    element.classList.add(
		        "bg-blue-600",
		        "text-white",
		        "border-blue-600"
		    );

		    console.log("현재 선택 =", timeSelection);

		    // 하나만 선택
		    if (timeSelection.length === 1) {

		        selectedData.startTime = timeSelection[0];
		        selectedData.endTime = "";

		        document.getElementById(
		            "ev-time-selection-txt"
		        ).innerText =
		            `선택: ${timeSelection[0]} ~ 선택중`;

		        return;
		    }

		    // 두 개 선택 완료
		    selectedData.startTime = timeSelection[0];
		    selectedData.endTime = timeSelection[1];

		    console.log("start =", selectedData.startTime);
		    console.log("end =", selectedData.endTime);

		    // hidden input 반영
		    document.getElementById(
		        "ev-submit-start-time"
		    ).value = selectedData.startTime;

		    document.getElementById(
		        "ev-submit-end-time"
		    ).value = selectedData.endTime;

		    // 화면 반영
		    document.getElementById(
		        "ev-time-selection-txt"
		    ).innerText =
		        `선택: ${selectedData.startTime} ~ ${selectedData.endTime}`;

		    document.getElementById(
		        "ev-summary-txt-3"
		    ).innerText =
		        `${selectedData.startTime} ~ ${selectedData.endTime}`;

		    document.getElementById(
		        "ev-summary-badge-3"
		    ).className =
		        "w-5 h-5 flex items-center justify-center rounded-full bg-green-500 text-white text-xs";
		}

		function clearTimeTiles() {

		    timeSelection = [];

		    selectedData.startTime = "";
		    selectedData.endTime = "";

		    document.getElementById(
		        "ev-time-selection-txt"
		    ).innerText = "선택: 미선택";

		    document.querySelectorAll(".ev-time-tile")
		        .forEach(el => {

		            el.classList.remove(
		                "bg-blue-600",
		                "text-white",
		                "border-blue-600"
		            );

		            el.classList.add(
		                "border-gray-200",
		                "hover:bg-gray-50"
		            );
		        });
		}

    	function updateSlider(val) {
    	    selectedData.targetKwh = val;
    	    document.getElementById('ev-submit-target-kwh').value = val;
    	    document.getElementById('ev-slider-val').innerText = `${val} kWh`;
    	    document.getElementById('ev-summary-txt-3').innerText = `목표 충전량: ${val}kWh`;
    	    document.getElementById('ev-summary-badge-3').className = "w-5 h-5 flex items-center justify-center rounded-full bg-green-500 text-white text-xs";
    	}

    	// 상단 백 버튼 일방통행 대응
    	function goBack(toStep) {
    	    if (toStep === 1) {
    	        if(document.getElementById('ev-page-step-2')) document.getElementById('ev-page-step-2').classList.add('hidden');
    	        if(document.getElementById('ev-page-step-1')) document.getElementById('ev-page-step-1').classList.remove('hidden');
    	        updateIndicatorStyles(1);
    	    } else if (toStep === 2) {
    	        if(document.getElementById('ev-page-step-3')) document.getElementById('ev-page-step-3').classList.add('hidden');
    	        if(document.getElementById('ev-page-step-2')) document.getElementById('ev-page-step-2').classList.remove('hidden');
    	        updateIndicatorStyles(2);
    	    } else if (toStep === 3) {
    	        if(document.getElementById('ev-page-step-4')) document.getElementById('ev-page-step-4').classList.add('hidden');
    	        if(document.getElementById('ev-page-step-3')) document.getElementById('ev-page-step-3').classList.remove('hidden');
    	        updateIndicatorStyles(3);
    	    }
    	}

    	function goNext(toStep) {
    	    document.getElementById('ev-final-station').innerText = selectedData.stationName;
    	    document.getElementById('ev-final-charger').innerText = selectedData.chargerName;
    	    
    	    if (selectedData.resType === 'TIME') {
    	        if (!selectedData.startTime || !selectedData.endTime) { 
    	            alert('충전 시간을 선택하세요.'); 
    	            return; 
    	        }
    	        document.getElementById('ev-final-target').innerText = `${selectedData.startTime} ~ ${selectedData.endTime}`;
    	    } else {
    	        document.getElementById('ev-final-target').innerText = `목표: ${selectedData.targetKwh} kWh`;
    	    }

    	    if(document.getElementById('ev-page-step-3')) document.getElementById('ev-page-step-3').classList.add('hidden');
    	    if(document.getElementById('ev-page-step-4')) document.getElementById('ev-page-step-4').classList.remove('hidden');
    	    updateIndicatorStyles(4);
    	}

    	console.log("🔥 최신 JS 실행중");
    	function submitFinalBooking() {
    		
    	    console.log("=== submitFinalBooking 시작 ===");
    	    console.log(selectedData);

    	    alert(JSON.stringify(selectedData));

    	    console.log("📨 [DB_SUBMIT] 백엔드 DTO 규격으로 데이터 포장 시작");

    	    // 최종 팝업 표시용
    	    document.getElementById('ev-pop-station').innerText =
    	        selectedData.stationName;

    	    document.getElementById('ev-pop-charger').innerText =
    	        selectedData.chargerName;

    	    document.getElementById('ev-pop-time').innerText =
    	        (selectedData.resType === 'TIME')
    	        ? `${selectedData.startTime} ~ ${selectedData.endTime}`
    	        : `목표 ${selectedData.targetKwh}kWh`;

    	    // 날짜 가져오기
			const dateElement =
			    document.getElementById('ev-reservation-date');
			
			if (!dateElement) {
			    alert('날짜 input 요소 없음');
			    return;
			}
			
			const todayStr = dateElement.value;
			
			console.log("todayStr =", todayStr);
			
			if (!todayStr) {
			    alert('날짜 미선택');
			    return;
			}

    	    // 전송 객체 생성
    	    const formData = new URLSearchParams();

    	    // 공통 데이터
    	    formData.append('chargerId', selectedData.chargerId);
    	    formData.append('reservationType', selectedData.resType);
    	    formData.append('carType', '아이오닉6');

    	    // TIME 예약
    	    if (selectedData.resType === 'TIME') {

    	        if (!selectedData.startTime ||
    	            !selectedData.endTime) {

    	            alert('예약 시간을 선택하세요.');
    	            return;
    	        }

    	        formData.append(
    	            'startTime',
    	            `${todayStr} ${selectedData.startTime}:00`
    	        );

    	        formData.append(
    	            'endTime',
    	            `${todayStr} ${selectedData.endTime}:00`
    	        );

    	    }
    	    // TARGET 예약
    	    else {

    	        formData.append(
    	            'targetKwh',
    	            selectedData.targetKwh
    	        );

    	        formData.append(
    	            'maxMinutes',
    	            120
    	        );
    	    }

    	    console.log("selectedData =", selectedData);
    	    console.log("🚀 [POST_DATA] 전송 데이터 확인");

    	    for (let [key, value] of formData.entries()) {
    	        console.log(`${key} = ${value}`);
    	    }

    	    fetch('/reservation/create', {
    	        method: 'POST',
    	        headers: {
    	            'Content-Type':
    	                'application/x-www-form-urlencoded'
    	        },
    	        body: formData.toString()
    	    })
    	    .then(response => {

    	        if (response.redirected) {

    	            console.log("🏁 예약 성공");

    	            window.location.href = response.url;
    	            return;
    	        }

    	        return response.text();
    	    })
    	    .then(data => {

    	        if (data) {
    	            document.getElementById('ev-success-modal')
    	                .classList.remove('hidden');
    	        }
    	    })
    	    .catch(error => {

    	        console.error("❌ 서버 오류", error);

    	        alert("예약 처리 중 오류가 발생했습니다.");
    	    });
    	}