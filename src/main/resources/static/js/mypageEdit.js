// =========================================================================
// 🌐 EV 마이페이지 회원정보 수정 유효성 검증 스크립트 (mypageEdit.js)
// =========================================================================

/**
 * DOM 컨텐츠 로드가 완료되면 폼 이벤트 리스너 결속 프로세스를 가동합니다.
 */
window.addEventListener("DOMContentLoaded", () => {
    console.log("⚙️ [mypageEdit.js] 회원정보 수정 유효성 검증 엔진 로드 완료");

    const editForm = document.getElementById('editForm');
    if (!editForm) {
        console.warn("⚠️ [Initialization Warning] 페이지 내에서 'editForm' 요소를 찾을 수 없습니다.");
        return;
    }

    /**
     * 회원정보 수정 폼 제출(Submit) 액션을 가로채어 1차 보안 유효성 검증을 실시합니다.
     */
    editForm.addEventListener('submit', function(e) {
        console.log("📡 [editForm] 사용자가 정보 저장 버튼을 클릭하여 검증 프로세스를 개시합니다.");

        // 패스워드 입력 필드 요소 안전 확보
        const currentPasswordEl = document.getElementById('currentPassword');
        const passwordEl = document.getElementById('password');
        const passwordConfirmEl = document.getElementById('passwordConfirm');

        // 공백 오차 제거 후 문자열 파싱
        const currentPassword = currentPasswordEl ? currentPasswordEl.value.trim() : '';
        const password = passwordEl ? passwordEl.value.trim() : '';
        const passwordConfirm = passwordConfirmEl ? passwordConfirmEl.value.trim() : '';

        console.log(`🔍 [비밀번호 변경란 전수 조사] 현재패스워드 입력 상태: ${currentPassword !== ''}, 새패스워드 입력 상태: ${password !== ''}, 확인란 입력 상태: ${passwordConfirm !== ''}`);

        // [사례 1] 사용자가 세 비밀번호 입력 칸 중 하나라도 건드린 흔적이 발견된 경우
        if (currentPassword !== '' || password !== '' || passwordConfirm !== '') {
            console.log("🚨 [검증 시스템 인지] 사용자가 비밀번호를 변경하려는 의도를 포착했습니다. 3대 필수 요소를 대조합니다.");

            // 1. 현재 비밀번호 누락 방지 락
            if (currentPassword === '') {
                console.warn("❌ [검증 통과 실패] 현재 비밀번호가 공백 상태입니다. 전송을 중단합니다.");
                alert('현재 비밀번호를 입력해 주세요.');
                if (currentPasswordEl) currentPasswordEl.focus();
                e.preventDefault(); 
                return;
            }

            // 2. 새 비밀번호 누락 방지 락
            if (password === '') {
                console.warn("❌ [검증 통과 실패] 새 비밀번호가 공백 상태입니다. 전송을 중단합니다.");
                alert('새 비밀번호를 입력해 주세요.');
                if (passwordEl) passwordEl.focus();
                e.preventDefault();
                return;
            }

            // 3. 새 비밀번호 확인란 누락 방지 락
            if (passwordConfirm === '') {
                console.warn("❌ [검증 통과 실패] 새 비밀번호 확인란이 공백 상태입니다. 전송을 중단합니다.");
                alert('새 비밀번호 확인란을 입력해 주세요.');
                if (passwordConfirmEl) passwordConfirmEl.focus();
                e.preventDefault();
                return;
            }

            // 4. 1차 물리 반복 대조 검증: 두 패스워드의 일치성 체크
            if (password !== passwordConfirm) {
                console.warn("❌ [검증 통과 실패] 입력된 새 비밀번호와 확인용 문자열이 일치하지 않습니다.");
                alert('새 비밀번호와 새 비밀번호 확인이 일치하지 않습니다.');
                if (passwordConfirmEl) passwordConfirmEl.focus();
                e.preventDefault();
                return;
            }
        }

        console.log("✅ [검증 프로세스 통과 완료] 회원정보 데이터 양식에 이상이 없으므로 백엔드 서버로 전송을 인가합니다.");
    });
});