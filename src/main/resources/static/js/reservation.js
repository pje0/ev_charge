// =========================================================================
// 🌐 EV 예약 시스템 클라이언트 코어 스크립트 (v3.5 시연 전용 복구본)
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

let lastSafeTargetPercent = 0;
let isBookingInProgress = false; 

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
    lastSafeTargetPercent = 0; 
    if (document.getElementById("startTime")) document.getElementById("startTime").value = "";
    if (document.getElementById("endTime")) document.getElementById("endTime").value = "";
    if (document.getElementById("summaryTime")) document.getElementById("summaryTime").innerText = "-";
    
    const slider = document.getElementById("targetPercent");
    if (slider) {
        slider.value = 0; 
        updateSliderBackground(0);
    }
    const textDisplay = document.getElementById("targetPercentText");
    if (textDisplay) textDisplay.innerText = "0%"; 

    document.querySelectorAll(".ev-time-btn").forEach(btn => {
        btn.classList.remove("active", "in-range", "disabled", "is-past-hour");
        btn.style.removeProperty("background-color");
        btn.style.removeProperty("color");
        btn.style.removeProperty("border-color");
        btn.style.removeProperty("pointer-events");
        btn.style.removeProperty("cursor");
    });
}

// =========================================================================
// 2. 충전기 목록 로드 및 상태별 분기
// =========================================================================
async function loadChargers(stationId, element) {
    if (!stationId) return;
    selectedStationId = Number(stationId);
    
    document.querySelectorAll('.p-3').forEach(el => el.classList.remove('border-blue-500', 'bg-blue-50/50'));
    element.classList.add('border-blue-500', 'bg-blue-50/50');
    
    clearAllReservationStyles();
    
    const rightNow = new Date();
    const todayStr = `${rightNow.getFullYear()}-${String(rightNow.getMonth() + 1).padStart(2, '0')}-${String(rightNow.getDate()).padStart(2, '0')}`;
    const selectedDateStr = document.getElementById("reservationDate")?.value || todayStr;
    
    try {
        const res = await fetch(`/reservation/api/chargers?stationId=${stationId}&date=${selectedDateStr}`);
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

                let pastSlotCount = 0;
                if (selectedDateStr === todayStr) {
                    const currentTotalMin = (rightNow.getHours() * 60) + rightNow.getMinutes();
                    const startRangeMin = 9 * 60; 
                    if (currentTotalMin > startRangeMin) pastSlotCount = Math.floor((currentTotalMin - startRangeMin) / 30);
                }

                const totalDisplaySlots = 30; 
                const dbReservedSlots = Number(c.reservedSlotCount || 0);
                const netAvailableSlots = (selectedDateStr === todayStr) ? (totalDisplaySlots - pastSlotCount - dbReservedSlots) : (totalDisplaySlots - dbReservedSlots);
                
                const isNotBookable = (selectedDateStr === todayStr && netAvailableSlots <= 0) || statusLower === 'maintenance' || statusLower === 'out_of_service';
                const isOccupied = (statusLower === 'charging' || statusLower === 'occupied' || statusLower === 'in_use');

                return `
                    <div class="border ${isNotBookable ? 'border-slate-300 bg-slate-50' : (isOccupied ? 'border-amber-200 bg-amber-50/30' : 'border-gray-200 bg-white')} rounded-lg p-3 cursor-pointer hover:border-blue-500 transition" 
                         onclick="selectCharger(this, '${c.id}', '${connectorName}', ${c.powerKw})">
                        <div class="flex justify-between items-center mb-1">
                            <h3 class="font-bold ${isNotBookable ? 'text-slate-700' : (isOccupied ? 'text-amber-900' : 'text-gray-900')} text-sm">${connectorName}</h3>
                            <span class="text-[10px] ${isNotBookable ? 'bg-slate-500 text-white' : (isOccupied ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700')} px-1.5 py-0.5 rounded font-medium">
                                ${isNotBookable ? '금일 예약 불가' : (isOccupied ? '사용 중 (예약 가능)' : '사용 가능')}
                            </span>
                        </div>
                        <div class="flex items-center gap-1.5 mt-1">
                            <span class="text-[10px] ${speedClass} px-1.5 py-0.5 rounded font-semibold">${speedLabel}</span>
                            <p class="${isNotBookable ? 'text-slate-600' : (isOccupied ? 'text-amber-700' : 'text-gray-400')} text-xs">${c.powerKw}kW 출력</p>
                        </div>
                    </div>`;
            }).join('');
        } else {
            container.innerHTML = '<div class="col-span-2 text-center py-24 text-gray-400 text-xs">등록된 충전기가 없습니다.</div>';
        }
        
        if (selectedChargerId !== null && selectedChargerId !== 0) await loadReservedTimes();
    } catch (error) {
        console.error("충전기 목록 로드 실패:", error);
    }
}

// ==========================================
// 3. 충전기 선택 액션 (🟢 중복 함수 통합 관리 및 트리거)
// ==========================================
function selectCharger(element, chargerId, chargerName, powerKw) {
    isBookingInProgress = true; 
    document.getElementById("chargerId").value = chargerId;
    selectedChargerId = Number(chargerId);
    selectedChargerKw = Number(powerKw || 50.0);
    document.getElementById("summaryCharger").innerText = chargerName;
    
    console.log(`🔌 [충전기 선택 완료] 번호: ${selectedChargerId}, 출력: ${selectedChargerKw}kW`);
    clearAllReservationStyles();
    moveStep(2);
    loadReservedTimes();
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

    const val = Number(value);
    const min = Number(slider.min) || 0;
    const max = Number(slider.max) || 100;
    
    const percentage = ((val - min) / (max - min)) * 100;
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

// ==========================================
// 6. 목표 충전량 실시간 변동 연산
// ==========================================
function isTodaySelected() {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const selectedDate = document.getElementById("reservationDate")?.value || "";
    return selectedDate === todayStr;
}

function getActualMaxAvailableMinutes() {
    return maxContinuousMinutes; 
}

function changeTargetPercent(value, isUserAction = true) {
    let targetVal = Number(value);
    const slider = document.getElementById("targetPercent");
    const currentPercent = 0.0;

    if (isUserAction && isTodaySelected() && getActualMaxAvailableMinutes() < 30) {
        alert("오늘 예약 가능한 시간대가 부족하여 설정을 변경할 수 없습니다.");
        if (slider) {
            slider.value = lastSafeTargetPercent;
            updateSliderBackground(lastSafeTargetPercent);
            document.getElementById("targetPercentText").innerText = lastSafeTargetPercent + "%";
        }
        return; 
    }

    if (targetVal <= currentPercent) {
        if (slider) {
            slider.value = currentPercent;
            updateSliderBackground(currentPercent);
            document.getElementById("targetPercentText").innerText = currentPercent + "%";
            if (document.getElementById("summaryTarget")) document.getElementById("summaryTarget").innerText = currentPercent + "%";
        }
        lastSafeTargetPercent = currentPercent;
        syncTimeButtonsByTarget();
        return;
    }

    document.getElementById("targetPercentText").innerText = targetVal + "%";
    if (document.getElementById("summaryTarget")) {
        document.getElementById("summaryTarget").innerText = targetVal + "%";
    }

    const isSequenceValid = syncTimeButtonsByTarget();
    
    if (!isSequenceValid) {
        if (startTime) {
            if (slider) {
                slider.value = lastSafeTargetPercent;
                updateSliderBackground(lastSafeTargetPercent);
                document.getElementById("targetPercentText").innerText = lastSafeTargetPercent + "%";
                if (document.getElementById("summaryTarget")) {
                    document.getElementById("summaryTarget").innerText = lastSafeTargetPercent + "%";
                }
                slider.blur(); 
            }
            syncTimeButtonsByTarget();
            return;
        }
    }

    if (slider) { slider.value = targetVal; }
    updateSliderBackground(targetVal);
    lastSafeTargetPercent = targetVal; 
}

function quickTarget(value) {
    const slider = document.getElementById("targetPercent");
    if (slider) {
        slider.value = value;
        changeTargetPercent(value, true); 
    }
}

// ==========================================
// 7. 타임 슬롯 클릭 제어
// ==========================================
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

    document.querySelectorAll(".ev-time-btn").forEach(btn => {
        if (!btn.classList.contains("disabled") && btn.style.pointerEvents !== "none") {
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

function syncTimeButtonsByTarget() {
    const resType = document.getElementById("reservationType").value;
    if (resType !== 'TARGET') return true;

    const targetPercentText = document.getElementById("targetPercentText").innerText;
    const targetValue = parseInt(targetPercentText) || 0;

    const requiredMinutes = calculateRequiredMinutes(targetValue);
    const requiredSlots = Math.ceil(requiredMinutes / 30);

    const allButtons = Array.from(document.querySelectorAll(".ev-time-btn")).sort((a, b) => {
        return a.dataset.time.localeCompare(b.dataset.time);
    });
    
    const cleanStyles = () => {
        allButtons.forEach(btn => {
            if (btn.classList.contains("disabled") || btn.style.pointerEvents === "none") return; 
            btn.classList.remove("active", "in-range");
        });
    };

    if (requiredSlots <= 0) {
        cleanStyles();
        return true;
    }

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
        if (document.querySelector(".ev-time-btn.active") || startTime) {
            startTime = null; 
            endTime = null;
            document.getElementById("startTime").value = "";
            document.getElementById("endTime").value = "";
            document.getElementById("summaryTime").innerText = "예약 가능 공간 부족";
            cleanStyles();

            if (!globalAlertLock) {
                globalAlertLock = true;
                setTimeout(() => {
                    alert("죄송합니다. 선택하신 시간대 이후로 연속된 예약 가능 공간이 부족합니다.\n목표 충전량을 낮추거나 다른 시작 시간을 선택해 주세요.");
                    globalAlertLock = false;
                }, 50); 
            }
            return false; 
        }

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
        startTime = null;
        endTime = null;
        document.getElementById("startTime").value = "";
        document.getElementById("endTime").value = "";
        document.getElementById("summaryTime").innerText = "예약 가능 공간 부족";
        cleanStyles();
        return false;
    }

    cleanStyles();

    let firstSelectedTime = null;
    let lastSelectedTime = null;

    for (let k = 0; k < requiredSlots; k++) {
        const btn = allButtons[targetStartIndex + k];
        if (btn.classList.contains("disabled")) continue;
        
        if (k === 0 || k === requiredSlots - 1) {
            btn.classList.add("active");
        } else {
            btn.classList.add("in-range");
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
    
    return true;
}

function calculateMaxAvailableInterval() {
    const allButtons = Array.from(document.querySelectorAll(".ev-time-btn")).sort((a, b) => {
        return a.dataset.time.localeCompare(b.dataset.time);
    });

    let maxInterval = 0;
    let currentInterval = 0;

    allButtons.forEach(btn => {
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

// =========================================================================
// 9. 실시간 예약/과거 시간대 비활성화 및 동기화 (마감격벽 완전체)
// =========================================================================
async function loadReservedTimes() {
    if (isFetchingReservedTimes) return;
    
    const chargerId = document.getElementById("chargerId")?.value || selectedChargerId; 
    const date = document.getElementById("reservationDate")?.value;
    
    if (!chargerId || Number(chargerId) === 0 || !date) {
        console.warn("⚠️ [조회 중단] chargerId 또는 날짜가 유효하지 않습니다. id:", chargerId);
        return;
    }

    isFetchingReservedTimes = true;

    document.querySelectorAll(".ev-time-btn").forEach(btn => {
        btn.classList.remove("disabled", "active", "in-range", "is-past-hour");
        btn.style.removeProperty("background-color");
        btn.style.removeProperty("color");
        btn.style.removeProperty("pointer-events");
        btn.style.removeProperty("cursor");
        btn.style.removeProperty("border-color");
        btn.style.removeProperty("font-weight");
        
        if(btn.dataset.time) {
            btn.innerText = btn.dataset.time;
        }
    });
    
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; 
    const selectedDateObj = new Date(date + "T00:00:00");
    const todayDateObj = new Date(todayStr + "T00:00:00");

    document.querySelectorAll(".ev-time-btn").forEach(btn => {
        const t = btn.dataset.time;
        const [h, m] = t.split(":").map(Number);
        
        let isPast = false;
        if (selectedDateObj < todayDateObj) {
            isPast = true;
        } else if (date === todayStr) {
            if (h < now.getHours() || (h === now.getHours() && m <= now.getMinutes())) {
                isPast = true;
            }
        }

        if (isPast) {
            btn.classList.add("disabled", "is-past-hour");
            btn.style.setProperty("background-color", "#374151", "important");
            btn.style.setProperty("color", "#9ca3af", "important");
            btn.style.setProperty("border-color", "#4b5563", "important");
            btn.style.setProperty("pointer-events", "none", "important");
            btn.style.setProperty("cursor", "not-allowed", "important");
            return;
        }
    });

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
            
            const parseToMinutes = (timeInput) => {
                if (!timeInput) return null;
                if (typeof timeInput === 'string' && (timeInput.includes('T') || timeInput.includes('Z'))) {
                    const d = new Date(timeInput);
                    let minutes = (d.getHours() * 60) + d.getMinutes();
                    return minutes === 0 && d.getDate() !== new Date(date).getDate() ? 1440 : minutes;
                }
                if (typeof timeInput === 'string') {
                    let pureTime = timeInput.includes(' ') ? timeInput.split(' ')[1] : timeInput;
                    const match = pureTime.match(/^(\d{2}):(\d{2})/);
                    if (!match) return null;
                    let hh = parseInt(match[1], 10);
                    let mm = parseInt(match[2], 10);
                    if (hh === 24 && mm === 0) return 1440;
                    return (hh * 60) + mm;
                }
                return null;
            };

            reservedList.forEach((r) => {
                const rawStartTime = r.startTime || r.start_time || r.START_TIME;
                const rawEndTime = r.endTime || r.end_time || r.END_TIME;
                
                if (!rawStartTime || !rawEndTime) {
                    console.warn("⚠️ 유효하지 않은 예약 타임 데이터 감지로 스킵:", r);
                    return; 
                }

                let startMin = parseToMinutes(rawStartTime);
                let endMin = parseToMinutes(rawEndTime);
                
                if (startMin === null || endMin === null) return;

                if (startMin < 1440) startMin = startMin % 1440;
                if (endMin < 1440) {
                    endMin = endMin % 1440;
                    if (endMin <= startMin) endMin += 1440;
                }

                if (endMin === 1410) {
                    endMin = 1440;
                }

                const currentSessionUserId = 1; 
                const resUserId = r.userId || r.user_id || r.USER_ID;
                const isMyReservation = (Number(resUserId) === Number(currentSessionUserId));

                document.querySelectorAll(".ev-time-btn").forEach(btn => {
                    const tStr = btn.dataset.time; 
                    let btnMin = parseToMinutes(tStr);
                    if (btnMin === null) return;

                    let isMatch = false;
                    if (endMin === 1440) {
                        isMatch = (Number(btnMin) >= Number(startMin) && Number(btnMin) <= Number(endMin));
                    } else {
                        isMatch = (Number(btnMin) >= Number(startMin) && Number(btnMin) < Number(endMin));
                    }

                    if (isMatch) {
                        btn.classList.add("disabled"); 
                        
                        if (!btn.classList.contains("is-past-hour")) {
                            btn.style.setProperty("background-color", "#e5e7eb", "important");
                            btn.style.setProperty("color", "#9ca3af", "important");           
                            btn.style.setProperty("pointer-events", "none", "important");      
                            btn.style.setProperty("cursor", "not-allowed", "important");
                        }
                        
                        if (isMyReservation) {
                            btn.innerText = r.carType || "내 예약";
                            btn.style.setProperty("color", "#2563eb", "important");
                            btn.style.setProperty("font-weight", "700", "important");
                        } else {
                            btn.innerText = "마감";
                        }
                    }
                });
            });

            calculateMaxAvailableInterval();
            if (reservationType === "TARGET") {
                changeTargetPercent(document.getElementById("targetPercent")?.value || 0, false);
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
// 11. DOM 이벤트 리스너 바인딩
// ==========================================
window.addEventListener("DOMContentLoaded", () => {
    document.getElementById("reservationDate")?.addEventListener("change", loadReservedTimes);
    
    const slider = document.getElementById("targetPercent");
    if (slider) {
        slider.value = 0; 
        updateSliderBackground(0);
        slider.addEventListener("input", (e) => {
            changeTargetPercent(e.target.value, true); 
        });
    } 
    
    const textDisplay = document.getElementById("chargeValueText") || document.getElementById("targetPercentText");
    if (textDisplay) {
        textDisplay.innerText = "0%";
    }
});

// ==========================================
// 12. 예약 상태 전역 관리 (이탈 방지)
// ==========================================
window.addEventListener('beforeunload', handleUnload);

function handleUnload(e) {
    if (isBookingInProgress) {
        e.preventDefault();
        e.returnValue = ''; 
    }
}

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