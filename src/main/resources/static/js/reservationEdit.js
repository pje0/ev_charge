// =========================================================================
// 🌐 EV 예약 수정 시스템 클라이언트 코어 스크립트 (reservationEdit.js)
// =========================================================================

let reservationType = "TIME";
let startTime = null;
let endTime = null;
let selectedChargerKw = 50.0;
let maxContinuousMinutes = 1440;
let isFetchingReservedTimes = false;
let currentReservationId = null;

// ==========================================
// 1. 초기 렌더링 및 이벤트 바인딩
// ==========================================
window.addEventListener("DOMContentLoaded", () => {
    console.log("🛠️ [Edit] 예약 수정 페이지 스크립트 로드 완료");

    currentReservationId = Number(document.getElementById("editReservationId").value);
    selectedChargerKw = Number(document.getElementById("chargerKwHidden").value || 50.0);
    reservationType = document.getElementById("reservationType").value || "TIME";
    
    // 타임 슬롯 00:30 ~ 24:00 자동 생성
    generateTimeSlots();

    // 날짜 변경 리스너
    document.getElementById("reservationDate")?.addEventListener("change", () => {
        startTime = null; 
        endTime = null;
        document.getElementById("startTime").value = "";
        document.getElementById("endTime").value = "";
        loadReservedTimes();
        syncMidnightSlot(); 
    });
    
    // 슬라이더 이벤트
    const slider = document.getElementById("targetPercent");
    if (slider) {
        updateSliderBackground(slider.value);
        slider.addEventListener("input", (e) => {
            changeTargetPercent(e.target.value, true); 
        });
    }

    // 서버에 저장되어 있던 원래 시간 파싱하여 초기화
    const rawStartTime = document.getElementById("startTime").value;
    const rawEndTime = document.getElementById("endTime").value;
    if (rawStartTime && rawEndTime && rawStartTime.includes(" ")) {
        startTime = rawStartTime.split(" ")[1].substring(0, 5);
        endTime = rawEndTime.split(" ")[1].substring(0, 5);
    }

    // 수정 페이지 첫 진입 시 데이터 마스킹 가동
    loadReservedTimes();
});

// 타임 슬롯 DOM 자동 생성기
function generateTimeSlots() {
    const grid = document.getElementById("editTimeSlotGrid");
    if(!grid) return;
    
    let html = "";
    for(let h=0; h<=24; h++){
        const mArr = ["00", "30"];
        for(let m=0; m<2; m++){
            if(h === 0 && m === 0) continue; 
            if(h === 24 && m === 1) continue; 

            const hh = String(h).padStart(2, '0');
            const mm = mArr[m];
            const timeStr = `${hh}:${mm}`;
            html += `<div class="ev-time-btn" data-time="${timeStr}" onclick="selectTime(this, '${timeStr}')">${timeStr}</div>`;
        }
    }
    grid.innerHTML = html;
}

// ==========================================
// 2. 예약 타입 토글 (TIME / TARGET)
// ==========================================
function selectReservationType(type) {
    reservationType = type;
    document.getElementById("reservationType").value = type;
    
    document.getElementById("btnTime").classList.remove("active");
    document.getElementById("btnTarget").classList.remove("active");

    startTime = null;
    endTime = null;
    document.getElementById("startTime").value = "";
    document.getElementById("endTime").value = "";

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
        
        const slider = document.getElementById("targetPercent");
        if(slider) {
            updateSliderBackground(slider.value);
            changeTargetPercent(slider.value, false);
        }
        loadReservedTimes();
    }
}

// ==========================================
// 3. 목표 충전량 슬라이더 제어 로직 (기존과 동일)
// ==========================================
function updateSliderBackground(value) {
    const slider = document.getElementById("targetPercent");
    if (!slider) return;
    const val = Number(value);
    const percentage = ((val - 0) / (100 - 0)) * 100;
    slider.style.background = `linear-gradient(to right, #2563eb 0%, #2563eb ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`;
}

function calculateRequiredMinutes(targetVal) {
    if (targetVal <= 0) return 0;
    const requiredKwh = 70.0 * (targetVal / 100.0);
    let durationHours = requiredKwh / selectedChargerKw;
    let requiredMinutes = Math.ceil(durationHours * 60) + 15; 
    if (selectedChargerKw > 20 && targetVal > 80) { 
        requiredMinutes += Math.ceil(((70.0 * (targetVal - 80) / 100.0) / selectedChargerKw) * 0.5 * 60);
    }
    return requiredMinutes;
}

function changeTargetPercent(value, isUserAction = true) {
    let targetVal = Number(value);
    const slider = document.getElementById("targetPercent");

    document.getElementById("targetPercentText").innerText = targetVal + "%";
    
    if (slider) { slider.value = targetVal; }
    updateSliderBackground(targetVal);

    if(!syncTimeButtonsByTarget()) {
        startTime = null;
        endTime = null;
    }
}

function quickTarget(value) {
    changeTargetPercent(value, true); 
}

// ==========================================
// 4. 타임 슬롯 클릭 제어 (기존 로직 동일)
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
                if (!btn.classList.contains("disabled")) btn.classList.remove("active", "in-range");
            });
        }
        
        if (startTime === null) {
            startTime = time;
            element.classList.add("active");
            return;
        }
        
        if (startTime === time) {
            startTime = null;
            element.classList.remove("active");
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
        return; 
    }

    // TARGET 모드일 때
    document.querySelectorAll(".ev-time-btn").forEach(btn => {
        if (!btn.classList.contains("disabled")) btn.classList.remove("active", "in-range");
    });

    startTime = time; 
    element.classList.add("active");
    syncTimeButtonsByTarget();
}

function syncTimeButtonsByTarget() {
    if (reservationType !== 'TARGET') return true;

    const targetValue = parseInt(document.getElementById("targetPercentText").innerText) || 0;
    const requiredMinutes = calculateRequiredMinutes(targetValue);
    const requiredSlots = Math.ceil(requiredMinutes / 30);

    const allButtons = Array.from(document.querySelectorAll(".ev-time-btn")).sort((a, b) => a.dataset.time.localeCompare(b.dataset.time));
    
    const cleanStyles = () => {
        allButtons.forEach(btn => {
            if (btn.classList.contains("disabled")) return; 
            btn.classList.remove("active", "in-range");
        });
    };

    if (requiredSlots <= 0) { cleanStyles(); return true; }

    let validStartTime = startTime;
    if (!validStartTime || !allButtons.some(btn => btn.dataset.time === validStartTime && !btn.classList.contains("disabled"))) {
        const firstAvailableBtn = allButtons.find(btn => !btn.classList.contains("disabled"));
        validStartTime = firstAvailableBtn ? firstAvailableBtn.dataset.time : null;
    }

    let targetStartIndex = validStartTime ? allButtons.findIndex(btn => btn.dataset.time === validStartTime) : -1;

    let isSequenceValid = true;
    if (targetStartIndex !== -1 && (targetStartIndex + requiredSlots <= allButtons.length)) {
        for (let j = 0; j < requiredSlots; j++) {
            if (allButtons[targetStartIndex + j].classList.contains("disabled")) {
                isSequenceValid = false;
                break;
            }
        }
    } else {
        isSequenceValid = false;
    }

    if (!isSequenceValid) {
        if (document.querySelector(".ev-time-btn.active") || startTime) {
            cleanStyles();
            alert("선택하신 시간대 이후로 연속된 예약 가능 공간이 부족합니다.\n목표 충전량을 낮추거나 다른 시작 시간을 선택해 주세요.");
            return false; 
        }

        targetStartIndex = -1;
        for (let i = 0; i < allButtons.length; i++) {
            let isValid = true;
            if (i + requiredSlots <= allButtons.length) {
                for (let j = 0; j < requiredSlots; j++) {
                    if (allButtons[i + j].classList.contains("disabled")) { isValid = false; break; }
                }
                if (isValid) { targetStartIndex = i; break; }
            }
        }
    }

    if (targetStartIndex === -1 || (targetStartIndex + requiredSlots > allButtons.length)) {
        cleanStyles();
        return false;
    }

    cleanStyles();

    let lastSelectedTime = null;
    for (let k = 0; k < requiredSlots; k++) {
        const btn = allButtons[targetStartIndex + k];
        if (btn.classList.contains("disabled")) continue;
        
        if (k === 0 || k === requiredSlots - 1) btn.classList.add("active");
        else btn.classList.add("in-range");

        if (k === 0) startTime = btn.getAttribute("data-time");
        lastSelectedTime = btn.getAttribute("data-time");
    }
    
    const [hh, mm] = lastSelectedTime.split(":").map(Number);
    let endH = hh; let endM = mm + 30;
    if (endM >= 60) { endH += 1; endM -= 60; }
    endTime = String(endH).padStart(2, '0') + ":" + String(endM).padStart(2, '0');
    
    return true;
}

// ==========================================
// 5. 서버 데이터 기반 마스킹 (내 예약 예외 처리)
// ==========================================
async function loadReservedTimes() {
    console.log("⏳ [Edit] 2단계 마스킹 시작 (내 예약은 제외하고 차단)");

    if (isFetchingReservedTimes) return;
    const chargerId = document.getElementById("chargerId").value; 
    const date = document.getElementById("reservationDate").value;
    isFetchingReservedTimes = true;

    // 리셋
    document.querySelectorAll(".ev-time-btn").forEach(btn => {
        btn.classList.remove("disabled", "active", "in-range", "is-past-hour", "my-reservation");
        if(btn.dataset.time) btn.innerText = btn.dataset.time;
    });
    
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; 
    const selectedDateObj = new Date(date + "T00:00:00");
    const todayDateObj = new Date(todayStr + "T00:00:00");

    document.querySelectorAll(".ev-time-btn").forEach(btn => {
        const t = btn.dataset.time;
        const [h, m] = t.split(":").map(Number);
        
        let isPast = false;
        if (selectedDateObj < todayDateObj) isPast = true;
        else if (date === todayStr) {
            if (h < now.getHours() || (h === now.getHours() && m <= now.getMinutes())) isPast = true;
        }

        if (isPast) btn.classList.add("disabled", "is-past-hour");
    });

    try {
        const stationId = document.getElementById("stationId").value;
        const url = `/reservation/reserved-times?chargerId=${chargerId}&date=${date}&stationId=${stationId}`;
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
                const isMyCurrentRes = (Number(r.id) === currentReservationId);
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

                document.querySelectorAll(".ev-time-btn").forEach(btn => {
                    const tStr = btn.dataset.time; 
                    let btnMin = parseToMinutes(tStr);
                    if (btnMin === null) return;

                    let isMatch = false;
                    if (endMin === 1440) isMatch = (btnMin >= startMin && btnMin <= endMin);
                    else isMatch = (btnMin >= startMin && btnMin < endMin);

                    if (isMatch) {
                        // 🟢 내가 지금 수정하려는 기존 예약이라면 disabled(차단)을 걸지 않습니다!
                        if (isMyCurrentRes) {
                            btn.classList.add("my-reservation");
                            btn.innerText = "내 기존 예약";
                        } else {
                            btn.classList.add("disabled"); 
                            btn.innerText = "마감";
                        }
                    }
                });
            });

            // 내 기존 예약 시간을 초기 활성화 상태로 복구 (로딩 시 1회만)
            if (startTime && endTime) {
                let sMin = parseToMinutes(startTime);
                let eMin = parseToMinutes(endTime);
                document.querySelectorAll(".ev-time-btn").forEach(btn => {
                    let bMin = parseToMinutes(btn.dataset.time);
                    if (bMin >= sMin && bMin <= eMin) {
                        if (bMin === sMin || bMin === eMin) btn.classList.add("active");
                        else if (bMin > sMin && bMin < eMin) btn.classList.add("in-range");
                    }
                });
            }

            syncMidnightSlot();
            if (reservationType === "TARGET") syncTimeButtonsByTarget();
        }
    } catch (error) { 
        console.error("❌ [loadReservedTimes Edit] 통신 에러:", error); 
    } finally {
        isFetchingReservedTimes = false;
        console.log("🏁 [Edit] 마스킹 동기화 완료");
    }
}

function syncMidnightSlot() {
    const midnightBtn = document.querySelector(".ev-time-btn[data-time='24:00']");
    if (!midnightBtn) return;
    
    // 심플한 자정 락 (과거면 차단)
    const dateInput = document.getElementById("reservationDate").value;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    if (new Date(dateInput) < new Date(todayStr)) {
        midnightBtn.classList.add("disabled", "is-past-hour");
    }
}

// ==========================================
// 6. 예약 수정 확정 (Fetch POST 전송 후 마이페이지 이동)
// ==========================================
async function submitReservationEdit() {
    const type = document.getElementById("reservationType").value;
    const date = document.getElementById("reservationDate").value;

    if (!startTime || !endTime) {
        alert("예약 가능한 시간대가 지정되지 않아 수정을 진행할 수 없습니다.");
        return;
    }
    
    if (type === "TARGET") {
        const percentVal = parseInt(document.getElementById("targetPercent").value) || 0;
        const calculatedKwh = Math.round(70.0 * (percentVal / 100.0));
        
        let tpForm = document.getElementById("targetPercentForm");
        if (!tpForm) {
            tpForm = document.createElement("input"); tpForm.type = "hidden"; tpForm.name = "targetPercent"; tpForm.id = "targetPercentForm";
            document.getElementById("reservationEditForm").appendChild(tpForm);
        }
        tpForm.value = percentVal;

        let tkForm = document.getElementById("targetKwhForm");
        if (!tkForm) {
            tkForm = document.createElement("input"); tkForm.type = "hidden"; tkForm.name = "targetKwh"; tkForm.id = "targetKwhForm";
            document.getElementById("reservationEditForm").appendChild(tkForm);
        }
        tkForm.value = calculatedKwh;

        let mxForm = document.getElementById("maxMinutesForm");
        if (!mxForm) {
            mxForm = document.createElement("input"); mxForm.type = "hidden"; mxForm.name = "maxMinutes"; mxForm.id = "maxMinutesForm";
            document.getElementById("reservationEditForm").appendChild(mxForm);
        }
        mxForm.value = calculateRequiredMinutes(percentVal);
    }
    
    const finalStartTimeStr = `${date} ${startTime.substring(0, 5)}:00`;
    const finalEndTimeStr = `${date} ${endTime.substring(0, 5)}:00`;
    document.getElementById("startTime").value = finalStartTimeStr;
    document.getElementById("endTime").value = finalEndTimeStr;
    
    // Fetch API를 사용해 비동기로 데이터 전송 후 성공 시 JS로 페이지 이동
    const form = document.getElementById("reservationEditForm");
    const formData = new FormData(form);

    try {
        const response = await fetch('/reservation/update', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.text();
        if (result === "SUCCESS") {
            alert("예약 수정이 완료되었습니다.");
            // 🟢 사용자님 요청 사항: 마이페이지로 복귀
            location.href = '/mypage';
        } else if (result === "FAIL:LOGIN_REQUIRED") {
            alert("로그인이 필요합니다.");
            location.href = '/login';
        } else {
            alert("예약 수정 처리 중 오류가 발생했습니다. 다시 시도해주세요.");
        }
    } catch (error) {
        console.error("서버 통신 실패:", error);
        alert("서버와의 통신이 원활하지 않습니다.");
    }
}