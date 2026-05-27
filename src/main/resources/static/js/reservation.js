// ==========================================
// 0. 전역 변수 초기화 및 가드
// ==========================================
if (typeof selectedStationId === 'undefined') { var selectedStationId = null; }
if (typeof selectedChargerId === 'undefined') { var selectedChargerId = null; }
if (typeof reservationType === 'undefined') { var reservationType = "TIME"; }
if (typeof startTime === 'undefined') { var startTime = null; }
if (typeof endTime === 'undefined') { var endTime = null; }
if (typeof maxContinuousMinutes === 'undefined') { var maxContinuousMinutes = 1440; }

// ==========================================
// 1. 단계 제어 (Step View Control)
// ==========================================
function moveStep(step) {
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
	electedStationId = Number(stationId);
    
    document.querySelectorAll('.border-blue-500's).forEach(el => el.classList.remove('border-blue-500', 'bg-blue-50'));
    element.classList.add('border-blue-500', 'bg-blue-50');
    
    try {
        const res = await fetch(`/reservation/api/chargers?stationId=` + stationId);
        const chargers = await res.json();
        const container = document.getElementById("chargerListContainer");
        
        if (chargers.length > 0) {
            container.innerHTML = chargers.map(c => {
                const statusLower = c.status ? c.status.toLowerCase() : 'available';
                
                // 1. 점검 중
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
                
                // 2. 사용 중 상태
                if (statusLower === 'charging' || statusLower === 'occupied') {
                    return `
                        <div class="border rounded-lg p-3 border-amber-200 bg-amber-50/50 cursor-not-allowed opacity-80" onclick="alert('현재 다른 차량이 충전 중입니다.')">
                            <div class="flex justify-between items-center mb-1">
                                <h3 class="font-bold text-amber-900 text-sm">${c.connectorType}</h3>
                                <span class="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">사용 중</span>
                            </div>
                            <p class="text-amber-700 text-xs tracking-tight">${c.powerKw}kW 충전</p>
                        </div>`;
                }

                // 3. 일반 사용 가능 상태
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
// 3. 충전기 선택 및 건너뛰기 액션 (🌟 오타 교정 완료)
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
// 4. 예약 설정 옵션 분기 제어 (타입 전환 시 시간 다시 계산)
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
        document.getElementById("timeBox").classList.add("hidden"); 
        document.getElementById("targetBox").classList.remove("hidden");
        
        // 🌟 순서 꼬임 방지: 데이터를 새로 긁어오면서 순차적으로 계산되도록 유도
        loadReservedTimes();
    }
}

// ==========================================
// 4-2. 목표 충전량 변경 시 실시간 예약 시간대 리로드 트리거 🌟
// ==========================================
function changeTargetPercent(value, isQuick = false) {
    const chargerKw = 50.0; // 급속 50kW 기준
    const batteryCapacity = 70.0; 
    const currentPercent = 20.0; // 현재 잔량 20% 가정
    
    const targetVal = Number(value);
    if (targetVal <= currentPercent) return;

    // 1. 필요한 소요 시간 연산 (안전 버퍼 15분 포함)
    const requiredKwh = batteryCapacity * ((targetVal - currentPercent) / 100.0);
    let durationHours = requiredKwh / chargerKw;
    let requiredMinutes = Math.ceil(durationHours * 60) + 15; 

    if (targetVal > 80) { // 80% 초과 급속 가중치 지연 연산
        requiredMinutes += Math.ceil(((batteryCapacity * (targetVal - 80) / 100.0) / chargerKw) * 0.5 * 60);
    }

    console.log(`@# [요구량 검증] 목표 ${targetVal}% 설정 시 필요 시간: ${requiredMinutes}분 / 가용 시간: ${maxContinuousMinutes}분`);

    // 2. 🌟 강력 가드: 요구 시간이 가용 시간을 초과했거나, 애초에 남은 자리가 아예 없을 때(0분)
    if (requiredMinutes > maxContinuousMinutes || maxContinuousMinutes <= 0) {
        alert(`죄송합니다. 현재 남은 예약 가능 시간(${maxContinuousMinutes}분)이 부족하여 목표 충전량을 더 이상 늘릴 수 없습니다. (필요 예상: ${requiredMinutes}분)`);
        
        const slider = document.getElementById("targetPercent");
        if (slider) {
            // 시간이 아예 전멸(0분)했다면 바닥(최소치 5%)으로 튕겨내고, 
            // 일부 남아있다면 현재 안전하게 충전 가능한 임시 수치(기본 잔량 20%)로 강제 락을 겁니다.
            const fallbackValue = maxContinuousMinutes <= 15 ? 5 : 20;
            slider.value = fallbackValue;
            updateSliderBackground(fallbackValue);
            document.getElementById("targetPercentText").innerText = fallbackValue + "%";
            if (document.getElementById("summaryTarget")) {
                document.getElementById("summaryTarget").innerText = fallbackValue + "%";
            }
        }
        return;
    }

    // 3. 검증 통과 시 정상 반영
    document.getElementById("targetPercentText").innerText = targetVal + "%";
    if (document.getElementById("summaryTarget")) {
        document.getElementById("summaryTarget").innerText = targetVal + "%";
    }
    updateSliderBackground(targetVal);
}

// ==========================================
// 5. 드래그앤드롭 슬롯형 시간 선택 알고리즘
// ==========================================
function selectTime(element, time) {
    if (element.classList.contains("disabled")) return;
    if (startTime !== null && endTime !== null) {
        startTime = null;
        endTime = null;
        document.querySelectorAll(".ev-time-btn").forEach(btn => btn.classList.remove("active", "in-range"));
    }
    if (startTime === null) {
        startTime = time;
        element.classList.add("active");
        document.getElementById("summaryReserve").innerText = "시작 시간: " + startTime;
        return;
    }
    if (startTime === time) {
        startTime = null;
        element.classList.remove("active");
        document.getElementById("summaryReserve").innerText = "-";
        return;
    }
    let tempStart = startTime;
    let tempEnd = time;
    if (time < startTime) { tempEnd = startTime; tempStart = time; }

    let hasDisabledSlot = false;
    document.querySelectorAll(".ev-time-btn").forEach(btn => {
        const t = btn.dataset.time;
        if (t >= tempStart && t <= tempEnd && btn.classList.contains("disabled")) { hasDisabledSlot = true; }
    });
    if (hasDisabledSlot) { alert("선택하신 구간 사이에 이미 예약된 시간이 포함되어 있습니다."); return; }

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
    document.getElementById("summaryReserve").innerText = startTime + " ~ " + endTime;
}

function changeTargetPercent(value) {
    document.getElementById("targetPercentText").innerText = value + "%";
    document.getElementById("summaryReserve").innerText = "목표 충전량 " + value + "%";
}

function quickTarget(value) {
    document.getElementById("targetPercent").value = value;
    changeTargetPercent(value);
}

// ==========================================
// 6. 예약 최종 서브밋 및 400에러 프리벤션
// ==========================================
function submitReservation() {
    const type = document.getElementById("reservationType").value;
    
    if (type === "TIME") {
        if (startTime == null || endTime == null) {
            alert("예약 시간을 선택하세요.");
            return;
        }
    } else if (type === "TARGET") {
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        const localISOTime = new Date(now.getTime() - offset).toISOString();
        const formattedNow = localISOTime.replace('T', ' ').substring(0, 19);
        
        document.getElementById("startTime").value = formattedNow;
        document.getElementById("endTime").value = formattedNow;
    }
    
    document.getElementById("reservationForm").submit();
}

// ==========================================
// 7. 실시간 예약/과거 시간대 비활성화 (양방향 연동 필터링 연산)
// ==========================================
async function loadReservedTimes() {
    const chargerId = selectedChargerId; 
    const date = document.getElementById("reservationDate")?.value;
    if (!date) return;

    // 1. 모든 타임 버튼 클래스 초기 맑은 상태로 세팅
    document.querySelectorAll(".ev-time-btn").forEach(btn => {
        btn.classList.remove("disabled", "active", "in-range");
    });

    // 2. 과거 시간 선제 차단 
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
            const currentPercent = document.getElementById("targetPercent")?.value || 20;
            targetParam = `&targetPercent=${currentPercent}`;
        }

        const sendStationId = selectedStationId ? selectedStationId : 0;
        const url = `/reservation/reserved-times?chargerId=${sendChargerId}&date=${date}&stationId=${sendStationId}${targetParam}`;
        
        const response = await fetch(url);
        
        if (response.ok) {
            const reservedList = await response.json();
            
            // 3. DB 예약 데이터 중복 락 처리
            reservedList.forEach(r => {
                if (!r.startTime || !r.endTime) return; 
                const startDate = new Date(r.startTime);
                const endDate = new Date(r.endTime);
                
                const startHours = String(startDate.getHours()).padStart(2, '0');
                const startMinutes = String(startDate.getMinutes()).padStart(2, '0');
                const start = `${startHours}:${startMinutes}`;
                
                const endHours = String(endDate.getHours()).padStart(2, '0');
                const endMinutes = String(endDate.getMinutes()).padStart(2, '0');
                const end = `${endHours}:${endMinutes}`;
                
                document.querySelectorAll(".ev-time-btn").forEach(btn => {
                    const t = btn.dataset.time;
                    if (t >= start && t < end) {
                        btn.classList.add("disabled"); // 🌟 완벽 누적 락
                    }
                });
            });

            // 4. 연속 가용 시간 최종 계산 가동
            calculateMaxAvailableInterval();

            // 5. TARGET 모드일 때 슬라이더 제한 가드 연동
            if (reservationType === "TARGET") {
                const currentSliderVal = document.getElementById("targetPercent")?.value || 20;
                changeTargetPercent(currentSliderVal, 'init');
            }
        }
    } catch (error) { 
        console.error("예약 시간 조회 실패:", error); 
    }
}

// ==========================================
// 슬라이더 바 왼쪽 파란색 채우기 연산 함수 🌟
// ==========================================
function updateSliderBackground(value) {
    const slider = document.getElementById("targetPercent");
    if (!slider) return;
    const percentage = ((value - slider.min) / (slider.max - slider.min)) * 100;
    slider.style.background = `linear-gradient(to right, #2563eb 0%, #2563eb ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`;
}

function changeTargetPercent(value, isQuick = false) {
    const chargerKw = 50.0; // 급속 50kW 기준
    const batteryCapacity = 70.0; 
    const currentPercent = 20.0; // 현재 잔량 20% 가정
    
    const targetVal = Number(value);
    
    // 현재 잔량보다 작으면 리턴
    if (targetVal <= currentPercent) {
        const slider = document.getElementById("targetPercent");
        if (slider) {
            slider.value = currentPercent;
            updateSliderBackground(currentPercent);
            document.getElementById("targetPercentText").innerText = currentPercent + "%";
        }
        return;
    }

    // 1. 필요한 소요 시간 연산 (안전 버퍼 15분 포함)
    const requiredKwh = batteryCapacity * ((targetVal - currentPercent) / 100.0);
    let durationHours = requiredKwh / chargerKw;
    let requiredMinutes = Math.ceil(durationHours * 60) + 15; 

    if (targetVal > 80) { // 80% 초과 급속 가중치 지연 연산
        requiredMinutes += Math.ceil(((batteryCapacity * (targetVal - 80) / 100.0) / chargerKw) * 0.5 * 60);
    }

    // 2. 🌟 강력 실시간 가드: 요구 시간이 가용 시간을 초과했거나, 남은 자리가 아예 없을 때 (0분)
    if (requiredMinutes > maxContinuousMinutes || maxContinuousMinutes <= 0) {
        
        // 마우스 드래그 도중 얼럿창이 계속 뜨면 렉이 걸리므로, 
        // 퀵 버튼 클릭(isQuick)이거나 사용자가 마우스를 놓았을 때만 얼럿을 띄웁니다.
        if (isQuick) {
            alert(`죄송합니다. 현재 남은 예약 가능 시간(${maxContinuousMinutes}분)이 부족하여 목표 충전량을 더 늘릴 수 없습니다.`);
        }

        const slider = document.getElementById("targetPercent");
        if (slider) {
            // 시간이 아예 없으면 최소 한도(5% 혹은 20%)로 완전히 끌어내림
            const fallbackValue = maxContinuousMinutes <= 15 ? 20 : 20; 
            
            // 🌟 핵심: 브라우저가 임의로 칠한 마우스 위치를 무시하고 
            // 강제로 실제 내부 값과 배경 그라데이션을 고정값으로 덮어써 버립니다.
            slider.value = fallbackValue; 
            document.getElementById("targetPercentText").innerText = fallbackValue + "%";
            if (document.getElementById("summaryTarget")) {
                document.getElementById("summaryTarget").innerText = fallbackValue + "%";
            }
            updateSliderBackground(fallbackValue); 
        }
        return;
    }

    // 3. 검증 통과 시에만 마우스 위치에 맞춰 정상적으로 파란색 확장
    document.getElementById("targetPercentText").innerText = targetVal + "%";
    if (document.getElementById("summaryTarget")) {
        document.getElementById("summaryTarget").innerText = targetVal + "%";
    }
    updateSliderBackground(targetVal);
}

function quickTarget(value) {
    const slider = document.getElementById("targetPercent");
    if (slider) {
        slider.value = value;
        changeTargetPercent(value);
    }
}

// ==========================================
// 시간 선택 시 예약 확인 화면 동기화 보완 🌟
// ==========================================
function selectTime(element, time) {
    // 🌟 [최강 가드] 이미 예약되었거나 과거 시간이라 disabled 클래스가 붙어있다면 클릭 이벤트 자체를 완전히 파괴합니다.
    if (element.classList.contains("disabled") || element.disabled === true) {
        return; 
    }
    
    if (startTime !== null && endTime !== null) {
        startTime = null;
        endTime = null;
        document.querySelectorAll(".ev-time-btn").forEach(btn => btn.classList.remove("active", "in-range"));
    }
    if (startTime === null) {
        startTime = time;
        element.classList.add("active");
        document.getElementById("summaryTime").innerText = "시작 시간: " + startTime;
        return;
    }
    if (startTime === time) {
        startTime = null;
        element.classList.remove("active");
        document.getElementById("summaryTime").innerText = "-";
        return;
    }
    let tempStart = startTime;
    let tempEnd = time;
    if (time < startTime) { tempEnd = startTime; tempStart = time; }

    let hasDisabledSlot = false;
    document.querySelectorAll(".ev-time-btn").forEach(btn => {
        const t = btn.dataset.time;
        if (t >= tempStart && t <= tempEnd && btn.classList.contains("disabled")) { hasDisabledSlot = true; }
    });
    if (hasDisabledSlot) { alert("선택하신 구간 사이에 이미 예약된 시간이 포함되어 있습니다."); return; }

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
}

// ==========================================
// 🌟 3단계 진입 전 데이터 셋 변경 가드 추가
// ==========================================
// 기존 moveStep 함수에 3단계 진입 시 선택하지 않은 값들의 디폴트 텍스트 마킹 추가
const originalMoveStep = moveStep; // 기존 함수 래핑 유도 또는 직접 교체
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
    
    // 기존 페이징/스텝 토글 로직 작동
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
            circle?.removeProperty ? circle.removeProperty("bg-blue-600") : circle?.classList.remove("bg-blue-600", "text-white");
            circle?.classList.add("bg-gray-100", "text-gray-400");
            txt?.classList.remove("font-medium", "text-gray-900");
            txt?.classList.add("text-gray-400");
        }
    });
}

// ==========================================
// 핵심: 그날의 빈 슬롯 중 "가장 길게 연속된 시간" 계산 알고리즘
// ==========================================
// ==========================================
// 3. [보완] 빈 슬롯 중 "가장 길게 연속된 시간" 계산 알고리즘
// ==========================================
function calculateMaxAvailableInterval() {
    const buttons = document.querySelectorAll(".ev-time-btn");
    let maxMinutes = 0;
    let currentContinuous = 0;

    buttons.forEach((btn) => {
        // 🌟 버그 방지 가드: disabled 클래스가 있거나, onclick이 없거나, 
        // 스타일상 흐려져 있거나 pointer-events가 막힌 모든 경우를 '예약됨/사용불가'로 판단합니다.
        const isDisabled = btn.classList.contains("disabled") || 
                           btn.disabled === true || 
                           btn.onclick === null ||
                           window.getComputedStyle(btn).pointerEvents === 'none';

        if (!isDisabled) {
            currentContinuous += 30; // 가용 슬롯이면 30분 누적
            if (currentContinuous > maxMinutes) {
                maxMinutes = currentContinuous;
            }
        } else {
            currentContinuous = 0; // 단 1칸이라도 막혀있다면 연속성 즉시 단절
        }
    });

    maxContinuousMinutes = maxMinutes;
    // 💡 F12 콘솔에서 실제로 몇 분으로 계산되어 찍히는지 눈으로 꼭 확인해 보세요!
    console.log("@# [실시간 연산 확인] 현재 기준 최대 연속 가용 시간: " + maxContinuousMinutes + "분");
}

// ==========================================
// 4. [보완] 충전량 변경 시 실시간 초과 제약 및 강력 가드 락
// ==========================================
function changeTargetPercent(value, isQuick = false) {
    const chargerKw = 50.0; // 급속 50kW 기준
    const batteryCapacity = 70.0; 
    const currentPercent = 20.0; // 현재 잔량 20% 가정
    
    const targetVal = Number(value);
    if (targetVal <= currentPercent) return;

    // 1. 필요한 소요 시간 연산 (안전 버퍼 15분 포함)
    const requiredKwh = batteryCapacity * ((targetVal - currentPercent) / 100.0);
    let durationHours = requiredKwh / chargerKw;
    let requiredMinutes = Math.ceil(durationHours * 60) + 15; 

    if (targetVal > 80) { // 80% 초과 급속 가중치 지연 연산
        requiredMinutes += Math.ceil(((batteryCapacity * (targetVal - 80) / 100.0) / chargerKw) * 0.5 * 60);
    }

    console.log(`@# [요구량 검증] 목표 ${targetVal}% 설정 시 필요 시간: ${requiredMinutes}분 / 가용 시간: ${maxContinuousMinutes}분`);

    // 2. 🌟 강력 가드: 요구 시간이 가용 시간을 초과했거나, 애초에 남은 자리가 아예 없을 때(0분)
    if (requiredMinutes > maxContinuousMinutes || maxContinuousMinutes <= 0) {
        alert(`죄송합니다. 현재 남은 예약 가능 시간(${maxContinuousMinutes}분)이 부족하여 목표 충전량을 더 이상 늘릴 수 없습니다. (필요 예상: ${requiredMinutes}분)`);
        
        const slider = document.getElementById("targetPercent");
        if (slider) {
            // 시간이 아예 전멸(0분)했다면 바닥(최소치 5%)으로 튕겨내고, 
            // 일부 남아있다면 현재 안전하게 충전 가능한 임시 수치(기본 잔량 20%)로 강제 락을 겁니다.
            const fallbackValue = maxContinuousMinutes <= 15 ? 5 : 20;
            slider.value = fallbackValue;
            updateSliderBackground(fallbackValue);
            document.getElementById("targetPercentText").innerText = fallbackValue + "%";
            if (document.getElementById("summaryTarget")) {
                document.getElementById("summaryTarget").innerText = fallbackValue + "%";
            }
        }
        return;
    }

    // 3. 검증 통과 시 정상 반영
    document.getElementById("targetPercentText").innerText = targetVal + "%";
    if (document.getElementById("summaryTarget")) {
        document.getElementById("summaryTarget").innerText = targetVal + "%";
    }
    updateSliderBackground(targetVal);
}

// DOM 로드 완료 후 리스너 동기화
// 페이지가 처음 켜질 때 슬라이더 모양을 50% 왼쪽 파란색으로 정방향 초기화해 둡니다.
window.addEventListener("DOMContentLoaded", () => {
    document.getElementById("reservationDate")?.addEventListener("change", loadReservedTimes);
    
    // 🌟 첫 진입 시 슬라이더 바 좌측 컬러링 초기화 (오른쪽에 파란색 가 있던 현상 해결)
    const slider = document.getElementById("targetPercent");
    if (slider) {
        updateSliderBackground(slider.value);
    }
});