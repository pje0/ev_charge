// =========================================================================
// 🌐 EV 예약 시스템 클라이언트 코어 스크립트 (v3.1 금일 예약 불가 격벽판)
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

// 장벽 충돌 시 슬라이더를 되감기할 물리 안전 기준점 (0% 시작)
let lastSafeTargetPercent = 0;

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
        btn.style.removeProperty("opacity");
    });
}

// =========================================================================
// 2. 충전기 목록 로드 및 상태별 분기 (v3.2 날짜별 예약 가능 상태 보정)
// =========================================================================
// 1. [에러 해결] 변수를 함수보다 최상단에 선언
let isBookingInProgress = false; 

async function loadChargers(stationId, element) {
    if (!stationId) return;
    selectedStationId = Number(stationId);
    
    document.querySelectorAll('.border-blue-500').forEach(el => el.classList.remove('border-blue-500', 'bg-blue-50'));
    element.classList.add('border-blue-500', 'bg-blue-50');
    
    clearAllReservationStyles();
    
    const rightNow = new Date();
    const todayStr = `${rightNow.getFullYear()}-${String(rightNow.getMonth() + 1).padStart(2, '0')}-${String(rightNow.getDate()).padStart(2, '0')}`;
    const selectedDateStr = document.getElementById("reservationDate")?.value || todayStr;
    
    try {
        const res = await fetch(`/reservation/api/chargers?stationId=${stationId}&date=${selectedDateStr}`);
        const chargers = await res.json();
        const container = document.getElementById("chargerListContainer");
        
        if (chargers.length > 0) {
            // [에러 해결] map(c => { ... }) 내부에서 모든 HTML을 return 하도록 구조화
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
                
                // [테스트 기준 복구] 실제 마감 기준 (<= 0)
                const isNotBookable = (selectedDateStr === todayStr && netAvailableSlots <= 0) || statusLower === 'maintenance' || statusLower === 'out_of_service';
                const isOccupied = (statusLower === 'charging' || statusLower === 'occupied' || statusLower === 'in_use');

                // [에러 해결] 하나의 template literal 안에서 모든 조건을 처리
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

// 📐 가용 슬롯 연산 부분 바로 아래 추가

// ==========================================
// 3. 충전기 선택 액션 (🟢 2중 예약 불가 방어막 결속)
// ==========================================
function selectCharger(element, chargerId, chargerName, powerKw) {
    // 🛑 [삭제] 더 이상 텍스트 기반 검증이나 alert으로 막지 않습니다.
    
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
    // 함수 내부에서 슬라이더를 확실하게 다시 찾습니다.
    const slider = document.getElementById("targetPercent");
    
    // slider가 없으면 배경색을 바꿀 대상이 없으니 종료합니다.
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
	const slider = document.getElementById("targetPercent");

    if (targetVal <= currentPercent) return 0;

    const requiredKwh = batteryCapacity * ((targetVal - currentPercent) / 100.0);
    let durationHours = requiredKwh / chargerKw;
    let requiredMinutes = Math.ceil(durationHours * 60) + 15; 

    if (chargerKw > 20 && targetVal > 80) { 
        requiredMinutes += Math.ceil(((batteryCapacity * (targetVal - 80) / 100.0) / chargerKw) * 0.5 * 60);
    }
    return requiredMinutes;
}

// =========================================================================
// 6. 목표 충전량 실시간 변동 연산 및 포커스 락 분쇄
// =========================================================================
//1. 오늘 날짜인지 확인하는 공통 함수
function isTodaySelected() {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    // 예약 날짜 input에서 현재 값을 가져옵니다.
    const reservationDateElement = document.getElementById("reservationDate");
    const selectedDate = reservationDateElement ? reservationDateElement.value : "";
    
    return selectedDate === todayStr;
}

// [중요] 실제 계산 로직으로 수정하세요! 
// 아까 콘솔에 찍히던 그 0분 값을 반환하는 로직을 찾아서 연결해야 합니다.
function getActualMaxAvailableMinutes() {
    // 만약 기존 함수 이름이 있다면 그걸 쓰세요. 없다면 아래처럼 작성하세요.
    // 현재 화면에 표시된 타임 슬롯 중 'disabled'가 아닌 연속된 가장 긴 시간을 찾는 로직일 것입니다.
    return parseInt(document.getElementById("maxAvailableMinutes")?.value || "0"); 
}

function changeTargetPercent(value, isUserAction = true) {
    // 1. 넘겨받은 값을 변수로 확실히 선언
    let targetVal = Number(value);
    
    // 2. 외부 로직용 변수들
    const slider = document.getElementById("targetPercent");
    const currentPercent = 0.0;

    // 3. 오늘 날짜 방어 로직 (함수 외부 선언된 것을 활용)
    if (isUserAction && isTodaySelected() && getActualMaxAvailableMinutes() < 30) {
        alert("오늘 예약 가능한 시간대가 부족하여 설정을 변경할 수 없습니다.");
        if (slider) {
            slider.value = lastSafeTargetPercent;
            updateSliderBackground(lastSafeTargetPercent);
            document.getElementById("targetPercentText").innerText = lastSafeTargetPercent + "%";
        }
        return; 
    }

    // 4. 여기서부터 targetVal을 안전하게 사용
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

    document.querySelectorAll(".ev-time-btn").forEach(btn => {
        if (!btn.classList.contains("disabled") && btn.style.pointerEvents !== "none") {
            btn.classList.remove("active", "in-range");
        }
    });

    startTime = time; 
    element.classList.add("active");
    
	// 🛠️ selectTime 함수 내 슬라이더 초기화 부분을 이렇게 수정하세요
	const slider = document.getElementById("targetPercent");
	if (slider) {
	    // 1. 강제 초기화(5%)를 삭제하고, 현재 슬라이더 값을 유지합니다.
	    const currentVal = Number(slider.value);
	    
	    // 2. 현재 설정된 %를 유지하면서 시간대만 새로 연산(syncTimeButtonsByTarget 호출)
	    // syncTimeButtonsByTarget()이 내부적으로 targetPercent 값을 읽어서
	    // 다시 시작 시간(startTime)에 맞춰 종료 시간(endTime)을 계산합니다.
	    syncTimeButtonsByTarget();
	}
}

// =========================================================================
// 7-1. 목표 충전량 기준 자동 슬롯 선택 및 보호막 결속 (v2.5 비동기 마스킹판)
// =========================================================================
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
            btn.classList.remove("bg-blue-600", "text-white", "border-blue-600", "active", "in-range", "bg-blue-50", "text-blue-600");
            btn.style.removeProperty("background-color");
            btn.style.removeProperty("color");
            btn.style.removeProperty("border-color");
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
    
    console.log(`📊 [v2.5 실시간 연산] 시작: ${startTime} | 종료: ${endTime} | 총 슬롯: ${requiredSlots}칸 점유 완료`);
    return true;
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
// 9. 실시간 예약/과거 시간대 비활성화 및 동기화 (과거 대역 고대비 패치 유지)
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

    // 1. 초기화 루프
    document.querySelectorAll(".ev-time-btn").forEach(btn => {
        btn.classList.remove("disabled", "active", "in-range", "is-past-hour");
        btn.style.removeProperty("background-color");
        btn.style.removeProperty("color");
        btn.style.removeProperty("pointer-events");
        btn.style.removeProperty("cursor");
        btn.style.removeProperty("border-color");
        
        if(btn.dataset.time) {
            btn.innerText = btn.dataset.time;
        }
    });
    
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; 
    const selectedDateObj = new Date(date + "T00:00:00");
    const todayDateObj = new Date(todayStr + "T00:00:00");

    // 2. 과거 시간 및 24:00 잠금 통합 루프
    document.querySelectorAll(".ev-time-btn").forEach(btn => {
        const t = btn.dataset.time;
        const [h, m] = t.split(":").map(Number);
        
        // 과거 시간대 판별
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

        // 24:00 마감 처리
        if (t === "24:00") {
            btn.classList.add("disabled");
            btn.style.setProperty("background-color", "#e5e7eb", "important");
            btn.style.setProperty("color", "#9ca3af", "important");
            btn.style.setProperty("pointer-events", "none", "important");
            btn.style.setProperty("cursor", "not-allowed", "important");
            btn.innerText = "마감";
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
                    return (d.getHours() * 60) + d.getMinutes();
                }
                if (typeof timeInput === 'string') {
                    let pureTime = timeInput.includes(' ') ? timeInput.split(' ')[1] : timeInput;
                    const match = pureTime.match(/^(\d{2}):(\d{2})/);
                    if (!match) return null;
                    return (parseInt(match[1], 10) * 60) + parseInt(match[2], 10);
                }
                return null;
            };

            reservedList.forEach((r) => {
                const rawStartTime = r.startTime || r.start_time || r.START_TIME;
                const rawEndTime = r.endTime || r.end_time || r.END_TIME;
                if (!rawStartTime || !rawEndTime) return; 

                let startMin = parseToMinutes(rawStartTime) % 1440;
                let endMin = parseToMinutes(rawEndTime) % 1440;
                if (endMin <= startMin) endMin += 1440;

                const currentSessionUserId = 1; 
                const resUserId = r.userId || r.user_id || r.USER_ID;
                const isMyReservation = (Number(resUserId) === Number(currentSessionUserId));

                document.querySelectorAll(".ev-time-btn").forEach(btn => {
                    const tStr = btn.dataset.time; 
                    const btnMin = parseToMinutes(tStr);
                    if (btnMin === null) return;

                    if (Number(btnMin) >= Number(startMin) && Number(btnMin) < Number(endMin)) {
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

// =========================================================================
// 11. [최종 격벽 결속] DOM 렌더링 직후 초기화 및 실시간 동기화 리스너
// =========================================================================
window.addEventListener("DOMContentLoaded", () => {
    document.getElementById("reservationDate")?.addEventListener("change", loadReservedTimes);
    
    const slider = document.getElementById("targetPercent");
    if (slider) {
        slider.value = 0; 
        updateSliderBackground(0);
        
        // 🛑 [수정] 이벤트 리스너를 if 블록 안에 깔끔하게 정리했습니다.
        slider.addEventListener("input", (e) => {
            changeTargetPercent(e.target.value, true); 
        });
    } // <-- 여기가 if (slider)를 닫는 괄호입니다.
    
    const textDisplay = document.getElementById("chargeValueText") || document.getElementById("targetPercentText");
    if (textDisplay) {
        textDisplay.innerText = "0%";
    }
}); // <-- 여기가 DOMContentLoaded를 닫는 괄호입니다.
// ============================================================
// 12. 예약 상태 전역 관리 (이탈 방지용)
// ============================================================

// [경고창] 브라우저 직접 닫기/새로고침/뒤로가기 시 이탈 방지
window.addEventListener('beforeunload', function (e) {
    if (isBookingInProgress) {
        e.preventDefault();
        e.returnValue = ''; // 표준 브라우저 경고창 트리거
    }
});

// [메뉴 이동] 예약 중 메뉴 클릭 시 confirm으로 이탈 제어
function navigateWithConfirm(url) {
    if (isBookingInProgress) {
        if (confirm("예약 설정 중인 내용이 사라집니다. 정말 나가시겠습니까?")) {
            isBookingInProgress = false; // 경고 해제
            window.location.href = url;
        }
    } else {
        window.location.href = url;
    }
}

// [초기화] 예약 페이지 로드 시 상태 체크
window.onload = function() {
    // 예약 완료 후 뒤로가기 방지용 세션 체크
    if (sessionStorage.getItem('reservationCompleted') === 'true') {
        sessionStorage.removeItem('reservationCompleted');
        window.location.replace('/home'); // replace로 히스토리 기록도 제거
    }
};

// ============================================================
// 13. 충전기 선택 시 (예약 시작)
// ============================================================
function selectCharger(element, chargerId, chargerName, powerKw) {
    // [경고 활성화] 이제부터 페이지 이탈 시 경고창이 뜹니다.
    isBookingInProgress = true; 

    document.getElementById("chargerId").value = chargerId;
    selectedChargerId = Number(chargerId);
    moveStep(2);
    loadReservedTimes();
}

// ============================================================
// 14. 예약 확정 시 (예약 완료)
// ============================================================
// [핵심] 예약 확정 시 경고창 차단 후 이동 로직
function handleReservationComplete() {
    // 1. 이탈 방지 플래그를 즉시 끕니다.
    isBookingInProgress = false; 
    
    // 2. 만약의 경우를 대비해 이벤트 리스너를 잠시 제거합니다.
    window.removeEventListener('beforeunload', handleUnload); 
    
    // 3. 완료 처리
    sessionStorage.setItem('reservationCompleted', 'true');
    
    // 4. 페이지 이동
    window.history.replaceState(null, '', '/reservation/success');
    window.location.href = '/reservation/success';
}

// 기존 beforeunload 이벤트 함수를 이름 있는 함수로 분리 (제거를 위해)
function handleUnload(e) {
    if (isBookingInProgress) {
        e.preventDefault();
        e.returnValue = '';
    }
}
window.addEventListener('beforeunload', handleUnload);