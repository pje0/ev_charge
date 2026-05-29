// =========================================================================
// 🌐 EV 예약 수정 시스템 클라이언트 코어 스크립트 (reservationEdit.js)
// =========================================================================

// 전역 상태 변수 모음
let reservationType = "TIME";     
let startTime = null;             
let endTime = null;               
let selectedChargerKw = 50.0;     
let isFetchingReservedTimes = false; 
let currentReservationId = null;  
let selectedCarBattery = 70.0; // 🟢 차량 배터리 용량 저장용 전역 변수
let isSubmittingForm = false;  // 🟢 중복 제출 방지 플래그

// 페이지 이탈 방지 및 초기화용 상태 저장 객체
let initialState = {
    type: "TIME",
    date: "",
    startTime: null,
    endTime: null,
    targetPercent: 0
};
let isDirty = false; // 변경사항 발생 여부

/**
 * 📝 [Block 1] 초기 렌더링 및 이벤트 바인딩 (DOM 로드 후 안전하게 실행)
 */
window.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 [Init] 예약 수정 페이지 스크립트 로드 완료 및 초기화 시작");

    currentReservationId = Number(document.getElementById("editReservationId").value);
    selectedChargerKw = Number(document.getElementById("chargerKwHidden").value || 50.0);
    reservationType = document.getElementById("reservationType").value || "TIME";
    
    // 🟢 DOM이 로드된 후 안전하게 배터리 용량 추출 (최하단에 있던 코드 구출)
    const batteryInput = document.getElementById("carBatteryCapacity");
    selectedCarBattery = Number(batteryInput ? batteryInput.value : 70.0);
    console.log(`🔋 [Data] 내 차량 배터리 용량 인식 완료: ${selectedCarBattery}kWh`);
    
    generateTimeSlots();
    parseInitialTimes();

    const initTargetVal = document.getElementById("initialTargetPercent").value;
    if (initTargetVal && Number(initTargetVal) > 0) {
        document.getElementById("targetPercent").value = initTargetVal;
        document.getElementById("targetPercentText").innerText = initTargetVal + "%";
        updateSliderBackground(initTargetVal);
    }

    initialState.type = reservationType;
    initialState.date = document.getElementById("reservationDate").value;
    initialState.startTime = startTime;
    initialState.endTime = endTime;
    initialState.targetPercent = Number(initTargetVal);

    document.getElementById("reservationDate")?.addEventListener("change", (e) => {
        markAsDirty();
        startTime = null; 
        endTime = null;
        document.getElementById("startTime").value = "";
        document.getElementById("endTime").value = "";
        loadReservedTimes();
        syncMidnightSlot(); // 🟢 날짜 변경 시 24:00 슬롯도 즉시 갱신
    });
    
    const slider = document.getElementById("targetPercent");
    if (slider) {
        slider.addEventListener("input", (e) => {
            markAsDirty();
            changeTargetPercent(e.target.value, true); 
        });
    }

    selectReservationType(reservationType);
    
    window.addEventListener('beforeunload', (e) => {
        if (isDirty) {
            e.preventDefault();
            e.returnValue = ''; 
        }
    });
});

/**
 * 📝 [Block 2] 변경사항 감지 및 롤백 제어
 */
function markAsDirty() {
    if (!isDirty) {
        console.log("⚠️ [Dirty Check] 사용자 변경사항 감지됨. 이탈 방지 활성화.");
        isDirty = true;
    }
}

function goBackWithCheck() {
    if (isDirty) {
        if (confirm("변경 사항이 저장되지 않았습니다. 정말 취소하고 나가시겠습니까?")) {
            isDirty = false; 
            location.href = '/mypage';
        }
    } else {
        location.href = '/mypage'; 
    }
}

function resetFormToInitial() {
    if (!confirm("모든 변경사항을 지우고 기존 예약 상태로 되돌리시겠습니까?")) return;
    
    console.log("🔄 [Reset] 초기 상태로 데이터 롤백 실행");
    document.getElementById("reservationDate").value = initialState.date;
    startTime = initialState.startTime;
    endTime = initialState.endTime;
    
    document.getElementById("targetPercent").value = initialState.targetPercent;
    document.getElementById("targetPercentText").innerText = initialState.targetPercent + "%";
    updateSliderBackground(initialState.targetPercent);
    
    selectReservationType(initialState.type); 
    isDirty = false; 
}

/**
 * 📝 [Block 3] 기본 UI 및 슬롯 생성
 */
function generateTimeSlots() {
    const grid = document.getElementById("editTimeSlotGrid");
    if(!grid) return;
    let html = "";
    for(let h = 0; h <= 24; h++){
        const mArr = ["00", "30"];
        for(let m = 0; m < 2; m++){
            if(h === 0 && m === 0) continue; 
            if(h === 24 && m === 1) continue; 
            const timeStr = `${String(h).padStart(2, '0')}:${mArr[m]}`;
            html += `<div class="ev-time-btn" data-time="${timeStr}" onclick="selectTime(this, '${timeStr}')">${timeStr}</div>`;
        }
    }
    grid.innerHTML = html;
}

function parseInitialTimes() {
    const rawStartTime = document.getElementById("startTime").value;
    const rawEndTime = document.getElementById("endTime").value;
    const targetDate = document.getElementById("reservationDate").value;

    if (rawStartTime && rawEndTime && rawStartTime.includes(" ")) {
        startTime = rawStartTime.split(" ")[1].substring(0, 5);
        const endPart = rawEndTime.split(" ");
        if (endPart[1] === "00:00:00" && endPart[0] !== targetDate) {
            endTime = "24:00";
        } else {
            endTime = endPart[1].substring(0, 5);
        }
    }
}

function selectReservationType(type) {
    if (type !== initialState.type) markAsDirty();
    reservationType = type;
    document.getElementById("reservationType").value = type;
    
    document.getElementById("btnTime").classList.remove("active");
    document.getElementById("btnTarget").classList.remove("active");
    document.getElementById("timeBox").classList.remove("hidden");

    if (type === "TIME") {
        document.getElementById("btnTime").classList.add("active");
        document.getElementById("targetBox").classList.add("hidden");
    } else {
        document.getElementById("btnTarget").classList.add("active");
        document.getElementById("targetBox").classList.remove("hidden");
        const slider = document.getElementById("targetPercent");
        if(slider) {
            updateSliderBackground(slider.value);
            changeTargetPercent(slider.value, false);
        }
    }
    loadReservedTimes();
}

/**
 * 📝 [Block 4] 목표 충전량 슬라이더 연산
 */
function updateSliderBackground(value) {
    const slider = document.getElementById("targetPercent");
    if (!slider) return;
    slider.style.background = `linear-gradient(to right, #2563eb 0%, #2563eb ${value}%, #e5e7eb ${value}%, #e5e7eb 100%)`;
}

function changeTargetPercent(value, isUserAction = true) {
    let targetVal = Number(value);
    document.getElementById("targetPercentText").innerText = targetVal + "%";
    document.getElementById("targetPercent").value = targetVal;
    updateSliderBackground(targetVal);

    if(isUserAction && reservationType === "TARGET") syncTimeButtonsByTarget();
}

function quickTarget(value) {
    markAsDirty();
    changeTargetPercent(value, true); 
}

// 🟢 내 차량 배터리(selectedCarBattery)에 맞춰 동적으로 충전 필요 시간 연산
function calculateRequiredMinutes(targetVal) {
    if (targetVal <= 0) return 0;
    
    const requiredKwh = selectedCarBattery * (targetVal / 100.0);
    let durationHours = requiredKwh / selectedChargerKw;
    
    // 기본 충전 정리 시간(버퍼) 15분 추가
    let requiredMinutes = Math.ceil(durationHours * 60) + 15; 

    // 80% 이상 충전 시 배터리 보호 속도 저하 로직 적용
    if (selectedChargerKw > 20 && targetVal > 80) { 
        requiredMinutes += Math.ceil(((selectedCarBattery * (targetVal - 80) / 100.0) / selectedChargerKw) * 0.5 * 60);
    }
    
    console.log(`🧮 [소요 시간 연산] 목표: ${targetVal}%, 배터리: ${selectedCarBattery}kWh -> ${requiredMinutes}분 예상`);
    return requiredMinutes;
}

/**
 * 📝 [Block 5] 타임 슬롯 클릭 및 연산 제어
 */
function selectTime(element, time) {
    if (element.classList.contains("disabled") || element.classList.contains("is-past-hour")) return; 
    markAsDirty();

    document.querySelectorAll(".ev-time-btn").forEach(btn => {
        if (!btn.classList.contains("disabled")) btn.classList.remove("active", "in-range");
    });

    if (reservationType === "TIME") {
        if (startTime !== null && endTime !== null) { startTime = time; endTime = null; }
        else if (startTime === null) { startTime = time; }
        else if (startTime === time) { startTime = null; }
        else {
            let tempStart = startTime; let tempEnd = time;
            if (time < startTime) { tempEnd = startTime; tempStart = time; }

            let hasDisabledSlot = false;
            document.querySelectorAll(".ev-time-btn").forEach(btn => {
                const t = btn.dataset.time;
                if (t > tempStart && t < tempEnd && btn.classList.contains("disabled")) hasDisabledSlot = true; 
            });
            
            if (hasDisabledSlot) { 
                alert("선택하신 구간 사이에 이미 예약된 시간이 포함되어 있습니다."); 
                startTime = time; endTime = null;
            } else { startTime = tempStart; endTime = tempEnd; }
        }
        colorTimeSlots(); 
    } else {
        startTime = time; 
        syncTimeButtonsByTarget();
    }
}

function colorTimeSlots() {
    if (!startTime) return;
    document.querySelectorAll(".ev-time-btn").forEach(btn => {
        const t = btn.dataset.time;
        if (btn.classList.contains("disabled")) return;
        if (endTime) {
            if (t === startTime || t === endTime) btn.classList.add("active");
            if (t > startTime && t < endTime) btn.classList.add("in-range");
        } else {
            if (t === startTime) btn.classList.add("active");
        }
    });
}

/**
 * 📝 [Block 5.5] 타겟 모드 전용: 자동 슬롯 계산 및 자정 대역 범위 검증 (버그 수정본)
 */
function syncTimeButtonsByTarget() {
    if (reservationType !== 'TARGET' || !startTime) return;
    
    const targetValue = parseInt(document.getElementById("targetPercentText").innerText) || 0;
    const requiredMinutes = calculateRequiredMinutes(targetValue);
    const requiredSlots = Math.ceil(requiredMinutes / 30); // 30분 단위 필요 칸 수

    console.log(`🤖 [Auto Sync] 타겟 연산 가동 -> 목표: ${targetValue}%, 필요 슬롯: ${requiredSlots}칸`);

    const allButtons = Array.from(document.querySelectorAll(".ev-time-btn"));
    let startIndex = allButtons.findIndex(btn => btn.dataset.time === startTime);
    if (startIndex === -1) return;

    let isValid = true;
    
    // 🟢 버그 수정: i가 requiredSlots까지 돌면서 배열 범위 및 마감 여부를 정밀 검사
    for (let i = 0; i <= requiredSlots; i++) {
        // [방어 로직] 선택한 시작점부터 필요한 칸 수가 전체 슬롯 배열(24:00)을 넘어가는 경우
        if (startIndex + i >= allButtons.length) {
            console.warn(`🛑 [Validation Fail] 자정(24:00) 범위를 초과함. 필요한 인덱스: ${startIndex + i}, 최대 인덱스: ${allButtons.length - 1}`);
            isValid = false; 
            break; // 루프 즉시 탈출
        }
        
        // 이미 다른 회원이 선점한 '마감' 슬롯이 껴있는 경우
        if (allButtons[startIndex + i].classList.contains("disabled")) {
            console.warn(`🛑 [Validation Fail] 중간에 이미 마감된 슬롯이 포함됨: ${allButtons[startIndex + i].dataset.time}`);
            isValid = false;
            break;
        }
    }

    // 🟢 검증 실패 시 예약 페이지와 100% 동일하게 알럿을 띄우고 선택 리셋
    if (!isValid) {
        alert("선택하신 시간대 이후로 연속된 예약 가능 공간이 부족합니다. 목표 충전량을 낮추거나 다른 시작 시간을 선택해 주세요.");
        startTime = null;
        endTime = null;
        
        // 화면의 활성화 스타일 싹 걷어내기
        document.querySelectorAll(".ev-time-btn").forEach(btn => {
            if (!btn.classList.contains("disabled")) btn.classList.remove("active", "in-range");
        });
        return;
    }

    // 통과 시 안전하게 자동 색칠 및 완료 시간 매핑
    let lastSelectedTime = startTime;
    for (let i = 0; i <= requiredSlots; i++) {
        if (startIndex + i >= allButtons.length) break;
        const btn = allButtons[startIndex + i];
        
        if (i === 0 || i === requiredSlots) btn.classList.add("active");
        else btn.classList.add("in-range");
        
        lastSelectedTime = btn.dataset.time;
    }
    
    endTime = lastSelectedTime;
    console.log(`🎨 [Auto Draw] 검증 통과! 슬롯 색칠 완결 (시작: ${startTime}, 자동종료: ${endTime})`);
}

/**
 * 📝 [Block 6] 서버 예약 시간 동기화 및 마스킹
 */
async function loadReservedTimes() {
    if (isFetchingReservedTimes) return;
    isFetchingReservedTimes = true;
    
    const chargerId = document.getElementById("chargerId").value; 
    const date = document.getElementById("reservationDate").value;
    const stationId = document.getElementById("stationId").value;

    document.querySelectorAll(".ev-time-btn").forEach(btn => {
        btn.classList.remove("disabled", "active", "in-range", "is-past-hour", "my-reservation");
        if(btn.dataset.time) btn.innerText = btn.dataset.time;
    });
    
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; 
    if (date === todayStr) {
        const currentHour = now.getHours();
        const currentMin = now.getMinutes();
        document.querySelectorAll(".ev-time-btn").forEach(btn => {
            const [h, m] = btn.dataset.time.split(":").map(Number);
            if (h < currentHour || (h === currentHour && m <= currentMin)) btn.classList.add("disabled", "is-past-hour");
        });
    } else if (date < todayStr) {
        document.querySelectorAll(".ev-time-btn").forEach(btn => btn.classList.add("disabled", "is-past-hour"));
    }

    try {
        const response = await fetch(`/reservation/reserved-times?chargerId=${chargerId}&date=${date}&stationId=${stationId}`);
        if (response.ok) {
            const reservedList = await response.json();
            reservedList.forEach((r) => {
                const isMyCurrentRes = (Number(r.id) === currentReservationId || Number(r.reservationId) === currentReservationId);
                const rawStart = r.startTime || r.start_time;
                const rawEnd = r.endTime || r.end_time;
                if (!rawStart || !rawEnd) return; 

                const sTime = rawStart.includes(' ') ? rawStart.split(' ')[1].substring(0, 5) : rawStart.substring(0, 5);
                const eTime = rawEnd.includes(' ') ? rawEnd.split(' ')[1].substring(0, 5) : rawEnd.substring(0, 5);
                const isMidnight = (rawEnd.includes(' 00:00') && eTime === '00:00');
                const endLimit = isMidnight ? "24:00" : eTime;

                document.querySelectorAll(".ev-time-btn").forEach(btn => {
                    const t = btn.dataset.time;
                    if (t >= sTime && t <= endLimit) {
                        if (isMyCurrentRes) {
                            btn.classList.add("my-reservation"); 
                        } else {
                            if (t !== endLimit) { 
                                btn.classList.add("disabled"); 
                                btn.innerText = "마감";
                            }
                        }
                    }
                });
            });

            if (startTime && endTime) {
                if (reservationType === "TARGET") syncTimeButtonsByTarget();
                else colorTimeSlots();
            }
            syncMidnightSlot(); // 🟢 서버 동기화 완료 후 자정 슬롯 락 즉시 처리
        }
    } catch (error) { 
        console.error("❌ [Fetch Error]", error); 
    } finally {
        isFetchingReservedTimes = false;
    }
}

/**
 * 🟢 [NEW] 날짜별 24:00 슬롯 전용 제어기
 */
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
        } else if (dateInput === todayStr) {
            const nowTotalMin = (now.getHours() * 60) + now.getMinutes();
            if (isReserved || nowTotalMin >= 24 * 60) {
                midnightBtn.classList.remove("is-past-hour");
                midnightBtn.classList.add("disabled");
                midnightBtn.innerText = "마감";
            } else {
                midnightBtn.classList.remove("disabled", "is-past-hour");
                midnightBtn.innerText = "24:00";
            }
        } else {
            if (!isReserved) {
                midnightBtn.classList.remove("disabled", "is-past-hour");
                midnightBtn.innerText = "24:00";
            }
        }
    }
}

/**
 * 📝 [Block 7] 최종 폼 Submit 제어 및 알럿
 */
function submitReservationEdit() {
    // 1. 중복 클릭 락 (따닥 방지)
    if (isSubmittingForm) {
        console.warn("⚠️ [Submit] 이미 예약 수정 요청이 서버로 전송 중입니다.");
        return;
    }

    const type = document.getElementById("reservationType").value;
    const date = document.getElementById("reservationDate").value;

    // 🟢 사용자님 요청 반영: 탭(예약 타입)별로 맞춤형 경고창 분리
    if (type === "TIME") {
        if (!startTime || !endTime) {
            alert("예약 시간을 선택해 주세요.");
            return;
        }
    } else if (type === "TARGET") {
        if (!startTime || !endTime) {
            alert("예약 가능한 시간대가 존재하지 않아 예약을 진행할 수 없습니다.");
            return;
        }
    }

    // 2. 충전기 규격과 내 차량 규격 비교 알럿
    const chargerConnector = document.getElementById("chargerConnector").value;
    const carConnector = document.getElementById("carConnector").value;
    
    if (chargerConnector && carConnector && chargerConnector !== carConnector) {
        const warnMsg = `[경고] 고객님 차량의 충전 규격(${carConnector})과 선택하신 충전기의 규격(${chargerConnector})이 일치하지 않습니다.\n\n정말로 이대로 예약을 강행하시겠습니까?`;
        if (!confirm(warnMsg)) {
            console.log("🛑 [Submit Cancel] 규격 불일치로 사용자가 예약 변경을 취소했습니다.");
            return;
        }
    } else {
        if (!confirm("예약 일정을 이대로 변경 확정하시겠습니까?")) {
            return;
        }
    }
    
    // 3. TARGET 모드일 때 유저 차량 배터리에 맞춰 히든 데이터 심기
    if (type === "TARGET") {
        const percentVal = parseInt(document.getElementById("targetPercent").value) || 0;
        const calculatedKwh = Math.round(selectedCarBattery * (percentVal / 100.0));
        
        const addHidden = (name, value) => {
            let el = document.getElementById(name + "Form");
            if (!el) {
                el = document.createElement("input"); el.type = "hidden"; el.name = name; el.id = name + "Form";
                document.getElementById("reservationEditForm").appendChild(el);
            }
            el.value = value;
        };
        addHidden("targetPercent", percentVal);
        addHidden("targetAmount", calculatedKwh);
        addHidden("maxMinutes", calculateRequiredMinutes(percentVal));
    }
    
    // 4. 날짜와 시간 조립 (자정 이월 처리 포함)
    let finalEndStr = "";
    if (endTime === "24:00") {
        let nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        finalEndStr = `${nextDay.toISOString().substring(0, 10)} 00:00:00`;
    } else {
        finalEndStr = `${date} ${endTime}:00`;
    }
    
    document.getElementById("startTime").value = `${date} ${startTime}:00`;
    document.getElementById("endTime").value = finalEndStr;

    // 5. 폼 전송 (400 에러 방지를 위해 name 속성 변경 및 락 활성화)
    isDirty = false;
    isSubmittingForm = true;
    
    const form = document.getElementById("reservationEditForm");
    document.getElementById("startTime").name = "editStartTime";
    document.getElementById("endTime").name = "editEndTime";

    form.action = "/mypage/reservation/modify";
    form.method = "POST";
    form.submit();
    
    setTimeout(() => { isSubmittingForm = false; }, 3000);
}