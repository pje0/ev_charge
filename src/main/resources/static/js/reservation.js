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
if (typeof selectedChargerKw === 'undefined') { var selectedChargerKw = 50.0; } // 기본값 50

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
    
    startTime = null;
    endTime = null;
    document.getElementById("startTime").value = "";
    document.getElementById("endTime").value = "";
    document.getElementById("summaryTime").innerText = "-";
    
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
                             onclick="selectCharger(this, '${c.id}', '${c.connectorType}', ${c.powerKw})">
                            <div class="flex justify-between items-center mb-1">
                                <h3 class="font-bold text-amber-900 text-sm">${c.connectorType}</h3>
                                <span class="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">현재 사용 중 (예약 가능)</span>
                            </div>
                            <p class="text-amber-700 text-xs tracking-tight">${c.powerKw}kW 충전</p>
                        </div>`;
                }

                return `
                    <div class="border border-gray-200 rounded-lg p-3 cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition bg-white" 
                         onclick="selectCharger(this, '${c.id}', '${c.connectorType}', ${c.powerKw})">
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
        
        await loadReservedTimes();

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
    selectedChargerKw = Number(powerKw || 50.0); // 🟢 충전기 출력 kW 저장
    document.getElementById("summaryCharger").innerText = chargerName;
    
    // 🟢 [핵심 추가] 다른 충전기를 클릭하는 순간, 기존 충전기에서 선택했던 시간 정보를 유저 모르게 싹 비웁니다.
    startTime = null;
    endTime = null;
    if (document.getElementById("startTime")) document.getElementById("startTime").value = "";
    if (document.getElementById("endTime")) document.getElementById("endTime").value = "";
    if (document.getElementById("summaryTime")) document.getElementById("summaryTime").innerText = "-";
    
    // 버튼들의 선택 스타일(active, in-range)도 깨끗이 지웁니다.
    document.querySelectorAll(".ev-time-btn").forEach(btn => btn.classList.remove("active", "in-range"));

    moveStep(2);
    
    // 🟢 [수정] 충전기 ID가 완전히 바인딩된 직후 안전하게 예약 시간대를 호출합니다.
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
    // 🟢 고정값 50.0 대신 현재 선택된 충전기의 실제 출력 kW를 대입합니다.
    const chargerKw = selectedChargerKw; 
    const batteryCapacity = 70.0; 
    const currentPercent = 0.0; 

    if (targetVal <= currentPercent) return 0;

    const requiredKwh = batteryCapacity * ((targetVal - currentPercent) / 100.0);
    let durationHours = requiredKwh / chargerKw;
    let requiredMinutes = Math.ceil(durationHours * 60) + 15; 

    // 완속 충전기(7kW)는 보통 80% 구간에서 급속처럼 충전 속도가 급격히 줄어들지 않으므로 
    // 급속(출력이 큰 경우)일 때만 80% 가드를 주는 것이 더 정확합니다.
    if (chargerKw > 20 && targetVal > 80) { 
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

    // 🟢 [강력 초기화] 다른 충전기를 누를 때마다 이전 잠금 스타일을 찌꺼기 없이 완벽하게 리셋
    document.querySelectorAll(".ev-time-btn").forEach(btn => {
        btn.classList.remove("disabled", "active", "in-range");
        btn.style.removeProperty("background-color");
        btn.style.removeProperty("color");
        btn.style.removeProperty("pointer-events");
        btn.style.removeProperty("cursor");
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
            
			// 3. 🌟 DB 예약 데이터 2차 누적 잠금 (포맷 무관 분 단위 숫자 비교 보정판)
            reservedList.forEach(r => {
                if (!r.startTime || !r.endTime) return; 
                
                // 어떤 포맷이 와도 시/분만 안전하게 파싱하는 함수
                const parseToMinutes = (timeStr) => {
                    const match = timeStr.match(/(\d{2}):(\d{2})/);
                    if (!match) return null;
                    let h = Number(match[1]);
                    let m = Number(match[2]);
                    return (h * 60) + m; // 분 단위로 변환 (예: 02:30 -> 150분)
                };

                let startMin = parseToMinutes(r.startTime);
                let endMin = parseToMinutes(r.endTime);

                if (startMin === null || endMin === null) return; 

                // 🟢 [시차 보정] DB 값이 UTC 기준일 테므로 9시간(540분)을 더해 KST로 변환
                startMin = (startMin + 540) % 1440;
                endMin = (endMin + 540) % 1440;
                
                // 만약 종료 시간이 자정을 넘어가거나 역전될 때를 대비한 안전 Guard
                if (endMin <= startMin) endMin += 1440;

                console.log(`@# [숫자 변환 잠금선]: ${startMin}분 ~ ${endMin}분`);
                
                // 화면의 타임 버튼들을 순회
                document.querySelectorAll(".ev-time-btn").forEach(btn => {
                    const tStr = btn.dataset.time; // 예: "11:30"
                    const btnMin = parseToMinutes(tStr);
                    
                    if (btnMin === null) return;

                    // 🟢 [핵심 비교] 버튼의 분(Minute)이 예약 시작분과 종료분 사이에 정확히 물리는지 검사
                    if (btnMin >= startMin && btnMin < endMin) {
                        // 1. 논리 및 클래스 잠금
                        btn.classList.add("disabled"); 
                        
                        // 2. 인라인 CSS 스타일 강제 주입 (눈으로 확실히 보이게 처리)
                        btn.style.setProperty("background-color", "#e5e7eb", "important"); // 연회색
                        btn.style.setProperty("color", "#9ca3af", "important");           // 흐린 글자
                        btn.style.setProperty("pointer-events", "none", "important");      // 클릭 금지
                        btn.style.setProperty("cursor", "not-allowed", "important");
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
    const date = document.getElementById("reservationDate")?.value;
    
    // 현재 날짜 및 시간 구하기
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`; 

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
    }

    // 🟢 [추가] 과거 시간 제출 방지 가드 락
    if (date === todayStr && startTime) {
        const [startH, startM] = startTime.split(":").map(Number);
        if (startH < now.getHours() || (startH === now.getHours() && startM < now.getMinutes())) {
            alert("현재 시간보다 이전의 시간대는 예약할 수 없습니다. 다른 시간대를 골라주세요.");
            return;
        }
    }
    
    if (!date) {
        alert("예약 날짜를 선택해 주세요.");
        return;
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