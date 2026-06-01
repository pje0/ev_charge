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

/**
 * =========================================================================
 * 11. DOM 이벤트 리스너 바인딩 (검색 필터 전역 데이터 정의 및 이벤트 리스너 초기화 바인딩)
 * =========================================================================
 */
// 1. 행정구역 종속 관계 데이터 맵 선언 (실제 서비스 규격 맞춤 더미 데이터)
const regionDataMap = {
    "서울특별시": ["강남구", "서초구", "송파구", "마포구", "영등포구"],
    "부산광역시": ["해운대구", "부산진구", "동래구", "수영구", "사하구"],
    "경기도": ["수원시", "성남시", "고양시", "용인시", "부천시"]
};

// 2. DOM 로드 완료 시점 필터 이벤트 바인딩
window.addEventListener("DOMContentLoaded", () => {
    console.log("🛠️ [Filter Init] 검색 필터 시스템 초기화 루틴 시작");

    const sidoSelect = document.getElementById("filterSido"); // 시/도 엘리먼트 취득
    const sigunguSelect = document.getElementById("filterSigungu"); // 시/군/구 엘리먼트 취득
    const speedSelect = document.getElementById("filterSpeed"); // 충전속도 엘리먼트 취득

    // 3. 시/도 변경 이벤트 리스너 바인딩
    if (sidoSelect) {
        sidoSelect.addEventListener("change", (e) => {
            const selectedSido = e.target.value; // 사용자가 선택한 시/도 텍스트 값
            console.log(`📅 [Filter Event] 시/도 변경 감지 -> 선택값: ${selectedSido}`);
            
            // 시/도 변경에 따른 시/군/구 드롭다운 동적 재구성 호출
            updateSigunguOptions(selectedSido, sigunguSelect);
            
            // 조건이 바뀌었으므로 즉시 서버 통신 및 충전소 리스트 갱신 헬퍼 호출
            fetchFilteredStations();
        });
    }

    // 4. 시/군/구 변경 이벤트 리스너 바인딩
    if (sigunguSelect) {
        sigunguSelect.addEventListener("change", (e) => {
            const selectedSigungu = e.target.value; // 사용자가 선택한 시/군/구 텍스트 값
            console.log(`📅 [Filter Event] 시/군/구 변경 감지 -> 선택값: ${selectedSigungu}`);
            
            // 조건 변경에 따른 실시간 데이터 갱신 가동
            fetchFilteredStations();
        });
    }

    // 5. 충전속도 변경 이벤트 리스너 바인딩
    if (speedSelect) {
        speedSelect.addEventListener("change", (e) => {
            const selectedSpeed = e.target.value; // 사용자가 선택한 속도 코드 값
            console.log(`📅 [Filter Event] 충전속도 변경 감지 -> 선택값: ${selectedSpeed}`);
            
            // 조건 변경에 따른 실시간 데이터 갱신 가동
            fetchFilteredStations();
        });
    }

    console.log("✅ [Filter Init] 모든 검색 필터 옵션 및 리스너 바인딩 프로세스 완결");
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

/**
 * =========================================================================
 * 🟢 [Block 3] 시/도 선택에 따른 시/군/구 드롭다운 동적 생성 가공 엔진
 * =========================================================================
 */
function updateSigunguOptions(sidoValue, sigunguElement) {
    console.log(`⚙️ [UI Engine] 시/군/구 옵션 가공 프로세스 가동 (기준 시/도: ${sidoValue})`);
    
    if (!sigunguElement) {
        console.error("❌ [UI Engine Error] 시/군/구 셀렉터 요소를 찾을 수 없어 가공을 파기합니다.");
        return;
    }

    // 1. 초기 기본 상태 리셋 처리
    sigunguElement.innerHTML = ""; // 기존 옵션 문자열 제거 정리
    
    // 2. 시/도 선택 값이 비어있는 경우 (전체 조회 상태)
    if (!sidoValue || sidoValue === "") {
        console.log("🔒 [UI Engine] 선택된 시/도가 없으므로 시/군/구 드롭다운을 비활성화 잠금 처리합니다.");
        
        const defaultOption = document.createElement("option"); // 옵션 노드 생성
        defaultOption.value = ""; // 빈 값 세팅
        defaultOption.innerText = "시/도를 먼저 선택하세요"; // 안내 가이드용 텍스트
        
        sigunguElement.appendChild(defaultOption); // 노드 이식
        sigunguElement.disabled = true; // 비활성화
        sigunguElement.style.backgroundColor = "#f3f4f6"; // 배경색 회색으로 변조
        return;
    }

    // 3. 정상 구역 데이터 매핑 바인딩 실행
    const sigunguList = regionDataMap[sidoValue]; // 매핑 데이터에서 배열 취득
    console.log(`🔍 [Data Mapping] 데이터 원장 매핑 성공 -> 하위 행정구역 리스트: [${sigunguList.join(", ")}]`);

    // 4. "전체 구역" 선택용 디폴트 옵션 최상단 삽입
    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.innerText = "전체 시/군/구";
    sigunguElement.appendChild(allOption);

    // 5. 루프 연산을 통해 하위 행정구역 드롭다운 옵션 태그 동적 주입
    sigunguList.forEach(sigunguName => {
        const optionNode = document.createElement("option"); // 태그 객체 인스턴스화
        optionNode.value = sigunguName; // 백엔드로 넘겨줄 텍스트 매핑
        optionNode.innerText = sigunguName; // 사용자 노출용 문자열 지정
        sigunguElement.appendChild(optionNode); // 부모 셀렉트 박스에 추가 완료
    });

    // 6. 비활성화 락 해제 및 스타일 복구
    sigunguElement.disabled = false; // 활성화 전환
    sigunguElement.style.backgroundColor = "white"; // 배경색 백색 환원
    console.log(`✨ [UI Engine] 시/군/구 드롭다운 락 해제 및 동적 렌더링 세팅 완료`);
}

/**
 * =========================================================================
 * 🟢 [Block: Dynamic Region Data] DB 연동형 지역 데이터 로더 (URL 수정본)
 * =========================================================================
 */

// 1. 페이지 로드 시 시/도 목록 초기화
async function initRegionFilters() {
    console.log("🛠️ [Init] DB로부터 시/도 목록을 불러옵니다.");
    try {
        // 🚨 수정됨: 실제 컨트롤러 매핑 주소인 '/reservation/regions/sido'로 요청
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
        console.log("✅ [Init] 시/도 목록 로드 완료");
    } catch (err) {
        console.error("❌ [Init Error] 시/도 데이터 로딩 실패. 서버나 주소를 확인하세요:", err);
    }
}

// 2. 시/도 변경 시 시/군/구 목록 동적 갱신
async function loadSigunguBySido(sido) {
    console.log(`🔍 [Data Fetch] 선택된 시/도(${sido})에 해당하는 시/군/구 조회 시작`);
    
    const sigunguSelect = document.getElementById("filterSigungu");
    sigunguSelect.innerHTML = '<option value="">전체 시/군/구</option>'; // 초기화
    
    if (!sido) {
        sigunguSelect.disabled = true;
        return;
    }

    try {
        // 🚨 수정됨: 실제 컨트롤러 매핑 주소인 '/reservation/regions/sigungu'로 요청
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
        console.log(`✨ [Data Fetch] 시/군/구 갱신 완료: ${sigungus.length}건`);
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
    await initRegionFilters(); // 셀렉트 박스 먼저 세팅
    fetchFilteredStations();   // 🌟 세팅 끝나자마자 '전체 충전소' 목록 쫙 뿌려주기 강제 실행!
});