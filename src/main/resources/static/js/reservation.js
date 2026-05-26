let selectedChargerId = null;
let selectedChargerName = null;

let reservationType = "TIME";
let startTime = null;
let endTime = null;

// 현재 STEP 이동
function moveStep(step) {

    document.querySelectorAll(".ev-page").forEach(page => {
        page.classList.add("hidden");
    });

    document.getElementById("ev-page-" + step).classList.remove("hidden");

    document.querySelectorAll(".ev-step").forEach(stepEl => {
        stepEl.classList.remove("ev-step-on");
    });

    for (let i = 1; i <= step; i++) {
        document.getElementById("ev-step-" + i).classList.add("ev-step-on");
    }

    if (step === 2) {
        loadReservedTimes();
    }
}

// 이전 STEP
function prevStep(step) {
	moveStep(step);
}

// 충전기 선택
function selectCharger(element, chargerId, chargerName) {

    document.querySelectorAll(".ev-charge-card")
        .forEach(card => card.classList.remove("active"));

    element.classList.add("active");

    selectedChargerId = Number(chargerId); // 🔥 타입 고정

    selectedChargerName = chargerName;

    document.getElementById("chargerId").value = chargerId;

    document.getElementById("summaryCharger").innerText = chargerName;

    moveStep(2);

    // 🔥 step 렌더 이후 1회만 실행
    setTimeout(() => {
        loadReservedTimes();
    }, 50);
}

// 예약 타입 선택
function selectReservationType(type) {

	reservationType = type;

	document.getElementById("reservationType").value = type;

	document.querySelectorAll(".ev-res-type-btn").forEach(btn => {
		btn.classList.remove("active", "in-range");
	});

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

// 시간 선택
function selectTime(element, time) {
    // 이미 disabled된 버튼이면 아무 동작도 하지 않음
    if (element.classList.contains("disabled")) return;

    if (startTime !== null && endTime !== null) {
        startTime = null;
        endTime = null;
        document.querySelectorAll(".ev-time-btn")
            .forEach(btn => btn.classList.remove("active", "in-range"));
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

    if (time < startTime) {
        tempEnd = startTime;
        tempStart = time;
    }

    // 🔥 시작 시간과 종료 시간 사이에 이미 예약된(disabled) 버튼이 있는지 체크
    let hasDisabledSlot = false;
    document.querySelectorAll(".ev-time-btn").forEach(btn => {
        const t = btn.dataset.time;
        if (t >= tempStart && t <= tempEnd && btn.classList.contains("disabled")) {
            hasDisabledSlot = true;
        }
    });

    if (hasDisabledSlot) {
        alert("선택하신 구간 사이에 이미 예약된 시간이 포함되어 있습니다.");
        return; // 진행을 막음
    }

    // 검증을 통과하면 최종 적용
    startTime = tempStart;
    endTime = tempEnd;

    document.querySelectorAll(".ev-time-btn").forEach(btn => {
        const t = btn.dataset.time;
        
        // disabled 상태가 아닌 버튼들만 스타일 핸들링
        if (!btn.classList.contains("disabled")) {
            btn.classList.remove("active", "in-range");

            if (t === startTime || t === endTime) {
                btn.classList.add("active");
            }
            if (t > startTime && t < endTime) {
                btn.classList.add("in-range");
            }
        }
    });

    const date = document.getElementById("reservationDate").value;
    document.getElementById("startTime").value = date + " " + startTime + ":00";
    document.getElementById("endTime").value = date + " " + endTime + ":00";

    document.getElementById("summaryReserve").innerText = startTime + " ~ " + endTime;
}	

// 예약 제출
function submitReservation() {

	// 시간 예약
	if(reservationType === "TIME") {
		if(startTime == null || endTime == null) {
			alert("예약 시간을 선택하세요.");
			return;
		}
	} else {
		document.getElementById("startTime").disabled = true;
		document.getElementById("endTime").disabled = true;
	}

	document.getElementById("reservationForm").submit();
}

// 목표 충전량 슬라이더 변경
function changeTargetPercent(value) {
	document.getElementById("targetPercentText").innerText = value + "%";
	document.getElementById("summaryReserve").innerText = "목표 충전량 " + value + "%";
}

// 빠른 선택 버튼
function quickTarget(value) {
	document.getElementById("targetPercent").value = value;
	changeTargetPercent(value);
}

// 충전기 선택 건너뛰기
function skipCharger() {

    selectedChargerId = null;
    selectedChargerName = "미선택";

    // 선택 스타일 제거
    document.querySelectorAll(".ev-charge-card").forEach(card => {
        card.classList.remove("border-blue-600", "bg-blue-50");
    });

    // hidden input 초기화
    document.getElementById("chargerId").value = "";

    // 요약 변경
    document.getElementById("summaryCharger").innerText = "충전기 미선택";

    // STEP1 숨김 / STEP2 표시
    document.getElementById("ev-page-1").classList.add("hidden");
    document.getElementById("ev-page-2").classList.remove("hidden");

    // ===== 🌟 상단 STEP 표시 변경 통일 =====
    document.querySelectorAll(".ev-step").forEach(stepEl => {
        stepEl.classList.remove("ev-step-on");
    });

    for (let i = 1; i <= 2; i++) {
        document.getElementById("ev-step-" + i)?.classList.add("ev-step-on");
    }
}

// 예약된 시간 조회 + UI 차단
async function loadReservedTimes() {
    const chargerId = selectedChargerId;
    const date = document.getElementById("reservationDate")?.value;

    console.log("chargerId:", chargerId);
    console.log("date:", date);

    // 1. 초기값 방어
    if (!chargerId || chargerId === "" || !date) {
        console.warn("early return");
        return;
    }

    // 2. 다른 날짜/충전기 선택 시를 위해 기존disabled 및 이벤트 제거된 상태 초기화
    document.querySelectorAll(".ev-time-btn").forEach(btn => {
        btn.classList.remove("disabled");
        btn.onclick = function() { selectTime(this, this.dataset.time); }; 
    });

    try {
        const url = "/reservation/reserved-times?chargerId=" + chargerId + "&date=" + date;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`서버 에러 발생 (Status: ${response.status})`);
        }

        const reservedList = await response.json();

        if (!Array.isArray(reservedList)) {
            console.error("서버에서 받은 데이터가 배열 형식이 아닙니다.", reservedList);
            return;
        }

        // 3. 예약된 시간 버튼 비활성화 처리
        reservedList.forEach(r => {
            const start = r.startTime.substring(11, 16); 
            const end = r.endTime.substring(11, 16);

            document.querySelectorAll(".ev-time-btn").forEach(btn => {
                const t = btn.dataset.time;

                if (t >= start && t < end) {
                    btn.classList.add("disabled");
                    btn.classList.remove("active", "in-range"); 
                    btn.onclick = null; 
                }
            });
        });
        
    	// 과거 시간 차단 로직
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

    } catch (error) {
        console.error("예약 시간 로드 중 오류 발생:", error);
        alert("예약 데이터를 불러오는 중 오류가 발생했습니다. 백엔드 로그를 확인하세요.");
    }
}

// 날짜 변경 시 예약 시간 조회
window.addEventListener("DOMContentLoaded", () => {
    const reservationDate = document.getElementById("reservationDate");
    if (reservationDate) {
        reservationDate.addEventListener("change", loadReservedTimes);
    }
});

function toMinutes(t) {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
}

function isReservedSlot(time, reservedList) {
    const t = toMinutes(time);
    return reservedList.some(r => {
        const start = toMinutes(r.startTime);
        const end = toMinutes(r.endTime);
        return t >= start && t < end;
    });
}