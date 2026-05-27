// ==========================================
// 0. 전역 변수 초기화 가드
// ==========================================
if (typeof selectedChargerId === 'undefined') { var selectedChargerId = null; }
if (typeof reservationType === 'undefined') { var reservationType = "TIME"; }
if (typeof startTime === 'undefined') { var startTime = null; }
if (typeof endTime === 'undefined') { var endTime = null; }

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
            el.classList.add("ev-step-on");
            circle?.classList.add("bg-blue-600", "text-white");
            circle?.classList.remove("bg-gray-200");
            txt?.classList.add("font-bold", "text-blue-600");
        } else {
            el.classList.remove("ev-step-on");
            circle?.classList.remove("bg-blue-600", "text-white");
            circle?.classList.add("bg-gray-200");
            txt?.classList.remove("font-bold", "text-blue-600");
        }
    });
}

// ==========================================
// 2. 충전기 목록 로드 및 상태별 분기 (Ajax)
// ==========================================
async function loadChargers(stationId, element) {
    if (!stationId) return;
    
    document.querySelectorAll('.border-blue-500').forEach(el => el.classList.remove('border-blue-500', 'bg-blue-50'));
    element.classList.add('border-blue-500', 'bg-blue-50');
    
    try {
        const res = await fetch(`/reservation/api/chargers?stationId=` + stationId);
        const chargers = await res.json();
        const container = document.getElementById("chargerListContainer");
        
        if (chargers.length > 0) {
            container.innerHTML = chargers.map(c => {
                const statusLower = c.status ? c.status.toLowerCase() : 'available';
                
                // 점검 중 / 서비스 중단 상태
                if (statusLower === 'maintenance' || statusLower === 'out_of_service') {
                    return `
                        <div class="border border-gray-300 bg-gray-100 opacity-60 rounded-xl p-5 select-none pointer-events-none">
                            <div class="flex justify-between items-center mb-3">
                                <h3 class="font-bold text-lg text-gray-500">${c.connectorType}</h3>
                                <span class="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-medium">점검 중</span>
                            </div>
                            <p class="text-gray-400 text-sm">${c.powerKw}kW 충전</p>
                        </div>`;
                }
                
                // 사용 중 상태
                if (statusLower === 'charging' || statusLower === 'occupied') {
                    return `
                        <div class="border rounded-xl p-5 border-amber-300 bg-amber-50 cursor-not-allowed opacity-80" onclick="alert('현재 다른 차량이 충전 중입니다.')">
                            <div class="flex justify-between items-center mb-3">
                                <h3 class="font-bold text-lg text-amber-900">${c.connectorType}</h3>
                                <span class="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded font-medium">사용 중</span>
                            </div>
                            <p class="text-amber-700 text-sm">${c.powerKw}kW 충전</p>
                        </div>`;
                }

                // 일반 사용 가능 상태
                return `
                    <div class="border rounded-xl p-5 cursor-pointer hover:border-blue-500 transition bg-white" 
                         onclick="selectCharger(this, '${c.id}', '${c.connectorType}')">
                        <div class="flex justify-between items-center mb-3">
                            <h3 class="font-bold text-lg text-gray-900">${c.connectorType}</h3>
                            <span class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-medium">사용 가능</span>
                        </div>
                        <p class="text-gray-500 text-sm">${c.powerKw}kW 충전</p>
                    </div>`;
            }).join('');
        } else {
            container.innerHTML = '<div class="col-span-2 text-center py-20 text-gray-400">등록된 충전기가 없습니다.</div>';
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
// 4. 예약 설정 옵션 분기 제어
// ==========================================
function selectReservationType(type) {
    reservationType = type;
    document.getElementById("reservationType").value = type;
    document.querySelectorAll(".ev-res-type-btn").forEach(btn => btn.classList.remove("active"));

    if(type === "TIME") {
        document.getElementById("btnTime").classList.add("active");
        document.getElementById("timeBox").classList.remove("hidden");
        document.getElementById("targetBox").classList.add("hidden");
    } else {
        document.getElementById("btnTarget").classList.add("active");
        document.getElementById("timeBox").classList.add("hidden");
        document.getElementById("targetBox").classList.remove("hidden");
    }
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
// 7. 실시간 예약/과거 시간대 비활성화 (MIME/시차 보정형)
// ==========================================
async function loadReservedTimes() {
    const chargerId = selectedChargerId; 
    const date = document.getElementById("reservationDate")?.value;
    if (!date) return;

    document.querySelectorAll(".ev-time-btn").forEach(btn => {
        btn.classList.remove("disabled");
        btn.onclick = function() { selectTime(this, this.dataset.time); }; 
    });

    try {
        const sendChargerId = chargerId ? chargerId : 0;
        const url = `/reservation/reserved-times?chargerId=${sendChargerId}&date=${date}`;
        
        const response = await fetch(url);
        if (response.ok) {
            const reservedList = await response.json();
            
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
                        btn.classList.add("disabled");
                        btn.classList.remove("active", "in-range"); 
                        btn.onclick = null; 
                    }
                });
            });
        }
    } catch (error) { 
        console.error("예약 시간 조회 실패:", error); 
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (date === todayStr) {
        const now = new Date();
        const currentHours = now.getHours();
        const currentMinutes = now.getMinutes();
        document.querySelectorAll(".ev-time-btn").forEach(btn => {
            const t = btn.dataset.time; 
            const [h, m] = t.split(":").map(Number);
            if (h < currentHours || (h === currentHours && m < currentMinutes)) {
                btn.classList.add("disabled"); 
                btn.classList.remove("active", "in-range"); 
                btn.onclick = null;
            }
        });
    }
}

// DOM 로드 완료 후 리스너 동기화
window.addEventListener("DOMContentLoaded", () => {
    document.getElementById("reservationDate")?.addEventListener("change", loadReservedTimes);
});