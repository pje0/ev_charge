// ==========================================
// 0. 전역 변수 초기화 및 가드
// ==========================================
if (typeof selectedStationId === 'undefined') { var selectedStationId = null; }
if (typeof selectedChargerId === 'undefined') { var selectedChargerId = null; }
if (typeof reservationType === 'undefined') { var reservationType = "TIME"; }
if (typeof startTime === 'undefined') { var startTime = null; }
if (typeof endTime === 'undefined') { var endTime = null; }
if (typeof maxContinuousMinutes === 'undefined') { var maxContinuousMinutes = 1440; }
if (typeof isFetchingReservedTimes === 'undefined') { var isFetchingReservedTimes = false; }

// ==========================================
// 1. 단계 제어 (Step View Control)
// ==========================================
function moveStep(step) {
    if (step === 3) {
        const date = document.getElementById("reservationDate")?.value;
        document.getElementById("summaryDate").innerText = date || "-";
        
        if (!startTime || !endTime) {
            document.getElementById("summaryTime").innerText = "시간 미지정 (목표량 기반 충전)";
        }
        
        const type = document.getElementById("reservationType").value;
        if (type === "TIME") {
            document.getElementById("summaryTarget").innerText = "목표 충전량 미설정";
        } else {
            const currentPercent = document.getElementById("targetPercent").value;
            document.getElementById("summaryTarget").innerText = currentPercent + "%";
        }
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

// ==========================================
// 2. 충전기 목록 로드 및 상태별 분기 (Ajax)
// ==========================================
async function loadChargers(stationId, element) {
    if (!stationId) return;
    selectedStationId = Number(stationId);
    
    document.querySelectorAll('.border-blue-500').forEach(el => el.classList.remove('border-blue-500', 'bg-blue-50'));
    element.classList.add('border-blue-500', 'bg-blue-50');
    
    try {
        const res = await fetch(`/reservation/api/chargers?stationId=` + stationId);
        const chargers = await res.json();
        const container = document.getElementById("chargerListContainer");
        
        if (chargers.length > 0) {
            container.innerHTML = chargers.map(c => {
                const statusLower = c.status ? c.status.toLowerCase() : 'available';
                
                if (statusLower === 'maintenance' || statusLower === 'out_of_service') {
                    return `
                        <div class="border border-gray-200 bg-gray-100 opacity-60 rounded-lg p-3 select-none pointer-events-none">
                            <div class="flex justify-between items-center mb-1">
                                <h3 class="font-bold text-gray-900 text-sm">${c.connectorType}</h3>
                                <span class="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">점검 중</span>
                            </div>
                            <p class="text-gray-400 text-xs tracking-tight">${c.powerKw}kW 충전</p>
                        </div>`;
                }
                
                if (statusLower === 'charging' || statusLower === 'occupied' || statusLower === 'in_use') {
                    return `
                        <div class="border border-amber-200 bg-amber-50/30 rounded-lg p-3 cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition" 
                             onclick="selectCharger(this, '${c.id}', '${c.connectorType}')">
                            <div class="flex justify-between items-center mb-1">
                                <h3 class="font-bold text-amber-900 text-sm">${c.connectorType}</h3>
                                <span class="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">현재 사용 중 (예약 가능)</span>
                            </div>
                            <p class="text-amber-700 text-xs tracking-tight">${c.powerKw}kW 충전</p>
                        </div>`;
                }

                return `
                    <div class="border border-gray-200 rounded-lg p-3 cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition bg-white" 
                         onclick="selectCharger(this, '${c.id}', '${c.connectorType}')">
                        <div class="flex justify-between items-center mb-1">
                            <h3 class="font-bold text-gray-900 text-sm">${c.connectorType}</h3>
                            <span class="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">사용 가능</span>
                        </div>
                        <p class="text-gray-400 text-xs tracking-tight">${c.powerKw}kW 충전</p>
                    </div>`;
            }).join('');
        } else {
            container.innerHTML = '<div class="col-span-2 text-center py-24 text-gray-400 text-xs">등록된 충전기가 없습니다.</div>';
        }
        
        setTimeout(loadReservedTimes, 50);

    } catch (error) {
        console.error("충전기 목록 로드 실패:", error);
    }
}

// ==========================================
// 3. 충전기 선택 및 건너뛰기 액션
// ==========================================
function selectCharger(element, chargerId, chargerName) {
    document.getElementById("chargerId").value = chargerId;
    selectedChargerId = Number(chargerId);
    document.getElementById("summaryCharger").innerText = chargerName;
    moveStep(2);
    setTimeout(loadReservedTimes, 50);
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

    if (type === "TIME") {
        document.getElementById("btnTime").classList.add("active");
        document.getElementById("timeBox").classList.remove("hidden");
        document.getElementById("targetBox").classList.add("hidden");
    } else {
        document.getElementById("btnTarget").classList.add("active");
        document.getElementById("timeBox").classList.remove("hidden"); // 🟢 [수정] TARGET 모드일 때도 시간대 박스를 보여주도록 강제 개방
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

// ==========================================
// 5-1. 공통 소요 시간 연산 독립 함수 (코드 중복 해제)
// ==========================================
function calculateRequiredMinutes(targetVal) {
    const chargerKw = 50.0; 
    const batteryCapacity = 70.0; 
    const currentPercent = 0.0; 

    if (targetVal <= currentPercent) return 0;

    const requiredKwh = batteryCapacity * ((targetVal - currentPercent) / 100.0);
    let durationHours = requiredKwh / chargerKw;
    let requiredMinutes = Math.ceil(durationHours * 60) + 15; 

    if (targetVal > 80) { 
        requiredMinutes += Math.ceil(((batteryCapacity * (targetVal - 80) / 100.0) / chargerKw) * 0.5 * 60);
    }
    return requiredMinutes;
}

// ==========================================
// 6. 목표 충전량 실시간 제약 가드 락
// ==========================================
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

    // 독립 분리된 계산 함수 호출
    let requiredMinutes = calculateRequiredMinutes(targetVal);
    console.log(`@# [요구량 검증] 목표 ${targetVal}% 설정 시 필요 시간: ${requiredMinutes}분 / 가용 시간: ${availableMin}분`);

    if (requiredMinutes > availableMin || availableMin <= 0) {
        if (isQuick === true) {
            alert(`죄송합니다. 현재 남은 예약 가능 시간(${availableMin}분)이 부족하여 목표 충전량을 더 늘릴 수 없습니다.`);
        }

        const chargerKw = 50.0;
        const batteryCapacity = 70.0;
        const maxKwh = Math.max(0, (availableMin - 15) * chargerKw / 60);
        const maxAllowedIncrease = (maxKwh / batteryCapacity) * 100;
        let maxPossiblePercent = Math.floor(currentPercent + maxAllowedIncrease);
        maxPossiblePercent = Math.max(0, Math.min(100, maxPossiblePercent));

        targetVal = maxPossiblePercent; // 유효 범위 최댓값으로 강제 고정
    }

    const slider = document.getElementById("targetPercent");
    if (slider) {
        slider.value = targetVal;
    }
    document.getElementById("targetPercentText").innerText = targetVal + "%";
    if (document.getElementById("summaryTarget")) {
        document.getElementById("summaryTarget").innerText = targetVal + "%";
    }
    updateSliderBackground(targetVal);

    // 🔴 [무한 루프 방지 버그 픽스]: 여기서 loadReservedTimes()를 직접 호출하면 무한 루프가 발생하므로,
    // 오직 사용자가 마우스를 직접 드래그해서 수동 변경할 때만 작동하도록 이빠진 이벤트를 걸거나 내부 무한 참조를 원천 분리합니다.
    // 대신 시간대 칠하기 렌더링 동기화 함수를 직접 가동해 줍니다.
    syncTimeButtonsByTarget();
}

function quickTarget(value) {
    const slider = document.getElementById("targetPercent");
    if (slider) {
        slider.value = value;
        changeTargetPercent(value, true); 
    }
}

// ==========================================
// 7. 타임 슬롯 단일 클릭 ➡️ 필요한 만큼 뒤로 자동 연속 선택 로직 (통합 완료)
// ==========================================
// ==========================================
// 7. 타임 슬롯 클릭 제어 (TIME 모드: 범위 지정 / TARGET 모드: 자동 슬라이딩)
// ==========================================
function selectTime(element, time) {
    if (element.classList.contains("disabled") || element.disabled === true) {
        return; 
    }

    // ----------------------------------------------------------------
    // [분기 A] 🟢 TIME 모드: 사용자가 직접 시작시간, 종료시간을 2번 클릭하여 선택
    // ----------------------------------------------------------------
    if (reservationType === "TIME") {
        // 이미 시작과 종료가 다 선택된 상태에서 새로 누르면 -> 초기화 후 첫 단추로 세팅
        if (startTime !== null && endTime !== null) {
            startTime = null;
            endTime = null;
            document.querySelectorAll(".ev-time-btn").forEach(btn => btn.classList.remove("active", "in-range"));
        }
        
        // 1. 시작 시간 지정
        if (startTime === null) {
            startTime = time;
            element.classList.add("active");
            document.getElementById("summaryTime").innerText = "시작 시간: " + startTime;
            
            const date = document.getElementById("reservationDate").value;
            document.getElementById("startTime").value = date + " " + startTime + ":00";
            document.getElementById("endTime").value = ""; // 종료는 아직 미지정
            return;
        }
        
        // 2. 시작 시간을 다시 누르면 선택 취소
        if (startTime === time) {
            startTime = null;
            element.classList.remove("active");
            document.getElementById("summaryTime").innerText = "-";
            document.getElementById("startTime").value = "";
            return;
        }
        
        // 3. 종료 시간 지정 (두 번째 클릭)
        let tempStart = startTime;
        let tempEnd = time;
        if (time < startTime) { tempEnd = startTime; tempStart = time; }

        // 중간에 다른 사람의 예약(disabled)이 끼어있는지 검증
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

        // 검증 완료 시 범위 확정 및 UI 색칠
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

    // ----------------------------------------------------------------
    // [분기 B] 🔵 TARGET 모드: 클릭한 곳을 시작점으로 필요한 만큼 자동 연속 선택
    // ----------------------------------------------------------------
    const targetVal = Number(document.getElementById("targetPercent")?.value || 0);
    const requiredMinutes = calculateRequiredMinutes(targetVal); 

    // 기존 선택 클래스 싹 지우기 (초기화)
    document.querySelectorAll(".ev-time-btn").forEach(btn => btn.classList.remove("active", "in-range"));

    if (requiredMinutes === 0) {
        startTime = time;
        endTime = time;
        element.classList.add("active");
        document.getElementById("summaryTime").innerText = "시작 시간: " + startTime;
        return;
    }

    const allButtons = Array.from(document.querySelectorAll(".ev-time-btn"));
    const startIndex = allButtons.indexOf(element); 
    const neededButtonCount = Math.ceil(requiredMinutes / 30); 

    let selectedSlots = [];
    let isBlocked = false;

    for (let i = 0; i < neededButtonCount; i++) {
        const currentBtn = allButtons[startIndex + i];
        if (!currentBtn || currentBtn.classList.contains("disabled")) {
            isBlocked = true;
            break;
        }
        selectedSlots.push(currentBtn);
    }

    if (isBlocked) {
        alert("선택하신 시간대에는 다음 예약이나 마감 시간으로 인해 목표 충전량을 모두 채울 수 없습니다. 다른 시작 시간을 고르거나 목표 충전량을 낮춰주세요.");
        startTime = null;
        endTime = null;
        document.getElementById("summaryTime").innerText = "-";
        return;
    }

    startTime = selectedSlots[0].dataset.time;
    endTime = selectedSlots[selectedSlots.length - 1].dataset.time;

    selectedSlots.forEach((btn, index) => {
        if (index === 0 || index === selectedSlots.length - 1) {
            btn.classList.add("active");
        } else {
            btn.classList.add("in-range");
        }
    });

    const date = document.getElementById("reservationDate").value;
    document.getElementById("startTime").value = date + " " + startTime + ":00";
    document.getElementById("endTime").value = date + " " + endTime + ":00";
    document.getElementById("summaryDate").innerText = date;
    document.getElementById("summaryTime").innerText = startTime + " ~ " + endTime;
}

// ==========================================
// 7-1. TARGET 슬라이더 연동형 자동 시간 불켜기 함수 (추가)
// ==========================================
function syncTimeButtonsByTarget() {
    if (reservationType !== "TARGET") return;
    
    const firstAvailable = document.querySelector(".ev-time-btn:not(.disabled)");
    if (!firstAvailable) return;
    
    // 첫 활성화 버튼을 기반으로 자동 범위 지정을 수행해 화면을 리렌더링합니다.
    selectTime(firstAvailable, firstAvailable.dataset.time);
}

// ==========================================
// 8. 빈 슬롯 중 "가장 길게 연속된 시간" 계산
// ==========================================
function calculateMaxAvailableInterval() {
    const buttons = document.querySelectorAll(".ev-time-btn");
    let maxMinutes = 0;
    let currentContinuous = 0;

    buttons.forEach((btn) => {
        const isDisabled = btn.classList.contains("disabled") || 
                           btn.disabled === true || 
                           window.getComputedStyle(btn).pointerEvents === 'none';

        if (!isDisabled) {
            currentContinuous += 30; 
            if (currentContinuous > maxMinutes) {
                maxMinutes = currentContinuous;
            }
        } else {
            currentContinuous = 0; 
        }
    });

    maxContinuousMinutes = maxMinutes;
    console.log("@# [실시간 연산 확인] 현재 기준 최대 연속 가용 시간: " + maxContinuousMinutes + "분");
}

// ==========================================
// 9. 실시간 예약/과거 시간대 비활성화 및 동기화 처리
// ==========================================
async function loadReservedTimes() {
    if (isFetchingReservedTimes) return;
    
    const chargerId = selectedChargerId; 
    const date = document.getElementById("reservationDate")?.value;
    if (!date) return;

    isFetchingReservedTimes = true;

    document.querySelectorAll(".ev-time-btn").forEach(btn => {
        btn.classList.remove("disabled", "active", "in-range");
    });

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`; 

    if (date === todayStr) {
        const currentHours = now.getHours();
        const currentMinutes = now.getMinutes();

        document.querySelectorAll(".ev-time-btn").forEach(btn => {
            const t = btn.dataset.time; 
            const [h, m] = t.split(":").map(Number);

            if (h < currentHours || (h === currentHours && m <= currentMinutes)) {
                btn.classList.add("disabled"); 
            }
        });
    }

    try {
        const sendChargerId = chargerId ? chargerId : 0;
        let targetParam = "";
        if (reservationType === "TARGET") {
            const currentPercent = document.getElementById("targetPercent")?.value || 0;
            targetParam = `&targetPercent=${currentPercent}`;
        }

        const sendStationId = selectedStationId ? selectedStationId : 0;
        const url = `/reservation/reserved-times?chargerId=${sendChargerId}&date=${date}&stationId=${sendStationId}${targetParam}`;
        
        const response = await fetch(url);
        
        if (response.ok) {
            const reservedList = await response.json();
            
            reservedList.forEach(r => {
                if (!r.startTime || !r.endTime) return; 
                
                const startMatch = r.startTime.match(/(\d{2}):(\d{2})/);
                const endMatch = r.endTime.match(/(\d{2}):(\d{2})/);
                
                if (!startMatch || !endMatch) return;
                
                let sH = Number(startMatch[1]);
                let sM = Number(startMatch[2]);
                let eH = Number(endMatch[1]);
                let eM = Number(endMatch[2]);
                
                sH = (sH + 9) % 24;
                eH = (eH + 9) % 24;
                
                const start = `${String(sH).padStart(2, '0')}:${String(sM).padStart(2, '0')}`;
                const end = `${String(eH).padStart(2, '0')}:${String(eM).padStart(2, '0')}`;
                
                console.log(`@# [9시간 시차 교정 완료]: ${start} ~ ${end}`);
                
                document.querySelectorAll(".ev-time-btn").forEach(btn => {
                    const t = btn.dataset.time; 
                    if (btn.classList.contains("disabled") || (t >= start && t < end)) {
                        btn.classList.add("disabled"); 
                    }
                });
            });

            calculateMaxAvailableInterval();

            // 🟢 [버그 픽스 무한 루프 차단 및 연동]
            // 두 번째 인자로 무한 루프 방지용 고유 상태 flag(false)를 넘겨 순환 참조를 제거합니다.
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
// 10. 예약 최종 제출 및 컨트롤러 조율
// ==========================================
function submitReservation() {
    const type = document.getElementById("reservationType").value;
    
    if (type === "TIME") {
        if (startTime == null || endTime == null) {
            alert("예약 시간을 선택하세요.");
            return;
        }
    } else if (type === "TARGET") {
        // TARGET 모드일 때도 자동으로 잡힌 가용 예약 시작/종료 시간이 폼 데이터에 실리도록 덮어쓰기 방지 처리
        if (!startTime || !endTime) {
            alert("예약 가능한 시간대가 존재하지 않아 예약을 진행할 수 없습니다.");
            return;
        }
    }
    
    document.getElementById("reservationForm").submit();
}

// ==========================================
// 11. DOM 렌더링 직후 초기화 리스너
// ==========================================
window.addEventListener("DOMContentLoaded", () => {
    document.getElementById("reservationDate")?.addEventListener("change", loadReservedTimes);
    
    const slider = document.getElementById("targetPercent");
    if (slider) {
        slider.value = 0; 
        updateSliderBackground(slider.value);
        // 슬라이더 조작 시 실시간 동기화 바인딩
        slider.addEventListener("input", (e) => {
            changeTargetPercent(e.target.value, false);
        });
    }
    
    const textDisplay = document.getElementById("chargeValueText") || document.getElementById("targetPercentText");
    if (textDisplay) {
        textDisplay.innerText = "0%";
    }
});