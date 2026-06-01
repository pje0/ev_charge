// =========================================================================
// 🌐 EV 예약 시스템 클라이언트 코어 스크립트 (완전 주석 및 로깅 강화본)
// =========================================================================

/**
 * ==========================================
 * 📌 [전역 상태 변수 선언부]
 * [기능] 애플리케이션 전반에서 사용되는 핵심 데이터(상태)를 보관하는 메모리 공간입니다.
 * [중요도] ★★★★★ (시스템의 척추 역할)
 * [활용처] 충전소 선택, 예약 시간 마스킹, 폼 제출 등 스크립트 내 모든 함수에서 참조됩니다.
 * ==========================================
 */
if (typeof selectedStationId === 'undefined') { var selectedStationId = null; } // 현재 선택된 충전소의 PK
if (typeof selectedChargerId === 'undefined') { var selectedChargerId = null; } // 현재 선택된 개별 충전기의 PK
if (typeof reservationType === 'undefined') { var reservationType = "TIME"; }   // 예약 방식 (TIME: 시간 지정, TARGET: 목표량 지정)
if (typeof startTime === 'undefined') { var startTime = null; }                 // 예약 시작 시간 (예: "14:30")
if (typeof endTime === 'undefined') { var endTime = null; }                     // 예약 종료 시간 (예: "15:00")
if (typeof maxContinuousMinutes === 'undefined') { var maxContinuousMinutes = 1440; } // 현재 충전기의 최대 연속 가용 시간 (분 단위)
if (typeof isFetchingReservedTimes === 'undefined') { var isFetchingReservedTimes = false; } // API 중복 호출(따닥)을 막기 위한 통신 상태 락(Lock)
if (typeof selectedChargerKw === 'undefined') { var selectedChargerKw = 50.0; } // 선택된 충전기의 출력량 (소요 시간 계산용)
if (typeof isTargetAlertShowing === 'undefined') { var isTargetAlertShowing = false; } // 목표량 설정 시 경고창 중복 팝업 방지 락
if (typeof globalAlertLock === 'undefined') { var globalAlertLock = false; }    // 전역 시스템 경고창 중복 발생 방지 락

let lastSafeTargetPercent = 0; // 목표 충전량 슬라이더 조작 시, 오류가 발생했을 때 되돌아갈 '마지막으로 안전했던 퍼센트' 기록
let isBookingInProgress = false; // 현재 사용자가 예약을 진행 중인지 여부 (페이지 이탈 방지용)

// 예약 폼 제출 중복 방지 변수 (서버로 데이터가 2번 날아가는 현상 방지)
let isSubmittingForm = false; 

// 🟢 [사용자 차량 정보 전역 변수]
let userBatteryCapacity = 70.0; // 사용자의 대표 차량 배터리 총 용량 (목표량 연산의 핵심 기준값)
let userConnectorType = "";     // 사용자의 대표 차량 충전 규격 (충전기 규격 일치 여부 검증용)

console.log("🏁 [System Init] 전역 상태 변수 메모리 할당 및 초기화 완료");

/**
 * =========================================================================
 * 🛠️ [공통 헬퍼 함수] 로직을 건드리지 않고 분리된 유틸리티 모음
 * =========================================================================
 */

/**
 * 1. [유틸] 문자열 시간 파싱 함수
 * [기능] DB에서 날아온 ISO 시간이나 일반 문자열 시간을 순수한 '분(Minutes)' 단위 정수로 변환합니다.
 * [중요도] ★★★★☆
 * [활용처] 타임 슬롯 렌더링 시, 예약된 시간대를 칸별로 칠하기 위한 좌표 계산에 사용됩니다.
 */
function parseTimeStringToMinutes(timeInput, targetDateStr) {
    if (!timeInput) return null;
    
    // ISO 8601 포맷 (T나 Z가 포함된 경우)
    if (typeof timeInput === 'string' && (timeInput.includes('T') || timeInput.includes('Z'))) {
        const d = new Date(timeInput);
        let minutes = (d.getHours() * 60) + d.getMinutes();
        // 자정(00:00)이면서 다음 날로 넘어간 경우 1440분(24시간)으로 환산
        return minutes === 0 && d.getDate() !== new Date(targetDateStr).getDate() ? 1440 : minutes;
    }
    
    // 일반 시간 포맷 ("HH:mm" 형태)
    if (typeof timeInput === 'string') {
        let pureTime = timeInput.includes(' ') ? timeInput.split(' ')[1] : timeInput;
        const match = pureTime.match(/^(\d{2}):(\d{2})/);
        if (!match) return null;
        let hh = parseInt(match[1], 10);
        let mm = parseInt(match[2], 10);
        if (hh === 24 && mm === 0) return 1440; // 24:00 처리
        return (hh * 60) + mm;
    }
    return null;
}

/**
 * 2. [유틸] 충전기 속도 필터링 엔진
 * [기능] 전체 충전기 배열을 받아 사용자가 선택한 속도(급속/완속)에 맞게 배열을 잘라냅니다.
 * [중요도] ★★★★☆
 * [활용처] 충전기 목록 API 응답 직후, 화면에 그리기 전 데이터 정제 단계에서 호출됩니다.
 */
function filterChargersBySpeed(chargers, speedFilter) {
    console.log(`🔎 [Helper] 충전기 필터링 엔진 가동 -> 요청 필터: ${speedFilter}`);
    return chargers.filter(c => {
        // 급속 판단 절대 기준: 출력이 50kW 이상이거나 특정 급속 커넥터인 경우
        const isRapid = (c.powerKw >= 50 || c.connectorType === 'RAPID' || c.connectorType === 'DC_COMBO' || c.connectorType === 'CHAdemo' || c.connectorType === 'AC_3PHASE');
        if (speedFilter === 'RAPID') return isRapid;
        if (speedFilter === 'SLOW') return !isRapid;
        return true; // ALL인 경우 통과
    });
}

/**
 * 3. [유틸] 충전소 카드 HTML 생성기
 * [기능] 단일 충전소 객체(Station) 데이터를 받아 실제 화면에 그려질 HTML 태그 문자열로 변환합니다.
 * [중요도] ★★★☆☆
 * [활용처] fetchFilteredStations() 내부의 map() 루프에서 화면 조립 시 사용됩니다.
 */
function generateStationCardHTML(station, isActiveClass) {
    return `
        <div class="station-card ${isActiveClass}" onclick="loadChargers('${station.id}', this)">
            <div class="station-card-body">
                <h4 class="station-name" style="font-weight: 700; color: #111827; margin: 0; font-size: 1rem;">${station.name}</h4>
                <p class="station-address" style="font-size: 0.875rem; color: #6b7280; margin: 0.25rem 0 0 0;">${station.address}</p>
            </div>
        </div>
    `;
}

/**
 * 4. [유틸] 충전기 카드 HTML 생성기
 * [기능] 단일 충전기 객체(Charger) 데이터를 기반으로 상태 뱃지, 속도 정보가 포함된 카드 HTML을 생성합니다.
 * [중요도] ★★★★☆
 * [활용처] loadChargers() 함수에서 우측 충전기 리스트를 그릴 때 호출됩니다.
 */
function generateChargerCardHTML(c, preserveSelection, selectedChargerId) {
    const statusLower = c.status ? c.status.toLowerCase() : 'available';
    
    // 커넥터 영문 코드를 사용자 친화적 한글 명칭으로 변환
    let connectorName = c.connectorType;
    if (c.connectorType === 'DC_COMBO') connectorName = 'DC콤보 (7핀)';
    else if (c.connectorType === 'CHAdemo') connectorName = '차데모 (10핀)';
    else if (c.connectorType === 'AC_3PHASE') connectorName = 'AC 3상 (7핀)';
    else if (c.connectorType === 'AC_5PIN') connectorName = '완속 (5핀)';
    else if (c.connectorType === 'RAPID') connectorName = '급속 충전기';
    else if (c.connectorType === 'SLOW') connectorName = '완속 충전기';

    const isRapid = (c.powerKw >= 50 || c.connectorType === 'RAPID' || c.connectorType === 'DC_COMBO' || c.connectorType === 'CHAdemo' || c.connectorType === 'AC_3PHASE');
    const speedLabel = isRapid ? '급속' : '완속';
    const speedClass = isRapid ? 'rapid' : 'slow';

    const isBroken = (statusLower === 'maintenance' || statusLower === 'out_of_service');
    const isOccupied = (statusLower === 'charging' || statusLower === 'occupied' || statusLower === 'in_use');

    let cardClass = 'available';
    let badgeText = '사용 가능';

    if (isBroken) {
        cardClass = 'broken';
        badgeText = '기기 점검 중';
    } else if (isOccupied) {
        cardClass = 'occupied';
        badgeText = '사용 중 (예약 가능)';
    }

    // 선택 보존(Session Preserve) 상태일 경우 기존에 클릭했던 카드에 파란 불(active)을 다시 켜줌
    if (preserveSelection && Number(c.id) === Number(selectedChargerId)) {
        cardClass += ' active';
    }

    return `
        <div class="charger-card ${cardClass}" 
             id="charger-card-${c.id}" 
             data-status="${statusLower}"
             onclick="selectCharger(this, '${c.id}', '${connectorName}', ${c.powerKw}, '${c.connectorType}')"> 
            <div class="charger-card-header">
                <h3 class="charger-title">${connectorName}</h3>
                <span class="charger-badge">${badgeText}</span>
            </div>
            <div class="charger-info-row">
                <span class="speed-badge ${speedClass}">${speedLabel}</span>
                <p class="power-text">${c.powerKw}kW 출력</p>
            </div>
        </div>`;
}

/**
 * 5. [유틸] 과거 시간대 버튼 물리적 비활성화 격벽 처리기
 * [기능] 오늘 날짜 기준으로 이미 지나가버린 시간대(예: 현재 낮 1시라면 오전 버튼들)를 클릭하지 못하게 회색으로 닫아버립니다.
 * [중요도] ★★★★★ (예약 무결성 보장의 핵심)
 * [활용처] loadReservedTimes() 통신 직전에 화면 보호를 위해 즉각 실행됩니다.
 */
function lockPastTimeSlots(date, todayStr, selectedDateObj, todayDateObj, now) {
    console.log("🔒 [Helper] 과거 시간대 물리적 락(Lock) 스캔 시작");
    document.querySelectorAll(".ev-time-btn").forEach(btn => {
        const t = btn.dataset.time;
        const [h, m] = t.split(":").map(Number);
        
        let isPast = false;
        if (selectedDateObj < todayDateObj) {
            isPast = true; // 과거 날짜를 강제로 뚫고 들어온 경우 전면 차단
        } else if (date === todayStr) {
            // 오늘 날짜인 경우 현재 시/분 비교
            if (h < now.getHours() || (h === now.getHours() && m <= now.getMinutes())) {
                isPast = true;
            }
        }

        if (isPast) {
            btn.classList.add("disabled", "is-past-hour");
        }
    });
}

/**
 * 6. [유틸] 예약 폼 필수 값 제출 전 최종 검증기
 * [기능] 사용자가 '예약 확정' 버튼을 눌렀을 때, 시간, 날짜, 목표량 등 필수 값이 누락되지 않았는지 깐깐하게 검사합니다.
 * [중요도] ★★★★★ (백엔드 에러 방지용 프론트 1차 방어선)
 * [활용처] submitReservation() 최상단에서 실행됩니다.
 */
function validateReservationForm(type, date, todayStr, now) {
    console.log("🛡️ [Helper] 폼 제출 전 최종 데이터 무결성 검증 가동");
    if (!date) {
        alert("예약 날짜를 선택해 주세요.");
        return false;
    }

    if (type === "TIME") {
        if (startTime == null || endTime == null) {
            alert("예약 시간을 선택하세요.");
            return false;
        }
    } else if (type === "TARGET") {
        if (!startTime || !endTime) {
            alert("예약 가능한 시간대가 존재하지 않아 예약을 진행할 수 없습니다.");
            return false;
        }
    }

    // 서버 전송 직전 마지막으로 한 번 더 과거 시간 예약 시도를 차단 (더블 체크)
    if (date === todayStr && startTime) {
        const [startH, startM] = startTime.split(":").map(Number);
        if (startH < now.getHours() || (startH === now.getHours() && startM < now.getMinutes())) {
            alert("현재 시간보다 이전의 시간대는 예약할 수 없습니다. 다른 시간대를 골라주세요.");
            return false;
        }
    }
    console.log("✅ [Helper] 폼 검증 완벽 통과");
    return true;
}

/**
 * 7. [유틸] 목표 충전량 히든 폼 동적 주입기
 * [기능] 눈에 보이는 슬라이더 값을 백엔드가 이해할 수 있는 순수 데이터(Hidden Input)로 변환하여 폼 객체에 몰래 밀어 넣습니다.
 * [중요도] ★★★★☆
 * [활용처] submitReservation() 내부에서 TARGET 방식 예약일 때 동작합니다.
 */
function appendTargetHiddenInputs(percentVal, calculatedKwh) {
    console.log(`📦 [Helper] 목표 충전량 데이터 캡슐화 -> 퍼센트: ${percentVal}%, 전력량: ${calculatedKwh}kWh`);
    let targetPctHidden = document.getElementById("targetPercentHiddenForm");
    if (!targetPctHidden) {
        targetPctHidden = document.createElement("input"); targetPctHidden.type = "hidden"; targetPctHidden.name = "targetPercent"; targetPctHidden.id = "targetPercentHiddenForm";
        document.getElementById("reservationForm").appendChild(targetPctHidden);
    }
    targetPctHidden.value = percentVal;

    let targetHidden = document.getElementById("targetKwhHidden");
    if (!targetHidden) {
        targetHidden = document.createElement("input"); targetHidden.type = "hidden"; targetHidden.name = "targetKwh"; targetHidden.id = "targetKwhHidden";
        document.getElementById("reservationForm").appendChild(targetHidden);
    }
    targetHidden.value = calculatedKwh;

    let minutesHidden = document.getElementById("maxMinutesHidden");
    if (!minutesHidden) {
        minutesHidden = document.createElement("input"); minutesHidden.type = "hidden"; minutesHidden.name = "maxMinutes"; minutesHidden.id = "maxMinutesHidden";
        document.getElementById("reservationForm").appendChild(minutesHidden);
    }
    minutesHidden.value = calculateRequiredMinutes(percentVal);
}

/**
 * =========================================================================
 * 🎬 화면(Step) 및 UI 상태 제어 로직
 * =========================================================================
 */

/**
 * [기능] 예약 1단계, 2단계, 3단계 간의 화면 전환 및 프로그레스 바(진행도)를 조작합니다.
 * [중요도] ★★★★☆
 * [활용처] 하단의 '다음 단계', '이전 단계' 버튼 클릭 시 호출됩니다.
 */
function moveStep(step) {
    console.log(`🎬 [Step 전환] 목표 레이어 뷰 전환 가동: Step ${step}으로 이동`);
    // 3단계(확인) 진입 시, 사용자가 이전 단계에서 설정한 값들을 요약 텍스트로 치환하여 보여줌
    if (step === 3) {
        const date = document.getElementById("reservationDate")?.value;
        document.getElementById("summaryDate").innerText = date || "-";
        
        if (!startTime || !endTime) {
            document.getElementById("summaryTime").innerText = "시간 미지정";
        }
        
        const type = document.getElementById("reservationType").value;
        if (type === "TIME") {
            document.getElementById("summaryTarget").innerText = "목표 충전량 미설정";
        } else {
            const currentPercent = document.getElementById("targetPercent").value;
            document.getElementById("summaryTarget").innerText = currentPercent + "%";
        }
    }

    // 1단계(처음)로 빽(Back)할 경우 진행하던 모든 설정을 안전하게 파기
    if (step === 1) {
        clearAllReservationStyles();
    }

    // 모든 페이지 요소를 숨긴 후 타겟 단계 요소만 노출 (CSS 토글 방식)
    document.querySelectorAll(".ev-page").forEach(p => p.classList.add("hidden"));
    document.getElementById("ev-page-" + step)?.classList.remove("hidden");
    
    // 상단 네비게이션 동그라미 스텝 컬러 활성화 처리
    document.querySelectorAll(".ev-step").forEach((el, idx) => {
        const stepNum = idx + 1;
        if (stepNum <= step) {
            el.classList.add("ev-step-on");
        } else {
            el.classList.remove("ev-step-on");
        }
    });
}

/**
 * [기능] 사용자가 설정하던 시간, 슬라이더, 요약 텍스트 등을 초기(0) 상태로 강제 포맷합니다.
 * [중요도] ★★★★☆
 * [활용처] 충전소를 아예 다른 곳으로 바꾸거나, 1단계로 되돌아갈 때 잔여 데이터 오염을 막기 위해 실행됩니다.
 */
function clearAllReservationStyles() {
    console.log("🧹 [스타일 리셋] 모든 폼 변수 및 슬롯 원상복구 파괴 연산 가동");
    startTime = null;
    endTime = null;
    lastSafeTargetPercent = 0; 
    
    // 히든 인풋 및 요약 텍스트 초기화
    if (document.getElementById("startTime")) document.getElementById("startTime").value = "";
    if (document.getElementById("endTime")) document.getElementById("endTime").value = "";
    if (document.getElementById("summaryTime")) document.getElementById("summaryTime").innerText = "-";
    
    // 슬라이더 포지션 0% 강제 원복
    const slider = document.getElementById("targetPercent");
    if (slider) {
        slider.value = 0; 
        updateSliderVisuals(0); 
    }
    const textDisplay = document.getElementById("targetPercentText");
    if (textDisplay) textDisplay.innerText = "0%"; 

    // 하단 시간표(타임 슬롯) 버튼들에 묻어있는 색상, 락 클래스를 전부 떼어내어 새하얀 상태로 복구
    document.querySelectorAll(".ev-time-btn").forEach(btn => {
        btn.classList.remove("active", "in-range", "disabled", "is-past-hour", "is-reserved-locked", "my-reservation");
        if(btn.dataset.time) {
            btn.innerText = btn.dataset.time; // "마감" 글자 등을 원래 시간(예: 14:30)으로 복구
        }
    });
}

/**
 * [기능] 특정 충전기 카드의 색상(빨강, 회색, 기본)과 뱃지 텍스트를 즉시 변경하는 스위칭 엔진
 * [중요도] ★★★☆☆
 * [활용처] 1단계 화면에서 충전기들의 가용 여부를 체크한 뒤, 예약 불가 기기를 시각적으로 차단할 때 씁니다.
 */
function applyChargerStatusUI(chargerId, isNotBookable) {
    const targetCard = document.getElementById(`charger-card-${chargerId}`);
    if (!targetCard) return;

    const statusLower = targetCard.getAttribute("data-status") || "available";
    const isBroken = (statusLower === 'maintenance' || statusLower === 'out_of_service');
    const isOccupied = (statusLower === 'charging' || statusLower === 'occupied' || statusLower === 'in_use');
    const badge = targetCard.querySelector(".charger-badge");

    if (isBroken) {
        console.log(`🚨 [UI 제어] ID ${chargerId}: 치명적 에러 - 기기 점검 상태 시각화 (Red)`);
        targetCard.className = "charger-card broken"; 
        if (badge) badge.innerText = "기기 점검 중";
    } else if (isNotBookable) {
        console.log(`⚠️ [UI 제어] ID ${chargerId}: 예약 여유 공간 부족 - 금일 예약 불가 처리 (Gray)`);
        targetCard.className = "charger-card full";
        if (badge) badge.innerText = "금일 예약 불가";
    } else {
        targetCard.className = `charger-card ${isOccupied ? 'occupied' : 'available'}`; 
        if (badge) badge.innerText = isOccupied ? "사용 중 (예약 가능)" : "사용 가능";
    }
}

/**
 * =========================================================================
 * 📡 서버 통신 및 데이터 렌더링 로직 (API Fetch)
 * =========================================================================
 */

/**
 * [기능] 선택된 충전소(Station)의 ID를 서버로 보내 해당 충전소에 종속된 충전기(Charger) 목록을 불러옵니다.
 * [중요도] ★★★★★ (우측 화면 렌더링 코어)
 * [활용처] 좌측 충전소 카드를 클릭하거나, 상단 필터가 변경될 때마다 가동됩니다.
 */
async function loadChargers(stationId, element, preserveSelection = false) {
    console.log(`🔌 [API] 충전기 목록 조회 통신 시작 -> 목표 stationId: ${stationId}, 세션 보존(preserve): ${preserveSelection}`);

    if (!stationId) return;
    selectedStationId = Number(stationId);
    
    // 시각적 선택 유지 처리: 클릭된 충전소 카드 파란 불 켜기
    document.querySelectorAll('.station-card').forEach(el => el.classList.remove('active'));
    if (element) {
        element.classList.add('active');
    } else {
        const targetStationCard = document.querySelector(`.station-card[onclick*="'${stationId}'"]`) 
                               || document.querySelector(`.station-card[onclick*="${stationId}"]`);
        if (targetStationCard) targetStationCard.classList.add('active');
    }
    
    if (!preserveSelection) {
        clearAllReservationStyles();
    }
    
    const rightNow = new Date();
    const todayStr = `${rightNow.getFullYear()}-${String(rightNow.getMonth() + 1).padStart(2, '0')}-${String(rightNow.getDate()).padStart(2, '0')}`;
    const selectedDateStr = document.getElementById("reservationDate")?.value || todayStr;
    
    try {
        console.log(`🚀 [Fetch] 충전기 목록 GET 요청 발송 -> /reservation/api/chargers`);
        const res = await fetch(`/reservation/api/chargers?stationId=${stationId}&date=${selectedDateStr}`);
        if (!res.ok) throw new Error(`HTTP 통신 파단: ${res.status}`);
        
        let chargers = await res.json();
        const speedFilter = document.getElementById("filterSpeed")?.value || "ALL";
        
        // 가져온 전체 목록을 필터 엔진에 통과시켜 조건에 맞는 놈들만 추출
        chargers = filterChargersBySpeed(chargers, speedFilter);

        // 선택 보존 중이었으나 필터 변경으로 인해 내가 고른 기기가 짤려나간 경우 강제 폼 초기화
        const isCurrentChargerStillAvailable = chargers.some(c => Number(c.id) === Number(selectedChargerId));
        if (preserveSelection && !isCurrentChargerStillAvailable && selectedChargerId !== null && selectedChargerId !== 0) {
            console.warn(`⚠️ [Session] 선택했던 충전기(ID: ${selectedChargerId}) 소실 감지. 폼을 초기화합니다.`);
            clearAllReservationStyles();
        }

        const container = document.getElementById("chargerListContainer");
        if (!container) return;
        
        // 추출된 배열을 HTML 태그 문자열로 맵핑하여 DOM에 주입
        if (chargers.length > 0) {
            container.innerHTML = chargers.map(c => generateChargerCardHTML(c, preserveSelection, selectedChargerId)).join('');
            
            // 오늘 날짜인 경우, 각 충전기마다 잔여 시간을 백그라운드로 스캔하여 꽉 찬 기기는 즉시 회색 처리
            if (selectedDateStr === todayStr) {
                chargers.forEach(async (c) => {
                    await checkChargerAvailabilityOnLoad(c.id, selectedDateStr);
                });
            }
        } else {
            container.innerHTML = '<div class="charger-empty">해당 속도의 충전기가 이 충전소에는 없습니다.</div>';
        }

        // 선택 상태가 보존되었을 경우, 타임라인 정보도 서버에서 다시 땡겨와 2단계 뷰 완벽 복구
        if (selectedChargerId !== null && selectedChargerId !== 0 && isCurrentChargerStillAvailable) {
            console.log(`🔄 [Session] 충전기 ID: ${selectedChargerId} 세션 유지 확인. 타임라인 복구 헬퍼 가동`);
            await loadReservedTimes();
        }
    } catch (error) {
        console.error("❌ [API Error] 충전기 로드 중 치명적 통신 오류:", error);
    }
}

/**
 * [기능] 사용자가 상단에서 선택한 시/도, 시/군/구, 충전속도 조건을 서버로 보내 필터링된 '충전소' 목록을 그립니다.
 * [중요도] ★★★★★ (좌측 화면 렌더링 코어)
 * [활용처] 페이지 최초 접속 시, 그리고 상단 필터 셀렉트 박스 값이 바뀔 때마다 무한 호출됩니다.
 */
async function fetchFilteredStations() {
    const sido = document.getElementById("filterSido")?.value || ""; 
    const sigungu = document.getElementById("filterSigungu")?.value || ""; 
    const speed = document.getElementById("filterSpeed")?.value || "ALL"; 
    
    console.log(`📡 [API] 충전소 목록 동적 필터링 요청 -> 시/도: '${sido}', 군/구: '${sigungu}', 속도: '${speed}'`);

    try {
        const url = `/reservation/stations?sido=${encodeURIComponent(sido)}&sigungu=${encodeURIComponent(sigungu)}&speed=${speed}`;
        const response = await fetch(url);
        
        if (!response.ok) throw new Error(`서버 응답 거부: ${response.status}`);
        
        const stationList = await response.json(); 
        console.log(`📥 [API] 충전소 필터링 응답 완료: ${stationList.length}건 수신`);
        
        const container = document.getElementById("stationListContainer");
        const chargerContainer = document.getElementById("chargerListContainer");

        if (!container) return;

        // 결과가 0건일 때의 방어 로직 (빈 화면 처리)
        if (stationList.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:3rem 1rem; color:#9ca3af; font-weight:500;">조건에 맞는 충전소가 없습니다.</div>';
            if (chargerContainer) chargerContainer.innerHTML = '<div class="charger-empty">좌측에서 충전소를 선택해 주세요.</div>';
            clearAllReservationStyles();
            selectedStationId = null;
            return;
        }

        // HTML 조립기 헬퍼를 호출하여 DOM 구축
        container.innerHTML = stationList.map(s => {
            const isActiveClass = (Number(s.id) === Number(selectedStationId)) ? "active" : "";
            return generateStationCardHTML(s, isActiveClass);
        }).join('');

        // 기존에 클릭해 둔 충전소가 필터링 후에도 여전히 살아있다면, 리스트 리셋을 막고 끈질기게 세션을 보존
        if (selectedStationId) {
            const isStationStillVisible = stationList.some(s => Number(s.id) === Number(selectedStationId));
            if (isStationStillVisible) {
                console.log(`💡 [Session] 충전소 필터 변경 후에도 기존 선택 충전소 유지. 우측 충전기 로더 스위칭 가동`);
                await loadChargers(selectedStationId, null, true);
            } else {
                console.warn(`🗑️ [Session] 필터 범위 밖으로 기존 선택 충전소 소실. 시스템 전면 초기화`);
                selectedStationId = null;
                if (chargerContainer) chargerContainer.innerHTML = '<div class="charger-empty">조건 변경으로 선택이 해제되었습니다. 다시 선택해 주세요.</div>';
                clearAllReservationStyles();
            }
        } else {
            if (chargerContainer) chargerContainer.innerHTML = '<div class="charger-empty">좌측에서 충전소를 선택해 주세요.</div>';
        }

    } catch (err) {
        console.error("❌ [API Error] 충전소 필터링 엔진 파단:", err);
    }
}

/**
 * =========================================================================
 * 🛡️ 충전기 선택 및 가용성 사전 검증 로직
 * =========================================================================
 */

/**
 * [기능] 우측 충전기 카드를 클릭했을 때 실행되며, 상태와 규격을 검증한 뒤 2단계(예약 설정)로 넘겨줍니다.
 * [중요도] ★★★★★ (단계 전환의 핵심 트리거)
 */
function selectCharger(element, chargerId, chargerName, powerKw, rawConnectorType) {
    console.log(`👆 [Event] 유저 충전기 클릭 감지 -> ID: ${chargerId}, 규격: ${rawConnectorType}`);
    
    // 점검 중 기기 원천 차단
    if (element.classList.contains("broken")) {
        alert("해당 기기는 현재 점검 중이므로 예약할 수 없습니다.");
        return;
    }

    // 내 차량 커넥터 규격과 충전기의 커넥터 규격 불일치 시 경고 시스템 가동
    if (userConnectorType && rawConnectorType && userConnectorType !== rawConnectorType) {
        const warnMsg = `[경고] 고객님 대표 차량의 충전 규격(${userConnectorType})과 선택하신 충전기의 규격(${rawConnectorType})이 다릅니다.\n\n그래도 예약을 계속 진행하시겠습니까?`;
        console.warn("⚠️ [Validation] 차량-충전기 커넥터 규격 미스매치 감지! 사용자 컨펌 요청 중...");
        if (!confirm(warnMsg)) return;
    }

    // 통과 시 글로벌 변수에 데이터 락인
    isBookingInProgress = true; 
    document.getElementById("chargerId").value = chargerId;
    selectedChargerId = Number(chargerId);
    selectedChargerKw = Number(powerKw || 50.0);
    document.getElementById("summaryCharger").innerText = chargerName;
    
    clearAllReservationStyles(); // 혹시 모를 쓰레기 데이터 정리
    moveStep(2); // 2단계 뷰로 이동
    loadReservedTimes(); // 해당 기기의 예약된 시간대 땡겨오기
}

/**
 * [기능] 각 충전기 카드가 화면에 뿌려질 때 뒤쪽에서 몰래 서버와 통신하여, "오늘 남은 예약 가능 공간이 30분 미만인가?"를 스캔합니다.
 * [중요도] ★★★★☆ (UI 디테일 상승의 주역)
 */
async function checkChargerAvailabilityOnLoad(chargerId, targetDateStr) {
    const rightNow = new Date();
    const url = `/reservation/reserved-times?chargerId=${chargerId}&date=${targetDateStr}&stationId=${selectedStationId}`;
    
    try {
        const response = await fetch(url);
        if (response.ok) {
            const reservedList = await response.json();
            
            let testMaxInterval = 0;
            let currentInterval = 0;

            // 09시부터 24시까지 30분 단위로 루프를 돌며 비어있는 최대 연속 공간 탐색
            for (let h = 9; h < 24; h++) {
                const mArr = ["00", "30"];
                for (let mIdx = 0; mIdx < 2; mIdx++) {
                    const currentLoopMin = (h * 60) + Number(mArr[mIdx]);
                    
                    let isPastSlot = false;
                    const nowTotalMin = (rightNow.getHours() * 60) + rightNow.getMinutes();
                    if (currentLoopMin <= nowTotalMin) isPastSlot = true; // 지나간 시간인지 확인
                    
                    // 해당 칸이 남이 예약한 칸인지 스캔
                    let isReservedSlot = reservedList.some(rObj => {
                        const rStartStr = rObj.startTime || rObj.start_time || rObj.START_TIME;
                        const rEndStr = rObj.endTime || rObj.end_time || rObj.END_TIME;
                        if(!rStartStr || !rEndStr) return false;
                        
                        let startMin = parseTimeStringToMinutes(rStartStr, targetDateStr);
                        let endMin = parseTimeStringToMinutes(rEndStr, targetDateStr);
                        
                        if (startMin === null || endMin === null) return false;

                        if (startMin < 1440) startMin = startMin % 1440;
                        if (endMin < 1440) {
                            endMin = endMin % 1440;
                            if (endMin <= startMin) endMin += 1440;
                        }
                        
                        if (endMin === 1440) {
                            return (currentLoopMin >= startMin && currentLoopMin <= endMin);
                        } else {
                            return (currentLoopMin >= startMin && currentLoopMin < endMin);
                        }
                    });

                    // 지나간 시간이거나 남이 먹은 시간이면 콤보 체인 브레이크, 아니면 연속 구간 누적
                    if (isPastSlot || isReservedSlot) {
                        currentInterval = 0;
                    } else {
                        currentInterval += 30;
                        if (currentInterval > testMaxInterval) testMaxInterval = currentInterval;
                    }
                }
            }

            // 최대 빈 공간이 30분 이하라면 예약을 아예 할 수 없으므로 1단계부터 회색 처리
            if (testMaxInterval <= 30) {
                applyChargerStatusUI(chargerId, true);
            }
        }
    } catch (error) {
        console.error(`❌ [Background Scanner] 기기 가용성 백그라운드 체크 에러 (ID: ${chargerId}):`, error);
    }
}

/**
 * =========================================================================
 * 🎚️ 폼 UI 분기 제어 및 슬라이더 / 소요 시간 연산 로직
 * =========================================================================
 */

/**
 * [기능] '시간 지정 예약' 버튼과 '목표 충전량 설정' 버튼을 누를 때 폼의 모양을 토글합니다.
 * [중요도] ★★★☆☆
 */
function selectReservationType(type) {
    console.log(`🔀 [Form Toggle] 예약 방식 변경 감지 -> ${type} 모드`);
    reservationType = type;
    document.getElementById("reservationType").value = type;
    document.querySelectorAll(".ev-res-type-btn").forEach(btn => btn.classList.remove("active"));

    // 모드를 바꿀 때마다 하단에 색칠해뒀던 시간 블록들을 포맷시켜 꼬임 방지
    startTime = null;
    endTime = null;
    document.querySelectorAll(".ev-time-btn").forEach(btn => {
        if (!btn.classList.contains("disabled")) {
            btn.classList.remove("active", "in-range");
        }
    });

    if (type === "TIME") {
        document.getElementById("btnTime").classList.add("active");
        document.getElementById("timeBox").classList.remove("hidden");
        document.getElementById("targetBox").classList.add("hidden");
        loadReservedTimes(); // 타임라인 리셋 리로드
    } else {
        document.getElementById("btnTarget").classList.add("active");
        document.getElementById("timeBox").classList.remove("hidden");
        document.getElementById("targetBox").classList.remove("hidden");
        loadReservedTimes(); // 타임라인 리셋 리로드
    }
}

/**
 * [기능] 슬라이더를 마우스로 잡고 끌 때 막대기 안에 파란색 물을 실시간으로 채워주는 시각 엔진입니다.
 * [중요도] ★★☆☆☆ (UI 피드백)
 */
function updateSliderVisuals(value) {
    const slider = document.getElementById("targetPercent");
    const sliderText = document.getElementById("targetPercentText");
    if (!slider || !sliderText) return;

    slider.value = value;
    sliderText.textContent = value + "%";
    slider.style.background = `linear-gradient(to right, #2563eb ${value}%, #e5e7eb ${value}%)`;
}

// 🟢 페이지 구동 즉시 슬라이더에 Event Listener 이식 (마우스 끌기 실시간 반영 코어)
document.addEventListener("DOMContentLoaded", () => {
    const slider = document.getElementById("targetPercent");
    if (slider) {
        slider.addEventListener("input", (e) => {
            const val = e.target.value;
            updateSliderVisuals(val); // 즉시 파란불 채우기
            changeTargetPercent(val, true); // 뒷단에서 시간 연산 팽팽하게 돌리기
        });
        updateSliderVisuals(slider.value); // 최초 1회 렌더링 세팅
    }
});

/**
 * [기능] 유저 배터리 용량, 충전기 출력량, 목표 퍼센트를 수식에 넣어 실제 몇 분이 걸릴지 계산합니다.
 * [중요도] ★★★★★ (충전 로직의 두뇌)
 */
function calculateRequiredMinutes(targetVal) {
    const chargerKw = selectedChargerKw; 
    const batteryCapacity = userBatteryCapacity; 
    const currentPercent = 0.0; // 현재 남은 배터리 (추후 IoT 연동 시 확장 가능하도록 변수화)

    if (targetVal <= currentPercent) return 0;

    // 필요 전력량 = 내 차 배터리통 크기 * (원하는 퍼센트 / 100)
    const requiredKwh = batteryCapacity * ((targetVal - currentPercent) / 100.0);
    let durationHours = requiredKwh / chargerKw;
    let requiredMinutes = Math.ceil(durationHours * 60) + 15; // 기본 손실보정 여유시간 15분 삽입

    // 급속 충전기의 경우 배터리가 80%를 넘어가면 출력이 강제로 반토막 나는 물리 현상(테이퍼링) 수식 적용
    if (chargerKw > 20 && targetVal > 80) { 
        requiredMinutes += Math.ceil(((batteryCapacity * (targetVal - 80) / 100.0) / chargerKw) * 0.5 * 60);
    }
    console.log(`🧮 [Math Engine] 목표: ${targetVal}%, 내 배터리: ${batteryCapacity}kWh, 충전기출력: ${chargerKw}kW -> 예측 소요: ${requiredMinutes}분`);
    return requiredMinutes;
}

function isTodaySelected() {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const selectedDate = document.getElementById("reservationDate")?.value || "";
    return selectedDate === todayStr;
}

function getActualMaxAvailableMinutes() {
    return maxContinuousMinutes; 
}

/**
 * [기능] 슬라이더 값이 변경될 때마다 검증을 거쳐, 오버 오버 스펙이 요구될 경우 안전한 퍼센트로 강제 롤백시킵니다.
 * [중요도] ★★★★★ (무결성 통제기)
 */
function changeTargetPercent(value, isUserAction = true) {
    let targetVal = Number(value);
    const slider = document.getElementById("targetPercent");
    const currentPercent = 0.0;

    // 오늘 비어있는 슬롯이 아예 없는데 드래그를 시도할 경우 튕겨냄
    if (isUserAction && isTodaySelected() && getActualMaxAvailableMinutes() < 30) {
        alert("오늘 예약 가능한 시간대가 부족하여 설정을 변경할 수 없습니다.");
        updateSliderVisuals(lastSafeTargetPercent); 
        return; 
    }

    if (targetVal <= currentPercent) {
        updateSliderVisuals(currentPercent);
        if (document.getElementById("summaryTarget")) document.getElementById("summaryTarget").innerText = currentPercent + "%";
        lastSafeTargetPercent = currentPercent;
        syncTimeButtonsByTarget();
        return;
    }

    updateSliderVisuals(targetVal);
    if (document.getElementById("summaryTarget")) {
        document.getElementById("summaryTarget").innerText = targetVal + "%";
    }

    // 하단 시간표에 파란색 박스를 그릴 수 있는지 사전 시뮬레이션
    const isSequenceValid = syncTimeButtonsByTarget();
    
    // 시뮬레이션 실패(시간 부족) 시, 마지막에 성공했던 퍼센트로 스프링처럼 탄성 복구 (롤백 엔진)
    if (!isSequenceValid) {
        console.warn("⚠️ [Validation] 목표 충전량 달성을 위한 연속된 슬롯 공간 부족. 롤백을 실시합니다.");
        updateSliderVisuals(lastSafeTargetPercent); 
        if (document.getElementById("summaryTarget")) {
            document.getElementById("summaryTarget").innerText = lastSafeTargetPercent + "%";
        }
        if (slider) slider.blur(); 
        syncTimeButtonsByTarget(); // 시간표 뷰도 롤백
        return; 
    }

    lastSafeTargetPercent = targetVal; // 무사히 모든 관문을 뚫었을 때만 세이브 포인트 갱신
}

// 퀵 버튼 (40%, 80%, 100%) 클릭 시 동작
window.quickTarget = function(value) {
    console.log(`🎯 [Event] 퀵 타겟 버튼 클릭됨 -> ${value}%`);
    updateSliderVisuals(value); 
    changeTargetPercent(value, true); 
};

/**
 * =========================================================================
 * 🕒 시간표(Time Slot) 클릭 제어 및 점유 데이터 마스킹 엔진
 * =========================================================================
 */

/**
 * [기능] TIME 모드일 때 시간 버튼(예: 13:00)을 직접 클릭하면 시작-종료를 연결해주는 로직입니다.
 * [중요도] ★★★★☆
 */
function selectTime(element, time) {
    if (element.classList.contains("disabled") || element.classList.contains("is-past-hour")) return; 

    console.log(`🕒 [Event] 타임 슬롯 클릭 감지 -> 시간: ${time}`);

    if (reservationType === "TIME") {
        // 이미 앞-뒤가 다 찍혀있는데 또 누르면 깔끔하게 초기화
        if (startTime !== null && endTime !== null) {
            startTime = null;
            endTime = null;
            document.querySelectorAll(".ev-time-btn").forEach(btn => {
                if (!btn.classList.contains("disabled")) {
                    btn.classList.remove("active", "in-range");
                }
            });
        }
        
        // 첫 번째 클릭 (시작 지점)
        if (startTime === null) {
            startTime = time;
            element.classList.add("active");
            document.getElementById("summaryTime").innerText = "시작 시간: " + startTime;
            
            const date = document.getElementById("reservationDate").value;
            document.getElementById("startTime").value = date + " " + startTime + ":00";
            document.getElementById("endTime").value = ""; 
            return;
        }
        
        // 시작 지점을 한 번 더 누르면 취소
        if (startTime === time) {
            startTime = null;
            element.classList.remove("active");
            document.getElementById("summaryTime").innerText = "-";
            document.getElementById("startTime").value = "";
            return;
        }
        
        // 두 번째 클릭 (종료 지점) 및 순서 정렬
        let tempStart = startTime;
        let tempEnd = time;
        if (time < startTime) { tempEnd = startTime; tempStart = time; }

        // 내가 찍은 앞과 뒤 사이에 '마감'된 회색 블록이 끼어있는지 스캔
        let hasDisabledSlot = false;
        document.querySelectorAll(".ev-time-btn").forEach(btn => {
            const t = btn.dataset.time;
            if (t >= tempStart && t <= tempEnd && btn.classList.contains("disabled")) { 
                hasDisabledSlot = true; 
            }
        });
        
        if (hasDisabledSlot) { 
            console.error("❌ [Validation Error] 선택 범위 중간에 기 예약 슬롯 침범 감지됨!");
            alert("선택하신 구간 사이에 이미 예약된 시간이 포함되어 있습니다."); 
            return; 
        }

        // 스캔 무사 통과 시 쫘르륵 색칠 파도타기
        startTime = tempStart;
        endTime = tempEnd;
        document.querySelectorAll(".ev-time-btn").forEach(btn => {
            const t = btn.dataset.time;
            if (!btn.classList.contains("disabled")) {
                btn.classList.remove("active", "in-range");
                if (t === startTime || t === endTime) btn.classList.add("active");
                if (t > startTime && t < endTime) btn.classList.add("in-range");
            }
        });
        
        const date = document.getElementById("reservationDate").value;
        document.getElementById("startTime").value = date + " " + startTime + ":00";
        document.getElementById("endTime").value = date + " " + endTime + ":00";
        document.getElementById("summaryDate").innerText = date;
        document.getElementById("summaryTime").innerText = startTime + " ~ " + endTime;
        return; 
    }

    // TARGET(목표량) 모드일 때는 클릭한 놈 하나만 파랗게 만들고, 뒤쪽으로 몇 칸이 더 필요한지는 아래 함수에게 위임
    document.querySelectorAll(".ev-time-btn").forEach(btn => {
        if (!btn.classList.contains("disabled")) {
            btn.classList.remove("active", "in-range");
        }
    });

    startTime = time; 
    element.classList.add("active");
    
    const slider = document.getElementById("targetPercent");
    if (slider) {
        syncTimeButtonsByTarget();
    }
}

/**
 * [기능] TARGET 모드 시, 산출된 '필요한 분(Minutes)'을 토대로 하단 시간표의 파란 불을 자동으로 켭니다.
 * [중요도] ★★★★★ (TARGET 예약 시스템의 알파이자 오메가)
 */
function syncTimeButtonsByTarget() {
    const resType = document.getElementById("reservationType").value;
    if (resType !== 'TARGET') return true;

    const targetPercentText = document.getElementById("targetPercentText").innerText;
    const targetValue = parseInt(targetPercentText) || 0;

    const requiredMinutes = calculateRequiredMinutes(targetValue);
    const requiredSlots = Math.ceil(requiredMinutes / 30); // 30분 단위 칸 수 도출

    const allButtons = Array.from(document.querySelectorAll(".ev-time-btn")).sort((a, b) => {
        return a.dataset.time.localeCompare(b.dataset.time);
    });
    
    const cleanStyles = () => {
        allButtons.forEach(btn => {
            if (btn.classList.contains("disabled")) return; 
            btn.classList.remove("active", "in-range");
        });
    };

    if (requiredSlots <= 0) {
        cleanStyles();
        return true;
    }

    let validStartTime = startTime;
    // 내가 찍어둔 시작 시간이 마감되어 버렸다면, 첫 번째 빈 공간을 자동으로 탐색하여 시작점으로 잡음
    if (!validStartTime || !allButtons.some(btn => btn.dataset.time === validStartTime && !btn.classList.contains("disabled"))) {
        const firstAvailableBtn = allButtons.find(btn => !btn.classList.contains("disabled"));
        validStartTime = firstAvailableBtn ? firstAvailableBtn.dataset.time : null;
    }

    let targetStartIndex = -1;
    if (validStartTime) {
        targetStartIndex = allButtons.findIndex(btn => btn.dataset.time === validStartTime);
    }

    // 요구된 슬롯 개수만큼 뒤로 가면서, 중간에 마감된 슬롯이 걸리는지 지뢰 찾기 시뮬레이션
    let isSequenceValid = true;
    if (targetStartIndex !== -1 && (targetStartIndex + requiredSlots <= allButtons.length)) {
        for (let j = 0; j < requiredSlots; j++) {
            const checkBtn = allButtons[targetStartIndex + j];
            if (checkBtn.classList.contains("disabled")) {
                isSequenceValid = false;
                break;
            }
        }
    } else {
        isSequenceValid = false;
    }

    // 지뢰를 밟았을 경우
    if (!isSequenceValid) {
        if (document.querySelector(".ev-time-btn.active") || startTime) {
            // 경고창 따닥 발생 방지 락 제어
            if (!globalAlertLock) {
                globalAlertLock = true;
                setTimeout(() => {
                    alert("죄송합니다. 선택하신 시간대 이후로 연속된 예약 가능 공간이 부족합니다.\n목표 충전량을 낮추거나 다른 시작 시간을 선택해 주세요.");
                    globalAlertLock = false;
                }, 50); 
            }
            return false; 
        }

        // 사용자가 명시적으로 시간을 안 찍었는데도 부족하면, 전체 시간표를 뒤져서 딱 들어맞는 공간이 있는지 풀스캔
        targetStartIndex = -1;
        for (let i = 0; i < allButtons.length; i++) {
            let isValid = true;
            if (i + requiredSlots <= allButtons.length) {
                for (let j = 0; j < requiredSlots; j++) {
                    const checkBtn = allButtons[i + j];
                    if (checkBtn.classList.contains("disabled")) {
                        isValid = false;
                        break;
                    }
                }
                if (isValid) {
                    targetStartIndex = i; 
                    break;
                }
            }
        }
    }

    // 풀스캔까지 돌렸는데도 빈 공간이 없으면 최종 실패 리턴
    if (targetStartIndex === -1 || (targetStartIndex + requiredSlots > allButtons.length)) {
        return false;
    }

    // 시뮬레이션 완벽 통과 후 비로소 DOM을 건드려 화면에 파란 불을 입힘
    cleanStyles();

    let firstSelectedTime = null;
    let lastSelectedTime = null;

    for (let k = 0; k < requiredSlots; k++) {
        const btn = allButtons[targetStartIndex + k];
        if (btn.classList.contains("disabled")) continue;
        
        if (k === 0 || k === requiredSlots - 1) {
            btn.classList.add("active"); // 양끝
        } else {
            btn.classList.add("in-range"); // 중간 몸통
        }

        const btnTime = btn.getAttribute("data-time");
        if (!firstSelectedTime) firstSelectedTime = btnTime;
        lastSelectedTime = btnTime;
    }

    startTime = firstSelectedTime;
    
    // 종료 시간을 현재 칸 기준 +30분으로 연산하여 문자열 조립
    const [hh, mm] = lastSelectedTime.split(":").map(Number);
    let endH = hh;
    let endM = mm + 30;
    if (endM >= 60) { endH += 1; endM -= 60; }
    const endTimeStr = String(endH).padStart(2, '0') + ":" + String(endM).padStart(2, '0');
    
    endTime = endTimeStr;
    
    // 조립된 최종 시간들을 백엔드 전송용 히든 인풋에 삽입
    const date = document.getElementById("reservationDate").value;
    if (document.getElementById("startTime")) document.getElementById("startTime").value = date + " " + startTime + ":00";
    if (document.getElementById("endTime")) document.getElementById("endTime").value = date + " " + endTime + ":00";
    if (document.getElementById("summaryTime")) document.getElementById("summaryTime").innerText = `${startTime} ~ ${endTime} (${requiredMinutes}분 소요)`;
    
    return true;
}

/**
 * [기능] 남은 빈 공간 중 '연속으로' 가장 길게 뚫려있는 시간을 분(Minutes)으로 산출합니다.
 * [중요도] ★★★☆☆ (목표 충전량 상한선 브레이크용)
 */
function calculateMaxAvailableInterval() {
    const allButtons = Array.from(document.querySelectorAll(".ev-time-btn")).sort((a, b) => {
        return a.dataset.time.localeCompare(b.dataset.time);
    });

    let maxInterval = 0;
    let currentInterval = 0;

    allButtons.forEach(btn => {
        if (btn.classList.contains("disabled")) {
            currentInterval = 0;
            return; 
        }
        currentInterval += 30;
        if (currentInterval > maxInterval) {
            maxInterval = currentInterval;
        }
    });

    maxContinuousMinutes = maxInterval;
    console.log(`📈 [Memory] 재측정된 현재 시간표 내 최대 연속 가용 시간: ${maxContinuousMinutes}분`);
}

/**
 * [기능] 서버에서 이미 예약된 시간 목록을 가져와, 하단 시간표의 해당 블록들을 강제로 '마감' 시키고 회색으로 닫아버립니다.
 * [중요도] ★★★★★ (더블 부킹 방지의 절대 방어선)
 */
async function loadReservedTimes() {
    console.log("⏳ [loadReservedTimes] 타임라인 점유 상태 서버 동기화 루틴 기동");
    if (isFetchingReservedTimes) return; // 통신 중복 락
    
    const chargerId = document.getElementById("chargerId")?.value || selectedChargerId; 
    const date = document.getElementById("reservationDate")?.value;
    
    if (!chargerId || Number(chargerId) === 0 || !date) return;

    isFetchingReservedTimes = true;

    // 클렌징 단계
    document.querySelectorAll(".ev-time-btn").forEach(btn => {
        btn.classList.remove("disabled", "active", "in-range", "is-past-hour", "is-reserved-locked", "my-reservation");
        if(btn.dataset.time) {
            btn.innerText = btn.dataset.time;
        }
    });
    
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; 
    const selectedDateObj = new Date(date + "T00:00:00");
    const todayDateObj = new Date(todayStr + "T00:00:00");

    // 헬퍼 함수로 위임하여 이미 물리적으로 지나간 시간 즉시 락다운
    lockPastTimeSlots(date, todayStr, selectedDateObj, todayDateObj, now);

    try {
        const sendChargerId = Number(chargerId);
        const sendStationId = selectedStationId ? selectedStationId : 0;
        const url = `/reservation/reserved-times?chargerId=${sendChargerId}&date=${date}&stationId=${sendStationId}`;
        
        console.log(`🚀 [API] 기 예약 데이터 호출 -> URL: ${url}`);
        const response = await fetch(url);
        
        if (response.ok) {
            const reservedList = await response.json();
            console.log(`📥 [API] 점유 데이터 수신 완료. 총 ${reservedList.length}건의 예약 발견`);
            
            // 수신된 예약 데이터를 순회하며 시간표의 해당 칸들을 차례차례 마감
            reservedList.forEach((r) => {
                const rawStartTime = r.startTime || r.start_time || r.START_TIME;
                const rawEndTime = r.endTime || r.end_time || r.END_TIME;
                
                if (!rawStartTime || !rawEndTime) return; 

                // 헬퍼 함수 호출하여 분 단위 절대좌표 확보
                let startMin = parseTimeStringToMinutes(rawStartTime, date);
                let endMin = parseTimeStringToMinutes(rawEndTime, date);
                
                if (startMin === null || endMin === null) return;

                if (startMin < 1440) startMin = startMin % 1440;
                if (endMin < 1440) {
                    endMin = endMin % 1440;
                    if (endMin <= startMin) endMin += 1440;
                }
                
                const currentSessionUserId = 1; // 추후 로그인 세션 연동 파츠
                const resUserId = r.userId || r.user_id || r.USER_ID;
                const isMyReservation = (Number(resUserId) === Number(currentSessionUserId));

                document.querySelectorAll(".ev-time-btn").forEach(btn => {
                    const tStr = btn.dataset.time; 
                    let btnMin = parseTimeStringToMinutes(tStr, date);
                    if (btnMin === null) return;

                    // 백엔드 예약 시간과 버튼 칸의 좌표 겹침 판별 (충돌 충돌)
                    let isMatch = false;
                    if (endMin === 1440) {
                        isMatch = (Number(btnMin) >= Number(startMin) && Number(btnMin) <= Number(endMin));
                    } else {
                        isMatch = (Number(btnMin) >= Number(startMin) && Number(btnMin) < Number(endMin));
                    }

                    // 겹치는 구역(남의 예약) 발견 시 즉시 비활성화 폭격
                    if (isMatch) {
                        btn.classList.add("disabled"); 
                        
                        if (tStr === "24:00") {
                            btn.classList.add("is-reserved-locked");
                        }
                        
                        if (isMyReservation) {
                            btn.classList.add("my-reservation");
                            btn.innerText = r.carType || "내 예약";
                        } else {
                            btn.innerText = "마감";
                        }
                    }
                });
            });

            // 색칠이 다 끝난 뒤, 살아남은 칸들을 세어 최대 가용 시간 기록
            calculateMaxAvailableInterval();
            
            // 오늘 날짜인데 살아남은 칸이 1칸(30분) 이하라면 상단의 1단계 카드 자체를 다시 회색으로 잠가버림
            if (date === todayStr) {
                if (maxContinuousMinutes <= 30) {
                    applyChargerStatusUI(selectedChargerId, true);
                } else {
                    applyChargerStatusUI(selectedChargerId, false);
                }
            }
            
            syncMidnightSlot(); // 자정 버튼 오버플로우 방지 교정

            // 모든 마스킹이 끝난 후 TARGET 모드라면 타겟 연산을 리로드하여 안전범위 재체크
            if (reservationType === "TARGET") {
                changeTargetPercent(document.getElementById("targetPercent")?.value || 0, false);
            }
        }
    } catch (error) { 
        console.error("❌ [loadReservedTimes] 타임라인 마스킹 제어 중 통신 에러:", error); 
    } finally {
        isFetchingReservedTimes = false; // 락 해제
        console.log("🏁 [loadReservedTimes] 타임라인 데이터 동기화 완료");
    }
}

/**
 * [기능] 자정(24:00) 버튼이 날짜나 예약 상태에 따라 비정상적인 움직임을 보이지 않도록 멱살 잡고 통제하는 방어 함수입니다.
 * [중요도] ★★★☆☆
 */
function syncMidnightSlot() {
    const dateInput = document.getElementById("reservationDate")?.value;
    if (!dateInput) return;

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    const selectedDateObj = new Date(dateInput + "T00:00:00");
    const todayDateObj = new Date(todayStr + "T00:00:00");
    
    const midnightBtn = document.querySelector(".ev-time-btn[data-time='24:00']");
    
    if (midnightBtn) {
        const isReserved = midnightBtn.classList.contains("is-reserved-locked");

        if (selectedDateObj < todayDateObj) {
            midnightBtn.classList.add("disabled", "is-past-hour");
            midnightBtn.innerText = "24:00";
        } 
        else if (dateInput === todayStr) {
            const nowTotalMin = (now.getHours() * 60) + now.getMinutes();
            const midnightTotalMin = 24 * 60; 
            
            if (isReserved) {
                midnightBtn.classList.remove("is-past-hour");
                midnightBtn.classList.add("disabled");
                midnightBtn.innerText = "마감";
            } 
            else if (nowTotalMin >= midnightTotalMin) {
                midnightBtn.classList.remove("is-past-hour");
                midnightBtn.classList.add("disabled");
                midnightBtn.innerText = "마감";
            } 
            else {
                midnightBtn.classList.remove("disabled", "is-past-hour");
                midnightBtn.innerText = "24:00";
            }
        } 
        else {
            if (!isReserved) {
                midnightBtn.classList.remove("disabled", "is-past-hour");
                midnightBtn.innerText = "24:00";
            }
        }
    }
}

/**
 * =========================================================================
 * 🚀 데이터 폼 전송 및 사용자 이탈 방어 로직
 * =========================================================================
 */

/**
 * [기능] '예약 확정' 버튼 클릭 시, 폼 검증과 히든 데이터 조립 후 백엔드로 POST 제출을 진행합니다.
 * [중요도] ★★★★★ (최종 결제처)
 */
function submitReservation() {
    console.log("📥 [Submit Request] 예약 최종 폼 전송 파이프라인 가동");
    
    // 따닥(다중 클릭) 방어를 위한 제출 중복 락 스크리닝
    if (isSubmittingForm) {
        console.warn("⚠️ [Submit Error] 전송이 이미 진행 중입니다. 중복 요청을 파기합니다.");
        return;
    }

    const type = document.getElementById("reservationType").value;
    const date = document.getElementById("reservationDate")?.value;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; 

    // 헬퍼 함수로 폼 결측치, 과거 데이터 무결성 검증 위임
    if (!validateReservationForm(type, date, todayStr, now)) return;

    // TARGET 모드일 경우, 백엔드가 요구하는 데이터 형식을 맞추기 위해 눈에 보이지 않는 Input 태그를 찍어냄
    if (type === "TARGET") {
        const percentVal = parseInt(document.getElementById("targetPercent")?.value) || 0;
        const calculatedKwh = Math.round(userBatteryCapacity * (percentVal / 100.0));
        // 헬퍼 함수로 동적 input 태그 생성 및 DOM 삽입 위임
        appendTargetHiddenInputs(percentVal, calculatedKwh);
    }
    
    // 최종 사용자 컨펌 (취소 시 조용히 함수 종료)
    if (!confirm("예약을 이대로 확정하시겠습니까?")) {
        console.log("🛑 [Submit Cancel] 사용자의 취소 명령으로 예약 전송을 중단합니다.");
        return;
    }

    // 날짜 텍스트("2026-05-01")와 시간 텍스트("14:30")를 결합하여 백엔드 DB 표준 포맷으로 변조
    const finalStartTimeStr = `${date} ${startTime.substring(0, 5)}:00`;
    const finalEndTimeStr = `${date} ${endTime.substring(0, 5)}:00`;

    document.getElementById("startTime").value = finalStartTimeStr;
    document.getElementById("endTime").value = finalEndTimeStr;
    
    // 폼이 무사히 전송될 것이므로 '페이지 이탈 방지' 경고창을 해제
    isBookingInProgress = false; 
    
    // 락을 잠그고 폼 전송 실행!
    isSubmittingForm = true;
    console.log("📨 [Submit Fire] 백엔드로 예약 데이터 폼 객체 전송 실시!");
    document.getElementById("reservationForm").submit();

    // 혹시 모를 네트워크 지연을 대비하여 3초 뒤에 클릭 락을 자동으로 풀어줌
    setTimeout(() => { isSubmittingForm = false; }, 3000);
}

// ==========================================
// 사용자 브라우저 이탈(뒤로가기, 새로고침, 탭 닫기) 방어 모듈
// ==========================================
window.addEventListener('beforeunload', handleUnload);

function handleUnload(e) {
    if (isBookingInProgress) {
        // 예약 진행 중(true)일 때 페이지를 끄려고 하면 브라우저 순정 경고 팝업 발생
        e.preventDefault();
        e.returnValue = ''; 
    }
}

// 직접 만든 내부 네비게이션 버튼(홈으로 등) 클릭 시 동작하는 커스텀 경고
function navigateWithConfirm(url) {
    if (isBookingInProgress) {
        if (confirm("예약 설정 중인 내용이 사라집니다. 정말 나가시겠습니까?")) {
            isBookingInProgress = false; 
            window.location.href = url;
        }
    } else {
        window.location.href = url;
    }
}

// 완료 페이지에서의 처리를 위한 세션 스토리지 조작 (백스페이스 방지)
window.onload = function() {
    if (sessionStorage.getItem('reservationCompleted') === 'true') {
        sessionStorage.removeItem('reservationCompleted');
        window.location.replace('/home'); 
    }
};

function handleReservationComplete() {
    isBookingInProgress = false; 
    window.removeEventListener('beforeunload', handleUnload); 
    sessionStorage.setItem('reservationCompleted', 'true');
    window.history.replaceState(null, '', '/reservation/success');
    window.location.href = '/reservation/success';
}

/**
 * =========================================================================
 * 🌍 지역 데이터 필터 연동, 옵션 생성기 및 Event Listener 바인딩 코어
 * =========================================================================
 */

// 행정구역 종속 관계 백업 데이터 맵 선언 (DB 지연 혹은 폴백 상황 대비용)
const regionDataMap = {
    "서울특별시": ["강남구", "서초구", "송파구", "마포구", "영등포구"],
    "부산광역시": ["해운대구", "부산진구", "동래구", "수영구", "사하구"],
    "경기도": ["수원시", "성남시", "고양시", "용인시", "부천시"]
};

/**
 * [기능] 좌측 충전소 리스트 상단 필터 셀렉트 박스에 변경 이벤트(Change)들을 달아주는 코어 리스너
 * [중요도] ★★★★★ (진입점)
 */
window.addEventListener("DOMContentLoaded", () => {
    console.log("🛠️ [Filter Init] 검색 필터 시스템 초기화 및 이벤트 리스너 이식 시작");

    const sidoSelect = document.getElementById("filterSido");
    const sigunguSelect = document.getElementById("filterSigungu");
    const speedSelect = document.getElementById("filterSpeed");

    // 시/도 변경 -> 하위 행정구역 드롭다운 재생성 -> 충전소 다시 찾기
    if (sidoSelect) {
        sidoSelect.addEventListener("change", (e) => {
            const selectedSido = e.target.value;
            console.log(`📅 [Filter Event] 시/도 변경 감지 -> 선택값: ${selectedSido}`);
            updateSigunguOptions(selectedSido, sigunguSelect);
            fetchFilteredStations();
        });
    }

    // 시/군/구 변경 -> 충전소 다시 찾기
    if (sigunguSelect) {
        sigunguSelect.addEventListener("change", fetchFilteredStations);
    }

    // 충전속도 변경 -> 충전소 다시 찾기
    if (speedSelect) {
        speedSelect.addEventListener("change", fetchFilteredStations);
    }
});

/**
 * [기능] 서울특별시를 고르면 -> 강남구, 마포구를 보여주게 드롭다운을 조작하는 함수입니다.
 * [중요도] ★★★★☆
 */
function updateSigunguOptions(sidoValue, sigunguElement) {
    if (!sigunguElement) return;

    console.log(`⚙️ [UI Engine] 하위 시/군/구 옵션 재가공 프로세스 기동 (부모: ${sidoValue})`);
    sigunguElement.innerHTML = "";
    
    // 시/도를 전체 해제했을 시, 하위 구역도 싹 잠가버림
    if (!sidoValue || sidoValue === "") {
        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.innerText = "시/도를 먼저 선택하세요";
        
        sigunguElement.appendChild(defaultOption);
        sigunguElement.disabled = true;
        sigunguElement.style.backgroundColor = "#f3f4f6";
        return;
    }

    // fallback 맵 기반 데이터 구성 (fetch 후 서버 데이터로 덮어씌워짐)
    const sigunguList = regionDataMap[sidoValue];
    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.innerText = "전체 시/군/구";
    sigunguElement.appendChild(allOption);

    sigunguList.forEach(sigunguName => {
        const optionNode = document.createElement("option");
        optionNode.value = sigunguName;
        optionNode.innerText = sigunguName;
        sigunguElement.appendChild(optionNode);
    });

    sigunguElement.disabled = false;
    sigunguElement.style.backgroundColor = "white";
}

/**
 * [기능] 페이지 접속 시 백엔드 DB에서 현재 등록된 모든 '시/도' 목록을 가져옵니다.
 * [중요도] ★★★★☆
 */
async function initRegionFilters() {
    console.log("🛠️ [API Load] DB로부터 시/도 원장 목록 호출 요청");
    try {
        const response = await fetch('/reservation/regions/sido');
        if (!response.ok) throw new Error(`HTTP 에러: ${response.status}`);
        
        const sidos = await response.json();
        const sidoSelect = document.getElementById("filterSido");

        sidos.forEach(sido => {
            const opt = document.createElement("option");
            opt.value = sido;
            opt.textContent = sido;
            sidoSelect.appendChild(opt);
        });
        console.log(`✅ [API Success] 시/도 목록 탑재 완료 (${sidos.length}건)`);
    } catch (err) {
        console.error("❌ [Init Error] 시/도 데이터 통신 파단:", err);
    }
}

/**
 * [기능] 선택된 시/도에 따라 백엔드에서 실제로 존재하는 시/군/구만 가져와 드롭다운에 꽂아줍니다.
 * [중요도] ★★★★☆
 */
async function loadSigunguBySido(sido) {
    const sigunguSelect = document.getElementById("filterSigungu");
    sigunguSelect.innerHTML = '<option value="">전체 시/군/구</option>';
    
    if (!sido) {
        sigunguSelect.disabled = true;
        return;
    }

    console.log(`🔍 [API Load] 선택된 시/도(${sido})에 해당하는 시/군/구 DB 조회 가동`);
    try {
        const response = await fetch(`/reservation/regions/sigungu?metro=${encodeURIComponent(sido)}`);
        if (!response.ok) throw new Error(`HTTP 에러: ${response.status}`);

        const sigungus = await response.json();

        sigungus.forEach(gu => {
            const opt = document.createElement("option");
            opt.value = gu;
            opt.textContent = gu;
            sigunguSelect.appendChild(opt);
        });

        sigunguSelect.disabled = false;
        console.log(`✨ [API Success] 종속 시/군/구 데이터 갱신 완료: ${sigungus.length}건`);
    } catch (err) {
        console.error("❌ [Data Fetch Error] 시/군/구 데이터 통신 파단:", err);
    }
}

/**
 * =========================================================================
 * 🟢 [Block] 조건별 충전소 검색 및 동적 화면 렌더링 엔진 (ReferenceError 수정본)
 * =========================================================================
 */
async function fetchFilteredStations() {
    // 1. 현재 화면의 필터 엘리먼트들로부터 실시간 선택값 추출
    const sido = document.getElementById("filterSido")?.value || ""; // 선택된 시/도 값
    const sigungu = document.getElementById("filterSigungu")?.value || ""; // 선택된 시/군/구 값
    const speed = document.getElementById("filterSpeed")?.value || "ALL"; // 선택된 충전속도 값
    
    console.log(`📡 [API Request] 필터 검색 가동 -> 시/도: '${sido}', 시/군/구: '${sigungu}', 속도: '${speed}'`);

    // 2. 예외 발생 시 'Uncaught'로 터지지 않도록 전체 로직을 try-catch로 안전하게 감싸기
    try {
        // 백엔드 컨트롤러 주소 맵에 맞춰서 요청 URL 주소 조립
        const url = `/reservation/stations?sido=${encodeURIComponent(sido)}&sigungu=${encodeURIComponent(sigungu)}&speed=${speed}`;
        
        console.log(`🚀 [API Fetch] 서버로 비동기 요청을 전송합니다. URL: ${url}`);
        const response = await fetch(url);
        
        // HTTP 응답 상태가 정상(200)이 아닐 경우 즉시 예외 처리 파이프라인으로 이송
        if (!response.ok) {
            throw new Error(`서버가 에러를 반환했습니다. 상태코드: ${response.status}`);
        }
        
        // 🚨 [핵심 수정] 변수 선언(const)을 확실하게 보장하여 ReferenceError 원천 차단
        const stationList = await response.json(); 
        
        // 디버깅을 위해 콘솔창에 수신된 데이터 배열의 길이와 실제 배열 데이터 정밀 출력
        console.log(`📥 [API Response] 서버 통신 완료! 수신된 충전소 개수: ${stationList.length}건`, stationList);

        // 충전소 카드가 그려질 부모 HTML 컨테이너 탐색
        const container = document.getElementById("stationListContainer");
        if (!container) {
            console.error("❌ [Render Error] 'stationListContainer' 엘리먼트를 화면에서 찾을 수 없습니다.");
            return;
        }

        // 3. 수신된 데이터가 0건일 때의 예외 UI 처리
        if (stationList.length === 0) {
            console.warn("⚠️ [Render Display] 조건에 부합하는 충전소 데이터가 단 1건도 없습니다.");
            container.innerHTML = '<div style="text-align:center; padding:3rem 1rem; color:#9ca3af; font-weight:500;">조건에 맞는 충전소가 없습니다.</div>';
            return;
        }

        // 4. 정상 데이터 존재 시 맵 루프 연산을 가동하여 HTML 코드 동적 생성 및 화면 주입
        container.innerHTML = stationList.map(s => {
            // 콘솔 로그가 너무 많이 찍혀 스크롤이 터지는 것을 막기 위해 가공 로그는 생략하고 최종 조립 진행
            return `
                <div class="station-card" onclick="loadChargers('${s.id}', this)">
                    <div class="station-card-body">
                        <h4 class="station-name" style="font-weight: 700; color: #111827; margin: 0; font-size: 1rem;">${s.name}</h4>
                        <p class="station-address" style="font-size: 0.875rem; color: #6b7280; margin: 0.25rem 0 0 0;">${s.address}</p>
                    </div>
                </div>
            `;
        }).join('');
        
        console.log("✨ [Render Complete] 충전소 목록 585건 화면 드로잉 완료!");
		
		var autoSelectId = /*[[${selectedStationId}]]*/ null;

    } catch (err) {
        // 5. 통신 혹은 자바스크립트 연산 중 터진 모든 에러를 안전하게 포획하여 로깅 처리
        console.error("❌ [Critical Error] fetchFilteredStations 로직 실행 중 런타임 에러 발생:", err);
    }
}

// 4. 기존 이벤트 리스너 연결
document.getElementById("filterSido").addEventListener("change", (e) => {
    loadSigunguBySido(e.target.value);
    fetchFilteredStations(); // 시/도가 바뀌면 즉시 검색
});

document.getElementById("filterSigungu").addEventListener("change", fetchFilteredStations);
document.getElementById("filterSpeed").addEventListener("change", fetchFilteredStations);

// 5. 🟢 페이지 시작 시 자동 실행 (초기화)
window.addEventListener("DOMContentLoaded", async () => {
    console.log("🌟 [System Boot] EV 예약 시스템 부트스트랩 가동!");
    await initRegionFilters(); // 상단 셀렉트 박스 렌더링을 기다림
    fetchFilteredStations();   // 세팅 완료 후 전체 충전소 목록 싹 쓸어오기 강제 킥오프!
});