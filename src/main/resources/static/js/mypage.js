// =========================================================================
// 🌐 EV 마이페이지 탭 전환 및 차량 관리 통합 코어 스크립트 (mypage.js)
// =========================================================================

window.addEventListener("DOMContentLoaded", () => {
    console.log("⚙️ [Mypage Integration] 마이페이지 로드 완료");

    const urlParams = new URLSearchParams(window.location.search);
    const activeTab = urlParams.get('tab');

    if (activeTab === 'vehicle') {
        console.log("🚘 차량 관리 탭이 활성화되었습니다. 데이터를 수신합니다.");
        loadVehicleList();
        loadEvModels(); 
    }
});

function getCsrfToken() {
    return document.getElementById('csrfToken')?.value || '';
}

// ==========================================
// 1. 차량 목록 조회 및 렌더링
// ==========================================
async function loadVehicleList() {
    try {
        const response = await fetch('/mypage/vehicle/list');
        if (!response.ok) throw new Error('목록 조회 실패');
        
        const vehicles = await response.json();
        const container = document.getElementById("vehicleListContainer");

        if (vehicles.length === 0) {
            container.innerHTML = `
                <div class="ev-mypage-empty-box" style="grid-column: 1 / -1;">
                    <span class="ev-mypage-empty-icon">🚗</span>
                    <p class="ev-mypage-empty-text">등록된 차량이 없습니다.<br>새 차량을 등록하고 쾌적하게 예약해 보세요.</p>
                </div>`;
            return;
        }

        container.innerHTML = vehicles.map(v => `
            <div class="ev-vehicle-card ${v.isPrimary ? 'primary' : ''}">
                ${v.isPrimary ? '<div class="ev-vehicle-primary-badge">대표 차량</div>' : ''}
                <h3 class="ev-vehicle-card-name">${v.manufacturer} ${v.modelName}</h3>
                <p class="ev-vehicle-card-nick">${v.carNumber || '차량번호 미입력'} ${v.nickname ? `(${v.nickname})` : ''}</p>
                
                <div class="ev-vehicle-spec-row">
                    <span class="ev-vehicle-spec-label">배터리</span>
                    <span style="font-weight:600; color:#2563eb;">${v.batteryCapacity} kWh</span>
                </div>
                <div class="ev-vehicle-spec-row">
                    <span class="ev-vehicle-spec-label">충전 규격</span>
                    <span style="font-weight:600;">${v.connectorType}</span>
                </div>
                <div class="ev-vehicle-spec-row">
                    <span class="ev-vehicle-spec-label">주행 거리</span>
                    <span>${v.maxRange} km</span>
                </div>

                <div class="ev-vehicle-card-footer">
                    ${!v.isPrimary ? `<button onclick="setPrimaryVehicle(${v.id})" class="ev-vehicle-btn-outline" style="flex:1;">대표 설정</button>` : '<div style="flex:1;"></div>'}
                    <button onclick="deleteVehicle(${v.id})" class="ev-vehicle-btn-danger">삭제</button>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error("차량 목록 조회 중 오류:", error);
    }
}

// ==========================================
// 2. 모달창: 마스터 제원 목록 로드
// ==========================================
async function loadEvModels() {
    try {
        const response = await fetch('/mypage/vehicle/models');
        const models = await response.json();
        const select = document.getElementById("modelSelect");
        
        models.forEach(m => {
            const option = document.createElement("option");
            option.value = m.modelId;
            option.text = `[${m.manufacturer}] ${m.modelName} (${m.batteryCapacity}kWh)`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error("제원 목록 로드 실패:", error);
    }
}

// ==========================================
// 3. 모달 제어 및 신규 등록
// ==========================================
function openVehicleModal() {
    document.getElementById("vehicleRegForm").reset();
    document.getElementById("vehicleModal").classList.remove("hidden");
}

function closeVehicleModal() {
    document.getElementById("vehicleModal").classList.add("hidden");
}

async function submitVehicleRegistration() {
    const modelId = document.getElementById("modelSelect").value;
    if (!modelId) {
        alert("제조사 및 모델을 선택해 주세요.");
        return;
    }

    const payload = {
        modelId: Number(modelId),
        carNumber: document.getElementById("carNumber").value.trim(),
        nickname: document.getElementById("nickname").value.trim()
    };

    try {
        const response = await fetch('/mypage/vehicle/register', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': getCsrfToken()
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            closeVehicleModal();
            loadVehicleList();
        } else {
            alert("차량 등록에 실패했습니다.");
        }
    } catch (error) {
        alert("통신 오류가 발생했습니다.");
    }
}

// ==========================================
// 4. 차량 삭제 및 대표 설정
// ==========================================
async function deleteVehicle(vehicleId) {
    if(!confirm("정말 이 차량을 삭제하시겠습니까?")) return;

    try {
        const formData = new URLSearchParams();
        formData.append('vehicleId', vehicleId);

        const response = await fetch('/mypage/vehicle/delete', {
            method: 'POST',
            headers: { 'X-CSRF-TOKEN': getCsrfToken() },
            body: formData
        });

        if(response.ok) loadVehicleList();
        else alert("차량 삭제에 실패했습니다.");
    } catch(e) {
        alert("통신 오류가 발생했습니다.");
    }
}

async function setPrimaryVehicle(vehicleId) {
    if(!confirm("이 차량을 대표 차량으로 설정하시겠습니까?")) return;

    try {
        const formData = new URLSearchParams();
        formData.append('vehicleId', vehicleId);

        const response = await fetch('/mypage/vehicle/primary', {
            method: 'POST',
            headers: { 'X-CSRF-TOKEN': getCsrfToken() },
            body: formData
        });

        if(response.ok) loadVehicleList();
        else alert("대표 설정에 실패했습니다.");
    } catch(e) {
        alert("통신 오류가 발생했습니다.");
    }
}