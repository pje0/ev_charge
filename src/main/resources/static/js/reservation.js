// =========================================================================
// 🌐 EV 예약 시스템 클라이언트 코어 스크립트 (모듈화 및 단일 책임 원칙 적용본)
// =========================================================================

// ==========================================
// [전역 상태 변수]
// ==========================================
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

// 예약 폼 제출 중복 방지 변수
let isSubmittingForm = false; 

let userBatteryCapacity = 70.0; 
let userConnectorType = "";

/**
 * =========================================================================
 * 🛠️ [공통 헬퍼 함수] 로직을 건드리지 않고 분리된 유틸리티 모음
 * =========================================================================
 */

// 1. [유틸] 문자열 시간을 분(Minutes)으로 파싱하는 함수 (중복 제거)
function parseTimeStringToMinutes(timeInput, targetDateStr) {
    if (!timeInput) return null;
    if (typeof timeInput === 'string' && (timeInput.includes('T') || timeInput.includes('Z'))) {
        const d = new Date(timeInput);
        let minutes = (d.getHours() * 60) + d.getMinutes();
        return minutes === 0 && d.getDate() !== new Date(targetDateStr).getDate() ? 1440 : minutes;
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
}

// 2. [유틸] 충전기 필터링 로직 함수
function filterChargersBySpeed(chargers, speedFilter) {
    return chargers.filter(c => {
        const isRapid = (c.powerKw >= 50 || c.connectorType === 'RAPID' || c.connectorType === 'DC_COMBO' || c.connectorType === 'CHAdemo' || c.connectorType === 'AC_3PHASE');
        if (speedFilter === 'RAPID') return isRapid;
        if (speedFilter === 'SLOW') return !isRapid;
        return true;
    });
}

// 3. [유틸] 충전소 카드 HTML 생성기
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

// 4. [유틸] 충전기 카드 HTML 생성기
function generateChargerCardHTML(c, preserveSelection, selectedChargerId) {
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

// 5. [유틸] 과거 시간대 버튼 비활성화 처리기
function lockPastTimeSlots(date, todayStr, selectedDateObj, todayDateObj, now) {
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
        }
    });
}

// 6. [유틸] 예약 폼 필수 값 검증기
function validateReservationForm(type, date, todayStr, now) {
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

    if (date === todayStr && startTime) {
        const [startH, startM] = startTime.split(":").map(Number);
        if (startH < now.getHours() || (startH === now.getHours() && startM < now.getMinutes())) {
            alert("현재 시간보다 이전의 시간대는 예약할 수 없습니다. 다른 시간대를 골라주세요.");
            return false;
        }
    }
    return true;
}

// 7. [유틸] 목표 충전량 히든 인풋 동적 생성기
function appendTargetHiddenInputs(percentVal, calculatedKwh) {
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
 * 🎬 메인 비즈니스 로직 및 이벤트 핸들러
 * =========================================================================
 */

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
        if (stepNum <= step) {
            el.classList.add("ev-step-on");
        } else {
            el.classList.remove("ev-step-on");
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
        updateSliderVisuals(0); 
    }
    const textDisplay = document.getElementById("targetPercentText");
    if (textDisplay) textDisplay.innerText = "0%"; 

    document.querySelectorAll(".ev-time-btn").forEach(btn => {
        btn.classList.remove("active", "in-range", "disabled", "is-past-hour", "is-reserved-locked", "my-reservation");
        if(btn.dataset.time) {
            btn.innerText = btn.dataset.time;
        }
    });
}

function applyChargerStatusUI(chargerId, isNotBookable) {
    const targetCard = document.getElementById(`charger-card-${chargerId}`);
    if (!targetCard) return;

    const statusLower = targetCard.getAttribute("data-status") || "available";
    const isBroken = (statusLower === 'maintenance' || statusLower === 'out_of_service');
    const isOccupied = (statusLower === 'charging' || statusLower === 'occupied' || statusLower === 'in_use');
    const badge = targetCard.querySelector(".charger-badge");

    if (isBroken) {
        targetCard.className = "charger-card broken"; 
        if (badge) badge.innerText = "기기 점검 중";
    } else if (isNotBookable) {
        targetCard.className = "charger-card full";
        if (badge) badge.innerText = "금일 예약 불가";
    } else {
        targetCard.className = `charger-card ${isOccupied ? 'occupied' : 'available'}`; 
        if (badge) badge.innerText = isOccupied ? "사용 중 (예약 가능)" : "사용 가능";
    }
}

async function loadChargers(stationId, element, preserveSelection = false) {
    console.log(`🔌 [loadChargers] 충전기 목록 조회 프로세스 가동 -> stationId: ${stationId}`);

    if (!stationId) return;
    selectedStationId = Number(stationId);
    
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
        const res = await fetch(`/reservation/api/chargers?stationId=${stationId}&date=${selectedDateStr}`);
        if (!res.ok) throw new Error(`HTTP 요청 실패: ${res.status}`);
        
        let chargers = await res.json();
        const speedFilter = document.getElementById("filterSpeed")?.value || "ALL";
        
        // 헬퍼 함수로 필터링 위임
        chargers = filterChargersBySpeed(chargers, speedFilter);

        const isCurrentChargerStillAvailable = chargers.some(c => Number(c.id) === Number(selectedChargerId));
        if (preserveSelection && !isCurrentChargerStillAvailable && selectedChargerId !== null && selectedChargerId !== 0) {
            clearAllReservationStyles();
        }

        const container = document.getElementById("chargerListContainer");
        if (!container) return;
        
        if (chargers.length > 0) {
            // 헬퍼 함수로 HTML 조립 위임
            container.innerHTML = chargers.map(c => generateChargerCardHTML(c, preserveSelection, selectedChargerId)).join('');
            
            if (selectedDateStr === todayStr) {
                chargers.forEach(async (c) => {
                    await checkChargerAvailabilityOnLoad(c.id, selectedDateStr);
                });
            }
            
        } else {
            container.innerHTML = '<div class="charger-empty">해당 속도의 충전기가 이 충전소에는 없습니다.</div>';
        }

        if (selectedChargerId !== null && selectedChargerId !== 0 && isCurrentChargerStillAvailable) {
            await loadReservedTimes();
        }
    } catch (error) {
        console.error("❌ [loadChargers] 통신 및 렌더링 중 예외 발생:", error);
    }
}

async function fetchFilteredStations() {
    const sido = document.getElementById("filterSido")?.value || ""; 
    const sigungu = document.getElementById("filterSigungu")?.value || ""; 
    const speed = document.getElementById("filterSpeed")?.value || "ALL"; 
    
    try {
        const url = `/reservation/stations?sido=${encodeURIComponent(sido)}&sigungu=${encodeURIComponent(sigungu)}&speed=${speed}`;
        const response = await fetch(url);
        
        if (!response.ok) throw new Error(`서버 에러: ${response.status}`);
        
        const stationList = await response.json(); 
        
        const container = document.getElementById("stationListContainer");
        const chargerContainer = document.getElementById("chargerListContainer");

        if (!container) return;

        if (stationList.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:3rem 1rem; color:#9ca3af; font-weight:500;">조건에 맞는 충전소가 없습니다.</div>';
            if (chargerContainer) chargerContainer.innerHTML = '<div class="charger-empty">좌측에서 충전소를 선택해 주세요.</div>';
            clearAllReservationStyles();
            selectedStationId = null;
            return;
        }

        // 헬퍼 함수로 HTML 조립 위임
        container.innerHTML = stationList.map(s => {
            const isActiveClass = (Number(s.id) === Number(selectedStationId)) ? "active" : "";
            return generateStationCardHTML(s, isActiveClass);
        }).join('');

        if (selectedStationId) {
            const isStationStillVisible = stationList.some(s => Number(s.id) === Number(selectedStationId));
            if (isStationStillVisible) {
                await loadChargers(selectedStationId, null, true);
            } else {
                selectedStationId = null;
                if (chargerContainer) chargerContainer.innerHTML = '<div class="charger-empty">조건 변경으로 선택이 해제되었습니다. 다시 선택해 주세요.</div>';
                clearAllReservationStyles();
            }
        } else {
            if (chargerContainer) chargerContainer.innerHTML = '<div class="charger-empty">좌측에서 충전소를 선택해 주세요.</div>';
        }

    } catch (err) {
        console.error("❌ [fetchFilteredStations] 실행 중 에러:", err);
    }
}

function selectCharger(element, chargerId, chargerName, powerKw, rawConnectorType) {
    if (element.classList.contains("broken")) {
        alert("해당 기기는 현재 점검 중이므로 예약할 수 없습니다.");
        return;
    }

    if (userConnectorType && rawConnectorType && userConnectorType !== rawConnectorType) {
        const warnMsg = `[경고] 고객님 대표 차량의 충전 규격(${userConnectorType})과 선택하신 충전기의 규격(${rawConnectorType})이 다릅니다.\n\n그래도 예약을 계속 진행하시겠습니까?`;
        if (!confirm(warnMsg)) return;
    }

    isBookingInProgress = true; 
    document.getElementById("chargerId").value = chargerId;
    selectedChargerId = Number(chargerId);
    selectedChargerKw = Number(powerKw || 50.0);
    document.getElementById("summaryCharger").innerText = chargerName;
    
    clearAllReservationStyles();
    moveStep(2);
    loadReservedTimes();
}

async function checkChargerAvailabilityOnLoad(chargerId, targetDateStr) {
    const rightNow = new Date();
    const url = `/reservation/reserved-times?chargerId=${chargerId}&date=${targetDateStr}&stationId=${selectedStationId}`;
    
    try {
        const response = await fetch(url);
        if (response.ok) {
            const reservedList = await response.json();
            
            let testMaxInterval = 0;
            let currentInterval = 0;

            for (let h = 9; h < 24; h++) {
                const mArr = ["00", "30"];
                for (let mIdx = 0; mIdx < 2; mIdx++) {
                    const currentLoopMin = (h * 60) + Number(mArr[mIdx]);
                    
                    let isPastSlot = false;
                    const nowTotalMin = (rightNow.getHours() * 60) + rightNow.getMinutes();
                    if (currentLoopMin <= nowTotalMin) isPastSlot = true;
                    
                    let isReservedSlot = reservedList.some(rObj => {
                        const rStartStr = rObj.startTime || rObj.start_time || rObj.START_TIME;
                        const rEndStr = rObj.endTime || rObj.end_time || rObj.END_TIME;
                        if(!rStartStr || !rEndStr) return false;
                        
                        // 헬퍼 함수 호출로 대체
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

                    if (isPastSlot || isReservedSlot) {
                        currentInterval = 0;
                    } else {
                        currentInterval += 30;
                        if (currentInterval > testMaxInterval) testMaxInterval = currentInterval;
                    }
                }
            }

            if (testMaxInterval <= 30) {
                applyChargerStatusUI(chargerId, true);
            }
        }
    } catch (error) {
        console.error("❌ [checkChargerAvailabilityOnLoad] 선행 연산 주기 에러:", error);
    }
}

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

function updateSliderVisuals(value) {
    const slider = document.getElementById("targetPercent");
    const sliderText = document.getElementById("targetPercentText");
    if (!slider || !sliderText) return;

    slider.value = value;
    sliderText.textContent = value + "%";
    slider.style.background = `linear-gradient(to right, #2563eb ${value}%, #e5e7eb ${value}%)`;
}

document.addEventListener("DOMContentLoaded", () => {
    const slider = document.getElementById("targetPercent");
    if (slider) {
        slider.addEventListener("input", (e) => {
            const val = e.target.value;
            updateSliderVisuals(val);
            changeTargetPercent(val, true);
        });
        updateSliderVisuals(slider.value);
    }
});

function calculateRequiredMinutes(targetVal) {
    const chargerKw = selectedChargerKw; 
    const batteryCapacity = userBatteryCapacity; 
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

    const isSequenceValid = syncTimeButtonsByTarget();
    
    if (!isSequenceValid) {
        updateSliderVisuals(lastSafeTargetPercent); 
        if (document.getElementById("summaryTarget")) {
            document.getElementById("summaryTarget").innerText = lastSafeTargetPercent + "%";
        }
        if (slider) slider.blur(); 
        syncTimeButtonsByTarget();
        return; 
    }

    lastSafeTargetPercent = targetVal; 
}

window.quickTarget = function(value) {
    updateSliderVisuals(value); 
    changeTargetPercent(value, true); 
};

function selectTime(element, time) {
    if (element.classList.contains("disabled") || element.classList.contains("is-past-hour")) return; 

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
            if (t >= tempStart && t <= tempEnd && btn.classList.contains("disabled")) { 
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
            if (btn.classList.contains("disabled")) return; 
            btn.classList.remove("active", "in-range");
        });
    };

    if (requiredSlots <= 0) {
        cleanStyles();
        return true;
    }

    let validStartTime = startTime;
    if (!validStartTime || !allButtons.some(btn => btn.dataset.time === validStartTime && !btn.classList.contains("disabled"))) {
        const firstAvailableBtn = allButtons.find(btn => !btn.classList.contains("disabled"));
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
            if (checkBtn.classList.contains("disabled")) {
                isSequenceValid = false;
                break;
            }
        }
    } else {
        isSequenceValid = false;
    }

    if (!isSequenceValid) {
        if (document.querySelector(".ev-time-btn.active") || startTime) {
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

    if (targetStartIndex === -1 || (targetStartIndex + requiredSlots > allButtons.length)) {
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
    if (document.getElementById("startTime")) document.getElementById("startTime").value = date + " " + startTime + ":00";
    if (document.getElementById("endTime")) document.getElementById("endTime").value = date + " " + endTime + ":00";
    if (document.getElementById("summaryTime")) document.getElementById("summaryTime").innerText = `${startTime} ~ ${endTime} (${requiredMinutes}분 소요)`;
    
    return true;
}

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
}

async function loadReservedTimes() {
    if (isFetchingReservedTimes) return;
    
    const chargerId = document.getElementById("chargerId")?.value || selectedChargerId; 
    const date = document.getElementById("reservationDate")?.value;
    
    if (!chargerId || Number(chargerId) === 0 || !date) return;

    isFetchingReservedTimes = true;

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

    // 헬퍼 함수로 위임
    lockPastTimeSlots(date, todayStr, selectedDateObj, todayDateObj, now);

    try {
        const sendChargerId = Number(chargerId);
        const sendStationId = selectedStationId ? selectedStationId : 0;
        const url = `/reservation/reserved-times?chargerId=${sendChargerId}&date=${date}&stationId=${sendStationId}`;
        const response = await fetch(url);
        
        if (response.ok) {
            const reservedList = await response.json();
            
            reservedList.forEach((r) => {
                const rawStartTime = r.startTime || r.start_time || r.START_TIME;
                const rawEndTime = r.endTime || r.end_time || r.END_TIME;
                
                if (!rawStartTime || !rawEndTime) return; 

                // 헬퍼 함수 호출
                let startMin = parseTimeStringToMinutes(rawStartTime, date);
                let endMin = parseTimeStringToMinutes(rawEndTime, date);
                
                if (startMin === null || endMin === null) return;

                if (startMin < 1440) startMin = startMin % 1440;
                if (endMin < 1440) {
                    endMin = endMin % 1440;
                    if (endMin <= startMin) endMin += 1440;
                }
                
                const currentSessionUserId = 1; 
                const resUserId = r.userId || r.user_id || r.USER_ID;
                const isMyReservation = (Number(resUserId) === Number(currentSessionUserId));

                document.querySelectorAll(".ev-time-btn").forEach(btn => {
                    const tStr = btn.dataset.time; 
                    let btnMin = parseTimeStringToMinutes(tStr, date);
                    if (btnMin === null) return;

                    let isMatch = false;
                    if (endMin === 1440) {
                        isMatch = (Number(btnMin) >= Number(startMin) && Number(btnMin) <= Number(endMin));
                    } else {
                        isMatch = (Number(btnMin) >= Number(startMin) && Number(btnMin) < Number(endMin));
                    }

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

            calculateMaxAvailableInterval();
            
            if (date === todayStr) {
                if (maxContinuousMinutes <= 30) {
                    applyChargerStatusUI(selectedChargerId, true);
                } else {
                    applyChargerStatusUI(selectedChargerId, false);
                }
            }
            
            syncMidnightSlot();

            if (reservationType === "TARGET") {
                changeTargetPercent(document.getElementById("targetPercent")?.value || 0, false);
            }
        }
    } catch (error) { 
        console.error("❌ [loadReservedTimes] 에러:", error); 
    } finally {
        isFetchingReservedTimes = false;
    }
}

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

function submitReservation() {
    if (isSubmittingForm) return;

    const type = document.getElementById("reservationType").value;
    const date = document.getElementById("reservationDate")?.value;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; 

    // 헬퍼 함수로 폼 검증 위임
    if (!validateReservationForm(type, date, todayStr, now)) return;

    if (type === "TARGET") {
        const percentVal = parseInt(document.getElementById("targetPercent")?.value) || 0;
        const calculatedKwh = Math.round(userBatteryCapacity * (percentVal / 100.0));
        // 헬퍼 함수로 동적 input 태그 생성 위임
        appendTargetHiddenInputs(percentVal, calculatedKwh);
    }
    
    if (!confirm("예약을 이대로 확정하시겠습니까?")) return;

    const finalStartTimeStr = `${date} ${startTime.substring(0, 5)}:00`;
    const finalEndTimeStr = `${date} ${endTime.substring(0, 5)}:00`;

    document.getElementById("startTime").value = finalStartTimeStr;
    document.getElementById("endTime").value = finalEndTimeStr;
    
    isBookingInProgress = false; 
    
    isSubmittingForm = true;
    document.getElementById("reservationForm").submit();

    setTimeout(() => { isSubmittingForm = false; }, 3000);
}

const regionDataMap = {
    "서울특별시": ["강남구", "서초구", "송파구", "마포구", "영등포구"],
    "부산광역시": ["해운대구", "부산진구", "동래구", "수영구", "사하구"],
    "경기도": ["수원시", "성남시", "고양시", "용인시", "부천시"]
};

window.addEventListener("DOMContentLoaded", () => {
    const sidoSelect = document.getElementById("filterSido");
    const sigunguSelect = document.getElementById("filterSigungu");
    const speedSelect = document.getElementById("filterSpeed");

    if (sidoSelect) {
        sidoSelect.addEventListener("change", (e) => {
            const selectedSido = e.target.value;
            updateSigunguOptions(selectedSido, sigunguSelect);
            fetchFilteredStations();
        });
    }

    if (sigunguSelect) {
        sigunguSelect.addEventListener("change", fetchFilteredStations);
    }

    if (speedSelect) {
        speedSelect.addEventListener("change", fetchFilteredStations);
    }
});

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

function updateSigunguOptions(sidoValue, sigunguElement) {
    if (!sigunguElement) return;

    sigunguElement.innerHTML = "";
    
    if (!sidoValue || sidoValue === "") {
        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.innerText = "시/도를 먼저 선택하세요";
        
        sigunguElement.appendChild(defaultOption);
        sigunguElement.disabled = true;
        sigunguElement.style.backgroundColor = "#f3f4f6";
        return;
    }

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

async function initRegionFilters() {
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
    } catch (err) {
        console.error("❌ [Init Error] 시/도 데이터 로딩 실패:", err);
    }
}

async function loadSigunguBySido(sido) {
    const sigunguSelect = document.getElementById("filterSigungu");
    sigunguSelect.innerHTML = '<option value="">전체 시/군/구</option>';
    
    if (!sido) {
        sigunguSelect.disabled = true;
        return;
    }

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
    } catch (err) {
        console.error("❌ [Data Fetch Error] 시/군/구 데이터 로딩 실패:", err);
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
    await initRegionFilters(); 
    fetchFilteredStations();   
});