// =========================================================================
// 🌐 EV 예약 수정 시스템 클라이언트 코어 스크립트 (reservationEdit.js)
// =========================================================================

// 전역 상태 변수 모음
let reservationType = "TIME";     // 현재 예약 모드 (TIME or TARGET)
let startTime = null;             // 선택된 시작 시간 (예: "13:00")
let endTime = null;               // 선택된 종료 시간 (예: "24:00")
let selectedChargerKw = 50.0;     // 충전기 속도 (kW)
let isFetchingReservedTimes = false; // 서버 통신 중복 방지 플래그
let currentReservationId = null;  // 현재 수정 중인 예약 PK

/**
 * 📝 [Block 1] 초기 렌더링 및 이벤트 바인딩
 */
window.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 [Init] 예약 수정 페이지 스크립트 로드 완료 및 초기화 시작");

    // 1. 숨겨진(hidden) 필드에서 데이터 추출
    currentReservationId = Number(document.getElementById("editReservationId").value);
    selectedChargerKw = Number(document.getElementById("chargerKwHidden").value || 50.0);
    reservationType = document.getElementById("reservationType").value || "TIME";
    
    // 2. 00:30 ~ 24:00 타임 슬롯 48칸 그리기 (제일 먼저 실행되어야 함)
    generateTimeSlots();

    // 3. 기존 예약 시간(DB값) 파싱하여 변수에 세팅 (자정 처리 포함)
    parseInitialTimes();

    // 4. 날짜 변경 시 타임슬롯 리셋 및 다시 불러오기 이벤트
    const dateInput = document.getElementById("reservationDate");
    if (dateInput) {
        dateInput.addEventListener("change", () => {
            console.log(`📅 [Event] 날짜 변경됨: ${dateInput.value}`);
            startTime = null; 
            endTime = null;
            document.getElementById("startTime").value = "";
            document.getElementById("endTime").value = "";
            loadReservedTimes();
        });
    }
    
    // 5. 목표 충전량 슬라이더 이벤트 바인딩
    const slider = document.getElementById("targetPercent");
    if (slider) {
        slider.addEventListener("input", (e) => {
            changeTargetPercent(e.target.value, true); 
        });
    }

    // 6. UI 초기화 (탭 활성화 및 마스킹 가동)
    selectReservationType(reservationType);
    console.log("✅ [Init] 모든 초기화 프로세스 정상 종료");
});

/**
 * 📝 [Block 2] 타임 슬롯 DOM 자동 생성 (48칸: 00:30 ~ 24:00)
 */
function generateTimeSlots() {
    console.log("🕒 [Render] 타임 슬롯 48칸(00:30 ~ 24:00) 생성 시작");
    const grid = document.getElementById("editTimeSlotGrid");
    if(!grid) return;
    
    let html = "";
    // 0시부터 24시까지 루프
    for(let h = 0; h <= 24; h++){
        const mArr = ["00", "30"];
        for(let m = 0; m < 2; m++){
            if(h === 0 && m === 0) continue; // 00:00 제외
            if(h === 24 && m === 1) continue; // 24:30 제외

            const hh = String(h).padStart(2, '0');
            const mm = mArr[m];
            const timeStr = `${hh}:${mm}`;
            
            // CSS와 100% 호환되도록 div 태그 사용
            html += `<div class="ev-time-btn" data-time="${timeStr}" onclick="selectTime(this, '${timeStr}')">${timeStr}</div>`;
        }
    }
    grid.innerHTML = html;
    console.log("✅ [Render] 타임 슬롯 생성 완료");
}

/**
 * 📝 [Block 3] 기존 DB 시간 파싱 및 세팅 로직
 */
function parseInitialTimes() {
    const rawStartTime = document.getElementById("startTime").value; // 예: "2026-05-29 13:00:00"
    const rawEndTime = document.getElementById("endTime").value;     // 예: "2026-05-30 00:00:00"
    const targetDate = document.getElementById("reservationDate").value; // 예: "2026-05-29"

    if (rawStartTime && rawEndTime && rawStartTime.includes(" ")) {
        const startPart = rawStartTime.split(" ");
        const endPart = rawEndTime.split(" ");
        
        // 시작 시간은 그대로 추출 (예: 13:00)
        startTime = startPart[1].substring(0, 5);
        
        // 🌟 자정(00:00:00)이면서 날짜가 다음날인 경우 24:00으로 변환하는 핵심 로직
        if (endPart[1] === "00:00:00" && endPart[0] !== targetDate) {
            endTime = "24:00";
            console.log(`⏰ [Parse] 다음날 자정 종료를 24:00으로 보정 완료`);
        } else {
            endTime = endPart[1].substring(0, 5);
        }
        
        console.log(`📊 [Data] 기존 예약 세팅 완료 -> 시작: ${startTime}, 종료: ${endTime}`);
    }
}

/**
 * 📝 [Block 4] 예약 타입(탭) 토글 (TIME / TARGET)
 */
function selectReservationType(type) {
    console.log(`🔄 [Tab Switch] 탭 전환 -> ${type} 모드`);
    reservationType = type;
    document.getElementById("reservationType").value = type;
    
    // 버튼 UI 클래스 스위칭
    document.getElementById("btnTime").classList.remove("active");
    document.getElementById("btnTarget").classList.remove("active");

    // 🌟 핵심 버그 수정: 어떤 탭이든 타임 슬롯(timeBox)은 무조건 보이게 강제 해제!
    document.getElementById("timeBox").classList.remove("hidden");

    if (type === "TIME") {
        document.getElementById("btnTime").classList.add("active");
        document.getElementById("targetBox").classList.add("hidden");
    } else {
        document.getElementById("btnTarget").classList.add("active");
        document.getElementById("targetBox").classList.remove("hidden");
        
        // 타겟 모드일 경우 슬라이더 값에 따라 배경색과 연산 즉시 실행
        const slider = document.getElementById("targetPercent");
        if(slider) {
            updateSliderBackground(slider.value);
            changeTargetPercent(slider.value, false);
        }
    }
    
    // 탭이 바뀔 때마다 서버 예약 데이터를 갱신하여 마스킹
    loadReservedTimes();
}

/**
 * 📝 [Block 5] 목표 충전량 슬라이더 및 퀵버튼 제어 로직
 */
function updateSliderBackground(value) {
    const slider = document.getElementById("targetPercent");
    if (!slider) return;
    const percentage = value;
    slider.style.background = `linear-gradient(to right, #2563eb 0%, #2563eb ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`;
}

function changeTargetPercent(value, isUserAction = true) {
    let targetVal = Number(value);
    const slider = document.getElementById("targetPercent");
    
    document.getElementById("targetPercentText").innerText = targetVal + "%";
    if (slider) slider.value = targetVal;
    updateSliderBackground(targetVal);

    console.log(`🎚️ [Slider] 목표량 변경됨: ${targetVal}%`);
    
    // 타겟 모드에서는 슬라이더 조작 시 타임슬롯 범위를 자동으로 다시 계산하여 칠함
    if(isUserAction && reservationType === "TARGET") {
        syncTimeButtonsByTarget();
    }
}

function quickTarget(value) {
    changeTargetPercent(value, true); 
}

function calculateRequiredMinutes(targetVal) {
    if (targetVal <= 0) return 0;
    // 70kWh 배터리 기준으로 필요 전력량 계산
    const requiredKwh = 70.0 * (targetVal / 100.0);
    let durationHours = requiredKwh / selectedChargerKw;
    let requiredMinutes = Math.ceil(durationHours * 60); 
    console.log(`🧮 [Calc] ${targetVal}% 충전 소요 시간 계산 -> ${requiredMinutes}분 필요 (충전기: ${selectedChargerKw}kW)`);
    return requiredMinutes;
}

/**
 * 📝 [Block 6] 타임 슬롯 클릭 제어 로직 (시간 지정 vs 목표량 지정)
 */
function selectTime(element, time) {
    if (element.classList.contains("disabled") || element.classList.contains("is-past-hour")) {
        console.warn(`🛑 [Click Denied] 선택 불가 슬롯 클릭됨: ${time}`);
        return; 
    }

    console.log(`👆 [Click] 슬롯 선택됨: ${time} (${reservationType} 모드)`);

    // 모든 슬롯의 활성화 색상 초기화
    document.querySelectorAll(".ev-time-btn").forEach(btn => {
        if (!btn.classList.contains("disabled")) btn.classList.remove("active", "in-range");
    });

    if (reservationType === "TIME") {
        // [TIME 모드] 시작시간과 종료시간을 수동으로 두 번 클릭해서 범위 지정
        if (startTime !== null && endTime !== null) {
            startTime = time;
            endTime = null;
        } else if (startTime === null) {
            startTime = time;
        } else if (startTime === time) {
            startTime = null; // 같은 곳 클릭 시 취소
        } else {
            // 두 번째 클릭 시 범위 확정 (오름차순 정렬)
            let tempStart = startTime;
            let tempEnd = time;
            if (time < startTime) { tempEnd = startTime; tempStart = time; }

            // 범위 내에 disabled(마감) 슬롯이 있는지 검사
            let hasDisabledSlot = false;
            document.querySelectorAll(".ev-time-btn").forEach(btn => {
                const t = btn.dataset.time;
                if (t > tempStart && t < tempEnd && btn.classList.contains("disabled")) { 
                    hasDisabledSlot = true; 
                }
            });
            
            if (hasDisabledSlot) { 
                alert("선택하신 구간 사이에 이미 예약된 시간이 포함되어 있습니다."); 
                startTime = time; // 현재 클릭한 것을 새로운 시작점으로 리셋
                endTime = null;
            } else {
                startTime = tempStart;
                endTime = tempEnd;
            }
        }
        colorTimeSlots(); // 색칠 실행
        
    } else {
        // [TARGET 모드] 시작 시간만 클릭하면 소요 시간에 맞춰 자동으로 뒤까지 색칠
        startTime = time; 
        syncTimeButtonsByTarget();
    }
}

/**
 * 📝 [Block 7] 타임 슬롯 화면 색칠 전담 함수 (TIME 모드용)
 */
function colorTimeSlots() {
    if (!startTime) return;
    
    document.querySelectorAll(".ev-time-btn").forEach(btn => {
        const t = btn.dataset.time;
        if (btn.classList.contains("disabled")) return;

        if (endTime) {
            if (t === startTime || t === endTime) btn.classList.add("active"); // 양끝 진한 파랑
            if (t > startTime && t < endTime) btn.classList.add("in-range");   // 중간 연한 파랑
        } else {
            if (t === startTime) btn.classList.add("active"); // 하나만 선택된 상태
        }
    });
    console.log(`🎨 [Draw] 타임 슬롯 색칠 완료 (시작: ${startTime}, 종료: ${endTime || '미정'})`);
}

/**
 * 📝 [Block 8] 타겟 모드 전용: 자동 슬롯 계산 및 색칠 (TARGET 모드용)
 */
function syncTimeButtonsByTarget() {
    if (reservationType !== 'TARGET') return;
    if (!startTime) return;

    const targetValue = parseInt(document.getElementById("targetPercentText").innerText) || 0;
    const requiredMinutes = calculateRequiredMinutes(targetValue);
    const requiredSlots = Math.ceil(requiredMinutes / 30); // 30분 단위 칸 수 계산

    console.log(`🤖 [Auto Sync] 타겟 모드 연산 - 필요 슬롯: ${requiredSlots}칸`);

    const allButtons = Array.from(document.querySelectorAll(".ev-time-btn"));
    let startIndex = allButtons.findIndex(btn => btn.dataset.time === startTime);
    
    if (startIndex === -1) return;

    // 필요한 슬롯만큼 뒤로 가면서 disabled(마감)가 있는지 검사
    let isValid = true;
    for (let i = 0; i <= requiredSlots; i++) {
        if (startIndex + i >= allButtons.length) break; // 24시를 넘어가면 종료
        if (allButtons[startIndex + i].classList.contains("disabled")) {
            isValid = false;
            break;
        }
    }

    if (!isValid) {
        alert("선택하신 시간대 이후로 연속된 예약 가능 공간이 부족합니다. 목표 충전량을 낮추거나 다른 시작 시간을 선택해 주세요.");
        startTime = null;
        return;
    }

    // 통과 시 자동으로 색칠하고 endTime 계산
    let lastSelectedTime = startTime;
    for (let i = 0; i <= requiredSlots; i++) {
        if (startIndex + i >= allButtons.length) break;
        const btn = allButtons[startIndex + i];
        
        if (i === 0 || i === requiredSlots) btn.classList.add("active");
        else btn.classList.add("in-range");
        
        lastSelectedTime = btn.dataset.time;
    }
    
    endTime = lastSelectedTime;
    console.log(`🎨 [Auto Draw] 타겟 지정 범위 색칠 완료 (시작: ${startTime}, 자동종료: ${endTime})`);
}

/**
 * 📝 [Block 9] 서버 예약 데이터 Fetch 및 UI 마스킹 (내 기존 예약 보존)
 */
async function loadReservedTimes() {
    console.log("⏳ [Fetch] 서버에서 다른 예약 데이터 조회 시작");
    if (isFetchingReservedTimes) return;
    isFetchingReservedTimes = true;
    
    const chargerId = document.getElementById("chargerId").value; 
    const date = document.getElementById("reservationDate").value;
    const stationId = document.getElementById("stationId").value;

    // 모든 슬롯 초기화 (마스킹 리셋)
    document.querySelectorAll(".ev-time-btn").forEach(btn => {
        btn.classList.remove("disabled", "active", "in-range", "is-past-hour", "my-reservation");
        if(btn.dataset.time) btn.innerText = btn.dataset.time;
    });
    
    // 과거 시간 차단 로직 (현재 시간이 포함된 날짜일 경우)
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; 
    if (date === todayStr) {
        const currentHour = now.getHours();
        const currentMin = now.getMinutes();
        document.querySelectorAll(".ev-time-btn").forEach(btn => {
            const [h, m] = btn.dataset.time.split(":").map(Number);
            if (h < currentHour || (h === currentHour && m <= currentMin)) {
                btn.classList.add("disabled", "is-past-hour");
            }
        });
    } else if (date < todayStr) {
        document.querySelectorAll(".ev-time-btn").forEach(btn => btn.classList.add("disabled", "is-past-hour"));
    }

    try {
        const response = await fetch(`/reservation/reserved-times?chargerId=${chargerId}&date=${date}&stationId=${stationId}`);
        if (response.ok) {
            const reservedList = await response.json();
            
            // 가져온 예약 리스트를 돌면서 비활성화 처리
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
                            btn.classList.add("my-reservation"); // 내 기존 예약 강조
                        } else {
                            if (t !== endLimit) { // 끝나는 시간은 남이 시작할 수 있으므로 막지 않음
                                btn.classList.add("disabled"); 
                                btn.innerText = "마감";
                            }
                        }
                    }
                });
            });

            // 🌟 내 기존 예약 시간을 화면에 파란색으로 다시 칠해주는 마법
            if (startTime && endTime) {
                if (reservationType === "TARGET") {
                    syncTimeButtonsByTarget();
                } else {
                    colorTimeSlots();
                }
            }
        }
    } catch (error) { 
        console.error("❌ [Fetch Error] 데이터 통신 에러:", error); 
    } finally {
        isFetchingReservedTimes = false;
        console.log("🏁 [Fetch] 마스킹 및 화면 복구 동기화 완료");
    }
}

/**
 * 📝 [Block 10] 최종 변경사항 서버로 Submit (표준 폼 전송 방식)
 */
function submitReservationEdit() {
    const type = document.getElementById("reservationType").value;
    const date = document.getElementById("reservationDate").value;

    if (!startTime || !endTime) {
        alert("예약 가능한 시간대가 지정되지 않아 수정을 진행할 수 없습니다.");
        return;
    }
    
    // TARGET 모드일 경우 계산된 값들을 폼에 동적으로 심어줍니다.
    if (type === "TARGET") {
        const percentVal = parseInt(document.getElementById("targetPercent").value) || 0;
        const calculatedKwh = Math.round(70.0 * (percentVal / 100.0));
        
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
    
    // 시간 조립 및 24:00 익일 이월 처리
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
    
    console.log(`🚀 [Submit] 전송 데이터 - 시작: ${document.getElementById("startTime").value}, 종료: ${finalEndStr}`);

    if (confirm("예약 일정을 이대로 변경하시겠습니까?")) {
        // 🟢 백엔드의 RedirectAttributes 에러 메시지를 정상적으로 받기 위해 표준 submit() 처리
        const form = document.getElementById("reservationEditForm");
        form.action = "/mypage/reservation/modify";
        form.method = "POST";
        form.submit();
    }
}