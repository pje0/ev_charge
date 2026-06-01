// =========================================================================
// 🌐 EV 예약 수정 시스템 클라이언트 코어 스크립트 (reservationEdit.js)
// =========================================================================

/**
 * ==========================================
 * 📌 [전역 상태 변수 선언부]
 * [기능] 애플리케이션 전반에서 사용되는 핵심 데이터(상태)를 보관하는 메모리 공간입니다.
 * [중요도] ★★★★★ (시스템의 척추 역할)
 * ==========================================
 */
let reservationType = "TIME";     // 예약 방식 (TIME: 시간 지정, TARGET: 목표량 지정)
let startTime = null;             // 예약 시작 시간 (예: "14:30")
let endTime = null;               // 예약 종료 시간 (예: "15:00")
let selectedChargerKw = 50.0;     // 현재 충전기의 출력량 (소요 시간 계산용)
let isFetchingReservedTimes = false; // 타임라인 동기화 통신 중복 방지 락
let currentReservationId = null;  // 현재 수정 중인 내 예약의 고유 ID (기존 예약 칸 유지용)
let selectedCarBattery = 70.0;    // 내 차량 배터리 용량 (목표량 연산의 핵심 기준값)
let isSubmittingForm = false;     // 예약 폼 제출 중복 방지 변수 (서버로 데이터가 2번 날아가는 현상 방지)
let lastSafeTargetPercent = 0;    // 목표 충전량 슬라이더 조작 시, 오류 발생 시 되돌아갈 '마지막으로 안전했던 퍼센트' 기록
let globalAlertLock = false;      // 전역 시스템 경고창 중복 발생 방지 락

// 페이지 이탈 방지(Dirty Check) 및 초기화(Reset)용 원본 상태 보관 객체
let initialState = {
    type: "TIME",
    date: "",
    startTime: null,
    endTime: null,
    targetPercent: 0
};
let isDirty = false; // 변경사항 발생 여부 추적 깃발

/**
 * =========================================================================
 * 🛠️ [공통 헬퍼 함수] 로직을 건드리지 않고 분리된 유틸리티 모음
 * =========================================================================
 */

/**
 * [유틸] 문자열 시간 파싱 함수
 * [기능] DB에서 날아온 ISO 시간이나 일반 문자열 시간을 분(Minutes)으로 파싱합니다.
 * [중요도] ★★★★☆
 */
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

/**
 * [유틸] 과거 시간대 버튼 물리적 비활성화 격벽 처리기
 * [기능] 오늘 날짜 기준으로 이미 지나가버린 시간대를 닫습니다.
 * [중요도] ★★★★★ 
 */
function lockPastTimeSlots(date, todayStr, selectedDateObj, todayDateObj, now) {
    console.log("🔒 [Helper] 과거 시간대 물리적 락(Lock) 스캔 시작");
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

/**
 * =========================================================================
 * 🎬 화면 렌더링, 이벤트 바인딩 및 상태(Dirty) 제어 제어 로직
 * =========================================================================
 */

/**
 * [기능] 초기 렌더링 및 DOM 이벤트 리스너 바인딩 
 * [중요도] ★★★★★ (진입점)
 */
window.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 [Init] 예약 수정 페이지 부트스트랩 가동 및 시스템 초기화 시작");

    currentReservationId = Number(document.getElementById("editReservationId").value);
    selectedChargerKw = Number(document.getElementById("chargerKwHidden").value || 50.0);
    reservationType = document.getElementById("reservationType").value || "TIME";
    
    const batteryInput = document.getElementById("carBatteryCapacity");
    selectedCarBattery = Number(batteryInput ? batteryInput.value : 70.0);
    
    generateTimeSlots();
    parseInitialTimes();

    let initTargetVal = Number(document.getElementById("initialTargetPercent")?.value || 0);

    // 🌟 [핵심 지능 추가] DB에서 목표 퍼센트(%)가 누락되어 0으로 들어온 경우, 기존 예약 시간을 역산하여 퍼센트 복구!
    if (initTargetVal === 0 && startTime && endTime && selectedCarBattery > 0) {
        const targetDateStr = document.getElementById("reservationDate").value;
        const startMins = parseTimeStringToMinutes(startTime, targetDateStr);
        const endMins = parseTimeStringToMinutes(endTime, targetDateStr);
        
        if (startMins !== null && endMins !== null) {
            let diffMins = endMins - startMins;
            if (diffMins < 0) diffMins += 1440; // 자정 넘김 처리
            
            // 15분 여유 버퍼를 제외한 순수 충전 시간 도출
            const pureChargeMins = Math.max(0, diffMins - 15);
            const chargeHours = pureChargeMins / 60.0;
            const chargedKwh = chargeHours * selectedChargerKw;
            
            initTargetVal = Math.round((chargedKwh / selectedCarBattery) * 100);
            if (initTargetVal > 100) initTargetVal = 100;
            if (initTargetVal < 0) initTargetVal = 0;
            
            console.log(`💡 [Auto Calc] DB 퍼센트 누락 감지! 예약 시간(${diffMins}분)을 역산하여 목표량 ${initTargetVal}% 강제 복구 완료.`);
        }
    }

    if (initTargetVal > 0) {
        const slider = document.getElementById("targetPercent");
        if (slider) slider.value = initTargetVal;
        document.getElementById("targetPercentText").innerText = initTargetVal + "%";
        updateSliderVisuals(initTargetVal);
        lastSafeTargetPercent = initTargetVal;
    }

    initialState.type = reservationType;
    initialState.date = document.getElementById("reservationDate").value;
    initialState.startTime = startTime;
    initialState.endTime = endTime;
    initialState.targetPercent = initTargetVal;

    document.getElementById("reservationDate")?.addEventListener("change", (e) => {
        console.log(`📆 [Event] 사용자 날짜 변경 감지 -> 선택값: ${e.target.value}`);
        markAsDirty();
        
        clearAllReservationStyles();
        
        if (selectedChargerId !== null && selectedChargerId !== 0) {
            console.log("🔄 [Event] 타임라인 동기화 및 24:00 슬롯 락인 제어기 가동");
            loadReservedTimes();
        }
    });
    
    const slider = document.getElementById("targetPercent");
    if (slider) {
        slider.addEventListener("input", (e) => {
            markAsDirty();
            const val = e.target.value;
            updateSliderVisuals(val); 
            changeTargetPercent(val, true); 
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
 * [기능] 변경사항 감지 및 롤백 제어 (Dirty Check)
 * [중요도] ★★★★☆
 */
function markAsDirty() {
    if (!isDirty) {
        console.log("⚠️ [Dirty Check] 사용자 변경사항(Dirty) 감지됨. 이탈 방지 프로토콜 활성화.");
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
    
    console.log("🔄 [Reset] 사용자의 롤백 요청 승인. 원본 상태로 데이터 롤백 실시");
    document.getElementById("reservationDate").value = initialState.date;
    startTime = initialState.startTime;
    endTime = initialState.endTime;
    
    const slider = document.getElementById("targetPercent");
    if (slider) slider.value = initialState.targetPercent;
    document.getElementById("targetPercentText").innerText = initialState.targetPercent + "%";
    updateSliderVisuals(initialState.targetPercent);
    lastSafeTargetPercent = initialState.targetPercent;
    
    selectReservationType(initialState.type); 
    isDirty = false; 
}

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
    console.log(`🔀 [Form Toggle] 예약 방식 변경 감지 -> ${type} 모드`);
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
            updateSliderVisuals(slider.value);
            // 🌟 [핵심 보호막] 사용자가 '목표량 탭'을 클릭(isDirty)했을 때만 슬라이더 연산을 가동하여 DB 원본 훼손 방지
            if (isDirty) {
                changeTargetPercent(slider.value, false);
            }
        }
    }
    loadReservedTimes();
}

/**
 * =========================================================================
 * 🎚️ 슬라이더 시각 효과 및 연산/롤백 코어 모듈
 * =========================================================================
 */

/**
 * [기능] 슬라이더를 잡고 끌 때 파란색 막대기를 실시간으로 채워주는 시각 엔진
 * [중요도] ★★☆☆☆
 */
function updateSliderVisuals(value) {
    const slider = document.getElementById("targetPercent");
    if (!slider) return;
    slider.style.background = `linear-gradient(to right, #2563eb 0%, #2563eb ${value}%, #e5e7eb ${value}%, #e5e7eb 100%)`;
}

/**
 * [기능] 내 차량 배터리에 맞춰 동적으로 충전 필요 시간(분 단위) 연산
 * [중요도] ★★★★★ (수정 페이지 충전 로직의 두뇌)
 */
function calculateRequiredMinutes(targetVal) {
    if (targetVal <= 0) return 0;
    
    // 필요 전력량 = 내 차 배터리통 크기 * (원하는 퍼센트 / 100)
    const requiredKwh = selectedCarBattery * (targetVal / 100.0);
    let durationHours = requiredKwh / selectedChargerKw;
    
    // 기본 충전 정리 시간(버퍼) 15분 추가
    let requiredMinutes = Math.ceil(durationHours * 60) + 15; 

    // 급속 충전기일 때 80% 이상 충전 시 배터리 보호(테이퍼링) 로직 적용
    if (selectedChargerKw > 20 && targetVal > 80) { 
        requiredMinutes += Math.ceil(((selectedCarBattery * (targetVal - 80) / 100.0) / selectedChargerKw) * 0.5 * 60);
    }
    
    console.log(`🧮 [Math Engine] 목표: ${targetVal}%, 내 배터리: ${selectedCarBattery}kWh, 충전기출력: ${selectedChargerKw}kW -> 예측 소요: ${requiredMinutes}분`);
    return requiredMinutes;
}

/**
 * 🌟 [핵심 변경] 목표 충전량 슬라이더 조작 시 롤백 및 안전 퍼센트 연산 시스템 적용
 * [기능] 슬라이더 값이 변경될 때마다 검증을 거쳐, 오버스펙이 요구될 경우 안전한 퍼센트로 강제 롤백시킵니다.
 * [중요도] ★★★★★
 */
function changeTargetPercent(value, isUserAction = true) {
    let targetVal = Number(value);
    const slider = document.getElementById("targetPercent");

    if (targetVal <= 0) {
        document.getElementById("targetPercentText").innerText = "0%";
        if (slider) slider.value = 0;
        updateSliderVisuals(0);
        lastSafeTargetPercent = 0;
        if(isUserAction && reservationType === "TARGET") syncTimeButtonsByTarget();
        return;
    }

    // 1. 정상 작동을 가정하고 일단 텍스트 및 UI 업데이트
    document.getElementById("targetPercentText").innerText = targetVal + "%";
    if (slider) slider.value = targetVal;
    updateSliderVisuals(targetVal);

    if (isUserAction && reservationType === "TARGET") {
        // 2. 타임 슬롯 연산 시뮬레이션
        const isSequenceValid = syncTimeButtonsByTarget();
        
        // 3. 🚨 예외 처리: 불가능할 경우 완벽한 롤백 (Rollback) 실시
        if (!isSequenceValid) {
            console.warn(`⚠️ [Validation] 목표량 달성을 위한 빈 슬롯 부족. 이전 안전 퍼센트(${lastSafeTargetPercent}%)로 롤백을 실시합니다.`);
            document.getElementById("targetPercentText").innerText = lastSafeTargetPercent + "%";
            if (slider) {
                slider.value = lastSafeTargetPercent;
                slider.blur(); // 포커스 해제해서 추가 입력 물리적 방지
            }
            updateSliderVisuals(lastSafeTargetPercent); 
            syncTimeButtonsByTarget(); // 하단 시간표 뷰도 롤백
            return; // 실패했으므로 lastSafeTargetPercent는 덮어쓰지 않고 종료!
        }
    }

    // 4. 무사히 통과했을 때만 안전 퍼센트 갱신
    lastSafeTargetPercent = targetVal; 
}

function quickTarget(value) {
    markAsDirty();
    console.log(`🎯 [Event] 퀵 타겟 버튼 클릭됨 -> ${value}%`);
    changeTargetPercent(value, true); 
}

/**
 * =========================================================================
 * 🕒 시간표(Time Slot) 클릭 제어, 자동 동기화 및 마스킹 엔진
 * =========================================================================
 */

function selectTime(element, time) {
    if (element.classList.contains("disabled") || element.classList.contains("is-past-hour")) return; 
    console.log(`🕒 [Event] 타임 슬롯 클릭 감지 -> 시간: ${time}`);
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
                console.error("❌ [Validation Error] 선택 범위 중간에 기 예약 슬롯 침범 감지됨!");
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
 * 🌟 [핵심 변경] 예약 페이지와 100% 동일한 TARGET 자동 계산 및 지뢰 찾기 롤백 모듈
 * [기능] TARGET 모드 시, 하단 시간표의 파란 불을 자동으로 켜고 검사합니다.
 * [중요도] ★★★★★ 
 */
function syncTimeButtonsByTarget() {
    if (reservationType !== 'TARGET' || !startTime) return true;
    
    const targetValue = parseInt(document.getElementById("targetPercentText").innerText) || 0;
    const requiredMinutes = calculateRequiredMinutes(targetValue);
    const requiredSlots = Math.ceil(requiredMinutes / 30); // 30분 단위 필요 칸 수

    console.log(`🤖 [Auto Sync] 타겟 시뮬레이션 가동 -> 목표: ${targetValue}%, 필요 슬롯: ${requiredSlots}칸`);

    const allButtons = Array.from(document.querySelectorAll(".ev-time-btn"));
    
    // 버튼 초기화
    const cleanStyles = () => {
        allButtons.forEach(btn => {
            if (!btn.classList.contains("disabled")) btn.classList.remove("active", "in-range");
        });
    };

    let startIndex = allButtons.findIndex(btn => btn.dataset.time === startTime);
    if (startIndex === -1) {
        cleanStyles();
        return true;
    }

    let isValid = true;
    
    // 요구 슬롯 수만큼 뒤로가며 지뢰(마감) 및 범위초과 검사
    for (let i = 0; i <= requiredSlots; i++) {
        if (startIndex + i >= allButtons.length) {
            console.warn(`🛑 [Validation Fail] 자정(24:00) 범위를 초과함. (필요 인덱스: ${startIndex + i})`);
            isValid = false; 
            break; 
        }
        
        if (allButtons[startIndex + i].classList.contains("disabled")) {
            console.warn(`🛑 [Validation Fail] 중간에 이미 마감된 슬롯 포함됨: ${allButtons[startIndex + i].dataset.time}`);
            isValid = false;
            break;
        }
    }

    // 🟢 검증 실패 시: 예약 페이지와 동일하게 경고를 띄우고 실패 시그널(false) 반환!
    if (!isValid) {
        if (!globalAlertLock) {
            globalAlertLock = true;
            setTimeout(() => {
                alert("죄송합니다. 선택하신 시간대 이후로 연속된 예약 가능 공간이 부족합니다.\n목표 충전량을 낮추거나 다른 시작 시간을 선택해 주세요.");
                globalAlertLock = false;
            }, 50); 
        }
        return false; // 부모 함수(changeTargetPercent)에게 실패했음을 알려 롤백을 유도!
    }

    // 통과 시 안전하게 자동 색칠 및 완료 시간 매핑
    cleanStyles();
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
    return true; // 성공 시그널 반환
}

/**
 * [기능] 서버에서 이미 예약된 시간 목록을 가져와, 하단 시간표의 해당 블록들을 강제로 '마감' 시키고 회색으로 닫아버립니다.
 * [중요도] ★★★★★ (더블 부킹 방지의 절대 방어선)
 */
async function loadReservedTimes() {
    if (isFetchingReservedTimes) return;
    isFetchingReservedTimes = true;
    console.log("⏳ [loadReservedTimes] 타임라인 점유 상태 서버 동기화 루틴 기동");
    
    const chargerId = document.getElementById("chargerId").value; 
    const date = document.getElementById("reservationDate").value;
    const stationId = document.getElementById("stationId").value;

    document.querySelectorAll(".ev-time-btn").forEach(btn => {
        btn.classList.remove("disabled", "active", "in-range", "is-past-hour", "my-reservation");
        if(btn.dataset.time) btn.innerText = btn.dataset.time;
    });
    
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; 
    const selectedDateObj = new Date(date + "T00:00:00");
    const todayDateObj = new Date(todayStr + "T00:00:00");

    lockPastTimeSlots(date, todayStr, selectedDateObj, todayDateObj, now);

    try {
        console.log(`🚀 [API] 기 예약 데이터 호출 -> chargerId: ${chargerId}`);
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

            // 🌟 [핵심 변경] 마스킹이 끝난 뒤 기존 선택값 렌더링 복구
            if (startTime && endTime) {
                // 수정 페이지 최초 로딩 시에는 무조건 DB의 원본(startTime, endTime)을 기준으로 색을 칠해 보존함!
                colorTimeSlots(); 
                
                // 단, 사용자가 슬라이더나 탭을 건드린 상태(isDirty)이면서 TARGET 모드라면 자동 연산 수행
                if (reservationType === "TARGET" && isDirty) {
                    syncTimeButtonsByTarget();
                }
            }
            syncMidnightSlot(); 
        }
    } catch (error) { 
        console.error("❌ [loadReservedTimes] 타임라인 통신 에러:", error); 
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
 * =========================================================================
 * 🚀 데이터 폼 전송 (Submit) 및 사용자 이탈 방어 로직
 * =========================================================================
 */

/**
 * [기능] '수정 확정' 버튼 클릭 시, 폼 검증과 히든 데이터 조립 후 백엔드로 POST 제출을 진행합니다.
 * [중요도] ★★★★★ (최종 결제처)
 */
function submitReservationEdit() {
    console.log("📥 [Submit Request] 예약 수정 최종 폼 전송 파이프라인 가동");
    
    // 1. 중복 클릭 락 (따닥 방지)
    if (isSubmittingForm) {
        console.warn("⚠️ [Submit] 이미 예약 수정 요청이 서버로 전송 중입니다.");
        return;
    }

    const type = document.getElementById("reservationType").value;
    const date = document.getElementById("reservationDate").value;

    // 2. 예약 타입별 필수 데이터 누락 유효성 검사
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

    // 3. 충전기 규격과 내 차량 규격 비교 알럿 (물리적 차이가 나더라도 컨펌 시 허용)
    const chargerConnector = document.getElementById("chargerConnector").value;
    const carConnector = document.getElementById("carConnector").value;
    
    if (chargerConnector && carConnector && chargerConnector !== carConnector) {
        const warnMsg = `[경고] 고객님 차량의 충전 규격(${carConnector})과 선택하신 충전기의 규격(${chargerConnector})이 일치하지 않습니다.\n\n정말로 이대로 예약을 강행하시겠습니까?`;
        console.warn("⚠️ [Validation] 차량-충전기 커넥터 규격 미스매치 감지! 사용자 컨펌 요청 중...");
        if (!confirm(warnMsg)) {
            console.log("🛑 [Submit Cancel] 규격 불일치로 사용자가 예약 변경을 취소했습니다.");
            return;
        }
    } else {
        if (!confirm("예약 일정을 이대로 변경 확정하시겠습니까?")) {
            return;
        }
    }
    
    // 4. TARGET 모드일 때 유저 차량 배터리에 맞춰 히든 데이터 심기
    if (type === "TARGET") {
        const percentVal = parseInt(document.getElementById("targetPercent").value) || 0;
        const calculatedKwh = Math.round(selectedCarBattery * (percentVal / 100.0));
        
        // 간이 히든 태그 주입기 
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
    
    // 5. 날짜와 시간 조립 (자정 이월 처리 포함)
    let finalEndStr = "";
    if (endTime === "24:00") {
        // 예약이 24:00 종료라면 다음 날짜 00:00:00으로 DB 변환
        let nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        finalEndStr = `${nextDay.toISOString().substring(0, 10)} 00:00:00`;
    } else {
        finalEndStr = `${date} ${endTime}:00`;
    }
    
    document.getElementById("startTime").value = `${date} ${startTime}:00`;
    document.getElementById("endTime").value = finalEndStr;

    // 6. 폼 전송 실시 (이탈 방지 락 해제 후 전송 중복 락 발동)
    isDirty = false;
    isSubmittingForm = true;
    
    console.log("📨 [Submit Fire] 백엔드로 예약 수정 데이터 POST 폼 객체 전송 실시!");
    const form = document.getElementById("reservationEditForm");
    
    // Spring 컨트롤러 400 에러 바인딩 방지를 위해 파라미터 네임 매핑
    document.getElementById("startTime").name = "editStartTime";
    document.getElementById("endTime").name = "editEndTime";

    form.action = "/mypage/reservation/modify";
    form.method = "POST";
    form.submit();
    
    // 혹시 모를 네트워크 지연 대비 자동 락 해제 타이머
    setTimeout(() => { isSubmittingForm = false; }, 3000);
}