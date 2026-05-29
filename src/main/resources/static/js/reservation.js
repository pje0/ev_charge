// =========================================================================
// 🌐 EV 예약 시스템 클라이언트 코어 스크립트 (CSS 완벽 분리 및 시맨틱 클래스 연동본)
// =========================================================================

// 전역 상태 변수 안전 선언 및 디폴트 초기화
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

// 🟢 [NEW] 유저 대표 차량 전역 변수
let userBatteryCapacity = 70.0; 
let userConnectorType = "";

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
        updateSliderBackground(0);
    }
    const textDisplay = document.getElementById("targetPercentText");
    if (textDisplay) textDisplay.innerText = "0%"; 

    // CSS 분리를 통해 JS에서 인라인 스타일로 오버라이드하던 것을 전부 클래스 탈착으로 교체
    document.querySelectorAll(".ev-time-btn").forEach(btn => {
        btn.classList.remove("active", "in-range", "disabled", "is-past-hour", "is-reserved-locked", "my-reservation");
        if(btn.dataset.time) {
            btn.innerText = btn.dataset.time;
        }
    });
}

/**
 * =========================================================================
 * [독립 함수] 특정 충전기 카드의 상태를 즉시 변조하는 UI 스위칭 엔진
 * =========================================================================
 */
function applyChargerStatusUI(chargerId, isNotBookable) {
    const targetCard = document.getElementById(`charger-card-${chargerId}`);
    if (!targetCard) {
        console.warn(`⚠️ [applyChargerStatusUI] ID: ${chargerId} 카드를 찾을 수 없습니다.`);
        return;
    }

    const statusLower = targetCard.getAttribute("data-status") || "available";
    const isBroken = (statusLower === 'maintenance' || statusLower === 'out_of_service');
    const isOccupied = (statusLower === 'charging' || statusLower === 'occupied' || statusLower === 'in_use');

    const badge = targetCard.querySelector(".charger-badge");

    // 🛑 3단 분리: 고장(빨강), 오늘만 꽉 참(회색), 예약 가능(초록/노랑)
    if (isBroken) {
        console.log(`🚨 [UI 변환] ID: ${chargerId} 카드는 기기 점검 상태입니다.`);
        targetCard.className = "charger-card broken"; 
        if (badge) badge.innerText = "기기 점검 중";
    } else if (isNotBookable) {
        console.log(`🚨 [UI 변환] ID: ${chargerId} 카드를 '금일 예약 불가' 회색 레이아웃으로 설정합니다.`);
        targetCard.className = "charger-card full"; // 회색 전용 full 클래스
        if (badge) badge.innerText = "금일 예약 불가";
    } else {
        console.log(`✅ [UI 유지/복구] ID: ${chargerId} 카드는 예약 가능 상태를 유지합니다.`);
        targetCard.className = `charger-card ${isOccupied ? 'occupied' : 'available'}`; 
        if (badge) badge.innerText = isOccupied ? "사용 중 (예약 가능)" : "사용 가능";
    }
}

/**
 * =========================================================================
 * [기능 정의] 충전기 목록 로드 및 기본 UI 렌더링
 * =========================================================================
 */
async function loadChargers(stationId, element) {
    console.log(`🔌 [loadChargers] 충전기 목록 조회 프로세스 가동 -> stationId: ${stationId}`);

    if (!stationId) return;
    selectedStationId = Number(stationId);
    
    document.querySelectorAll('.station-card').forEach(el => el.classList.remove('active'));
    if (element) element.classList.add('active');
    
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

                return `
                    <div class="charger-card ${cardClass}" 
                         id="charger-card-${c.id}" 
                         data-status="${statusLower}"
                         onclick="selectCharger(this, '${c.id}', '${connectorName}', ${c.powerKw}, '${c.connectorType}')"> <div class="charger-card-header">
                            <h3 class="charger-title">${connectorName}</h3>
                            <span class="charger-badge">${badgeText}</span>
                        </div>
                        <div class="charger-info-row">
                            <span class="speed-badge ${speedClass}">${speedLabel}</span>
                            <p class="power-text">${c.powerKw}kW 출력</p>
                        </div>
                    </div>`;
            }).join('');
            
            if (selectedDateStr === todayStr) {
                chargers.forEach(async (c) => {
                    await checkChargerAvailabilityOnLoad(c.id, selectedDateStr);
                });
            }
            
        } else {
            container.innerHTML = '<div class="charger-empty">등록된 충전기가 없습니다.</div>';
        }

        if (selectedChargerId !== null && selectedChargerId !== 0) {
            await loadReservedTimes();
        }
    } catch (error) {
        console.error("❌ [loadChargers] 통신 예외 발생:", error);
    }
}

// 🟢 규격 비교 로직이 추가된 selectCharger 함수
function selectCharger(element, chargerId, chargerName, powerKw, rawConnectorType) {
    if (element.classList.contains("broken")) {
        alert("해당 기기는 현재 점검 중이므로 예약할 수 없습니다.");
        return;
    }

    // 🟢 충전기 규격과 내 대표 차량 규격 비교 알럿
    if (userConnectorType && rawConnectorType && userConnectorType !== rawConnectorType) {
        const warnMsg = `[경고] 고객님 대표 차량의 충전 규격(${userConnectorType})과 선택하신 충전기의 규격(${rawConnectorType})이 다릅니다.\n\n그래도 예약을 계속 진행하시겠습니까?`;
        if (!confirm(warnMsg)) {
            console.log("🛑 [Select Cancel] 규격 불일치로 충전기 선택 취소");
            return;
        }
    }

    isBookingInProgress = true; 
    document.getElementById("chargerId").value = chargerId;
    selectedChargerId = Number(chargerId);
    selectedChargerKw = Number(powerKw || 50.0);
    document.getElementById("summaryCharger").innerText = chargerName;
    
    console.log(`🔌 [충전기 선택 완료] 번호: ${selectedChargerId}, 출력: ${selectedChargerKw}kW, 규격: ${rawConnectorType}`);
    clearAllReservationStyles();
    moveStep(2);
    loadReservedTimes();
}

/**
 * =========================================================================
 * [기능 정의] 1단계 로딩 시점 개별 충전기 실시간 가용 시간 선행 검증
 * =========================================================================
 */
async function checkChargerAvailabilityOnLoad(chargerId, targetDateStr) {
    const rightNow = new Date();
    const url = `/reservation/reserved-times?chargerId=${chargerId}&date=${targetDateStr}&stationId=${selectedStationId}`;
    
    try {
        const response = await fetch(url);
        if (response.ok) {
            const reservedList = await response.json();
            
            const parseToMinutes = (timeInput) => {
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
            };

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
                        
                        let startMin = parseToMinutes(rStartStr);
                        let endMin = parseToMinutes(rEndStr);
                        
                        if (startMin === null || endMin === null) return false;

                        if (startMin < 1440) startMin = startMin % 1440;
                        if (endMin < 1440) {
                            endMin = endMin % 1440;
                            if (endMin <= startMin) endMin += 1440;
                        }
                        
                        // 🚨 만악의 근원 (if (endMin === 1410) endMin = 1440;) 완전 삭제 🚨
                        
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

            console.log(`🔎 [선행 검증 로그] 충전기 ID: ${chargerId} | 최대 연속 가용 여유공간: ${testMaxInterval}분`);

            if (testMaxInterval <= 30) {
                applyChargerStatusUI(chargerId, true);
            }
        }
    } catch (error) {
        console.error("❌ [checkChargerAvailabilityOnLoad] 선행 연산 주기 에러:", error);
    }
}

// ==========================================
// 3. 충전기 선택 액션
// ==========================================
function selectCharger(element, chargerId, chargerName, powerKw) {
    // 🛑 [입구컷 적용] 오직 '점검 중(broken)' 상태인 빨간색 카드만 클릭을 물리적으로 차단합니다.
    // 회색의 '금일 예약 불가(full)' 카드는 내일 예약을 위해 정상적으로 통과됩니다!
    if (element.classList.contains("broken")) {
        alert("해당 기기는 현재 점검 중이므로 예약할 수 없습니다.");
        return;
    }

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
// 4. 예약 설정 옵션 분기 제어
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
    // 🟢 하드코딩 제거, 유저의 실제 배터리 용량 대입
    const batteryCapacity = userBatteryCapacity; 
    const currentPercent = 0.0; 

    if (targetVal <= currentPercent) return 0;

    const requiredKwh = batteryCapacity * ((targetVal - currentPercent) / 100.0);
    let durationHours = requiredKwh / chargerKw;
    let requiredMinutes = Math.ceil(durationHours * 60) + 15; 

    if (chargerKw > 20 && targetVal > 80) { 
        requiredMinutes += Math.ceil(((batteryCapacity * (targetVal - 80) / 100.0) / chargerKw) * 0.5 * 60);
    }
    
    console.log(`🧮 [소요 시간 연산] 목표: ${targetVal}%, 배터리: ${batteryCapacity}kWh, 충전기: ${chargerKw}kW -> ${requiredMinutes}분 예상`);
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
    if (element.classList.contains("disabled") || element.classList.contains("is-past-hour")) {
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
        const firstAvailableBtn = allButtons.find(btn => 
            !btn.classList.contains("disabled")
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
    console.log("@# [실시간 연산 확인] 현재 기준 최대 연속 가용 시간:", maxContinuousMinutes + "분");
}

/**
 * =========================================================================
 * [기능 정의] 실시간 예약 점유 시간 마스킹 및 과거 대역 물리적 차단 락 가동 
 * =========================================================================
 */
async function loadReservedTimes() {
    console.log("⏳ [loadReservedTimes] 2단계 타임 버튼 배열 마스킹 동기화 루틴 시작");

    if (isFetchingReservedTimes) {
        console.warn("⚠️ [loadReservedTimes] 연산 세션 락인이 설정되어 비동기 요청을 파기합니다.");
        return;
    }
    
    const chargerId = document.getElementById("chargerId")?.value || selectedChargerId; 
    const date = document.getElementById("reservationDate")?.value;
    
    if (!chargerId || Number(chargerId) === 0 || !date) {
        console.warn("⚠️ [loadReservedTimes] 필수 파라미터 누락으로 마스킹을 스킵합니다.");
        return;
    }

    isFetchingReservedTimes = true;

    // 타임 버튼 리셋 클렌징
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

    console.log("🔒 [loadReservedTimes] 오늘 기준 경과된 과거 시간 레이어 고대비 잠금 격벽 작동");
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
            return;
        }
    });

    try {
        const sendChargerId = Number(chargerId);
        const sendStationId = selectedStationId ? selectedStationId : 0;
        
        const url = `/reservation/reserved-times?chargerId=${sendChargerId}&date=${date}&stationId=${sendStationId}`;
        
        const response = await fetch(url);
        
        if (response.ok) {
            const reservedList = await response.json();
            
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
                
                if (!rawStartTime || !rawEndTime) return; 

                let startMin = parseToMinutes(rawStartTime);
                let endMin = parseToMinutes(rawEndTime);
                
                if (startMin === null || endMin === null) return;

                if (startMin < 1440) startMin = startMin % 1440;
                if (endMin < 1440) {
                    endMin = endMin % 1440;
                    if (endMin <= startMin) endMin += 1440;
                }
                
                // 🚨 만악의 근원 완전 삭제 🚨

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

            console.log("📊 [loadReservedTimes] 최대 연속 가용 공간 재측정 헬퍼 기동");
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
        console.error("❌ [loadReservedTimes] 마스킹 동기화 주기 중 치명적 예외 발생:", error); 
    } finally {
        isFetchingReservedTimes = false;
        console.log("🏁 [loadReservedTimes] 타임 라인 제어 렌더링 주기 완결");
    }
}

/**
 * =========================================================================
 * [기능 정의] 날짜별 24:00 슬롯 버튼 실시간 동기화 제어 
 * =========================================================================
 */
function syncMidnightSlot() {
    const dateInput = document.getElementById("reservationDate")?.value;
    if (!dateInput) {
        console.warn("⚠️ [syncMidnightSlot] 날짜 데이터가 입력되지 않아 자정 슬롯 연산을 스킵합니다.");
        return;
    }

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    const selectedDateObj = new Date(dateInput + "T00:00:00");
    const todayDateObj = new Date(todayStr + "T00:00:00");
    
    const midnightBtn = document.querySelector(".ev-time-btn[data-time='24:00']");
    
    if (midnightBtn) {
        const isReserved = midnightBtn.classList.contains("is-reserved-locked");

        if (selectedDateObj < todayDateObj) {
            console.log(`🔒 [syncMidnightSlot] 과거 날짜(${dateInput}) 확인 -> 24:00 버튼 진한 회색 과거 격벽 차단`);
            midnightBtn.classList.add("disabled", "is-past-hour");
            midnightBtn.innerText = "24:00";
        } 
        else if (dateInput === todayStr) {
            const nowTotalMin = (now.getHours() * 60) + now.getMinutes();
            const midnightTotalMin = 24 * 60; 
            
            if (isReserved) {
                console.log(`🔒 [syncMidnightSlot] 오늘 날짜 - 이미 예약 선점됨 -> 마감 고정`);
                midnightBtn.classList.remove("is-past-hour");
                midnightBtn.classList.add("disabled");
                midnightBtn.innerText = "마감";
            } 
            else if (nowTotalMin >= midnightTotalMin) {
                console.log(`🔒 [syncMidnightSlot] 오늘 날짜 - 현재 시간이 자정을 경과함 -> 마감 차단`);
                midnightBtn.classList.remove("is-past-hour");
                midnightBtn.classList.add("disabled");
                midnightBtn.innerText = "마감";
            } 
            else {
                console.log(`🔓 [syncMidnightSlot] 오늘 날짜 - 아직 자정 전이며 예약 없음 -> 버튼 활성화 오픈`);
                midnightBtn.classList.remove("disabled", "is-past-hour");
                midnightBtn.innerText = "24:00";
            }
        } 
        else {
            if (!isReserved) {
                console.log(`🔓 [syncMidnightSlot] 미래 날짜(${dateInput}) 확인 -> 24:00 버튼 일반 활성화 복구`);
                midnightBtn.classList.remove("disabled", "is-past-hour");
                midnightBtn.innerText = "24:00";
            }
        }
    } else {
        console.warn("⚠️ [syncMidnightSlot] 화면상에서 24:00 시간 지정 버튼 요소를 찾을 수 없습니다.");
    }
}

// ==========================================
// 10. 예약 최종 제출 (reservation.js 전용)
// ==========================================
let isSubmittingForm = false; 

function submitReservation() {
    // 1. 중복 클릭 락 (따닥 방지)
    if (isSubmittingForm) {
        console.warn("⚠️ [submitReservation] 이미 예약 요청이 서버로 전송 중입니다.");
        return;
    }

    const type = document.getElementById("reservationType").value;
    const date = document.getElementById("reservationDate")?.value;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; 

    // 2. 시간대 지정 여부 검사
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
        const calculatedKwh = Math.round(userBatteryCapacity * (percentVal / 100.0));
        
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
    
    // 3. 날짜 및 과거 시간 검사
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

    // 🟢 4. 최종 확정 알럿 띄우기 (reservation.js 전용)
    if (!confirm("예약을 이대로 확정하시겠습니까?")) {
        console.log("🛑 [Submit Cancel] 사용자가 예약 확정을 취소했습니다.");
        return;
    }

    // 5. 날짜와 시간 조립 및 폼 전송
    const finalStartTimeStr = `${date} ${startTime.substring(0, 5)}:00`;
    const finalEndTimeStr = `${date} ${endTime.substring(0, 5)}:00`;

    document.getElementById("startTime").value = finalStartTimeStr;
    document.getElementById("endTime").value = finalEndTimeStr;
    
    // 🟢 6. 폼 전송 직전에 이탈 방지 알럿(beforeunload) 강제 해제!
    isBookingInProgress = false; 
    
    isSubmittingForm = true;
    document.getElementById("reservationForm").submit();

    setTimeout(() => { isSubmittingForm = false; }, 3000);
}

// ==========================================
// 11. DOM 이벤트 리스너 바인딩 (파일 하단에 있던 DOMContentLoaded를 위로 끌어올리거나 병합)
// ==========================================
window.addEventListener("DOMContentLoaded", () => {
    // 🟢 JSP에서 넘겨준 대표 차량 정보 파싱
    const batteryInput = document.getElementById("userBatteryCapacity");
    if (batteryInput && batteryInput.value) userBatteryCapacity = Number(batteryInput.value);
    
    const connectorInput = document.getElementById("userConnectorType");
    if (connectorInput && connectorInput.value) userConnectorType = connectorInput.value;
    
    console.log(`🚗 [차량 정보 로드] 배터리: ${userBatteryCapacity}kWh, 규격: ${userConnectorType}`);

    document.getElementById("reservationDate")?.addEventListener("change", () => {
        loadReservedTimes();
        syncMidnightSlot(); 
    });
    
    const slider = document.getElementById("targetPercent");
    if (slider) {
        slider.value = 0; 
        updateSliderBackground(0);
        slider.addEventListener("input", (e) => {
            changeTargetPercent(e.target.value, true); 
        });
    } 
    
    const textDisplay = document.getElementById("chargeValueText") || document.getElementById("targetPercentText");
    if (textDisplay) textDisplay.innerText = "0%";
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