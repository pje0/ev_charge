// =========================================================================
// 🌐 EV 예약 시스템 클라이언트 코어 스크립트 (v1.0 무결성 디버깅판)
// =========================================================================

if (typeof selectedStationId === 'undefined') { var selectedStationId = null; }
if (typeof selectedChargerId === 'undefined') { var selectedChargerId = null; }
if (typeof reservationType === 'undefined') { var reservationType = "TIME"; }
if (typeof startTime === 'undefined') { var startTime = null; }
if (typeof endTime === 'undefined') { var endTime = null; }
if (typeof maxContinuousMinutes === 'undefined') { var maxContinuousMinutes = 1440; }
if (typeof isFetchingReservedTimes === 'undefined') { var isFetchingReservedTimes = false; }
if (typeof selectedChargerKw === 'undefined') { var selectedChargerKw = 50.0; } 
if (typeof isTargetAlertShowing === 'undefined') { var isTargetAlertShowing = false; }
if (typeof globalAlertLock === 'undefined') { var globalAlertLock = false; }

// ==========================================
// 1. 단계 제어 (Step View Control)
// ==========================================
function moveStep(step) {
    console.log(`🎬 [Step 전환] 목표 단계: ${step}`);
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

    if (step === 1) {
        clearAllReservationStyles();
    }

    document.querySelectorAll(".ev-page").forEach(p => p.classList.add("hidden"));
    document.getElementById("ev-page-" + step)?.classList.remove("hidden");
    
    document.querySelectorAll(".ev-step").forEach((el, idx) => {
        const stepNum = idx + 1;
        const circle = el.querySelector(".ev-step-num");
        const txt = el.querySelector("span");
        
        if (stepNum <= step) {
            circle?.classList.add("bg-blue-600", "text-white");
            circle?.classList.remove("bg-gray-100", "text-gray-400");
            txt?.classList.add("font-medium", "text-gray-900");
            txt?.classList.remove("text-gray-400");
        } else {
            circle?.classList.remove("bg-blue-600", "text-white");
            circle?.classList.add("bg-gray-100", "text-gray-400");
            txt?.classList.remove("font-medium", "text-gray-900");
            txt?.classList.add("text-gray-400");
        }
    });
}

function clearAllReservationStyles() {
    console.log("🧹 [스타일 리셋] 모든 폼 변수 및 슬롯 원상복구 가동");
    startTime = null;
    endTime = null;
    if (document.getElementById("startTime")) document.getElementById("startTime").value = "";
    if (document.getElementById("endTime")) document.getElementById("endTime").value = "";
    if (document.getElementById("summaryTime")) document.getElementById("summaryTime").innerText = "-";
    
    const slider = document.getElementById("targetPercent");
    if (slider) {
        slider.value = 20;
        updateSliderBackground(20);
    }
    const textDisplay = document.getElementById("targetPercentText");
    if (textDisplay) textDisplay.innerText = "20%";

    document.querySelectorAll(".ev-time-btn").forEach(btn => {
        btn.classList.remove("active", "in-range", "disabled");
        btn.style.removeProperty("background-color");
        btn.style.removeProperty("color");
        btn.style.removeProperty("border-color");
        btn.style.removeProperty("pointer-events");
        btn.style.removeProperty("cursor");
    });
}

// ==========================================
// 2. 충전기 목록 로드 (v1.0 경고 차단형)
// ==========================================
async function loadChargers(stationId, element) {
    if (!stationId) return;
    selectedStationId = Number(stationId);
    console.log(`📡 [충전기 로드] stationId: ${stationId}`);
    
    document.querySelectorAll('.border-blue-500').forEach(el => el.classList.remove('border-blue-500', 'bg-blue-50'));
    element.classList.add('border-blue-500', 'bg-blue-50');
    
    clearAllReservationStyles();
    
    try {
        const res = await fetch(`/reservation/api/chargers?stationId=` + stationId);
        const chargers = await res.json();
        const container = document.getElementById("chargerListContainer");
        
        if (chargers.length > 0) {
            container.innerHTML = chargers.map(c => {
                const statusLower = c.status ? c.status.toLowerCase() : 'available';
                let connectorName = c.connectorType;
                if (c.connectorType === 'DC_COMBO') connectorName = 'DC콤보 (7핀)';
                else if (c.connectorType === 'CHAdemo') connectorName = '차데모 (10핀)';
                else if (c.connectorType === 'AC_3PHASE') connectorName = 'AC 3상 (7핀)';
                else if (c.connectorType === 'AC_5PIN') connectorName = '완속 (5핀)';
                else if (c.connectorType === 'RAPID') connectorName = '급속 충전기';
                else if (c.connectorType === 'SLOW') connectorName = '완속 충전기';

                const isRapid = (c.powerKw >= 50 || c.connectorType === 'RAPID' || c.connectorType === 'DC_COMBO' || c.connectorType === 'CHAdemo' || c.connectorType === 'AC_3PHASE');
                const speedLabel = isRapid ? '급속' : '완속';
                const speedClass = isRapid ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700';

                if (statusLower === 'maintenance' || statusLower === 'out_of_service') {
                    return `<div class="border border-gray-200 bg-gray-100 opacity-60 rounded-lg p-3 select-none pointer-events-none">
                                <div class="flex justify-between items-center mb-1">
                                    <h3 class="font-bold text-gray-900 text-sm">${connectorName}</h3>
                                    <span class="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">점검 중</span>
                                </div>
                                <div class="flex items-center gap-1.5 mt-1">
                                    <span class="text-[10px] ${speedClass} px-1.5 py-0.5 rounded font-semibold">${speedLabel}</span>
                                    <p class="text-gray-400 text-xs tracking-tight">${c.powerKw}kW 출력</p>
                                </div>
                            </div>`;
                }

                if (statusLower === 'charging' || statusLower === 'occupied' || statusLower === 'in_use') {
                    return `<div class="border border-amber-200 bg-amber-50/30 rounded-lg p-3 cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition" onclick="selectCharger(this, '${c.id}', '${connectorName}', ${c.powerKw})">
                                <div class="flex justify-between items-center mb-1">
                                    <h3 class="font-bold text-amber-900 text-sm">${connectorName}</h3>
                                    <span class="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">사용 중 (예약 가능)</span>
                                </div>
                                <div class="flex items-center gap-1.5 mt-1">
                                    <span class="text-[10px] ${speedClass} px-1.5 py-0.5 rounded font-semibold">${speedLabel}</span>
                                    <p class="text-amber-700 text-xs tracking-tight">${c.powerKw}kW 출력</p>
                                </div>
                            </div>`;
                }

                return `<div class="border border-gray-200 rounded-lg p-3 cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition bg-white" onclick="selectCharger(this, '${c.id}', '${connectorName}', ${c.powerKw})">
                            <div class="flex justify-between items-center mb-1">
                                <h3 class="font-bold text-gray-900 text-sm">${connectorName}</h3>
                                <span class="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">사용 가능</span>
                            </div>
                            <div class="flex items-center gap-1.5 mt-1">
                                <span class="text-[10px] ${speedClass} px-1.5 py-0.5 rounded font-semibold">${speedLabel}</span>
                                <p class="text-gray-400 text-xs tracking-tight">${c.powerKw}kW 출력</p>
                            </div>
                        </div>`;
            }).join('');
        } else {
            container.innerHTML = '<div class="col-span-2 text-center py-24 text-gray-400 text-xs">등록된 충전기가 없습니다.</div>';
        }
        
        if (selectedChargerId !== null && selectedChargerId !== 0) {
            await loadReservedTimes();
        }
    } catch (error) {
        console.error("충전기 목록 로드 실패:", error);
    }
}

// ==========================================
// 3. 충전기 선택 및 건너뛰기 액션
// ==========================================
function selectCharger(element, chargerId, chargerName, powerKw) {
    document.getElementById("chargerId").value = chargerId;
    selectedChargerId = Number(chargerId);
    selectedChargerKw = Number(powerKw || 50.0);
    document.getElementById("summaryCharger").innerText = chargerName;
    
    console.log(`🔌 [충전기 선택 완료] 번호: ${selectedChargerId}, 출력: ${selectedChargerKw}kW`);
    clearAllReservationStyles();
    moveStep(2);
    loadReservedTimes();
}

function skipCharger() {
    selectedChargerId = null;
    document.getElementById("chargerId").value = "";
    document.getElementById("summaryCharger").innerText = "충전기 미선택";
    moveStep(2);
    setTimeout(loadReservedTimes, 50);
}

// ==========================================
// 4. 예약 설정 옵션 분기 제어 (타입 전환)
// ==========================================
function selectReservationType(type) {
    reservationType = type;
    document.getElementById("reservationType").value = type;
    document.querySelectorAll(".ev-res-type-btn").forEach(btn => btn.classList.remove("active"));

    startTime = null;
    endTime = null;
    document.querySelectorAll(".ev-time-btn").forEach(btn => {
        if (!btn.classList.contains("disabled")) {
            btn.classList.remove("active", "in-range");
            btn.style.removeProperty("background-color");
            btn.style.removeProperty("color");
        }
    });

    if (type === "TIME") {
        document.getElementById("btnTime").classList.add("active");
        document.getElementById("timeBox").classList.remove("hidden");
        document.getElementById("targetBox").classList.add("hidden");
        loadReservedTimes();
    } else {
        document.getElementById("btnTarget").classList.add("active");
        document.getElementById("timeBox").classList.remove("hidden");
        document.getElementById("targetBox").classList.remove("hidden");
        loadReservedTimes();
    }
}

// ==========================================
// 5. 슬라이더 배경 색상 처리 함수
// ==========================================
function updateSliderBackground(value) {
    const slider = document.getElementById("targetPercent");
    if (!slider) return;
    const percentage = ((value - slider.min) / (slider.max - slider.min)) * 100;
    slider.style.background = `linear-gradient(to right, #2563eb 0%, #2563eb ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`;
}

function calculateRequiredMinutes(targetVal) {
    const chargerKw = selectedChargerKw; 
    const batteryCapacity = 70.0; 
    const currentPercent = 0.0; 

    if (targetVal <= currentPercent) return 0;

    const requiredKwh = batteryCapacity * ((targetVal - currentPercent) / 100.0);
    let durationHours = requiredKwh / chargerKw;
    let requiredMinutes = Math.ceil(durationHours * 60) + 15; 

    if (chargerKw > 20 && targetVal > 80) { 
        requiredMinutes += Math.ceil(((batteryCapacity * (targetVal - 80) / 100.0) / chargerKw) * 0.5 * 60);
    }
    return requiredMinutes;
}

function changeTargetPercent(value, isQuick = false) {
    let targetVal = Number(value);
    const currentPercent = 0.0;
    const availableMin = (typeof maxContinuousMinutes !== 'undefined') ? maxContinuousMinutes : 120;

    if (targetVal <= currentPercent) {
        const slider = document.getElementById("targetPercent");
        if (slider) {
            slider.value = currentPercent;
            updateSliderBackground(currentPercent);
            document.getElementById("targetPercentText").innerText = currentPercent + "%";
        }
        return;
    }

    let requiredMinutes = calculateRequiredMinutes(targetVal);

    if (requiredMinutes > availableMin || availableMin <= 0) {
        if (!globalAlertLock) {
            globalAlertLock = true;
            alert(`죄송합니다. 현재 남은 예약 가능 시간(${availableMin}분)이 부족하여 목표 충전량을 더 늘릴 수 없습니다.`);
            setTimeout(() => { globalAlertLock = false; }, 800);
        }

        const chargerKw = selectedChargerKw;
        const batteryCapacity = 70.0;
        const maxKwh = Math.max(0, (availableMin - 15) * chargerKw / 60);
        const maxAllowedIncrease = (maxKwh / batteryCapacity) * 100;
        let maxPossiblePercent = Math.floor(currentPercent + maxAllowedIncrease);
        maxPossiblePercent = Math.max(0, Math.min(100, maxPossiblePercent));

        // 🟢 [5% 단위 강제 보정] 
        // 87%, 97% 처럼 step(5) 단위를 무시하는 예외 값이 들어오면 핀과 배경이 어긋납니다.
        // 계산된 최댓값을 가용 범위 안쪽의 5의 배수로 딱 떨어지게 마스킹합니다.
        // 예: 97% -> 95% 고정 / 87% -> 85% 고정
        const step = 5;
        targetVal = Math.floor(maxPossiblePercent / step) * step;
    }

    const slider = document.getElementById("targetPercent");
    if (slider) { slider.value = targetVal; }
    document.getElementById("targetPercentText").innerText = targetVal + "%";
    if (document.getElementById("summaryTarget")) {
        document.getElementById("summaryTarget").innerText = targetVal + "%";
    }
    updateSliderBackground(targetVal);

    syncTimeButtonsByTarget();
}

function quickTarget(value) {
    const slider = document.getElementById("targetPercent");
    if (slider) {
        slider.value = value;
        changeTargetPercent(value, true); 
    }
}

// =========================================================================
// 7. 타임 슬롯 클릭 제어
// =========================================================================
function selectTime(element, time) {
    if (element.classList.contains("disabled") || element.style.pointerEvents === "none") {
        return; 
    }

    if (reservationType === "TIME") {
        if (startTime !== null && endTime !== null) {
            startTime = null;
            endTime = null;
            document.querySelectorAll(".ev-time-btn").forEach(btn => {
                if (!btn.classList.contains("disabled")) {
                    btn.classList.remove("active", "in-range");
                    btn.style.removeProperty("background-color");
                    btn.style.removeProperty("color");
                }
            });
        }
        
        if (startTime === null) {
            startTime = time;
            element.classList.add("active");
            document.getElementById("summaryTime").innerText = "시작 시간: " + startTime;
            
            const date = document.getElementById("reservationDate").value;
            document.getElementById("startTime").value = date + " " + startTime + ":00";
            document.getElementById("endTime").value = ""; 
            return;
        }
        
        if (startTime === time) {
            startTime = null;
            element.classList.remove("active");
            document.getElementById("summaryTime").innerText = "-";
            document.getElementById("startTime").value = "";
            return;
        }
        
        let tempStart = startTime;
        let tempEnd = time;
        if (time < startTime) { tempEnd = startTime; tempStart = time; }

        let hasDisabledSlot = false;
        document.querySelectorAll(".ev-time-btn").forEach(btn => {
            const t = btn.dataset.time;
            if (t >= tempStart && t <= tempEnd && (btn.classList.contains("disabled") || btn.style.pointerEvents === "none")) { 
                hasDisabledSlot = true; 
            }
        });
        
        if (hasDisabledSlot) { 
            alert("선택하신 구간 사이에 이미 예약된 시간이 포함되어 있습니다."); 
            return; 
        }

        startTime = tempStart;
        endTime = tempEnd;
        document.querySelectorAll(".ev-time-btn").forEach(btn => {
            const t = btn.dataset.time;
            if (!btn.classList.contains("disabled") && btn.style.pointerEvents !== "none") {
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

    startTime = time; 
    syncTimeButtonsByTarget();
}

// =========================================================================
// 7-1. 목표 충전량 기준 자동 슬롯 선택 및 보호막 결속
// =========================================================================
async function syncTimeButtonsByTarget() {
    const resType = document.getElementById("reservationType").value;
    if (resType !== 'TARGET') return;

    const targetPercentText = document.getElementById("targetPercentText").innerText;
    const targetValue = parseInt(targetPercentText) || 0;

    const requiredMinutes = calculateRequiredMinutes(targetValue);
    const requiredSlots = Math.ceil(requiredMinutes / 30);

    const allButtons = Array.from(document.querySelectorAll(".ev-time-btn")).sort((a, b) => {
        return a.dataset.time.localeCompare(b.dataset.time);
    });
    
    // 🟢 [보정 락] 영구 회색 비활성화(disabled) 상태인 요소는 리셋 스타일 가드 대상에서 완전 제외
    allButtons.forEach(btn => {
        if (btn.classList.contains("disabled") || btn.style.pointerEvents === "none") {
            return; 
        }
        btn.classList.remove("bg-blue-600", "text-white", "border-blue-600", "active", "in-range", "bg-blue-50", "text-blue-600");
        btn.style.removeProperty("background-color");
        btn.style.removeProperty("color");
        btn.style.removeProperty("border-color");
    });

    if (requiredSlots <= 0) return;

    let validStartTime = startTime;
    if (!validStartTime || !allButtons.some(btn => btn.dataset.time === validStartTime && !btn.classList.contains("disabled"))) {
        const firstAvailableBtn = allButtons.find(btn => 
            !btn.classList.contains("disabled") && btn.style.pointerEvents !== "none"
        );
        validStartTime = firstAvailableBtn ? firstAvailableBtn.dataset.time : null;
    }

    let targetStartIndex = -1;
    if (validStartTime) {
        targetStartIndex = allButtons.findIndex(btn => btn.dataset.time === validStartTime);
    }

    let isSequenceValid = true;
    if (targetStartIndex !== -1 && (targetStartIndex + requiredSlots <= allButtons.length)) {
        for (let j = 0; j < requiredSlots; j++) {
            const checkBtn = allButtons[targetStartIndex + j];
            if (checkBtn.classList.contains("disabled") || checkBtn.style.pointerEvents === "none") {
                isSequenceValid = false;
                break;
            }
        }
    } else {
        isSequenceValid = false;
    }

    if (!isSequenceValid) {
        targetStartIndex = -1;
        for (let i = 0; i < allButtons.length; i++) {
            let isValid = true;
            if (i + requiredSlots <= allButtons.length) {
                for (let j = 0; j < requiredSlots; j++) {
                    const checkBtn = allButtons[i + j];
                    if (checkBtn.classList.contains("disabled") || checkBtn.style.pointerEvents === "none") {
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

    if (targetStartIndex === -1 || (targetStartIndex + requiredSlots > allButtons.length)) {
        document.getElementById("startTime").value = "";
        document.getElementById("endTime").value = "";
        document.getElementById("summaryTime").innerText = "예약 가능 공간 부족";
        return;
    }

    let firstSelectedTime = null;
    let lastSelectedTime = null;

    for (let k = 0; k < requiredSlots; k++) {
        const btn = allButtons[targetStartIndex + k];
        if (btn.classList.contains("disabled")) continue;
        
        if (k === 0 || k === requiredSlots - 1) {
            btn.classList.add("active");
            btn.style.setProperty("background-color", "#2563eb", "important"); 
            btn.style.setProperty("color", "#ffffff", "important");
        } else {
            btn.classList.add("in-range");
            btn.style.setProperty("background-color", "#dbeafe", "important"); 
            btn.style.setProperty("color", "#1d4ed8", "important");
        }

        const btnTime = btn.getAttribute("data-time");
        if (!firstSelectedTime) firstSelectedTime = btnTime;
        lastSelectedTime = btnTime;
    }

    startTime = firstSelectedTime;
    
    const [hh, mm] = lastSelectedTime.split(":").map(Number);
    let endH = hh;
    let endM = mm + 30;
    if (endM >= 60) { endH += 1; endM -= 60; }
    const endTimeStr = String(endH).padStart(2, '0') + ":" + String(endM).padStart(2, '0');
    
    endTime = endTimeStr;
    
    const date = document.getElementById("reservationDate").value;
    document.getElementById("startTime").value = date + " " + startTime + ":00";
    document.getElementById("endTime").value = date + " " + endTime + ":00";
    document.getElementById("summaryTime").innerText = `${startTime} ~ ${endTime} (${requiredMinutes}분 소요)`;
}

// =====================================================
// 8. 빈 슬롯 연속 가용 공간 측정 연산
// =====================================================
function calculateMaxAvailableInterval() {
    const allButtons = Array.from(document.querySelectorAll(".ev-time-btn")).sort((a, b) => {
        return a.dataset.time.localeCompare(b.dataset.time);
    });

    let maxInterval = 0;
    let currentInterval = 0;

    allButtons.forEach(btn => {
        // 🟢 회색 장벽 고유 마커 발견 시 구간 카운트 단절 후 이탈 보호
        if (btn.classList.contains("disabled") || btn.style.pointerEvents === "none") {
            currentInterval = 0;
            return; 
        }

        currentInterval += 30;
        if (currentInterval > maxInterval) {
            maxInterval = currentInterval;
        }
    });

    maxContinuousMinutes = maxInterval;
    console.log("@# [실시간 연산 확인] 현재 기준 최대 연속 가용 시간:", maxContinuousMinutes + "분");
}

// =====================================================
// 9. 실시간 예약/과거 시간대 비활성화 (v1.0 하이브리드 세이프 가드)
// =====================================================
async function loadReservedTimes() {
    if (isFetchingReservedTimes) return;
    
    const chargerId = document.getElementById("chargerId")?.value || selectedChargerId; 
    const date = document.getElementById("reservationDate")?.value;
    
    if (!chargerId || Number(chargerId) === 0 || !date) {
        console.warn("⚠️ [조회 중단] chargerId 또는 날짜가 유효하지 않습니다. id:", chargerId);
        return;
    }

    isFetchingReservedTimes = true;

    // 1. 초기 청소
    document.querySelectorAll(".ev-time-btn").forEach(btn => {
        btn.classList.remove("disabled", "active", "in-range");
        btn.style.removeProperty("background-color");
        btn.style.removeProperty("color");
        btn.style.removeProperty("pointer-events");
        btn.style.removeProperty("cursor");
        btn.style.removeProperty("border-color");
    });
    
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; 

    if (date === todayStr) {
        const currentHours = now.getHours();
        const currentMinutes = now.getMinutes();

        document.querySelectorAll(".ev-time-btn").forEach(btn => {
            const t = btn.dataset.time; 
            const [h, m] = t.split(":").map(Number);

            if (h < currentHours || (h === currentHours && m <= currentMinutes)) {
                btn.classList.add("disabled"); 
                btn.style.setProperty("background-color", "#e5e7eb", "important");
                btn.style.setProperty("color", "#9ca3af", "important");
                btn.style.setProperty("pointer-events", "none", "important");
                btn.style.setProperty("cursor", "not-allowed", "important");
            }
        });
    }

    try {
        const sendChargerId = Number(chargerId);
        let targetParam = "";
        if (reservationType === "TARGET") {
            const currentPercent = document.getElementById("targetPercent")?.value || 0;
            targetParam = `&targetPercent=${currentPercent}`;
        }

        const sendStationId = selectedStationId ? selectedStationId : 0;
        const url = `/reservation/reserved-times?chargerId=${sendChargerId}&date=${date}&stationId=${sendStationId}${targetParam}`;
        
        console.log("📡 [서버 요청 API URL] : " + url);
        const response = await fetch(url);
        
        if (response.ok) {
            const reservedList = await response.json();
            console.log("📦 [서버가 리턴한 실시간 예약 데이터] : ", reservedList);
            
			// =====================================================
            // 🟢 [v1.1] 타임존 강제 동기화형 정밀 시/분 파서
            // =====================================================
            const parseToMinutes = (timeInput) => {
                if (timeInput === null || timeInput === undefined) return null;
                
                // 케이스 1: ISO 8601 문자열 포맷인 경우 ("2026-05-27T06:00:00.000+00:00" 등)
                if (typeof timeInput === 'string' && (timeInput.includes('T') || timeInput.includes('Z'))) {
                    const d = new Date(timeInput); // 브라우저가 자동으로 로컬 타임존(KST)으로 변환함
                    return (d.getHours() * 60) + d.getMinutes();
                }
                
                // 케이스 2: 순수 숫자형 밀리초 타임스탬프인 경우
                if (typeof timeInput === 'number' || !isNaN(timeInput)) {
                    const d = new Date(Number(timeInput));
                    return (d.getHours() * 60) + d.getMinutes();
                }
                
                // 케이스 3: 자바 LocalDateTime 배열 형태로 넘어온 경우
                if (Array.isArray(timeInput) && timeInput.length >= 5) {
                    return (parseInt(timeInput[3], 10) * 60) + parseInt(timeInput[4], 10);
                }
                
                // 케이스 4: 일반 DB 공백 분리형 문자열 포맷인 경우 ("2026-05-27 18:30:00")
                if (typeof timeInput === 'string') {
                    let pureTime = timeInput.includes(' ') ? timeInput.split(' ')[1] : timeInput;
                    const match = pureTime.match(/^(\d{2}):(\d{2})/);
                    if (!match) return null;
                    return (parseInt(match[1], 10) * 60) + parseInt(match[2], 10);
                }
                return null;
            };

            reservedList.forEach((r, index) => {
                // 🟢 객체 내부 맵핑 명칭의 스네이크 케이스와 카멜 케이스의 이중 교차 검증 유연화 격벽 보정
                const rawStartTime = r.startTime || r.start_time || r.START_TIME;
                const rawEndTime = r.endTime || r.end_time || r.END_TIME;

                console.log(`🔍 [개체 내부 타겟 추적 (${index})] startTime:`, rawStartTime, ` / endTime:`, rawEndTime);

                if (!rawStartTime || !rawEndTime) return; 

                let startMin = parseToMinutes(rawStartTime);
                let endMin = parseToMinutes(rawEndTime);

                if (startMin === null || endMin === null) return; 

                startMin = startMin % 1440;
                endMin = endMin % 1440;
                if (endMin <= startMin) endMin += 1440;

                console.log(`📌 [v1.0 회색 장벽 빌드 타겟 범위 분 연산] : ${startMin}분 ~ ${endMin}분`);
                
                document.querySelectorAll(".ev-time-btn").forEach(btn => {
                    const tStr = btn.dataset.time; 
                    const btnMin = parseToMinutes(tStr);
                    
                    if (btnMin === null) return;

                    // 범위 내부 매핑 적중 시 인라인 물리 속성을 도포하여 화면 잠금 처리
                    if (Number(btnMin) >= Number(startMin) && Number(btnMin) < Number(endMin)) {
                        btn.classList.add("disabled"); 
                        btn.style.setProperty("background-color", "#e5e7eb", "important"); 
                        btn.style.setProperty("color", "#9ca3af", "important");           
                        btn.style.setProperty("pointer-events", "none", "important");      
                        btn.style.setProperty("cursor", "not-allowed", "important");
                    }
                });
            });

            calculateMaxAvailableInterval();

            if (reservationType === "TARGET") {
                const currentSliderVal = document.getElementById("targetPercent")?.value || 0;
                changeTargetPercent(currentSliderVal, false);
            }
        }
    } catch (error) { 
        console.error("예약 시간 조회 실패:", error); 
    } finally {
        isFetchingReservedTimes = false;
    }
}

// ==========================================
// 10. 예약 최종 제출 및 컨트롤러 포맷 조율
// ==========================================
function submitReservation() {
    const type = document.getElementById("reservationType").value;
    const date = document.getElementById("reservationDate")?.value;
    
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; 

    if (type === "TIME") {
        if (startTime == null || endTime == null) {
            alert("예약 시간을 선택하세요.");
            return;
        }
    } else if (type === "TARGET") {
        if (!startTime || !endTime) {
            alert("예약 가능한 시간대가 존재하지 않아 예약을 진행할 수 없습니다.");
            return;
        }
        
        const percentVal = parseInt(document.getElementById("targetPercent")?.value) || 0;
        const calculatedKwh = Math.round(70.0 * (percentVal / 100.0));
        
        let targetHidden = document.getElementById("targetKwhHidden");
        if (!targetHidden) {
            targetHidden = document.createElement("input");
            targetHidden.type = "hidden";
            targetHidden.name = "targetKwh"; 
            targetHidden.id = "targetKwhHidden";
            document.getElementById("reservationForm").appendChild(targetHidden);
        }
        targetHidden.value = calculatedKwh;

        let minutesHidden = document.getElementById("maxMinutesHidden");
        if (!minutesHidden) {
            minutesHidden = document.createElement("input");
            minutesHidden.type = "hidden";
            minutesHidden.name = "maxMinutes"; 
            minutesHidden.id = "maxMinutesHidden";
            document.getElementById("reservationForm").appendChild(minutesHidden);
        }
        minutesHidden.value = calculateRequiredMinutes(percentVal);
    }
    
    if (!date) {
        alert("예약 날짜를 선택해 주세요.");
        return;
    }

    if (date === todayStr && startTime) {
        const [startH, startM] = startTime.split(":").map(Number);
        if (startH < now.getHours() || (startH === now.getHours() && startM < now.getMinutes())) {
            alert("현재 시간보다 이전의 시간대는 예약할 수 없습니다. 다른 시간대를 골라주세요.");
            return;
        }
    }

    const finalStartTimeStr = `${date} ${startTime.substring(0, 5)}:00`;
    const finalEndTimeStr = `${date} ${endTime.substring(0, 5)}:00`;

    document.getElementById("startTime").value = finalStartTimeStr;
    document.getElementById("endTime").value = finalEndTimeStr;

    document.getElementById("reservationForm").submit();
}

// ==========================================
// 11. DOM 렌더링 직후 초기화 리스너
// ==========================================
window.addEventListener("DOMContentLoaded", () => {
    document.getElementById("reservationDate")?.addEventListener("change", loadReservedTimes);
    
    const slider = document.getElementById("targetPercent");
    if (slider) {
        slider.value = 20; 
        updateSliderBackground(slider.value);
        slider.addEventListener("input", (e) => {
            changeTargetPercent(e.target.value, false);
        });
    }
    
    const textDisplay = document.getElementById("chargeValueText") || document.getElementById("targetPercentText");
    if (textDisplay) {
        textDisplay.innerText = "20%";
    }
});